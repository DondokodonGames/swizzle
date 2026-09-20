// GH-PS-0105-line-clear.js
// ラインクリア — 同じ色を、曲がり角2回以内の線で繋いで消す
// 操作: 1枚目をタップ、繋がる2枚目をタップ。有効なら消える
// 終わり: 25秒。消した枚数が残る。手詰まりで動かせる組が無くなったら終わり
// @mechanic: connect
// @theme: cold_storage_grid
// 世界観: 倉庫の棚。同じ荷札の箱を、通路を2回までしか曲がれない配送ルートで繋いで運び出す
// 残るもの: 消した枚数(SCORE)。残り枚数・繋いだ経路の数。手詰まりで終わると理由が分かる
// スタイル: 8bit PC MONITOR

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // 8bit PC MONITOR: 低解像度感。粗いドット、単色系統ごとに彩度を落とす
  var C = {
    bg: '#101418', grid: '#1c232a', frame: '#2a333c',
    c0: '#e85d5d', c1: '#5db8e8', c2: '#e8c85d', c3: '#7de85d', c4: '#c85de8',
    path: '#ffffff', gold: '#ffd400', good: '#4dff7a', bad: '#ff3d5e', white: '#ffffff', ink: '#0a0a0a',
  };
  var COLORS = [C.c0, C.c1, C.c2, C.c3, C.c4];

  var GAME_TITLE = 'LINE CLEAR';
  var MAX_TIME = 25;
  var COLS = 7, ROWS = 8;
  var CELL = 132;
  var GX = (W - COLS * CELL) / 2;
  var GY = H * 0.17;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var finalScore = 0;

  var grid, sel, cleared, totalTime, done, pathShow, pathTimer, endWait, deadlockMsg;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 4, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 4) game.draw.rect(0, sy, W, 1, '#000000', 0.18); }

  function gridBg() {
    game.draw.gradient(0, H, [[0, '#181d22'], [1, '#0b0e11']]);
    for (var r = 0; r <= ROWS; r++) game.draw.rect(GX, GY + r * CELL, COLS * CELL, 2, C.grid);
    for (var c = 0; c <= COLS; c++) game.draw.rect(GX + c * CELL, GY, 2, ROWS * CELL, C.grid);
  }

  function cellX(c) { return GX + c * CELL + CELL / 2; }
  function cellY(r) { return GY + r * CELL + CELL / 2; }

  function fillGrid() {
    grid = [];
    var cells = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) cells.push({ r: r, c: c });
    // ペアで埋める(必ず偶数個ずつ)
    var colorCount = COLS * ROWS / COLORS.length;
    var pool = [];
    for (var k = 0; k < COLORS.length; k++) for (var n = 0; n < colorCount; n++) pool.push(k);
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    for (var g = 0; g < ROWS; g++) {
      grid.push([]);
      for (var cc = 0; cc < COLS; cc++) grid[g].push(pool[g * COLS + cc]);
    }
  }

  function initGame() {
    fillGrid(); sel = null; cleared = 0; totalTime = 0; done = false; endWait = 0;
    pathShow = null; pathTimer = 0; deadlockMsg = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
  function get(r, c) { return inBounds(r, c) ? grid[r][c] : null; }

  // 0〜2回の曲がりで a→b を繋げるか。盤外を1マス分の余白として許可(倉庫の外周通路)
  function findPath(a, b) {
    if (grid[a.r][a.c] !== grid[b.r][b.c] || grid[a.r][a.c] === null) return null;
    var col = grid[a.r][a.c];
    function clear(r, c) { return get(r, c) === null || (r === b.r && c === b.c); }
    // 0曲がり: 同じ行 or 同じ列で間が全部空き
    if (a.r === b.r) {
      var lo = Math.min(a.c, b.c), hi = Math.max(a.c, b.c), ok = true;
      for (var c = lo + 1; c < hi; c++) if (!clear(a.r, c)) ok = false;
      if (ok) return [a, b];
    }
    if (a.c === b.c) {
      var lo2 = Math.min(a.r, b.r), hi2 = Math.max(a.r, b.r), ok2 = true;
      for (var r = lo2 + 1; r < hi2; r++) if (!clear(r, a.c)) ok2 = false;
      if (ok2) return [a, b];
    }
    // 1曲がり: 角(a.r,b.c) か (b.r,a.c) が空いていて、両辺が通る
    var corners = [{ r: a.r, c: b.c }, { r: b.r, c: a.c }];
    for (var k = 0; k < corners.length; k++) {
      var m = corners[k];
      if (!clear(m.r, m.c)) continue;
      var p1 = findStraight(a, m), p2 = findStraight(m, b);
      if (p1 && p2) return [a, m, b];
    }
    // 2曲がり: 外周1マス分を通す(簡易: 上下左右の外側ラインを経由)
    var margins = [-1, ROWS, -1, COLS];
    for (var side = 0; side < 4; side++) {
      var m2;
      if (side === 0) m2 = { r: -1, c: a.c };
      else if (side === 1) m2 = { r: ROWS, c: a.c };
      else if (side === 2) m2 = { r: a.r, c: -1 };
      else m2 = { r: a.r, c: COLS };
      var m3 = side < 2 ? { r: m2.r, c: b.c } : { r: b.r, c: m2.c };
      if (straightClearOutside(a, m2) && straightClearOutside(m2, m3) && straightClearOutside(m3, b)) return [a, m2, m3, b];
    }
    return null;
    function findStraight(p, q) {
      if (p.r === q.r) { var lo3 = Math.min(p.c, q.c), hi3 = Math.max(p.c, q.c); for (var cc = lo3 + 1; cc < hi3; cc++) if (!clear(p.r, cc)) return null; return true; }
      if (p.c === q.c) { var lo4 = Math.min(p.r, q.r), hi4 = Math.max(p.r, q.r); for (var rr = lo4 + 1; rr < hi4; rr++) if (!clear(rr, p.c)) return null; return true; }
      return null;
    }
    function straightClearOutside(p, q) {
      if (p.r === q.r) { var lo5 = Math.min(p.c, q.c), hi5 = Math.max(p.c, q.c); for (var cc2 = lo5; cc2 <= hi5; cc2++) { if (inBounds(p.r, cc2) && !clear(p.r, cc2)) return false; } return true; }
      if (p.c === q.c) { var lo6 = Math.min(p.r, q.r), hi6 = Math.max(p.r, q.r); for (var rr2 = lo6; rr2 <= hi6; rr2++) { if (inBounds(rr2, p.c) && !clear(rr2, p.c)) return false; } return true; }
      return false;
    }
  }

  function hasAnyMove() {
    var cells = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] !== null) cells.push({ r: r, c: c });
    for (var i = 0; i < cells.length; i++) for (var j = i + 1; j < cells.length; j++) {
      if (grid[cells[i].r][cells[i].c] === grid[cells[j].r][cells[j].c] && findPath(cells[i], cells[j])) return true;
    }
    return false;
  }

  function finish() {
    if (done) return;
    done = true; finalScore = cleared * 10;
    game.audio.stopBgm();
    game.audio.play(cleared > 0 ? 'se_success' : 'se_failure');
    endWait = 1.4;
  }

  function tryConnect(cell) {
    if (grid[cell.r][cell.c] === null) return;
    if (!sel) { sel = cell; game.audio.play('se_tap', 0.4); return; }
    if (sel.r === cell.r && sel.c === cell.c) { sel = null; return; }
    var path = findPath(sel, cell);
    if (path) {
      grid[sel.r][sel.c] = null; grid[cell.r][cell.c] = null;
      cleared += 2;
      pathShow = path; pathTimer = 0.3;
      game.feedback.good(cellX(cell.c), cellY(cell.r), { text: '+20', color: C.gold });
      game.fx.burst(cellX(cell.c), cellY(cell.r), { color: C.gold, count: 10, speed: 320 });
      if (cleared === 20) { game.fx.popup(cleared + ' 枚', W / 2, H * 0.14, { color: C.gold, size: 56 }); game.audio.play('se_milestone', 0.5); }
      sel = null;
      if (!hasAnyMove()) { deadlockMsg = true; finish(); }
    } else {
      game.feedback.bad(cellX(cell.c), cellY(cell.r), { text: 'MISS' });
      shake = 0.15;
      sel = cell;
    }
  }

  function drawBox(r, c) {
    if (grid[r][c] === null) return;
    var x = cellX(c), y = cellY(r);
    var col = COLORS[grid[r][c]];
    var isSel = sel && sel.r === r && sel.c === c;
    var half = 54;
    game.draw.rect(x - half, y - half, half * 2, half * 2, col);
    game.draw.rect(x - half, y - half, half * 2, 16, '#ffffff', 0.25);
    game.draw.rect(x - half, y + half - 16, half * 2, 16, '#000000', 0.25);
    if (isSel) { game.draw.rect(x - half - 6, y - half - 6, half * 2 + 12, 6, C.white); game.draw.rect(x - half - 6, y + half, half * 2 + 12, 6, C.white); game.draw.rect(x - half - 6, y - half - 6, 6, half * 2 + 12, C.white); game.draw.rect(x + half, y - half - 6, 6, half * 2 + 12, C.white); }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
    if (done || ready > 0) return;
    var c = Math.floor((x - GX) / CELL), r = Math.floor((y - GY) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    tryConnect({ r: r, c: c });
  });

  // ── ATTRACT ゴースト実演: 1枚目→曲がって2枚目、消える ──
  var demoA = { r: 2, c: 1 }, demoB = { r: 2, c: 5 };
  var demo = { t: 0, gx: cellX(1), gy: cellY(2), press: false, phase: 0 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    var target = cyc < 1.5 ? { x: cellX(demoA.c), y: cellY(demoA.r) } : { x: cellX(demoB.c), y: cellY(demoB.r) };
    demo.gx += (target.x - demo.gx) * Math.min(1, dt * 6);
    demo.gy += (target.y - demo.gy) * Math.min(1, dt * 6);
    demo.press = (cyc > 0.3 && cyc < 0.5) || (cyc > 1.8 && cyc < 2.0);
    if (cyc > 1.8 && cyc < 1.83) { game.feedback.good(cellX(demoB.c), cellY(demoB.r), { text: '+20', color: C.gold }); game.fx.burst(cellX(demoB.c), cellY(demoB.r), { color: C.gold, count: 10, speed: 300 }); pathShow = [demoA, demoB]; pathTimer = 0.3; }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      gridBg();
      for (var r0 = 0; r0 < ROWS; r0++) for (var c0 = 0; c0 < COLS; c0++) if (!(r0 === demoA.r && c0 === demoA.c) && !(r0 === demoB.r && c0 === demoB.c)) game.draw.rect(cellX(c0) - 40, cellY(r0) - 40, 80, 80, C.grid);
      drawBox(demoA.r, demoA.c); drawBox(demoB.r, demoB.c);
      stepDemo(dt);
      if (pathTimer > 0) { pathTimer -= dt; drawPathLine(pathShow); }
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 66, C.white);
      txt('BEST ' + String(game.best).padStart(6, '0'), W / 2, H * 0.115, 32, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 52, C.gold);
        txt('TAP TO START', W / 2, H * 0.95, 40, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.95, 36, C.white);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      gridBg();
      for (var rr = 0; rr < ROWS; rr++) for (var cc = 0; cc < COLS; cc++) drawBox(rr, cc);
      txt(deadlockMsg ? 'NO MORE MOVES' : 'FINISH', W / 2, H * 0.10, 52, C.white);
      txt(String(cleared), W / 2, H * 0.30, 110, C.gold);
      txt('枚 消した', W / 2, H * 0.35, 34, C.white);
      txt('SCORE ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.42, 48, C.white);
      var best = Math.max(game.best, finalScore);
      txt('BEST ' + String(best).padStart(6, '0'), W / 2, H * 0.47, 36, C.gold);
      if (finalScore > game.best && game.best > 0 && Math.floor(game.time.elapsed * 3) % 2 === 0) txt('NEW RECORD', W / 2, H * 0.52, 42, C.gold);
      else if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.94, 38, C.white);
      scanlines();
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) { state = S.RESULT; game.end.record(finalScore, { cleared: cleared, deadlock: deadlockMsg }); }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else {
      totalTime += dt;
      if (totalTime >= MAX_TIME) { finish(); return; }
    }
    if (pathTimer > 0) pathTimer -= dt;
    if (shake > 0) shake -= dt;

    gridBg();
    for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < COLS; c2++) drawBox(r2, c2);
    if (pathTimer > 0) drawPathLine(pathShow);

    var frac = Math.max(0, 1 - totalTime / MAX_TIME);
    game.draw.rect(60, 40, W - 120, 24, C.frame);
    game.draw.rect(60, 40, (W - 120) * frac, 24, frac < 0.25 ? C.bad : C.good);
    txt('SCORE ' + String(cleared * 10).padStart(6, '0'), W / 2, 102, 40, C.white);

    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.90, 80, C.gold);
    scanlines();
  });

  function drawPathLine(path) {
    if (!path) return;
    for (var i = 0; i < path.length - 1; i++) {
      var x1 = clampX(path[i]), y1 = clampY(path[i]), x2 = clampX(path[i + 1]), y2 = clampY(path[i + 1]);
      game.draw.line(x1, y1, x2, y2, C.path, 6);
    }
  }
  function clampX(p) { return GX + Math.max(-0.5, Math.min(COLS - 0.5, p.c)) * CELL + CELL / 2; }
  function clampY(p) { return GY + Math.max(-0.5, Math.min(ROWS - 0.5, p.r)) * CELL + CELL / 2; }

  game.onStart(function() {
    game.audio.melody(
      [['C5', 0.2], ['D5', 0.2], ['E5', 0.2], ['G5', 0.2], ['E5', 0.2], ['D5', 0.2]],
      { tempo: 128, wave: 'square', volume: 0.06, loop: true }
    );
    state = S.ATTRACT;
    initGame();
  });
})(game);
