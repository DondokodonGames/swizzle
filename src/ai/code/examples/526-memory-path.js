// 526-memory-path.js
// メモリパス — 順番に光る道すじを記憶し、消えた後に同じ順序でセルをタップして再現する
// 操作: 光った経路を覚え、RECALLで先頭から順にセルをタップ（順番違いはミス）
// 成功: 3ラウンド クリア  失敗: 3ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、記憶回廊） ──
  var C = { bg:'#030d14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MEMORY PATH';
  var HOW_TO_PLAY = 'WATCH THE GLOWING PATH · THEN TAP THE CELLS IN ORDER';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_MISS = 3;          // 修正2: 4 → 3
  var GRID = 4, CELL = 220, SHOW_EACH = 0.5;
  var OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.28);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var path, pathLen, iphase, showIdx, showTimer, playerPath, rounds, misses, timeLeft, done, particles, flash, flashCol, delayTimer, tapped;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#050f18');
  }

  function background() { game.draw.clear(C.bg); }

  function genPath() {
    path = []; var used = {}, x = Math.floor(Math.random() * GRID), y = Math.floor(Math.random() * GRID); path.push({ x: x, y: y }); used[x + ',' + y] = true;
    for (var i = 1; i < pathLen; i++) { var dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }].filter(function(d) { var nx = x + d.dx, ny = y + d.dy; return nx >= 0 && nx < GRID && ny >= 0 && ny < GRID && !used[nx + ',' + ny]; }); if (dirs.length === 0) break; var d = dirs[Math.floor(Math.random() * dirs.length)]; x += d.dx; y += d.dy; path.push({ x: x, y: y }); used[x + ',' + y] = true; }
    showIdx = 0; showTimer = SHOW_EACH; iphase = 'show'; playerPath = []; tapped = {};
  }

  function initGame() { pathLen = 3; rounds = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; delayTimer = 0; genPath(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rounds * 800 + Math.ceil(timeLeft) * 100) : rounds * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var cx = OX + c * CELL + 8, cy = OY + r * CELL + 8, key = c + ',' + r, pathIdx = -1;
      for (var pi = 0; pi < path.length; pi++) if (path[pi].x === c && path[pi].y === r) { pathIdx = pi; break; }
      var showCell = iphase === 'show' && showIdx < path.length && path[showIdx].x === c && path[showIdx].y === r;
      var onPath = iphase === 'show' && pathIdx >= 0 && pathIdx <= showIdx;
      game.draw.rect(cx, cy, CELL - 16, CELL - 16, onPath || tapped[key] ? '#0c4a6e' : '#071824', 0.9);
      if (showCell) { game.draw.rect(cx, cy, CELL - 16, CELL - 16, C.c, 0.9); txt((pathIdx + 1) + '', cx + (CELL - 16) / 2, cy + (CELL - 16) / 2 + 16, 40, C.bg); }
      else if (onPath) txt((pathIdx + 1) + '', cx + (CELL - 16) / 2, cy + (CELL - 16) / 2 + 16, 40, C.g);
      else if (tapped[key] && pathIdx >= 0) game.draw.rect(cx, cy, CELL - 16, CELL - 16, C.b, 0.4);
      if (iphase === 'recall' && playerPath.length < path.length) { var ne = path[playerPath.length]; if (ne && ne.x === c && ne.y === r && Math.floor(game.time.elapsed * 5) % 2 === 0) game.draw.rect(cx + (CELL - 16) / 2 - 12, cy + (CELL - 16) / 2 - 12, 24, 24, C.e, 0.7); }
    }
    if (iphase === 'show' && showIdx > 0) for (var li = 0; li < showIdx && li < path.length - 1; li++) { var p1 = path[li], p2 = path[li + 1]; pline(OX + p1.x * CELL + CELL / 2, OY + p1.y * CELL + CELL / 2, OX + p2.x * CELL + CELL / 2, OY + p2.y * CELL + CELL / 2, C.c, 0.8, 8); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'recall') return;
    var col = Math.floor((tx - OX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var key = col + ',' + row; if (tapped[key]) return; tapped[key] = true; playerPath.push({ x: col, y: row }); game.audio.play('se_tap', 0.3);
    var exp = path[playerPath.length - 1];
    if (!exp || exp.x !== col || exp.y !== row) { misses++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } iphase = 'wait'; delayTimer = 0.8; return; }
    for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: OX + col * CELL + CELL / 2, y: OY + row * CELL + CELL / 2, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.4, col: C.c }); }
    if (playerPath.length >= path.length) { rounds++; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.8); if (rounds >= NEEDED) { finish(true); return; } if (pathLen < 7) pathLen++; iphase = 'wait'; delayTimer = 0.8; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!path) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PATH MASTER!' : 'LOST THE TRAIL', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      if (delayTimer > 0) { delayTimer -= dt; if (delayTimer <= 0) genPath(); }
      if (iphase === 'show') { showTimer -= dt; if (showTimer <= 0) { showIdx++; if (showIdx >= path.length) iphase = 'recall'; else { showTimer = SHOW_EACH; game.audio.play('se_tap', 0.2); } } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGrid();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    txt(iphase === 'show' ? 'MEMORIZE  ' + (showIdx + 1) + '/' + path.length : iphase === 'recall' ? 'RECALL  ' + (path.length - playerPath.length) + ' LEFT' : '', W / 2, snap(OY + GRID * CELL + 60), 44, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rounds + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#050f18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
