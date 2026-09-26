// J-N6424-0044-mole-handcar-pump.js
// モール・ハンドカー・パンプ — 上下するトロッコのハンドルが「てっぺん」に来た窓の瞬間だけ押して加速し、峠の祭りの門まで走り切る
// 操作: ハンドルが最上点で光った瞬間にタップすると加速。窓の外で押すと空振りして減速する。金色に光る回は倍の加速
// 終わり: 80m先の門に着けば成功。3秒間止まったまま(エンスト)、または12秒の時間切れで失敗
// @mechanic: timing_window
// @theme: mine_handcar_festival
// 世界観: 坑道の祭りの夜、モグラの坑夫が手押しトロッコでランプ油の樽を峠の祭り門まで運ぶ。ハンドルが上がりきった一瞬に体重を乗せないと車輪は進まない
// 残るもの: 正誤(CLEAR/GAME OVER) + 到着タイムとPERFECT数・空振り数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、8x8ドット、タイル反復背景、1方向スクロール
  var STYLE = { bg: ['#000000', '#1c1c5c', '#3c3cbc'], main: ['#fcfcfc', '#a4a4a4', '#7c4c1c'], accent: ['#fcbc3c', '#d82800'] };

  var TITLE = 'HANDCAR RUN';
  var TIME_LIMIT = 12;
  var GOAL_M = 80;
  var RAIL_Y = H * 0.6;
  var CAR_X = W * 0.42;
  var PX_PER_M = 40;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;

  var MOLE_UP = ['.hh..hh.', '.hh..hh.', '..mmmm..', '.mmmmmm.', '.mkmmkm.', '.mmppmm.', '..mmmm..', '.mmmmmm.', 'mm.mm.mm'];
  var MOLE_DN = ['........', '..mmmm..', '.mmmmmm.', '.mkmmkm.', '.mmppmm.', 'hmmmmmmh', 'hmmmmmmh', '.mmmmmm.', 'mm.mm.mm'];
  var MOLE_PAL = { m: '#7c4c1c', k: '#000000', p: '#fc7460', h: '#fcbc3c' };
  var BARREL = ['.bbbbbb.', 'bwbbbbwb', 'bbbbbbbb', 'bwbbbbwb', '.bbbbbb.'];
  var WHEEL_A = ['.ww.', 'w..w', 'w..w', '.ww.'];
  var WHEEL_B = ['.w.w', 'w...', '...w', 'w.w.'];
  var GATE = ['r......r', 'rrrrrrrr', 'r.y..y.r', 'r......r', 'r......r', 'r......r', 'r......r'];
  var BRICK = ['bbbb.bbb', '........', 'bb.bbbbb', '........'];

  var run = null;
  var demo = { t: 0, gx: W / 2, gy: H * 0.85, press: false, pressT: 0, tops: 0 };

  function txt(s, x, y, size, color) {
    game.draw.text(s, x + 4, y + 4, { size: size, color: '#000000', bold: true, align: 'center' });
    game.draw.text(s, x, y, { size: size, color: color, bold: true, align: 'center' });
  }

  function newRun(isDemo) {
    return {
      demo: isDemo, v: 0, dist: 0, phase: 0.35, strokeUsed: false, lastTopIdx: -1, topCount: 0,
      perfect: 0, good: 0, whiff: 0, jolt: 0, hitStop: 0, over: false, win: false, endWait: -1,
      ready: isDemo ? 0 : 0.8, timeLeft: TIME_LIMIT, elapsed: 0, milestone: false, score: 0, glow: 0
    };
  }

  function period() { return Math.max(0.66, 0.92 - run.v * 0.018); }
  function halfWindow() { return Math.max(0.07, 0.12 - run.v * 0.0035); }
  // distance (in phase units) from the top of the stroke; 0 = handle fully up
  function fromTop() { var p = run.phase % 1; return Math.min(p, 1 - p); }
  function isGolden() { return Math.round(run.phase) % 5 === 4; }
  function handleLift() { return Math.cos(run.phase * Math.PI * 2); }

  function pump() {
    var d = fromTop();
    var topIdx = Math.round(run.phase);
    if (d <= halfWindow()) {
      if (run.strokeUsed && run.lastTopIdx === topIdx) { game.audio.play('se_tap', 0.1); return; }
      run.strokeUsed = true; run.lastTopIdx = topIdx;
      var perfect = d <= 0.035;
      var gold = topIdx % 5 === 4;
      var boost = (perfect ? 2.8 : 2.1) * (gold ? 2 : 1);
      run.v = Math.min(15, run.v + boost);
      run.glow = 0.25;
      if (perfect) run.perfect++; else run.good++;
      game.audio.play('se_tap', 0.3);
      game.audio.tone(gold ? 'G5' : (perfect ? 'E5' : 'C5'), 0.08, { wave: 'square', volume: 0.06 });
      if (!run.demo) game.feedback.good(CAR_X, RAIL_Y - 330, { text: gold ? 'x2' : (perfect ? 'PERFECT' : 'GOOD'), color: gold ? STYLE.accent[0] : '#5cfc5c', size: perfect || gold ? 60 : 48 });
      if (gold) game.audio.play('se_powerup', 0.25);
    } else {
      run.whiff++;
      run.v = Math.max(0, run.v - 2);
      run.jolt = 0.3;
      if (!run.demo) game.feedback.bad(CAR_X, RAIL_Y - 300, { text: 'MISS', shake: 6 });
      else game.audio.tone('C3', 0.1, { wave: 'sawtooth', volume: 0.05 });
    }
  }

  function step(dt) {
    if (run.glow > 0) run.glow -= dt;
    if (run.jolt > 0) run.jolt -= dt;
    if (run.hitStop > 0) {
      run.hitStop -= dt;
      if (run.hitStop <= 0 && run.over) run.endWait = 0.6;
      return;
    }
    if (run.over) return;
    run.elapsed += dt;
    var prevTop = Math.round(run.phase);
    run.phase += dt / period();
    var nowTop = Math.round(run.phase);
    if (nowTop !== prevTop) { run.strokeUsed = false; }
    // entering a new top window: tick so the ear can find it
    if (Math.floor(run.phase + halfWindow()) !== Math.floor(run.phase + halfWindow() - dt / period())) {
      run.topCount++;
      game.audio.tone(isGolden() ? 'A5' : 'A4', 0.03, { wave: 'triangle', volume: 0.04 });
    }
    run.v *= Math.pow(0.8, dt);
    run.dist += run.v * dt;
    // stall: the cart standing still for 3s means the run is lost
    run.stall = run.v < 0.6 ? (run.stall || 0) + dt : 0;
    if (!run.demo && run.stall >= 3) {
      run.over = true; run.win = false; run.stalled = true; run.hitStop = 0.5; run.jolt = 0.5;
      game.feedback.bad(CAR_X, RAIL_Y - 300, { text: 'MISS' });
      game.audio.play('se_break', 0.3);
      return;
    }
    if (!run.demo && !run.milestone && run.dist >= GOAL_M / 2) {
      run.milestone = true;
      game.fx.popup(Math.round(GOAL_M / 2) + 'm', W / 2, H * 0.3, { color: STYLE.accent[0], size: 64 });
      game.audio.play('se_milestone', 0.4);
    }
    if (!run.demo && run.dist >= GOAL_M) {
      run.dist = GOAL_M; run.over = true; run.win = true; run.hitStop = 0.5;
      game.fx.burst(CAR_X + 200, RAIL_Y - 200, { color: STYLE.accent[0], count: 40, speed: 560 });
      game.audio.play('se_coin', 0.4);
    }
    if (run.demo) {
      var d = fromTop();
      var p = run.phase % 1;
      var sloppy = demo.tops % 4 === 3;
      if (!run.strokeUsed && !sloppy && d < 0.02) {
        demo.tops++; demo.press = true; demo.pressT = 0.2; pump();
      } else if (sloppy && p > 0.48 && p < 0.52) {
        demo.tops++; demo.press = true; demo.pressT = 0.2; pump();
      }
      if (run.dist > 60) run.dist = 0;
    }
  }

  function drawWorld() {
    var t = game.time.elapsed;
    game.draw.gradient(0, RAIL_Y, [[0, STYLE.bg[0]], [0.5, STYLE.bg[1]], [1, STYLE.bg[2]]]);
    // stars (tile repeat)
    for (var s = 0; s < 24; s++) game.draw.rect((s * 173 + 40) % W, 240 + (s * 97) % 420, 8, 8, '#fcfcfc', Math.floor(t * 2 + s) % 3 ? 1 : 0.3);
    // far ridge: 8px stepped silhouette, scrolls slowly
    var off = (run.dist * PX_PER_M * 0.2) % 64;
    for (var i = -1; i < 19; i++) {
      var hh = 80 + ((i * 37 + Math.floor(run.dist * PX_PER_M * 0.2 / 64) * 37) % 5) * 32;
      game.draw.rect(i * 64 - off, RAIL_Y - 120 - hh, 64, hh + 120, '#1c1c5c');
    }
    // festival lanterns on the far ridge
    for (var l = 0; l < 6; l++) {
      var lx = ((l * 220 - run.dist * PX_PER_M * 0.35) % (W + 220) + W + 220) % (W + 220) - 110;
      game.draw.rect(lx, RAIL_Y - 260 + Math.sin(t * 2 + l) * 6, 24, 32, l % 2 ? STYLE.accent[1] : STYLE.accent[0]);
    }
    // ground tiles
    game.draw.rect(0, RAIL_Y, W, H - RAIL_Y, '#7c4c1c');
    var toff = (run.dist * PX_PER_M) % 64;
    for (var gy = 0; gy < 12; gy++) {
      for (var gx = -1; gx < 18; gx++) {
        game.draw.sprite(BRICK, { b: '#503000' }, gx * 64 - toff + (gy % 2) * 32, RAIL_Y + 40 + gy * 32, 8);
      }
    }
    // rails + sleepers scroll with the car
    var soff = (run.dist * PX_PER_M) % 96;
    for (var k = -1; k < 13; k++) game.draw.rect(k * 96 - soff, RAIL_Y + 8, 48, 24, '#503000');
    game.draw.rect(0, RAIL_Y, W, 12, '#a4a4a4');
    // gate at the goal distance
    var gateX = CAR_X + (GOAL_M - run.dist) * PX_PER_M;
    if (gateX < W + 200) game.draw.sprite(GATE, { r: STYLE.accent[1], y: STYLE.accent[0] }, gateX, RAIL_Y - 170, 28, { anchor: 'center' });
    game.draw.rect(0, 0, W, H, '#3c3cbc', 0.03 + 0.03 * Math.sin(t * 1.6));
  }

  function drawCar() {
    var t = game.time.elapsed;
    var lift = handleLift();
    var jx = run.jolt > 0 ? Math.sin(t * 60) * 8 : 0;
    var cx = CAR_X + jx;
    var wheel = Math.floor(run.dist * 3) % 2 ? WHEEL_A : WHEEL_B;
    game.draw.sprite(wheel, { w: '#a4a4a4' }, cx - 110, RAIL_Y - 30, 14, { anchor: 'center' });
    game.draw.sprite(wheel, { w: '#a4a4a4' }, cx + 110, RAIL_Y - 30, 14, { anchor: 'center' });
    game.draw.rect(cx - 180, RAIL_Y - 90, 360, 50, '#7c4c1c');
    game.draw.rect(cx - 180, RAIL_Y - 90, 360, 8, STYLE.accent[0]);
    game.draw.sprite(BARREL, { b: '#a45c1c', w: '#fcbc3c' }, cx + 110, RAIL_Y - 130, 12, { anchor: 'center' });
    // seesaw handle: pivot post + beam whose ends rise and fall
    var px = cx - 30, py = RAIL_Y - 200;
    game.draw.rect(px - 10, py, 20, 110, '#a4a4a4');
    var endY = py - lift * 90;
    var golden = isGolden();
    var inWin = fromTop() <= halfWindow();
    var beamCol = inWin ? (golden ? STYLE.accent[0] : '#5cfc5c') : '#fcfcfc';
    game.draw.line(px - 140, py + lift * 90, px + 140, endY, beamCol, 18);
    if (inWin) game.draw.circle(px + 140, endY, 40 + Math.sin(t * 30) * 4, beamCol, 0.5);
    if (run.glow > 0) game.draw.circle(px + 140, endY, 70, '#ffffff', run.glow * 2);
    // top window marker (ghost of the top position)
    game.draw.rect(px + 110, py - 104, 60, 8, golden ? STYLE.accent[0] : '#5cfc5c', 0.6);
    var art = lift > 0.2 ? MOLE_UP : MOLE_DN;
    game.draw.sprite(art, MOLE_PAL, px + 150, endY - 60 + Math.sin(t * 4) * 3, 12, { anchor: 'center' });
  }

  function drawPad() {
    var inWin = fromTop() <= halfWindow();
    var col = inWin ? (isGolden() ? STYLE.accent[0] : '#5cfc5c') : '#503000';
    game.draw.rect(W * 0.2, H * 0.8, W * 0.6, 170, '#000000');
    game.draw.rect(W * 0.2 + 12, H * 0.8 + 12, W * 0.6 - 24, 146, col);
    var lift = handleLift();
    game.draw.rect(W / 2 - 110, H * 0.8 + 75 - lift * 40, 220, 20, '#fcfcfc');
    game.draw.rect(W / 2 - 10, H * 0.8 + 85 - lift * 40, 20, 60 + lift * 40, '#a4a4a4');
  }

  function drawHud() {
    var prog = Math.min(1, run.dist / GOAL_M);
    txt(Math.floor(run.dist) + 'm', W / 2, 100, 64, '#fcfcfc');
    game.draw.rect(60, 150, W - 120, 24, '#000000');
    game.draw.rect(64, 154, (W - 128) * prog, 16, STYLE.accent[0]);
    game.draw.sprite(GATE, { r: STYLE.accent[1], y: STYLE.accent[0] }, W - 60, 162, 4, { anchor: 'center' });
    var frac = Math.max(0, run.timeLeft / TIME_LIMIT);
    game.draw.rect(60, 196, W - 120, 14, '#000000');
    game.draw.rect(60, 196, (W - 120) * frac, 14, run.timeLeft < 4 && Math.floor(game.time.elapsed * 6) % 2 ? STYLE.accent[1] : '#fcfcfc');
    // speed dots
    for (var i = 0; i < 15; i++) game.draw.rect(60 + i * 26, 60, 18, 18, i < run.v ? '#5cfc5c' : '#1c1c5c');
  }

  function initGame() {
    run = newRun(false);
  }

  function settle() {
    state = S.RESULT;
    game.audio.stopBgm();
    var stats = { meters: Math.floor(run.dist), perfect: run.perfect, good: run.good, whiffs: run.whiff, seconds: Math.round(run.elapsed * 10) / 10 };
    if (run.win) {
      run.score = Math.round(run.timeLeft * 150) + run.perfect * 60 + run.good * 30;
      game.audio.play('se_success', 0.5);
      game.end.success(run.score, stats);
    } else {
      game.audio.play('se_failure', 0.5);
      game.end.failure(stats);
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_coin', 0.4);
      state = S.PLAYING; initGame();
      game.audio.melody([['C5', 0.5], ['C5', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 0.5], ['E5', 0.5], ['D5', 1]], { tempo: 150, wave: 'square', volume: 0.04, loop: true, bass: [['C3', 1], ['G2', 1], ['A2', 1], ['G2', 1]] });
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (run.ready > 0 || run.over || run.hitStop > 0) { game.audio.play('se_tap', 0.08); return; }
    pump();
  });

  game.onUpdate(function(dt) {
    var t = game.time.elapsed;
    if (state === S.ATTRACT) {
      if (!run || !run.demo) run = newRun(true);
      demo.t += dt;
      var cyc = demo.t % 6;
      if (cyc < dt || demo.t <= dt) { run = newRun(true); demo.tops = 0; }
      if (demo.pressT > 0) { demo.pressT -= dt; if (demo.pressT <= 0) demo.press = false; }
      step(dt);
      drawWorld();
      drawCar();
      drawPad();
      game.draw.hand(W / 2 + 60, H * 0.86 + (demo.press ? 0 : 30), { press: demo.press, scale: 14 });
      txt(TITLE, W / 2 + Math.sin(t * 1.4) * 6, H * 0.08, 84, STYLE.accent[0]);
      txt('HI-SCORE ' + (game.best || 0), W / 2, H * 0.125, 36, '#fcfcfc');
      if (Math.floor(t * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.96, 42, STYLE.accent[0]);
      else txt('INSERT COIN', W / 2, H * 0.96, 34, '#fcfcfc');
      return;
    }
    if (state === S.RESULT) {
      drawWorld();
      drawCar();
      game.draw.rect(0, 0, W, H, '#000000', 0.5);
      if (run.win) {
        if (Math.floor(t * 5) % 2 === 0) game.fx.burst(game.random(100, W - 100), game.random(H * 0.2, H * 0.5), { color: STYLE.accent[0], count: 5, speed: 280 });
        txt('CLEAR', W / 2, H * 0.28, 120, STYLE.accent[0]);
      } else {
        txt(run.stalled ? 'GAME OVER' : 'TIME UP', W / 2, H * 0.28, 110, STYLE.accent[1]);
        txt('あと' + Math.ceil(GOAL_M - run.dist) + 'm!', W / 2, H * 0.35, 60, '#fcfcfc');
      }
      txt(Math.floor(run.dist) + 'm  ' + (Math.round(run.elapsed * 10) / 10) + '秒', W / 2, H * 0.43, 56, '#fcfcfc');
      txt('PERFECT ' + run.perfect + '  MISS ' + run.whiff, W / 2, H * 0.48, 42, '#a4a4a4');
      txt('SCORE ' + run.score, W / 2, H * 0.53, 48, '#fcfcfc');
      if (run.win && run.score >= (game.best || 0)) txt('NEW RECORD', W / 2, H * 0.58, 52, STYLE.accent[0]);
      else txt('BEST ' + (game.best || 0), W / 2, H * 0.58, 40, '#a4a4a4');
      if (Math.floor(t * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 40, '#fcfcfc');
      return;
    }
    // PLAYING
    if (run.ready > 0) {
      run.ready -= dt;
      if (run.ready <= 0) game.audio.play('se_tap', 0.4);
    } else {
      if (!run.over) {
        run.timeLeft -= dt;
        if (run.timeLeft <= 0) {
          run.timeLeft = 0; run.over = true; run.win = false; run.hitStop = 0.5;
          game.feedback.bad(CAR_X, RAIL_Y - 260, { text: 'TIME UP' });
        }
      }
      step(dt);
      if (run.over && run.endWait > 0) {
        run.endWait -= dt;
        if (run.endWait <= 0) { settle(); return; }
      }
    }
    drawWorld();
    drawCar();
    drawPad();
    drawHud();
    if (run.over && !run.win && run.hitStop > 0) game.draw.circle(CAR_X, RAIL_Y - 100, 220, '#ffffff', 0.35);
    if (run.ready > 0) txt(run.ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.38, 120, STYLE.accent[0]);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.5], ['G4', 0.5], ['A4', 1], ['G4', 0.5], ['E4', 0.5], ['D4', 1]], { tempo: 100, wave: 'square', volume: 0.035, loop: true });
    state = S.ATTRACT;
    run = newRun(true);
    demo.t = 0;
  });
})(game);
