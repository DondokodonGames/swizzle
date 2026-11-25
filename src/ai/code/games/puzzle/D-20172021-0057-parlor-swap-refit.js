// D-20172021-0057-parlor-swap-refit.js
// パーラー・スワップリフィット — 隣り合う調度品タイルを入れ替えて3つ並べ、一部屋分の改装資材を集める
// 操作: 調度品タイルを指で押さえ、隣のマスへドラッグして入れ替える。同じ種類が3つ並べば消える
// 終わり: 規定回数(6回)そろえられれば成功。時間切れで失敗
// @mechanic: drag_sort
// @theme: parlor_swap_refit
// 世界観: 古びた洋間を担当する内装職人が、山積みの調度品タイルを入れ替えては3つ並びを作り、集まった資材で一部屋分の改装を仕上げる
// 残るもの: 正誤(CLEAR/GAME OVER) + そろえた回数
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 落ち着いた木目調、荒いドット感、暖色の家庭的な配色
  var C = {
    bg: '#3a2c1e', bg2: '#241a10', wall: '#4a3a26', wallEdge: '#6a5236',
    good: '#6ad46a', bad: '#ff5d5d', gold: '#ffcc55', white: '#f6ecd8', ink: '#1c130a',
  };
  var TILES = [
    { col: '#ff9b6a', frames: ['.#.', '###', '.#.', '###'] },
    { col: '#7dc9ff', frames: ['#####', '#...#', '#...#', '#####'] },
    { col: '#ffd24a', frames: ['#####', '#...#', '#####'] },
    { col: '#8bd97a', frames: ['.#.', '###', '.#.'] },
  ];

  var GAME_TITLE = 'PARLOR REFIT';
  var COLS = 5, ROWS = 5, CELL = 156;
  var GX = W * 0.5, TOP_Y = H * 0.22;
  var NEEDED = 5;
  var TIME_LIMIT = 15;
  var DROP_DUR = 0.28;

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
  function randomTile() { return Math.floor(game.random(0, TILES.length)); }

  var grid, dropOffset, matches, timeLeft, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;
  var pressIdx, pressX, pressY, swapAnim;

  function findMatches(g) {
    var matched = new Array(g.length).fill(false);
    for (var r = 0; r < ROWS; r++) {
      var run = 1;
      for (var c = 1; c <= COLS; c++) {
        var same = c < COLS && g[idx(c, r)] === g[idx(c - 1, r)];
        if (same) run++;
        else { if (run >= 3) for (var k = 0; k < run; k++) matched[idx(c - 1 - k, r)] = true; run = 1; }
      }
    }
    for (var c2 = 0; c2 < COLS; c2++) {
      var run2 = 1;
      for (var r2 = 1; r2 <= ROWS; r2++) {
        var same2 = r2 < ROWS && g[idx(c2, r2)] === g[idx(c2, r2 - 1)];
        if (same2) run2++;
        else { if (run2 >= 3) for (var k2 = 0; k2 < run2; k2++) matched[idx(c2, r2 - 1 - k2)] = true; run2 = 1; }
      }
    }
    return matched;
  }

  function hasAnyMatch(g) {
    var m = findMatches(g);
    for (var i = 0; i < m.length; i++) if (m[i]) return true;
    return false;
  }

  function newGrid() {
    var g;
    do { g = []; for (var i = 0; i < COLS * ROWS; i++) g.push(randomTile()); } while (hasAnyMatch(g));
    return g;
  }

  function applyGravity(matched) {
    for (var c = 0; c < COLS; c++) {
      var survivors = [];
      for (var r = 0; r < ROWS; r++) { var i = idx(c, r); if (!matched[i]) survivors.push(grid[i]); }
      var missing = ROWS - survivors.length;
      var fresh = [];
      for (var k = 0; k < missing; k++) fresh.push(randomTile());
      var combined = fresh.concat(survivors);
      for (var r2 = 0; r2 < ROWS; r2++) grid[idx(c, r2)] = combined[r2];
      if (missing > 0) dropOffset[c] = missing * CELL;
    }
  }

  function initGame() {
    grid = newGrid();
    dropOffset = []; for (var c = 0; c < COLS; c++) dropOffset.push(0);
    matches = 0; timeLeft = TIME_LIMIT; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    pressIdx = -1; swapAnim = null;
  }

  function panelAt(x, y) {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      if (Math.abs(x - p.x) < CELL / 2 - 4 && Math.abs(y - p.y) < CELL / 2 - 4) return i;
    }
    return -1;
  }

  function neighborInDir(i, dx, dy) {
    var c = i % COLS, r = Math.floor(i / COLS);
    var nc = c + dx, nr = r + dy;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return -1;
    return idx(nc, nr);
  }

  function trySwap(a, b) {
    if (a < 0 || b < 0 || finished || done) return;
    var tmp = grid[a]; grid[a] = grid[b]; grid[b] = tmp;
    var matched = findMatches(grid);
    var count = 0; for (var i = 0; i < matched.length; i++) if (matched[i]) count++;
    var pa = cellPos(a), pb = cellPos(b);
    if (count > 0) {
      matches++;
      hitStop = 0.06;
      game.feedback.good((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, { text: '+1', color: C.good });
      game.fx.burst(pb.x, pb.y, { color: C.gold, count: 14 + count, speed: 320 });
      game.audio.play('se_good', 0.32);
      applyGravity(matched);
      if (matches === Math.ceil(NEEDED / 2)) game.fx.popup(matches + ' / ' + NEEDED, GX, TOP_Y - 100, { color: C.gold, size: 36 });
      if (matches >= NEEDED) { ok = true; finished = true; finish(); }
    } else {
      var t2 = grid[a]; grid[a] = grid[b]; grid[b] = t2;
      game.feedback.bad((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
    }
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) {
      pressIdx = panelAt(x, y); pressX = x; pressY = y;
      if (pressIdx >= 0) game.audio.play('se_tap', 0.12);
    }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || pressIdx < 0) return;
    var dx = x - pressX, dy = y - pressY;
    if (Math.hypot(dx, dy) < 40) { pressIdx = -1; return; }
    var dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? [1, 0] : [-1, 0]) : (dy > 0 ? [0, 1] : [0, -1]);
    var b = neighborInDir(pressIdx, dir[0], dir[1]);
    trySwap(pressIdx, b);
    pressIdx = -1;
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
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3));
    game.draw.rect(GX - COLS * CELL / 2 - 16, TOP_Y - 20, COLS * CELL + 32, ROWS * CELL + 40, C.wall, 0.6);
    game.draw.rect(GX - COLS * CELL / 2 - 16, TOP_Y - 20, COLS * CELL + 32, 8, C.wallEdge);
  }

  function drawGrid() {
    for (var c = 0; c < COLS; c++) {
      var off = dropOffset[c] || 0;
      for (var r = 0; r < ROWS; r++) {
        var i = idx(c, r);
        var p = cellPos(i);
        var y = p.y - off;
        var t = TILES[grid[i]];
        game.draw.rect(p.x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, CELL - 12, C.ink, 0.8);
        game.draw.rect(p.x - CELL / 2 + 10, y - CELL / 2 + 10, CELL - 20, CELL - 20, t.col, 0.28);
        game.draw.sprite(t.frames, { '#': t.col }, p.x, y, 16, { anchor: 'center' });
        if (pressIdx === i) game.draw.rect(p.x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, CELL - 12, C.gold, 0.18);
      }
    }
  }

  var demo = { t: 0, gx: GX, gy: TOP_Y, press: false, a: -1, b: -1 };
  function findAnySwapMatch() {
    for (var i = 0; i < grid.length; i++) {
      var dirs = [[1, 0], [0, 1]];
      for (var d = 0; d < dirs.length; d++) {
        var j = neighborInDir(i, dirs[d][0], dirs[d][1]);
        if (j < 0) continue;
        var t = grid[i]; grid[i] = grid[j]; grid[j] = t;
        var m = findMatches(grid);
        var found = false; for (var k = 0; k < m.length; k++) if (m[k]) { found = true; break; }
        var t2 = grid[i]; grid[i] = grid[j]; grid[j] = t2;
        if (found) return { a: i, b: j };
      }
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.0;
    if (cyc < dt || demo.t <= dt) {
      grid = newGrid(); dropOffset = []; for (var c = 0; c < COLS; c++) dropOffset.push(0); matches = 0;
      var sw = findAnySwapMatch();
      demo.a = sw ? sw.a : -1; demo.b = sw ? sw.b : -1; demo.resolved = false; pressIdx = -1;
    }
    if (demo.a < 0) return;
    var pa = cellPos(demo.a), pb = cellPos(demo.b);
    if (cyc < 1.2) {
      var t2 = cyc / 1.2;
      demo.gx = pa.x + (pb.x - pa.x) * t2; demo.gy = pa.y + (pb.y - pa.y) * t2;
      demo.press = t2 > 0.1;
      pressIdx = demo.a;
    } else if (!demo.resolved) {
      demo.resolved = true;
      pressIdx = -1;
      pressX = pa.x; pressY = pa.y;
      trySwap(demo.a, demo.b);
    } else {
      demo.press = false;
    }
  }

  game.onUpdate(function(dt) {
    for (var c = 0; c < COLS; c++) if (dropOffset[c] > 0) { dropOffset[c] -= (dropOffset[c] / DROP_DUR) * dt; if (dropOffset[c] < 2) dropOffset[c] = 0; }

    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGrid();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.06, 38, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.10, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(matches + ' / ' + NEEDED, W / 2, H * 0.10, 26, C.white);
      if (!ok && matches >= NEEDED - 1) txt('あと1回!', W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
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
      if (!halfCalled && timeLeft <= TIME_LIMIT * 0.5) { halfCalled = true; game.fx.popup('あと' + (NEEDED - matches) + '回!', GX, TOP_Y - 100, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.3); }
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

    txt(matches + ' / ' + NEEDED, W / 2, 100, 30, C.white);
    if (!finished) {
      var frac = Math.max(0, timeLeft / TIME_LIMIT);
      game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
      game.draw.rect(60, 150, (W - 120) * frac, 14, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['C4', 0.2], ['E4', 0.2], ['G4', 0.2], ['C5', 0.3]], { tempo: 122, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
