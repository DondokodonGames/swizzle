// D-20222026-0005-signal-grid-clearance.js
// シグナルグリッド・クリアランス — 手持ちのブロック片を6x6の管制盤へ置き、縦横を埋めて消灯させる
// 操作: 下の手持ち3枠からブロック片を指で盤面までドラッグし、離した位置に配置する
// 終わり: 規定ライン数を消せば成功。置ける場所が無くなれば失敗
// @mechanic: gap_fit
// @theme: signal_grid_clearance
// 世界観: 管制室のオペレーターが手持ちのブロック片を6x6の信号盤に配置し、縦横を隙間なく埋めてラインを消灯させ続ける
// 残るもの: 正誤(CLEAR/GAME OVER) + 消したライン数
// スタイル: 80s ISO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 80s ISO: 濃紺+ネオン2色のグリッド、疑似アイソメの陰影帯
  var C = {
    bg: '#120a2a', bg2: '#08051a', grid: '#241a48', gridDark: '#160f30',
    block: '#4dd8ff', blockDark: '#1a8ab0', blockClear: '#ffe14d',
    good: '#4dd8ff', bad: '#ff4d5e', gold: '#ffe14d', ink: '#06040f', white: '#e8f4ff',
  };

  var GAME_TITLE = 'GRID CLEAR';
  var N = 6;
  var CELL = 130;
  var BOARD_X0 = W / 2 - (N * CELL) / 2, BOARD_Y0 = H * 0.24;
  var TARGET_LINES = 3;
  var TIME_LIMIT = 24;

  var SHAPES = [
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]],
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: '#04030a', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var OPERATOR_F = [
    ['.##.', '####', '.##.', '#..#'],
    ['.##.', '####', '.##.', '.##.'],
  ];

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2);
    game.draw.rect(0, 0, W, H, C.good, pulse * 0.06);
  }

  var board, tray, dragIdx, dragX, dragY, linesCleared, roundClock;
  var done, endWait, finished, ready, hitStop, shake, milestoneShown;

  function randShape() { return SHAPES[Math.floor(Math.random() * SHAPES.length)]; }
  function trayPos(i) { return { x: W * (0.22 + i * 0.28), y: H * 0.86 }; }

  function initGame() {
    board = new Array(N * N).fill(false);
    tray = [randShape(), randShape(), randShape()];
    dragIdx = -1; dragX = 0; dragY = 0; linesCleared = 0; roundClock = 0; milestoneShown = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function shapeCells(shape) {
    var xs = shape.map(function(c) { return c[0]; });
    var ys = shape.map(function(c) { return c[1]; });
    return { w: Math.max.apply(null, xs) + 1, h: Math.max.apply(null, ys) + 1 };
  }

  function canPlace(shape, gx, gy) {
    for (var i = 0; i < shape.length; i++) {
      var cx = gx + shape[i][0], cy = gy + shape[i][1];
      if (cx < 0 || cx >= N || cy < 0 || cy >= N) return false;
      if (board[cy * N + cx]) return false;
    }
    return true;
  }
  function anyPlacement(shape) {
    for (var gy = 0; gy < N; gy++) for (var gx = 0; gx < N; gx++) if (canPlace(shape, gx, gy)) return true;
    return false;
  }

  function placeShape(shape, gx, gy) {
    for (var i = 0; i < shape.length; i++) {
      var cx = gx + shape[i][0], cy = gy + shape[i][1];
      board[cy * N + cx] = true;
    }
  }

  function clearLines() {
    var rowsToClear = [], colsToClear = [];
    for (var r = 0; r < N; r++) {
      var full = true;
      for (var c = 0; c < N; c++) if (!board[r * N + c]) { full = false; break; }
      if (full) rowsToClear.push(r);
    }
    for (var c2 = 0; c2 < N; c2++) {
      var full2 = true;
      for (var r2 = 0; r2 < N; r2++) if (!board[r2 * N + c2]) { full2 = false; break; }
      if (full2) colsToClear.push(c2);
    }
    var count = rowsToClear.length + colsToClear.length;
    if (count > 0) {
      for (var i2 = 0; i2 < rowsToClear.length; i2++) for (var cc = 0; cc < N; cc++) board[rowsToClear[i2] * N + cc] = false;
      for (var j2 = 0; j2 < colsToClear.length; j2++) for (var rr = 0; rr < N; rr++) board[rr * N + colsToClear[j2]] = false;
      linesCleared += count;
      var px = BOARD_X0 + N * CELL / 2, py = BOARD_Y0 + N * CELL / 2;
      game.feedback.good(px, py, { text: 'GOOD', color: C.good });
      game.fx.burst(px, py, { color: C.gold, count: 24, speed: 420 });
      game.audio.play('se_break', 0.45);
      if (linesCleared >= Math.ceil(TARGET_LINES / 2) && !milestoneShown) {
        milestoneShown = true;
        game.fx.popup('NICE', W / 2, BOARD_Y0 - 40, { color: C.gold, size: 34 });
        game.audio.play('se_milestone', 0.3);
      }
      if (linesCleared >= TARGET_LINES) succeedNow();
    }
  }

  function refillAndCheck() {
    var allBlocked = true;
    for (var i = 0; i < tray.length; i++) {
      if (tray[i] === null) continue;
      if (anyPlacement(tray[i])) allBlocked = false;
    }
    if (tray.every(function(s) { return s === null; })) {
      tray = [randShape(), randShape(), randShape()];
      allBlocked = false;
    }
    if (allBlocked) failNow();
  }

  function succeedNow() {
    if (finished) return;
    ok = true; finished = true; hitStop = 0.24;
    game.audio.play('se_success', 0.5);
    finish();
  }
  function failNow() {
    if (finished) return;
    ok = false; finished = true; hitStop = 0.3; shake = 0.22;
    game.audio.play('se_failure', 0.4);
    finish();
  }

  function nearestGrid(x, y, shape) {
    var sc = shapeCells(shape);
    var gx = Math.round((x - BOARD_X0 - (sc.w * CELL) / 2) / CELL);
    var gy = Math.round((y - BOARD_Y0 - (sc.h * CELL) / 2) / CELL);
    return { gx: gx, gy: gy };
  }

  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    for (var i = 0; i < tray.length; i++) {
      if (tray[i] === null) continue;
      var tp = trayPos(i);
      if (Math.abs(x - tp.x) < 130 && Math.abs(y - tp.y) < 130) {
        dragIdx = i; dragX = x; dragY = y;
        game.audio.play('se_tap', 0.1);
        return;
      }
    }
  });
  game.onMove(function(x, y) { if (dragIdx >= 0) { dragX = x; dragY = y; } });
  game.onRelease(function(x, y) {
    if (dragIdx < 0) return;
    var shape = tray[dragIdx];
    var g = nearestGrid(x, y, shape);
    if (canPlace(shape, g.gx, g.gy)) {
      placeShape(shape, g.gx, g.gy);
      tray[dragIdx] = null;
      game.audio.play('se_good', 0.3);
      clearLines();
      if (tray.every(function(s) { return s === null; })) tray = [randShape(), randShape(), randShape()];
      if (!finished) refillAndCheck();
    } else {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
    }
    dragIdx = -1;
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  function drawBoard() {
    for (var gy = 0; gy < N; gy++) {
      for (var gx = 0; gx < N; gx++) {
        var filled = board[gy * N + gx];
        game.draw.rect(BOARD_X0 + gx * CELL + 4, BOARD_Y0 + gy * CELL + 4, CELL - 8, CELL - 8, filled ? C.block : C.grid);
        if (filled) game.draw.rect(BOARD_X0 + gx * CELL + 4, BOARD_Y0 + gy * CELL + 4, CELL - 8, 8, C.blockDark, 0.5);
      }
    }
    if (dragIdx >= 0) {
      var shape = tray[dragIdx];
      var g = nearestGrid(dragX, dragY, shape);
      var valid = canPlace(shape, g.gx, g.gy);
      for (var i = 0; i < shape.length; i++) {
        var cx = g.gx + shape[i][0], cy = g.gy + shape[i][1];
        game.draw.rect(BOARD_X0 + cx * CELL + 4, BOARD_Y0 + cy * CELL + 4, CELL - 8, CELL - 8, valid ? C.blockClear : C.bad, 0.6);
      }
    }
    for (var t = 0; t < tray.length; t++) {
      if (tray[t] === null) continue;
      var tp = trayPos(t);
      var sc = shapeCells(tray[t]);
      var ox = tp.x - (sc.w * 44) / 2, oy = tp.y - (sc.h * 44) / 2;
      for (var k = 0; k < tray[t].length; k++) {
        var px = ox + tray[t][k][0] * 44, py = oy + tray[t][k][1] * 44;
        game.draw.rect(px, py, 40, 40, t === dragIdx ? C.blockClear : C.block);
      }
    }
    var of = Math.floor(game.time.elapsed * 4) % 2;
    game.draw.sprite(OPERATOR_F[of], { '#': C.white }, W * 0.86, H * 0.14, 12, { anchor: 'center' });
  }

  var demo = { t: 0, gx: trayPos(0).x, gy: trayPos(0).y, press: false, phase: 0 };
  function resetDemo() { initGame(); }
  function findDemoMove() {
    for (var i = 0; i < tray.length; i++) {
      if (tray[i] === null) continue;
      for (var gy = 0; gy < N; gy++) for (var gx = 0; gx < N; gx++) {
        if (canPlace(tray[i], gx, gy)) return { i: i, gx: gx, gy: gy };
      }
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 11;
    if (cyc < dt || demo.t <= dt) { resetDemo(); demo.phase = 0; }
    if (ready > 0) { ready -= dt; if (ready < 0) ready = 0; return; }
    if (finished) return;
    roundClock += dt;
    if (demo.phase === 0) {
      var mv = findDemoMove();
      if (!mv) { demo.phase = 2; return; }
      demo.mv = mv; demo.phase = 1;
      dragIdx = mv.i;
    }
    if (demo.phase === 1) {
      var sc = shapeCells(tray[demo.mv.i]);
      var tx = BOARD_X0 + demo.mv.gx * CELL + (sc.w * CELL) / 2;
      var ty = BOARD_Y0 + demo.mv.gy * CELL + (sc.h * CELL) / 2;
      demo.gx += (tx - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (ty - demo.gy) * Math.min(1, dt * 6);
      dragX = demo.gx; dragY = demo.gy;
      demo.press = true;
      if (Math.hypot(demo.gx - tx, demo.gy - ty) < 12) {
        placeShape(tray[demo.mv.i], demo.mv.gx, demo.mv.gy);
        tray[demo.mv.i] = null;
        game.audio.play('se_good', 0.3);
        clearLines();
        if (tray.every(function(s) { return s === null; })) tray = [randShape(), randShape(), randShape()];
        dragIdx = -1;
        demo.phase = 0;
      }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (board === undefined) initGame();
      stepDemo(dt);
      bg();
      drawBoard();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 34, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.1, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.97, 34, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.97, 24, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawBoard();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 40, ok ? C.good : C.bad);
      txt(linesCleared + ' / ' + TARGET_LINES, W / 2, H * 0.1, 24, C.gold);
      if (!ok) txt('あと1本!', W / 2, H * 0.14, 22, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.97, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(linesCleared, { lines: linesCleared, target: TARGET_LINES });
        else game.end.failure({ lines: linesCleared, target: TARGET_LINES });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (roundClock >= TIME_LIMIT) failNow();
    }
    if (shake > 0) shake -= dt;

    bg();
    drawBoard();

    txt(linesCleared + ' / ' + TARGET_LINES, W / 2, H * 0.04, 24, C.white);
    var barPct = Math.max(0, 1 - roundClock / TIME_LIMIT);
    game.draw.rect(60, 92, W - 120, 12, '#00000055', 1);
    game.draw.rect(60, 92, (W - 120) * barPct, 12, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.4, 52, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 130, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
