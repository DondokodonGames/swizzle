// J-N6434-0009-timber-log-roll.js
// 貯木場の丸太乗り — 回り続ける丸太の上で左右に踏み替え、終業の鐘まで川へ落ちずに立ち続ける
// 操作: 画面の左半分/右半分をタップするとその側へ一歩踏み替えて重心を戻す(社内メモ。画面には出さない)
// 終わり: 16秒立ち続ければ成功。重心が限界を超えて川に落ちたら失敗
// @mechanic: balance
// @theme: timber_river_log_roll
// 世界観: 川の貯木場で働く見習いのカワウソ筏師が、流れに合わせて回転を変える丸太の上で足を踏み替え、横波に崩されずに終業の鐘まで立ち続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 立っていた秒数と立て直し回数
// スタイル: 90s 16bit

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 90s 16bit: 多色・高彩度、2〜3層の背景で奥行き
  var STYLE = {
    bg: ['#7ec8f2', '#bfe8ff', '#2d7fa8'],
    main: ['#8a5a2b', '#c98a4b', '#5b3515'],
    accent: ['#ffd84a', '#ff5a4a'],
  };
  var C = {
    sky1: STYLE.bg[0], sky2: STYLE.bg[1], river: STYLE.bg[2], river2: '#1d5f82', foam: '#e8fbff',
    log: STYLE.main[0], logHi: STYLE.main[1], logDark: STYLE.main[2],
    gold: STYLE.accent[0], red: STYLE.accent[1], ink: '#10223a', white: '#ffffff', green: '#5fe07a',
  };

  var GAME_TITLE = 'LOG ROLL';
  var TIME_LIMIT = 16;
  var LOG_Y = H * 0.56;
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  // カワウソ筏師(上半身 2フレーム / 足 2フレーム)
  var TORSO = [
    ['..bbbb..', '.bbbbbb.', '.bwkbwk.', '.bbbnbb.', '..bbbb..', '.rrrrrr.', 'brrrrrrb', 'b.rrrr.b', '..rrrr..'],
    ['..bbbb..', '.bbbbbb.', '.bkwbkw.', '.bbbnbb.', '..bbbb..', '.rrrrrr.', 'brrrrrrb', 'b.rrrr.b', '..rrrr..'],
  ];
  var LEGS = [
    ['.bb..bb.', '.bb..bb.', 'bb....bb', 'kk....kk'],
    ['..bbbb..', '.bb..bb.', '.bb..bb.', '.kk..kk.'],
  ];
  var OTTER_PAL = { b: '#7a4a24', w: '#ffffff', k: '#1a1010', n: '#2a1a14', r: '#e0463a' };
  var PINE = ['...g...', '..ggg..', '.ggggg.', '..ggg..', '.ggggg.', 'ggggggg', '...t...', '...t...'];
  var PINE_PAL = { g: '#2f7a4a', t: '#5b3515' };
  var BELL = ['..yy..', '.yyyy.', '.yyyy.', 'yyyyyy', '..kk..'];
  var BELL_PAL = { y: '#ffd84a', k: '#5b3515' };
  var ARROW_L = ['...w', '..ww', '.www', 'wwww', '.www', '..ww', '...w'];
  var ARROW_R = ['w...', 'ww..', 'www.', 'wwww', 'www.', 'ww..', 'w...'];

  var lean, leanV, spin, spinTarget, spinSwapT, spinWarn;
  var wave, waveT, survived, fixes, combo, timeLeft;
  var ready, phase, stopT, ok, ended, resultT, flashT, halfShown, runFrame, stepSide, stepT;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function initGame() {
    lean = 0; leanV = 0; spin = 0.6; spinTarget = 0.6; spinSwapT = 2.4; spinWarn = 0;
    wave = null; waveT = 2.0; survived = 0; fixes = 0; combo = 0; timeLeft = TIME_LIMIT;
    ready = 0.8; phase = 'ready'; stopT = 0; ok = false; ended = false; resultT = 0;
    flashT = 0; halfShown = false; runFrame = 0; stepSide = 0; stepT = 0;
  }

  // 一歩踏み替える(プレイヤーもデモAIも同じ関数を通る)
  function stepTo(side, x, y, live) {
    if (phase !== 'play') return;
    var before = Math.abs(lean);
    leanV += side * 0.7;
    lean += side * 0.08;
    stepSide = side; stepT = 0.18;
    var after = Math.abs(lean + leanV * 0.15);
    if (!live) { game.fx.burst(x, y, { color: C.foam, count: 5, speed: 180 }); return; }
    game.audio.play('se_tap', 0.35);
    if (before > 0.32 && after < before) {
      fixes++; combo++;
      game.feedback.good(x, y, { text: combo >= 3 ? 'x' + combo : 'NICE', color: C.green, size: 48, count: 8 });
    } else if (after > 0.7) {
      combo = 0;
      game.feedback.bad(x, y, { text: null, shake: 4 });
    } else {
      game.fx.burst(x, y, { color: C.foam, count: 6, speed: 220 });
    }
  }

  function fall(live) {
    phase = 'stop'; stopT = 0.55; ok = false; flashT = 0.55;
    if (live) {
      game.audio.stopBgm();
      game.feedback.bad(W / 2 + lean * 260, LOG_Y - 150, { text: 'MISS', color: C.red, shake: 14 });
      game.audio.play('se_failure', 0.5);
    }
  }

  function clearRun(live) {
    phase = 'stop'; stopT = 0.7; ok = true; flashT = 0.4;
    if (live) {
      game.audio.stopBgm();
      game.feedback.good(W / 2, LOG_Y - 180, { text: 'CLEAR', color: C.gold, size: 72, count: 24 });
      game.audio.play('se_success', 0.55);
    }
  }

  // 丸太・波・重心の物理(ATTRACTでも同じものを回す)
  function stepWorld(dt, live) {
    runFrame += dt * (4 + Math.abs(spin) * 6);
    if (stepT > 0) stepT -= dt;
    if (phase !== 'play') return;
    survived += dt;
    if (live) timeLeft = Math.max(0, TIME_LIMIT - survived);
    var hard = Math.min(1, survived / TIME_LIMIT);

    // 回転方向の切り替え: 0.7秒前に丸太に矢印が点滅(telegraph)
    spinSwapT -= dt;
    if (spinSwapT < 0.7 && spinWarn === 0) {
      spinWarn = 1;
      spinTarget = -Math.sign(spin) * (0.6 + hard * 0.7);
      if (live) game.audio.tone('A5', 0.08, { wave: 'square', volume: 0.06 });
    }
    if (spinSwapT <= 0) { spin = spinTarget; spinWarn = 0; spinSwapT = 2.6 - hard * 0.9 + Math.random() * 0.6; }

    // 横波: 0.7秒前に岸の泡が点滅してから当たる
    waveT -= dt;
    if (!wave && waveT <= 0.7) {
      wave = { side: Math.random() < 0.5 ? -1 : 1, t: 0.7, hit: false };
      if (live) game.audio.tone('D5', 0.1, { wave: 'triangle', volume: 0.06 });
    }
    if (wave) {
      wave.t -= dt;
      if (wave.t <= 0 && !wave.hit) { wave.hit = true; leanV += -wave.side * (0.7 + hard * 0.42); if (live) game.fx.shake(6, 0.15); }
      if (wave.t < -0.5) { wave = null; waveT = 2.2 - hard * 0.8 + Math.random() * 0.5; }
    }

    // 回転が足元を運び、傾きは自重で増える(不安定平衡)
    leanV += (spin * 0.63 + lean * 1.8) * dt;
    leanV *= Math.pow(0.5, dt);
    lean += leanV * dt;

    if (live && !halfShown && survived >= TIME_LIMIT / 2) {
      halfShown = true;
      game.audio.play('se_milestone', 0.4);
      game.fx.popup('8秒', W / 2, H * 0.3, { color: C.gold, size: 60 });
    }
    if (Math.abs(lean) >= 1) fall(live);
    else if (live && survived >= TIME_LIMIT) clearRun(live);
  }

  function drawBack() {
    var pulse = 0.05 + 0.04 * Math.sin(game.time.elapsed * 1.6);
    game.draw.gradient(0, H * 0.42, [[0, C.sky1], [1, C.sky2]]);
    // 遠景の山と森(2層)
    for (var i = 0; i < 9; i++) {
      var mx = ((i * 170 + game.time.elapsed * 6) % (W + 200)) - 100;
      game.draw.circle(mx, H * 0.42, 150, '#8fb7cf');
    }
    for (var p = 0; p < 7; p++) {
      var px = ((p * 180 + 40 + game.time.elapsed * 14) % (W + 160)) - 80;
      game.draw.sprite(PINE, PINE_PAL, px, H * 0.4 + Math.sin(p + game.time.elapsed * 0.8) * 3, 14, { anchor: 'center' });
    }
    game.draw.gradient(H * 0.42, H, [[0, C.river], [1, C.river2]]);
    for (var r = 0; r < 14; r++) {
      var ry = H * 0.45 + r * 100;
      var rx = ((r * 230 + game.time.elapsed * (60 + r * 8)) % (W + 300)) - 150;
      game.draw.rect(rx, ry, 180, 6, C.foam, 0.35);
    }
    game.draw.rect(0, 0, W, H, C.white, pulse);
  }

  function drawLog() {
    game.draw.rect(60, LOG_Y - 60, W - 120, 120, C.log);
    game.draw.rect(60, LOG_Y - 60, W - 120, 22, C.logHi);
    game.draw.rect(60, LOG_Y + 40, W - 120, 20, C.logDark);
    // 回転の縞(回転方向に流れる)
    var off = (runFrame * 40 * Math.sign(spin || 1)) % 90;
    for (var k = -1; k < 12; k++) {
      var sx = 80 + k * 90 + off;
      if (sx > 70 && sx < W - 90) game.draw.rect(sx, LOG_Y - 50, 10, 100, C.logDark, 0.6);
    }
    game.draw.circle(60, LOG_Y, 60, C.logHi);
    game.draw.circle(60, LOG_Y, 36, C.log);
    game.draw.circle(W - 60, LOG_Y, 60, C.logHi);
    game.draw.circle(W - 60, LOG_Y, 36, C.log);
    // 水しぶき
    for (var s = 0; s < 6; s++) {
      var bx = 90 + s * 180 + Math.sin(game.time.elapsed * 5 + s) * 12;
      game.draw.circle(bx, LOG_Y + 66, 16 + Math.sin(game.time.elapsed * 7 + s) * 5, C.foam, 0.7);
    }
    // 回転切り替えの予告矢印
    if (spinWarn && Math.floor(game.time.elapsed * 10) % 2 === 0) {
      game.draw.sprite(spinTarget < 0 ? ARROW_L : ARROW_R, { w: C.gold }, W / 2, LOG_Y + 4, 14, { anchor: 'center' });
    }
  }

  function drawOtter() {
    var fx = W / 2 + lean * 60;
    var bodyX = W / 2 + lean * 260;
    var bob = Math.sin(runFrame * 2) * 6;
    var legF = Math.floor(runFrame) % 2;
    var scale = 14;
    if (phase === 'stop' && !ok) scale = 14 + (0.55 - Math.max(0, stopT)) * 12;
    game.draw.circle(fx, LOG_Y - 58, 70, C.logDark, 0.35);
    game.draw.sprite(LEGS[legF], OTTER_PAL, fx, LOG_Y - 88 + bob * 0.3, scale, { anchor: 'center' });
    game.draw.line(fx, LOG_Y - 110, bodyX, LOG_Y - 170 + bob, OTTER_PAL.b, 26);
    game.draw.sprite(TORSO[legF], OTTER_PAL, bodyX, LOG_Y - 210 + bob, scale, { anchor: 'center' });
    if (flashT > 0 && Math.floor(flashT * 20) % 2 === 0) game.draw.circle(bodyX, LOG_Y - 200, 110, C.white, 0.55);
  }

  function drawWave() {
    if (!wave) return;
    var ex = wave.side < 0 ? 0 : W - 60;
    if (wave.t > 0) {
      if (Math.floor(game.time.elapsed * 12) % 2 === 0) game.draw.rect(ex, LOG_Y - 140, 60, 280, C.foam, 0.8);
    } else {
      var wx = wave.side < 0 ? (-wave.t) * 1800 : W - (-wave.t) * 1800;
      game.draw.rect(wx - 40, LOG_Y + 20, 80, 70, C.foam, 0.9);
    }
  }

  function drawMeter() {
    // 重心メーター(画面下の親指ゾーン上端)
    var my = H * 0.74;
    game.draw.rect(140, my, W - 280, 28, '#0e3550', 0.8);
    game.draw.rect(W / 2 - 3, my - 8, 6, 44, C.white);
    var danger = Math.abs(lean) > 0.7;
    game.draw.circle(W / 2 + lean * (W / 2 - 150), my + 14, 26, danger ? C.red : C.gold);
    game.draw.rect(140, my, 30, 28, C.red, 0.8);
    game.draw.rect(W - 170, my, 30, 28, C.red, 0.8);
  }

  function drawPads(pressSide) {
    var py = H * 0.86;
    game.draw.circle(W * 0.25, py, 120, pressSide < 0 ? C.gold : '#0e3550', 0.75);
    game.draw.circle(W * 0.75, py, 120, pressSide > 0 ? C.gold : '#0e3550', 0.75);
    game.draw.sprite(ARROW_L, { w: C.white }, W * 0.25, py, 18, { anchor: 'center' });
    game.draw.sprite(ARROW_R, { w: C.white }, W * 0.75, py, 18, { anchor: 'center' });
  }

  function drawHud() {
    var bw = W - 160;
    var low = timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 === 0;
    game.draw.rect(80, 150, bw, 22, '#0e3550', 0.8);
    var progress = Math.min(1, survived / TIME_LIMIT);
    game.draw.rect(80, 150, bw * progress, 22, low ? C.red : C.gold);
    game.draw.sprite(BELL, BELL_PAL, W - 70, 160, 9, { anchor: 'center' });
    txt(Math.ceil(timeLeft) + '', W / 2, H * 0.05, 64, C.white);
    txt('SCORE ' + fixes, 60, H * 0.105, 34, C.gold, 'left');
    txt('BEST ' + (game.best || 0), W - 60, H * 0.105, 34, C.white, 'right');
  }

  var demo = { t: 0, gx: W * 0.25, gy: H * 0.86, press: false, cool: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 6;
    if (cyc < dt || demo.t <= dt) { initGame(); phase = 'play'; ready = 0; }
    demo.cool -= dt;
    demo.press = false;
    if (phase === 'play') {
      if (cyc < 4.2) {
        var pred = lean + leanV * 0.25;
        if (demo.cool <= 0 && Math.abs(pred) > 0.28) {
          var side = pred > 0 ? -1 : 1;
          demo.gx = side < 0 ? W * 0.25 : W * 0.75; demo.gy = H * 0.86;
          stepTo(side, demo.gx, demo.gy, false);
          demo.cool = 0.32; demo.press = true;
        } else if (demo.cool > 0.15) demo.press = true;
      } else {
        // 失敗例: 手を止めて落ちる
        demo.gx = W * 0.5; demo.gy = H * 0.9;
        leanV += Math.sign(lean || 1) * dt * 1.6;
      }
    } else if (phase === 'stop') {
      stopT -= dt;
      if (flashT > 0) flashT -= dt;
    }
    stepWorld(dt, false);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.5);
      state = S.PLAYING; initGame(); demo.t = 0;
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) {
      if (phase === 'play') stepTo(x < W / 2 ? -1 : 1, x, y, true);
      else game.audio.play('se_tap', 0.1);
    }
  });

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      stepDemo(dt);
      drawBack(); drawLog(); drawWave(); drawOtter(); drawMeter();
      drawPads(demo.press ? (demo.gx < W / 2 ? -1 : 1) : 0);
      txt(GAME_TITLE, W / 2, H * 0.1, 96, C.gold);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.17, 38, C.white);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 46, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.96, 40, C.white);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 14 });
      return;
    }

    if (state === S.RESULT) {
      resultT += dt;
      drawBack(); drawLog(); drawOtter();
      game.draw.rect(0, H * 0.24, W, H * 0.3, C.ink, 0.6);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.3, 104, ok ? C.gold : C.red);
      txt(survived.toFixed(1) + '秒', W / 2, H * 0.38, 60, C.white);
      txt('SCORE ' + fixes, W / 2, H * 0.44, 44, C.gold);
      var isNew = ok && fixes > (game.best || 0);
      if (isNew) txt('NEW RECORD', W / 2, H * 0.5, 50, C.green);
      else if (!ok) txt('あと' + Math.max(0.1, TIME_LIMIT - survived).toFixed(1) + '秒!', W / 2, H * 0.5, 50, C.gold);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.5, 40, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 42, C.white);
      if (!ended && resultT > 1.3) {
        ended = true;
        if (ok) game.end.success(fixes * 10 + 100, { seconds: +survived.toFixed(1), fixes: fixes });
        else game.end.failure({ seconds: +survived.toFixed(1), fixes: fixes });
      }
      return;
    }

    // PLAYING
    if (phase === 'ready') {
      ready -= dt;
      if (ready <= 0) { phase = 'play'; game.audio.play('se_jump', 0.3); }
    } else if (phase === 'stop') {
      stopT -= dt; if (flashT > 0) flashT -= dt;
      if (stopT <= 0) { state = S.RESULT; resultT = 0; }
    }
    stepWorld(dt, true);
    drawBack(); drawLog(); drawWave(); drawOtter(); drawMeter();
    drawPads(stepT > 0 ? stepSide : 0);
    drawHud();
    if (phase === 'ready') txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.32, 110, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([
      ['G4', 0.5], ['B4', 0.5], ['D5', 0.5], ['B4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1],
      ['G4', 0.5], ['A4', 0.5], ['B4', 0.5], ['G4', 0.5], ['A4', 0.5], ['F#4', 0.5], ['G4', 1],
    ], { tempo: 150, wave: 'square', volume: 0.05, loop: true, bass: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
