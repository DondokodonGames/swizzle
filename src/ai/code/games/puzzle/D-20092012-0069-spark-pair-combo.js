// D-20092012-0069-spark-pair-combo.js
// スパークペア・コンボ — 同じ色の光石をタップでまとめて消し、間を空けずに連鎖してコンボ倍率を伸ばす
// 操作: 隣り合う同色が2つ以上つながった光石をタップして消す。間を空けずに続けて消すとコンボ倍率が上がる
// 終わり: 規定回数(6回)消せれば成功。制限時間切れで失敗
// @mechanic: jackpot_combo
// @theme: spark_stone_combo
// 世界観: 小さな祭壇に並ぶ4色の光石。隣り合う同色をつなげて消すたび光が弾け、間を置かず消し続けるほど倍率が高まっていく
// 残るもの: 正誤(CLEAR/GAME OVER) + 消せた回数と最高コンボ倍率
// スタイル: 8bit HOME

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // 8bit HOME: 3〜4色+黒、粗いドット、輪郭線なし、タイル反復背景
  var C = {
    bg1: '#1a1030', bg2: '#0c081c', tile: '#241840',
    c0: '#ff5a7a', c1: '#5adfff', c2: '#ffe25a', c3: '#7aff8a',
    good: '#7aff8a', bad: '#ff4d5e', gold: '#ffe25a', white: '#f2ecff', ink: '#0a0616',
  };
  var COLORS = [C.c0, C.c1, C.c2, C.c3];
  var STONE_SPR = ['.###.', '#####', '#####', '.###.'];

  var GAME_TITLE = 'SPARK COMBO';
  var COLS = 4, ROWS = 4;
  var CELL = 210;
  var GX = W * 0.5, GY = H * 0.50;
  var NEEDED = 6;
  var MAX_TIME = 15;
  var COMBO_WINDOW = 1.3;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function cellPos(i) {
    var c = i % COLS, r = Math.floor(i / COLS);
    return { x: GX + (c - (COLS - 1) / 2) * CELL, y: GY + (r - (ROWS - 1) / 2) * CELL };
  }
  function neighborsOf(i) {
    var c = i % COLS, r = Math.floor(i / COLS), out = [];
    if (c > 0) out.push(i - 1);
    if (c < COLS - 1) out.push(i + 1);
    if (r > 0) out.push(i - COLS);
    if (r < ROWS - 1) out.push(i + COLS);
    return out;
  }
  function randomColor() { return Math.floor(game.random(0, 4)); }

  var grid, spawnT, clears, timeLeft, combo, comboTimer, bestCombo, popIdx, popT;
  var done, endWait, finished, ready, hitStop, shake;

  function hasAnyPair(g) {
    for (var i = 0; i < g.length; i++) {
      var ns = neighborsOf(i);
      for (var k = 0; k < ns.length; k++) if (g[ns[k]] === g[i]) return true;
    }
    return false;
  }
  function newGrid() {
    var g;
    var tries = 0;
    do {
      g = [];
      for (var i = 0; i < COLS * ROWS; i++) g.push(randomColor());
      tries++;
    } while (!hasAnyPair(g) && tries < 15);
    return g;
  }

  function initGame() {
    grid = newGrid();
    spawnT = grid.map(function() { return 0; });
    clears = 0; timeLeft = MAX_TIME; combo = 0; comboTimer = 0; bestCombo = 0; popIdx = []; popT = 0;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function floodGroup(i) {
    var color = grid[i];
    var seen = {}; var stack = [i]; var group = [];
    seen[i] = true;
    while (stack.length) {
      var cur = stack.pop();
      group.push(cur);
      var ns = neighborsOf(cur);
      for (var k = 0; k < ns.length; k++) {
        var n = ns[k];
        if (!seen[n] && grid[n] === color) { seen[n] = true; stack.push(n); }
      }
    }
    return group;
  }

  function panelAt(x, y) {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      if (Math.abs(x - p.x) < CELL / 2 - 6 && Math.abs(y - p.y) < CELL / 2 - 6) return i;
    }
    return -1;
  }

  function tap(x, y) {
    if (ready > 0 || finished || done) return;
    var i = panelAt(x, y);
    if (i < 0) { game.audio.play('se_tap', 0.05); return; }
    var group = floodGroup(i);
    if (group.length >= 2) {
      popIdx = group; popT = 0.2;
      if (comboTimer > 0) combo++; else combo = 1;
      comboTimer = COMBO_WINDOW;
      if (combo > bestCombo) bestCombo = combo;
      var p = cellPos(i);
      game.feedback.good(p.x, p.y, { text: combo > 1 ? 'x' + combo : 'GOOD', color: C.gold });
      game.fx.burst(p.x, p.y, { color: grid[i], count: 10 + group.length * 2, speed: 320 });
      game.audio.play('se_good', 0.3);
      for (var k = 0; k < group.length; k++) { grid[group[k]] = randomColor(); spawnT[group[k]] = 0.28; }
      if (!hasAnyPair(grid)) grid = newGrid();
      clears++;
      hitStop = 0.06;
      if (combo >= 3) { game.fx.popup('x' + combo + ' COMBO!', W / 2, GY - 380, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.35); }
      if (clears >= NEEDED) { ok = true; finished = true; finish(); return; }
    } else {
      var p2 = cellPos(i);
      game.feedback.bad(p2.x, p2.y, { text: 'MISS' });
      game.audio.play('se_bad', 0.25);
      combo = 0; comboTimer = 0;
    }
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) tap(x, y);
  });

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    game.audio.play(ok ? 'se_success' : 'se_failure', 0.5);
    endWait = 1.3;
  }

  function bg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    game.draw.rect(0, 0, W, H, '#ffffff', 0.03 + 0.03 * Math.sin(game.time.elapsed * 1.3));
    for (var yy = 0; yy < 10; yy++) game.draw.rect(0, yy * (H / 10), W, 2, '#ffffff05');
  }

  function drawGrid() {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      var sway = Math.sin(game.time.elapsed * 1.5 + i * 0.7) * 2;
      var scale = spawnT[i] > 0 ? 1 - spawnT[i] * 1.5 : 1;
      var r = (CELL / 2 - 14) * Math.max(0.6, scale);
      game.draw.rect(p.x - CELL / 2 + 6, p.y - CELL / 2 + 6 + sway, CELL - 12, CELL - 12, C.tile, 0.6);
      game.draw.circle(p.x, p.y + sway, r, grid[i], 1);
      game.draw.sprite(STONE_SPR, { '#': C.ink }, p.x, p.y + sway, 10, { anchor: 'center' });
    }
  }

  var demo = { t: 0, gx: GX, gy: GY, press: false };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) { grid = newGrid(); spawnT = grid.map(function() { return 0; }); clears = 0; combo = 0; comboTimer = 0; }
    if (cyc < 0.6) { demo.press = false; }
    else if (cyc < 1.0) {
      // 消せるペアを探してそこへ手を動かす
      var target = -1;
      for (var i = 0; i < grid.length; i++) { if (floodGroup(i).length >= 2) { target = i; break; } }
      if (target < 0) target = 0;
      var p = cellPos(target);
      demo.gx = p.x; demo.gy = p.y; demo.press = true;
      if (cyc > 0.9 && cyc - dt <= 0.9) tap(p.x, p.y);
    }
  }

  game.onUpdate(function(dt) {
    for (var i = 0; i < spawnT.length; i++) if (spawnT[i] > 0) spawnT[i] -= dt;

    if (state === S.ATTRACT) {
      if (grid === undefined) initGame();
      bg();
      stepDemo(dt);
      drawGrid();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 15 });
      txt(GAME_TITLE, W / 2, H * 0.08, 44, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 22, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 46, ok ? C.good : C.bad);
      txt(clears + ' / ' + NEEDED, W / 2, H * 0.12, 28, C.white);
      txt('BEST COMBO x' + bestCombo, W / 2, H * 0.16, 24, C.gold);
      if (!ok && clears >= NEEDED - 1) txt('あと1回!', W / 2, H * 0.20, 24, C.white);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(clears * 100 * Math.max(1, bestCombo), { clears: clears, bestCombo: bestCombo });
        else game.end.failure({ clears: clears, bestCombo: bestCombo });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      if (comboTimer > 0) comboTimer -= dt; else combo = 0;
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(GX, GY, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid();

    txt(clears + ' / ' + NEEDED, W / 2, 100, 32, C.white);
    if (!finished) {
      var frac = Math.max(0, timeLeft / MAX_TIME);
      game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
      game.draw.rect(60, 150, (W - 120) * frac, 14, C.gold);
    }
    if (combo > 1 && !finished) txt('COMBO x' + combo, W / 2, H * 0.90, 34, C.gold);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, GY, 58, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['E4', 0.2], ['G4', 0.2], ['B4', 0.2], ['E5', 0.4]], { tempo: 140, wave: 'square', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
