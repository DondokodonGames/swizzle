// D-20092012-0071-cascade-block-purge.js
// カスケードブロック・パージ — 指で同じ色のブロックを隣へ隣へとなぞり、つないだ分だけまとめて消す
// 操作: 指を置いたブロックから、隣接する同色ブロックへ指を滑らせてつなぐ。3つ以上つないで離すとまとめて消える
// 終わり: 規定回数(5回)消せれば成功。制限時間切れ/2つ以下でつなぎ終えると失敗
// @mechanic: connect
// @theme: cascade_block_purge
// 世界観: 貯水塔の内壁に張り付いた色ブロック。消すたびに上のブロックが崩れ落ちてきて隙間を埋める。塔守りは崩落を読みながら同色ブロックを指でなぞってつなぎ、まとめて消していく
// 残るもの: 正誤(CLEAR/GAME OVER) + 消せた回数
// スタイル: TOON SHADE

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  // TOON SHADE: 太い黒輪郭を先に描き、内側を明暗2色だけで塗る
  var C = {
    bg1: '#203048', bg2: '#101826', wall: '#182436',
    c0d: '#a83030', c0l: '#ff5a5a', c1d: '#2a6ea0', c1l: '#5ac8ff',
    c2d: '#a89020', c2l: '#ffe25a', c3d: '#2a8850', c3l: '#5aff9a',
    good: '#5aff9a', bad: '#ff4d5e', gold: '#ffe25a', white: '#eef4fa', ink: '#04080e',
  };
  var COLORS = [{ d: C.c0d, l: C.c0l }, { d: C.c1d, l: C.c1l }, { d: C.c2d, l: C.c2l }, { d: C.c3d, l: C.c3l }];
  var BLOCK_SPR = ['#####', '#...#', '#...#', '#####'];

  var GAME_TITLE = 'CASCADE PURGE';
  var COLS = 5, ROWS = 5;
  var CELL = 168;
  var GX = W * 0.5, TOP_Y = H * 0.22;
  var NEEDED = 5;
  var MAX_TIME = 20;
  var DROP_DUR = 0.32;

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
    if (c > 0) out.push(i - 1);
    if (c < COLS - 1) out.push(i + 1);
    if (r > 0) out.push(i - COLS);
    if (r < ROWS - 1) out.push(i + COLS);
    return out;
  }
  function randomColor() { return Math.floor(game.random(0, COLORS.length)); }

  var grid, dropOffset, clears, timeLeft;
  var done, endWait, finished, ready, hitStop, shake;
  var path, pathColor, dragging;

  function adjacent(a, b) {
    var ns = neighborsOf(a);
    for (var k = 0; k < ns.length; k++) if (ns[k] === b) return true;
    return false;
  }

  function hasAnyTriple(g) {
    for (var i = 0; i < g.length; i++) {
      if (floodGroupOf(g, i).length >= 3) return true;
    }
    return false;
  }
  function floodGroupOf(g, i) {
    var color = g[i];
    var seen = {}; var stack = [i]; var group = [];
    seen[i] = true;
    while (stack.length) {
      var cur = stack.pop();
      group.push(cur);
      var ns = neighborsOf(cur);
      for (var k = 0; k < ns.length; k++) {
        var n = ns[k];
        if (!seen[n] && g[n] === color) { seen[n] = true; stack.push(n); }
      }
    }
    return group;
  }
  function newGrid() {
    var g, tries = 0;
    do {
      g = [];
      for (var i = 0; i < COLS * ROWS; i++) g.push(randomColor());
      tries++;
    } while (!hasAnyTriple(g) && tries < 15);
    return g;
  }

  function initGame() {
    grid = newGrid();
    dropOffset = []; for (var c = 0; c < COLS; c++) dropOffset.push(0);
    clears = 0; timeLeft = MAX_TIME;
    done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
    path = []; pathColor = -1; dragging = false;
  }

  function panelAt(x, y) {
    for (var i = 0; i < grid.length; i++) {
      var p = cellPos(i);
      if (Math.abs(x - p.x) < CELL / 2 - 6 && Math.abs(y - p.y) < CELL / 2 - 6) return i;
    }
    return -1;
  }

  function applyGravity(removedSet) {
    for (var c = 0; c < COLS; c++) {
      var survivors = [];
      for (var r = 0; r < ROWS; r++) { var i = idx(c, r); if (!removedSet[i]) survivors.push(grid[i]); }
      var missing = ROWS - survivors.length;
      var fresh = [];
      for (var k = 0; k < missing; k++) fresh.push(randomColor());
      var combined = fresh.concat(survivors);
      for (var r2 = 0; r2 < ROWS; r2++) grid[idx(c, r2)] = combined[r2];
      if (missing > 0) dropOffset[c] = missing * CELL;
    }
    if (!hasAnyTriple(grid)) grid = newGrid();
  }

  function clearPath(p) {
    if (p.length < 3) {
      if (p.length >= 1) {
        var pp = cellPos(p[p.length - 1]);
        game.feedback.bad(pp.x, pp.y, { text: 'MISS' });
        game.audio.play('se_bad', 0.22);
      }
      return;
    }
    var last = cellPos(p[p.length - 1]);
    game.feedback.good(last.x, last.y, { text: '+1', color: C.good });
    game.fx.burst(last.x, last.y, { color: COLORS[pathColor].l, count: 12 + p.length * 2, speed: 320 });
    game.audio.play('se_good', 0.32);
    var removedSet = {};
    for (var k = 0; k < p.length; k++) removedSet[p[k]] = true;
    applyGravity(removedSet);
    clears++;
    hitStop = 0.06;
    if (clears === Math.ceil(NEEDED / 2)) { game.fx.popup(clears + ' / ' + NEEDED, W / 2, TOP_Y - 100, { color: C.gold, size: 40 }); game.audio.play('se_milestone', 0.35); }
    if (clears >= NEEDED) { ok = true; finished = true; finish(); }
  }

  function beginPath(x, y) {
    if (ready > 0 || finished || done) return;
    var i = panelAt(x, y);
    if (i < 0) return;
    dragging = true; path = [i]; pathColor = grid[i];
    game.audio.play('se_tap', 0.1);
  }
  function extendPath(x, y) {
    if (!dragging) return;
    var i = panelAt(x, y);
    if (i < 0 || grid[i] !== pathColor) return;
    var last = path[path.length - 1];
    if (i === last) return;
    if (path.length >= 2 && i === path[path.length - 2]) { path.pop(); return; }
    if (path.indexOf(i) >= 0) return;
    if (!adjacent(last, i)) return;
    path.push(i);
    game.audio.play('se_tap', 0.04);
  }
  function endPath() {
    if (!dragging) return;
    dragging = false;
    clearPath(path);
    path = [];
  }

  game.onPress(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); demo.t = 0; return; }
    if (state === S.PLAYING) beginPath(x, y);
  });
  game.onMove(function(x, y) { if (state === S.PLAYING) extendPath(x, y); });
  game.onRelease(function() { if (state === S.PLAYING) endPath(); });

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
    game.draw.rect(GX - COLS * CELL / 2 - 16, TOP_Y - 20, COLS * CELL + 32, ROWS * CELL + 40, C.wall, 0.5);
  }

  function drawGrid() {
    for (var c = 0; c < COLS; c++) {
      var off = dropOffset[c] || 0;
      for (var r = 0; r < ROWS; r++) {
        var i = idx(c, r);
        var p = cellPos(i);
        var y = p.y - off;
        var col = COLORS[grid[i]];
        var inPath = path && path.indexOf(i) >= 0;
        game.draw.rect(p.x - CELL / 2 + 6, y - CELL / 2 + 6, CELL - 12, CELL - 12, inPath ? C.white : C.ink, 1);
        game.draw.rect(p.x - CELL / 2 + 12, y - CELL / 2 + 12, CELL - 24, (CELL - 24) * 0.5, col.l, 1);
        game.draw.rect(p.x - CELL / 2 + 12, y, CELL - 24, (CELL - 24) * 0.5 - 12, col.d, 1);
        game.draw.sprite(BLOCK_SPR, { '#': C.ink }, p.x, y, 10, { anchor: 'center' });
      }
    }
    if (path && path.length > 1) {
      for (var k = 1; k < path.length; k++) {
        var a = cellPos(path[k - 1]), b = cellPos(path[k]);
        game.draw.line(a.x, a.y, b.x, b.y, C.white, 10);
      }
    }
  }

  // group内で隣接をたどり、length個まで連結した経路(デモ用)を作る
  function pathWithinGroup(group, length) {
    var inGroup = {}; for (var g = 0; g < group.length; g++) inGroup[group[g]] = true;
    var out = [group[0]]; var seen = {}; seen[group[0]] = true;
    while (out.length < length) {
      var last = out[out.length - 1];
      var ns = neighborsOf(last), found = -1;
      for (var k = 0; k < ns.length; k++) if (inGroup[ns[k]] && !seen[ns[k]]) { found = ns[k]; break; }
      if (found < 0) break;
      out.push(found); seen[found] = true;
    }
    return out;
  }

  var demo = { t: 0, gx: GX, gy: TOP_Y, press: false, dpath: [] };
  function stepDemo(dt) {
    demo.t += dt;
    var cyc = demo.t % 3.2;
    if (cyc < dt || demo.t <= dt) {
      grid = newGrid(); dropOffset = []; for (var c = 0; c < COLS; c++) dropOffset.push(0); clears = 0;
      var target = -1, best = null;
      for (var i = 0; i < grid.length; i++) { var g = floodGroupOf(grid, i); if (g.length >= 3) { best = g; break; } }
      demo.dpath = best ? pathWithinGroup(best, Math.min(4, best.length)) : [];
      path = [];
    }
    if (cyc < 0.4 || demo.dpath.length < 3) { demo.press = false; path = []; return; }
    var span = 1.6, segT = span / (demo.dpath.length - 1);
    var since = cyc - 0.4;
    if (since < span) {
      var seg = Math.min(demo.dpath.length - 2, Math.floor(since / segT));
      var frac = (since - seg * segT) / segT;
      var a = cellPos(demo.dpath[seg]), b = cellPos(demo.dpath[seg + 1]);
      demo.gx = a.x + (b.x - a.x) * frac; demo.gy = a.y + (b.y - a.y) * frac;
      demo.press = true;
      var upto = seg + (frac > 0.5 ? 2 : 1);
      path = demo.dpath.slice(0, upto);
    } else if (path && path.length >= 3) {
      demo.press = false;
      var full = demo.dpath.slice();
      pathColor = grid[full[0]];
      clearPath(full);
      path = []; demo.dpath = [];
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
      txt(GAME_TITLE, W / 2, H * 0.06, 40, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.10, 20, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.95, 40, C.gold);
      else txt('INSERT COIN', W / 2, H * 0.95, 26, C.white);
      return;
    }

    if (state === S.RESULT) {
      bg();
      drawGrid();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.06, 44, ok ? C.good : C.bad);
      txt(clears + ' / ' + NEEDED, W / 2, H * 0.10, 26, C.white);
      if (!ok && clears >= NEEDED - 1) txt('あと1回!', W / 2, H * 0.14, 22, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.95, 24, C.white);
      return;
    }

    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success(clears * 100, { clears: clears }); else game.end.failure({ clears: clears });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        ok = false; finished = true; hitStop = 0.2;
        game.feedback.bad(GX, TOP_Y, { text: 'TIME UP' });
        game.audio.play('se_bad', 0.4);
        finish();
      }
    }
    if (shake > 0) shake -= dt;

    bg();
    drawGrid();

    txt(clears + ' / ' + NEEDED, W / 2, 100, 30, C.white);
    if (!finished) {
      var frac = Math.max(0, timeLeft / MAX_TIME);
      game.draw.rect(60, 150, W - 120, 14, C.ink, 0.5);
      game.draw.rect(60, 150, (W - 120) * frac, 14, C.gold);
    }
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.46, 56, C.gold);
  });

  game.onStart(function() {
    game.audio.melody([['D4', 0.2], ['F4', 0.2], ['A4', 0.2], ['D5', 0.3]], { tempo: 126, wave: 'triangle', volume: 0.05, loop: true });
    state = S.ATTRACT;
    initGame();
  });
})(game);
