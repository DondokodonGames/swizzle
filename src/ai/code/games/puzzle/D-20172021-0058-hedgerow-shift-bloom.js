// D-20172021-0058-hedgerow-shift-bloom.js
// ヘッジロウ・シフトブルーム — 花壇の列/段をまるごとスワイプでずらし、3つ並びの花を咲かせて庭の資材を集める
// 操作: 花壇の列や段を指でスワイプしてまるごと1マスずらし、同じ花を3つ並べる
// 終わり: 規定回数(6回)そろえられれば成功。時間切れで失敗
// @mechanic: swipe_direction
// @theme: hedgerow_shift_bloom
// 世界観: 郊外の庭を任された見習い庭師が、花壇の列や段をまるごとスワイプでずらして同じ花を3つ並べ、集まった資材で庭を仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + そろえた回数
// スタイル: HYPERCASUAL 3D

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // HYPERCASUAL 3D: 明るく彩度の高いソリッドカラー、太い縁取り、丸みの強いフォルム
  var C = {
    bg: '#bff0d0', bg2: '#8fdcb0', bed: '#7a5a3a', bedEdge: '#5a4028',
    good: '#2fae5a', bad: '#ff5d5d', gold: '#ffcc33', white: '#ffffff', ink: '#1c3a24',
  };
  var FLOWERS = [
    { col: '#ff6a9e', frames: ['.#.', '###', '.#.', '.#.'] },
    { col: '#ffd24a', frames: ['#.#', '###', '.#.', '.#.'] },
    { col: '#7ab8ff', frames: ['###', '###', '.#.', '.#.'] },
    { col: '#b26aff', frames: ['.#.', '#.#', '.#.', '.#.'] },
  ];

  var GAME_TITLE = 'HEDGE BLOOM';
  var COLS = 5, ROWS = 4, CELL = 168;
  var GX = W * 0.5, TOP_Y = H * 0.24;
  var NEEDED = 4;
  var TIME_LIMIT = 10;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function idx(c, r) { return r * COLS + c; }
  function cellPos(i) {
    var c = i % COLS, r = Math.floor(i / COLS);
    return { x: GX + (c - (COLS - 1) / 2) * CELL, y: TOP_Y + r * CELL + CELL / 2 };
  }
  function randomFlower() { return Math.floor(game.random(0, FLOWERS.length)); }

  function findMatches(g) {
    var matched = new Array(g.length).fill(false);
    for (var r = 0; r < ROWS; r++) {
      var run = 1;
      for (var c = 1; c <= COLS; c++) {
        var same = c < COLS && g[idx(c, r)] === g[idx(c - 1, r)];
        if (same) run++; else { if (run >= 3) for (var k = 0; k < run; k++) matched[idx(c - 1 - k, r)] = true; run = 1; }
      }
    }
    for (var c2 = 0; c2 < COLS; c2++) {
      var run2 = 1;
      for (var r2 = 1; r2 <= ROWS; r2++) {
        var same2 = r2 < ROWS && g[idx(c2, r2)] === g[idx(c2, r2 - 1)];
        if (same2) run2++; else { if (run2 >= 3) for (var k2 = 0; k2 < run2; k2++) matched[idx(c2, r2 - 1 - k2)] = true; run2 = 1; }
      }
    }
    return matched;
  }
  function hasAnyMatch(g) { var m = findMatches(g); for (var i = 0; i < m.length; i++) if (m[i]) return true; return false; }
  function newGrid() { var g; do { g = []; for (var i = 0; i < COLS * ROWS; i++) g.push(randomFlower()); } while (hasAnyMatch(g)); return g; }

  var grid, matches, timeLeft, halfCalled, pressX, pressY, pressing;
  var done, endWait, finished, ready, hitStop, shake, flashCells;

  function initGame() {
    grid = newGrid(); matches = 0; timeLeft = TIME_LIMIT; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    pressing = false; flashCells = [];
  }

  function shiftRow(r, dir) {
    var row = [];
    for (var c = 0; c < COLS; c++) row.push(grid[idx(c, r)]);
    var out = dir > 0 ? [row[COLS - 1]].concat(row.slice(0, COLS - 1)) : row.slice(1).concat([row[0]]);
    for (var c2 = 0; c2 < COLS; c2++) grid[idx(c2, r)] = out[c2];
  }
  function shiftCol(c, dir) {
    var col = [];
    for (var r = 0; r < ROWS; r++) col.push(grid[idx(c, r)]);
    var out = dir > 0 ? [col[ROWS - 1]].concat(col.slice(0, ROWS - 1)) : col.slice(1).concat([col[0]]);
    for (var r2 = 0; r2 < ROWS; r2++) grid[idx(c, r2)] = out[r2];
  }

  function attemptShift(horizontal, line, dir) {
    if (finished || done) return;
    if (horizontal) shiftRow(line, dir); else shiftCol(line, dir);
    var matched = findMatches(grid);
    var count = 0; var cx = 0, cy = 0;
    for (var i = 0; i < matched.length; i++) if (matched[i]) { count++; var p = cellPos(i); cx += p.x; cy += p.y; }
    if (count > 0) {
      matches++;
      hitStop = 0.07;
      cx /= count; cy /= count;
      game.feedback.good(cx, cy, { text: '+1', color: C.good });
      game.fx.burst(cx, cy, { color: C.gold, count: 14 + count, speed: 320 });
      game.audio.play('se_good', 0.32);
      for (var j = 0; j < matched.length; j++) if (matched[j]) grid[j] = randomFlower();
      if (matches === Math.ceil(NEEDED / 2)) game.fx.popup(matches + ' / ' + NEEDED, GX, TOP_Y - 110, { color: C.gold, size: 36 });
      if (matches >= NEEDED) { ok = true; finished = true; finish(); }
    } else {
      if (horizontal) shiftRow(line, -dir); else shiftCol(line, -dir);
      var mid = cellPos(idx(horizontal ? Math.floor(COLS / 2) : line, horizontal ? line : Math.floor(ROWS / 2)));
      game.feedback.bad(mid.x, mid.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
    }
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) { pressing = true; pressX = x; pressY = y; game.audio.play('se_tap', 0.1); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    pressing = false;
    var dx = x - pressX, dy = y - pressY;
    if (Math.hypot(dx, dy) < 50) return;
    var c0 = Math.round((pressX - (GX - (COLS - 1) * CELL / 2)) / CELL);
    var r0 = Math.round((pressY - (TOP_Y + CELL / 2)) / CELL);
    c0 = Math.max(0, Math.min(COLS - 1, c0)); r0 = Math.max(0, Math.min(ROWS - 1, r0));
    if (Math.abs(dx) > Math.abs(dy)) attemptShift(true, r0, dx > 0 ? 1 : -1);
    else attemptShift(false, c0, dy > 0 ? 1 : -1);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.04 + 0.04 * Math.sin(game.time.elapsed * 1.2));
    game.draw.rect(GX - COLS * CELL / 2 - 16, TOP_Y - 20, COLS * CELL + 32, ROWS * CELL + 40, C.bed, 0.5);
    game.draw.rect(GX - COLS * CELL / 2 - 16, TOP_Y - 20, COLS * CELL + 32, 8, C.bedEdge);
  }

  function drawGrid() {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      var f = FLOWERS[grid[i]];
      var bob = Math.sin(game.time.elapsed * 2.5 + i) * 4;
      game.draw.circle(p.x, p.y + bob, CELL / 2 - 14, '#ffffff', 0.5);
      game.draw.sprite(f.frames, { '#': f.col }, p.x, p.y + bob, 18, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: GX, gy: TOP_Y, press: false, horizontal: true, line: 0, dir: 1 };
  function findAnyShift() {
    for (var line = 0; line < ROWS; line++) {
      for (var d = -1; d <= 1; d += 2) {
        shiftRow(line, d);
        var m = findMatches(grid);
        shiftRow(line, -d);
        var found = false; for (var k = 0; k < m.length; k++) if (m[k]) { found = true; break; }
        if (found) return { horizontal: true, line: line, dir: d };
      }
    }
    for (var c = 0; c < COLS; c++) {
      for (var d2 = -1; d2 <= 1; d2 += 2) {
        shiftCol(c, d2);
        var m2 = findMatches(grid);
        shiftCol(c, -d2);
        var found2 = false; for (var k2 = 0; k2 < m2.length; k2++) if (m2[k2]) { found2 = true; break; }
        if (found2) return { horizontal: false, line: c, dir: d2 };
      }
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      grid = newGrid(); matches = 0;
      var sw = findAnyShift();
      demo.horizontal = sw ? sw.horizontal : true; demo.line = sw ? sw.line : 0; demo.dir = sw ? sw.dir : 1;
      demo.resolved = false;
      var start = demo.horizontal ? cellPos(idx(demo.dir > 0 ? 0 : COLS - 1, demo.line)) : cellPos(idx(demo.line, demo.dir > 0 ? 0 : ROWS - 1));
      demo.startX = start.x; demo.startY = start.y;
      demo.endX = demo.horizontal ? start.x + demo.dir * CELL * 1.4 : start.x;
      demo.endY = demo.horizontal ? start.y : start.y + demo.dir * CELL * 1.4;
    }
    if (cyc < 1.2) {
      var t2 = cyc / 1.2;
      demo.gx = demo.startX + (demo.endX - demo.startX) * t2;
      demo.gy = demo.startY + (demo.endY - demo.startY) * t2;
      demo.press = t2 > 0.08;
      pressing = true; pressX = demo.startX; pressY = demo.startY;
    } else if (!demo.resolved) {
      demo.resolved = true; pressing = false;
      attemptShift(demo.horizontal, demo.line, demo.dir);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGrid();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.ink);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(matches + ' / ' + NEEDED, W / 2, H * 0.12, 26, C.ink);
      if (!ok && matches >= NEEDED - 1) txt('あと1回!', W / 2, H * 0.16, 22, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(matches * 100, { matches: matches }); else game.end.failure({ matches: matches });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!halfCalled && timeLeft <= TIME_LIMIT * 0.5) { halfCalled = true; game.fx.popup('あと' + (NEEDED - matches) + '回!', GX, TOP_Y - 110, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.3); }
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(GX, TOP_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid();

    txt(matches + ' / ' + NEEDED, W / 2, 100, 30, C.ink);
    if (!finished) {
      var frac = Math.max(0, timeLeft / TIME_LIMIT);
      game.draw.rect(60, 150, W - 120, 14, '#5a4028', 0.6);
      game.draw.rect(60, 150, (W - 120) * frac, 14, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['G4', 0.2], ['B4', 0.2], ['D5', 0.2], ['G5', 0.3]], { tempo: 128, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
