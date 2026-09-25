// D-20172021-0059-tank-shoal-slice.js
// タンク・ショールスライス — 水槽内で同じ魚が3匹並んだ群れを見つけ、一息にスワイプで掬い取る
// 操作: 水槽の中で同じ種類の魚が3匹並んだ列/段を見つけ、その上を一息にスワイプして掬い取る
// 終わり: 規定回数(4回)掬えれば成功。時間切れで失敗
// @mechanic: slice
// @theme: tank_shoal_slice
// 世界観: 個人経営の水族館バックヤードを任された見習い飼育員が、水槽内を泳ぐ魚の群れを見渡し、同じ種類が3匹並んだ瞬間を見極めて一息にスワイプで掬い取り、集めた資材で新しい水槽を飾る
// 残るもの: 正誤(CLEAR/GAME OVER) + 掬えた回数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // PIXEL HD: 高解像度ドット、深い青緑のグラデーション、明るいハイライト
  var C = {
    bg: '#082838', bg2: '#0c4058', glass: '#0a3448', glassEdge: '#2a6a88',
    good: '#5aff9a', bad: '#ff5d6c', gold: '#ffd24a', white: '#eaf8ff', ink: '#031420',
  };
  var FISH = [
    { col: '#ff8a5a', frames: ['..#', '###', '..#'] },
    { col: '#5ad4ff', frames: ['#..', '###', '#..'] },
    { col: '#ffe14d', frames: ['.#.', '###', '.#.'] },
    { col: '#ff6ac8', frames: ['###', '.#.', '###'] },
  ];

  var GAME_TITLE = 'TANK SLICE';
  var COLS = 5, ROWS = 4, CELL = 168;
  var GX = W * 0.5, TOP_Y = H * 0.26;
  var NEEDED = 3;
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
  function randomFish() { return Math.floor(game.random(0, FISH.length)); }

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
  function newGrid() {
    var g;
    do { g = []; for (var i = 0; i < COLS * ROWS; i++) g.push(randomFish()); } while (!hasAnyMatch(g));
    return g;
  }
  function ensureMatch(g) {
    if (hasAnyMatch(g)) return;
    var r = Math.floor(game.random(0, ROWS)), c = Math.floor(game.random(0, COLS - 2));
    var t = randomFish();
    g[idx(c, r)] = t; g[idx(c + 1, r)] = t; g[idx(c + 2, r)] = t;
  }

  var grid, matches, timeLeft, halfCalled, pressX, pressY, pressing;
  var done, endWait, finished, ready, hitStop, shake;

  function initGame() {
    grid = newGrid(); matches = 0; timeLeft = TIME_LIMIT; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    pressing = false;
  }

  function clampLine(v, max) { return Math.max(0, Math.min(max, Math.round(v))); }

  function attemptSlice(x0, y0, x1, y1) {
    if (finished || done) return;
    var dx = x1 - x0, dy = y1 - y0;
    if (Math.hypot(dx, dy) < 90) { game.audio.play('se_tap', 0.1); return; }
    var horizontal = Math.abs(dx) > Math.abs(dy);
    var matched = findMatches(grid);
    var hitAny = false, cx = 0, cy = 0, count = 0;
    if (horizontal) {
      var r = clampLine((((y0 + y1) / 2) - (TOP_Y + CELL / 2)) / CELL, ROWS - 1);
      for (var c = 0; c < COLS; c++) { var i = idx(c, r); if (matched[i]) { hitAny = true; var p = cellPos(i); cx += p.x; cy += p.y; count++; } }
    } else {
      var col = clampLine((((x0 + x1) / 2) - (GX - (COLS - 1) * CELL / 2)) / CELL, COLS - 1);
      for (var r2 = 0; r2 < ROWS; r2++) { var i2 = idx(col, r2); if (matched[i2]) { hitAny = true; var p2 = cellPos(i2); cx += p2.x; cy += p2.y; count++; } }
    }
    if (hitAny) {
      matches++;
      hitStop = 0.07;
      cx /= count; cy /= count;
      game.feedback.good(cx, cy, { text: 'NET!', color: C.good });
      game.fx.burst(cx, cy, { color: C.gold, count: 14 + count * 2, speed: 340 });
      game.audio.play('se_good', 0.32);
      for (var j = 0; j < matched.length; j++) if (matched[j]) grid[j] = randomFish();
      ensureMatch(grid);
      if (matches === Math.ceil(NEEDED / 2)) game.fx.popup(matches + ' / ' + NEEDED, GX, TOP_Y - 110, { color: C.gold, size: 36 });
      if (matches >= NEEDED) { ok = true; finished = true; finish(); }
    } else {
      game.feedback.bad((x0 + x1) / 2, (y0 + y1) / 2, { text: 'MISS' });
      game.audio.play('se_bad', 0.2);
    }
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) { pressing = true; pressX = x; pressY = y; game.audio.play('se_tap', 0.06); }
  });
  game.onRelease(function(x, y) {
    if (state !== S.PLAYING || !pressing) return;
    pressing = false;
    attemptSlice(pressX, pressY, x, y);
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
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.2));
    game.draw.rect(GX - COLS * CELL / 2 - 16, TOP_Y - 20, COLS * CELL + 32, ROWS * CELL + 40, C.glass, 0.7);
    game.draw.rect(GX - COLS * CELL / 2 - 16, TOP_Y - 20, COLS * CELL + 32, 8, C.glassEdge);
    for (var b = 0; b < 6; b++) {
      var bx = GX - COLS * CELL / 2 + (b * 97) % (COLS * CELL);
      var by = TOP_Y + ROWS * CELL - ((game.time.elapsed * 40 + b * 60) % (ROWS * CELL + 60));
      game.draw.circle(bx, by, 4, '#ffffff', 0.2);
    }
  }

  function drawGrid() {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      var f = FISH[grid[i]];
      var sway = Math.sin(game.time.elapsed * 2 + i * 1.3) * 8;
      game.draw.sprite(f.frames, { '#': f.col }, p.x + sway, p.y, 20, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: GX, gy: TOP_Y, press: false, sx: GX, sy: TOP_Y, ex: GX, ey: TOP_Y };
  function findLineDemo() {
    var matched = findMatches(grid);
    for (var r = 0; r < ROWS; r++) {
      var first = -1, last = -1;
      for (var c = 0; c < COLS; c++) { var i = idx(c, r); if (matched[i]) { if (first < 0) first = c; last = c; } }
      if (first >= 0 && last - first >= 2) return { horizontal: true, a: cellPos(idx(first, r)), b: cellPos(idx(last, r)) };
    }
    for (var c2 = 0; c2 < COLS; c2++) {
      var first2 = -1, last2 = -1;
      for (var r2 = 0; r2 < ROWS; r2++) { var i2 = idx(c2, r2); if (matched[i2]) { if (first2 < 0) first2 = r2; last2 = r2; } }
      if (first2 >= 0 && last2 - first2 >= 2) return { horizontal: false, a: cellPos(idx(c2, first2)), b: cellPos(idx(c2, last2)) };
    }
    return null;
  }
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) {
      grid = newGrid(); matches = 0;
      var line = findLineDemo();
      if (line) { demo.sx = line.a.x; demo.sy = line.a.y; demo.ex = line.b.x; demo.ey = line.b.y; } else { demo.sx = demo.ex = GX; demo.sy = demo.ey = TOP_Y; }
      demo.resolved = false;
    }
    if (cyc < 1.1) {
      var t2 = cyc / 1.1;
      demo.gx = demo.sx + (demo.ex - demo.sx) * t2;
      demo.gy = demo.sy + (demo.ey - demo.sy) * t2;
      demo.press = t2 > 0.05;
    } else if (!demo.resolved) {
      demo.resolved = true;
      attemptSlice(demo.sx, demo.sy, demo.ex, demo.ey);
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
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(matches + ' / ' + NEEDED, W / 2, H * 0.12, 26, C.white);
      if (!ok && matches >= NEEDED - 1) txt('あと1回!', W / 2, H * 0.16, 22, C.gold);
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

    txt(matches + ' / ' + NEEDED, W / 2, 100, 30, C.white);
    if (!finished) {
      var frac = Math.max(0, timeLeft / TIME_LIMIT);
      game.draw.rect(60, 150, W - 120, 14, C.glassEdge, 0.5);
      game.draw.rect(60, 150, (W - 120) * frac, 14, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.3]], { tempo: 132, wave: 'sine', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
