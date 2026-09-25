// D-20222026-0036-familiar-fusion-grid.js
// ファミリアフュージョングリッド — 盤に並んだ同じ使い魔同士を線でつなぎ、上位の姿へと練り上げる
// 操作: 盤上の使い魔を指で押さえ、隣接する同じ姿の使い魔までドラッグしてつなぐと融合する
// 終わり: 規定回数、融合させられれば成功。時間切れは失敗
// @mechanic: connect
// @theme: familiar_fusion_grid
// 世界観: 錬成士見習いが盤に並べた使い魔たちを見渡し、同じ姿同士を線でつないで上位の姿へと練り上げていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 融合させた数
// スタイル: NEO-RETRO

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg: '#241a3a', bg2: '#140c24', cell: '#3a2a5a', cellLine: '#5a3e8a',
    kindA: '#ff5ac0', kindB: '#5ac0ff', good: '#7ef0a0', bad: '#ff4d5e', gold: '#ffd24d', ink: '#f0e8ff',
  };

  var GAME_TITLE = 'FUSION GRID';
  var MAX_TIME = 20;
  var NEEDED = 6;
  var GRID = 3;
  var BOARD_X = W * 0.5, BOARD_Y = H * 0.46, CELL = 250;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 1, y + 2, { size: sz, color: '#0a0614', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var FAM_S = ['.##.', '####', '.#.#'];

  function bg() {
    var pulse = 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3);
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', pulse * 0.15);
  }

  function cellPos(i) { var c = i % GRID, r = Math.floor(i / GRID); return { x: BOARD_X + (c - 1) * CELL, y: BOARD_Y + (r - 1) * CELL }; }
  function adjacent(a, b) {
    var ca = a % GRID, ra = Math.floor(a / GRID), cb = b % GRID, rb = Math.floor(b / GRID);
    return Math.abs(ca - cb) + Math.abs(ra - rb) === 1;
  }

  var cells, fused, roundClock, halfCalled, dragFrom, trail, flashIdx, flashT;
  var done, endWait, finished, ready, hitStop, shake;

  function randKind() { return Math.random() < 0.5 ? 0 : 1; }

  function initGame() {
    cells = [];
    for (var i = 0; i < GRID * GRID; i++) cells.push(randKind());
    fused = 0; roundClock = 0; halfCalled = false; dragFrom = -1; trail = null; flashIdx = -1; flashT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function drawScene() {
    bg();
    for (var i = 0; i < cells.length; i++) {
      var p = cellPos(i);
      var col = cells[i] === 0 ? C.kindA : C.kindB;
      game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, C.cell);
      var flash = flashIdx === i ? Math.max(0, flashT / 0.3) : 0;
      if (flash > 0) game.draw.rect(p.x - CELL / 2 + 8, p.y - CELL / 2 + 8, CELL - 16, CELL - 16, '#ffffff', flash * 0.6);
      game.draw.sprite(FAM_S, { '#': col }, p.x, p.y, 22, { anchor: 'center' });
    }
    if (dragFrom >= 0 && trail) {
      var fp = cellPos(dragFrom);
      game.draw.line(fp.x, fp.y, trail.x, trail.y, C.gold, 8);
    }
  }

  function findCell(x, y) {
    for (var i = 0; i < cells.length; i++) {
      var p = cellPos(i);
      if (Math.abs(x - p.x) < CELL / 2 && Math.abs(y - p.y) < CELL / 2) return i;
    }
    return -1;
  }

  function tryMerge(target, x, y) {
    if (dragFrom < 0 || target < 0 || target === dragFrom) { dragFrom = -1; return; }
    if (!adjacent(dragFrom, target) || cells[dragFrom] !== cells[target]) {
      game.feedback.bad(x, y, { text: 'MISS' });
      game.audio.play('se_bad', 0.3);
      dragFrom = -1;
      return;
    }
    cells[dragFrom] = randKind();
    flashIdx = target; flashT = 0.3;
    fused += 1;
    var p = cellPos(target);
    game.feedback.good(p.x, p.y, { text: 'GOOD', color: C.good });
    game.fx.burst(p.x, p.y, { color: C.gold, count: 20, speed: 360 });
    game.audio.play('se_success', 0.35);
    if (fused === Math.ceil(NEEDED * 0.5)) {
      game.fx.popup('NICE', BOARD_X, BOARD_Y - 300, { color: C.gold, size: 30 });
      game.audio.play('se_milestone', 0.3);
    }
    dragFrom = -1;
    if (fused >= NEEDED) {
      finished = true; ok = true; hitStop = 0.3;
      game.audio.play('se_success', 0.5);
      finish();
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
  });
  game.onPress(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) return;
    var i = findCell(x, y);
    dragFrom = i;
    trail = { x: x, y: y };
    game.audio.play('se_tap', 0.15);
  });
  game.onMove(function(x, y) {
    trail = { x: x, y: y };
    if (state === S.PLAYING && Math.random() < 0.04) game.audio.play('se_tap', 0.02);
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || ready > 0 || finished) { dragFrom = -1; return; }
    var target = findCell(x, y);
    tryMerge(target, x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    endWait = 1.3;
  }

  var demo = { t: 0, gx: BOARD_X, gy: BOARD_Y, press: false, phase: 0, srcIdx: -1, dstIdx: -1 };
  function resetDemo() { initGame(); demo.phase = 0; }
  function findMatchPair() {
    for (var i = 0; i < cells.length; i++) {
      for (var j = 0; j < cells.length; j++) {
        if (i !== j && adjacent(i, j) && cells[i] === cells[j]) return { a: i, b: j };
      }
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.4;
    if (cyc < dt || demo.t <= dt) { resetDemo(); var pr = findMatchPair(); demo.srcIdx = pr ? pr.a : 0; demo.dstIdx = pr ? pr.b : 1; }
    var sp = cellPos(demo.srcIdx), dp = cellPos(demo.dstIdx);
    if (cyc < 0.5) { demo.gx = sp.x; demo.gy = sp.y; demo.press = false; }
    else if (cyc < 1.6) {
      var t2 = (cyc - 0.5) / 1.1;
      demo.gx = sp.x + (dp.x - sp.x) * t2; demo.gy = sp.y + (dp.y - sp.y) * t2;
      demo.press = true;
      if (dragFrom < 0) { dragFrom = demo.srcIdx; trail = { x: sp.x, y: sp.y }; }
      trail = { x: demo.gx, y: demo.gy };
    } else if (cyc < 1.75) {
      if (dragFrom >= 0) { tryMerge(demo.dstIdx, dp.x, dp.y); var pr2 = findMatchPair(); demo.srcIdx = pr2 ? pr2.a : 0; demo.dstIdx = pr2 ? pr2.b : 1; }
      demo.press = false;
    } else {
      demo.gx = dp.x; demo.gy = dp.y; demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (flashT > 0) flashT -= dt;
    if (state === S.ATTRACT) {
      if (cells === undefined) initGame();
      bg();
      stepDemo(dt);
      drawScene();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.09, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.135, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 40, C.gold);
      } else {
        txt('INSERT COIN', W / 2, H * 0.94, 28, C.ink);
      }
      return;
    }

    if (state === S.RESULT) {
      drawScene();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.09, 44, ok ? C.good : C.bad);
      txt(fused + ' / ' + NEEDED, W / 2, H * 0.14, 26, C.gold);
      if (!ok) txt('あと' + Math.max(1, NEEDED - fused) + '回!', W / 2, H * 0.18, 22, C.ink);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 26, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(fused, { fused: fused, needed: NEEDED });
        else game.end.failure({ fused: fused, needed: NEEDED });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      roundClock += dt;
      if (!halfCalled && roundClock >= MAX_TIME * 0.5) {
        halfCalled = true;
        game.fx.popup('NICE', BOARD_X, BOARD_Y - 300, { color: C.gold, size: 28 });
        game.audio.play('se_milestone', 0.25);
      }
      if (roundClock >= MAX_TIME) {
        finished = true; ok = false; hitStop = 0.3; shake = 0.2;
        game.feedback.bad(BOARD_X, BOARD_Y, { text: 'MISS' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    drawScene();
    txt(fused + ' / ' + NEEDED, W / 2, H * 0.06, 28, C.ink);
    var barPct = Math.max(0, 1 - roundClock / MAX_TIME);
    game.draw.rect(60, 150, W - 120, 16, C.cellLine, 0.4);
    game.draw.rect(60, 150, (W - 120) * barPct, 16, barPct < 0.25 ? C.bad : C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 54, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.4]], { tempo: 135, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
