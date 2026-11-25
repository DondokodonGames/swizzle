// I-GBA-0028v3-basement-leak-chase.js
// 地下物置の水漏れ追い — 配管の継ぎ目から継ぎ目へ逃げ回る水漏れを、次々タップで追って押さえ込む
// 操作: 今噴いている継ぎ目をタップすると一押し。漏れは隣の継ぎ目へ逃げるので追って叩く。先に膨らんだ継ぎ目を叩けば先回り
// 終わり: 22秒以内に水漏れ4か所を押さえ込めば成功。床の水があふれる/時間切れで失敗
// @mechanic: chase
// @theme: basement_pipe_leak_chase
// 世界観: 古いアパートの地下物置で、管理人が配管の継ぎ目を伝って場所を変える水漏れを追いかけ、先回りして押さえ込んでは次の漏れへ走る
// 残るもの: 正誤(CLEAR/GAME OVER) + 押さえた漏れの数と先回り(PERFECT)回数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色 + 黒、8x8タイル反復背景
  var STYLE = { bg: ['#000000', '#1c2a6b', '#3b4fa8'], main: ['#a0a0a0', '#c86a28', '#fcfcfc'], accent: ['#3cbcfc', '#fcd800'] };
  var T = {
    black: STYLE.bg[0], brick: STYLE.bg[1], brickHi: STYLE.bg[2], pipe: STYLE.main[0], rust: STYLE.main[1],
    white: STYLE.main[2], water: STYLE.accent[0], yellow: STYLE.accent[1], red: '#e40058',
  };

  var GAME_TITLE = 'LEAK CHASER';
  var TIME_LIMIT = 22;
  var NEEDED = 4;
  var COLS = [200, 413, 627, 840];
  var ROWS = [Math.round(H * 0.22), Math.round(H * 0.33), Math.round(H * 0.44), Math.round(H * 0.55)];
  var FLOOR = Math.round(H * 0.62);
  var WARN = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var scene = S.ATTRACT;
  var fixedAll = false;

  var leak, sealed, perfects, taps, water, remaining, countdown, freeze, over, exitT, runner, flash, milestone, respawn;

  function stamp(str, x, y, sz, color) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: T.black, bold: true, align: 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: 'center', font: 'monospace' });
  }

  var KEEPER_A = ['..yyyy..', '.yyyyyy.', '..wwww..', '..w.w...', '.bbbbbb.', 'w.bbbb.w', '..b..b..', '.kk..kk.'];
  var KEEPER_B = ['..yyyy..', '.yyyyyy.', '..wwww..', '..w.w...', 'wbbbbbbw', '..bbbb..', '.b....b.', 'kk....kk'];
  var KEEPER_PAL = { y: T.yellow, w: '#fcbcb0', b: T.rust, k: T.pipe };
  var JET = ['..c..', '.ccc.', 'c.c.c', '..c..', '.c.c.'];
  var GLOVE = ['.w.w.w', '.w.w.w', 'wwwwww', 'wwwwww', '.wwww.'];

  function node(c, r) { return { c: c, r: r, x: COLS[c], y: ROWS[r] }; }

  function neighbors(n) {
    var out = [];
    if (n.c > 0) out.push(node(n.c - 1, n.r));
    if (n.c < 3) out.push(node(n.c + 1, n.r));
    if (n.r > 0) out.push(node(n.c, n.r - 1));
    if (n.r < 3) out.push(node(n.c, n.r + 1));
    return out;
  }

  function pickNext(n, avoid) {
    var nb = neighbors(n);
    var choice = nb[Math.floor(game.random(0, nb.length))];
    if (avoid && nb.length > 1 && choice.c === avoid.c && choice.r === avoid.r) choice = nb[(nb.indexOf(choice) + 1) % nb.length];
    return choice;
  }

  function dwellTime() { return Math.max(0.75, 1.5 - sealed * 0.22); }

  function freshLeak() {
    var start = node(Math.floor(game.random(0, 4)), Math.floor(game.random(0, 4)));
    leak = { at: start, next: pickNext(start), hp: 3 + Math.min(2, sealed), maxHp: 3 + Math.min(2, sealed), dwell: dwellTime(), shock: 0 };
  }

  function initGame() {
    sealed = 0; perfects = 0; taps = 0; water = 0; remaining = TIME_LIMIT; countdown = 0.8;
    freeze = 0; over = false; exitT = 0; runner = { x: W * 0.5, tx: W * 0.5 }; flash = null;
    milestone = false; respawn = 0; fixedAll = false;
    freshLeak();
  }

  // 漏れの移動(本番もデモも同じ)
  function stepLeak(dt) {
    if (respawn > 0) { respawn -= dt; if (respawn <= 0) freshLeak(); return false; }
    leak.dwell -= dt;
    if (leak.shock > 0) leak.shock -= dt;
    if (leak.dwell <= WARN && leak.dwell + dt > WARN) game.audio.tone('F#5', 0.07, { wave: 'square', volume: 0.05, slide: -200 });
    if (leak.dwell <= 0) {
      var prev = leak.at;
      leak.at = leak.next;
      leak.next = pickNext(leak.at, prev);
      leak.dwell = dwellTime();
      if (leak.hp < leak.maxHp && game.random(0, 1) < 0.5) leak.hp++;
      return true;
    }
    return false;
  }

  function nearestJoint(x, y) {
    var best = null, bd = 100;
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      var d = Math.hypot(COLS[c] - x, ROWS[r] - y);
      if (d < bd) { bd = d; best = node(c, r); }
    }
    return best;
  }

  // 叩いた結果: 'hit' | 'ahead' | 'seal' | 'wrong' | 'none'
  function strike(x, y) {
    if (respawn > 0) return 'none';
    var j = nearestJoint(x, y);
    if (!j) return 'none';
    var telegraphing = leak.dwell <= WARN;
    var kind;
    if (j.c === leak.at.c && j.r === leak.at.r) kind = 'hit';
    else if (telegraphing && j.c === leak.next.c && j.r === leak.next.r) { kind = 'ahead'; leak.at = leak.next; }
    else return 'wrong';
    leak.hp -= kind === 'ahead' ? 2 : 1;
    leak.shock = 0.2;
    flash = { x: leak.at.x, y: leak.at.y, t: 0.25 };
    if (leak.hp <= 0) { respawn = 0.6; return 'seal'; }
    var from = leak.at;
    leak.at = pickNext(from);
    leak.next = pickNext(leak.at, from);
    leak.dwell = dwellTime();
    return kind;
  }

  function wrapUp(win) {
    if (over) return;
    over = true; fixedAll = win; exitT = 1.3;
    game.audio.stopBgm();
    game.audio.play(win ? 'se_success' : 'se_failure', 0.5);
  }

  game.onTap(function(x, y) {
    if (scene === S.ATTRACT) { game.audio.play('se_coin'); scene = S.PLAYING; initGame(); return; }
    if (scene === S.RESULT) { scene = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (over) return;
    if (countdown > 0) { game.audio.play('se_tap', 0.1); return; }
    taps++;
    runner.tx = Math.max(120, Math.min(W - 120, x));
    var at = { x: leak.at.x, y: leak.at.y };
    var res = strike(x, y);
    if (res === 'none') { game.audio.play('se_tap', 0.12); game.fx.burst(x, y, { color: T.pipe, count: 3, speed: 80 }); return; }
    if (res === 'wrong') {
      water = Math.min(1, water + 0.04);
      game.feedback.bad(x, y, { text: 'MISS', color: T.red, size: 36, count: 4 });
      return;
    }
    game.audio.play('se_tap', 0.2);
    if (res === 'ahead') { perfects++; game.feedback.good(flash.x, flash.y, { text: 'PERFECT', color: T.yellow, size: 42 }); }
    else if (res === 'hit') game.feedback.good(at.x, at.y, { text: 'GOOD', color: T.water, size: 38, count: 6 });
    if (res === 'seal') {
      sealed++;
      game.feedback.good(flash.x, flash.y, { text: 'NICE', color: T.yellow, size: 50 });
      game.audio.play('se_coin', 0.4);
      water = Math.max(0, water - 0.15);
      if (!milestone && sealed === 2) {
        milestone = true;
        game.fx.popup('2 / ' + NEEDED, W / 2, H * 0.16, { color: T.yellow, size: 60 });
        game.audio.play('se_milestone', 0.45);
      }
      if (sealed >= NEEDED) {
        freeze = 0.35;
        game.fx.burst(flash.x, flash.y, { color: T.yellow, count: 28, speed: 440 });
        wrapUp(true);
      }
    }
  });

  // ---- 描画 ----
  function tiles() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, T.black], [0.5, '#0c1440'], [1, T.black]]);
    for (var y = 240; y < FLOOR; y += 64) {
      var off = ((y / 64) % 2) * 64;
      for (var x = -64; x < W; x += 128) {
        game.draw.rect(x + off + 4, y + 4, 120, 56, T.brick);
        game.draw.rect(x + off + 4, y + 4, 120, 8, T.brickHi);
      }
    }
    game.draw.rect(0, 236, W, 8, T.pipe);
    // 裸電球(ゆらぎ)
    var bx = W * 0.5 + Math.sin(t * 1.3) * 18;
    game.draw.line(W * 0.5, 244, bx, 300, T.pipe, 3);
    game.draw.circle(bx, 312, 16, T.yellow);
    game.draw.circle(bx, 312, 60, T.yellow, 0.1 + 0.05 * Math.sin(t * 9));
    // 配管網
    for (var r = 0; r < 4; r++) {
      game.draw.rect(COLS[0], ROWS[r] - 14, COLS[3] - COLS[0], 28, T.black);
      game.draw.rect(COLS[0], ROWS[r] - 10, COLS[3] - COLS[0], 20, T.pipe);
      game.draw.rect(COLS[0], ROWS[r] - 10, COLS[3] - COLS[0], 5, T.white, 0.5);
    }
    for (var c = 0; c < 4; c++) {
      game.draw.rect(COLS[c] - 14, ROWS[0], 28, ROWS[3] - ROWS[0], T.black);
      game.draw.rect(COLS[c] - 10, ROWS[0], 20, ROWS[3] - ROWS[0], T.pipe);
    }
    for (var cc = 0; cc < 4; cc++) for (var rr = 0; rr < 4; rr++) {
      game.draw.rect(COLS[cc] - 30, ROWS[rr] - 30, 60, 60, T.black);
      game.draw.rect(COLS[cc] - 24, ROWS[rr] - 24, 48, 48, T.rust);
      game.draw.rect(COLS[cc] - 24, ROWS[rr] - 24, 48, 10, '#f08c50');
    }
    // 床と水
    game.draw.rect(0, FLOOR, W, H - FLOOR, '#242424');
    for (var fx = 0; fx < W; fx += 64) game.draw.rect(fx, FLOOR, 60, 8, '#383838');
    var lvl = water * 220;
    if (lvl > 2) {
      game.draw.rect(0, FLOOR + 230 - lvl, W, lvl, T.water, 0.7);
      for (var w = 0; w < 6; w++) game.draw.rect((w * 190 + t * 60) % W, FLOOR + 230 - lvl, 64, 8, T.white, 0.6);
    }
    game.draw.rect(0, FLOOR + 230, W, H - FLOOR - 230, '#141414');
  }

  function drawLeak() {
    if (respawn > 0) return;
    var t = game.time.elapsed;
    var tele = leak.dwell <= WARN;
    if (tele && Math.floor(t * 14) % 2 === 0) {
      game.draw.rect(leak.next.x - 40, leak.next.y - 40, 80, 80, T.yellow, 0.7);
      game.draw.rect(leak.next.x - 24, leak.next.y - 24, 48, 48, T.rust);
    }
    var fr = Math.floor(t * 12) % 2;
    var jx = leak.at.x + (leak.shock > 0 ? Math.sin(t * 80) * 8 : 0);
    game.draw.sprite(JET, { c: T.water }, jx, leak.at.y - 70 - fr * 8, 14, { anchor: 'center', flipX: fr === 1 });
    game.draw.circle(jx, leak.at.y, 26, T.water, 0.8);
    var drop = (t * 700) % (FLOOR - leak.at.y);
    game.draw.rect(jx - 4, leak.at.y + 30 + drop, 8, 22, T.water);
    for (var i = 0; i < leak.maxHp; i++) game.draw.rect(leak.at.x - leak.maxHp * 12 + i * 24, leak.at.y + 40, 18, 12, i < leak.hp ? T.water : '#383838');
  }

  function drawKeeper(moving) {
    var fr = moving && Math.floor(game.time.elapsed * 8) % 2 === 0 ? KEEPER_B : KEEPER_A;
    game.draw.sprite(fr, KEEPER_PAL, runner.x, H * 0.8, 20, { anchor: 'center', flipX: runner.tx < runner.x });
    game.draw.sprite(GLOVE, { w: T.white }, runner.x + 110, H * 0.78 + Math.sin(game.time.elapsed * 4) * 6, 10, { anchor: 'center' });
  }

  function drawHud() {
    stamp(sealed + ' / ' + NEEDED, W / 2, 60, 46, T.white);
    game.draw.rect(80, 108, W - 160, 24, T.pipe);
    var hurry = remaining < 5 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(84, 112, (W - 168) * Math.max(0, remaining / TIME_LIMIT), 16, hurry ? T.red : T.yellow);
    game.draw.rect(80, 160, 300, 24, T.pipe);
    var wcol = water > 0.7 && Math.floor(game.time.elapsed * 10) % 2 === 0 ? T.red : T.water;
    game.draw.rect(84, 164, 292 * water, 16, wcol);
  }

  // ---- ATTRACT: 本物のstrike()で「叩く→先回りPERFECT→空振り」 ----
  var demo = { t: 0, gx: W / 2, gy: H * 0.4, press: false, beat: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 4.4;
    if (cyc < dt || demo.t <= dt) {
      initGame(); countdown = 0; demo.beat = 0;
      leak.at = node(1, 1); leak.next = node(2, 1); leak.dwell = 1.4; leak.hp = 3; leak.maxHp = 3;
    }
    stepLeak(dt);
    demo.press = false;
    var plan = [0.5, 0, 3.0];
    if (respawn <= 0) {
      var tgt = demo.beat === 1 && leak.dwell <= WARN ? leak.next : leak.at;
      if (demo.beat === 2) tgt = node((leak.at.c + 2) % 4, (leak.at.r + 2) % 4);
      demo.gx += (tgt.x - demo.gx) * Math.min(1, dt * 14);
      demo.gy += (tgt.y - demo.gy) * Math.min(1, dt * 14);
      var fire = (demo.beat === 0 && cyc >= plan[0]) || (demo.beat === 1 && leak.dwell <= WARN - 0.15) || (demo.beat === 2 && cyc >= plan[2]);
      if (fire && demo.beat < 3 && Math.hypot(demo.gx - tgt.x, demo.gy - tgt.y) < 30) {
        runner.tx = tgt.x;
        var res = strike(tgt.x, tgt.y);
        demo.press = true; demo.beat++;
        if (res === 'wrong') { game.fx.burst(tgt.x, tgt.y, { color: T.red, count: 8, speed: 200 }); game.audio.play('se_bad', 0.15); water = Math.min(1, water + 0.1); }
        else { game.fx.burst(flash.x, flash.y, { color: res === 'ahead' ? T.yellow : T.water, count: 10, speed: 240 }); game.audio.play('se_good', 0.18); }
      }
    }
    runner.x += (runner.tx - runner.x) * Math.min(1, dt * 6);
    if (flash) { flash.t -= dt; if (flash.t <= 0) flash = null; }
  }

  game.onUpdate(function(dt) {
    if (scene === S.ATTRACT) {
      stepDemo(dt);
      tiles();
      drawLeak();
      if (flash) game.draw.rect(flash.x - 50, flash.y - 50, 100, 100, T.white, flash.t * 2);
      drawKeeper(Math.abs(runner.tx - runner.x) > 4);
      game.draw.hand(demo.gx, demo.gy + 10, { press: demo.press, scale: 13 });
      stamp(GAME_TITLE, W / 2, 80, 72, T.yellow);
      stamp('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 160, 34, T.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) stamp('► 100円 投入 ◄', W / 2, H * 0.94, 44, T.yellow);
      else stamp('INSERT COIN', W / 2, H * 0.94, 34, T.white);
      return;
    }

    if (scene === S.RESULT) {
      tiles();
      drawKeeper(false);
      var sc = sealed * 100 + perfects * 30;
      stamp(fixedAll ? 'CLEAR' : (remaining <= 0 ? 'TIME UP' : 'GAME OVER'), W / 2, 420, 88, fixedAll ? T.water : T.red);
      stamp('SCORE ' + sc, W / 2, 530, 50, T.white);
      stamp('PERFECT ' + perfects, W / 2, 610, 40, T.yellow);
      if (fixedAll && sc >= game.best) stamp('NEW RECORD', W / 2, 690, 50, T.yellow);
      else stamp('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, 690, 36, T.white);
      if (!fixedAll) stamp('あと' + (NEEDED - sealed) + 'か所!', W / 2, 780, 50, T.yellow);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) stamp('TAP TO CONTINUE', W / 2, H * 0.94, 34, T.white);
      return;
    }

    if (over) {
      if (freeze > 0) freeze -= dt;
      else {
        exitT -= dt;
        if (exitT <= 0) {
          scene = S.RESULT;
          var score = sealed * 100 + perfects * 30;
          if (fixedAll) game.end.success(score, { sealed: sealed, perfect: perfects, taps: taps });
          else game.end.failure({ sealed: sealed, perfect: perfects, taps: taps });
        }
      }
    } else if (countdown > 0) {
      countdown -= dt;
      if (countdown <= 0) game.audio.play('se_tap', 0.3);
    } else {
      remaining -= dt;
      if (stepLeak(dt)) game.audio.tone('C5', 0.04, { wave: 'triangle', volume: 0.04 });
      if (respawn <= 0) water = Math.min(1, water + dt * (0.06 + sealed * 0.015));
      if (water >= 1) {
        freeze = 0.5; flash = { x: leak.at.x, y: leak.at.y, t: 0.5 };
        game.feedback.bad(leak.at.x, leak.at.y, { text: 'MISS', color: T.red });
        game.fx.shake(12, 0.4);
        wrapUp(false);
      } else if (remaining <= 0) {
        remaining = 0; freeze = 0.45; flash = { x: leak.at.x, y: leak.at.y, t: 0.45 };
        game.feedback.bad(leak.at.x, leak.at.y, { text: 'TIME UP', color: T.red });
        wrapUp(false);
      }
    }
    runner.x += (runner.tx - runner.x) * Math.min(1, dt * 6);
    if (flash && !over) { flash.t -= dt; if (flash.t <= 0) flash = null; }

    tiles();
    drawLeak();
    if (flash) game.draw.rect(flash.x - 50 - (over ? 20 : 0), flash.y - 50 - (over ? 20 : 0), 100 + (over ? 40 : 0), 100 + (over ? 40 : 0), T.white, Math.min(0.8, flash.t * 2));
    drawKeeper(Math.abs(runner.tx - runner.x) > 4);
    drawHud();
    if (countdown > 0) stamp(countdown > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 96, T.yellow);
  });

  game.onStart(function() {
    game.audio.melody([
      ['E4', 0.5], ['E4', 0.25], ['G4', 0.25], ['A4', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5], ['E4', 1],
      ['D4', 0.5], ['E4', 0.5], ['G4', 0.5], ['E4', 0.5], ['B3', 1], [null, 1],
    ], { tempo: 150, wave: 'square', volume: 0.045, loop: true, bass: [['E2', 2], ['E2', 2], ['A2', 2], ['B2', 2]] });
    scene = S.ATTRACT;
    initGame();
  });
})(game);
