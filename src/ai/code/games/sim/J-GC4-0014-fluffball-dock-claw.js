// J-GC4-0014-fluffball-dock-claw.js
// 綿毛ドッククロー — 左右に振れるクレーンの爪を、逃げ回る綿毛の真下に来た瞬間に落としてつまみ上げる
// 操作: タップで爪を真下へ落とす(落ちる間に綿毛は逃げるので、行き先を読んで先に落とす)
// 終わり: 制限時間内に5匹つまめばCLEAR。時間切れでGAME OVER
// @mechanic: drop_timing
// @theme: dock_fluff_roundup
// 世界観: 春の港の荷揚げ場で、荷箱から逃げ出したふわふわの綿毛たちを、見習いクレーン係が爪で優しくつまんで籠へ戻していく
// 残るもの: 正誤(CLEAR/GAME OVER) + つまんだ数・金の綿毛ボーナスのスコア
// スタイル: 2000s HANDHELD PASTEL

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 2000s HANDHELD PASTEL: パステル、白縁の丸い形
  var STYLE = { bg: ['#bfe6ff', '#fde4f2', '#fff7e0'], main: ['#8fd3c8', '#f7a9c4'], accent: ['#ffcf5a', '#6a5acd'] };
  var C = {
    sky0: '#bfe6ff', sky1: '#fde4f2', sea: '#8fc9e8', dock: '#e8c9a0', plank: '#d4ad7e', plankLine: '#b48a5c',
    rail: '#6a5acd', cable: '#5a4a8a', claw: '#8e86c9', white: '#ffffff', ink: '#4a3b6b',
    good: '#5ccf9a', gold: '#ffcf5a', bad: '#ff6f8a', shadow: '#7a5a3c'
  };

  var GAME_TITLE = 'FLUFF CLAW';
  var TIME_LIMIT = 18;
  var NEEDED = 5;
  var RAIL_Y = Math.round(H * 0.2);
  var FLOOR_Y = Math.round(H * 0.64);
  var DROP_T = 0.38;
  var LIFT_T = 0.4;
  var CATCH_R = 58;
  var JAM_T = 0.95;
  var BASKET_X = Math.round(W * 0.86), BASKET_Y = Math.round(H * 0.5);
  var LEVER_Y = Math.round(H * 0.87);
  var HUD_Y = Math.round(H * 0.055);

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var FLUFF = [
    ['..wwww..', '.wwwwww.', 'wwkwwkww', 'wwwwwwww', 'wwwppwww', '.wwwwww.', '..o..o..'],
    ['..wwww..', '.wwwwww.', 'wwkwwkww', 'wwwwwwww', 'wwwppwww', '.wwwwww.', '.o....o.']
  ];
  var FLUFF_PAL = { w: '#ffffff', k: '#4a3b6b', p: '#f7a9c4', o: '#e8a060' };
  var GOLD_PAL = { w: '#ffe08a', k: '#4a3b6b', p: '#ff9f6a', o: '#e8a060' };
  var CLAW_OPEN = ['..cc..', '.cccc.', 'c.cc.c', 'c....c', 'c....c', '.c..c.'];
  var CLAW_SHUT = ['..cc..', '.cccc.', '.cccc.', '.c..c.', '..cc..', '..cc..'];
  var CLAW_PAL = { c: '#8e86c9' };
  var BASKET = ['b.b.b.b.b', 'bbbbbbbbb', 'b.b.b.b.b', 'bbbbbbbbb', '.bbbbbbb.'];
  var BASKET_PAL = { b: '#c98a4a' };
  var GULL = ['w...w', '.w.w.', '..w..'];

  var fluffs, clawX, clawDir, clawSpeed, clawPhase, clawT, clawY, held;
  var caught, golds, score, timeLeft, ready, hitStop, finished, done, endWait, ok, spawnT, flashT, flashX, milestoneShown;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.white, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function spawnFluff(gold) {
    var fromLeft = Math.random() < 0.5;
    fluffs.push({
      x: fromLeft ? 60 : W * 0.72, vx: (fromLeft ? 1 : -1) * game.random(250, 380),
      turnT: game.random(0.5, 1.4), scared: 0, gold: !!gold, hop: Math.random() * 6
    });
  }

  function initGame() {
    fluffs = [];
    spawnFluff(false); spawnFluff(false);
    clawX = W * 0.4; clawDir = 1; clawSpeed = 300; clawPhase = 'sweep'; clawT = 0; clawY = RAIL_Y + 90; held = null;
    caught = 0; golds = 0; score = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; hitStop = 0; finished = false; done = false; endWait = 0; ok = false;
    spawnT = 2.5; flashT = 0; flashX = 0; milestoneShown = false;
  }

  function dropClaw() {
    if (clawPhase !== 'sweep') return false;
    clawPhase = 'drop'; clawT = 0;
    game.audio.play('se_jump', 0.35);
    // 近くの綿毛は影を察して逃げ出す(反応まで一拍ある)
    for (var i = 0; i < fluffs.length; i++) {
      var f = fluffs[i];
      if (Math.abs(f.x - clawX) < 200) f.scared = 0.2;
    }
    return true;
  }

  function grabCheck(isDemo) {
    var best = -1, bd = 1e9;
    for (var i = 0; i < fluffs.length; i++) {
      var d = Math.abs(fluffs[i].x - clawX);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0 && bd < CATCH_R) {
      held = fluffs.splice(best, 1)[0];
      var perfect = bd < CATCH_R * 0.35;
      var pts = (held.gold ? 300 : 100) + (perfect ? 50 : 0);
      score += pts;
      game.feedback.good(clawX, FLOOR_Y - 60, { text: perfect ? 'PERFECT' : 'GOOD', color: held.gold ? C.gold : C.good, count: 14 });
      game.audio.play('se_coin', 0.4);
      flashT = 0.25; flashX = clawX;
      if (fluffs.length < 2) spawnFluff(Math.random() < 0.3);
    } else {
      held = null;
      game.feedback.bad(clawX, FLOOR_Y - 40, { text: 'MISS', color: C.bad, shake: 5 });
    }
    clawPhase = 'lift'; clawT = held ? 0 : LIFT_T - JAM_T;
  }

  function stepWorld(dt, isDemo) {
    // 爪の往復(捕まえるほど速くなる)
    if (clawPhase === 'sweep') {
      clawX += clawDir * clawSpeed * dt;
      if (clawX > W * 0.72) { clawX = W * 0.72; clawDir = -1; }
      if (clawX < 110) { clawX = 110; clawDir = 1; }
      clawY = RAIL_Y + 90;
    } else if (clawPhase === 'drop') {
      clawT += dt;
      clawY = RAIL_Y + 90 + (FLOOR_Y - 70 - RAIL_Y - 90) * Math.min(1, clawT / DROP_T);
      if (clawT >= DROP_T) grabCheck(isDemo);
    } else if (clawPhase === 'lift') {
      clawT += dt;
      clawY = FLOOR_Y - 70 - (FLOOR_Y - 70 - RAIL_Y - 90) * Math.max(0, Math.min(1, clawT / LIFT_T));
      if (clawT < 0) clawY += Math.sin(game.time.elapsed * 50) * 6;
      if (clawT >= LIFT_T) {
        if (held) {
          caught++; if (held.gold) golds++;
          game.fx.burst(BASKET_X, BASKET_Y, { color: held.gold ? C.gold : C.white, count: 10, speed: 220 });
          if (!isDemo && caught === 3 && !milestoneShown) {
            milestoneShown = true;
            game.audio.play('se_milestone', 0.45);
            game.fx.popup('NICE 3 / ' + NEEDED, W / 2, H * 0.34, { color: C.rail, size: 60 });
          }
          clawSpeed = 300 + caught * 45;
          held = null;
          if (!isDemo && caught >= NEEDED && !finished) winGame();
        }
        clawPhase = 'sweep';
      }
    }
    // 綿毛の走り回り(フェイント: 急な折り返し)
    for (var i = 0; i < fluffs.length; i++) {
      var f = fluffs[i];
      f.hop += dt * 14;
      f.turnT -= dt;
      if (f.scared > 0) {
        f.scared -= dt;
        if (f.scared <= 0) { f.vx = Math.sign(f.vx) * Math.min(460, Math.abs(f.vx) * 1.35); f.turnT = Math.max(f.turnT, 0.4); }
      }
      if (f.turnT <= 0) {
        var sp = Math.min(380, Math.abs(f.vx) * 0.6 + game.random(140, 260));
        f.vx = (Math.random() < 0.6 ? -Math.sign(f.vx) : Math.sign(f.vx)) * sp;
        f.turnT = game.random(0.45, 1.3);
      }
      f.x += f.vx * dt;
      if (f.x < 60) { f.x = 60; f.vx = Math.abs(f.vx); }
      if (f.x > W * 0.74) { f.x = W * 0.74; f.vx = -Math.abs(f.vx); }
    }
    spawnT -= dt;
    if (spawnT <= 0 && fluffs.length < 3) { spawnFluff(Math.random() < 0.25); spawnT = 3.5; }
    if (flashT > 0) flashT -= dt;
  }

  function winGame() {
    finished = true; ok = true; hitStop = 0.4;
    score += Math.round(timeLeft * 15);
    game.feedback.good(BASKET_X, BASKET_Y, { text: 'CLEAR', color: C.good, count: 30, flashColor: '#ffffff' });
    game.audio.play('se_success', 0.55);
    finish();
  }

  function loseGame() {
    finished = true; ok = false; hitStop = 0.5;
    flashT = 0.5; flashX = clawX;
    game.feedback.bad(W / 2, FLOOR_Y - 120, { text: 'TIME UP', color: C.bad, shake: 10 });
    game.audio.play('se_failure', 0.5);
    finish();
  }

  function finish() {
    if (done) return;
    done = true; endWait = 1.2;
    game.audio.stopBgm();
  }

  function drawScene() {
    var t = game.time.elapsed;
    game.draw.gradient(0, FLOOR_Y, [[0, C.sky0], [0.7, C.sky1], [1, C.sea]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(t * 1.4));
    // 遠景: 海と船、カモメ
    game.draw.rect(0, FLOOR_Y - 240, W, 240, C.sea, 0.8);
    for (var w = 0; w < 6; w++) game.draw.rect(((w * 220 + t * 40) % 1320) - 120, FLOOR_Y - 200 + (w % 2) * 60, 90, 8, C.white, 0.7);
    game.draw.sprite(GULL, { w: C.white }, 200 + Math.sin(t * 0.8) * 120, H * 0.29 + Math.sin(t * 2) * 12, 10, { anchor: 'center' });
    game.draw.sprite(GULL, { w: C.white }, 760 + Math.cos(t * 0.6) * 90, H * 0.33 + Math.cos(t * 2.4) * 10, 8, { anchor: 'center' });
    // 桟橋の床
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.dock);
    for (var p = 0; p < 10; p++) game.draw.rect(0, FLOOR_Y + p * 64, W, 4, C.plankLine);
    // レール
    game.draw.rect(40, RAIL_Y - 14, W - 80, 28, C.rail);
    for (var r = 0; r < 12; r++) game.draw.rect(60 + r * 86, RAIL_Y - 6, 40, 12, C.white, 0.5);
    // 籠
    game.draw.sprite(BASKET, BASKET_PAL, BASKET_X, BASKET_Y + Math.sin(t * 2) * 4, 18, { anchor: 'center' });
    // 爪の真下の影(落下点の予告)
    var shAlpha = clawPhase === 'drop' ? 0.55 : 0.3 + 0.1 * Math.sin(t * 8);
    game.draw.circle(clawX, FLOOR_Y + 10, CATCH_R * 0.9, C.shadow, shAlpha * 0.5);
    game.draw.circle(clawX, FLOOR_Y + 10, CATCH_R * 0.35, C.shadow, shAlpha * 0.6);
    // 綿毛
    for (var i = 0; i < fluffs.length; i++) {
      var f = fluffs[i];
      var fy = FLOOR_Y - 34 - Math.abs(Math.sin(f.hop)) * 14;
      game.draw.sprite(FLUFF[Math.floor(f.hop / 3) % 2], f.gold ? GOLD_PAL : FLUFF_PAL, f.x, fy, 11, { anchor: 'center', flipX: f.vx < 0 });
      if (f.scared > 0) game.draw.circle(f.x, fy - 70, 12, C.bad);
    }
    // ケーブル+爪
    game.draw.line(clawX, RAIL_Y, clawX, clawY - 40, C.cable, 8);
    game.draw.rect(clawX - 50, RAIL_Y - 30, 100, 44, C.claw);
    game.draw.sprite(clawPhase === 'lift' || (clawPhase === 'drop' && clawT > DROP_T * 0.9) ? CLAW_SHUT : CLAW_OPEN, CLAW_PAL, clawX, clawY, 16, { anchor: 'center' });
    if (held) game.draw.sprite(FLUFF[0], held.gold ? GOLD_PAL : FLUFF_PAL, clawX, clawY + 60, 10, { anchor: 'center' });
    if (flashT > 0) game.draw.circle(flashX, FLOOR_Y - 40, 110, '#ffffff', flashT * 1.6);
    // 親指ゾーン: 落下レバー
    var lp = clawPhase === 'drop' ? 20 : 0;
    game.draw.rect(W / 2 - 150, LEVER_Y - 50, 300, 100, C.claw);
    game.draw.rect(W / 2 - 140, LEVER_Y - 40, 280, 80, '#b8b2e8');
    game.draw.line(W / 2, LEVER_Y, W / 2 + 40, LEVER_Y - 130 + lp * 4, C.ink, 14);
    game.draw.circle(W / 2 + 40, LEVER_Y - 130 + lp * 4, 36 + Math.sin(t * 5) * 3, clawPhase === 'sweep' ? C.bad : C.gold);
  }

  function drawHud() {
    txt(caught + ' / ' + NEEDED, 60, HUD_Y + 20, 60, C.ink, 'left');
    txt('SCORE ' + score, W - 60, HUD_Y + 20, 40, C.rail, 'right');
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(60, 170, W - 120, 24, '#ffffff', 0.8);
    game.draw.rect(64, 174, (W - 128) * Math.max(0, timeLeft / TIME_LIMIT), 16, low ? C.bad : C.good);
  }

  // ---- ATTRACT デモ: 実ロジックで予測して落とす ----
  var demo = { t: 0, gx: W / 2, gy: LEVER_Y, press: false, n: 0, pressT: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      demo.n++;
      if (demo.t <= dt || caught >= NEEDED - 1) initGame();
    }
    if (clawPhase === 'sweep' && cyc > 0.4 && cyc < 2.4) {
      var sloppy = demo.n % 3 === 0; // 3回に1回は早すぎて外す例
      for (var i = 0; i < fluffs.length; i++) {
        var f = fluffs[i];
        var px = f.x + f.vx * DROP_T;
        if (sloppy ? Math.abs(px - clawX) > 220 : Math.abs(px - clawX) < 26) {
          dropClaw(); demo.pressT = 0.25; break;
        }
      }
    }
    if (demo.pressT > 0) demo.pressT -= dt;
    demo.press = demo.pressT > 0;
    demo.gx = W / 2 + 40; demo.gy = LEVER_Y - 110;
    stepWorld(dt, true);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin', 0.5); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (finished || ready > 0) { game.audio.play('se_tap', 0.15); return; }
    if (!dropClaw()) {
      game.audio.play('se_tap', 0.2);
      game.fx.burst(x, y, { color: C.claw, count: 3, speed: 90 });
    } else {
      game.fx.burst(clawX, RAIL_Y + 60, { color: C.gold, count: 6, speed: 150 });
    }
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (fluffs === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.1, 90, C.rail);
      txt('BEST ' + (game.best || 0), W / 2, H * 0.14, 40, C.ink);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.rail);
      else txt('INSERT COIN', W / 2, H * 0.965, 34, C.ink);
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      game.draw.rect(0, H * 0.18, W, H * 0.24, '#ffffff', 0.6);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.24, 100, ok ? C.good : C.bad);
      txt('SCORE ' + score, W / 2, H * 0.3, 52, C.rail);
      txt(caught + ' / ' + NEEDED, W / 2, H * 0.345, 44, C.ink);
      if (!ok && caught < NEEDED) txt('あと' + (NEEDED - caught) + '匹!', W / 2, H * 0.39, 46, C.bad);
      else if (score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.39, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.39, 40, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.965, 40, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (hitStop > 0) hitStop -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        var stats = { caught: caught, golds: golds };
        if (ok) game.end.success(score, stats);
        else game.end.failure(stats);
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      stepWorld(dt, false);
      if (timeLeft <= 0 && !finished) { timeLeft = 0; loseGame(); }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.42, 110, C.rail);
  });

  game.onStart(function() {
    game.audio.melody([
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['F5', 0.5], ['A5', 0.5], ['G5', 1],
      ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1], ['C5', 1]
    ], { tempo: 150, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
