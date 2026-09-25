// D-20172021-0060-icevein-largest-crack.js
// アイスヴェイン・ラージェストクラック — 色ごとに固まった氷塊の群れを見渡し、最も大きな塊をタップで割り崩す
// 操作: 盤面に散らばる色氷の塊から、隣接してつながった数が最も多い色の塊を選んでタップする
// 終わり: 規定回数(5回)正しい塊を選べれば成功。3回誤ると失敗
// @mechanic: spot
// @theme: icevein_largest_crack
// 世界観: 氷穴を切り拓く採掘職人見習いが、色ごとに凍りついた氷塊の群れを見渡し、隣接してつながった数が最も多い塊を瞬時に見極めて一撃で割り崩し、氷穴の奥へと進む
// 残るもの: 正誤(CLEAR/GAME OVER) + 割り崩せた回数
// スタイル: VOXEL BLOCK

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // VOXEL BLOCK: くっきりしたブロック塊、上面ハイライト+側面シェードの疑似立体
  var C = {
    bg: '#0e2438', bg2: '#183a54', wallDeep: '#0a1c2c',
    ice0d: '#2a7ac0', ice0l: '#7ac8ff', ice1d: '#2aa0a0', ice1l: '#6af0e0',
    ice2d: '#5a4ac0', ice2l: '#a89aff', ice3d: '#2a90a8', ice3l: '#8ae0ff',
    good: '#7affb0', bad: '#ff5d6c', gold: '#ffd24a', white: '#eaf6ff', ink: '#03101c',
  };
  var COLORS = [{ d: C.ice0d, l: C.ice0l }, { d: C.ice1d, l: C.ice1l }, { d: C.ice2d, l: C.ice2l }, { d: C.ice3d, l: C.ice3l }];
  var BLOCK_SPR = ['#####', '#####', '#####'];

  var GAME_TITLE = 'ICEVEIN CRACK';
  var COLS = 5, ROWS = 5, CELL = 168;
  var GX = W * 0.5, TOP_Y = H * 0.26;
  var NEEDED = 5;
  var MAX_MISS = 3;
  var TIME_LIMIT = 13;

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
  function biggestCluster(g) {
    var seen = {}, best = [];
    for (var i = 0; i < g.length; i++) {
      if (seen[i]) continue;
      var grp = clusterOf(g, i);
      for (var k = 0; k < grp.length; k++) seen[grp[k]] = true;
      if (grp.length > best.length) best = grp;
    }
    return best;
  }
  function newGrid() {
    var g = [];
    for (var i = 0; i < COLS * ROWS; i++) g.push(randomColor());
    return g;
  }

  var grid, bestGroup, rounds, misses, timeLeft, halfCalled;
  var done, endWait, finished, ready, hitStop, shake;

  function newRound() { grid = newGrid(); bestGroup = biggestCluster(grid); }
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
    if (grp.length === bestGroup.length) {
      rounds++;
      hitStop = 0.08;
      game.feedback.good(p.x, p.y, { text: 'x' + grp.length, color: C.good });
      game.fx.burst(p.x, p.y, { color: COLORS[grid[i]].l, count: 16 + grp.length, speed: 340 });
      game.audio.play('se_good', 0.32);
      if (rounds === Math.ceil(NEEDED / 2)) game.fx.popup(rounds + ' / ' + NEEDED, GX, TOP_Y - 110, { color: C.gold, size: 36 });
      if (rounds >= NEEDED) { ok = true; finished = true; finish(); return; }
      newRound();
    } else {
      misses++;
      hitStop = 0.2; shake = 0.2;
      game.feedback.bad(p.x, p.y, { text: 'MISS' });
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
    game.draw.rect(GX - COLS * CELL / 2 - 16, TOP_Y - 20, COLS * CELL + 32, ROWS * CELL + 40, C.wallDeep, 0.7);
  }

  function drawGrid(highlight) {
    var inBest = {};
    if (highlight) for (var k = 0; k < bestGroup.length; k++) inBest[bestGroup[k]] = true;
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      var col = COLORS[grid[i]];
      game.draw.rect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, CELL - 12, col.d, 1);
      game.draw.rect(p.x - CELL / 2 + 10, p.y - CELL / 2 + 10, CELL - 20, (CELL - 20) * 0.5, col.l, 1);
      game.draw.sprite(BLOCK_SPR, { '#': col.d }, p.x, p.y, 12, { anchor: 'center', alpha: 0.35 });
      if (highlight && inBest[i]) game.draw.rect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6, CELL - 12, CELL - 12, C.gold, 0.22);
    }
  }

  var demo = { t: 0, gx: GX, gy: TOP_Y, press: false, targetIdx: -1 };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 2.6;
    if (cyc < dt || demo.t <= dt) { newRound(); rounds = 0; demo.targetIdx = bestGroup[0]; demo.resolved = false; }
    var p = cellPos(demo.targetIdx);
    if (cyc < 1.3) {
      var t2 = cyc / 1.3;
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
      drawGrid(true);
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 38, C.white);
      txt('BEST ' + (game.best > 0 ? game.best : '-'), W / 2, H * 0.12, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid(false);
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 44, ok ? C.good : C.bad);
      txt(rounds + ' / ' + NEEDED, W / 2, H * 0.12, 26, C.white);
      if (!ok && rounds >= NEEDED - 1) txt('あと1回!', W / 2, H * 0.16, 22, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
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
      if (!halfCalled && timeLeft <= TIME_LIMIT * 0.5) { halfCalled = true; game.fx.popup('あと' + (NEEDED - rounds) + '回!', GX, TOP_Y - 110, { color: C.gold, size: 30 }); game.audio.play('se_milestone', 0.3); }
      if (timeLeft <= 0) {
        timeLeft = 0; ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(GX, TOP_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid(false);

    txt(rounds + ' / ' + NEEDED, W / 2, 100, 30, C.white);
    for (var m = 0; m < MAX_MISS; m++) game.draw.circle(W - 60 - m * 40, 100, 12, m < misses ? C.bad : '#204058');
    if (!finished) {
      var frac = Math.max(0, timeLeft / TIME_LIMIT);
      game.draw.rect(60, 150, W - 120, 14, '#204058', 0.6);
      game.draw.rect(60, 150, (W - 120) * frac, 14, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.5, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['A3', 0.2], ['C4', 0.2], ['E4', 0.2], ['A4', 0.3]], { tempo: 132, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
