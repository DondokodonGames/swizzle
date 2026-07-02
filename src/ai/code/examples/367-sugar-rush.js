// 367-sugar-rush.js
// シュガーラッシュ — 隣り合うキャンディをタップ/スワイプで入れ替え、同色3つ以上を並べて消すマッチ3
// 操作: キャンディをタップで選び、隣をタップ（またはスワイプ）で入れ替える
// 成功: 3回そろえる  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、キャンディ工場） ──
  var C = { bg:'#1a0520', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CANDY = [C.a, C.b, C.e, C.c, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SUGAR RUSH';
  var HOW_TO_PLAY = 'SWAP ADJACENT CANDIES · LINE UP 3+ OF A COLOR';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 20 → 3
  var GN = 5, CELL = snap(W * 0.84 / GN), OX = snap((W - GN * CELL) / 2), OY = snap(H * 0.30);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, selected, matches, timeLeft, done, particles, flashCells, swapping;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2d1044');
  }

  function background() { game.draw.clear(C.bg); }

  function initGrid() { grid = []; for (var r = 0; r < GN; r++) { grid[r] = []; for (var c = 0; c < GN; c++) grid[r][c] = Math.floor(Math.random() * CANDY.length); } }

  function findMatches() {
    var m = [];
    for (var r = 0; r < GN; r++) for (var c = 0; c < GN - 2; c++) if (grid[r][c] >= 0 && grid[r][c] === grid[r][c + 1] && grid[r][c] === grid[r][c + 2]) m.push([r, c], [r, c + 1], [r, c + 2]);
    for (var r2 = 0; r2 < GN - 2; r2++) for (var c2 = 0; c2 < GN; c2++) if (grid[r2][c2] >= 0 && grid[r2][c2] === grid[r2 + 1][c2] && grid[r2][c2] === grid[r2 + 2][c2]) m.push([r2, c2], [r2 + 1, c2], [r2 + 2, c2]);
    return m;
  }

  function removeMatches(m) {
    var seen = {}, cnt = 0;
    for (var i = 0; i < m.length; i++) { var k = m[i][0] + ',' + m[i][1]; if (seen[k]) continue; seen[k] = 1; cnt++; var cx = OX + m[i][1] * CELL + CELL / 2, cy = OY + m[i][0] * CELL + CELL / 2; flashCells.push({ r: m[i][0], c: m[i][1], life: 0.5 }); for (var p = 0; p < 4; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cy, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.5, col: CANDY[grid[m[i][0]][m[i][1]]] }); } grid[m[i][0]][m[i][1]] = -1; }
    return cnt;
  }

  function dropFill() { for (var c = 0; c < GN; c++) { var w = GN - 1; for (var r = GN - 1; r >= 0; r--) if (grid[r][c] >= 0) { grid[w][c] = grid[r][c]; if (w !== r) grid[r][c] = -1; w--; } for (var r2 = w; r2 >= 0; r2--) grid[r2][c] = Math.floor(Math.random() * CANDY.length); } }

  function processMatches() {
    var m = findMatches(); if (m.length === 0) return;
    var cnt = removeMatches(m); matches += Math.floor(cnt / 3); game.audio.play('se_success', 0.5);
    if (matches >= NEEDED) { finish(true); return; }
    setTimeout(function() { if (!done && state === S.PLAYING) { dropFill(); processMatches(); } }, 250);
  }

  function initGame() { initGrid(); var m = findMatches(); while (m.length) { dropFill(); m = findMatches(); } selected = null; matches = 0; timeLeft = MAX_TIME; done = false; particles = []; flashCells = []; swapping = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (matches * 700 + Math.ceil(timeLeft) * 100) : matches * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function trySwap(r1, c1, r2, c2) {
    if (swapping || r2 < 0 || r2 >= GN || c2 < 0 || c2 >= GN) return;
    swapping = true; var t = grid[r1][c1]; grid[r1][c1] = grid[r2][c2]; grid[r2][c2] = t; game.audio.play('se_tap', 0.3);
    if (findMatches().length === 0) { var t2 = grid[r1][c1]; grid[r1][c1] = grid[r2][c2]; grid[r2][c2] = t2; } else processMatches();
    setTimeout(function() { swapping = false; }, 300);
  }

  function drawGrid() {
    for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) {
      var x = OX + c * CELL, y = OY + r * CELL; game.draw.rect(x + 3, y + 3, CELL - 6, CELL - 6, '#2d1044', 0.5);
      var v = grid[r][c]; if (v < 0) continue; var sel = selected && selected.r === r && selected.c === c;
      pc(x + CELL / 2, y + CELL / 2, CELL * 0.36, CANDY[v], sel ? 1 : 0.9); pc(x + CELL / 2 - CELL * 0.12, y + CELL / 2 - CELL * 0.12, CELL * 0.08, C.g, 0.4);
      if (sel) ring(x + CELL / 2, y + CELL / 2, CELL * 0.42, C.g, 0.6);
    }
    for (var fi = 0; fi < flashCells.length; fi++) ring(OX + flashCells[fi].c * CELL + CELL / 2, OY + flashCells[fi].r * CELL + CELL / 2, CELL * 0.4 * (1 - flashCells[fi].life), C.c, flashCells[fi].life);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || swapping) return;
    var c = Math.floor((x - OX) / CELL), r = Math.floor((y - OY) / CELL); if (c < 0 || c >= GN || r < 0 || r >= GN) { selected = null; return; }
    if (!selected) selected = { r: r, c: c };
    else { var dr = Math.abs(r - selected.r), dc = Math.abs(c - selected.c); if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) trySwap(selected.r, selected.c, r, c); selected = null; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || swapping || !selected) return;
    var dr = d === 'up' ? -1 : d === 'down' ? 1 : 0, dc = d === 'left' ? -1 : d === 'right' ? 1 : 0;
    trySwap(selected.r, selected.c, selected.r + dr, selected.c + dc); selected = null;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SWEET!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var fc = flashCells.length - 1; fc >= 0; fc--) { flashCells[fc].life -= dt * 2; if (flashCells[fc].life <= 0) flashCells.splice(fc, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGrid();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(matches + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
