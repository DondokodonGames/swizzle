// 442-memory-path.js
// 記憶の道 — 順に点滅するマスの並びを覚え、消えたあと同じ順にタップして道をたどる
// 操作: 点滅の順番を覚え、入力フェーズで同じ順にマスをタップ
// 成功: 2本の道を たどる  失敗: 3回 ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、記憶回路） ──
  var C = { bg:'#04080a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MEMORY PATH';
  var HOW_TO_PLAY = 'WATCH THE PATH FLASH · THEN TAP THE CELLS IN ORDER';
  var MAX_TIME = 25;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_MISS = 3;
  var GRID = 4, PATH_LEN = 4;   // 修正2: 5x5/7 → 4x4/4
  var CELL = snap(W * 0.20), GAP = 12, OX = snap((W - (GRID * snap(W * 0.20) + (GRID - 1) * 12)) / 2), OY = snap((H - (GRID * snap(W * 0.20) + (GRID - 1) * 12)) / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var path, playerPath, iphase, showIdx, showTimer, cellFlash, solved, misses, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a1e');
  }

  function background() { game.draw.clear(C.bg); }

  function genPath() {
    path = []; playerPath = []; iphase = 'show'; showIdx = 0; showTimer = 0.6; cellFlash = {};
    var used = {}, cx = Math.floor(Math.random() * GRID), cy = Math.floor(Math.random() * GRID); path.push(cy * GRID + cx); used[cy * GRID + cx] = true;
    for (var s = 1; s < PATH_LEN; s++) { var tries = 0, ok = false; while (!ok && tries < 20) { var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]], dir = dirs[Math.floor(Math.random() * dirs.length)], nx = cx + dir[0], ny = cy + dir[1], nidx = ny * GRID + nx; if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID && !used[nidx]) { cx = nx; cy = ny; path.push(nidx); used[nidx] = true; ok = true; } tries++; } if (!ok) break; }
  }

  function initGame() { solved = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; genPath(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (solved * 800 + Math.ceil(timeLeft) * 100) : solved * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) { var idx = r * GRID + c, cx = OX + c * (CELL + GAP), cy = OY + r * (CELL + GAP), inP = playerPath.indexOf(idx) >= 0, fl = cellFlash[idx] || 0; game.draw.rect(cx, cy, CELL, CELL, inP ? C.d : '#0d1a1f', 0.7 + fl * 0.3); if (fl > 0) pc(cx + CELL / 2, cy + CELL / 2, CELL * 0.35, C.e, fl * 0.5); if (inP) txt((playerPath.indexOf(idx) + 1) + '', cx + CELL / 2, cy + CELL / 2 + 20, 64, C.g); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'input') return;
    var c = Math.floor((x - OX) / (CELL + GAP)), r = Math.floor((y - OY) / (CELL + GAP)); if (c < 0 || c >= GRID || r < 0 || r >= GRID) return;
    var idx = r * GRID + c;
    if (idx === path[playerPath.length]) { playerPath.push(idx); cellFlash[idx] = 0.4; game.audio.play('se_tap', 0.4); if (playerPath.length >= path.length) { solved++; flash = 0.8; flashCol = C.b; game.audio.play('se_success', 0.7); for (var p = 0; p < 10; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 100, life: 0.7, col: C.e }); } if (solved >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done && state === S.PLAYING) genPath(); }, 1000); } }
    else { misses++; cellFlash[idx] = 0.5; flash = 0.6; flashCol = C.a; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } playerPath = []; setTimeout(function() { if (!done && state === S.PLAYING) genPath(); }, 800); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!path) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PATHFINDER!' : 'LOST THE WAY', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      if (iphase === 'show') { showTimer -= dt; if (showTimer <= 0) { if (showIdx < path.length) { cellFlash[path[showIdx]] = 0.4; game.audio.play('se_tap', 0.2); showIdx++; showTimer = 0.55; } else { showTimer = 0.4; if (showIdx >= path.length + 1) { iphase = 'input'; cellFlash = {}; } showIdx++; } } }
      var keys = Object.keys(cellFlash); for (var ki = 0; ki < keys.length; ki++) { cellFlash[keys[ki]] -= dt * 4; if (cellFlash[keys[ki]] <= 0) delete cellFlash[keys[ki]]; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    txt(iphase === 'show' ? 'WATCH...' : 'TRACE IT  ' + playerPath.length + ' / ' + path.length, W / 2, snap(H * 0.86), 48, iphase === 'show' ? C.c : C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1a1e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
