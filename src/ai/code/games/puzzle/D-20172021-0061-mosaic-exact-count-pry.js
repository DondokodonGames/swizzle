// D-20172021-0061-mosaic-exact-count-pry.js
// モザイク・イグザクトカウントプライ — 指示された枚数ぴったりでつながったタイルの塊を探し当ててタップで剥がす
// 操作: 上部に示された「ちょうどこの枚数」を頼りに、盤面からその枚数分だけつながったタイルの塊を選んでタップする
// 終わり: 規定回数(6回)ぴったり当てられれば成功。3回誤ると失敗
// @mechanic: count_exact
// @theme: mosaic_exact_count_pry
// 世界観: モザイク工房を任された見習い職人が、掲示された「ちょうどこの枚数」という指示を頼りに、タイルの塊からぴったり同じ枚数でつながった箇所を探し当てて剥がし取り、次の意匠へと工房を進める
// 残るもの: 正誤(CLEAR/GAME OVER) + 剥がせた回数
// スタイル: SKEUOMORPH

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // SKEUOMORPH: 陶タイル質感。上面ハイライト+下面シャドウで凹凸を演出
  var C = {
    bg: '#efe2c8', bg2: '#d9c49a', wall: '#c9ab78', wallEdge: '#8a6a3a',
    tile0d: '#b0502a', tile0l: '#e08850', tile1d: '#2a6a6a', tile1l: '#5ab0aa',
    tile2d: '#c9a020', tile2l: '#f0d060', tile3d: '#3a4a8a', tile3l: '#7a8ad0',
    good: '#3a9a5a', bad: '#c03a3a', gold: '#c9902a', white: '#fff8ea', ink: '#3a2810',
  };
  var COLORS = [{ d: C.tile0d, l: C.tile0l }, { d: C.tile1d, l: C.tile1l }, { d: C.tile2d, l: C.tile2l }, { d: C.tile3d, l: C.tile3l }];
  var MASON_SPR = ['.##.', '####', '.#.#', '.#.#'];

  var GAME_TITLE = 'MOSAIC PRY';
  var COLS = 6, ROWS = 4, CELL = 148;
  var GX = W * 0.5, TOP_Y = H * 0.3;
  var NEEDED = 6;
  var MAX_MISS = 3;
  var TIME_LIMIT = 20;

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
  function neighborsOf(i) {
    var c = i % COLS, r = Math.floor(i / COLS), out = [];
    if (c > 0) out.push(i - 1); if (c < COLS - 1) out.push(i + 1);
    if (r > 0) out.push(i - COLS); if (r < ROWS - 1) out.push(i + COLS);
    return out;
  }
  function randomColor() { return Math.floor(game.random(0, COLORS.length)); }

  function clusterOf(g, i) {
    var color = g[i], seen = {}, stack = [i], out = [];
    seen[i] = true;
    while (stack.length) {
      var cur = stack.pop(); out.push(cur);
      var ns = neighborsOf(cur);
      for (var k = 0; k < ns.length; k++) { var n = ns[k]; if (!seen[n] && g[n] === color) { seen[n] = true; stack.push(n); } }
    }
    return out;
  }
  function allClusters(g) {
    var seen = {}, list = [];
    for (var i = 0; i < g.length; i++) {
      if (seen[i]) continue;
      var grp = clusterOf(g, i);
      for (var k = 0; k < grp.length; k++) seen[grp[k]] = true;
      list.push(grp);
    }
    return list;
  }
  function newGrid() {
    var g = [];
    for (var i = 0; i < COLS * ROWS; i++) g.push(randomColor());
    return g;
  }

  var grid, target, rounds, misses, timeLeft, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function newRound() {
    var tries = 0, best = null;
    do {
      grid = newGrid();
      var clusters = allClusters(grid);
      var pool = [];
      for (var i = 0; i < clusters.length; i++) if (clusters[i].length >= 2 && clusters[i].length <= 6) pool.push(clusters[i]);
      if (pool.length > 0) best = pool[Math.floor(game.random(0, pool.length))];
      tries++;
    } while (!best && tries < 12);
    if (!best) { grid[0] = grid[1]; best = [0, 1]; }
    target = best.length;
  }
  function initGame() {
    rounds = 0; misses = 0; timeLeft = TIME_LIMIT; halfCalled = false;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    newRound();
  }

  function panelAt(x, y) {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      if (Math.abs(x - p.x) < CELL / 2 - 4 && Math.abs(y - p.y) < CELL / 2 - 4) return i;
    }
    return -1;
  }

  function attemptTap(i) {
    if (i < 0 || finished || done) { if (i < 0) game.audio.play('se_tap', 0.08); return; }
    var grp = clusterOf(grid, i);
    var p = cellPos(i);
    if (grp.length === target) {
      rounds++;
      hitStop = 0.08;
      game.feedback.good(p.x, p.y, { text: 'x' + grp.length, color: C.good });
      game.fx.burst(p.x, p.y, { color: COLORS[grid[i]].l, count: 14 + grp.length, speed: 320 });
      game.audio.play('se_good', 0.32);
      if (rounds === Math.ceil(NEEDED / 2)) game.fx.popup(rounds + ' / ' + NEEDED, GX, TOP_Y - 130, { color: C.gold, size: 34 });
      if (rounds >= NEEDED) { ok = true; finished = true; finish(); return; }
      newRound();
    } else {
      misses++;
      hitStop = 0.2; shake = 0.2;
      game.feedback.bad(p.x, p.y, { text: 'x' + grp.length });
      game.audio.play('se_bad', 0.35);
      if (misses >= MAX_MISS) { ok = false; finished = true; finish(); }
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING && ready <= 0 && !finished) attemptTap(panelAt(x, y));
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
    var bob = Math.sin(game.time.elapsed * 2) * 6;
    game.draw.sprite(MASON_SPR, { '#': C.ink }, W * 0.12, H * 0.86 + bob, 16, { anchor: 'center' });
  }

  function drawGrid() {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      var col = COLORS[grid[i]];
      game.draw.rect(p.x - CELL / 2 + 5, p.y - CELL / 2 + 5, CELL - 10, CELL - 10, col.d, 1);
      game.draw.rect(p.x - CELL / 2 + 9, p.y - CELL / 2 + 9, CELL - 18, (CELL - 18) * 0.55, col.l, 1);
    }
  }

  var demo = { t: 0, gx: GX, gy: TOP_Y, press: false, targetIdx: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.8;
    if (cyc < dt || demo.t <= dt) {
      newRound(); rounds = 0;
      var clusters = allClusters(grid), pick = null;
      for (var i = 0; i < clusters.length; i++) if (clusters[i].length === target) { pick = clusters[i]; break; }
      demo.targetIdx = pick ? pick[0] : 0;
      demo.resolved = false;
    }
    var p = cellPos(demo.targetIdx);
    if (cyc < 1.4) {
      var t2 = cyc / 1.4;
      demo.gx += (p.x - demo.gx) * Math.min(1, dt * 6);
      demo.gy += (p.y - demo.gy) * Math.min(1, dt * 6);
      demo.press = t2 > 0.7;
    } else if (!demo.resolved) {
      demo.resolved = true;
      attemptTap(demo.targetIdx);
      demo.press = true;
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
      txt(GAME_TITLE, W / 2, H * 0.08, 36, C.ink);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.115, 20, C.gold);
      txt('TARGET ' + target, W / 2, H * 0.17, 30, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.ink);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(rounds + ' / ' + NEEDED, W / 2, H * 0.13, 26, C.ink);
      if (!ok && rounds >= NEEDED - 1) txt('あと1回!', W / 2, H * 0.18, 22, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.ink);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(rounds * 100, { rounds: rounds, misses: misses }); else game.end.failure({ rounds: rounds, misses: misses });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (!halfCalled && timeLeft <= TIME_LIMIT * 0.5) { halfCalled = true; game.fx.popup('あと' + (NEEDED - rounds) + '回!', GX, TOP_Y - 130, { color: C.gold, size: 28 }); game.audio.play('se_milestone', 0.3); }
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

    txt('TARGET ' + target, W / 2, H * 0.06, 30, C.ink);
    txt(rounds + ' / ' + NEEDED, W / 2, H * 0.11, 24, C.gold);
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W - 60 - m * 40, 100, 12, m < misses ? C.bad : '#c9ab78');
    if (!finished) {
      var frac = Math.max(0, timeLeft / TIME_LIMIT);
      game.draw.rect(60, 150, W - 120, 14, '#c9ab78', 0.7);
      game.draw.rect(60, 150, (W - 120) * frac, 14, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.55, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['F3', 0.2], ['A3', 0.2], ['C4', 0.2], ['F4', 0.35]], { tempo: 116, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
