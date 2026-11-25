// J-N6434-0040-parcel-belt-runner.js
// 仕分けベルトの耐久走 — 速くなるランニングベルトの上で走り続け、シュートから飛んでくる荷物を跳んで・伏せてかわす
// 操作: タップでジャンプ(床を転がる箱)、下スワイプで伏せる(頭の高さを飛ぶ封筒)(社内メモ。画面には出さない)
// 終わり: 制限時間いっぱい走り続ければ成功。ぶつかるたびにベルトの後ろへ押し戻され、3回で落ちて失敗
// @mechanic: camera_run
// @theme: sorting_belt_endurance
// 世界観: 夜の配送センターで、試作の配達ロボが試験用ランニングベルトの上を走り続け、仕分けシュートから飛んでくる荷物を跳んだり伏せたりしてかわす耐久テストに挑む
// 残るもの: 正誤(CLEAR/GAME OVER) + 走った距離・連続回避数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8ドットのタイル反復背景、横1方向スクロール
  var STYLE = { bg: ['#101828', '#28406c', '#4a6aa8'], main: ['#f0d060', '#e07030', '#f8f8f8'], accent: ['#50e070', '#f03848'] };
  var C = { bg1: STYLE.bg[0], bg2: STYLE.bg[1], bg3: STYLE.bg[2], yellow: STYLE.main[0], orange: STYLE.main[1], white: STYLE.main[2], green: STYLE.accent[0], red: STYLE.accent[1], black: '#000000', belt: '#383838' };

  var GAME_TITLE = 'BELT RUNNER';
  var TIME_LIMIT = 20;
  var LIVES = 3;
  var GROUND = H * 0.66;
  var JUMP_V = -1500, GRAV = 4200, DUCK_T = 0.55;
  var PX = 8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var BOT_A = ['..####..', '.#o##o#.', '.######.', '..####..', '.######.', '#.####.#', '..#..#..', '.##..#..'];
  var BOT_B = ['..####..', '.#o##o#.', '.######.', '..####..', '.######.', '#.####.#', '..#..#..', '..#..##.'];
  var BOT_DUCK = ['........', '........', '........', '..####..', '.#o##o#.', '########', '#.####.#', '.##..##.'];
  var BOT_PAL = { '#': '#f8f8f8', 'o': '#f03848' };
  var BOX = ['########', '#y....y#', '#.y..y.#', '#..yy..#', '#..yy..#', '#.y..y.#', '#y....y#', '########'];
  var MAIL = ['########', '##....##', '#.#..#.#', '#..##..#', '########'];
  var BRICK = ['####.###', '####.###', '........', '##.#####', '##.#####', '........'];

  var t0, dist, speed, rx, rxTarget, ry, vy, ducking, obs, spawnT, lives, hits, combo, bestCombo, timeLeft, total;
  var ready, hitStop, stall, finished, ok, done, endWait, warnQ, milestone, hitObj;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 4, y + 4, { size: sz, color: C.black, bold: true, align: align || 'center', font: 'monospace' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center', font: 'monospace' });
  }

  function initGame() {
    dist = 0; speed = 620; rx = W * 0.46; rxTarget = rx; ry = 0; vy = 0; ducking = 0;
    obs = []; spawnT = 1.0; warnQ = []; lives = LIVES; hits = 0; combo = 0; bestCombo = 0;
    timeLeft = TIME_LIMIT; total = 0; ready = 0.8; hitStop = 0; stall = 0;
    finished = false; ok = false; done = false; endWait = 0; milestone = false; hitObj = null;
  }

  function jump() {
    if (finished) return false;
    if (ry < 0) return false;
    vy = JUMP_V; ry = -1; ducking = 0;
    if (state === S.PLAYING) game.audio.play('se_jump', 0.35);
    return true;
  }

  function duck() {
    if (finished) return false;
    if (ry < 0) { vy = Math.max(vy, 900); } // 空中なら急降下
    ducking = DUCK_T;
    if (state === S.PLAYING) game.audio.tone('C4', 0.06, { wave: 'square', volume: 0.05, slide: -120 });
    return true;
  }

  // 予告してから荷物を出す(シュートのランプが点滅して0.6秒後に飛び出す)
  function queueObstacle(kind) {
    warnQ.push({ kind: kind, t: 0.6 });
    if (state === S.PLAYING) game.audio.tone(kind === 'high' ? 'A5' : 'E5', 0.05, { wave: 'square', volume: 0.04 });
  }

  function runnerBox() {
    var h = ducking > 0 && ry >= 0 ? 70 : 150;
    return { x: rx - 40, y: GROUND + ry - h, w: 80, h: h };
  }

  function simulate(dt) {
    if (stall > 0) { stall -= dt; return; }
    total += dt;
    speed = 620 + Math.min(1, total / TIME_LIMIT) * 520; // ベルトが速くなる
    dist += speed * dt;
    rx += (rxTarget - rx) * Math.min(1, dt * 5);
    if (ry < 0) {
      vy += GRAV * dt; ry += vy * dt;
      if (ry >= 0) { ry = 0; vy = 0; }
    }
    if (ducking > 0) ducking -= dt;
    spawnT -= dt;
    if (spawnT <= 0) {
      queueObstacle(game.random(0, 1) < 0.62 ? 'low' : 'high');
      spawnT = Math.max(0.62, 1.05 - total * 0.025) + game.random(0, 0.25);
    }
    for (var w = warnQ.length - 1; w >= 0; w--) {
      warnQ[w].t -= dt;
      if (warnQ[w].t <= 0) {
        var k = warnQ[w].kind;
        obs.push({ kind: k, x: W + 80, y: k === 'low' ? GROUND - 64 : GROUND - 176, w: k === 'low' ? 64 : 80, h: k === 'low' ? 64 : 40, passed: false, flash: 0 });
        warnQ.splice(w, 1);
      }
    }
    var rb = runnerBox();
    for (var i = obs.length - 1; i >= 0; i--) {
      var o = obs[i];
      o.x -= (speed + (o.kind === 'high' ? 180 : 0)) * dt;
      if (o.flash > 0) o.flash -= dt;
      if (!o.passed && game.hit.rect(rb.x, rb.y, rb.w, rb.h, o.x, o.y, o.w, o.h)) {
        o.passed = true; o.flash = 0.4;
        hits++; lives--; combo = 0;
        rxTarget = Math.max(W * 0.12, rxTarget - W * 0.12);
        hitObj = o;
        game.feedback.bad(o.x + o.w / 2, o.y, { text: 'MISS', shake: 12 });
        if (lives <= 0) { finished = true; ok = false; hitStop = 0.55; }
        else stall = 0.3;
        return;
      }
      if (!o.passed && o.x + o.w < rb.x) {
        o.passed = true; combo++;
        if (combo > bestCombo) bestCombo = combo;
        game.feedback.good(rx, GROUND - 220, { text: combo >= 5 ? 'x' + combo : 'NICE', color: C.green, size: 44, volume: 0.2 });
        if (combo % 5 === 0 && state === S.PLAYING) {
          game.fx.popup('COMBO ' + combo, W / 2, H * 0.22, { color: C.yellow, size: 56 });
          game.audio.play('se_milestone', 0.4);
        }
      }
      if (o.x < -120) obs.splice(i, 1);
    }
    if (!milestone && total >= TIME_LIMIT / 2 && state === S.PLAYING) {
      milestone = true;
      game.fx.popup(Math.floor(dist / 100) + 'm', W / 2, H * 0.28, { color: C.green, size: 60 });
      game.audio.play('se_milestone', 0.4);
    }
  }

  // ── 描画 ───────────────────────────────────────────────
  function drawBack() {
    var t = game.time.elapsed;
    game.draw.gradient(0, H, [[0, C.bg1], [0.4, C.bg2], [0.66, C.bg3], [0.67, C.bg1], [1, C.bg1]]);
    game.draw.rect(0, 0, W, H, C.yellow, 0.02 + 0.02 * Math.sin(t * 1.4));
    // レンガのタイル壁(横スクロール)
    var off = -(dist * 0.35) % 64;
    for (var y = 300; y < GROUND - 240; y += 48) {
      for (var x = off - 64; x < W + 64; x += 64) game.draw.sprite(BRICK, { '#': C.bg2 }, x, y, PX, {});
    }
    // 窓の列(遠景)
    var off2 = -(dist * 0.15) % 260;
    for (var wx = off2 - 260; wx < W + 260; wx += 260) {
      game.draw.rect(wx + 40, 340, 140, 100, C.black);
      game.draw.rect(wx + 48, 348, 124, 84, C.bg3, 0.5 + 0.2 * Math.sin(t * 2 + wx));
    }
    // 仕分けシュート(右上): 予告ランプ
    game.draw.rect(W - 220, 240, 220, 60, C.orange);
    game.draw.rect(W - 180, 300, 30, GROUND - 480, C.bg2);
    var warnLow = false, warnHigh = false;
    for (var q = 0; q < warnQ.length; q++) { if (warnQ[q].kind === 'low') warnLow = true; else warnHigh = true; }
    var blink = Math.floor(t * 12) % 2 === 0;
    game.draw.rect(W - 90, GROUND - 200, 60, 60, warnHigh && blink ? C.red : C.bg1);
    game.draw.rect(W - 90, GROUND - 90, 60, 60, warnLow && blink ? C.red : C.bg1);
    if (warnHigh) game.draw.sprite(MAIL, { '#': C.white, '.': C.red }, W - 60, GROUND - 170, 6, { anchor: 'center' });
    if (warnLow) game.draw.sprite(BOX, { '#': C.orange, 'y': C.yellow }, W - 60, GROUND - 60, 5, { anchor: 'center' });
  }

  function drawBelt() {
    var t = game.time.elapsed;
    // ベルト本体+ローラー(回転で速さを見せる)
    game.draw.rect(0, GROUND, W, 40, C.belt);
    var off = -(dist % 80);
    for (var x = off; x < W + 80; x += 80) game.draw.rect(x, GROUND + 6, 40, 8, C.white, 0.5);
    for (var r = 0; r < 8; r++) {
      var cx = 70 + r * 135;
      game.draw.circle(cx, GROUND + 70, 30, C.bg2);
      var a = dist * 0.02 + r;
      game.draw.line(cx, GROUND + 70, cx + Math.cos(a) * 26, GROUND + 70 + Math.sin(a) * 26, C.yellow, 6);
    }
    // ベルトの後端(落ちる所): 赤い危険ライン
    game.draw.rect(0, GROUND - 10, 40, 60, C.red, 0.5 + 0.3 * Math.sin(t * 8));
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      if (o.kind === 'low') game.draw.sprite(BOX, { '#': C.orange, 'y': C.yellow }, o.x, o.y, PX, {});
      else game.draw.sprite(MAIL, { '#': C.white, '.': C.red }, o.x, o.y, 10, {});
      if (o.flash > 0) game.draw.rect(o.x - 10, o.y - 10, o.w + 20, o.h + 20, C.white, o.flash * 1.5);
    }
  }

  function drawRunner() {
    var t = game.time.elapsed;
    var fr = ducking > 0 && ry >= 0 ? BOT_DUCK : (Math.floor(t * 12) % 2 === 0 ? BOT_A : BOT_B);
    if (ry < 0) fr = BOT_A;
    var shadowK = Math.max(0.3, 1 + ry / 300);
    game.draw.rect(rx - 40 * shadowK, GROUND - 6, 80 * shadowK, 10, C.black, 0.5);
    game.draw.sprite(fr, BOT_PAL, rx, GROUND + ry - 80, 20, { anchor: 'center' });
    if (finished && hitStop > 0) game.draw.circle(rx, GROUND + ry - 80, 120, C.white, hitStop * 0.5);
  }

  function drawPad() {
    // 親指ゾーン: 操作盤(ジャンプ/伏せのランプが入力で光る)
    var t = game.time.elapsed;
    var y0 = H * 0.78;
    game.draw.rect(0, y0, W, H - y0, C.bg1);
    for (var x = 0; x < W; x += 64) game.draw.rect(x, y0, 32, 8, C.yellow, 0.6);
    var jumpLit = ry < 0, duckLit = ducking > 0;
    game.draw.rect(W * 0.18, y0 + 90, 260, 170, jumpLit ? C.green : C.bg2);
    game.draw.sprite(['...##...', '..####..', '.######.', '########'], { '#': C.white }, W * 0.18 + 130, y0 + 175, 12, { anchor: 'center' });
    game.draw.rect(W * 0.58, y0 + 90, 260, 170, duckLit ? C.green : C.bg2);
    game.draw.sprite(['########', '.######.', '..####..', '...##...'], { '#': C.white }, W * 0.58 + 130, y0 + 175 + Math.sin(t * 6) * 4, 12, { anchor: 'center' });
  }

  function drawHud() {
    txt(Math.floor(dist / 100) + 'm', 70, 70, 52, C.white, 'left');
    var bw = W - 140;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(70, 118, bw, 20, C.bg2);
    game.draw.rect(70, 118, bw * Math.max(0, 1 - timeLeft / TIME_LIMIT), 20, low ? C.red : C.green);
    for (var i = 0; i < LIVES; i++) game.draw.sprite(BOT_A, BOT_PAL, 100 + i * 80, 196, 6, { anchor: 'center', alpha: i < lives ? 1 : 0.2 });
    if (combo >= 2) txt('x' + combo, W - 70, 70, 48, C.yellow, 'right');
  }

  function drawScene() { drawBack(); drawBelt(); drawRunner(); drawPad(); }

  // ── ATTRACT ゴースト実演(実ロジック: 箱は跳ぶ・封筒は伏せる→1回わざと遅れてぶつかる) ──
  var demo = { t: 0, gx: W / 2, gy: H * 0.9, press: false, n: 0, pressT: 0, script: 0 };
  var SCRIPT = [[0.4, 'low'], [1.3, 'high'], [2.2, 'low'], [3.1, 'low'], [3.9, 'high']];
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 5.6;
    if (cyc < dt || demo.t <= dt) { initGame(); ready = 0; spawnT = 99; demo.script = 0; demo.n = 0; }
    if (demo.script < SCRIPT.length && cyc >= SCRIPT[demo.script][0]) { queueObstacle(SCRIPT[demo.script][1]); demo.script++; }
    spawnT = 99;
    simulate(dt);
    if (lives < 1) { lives = LIVES; finished = false; }
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      if (o.passed || o.acted) continue;
      var gap = o.x - (rx + 40);
      if (o.kind === 'low' && gap < speed * 0.2 && gap > 0) {
        o.acted = true; demo.n++;
        if (demo.n !== 3) { jump(); demo.pressT = 0.18; demo.gx = W * 0.18 + 130; demo.gy = H * 0.78 + 175; }
      }
      if (o.kind === 'high' && gap < speed * 0.3 && gap > 0) {
        o.acted = true; demo.n++;
        duck(); demo.pressT = 0.25; demo.gx = W * 0.58 + 130; demo.gy = H * 0.78 + 120;
      }
    }
    if (demo.pressT > 0) { demo.pressT -= dt; if (ducking > 0) demo.gy += dt * 300; }
    demo.press = demo.pressT > 0;
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (ready > 0 || finished) { game.audio.play('se_tap', 0.1); return; }
    if (!jump()) game.audio.play('se_tap', 0.1);
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    if (dir === 'down') duck();
    else if (dir === 'up') jump();
    else game.audio.play('se_tap', 0.1);
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dist === undefined) initGame();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      txt(GAME_TITLE, W / 2, H * 0.06, 70, C.yellow);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.105, 36, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.97, 44, C.yellow);
      else txt('TAP TO START', W / 2, H * 0.97, 40, C.white);
      return;
    }
    if (state === S.RESULT) { drawScene(); drawResult(); return; }

    if (done) {
      endWait -= dt;
      if (!ok) rx -= dt * 400;
      if (endWait <= 0) {
        state = S.RESULT;
        drawScene(); drawResult();
        var score = Math.floor(dist / 100) + bestCombo * 20 + (ok ? lives * 100 : 0);
        var st = { meters: Math.floor(dist / 100), bestCombo: bestCombo, hits: hits };
        if (ok) game.end.success(score, st); else game.end.failure(st);
        return;
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
      if (hitStop <= 0) {
        done = true; endWait = 1.2;
        game.audio.stopBgm();
        game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
        if (ok) game.fx.burst(rx, GROUND - 100, { color: C.yellow, count: 40, speed: 600 });
      }
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap', 0.3);
    } else if (!finished) {
      timeLeft -= dt;
      simulate(dt);
      if (timeLeft <= 0 && !finished) {
        timeLeft = 0; finished = true; ok = true; hitStop = 0.45;
        game.feedback.good(rx, GROUND - 240, { text: 'FINISH', color: C.yellow, size: 60 });
      }
    }

    drawScene();
    drawHud();
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 100, C.yellow);
    if (done) txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.4, 90, ok ? C.green : C.red);
  });

  function drawResult() {
    game.draw.rect(0, 0, W, H, C.black, 0.55);
    txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.25, 96, ok ? C.green : C.red);
    txt(Math.floor(dist / 100) + 'm', W / 2, H * 0.34, 72, C.white);
    txt('COMBO ' + bestCombo, W / 2, H * 0.4, 46, C.yellow);
    var score = Math.floor(dist / 100) + bestCombo * 20 + (ok ? lives * 100 : 0);
    if (ok && score > (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.46, 54, C.yellow);
    else txt('BEST ' + (game.best || 0), W / 2, H * 0.46, 42, C.white);
    if (!ok) txt('あと' + Math.max(1, Math.ceil(timeLeft)) + '秒!', W / 2, H * 0.52, 54, C.red);
    if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 40, C.white);
  }

  game.onStart(function() {
    game.audio.melody([['E5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5], ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5], ['D5', 0.5], ['E5', 1]], { tempo: 168, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['E2', 1]] });
    state = S.ATTRACT;
    initGame();
    demo.t = 0;
  });
})(game);
