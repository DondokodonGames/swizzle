// 600-memory-maze.js
// メモリーメイズ — 数秒だけ壁が見える迷路を記憶し、暗くなった後にスワイプでゴールまで歩く
// 操作: 記憶タイム中に壁を覚える → 暗転後、上下左右スワイプで移動（壁にぶつかるとミス）
// 成功: 迷路 3回 脱出  失敗: 3回 壁に激突 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶回廊） ──
  var C = { bg:'#020208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MEMORY MAZE';
  var HOW_TO_PLAY = 'MEMORIZE THE WALLS · THEN SWIPE TO REACH THE EXIT IN THE DARK';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_BUMPS = 3;         // 修正2: 5 → 3
  var GRID = 6, CELL = Math.floor(W * 0.8 / 6), SHOW_TIME = 2.5;
  var OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var maze, playerPos, exitPos, showMaze, showTimer, escapes, bumps, timeLeft, done, particles, flash, flashCol, hitFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#1a1a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function cellIdx(r, c) { return r * GRID + c; }

  function generateMaze() {
    maze = []; for (var i = 0; i < GRID * GRID; i++) maze.push({ right: false, down: false });
    var visited = []; for (var j = 0; j < GRID * GRID; j++) visited.push(false);
    function dfs(r, c) { visited[cellIdx(r, c)] = true; var dirs = [[0, 1, 'right'], [1, 0, 'down'], [0, -1, 'left'], [-1, 0, 'up']]; for (var di = dirs.length - 1; di > 0; di--) { var dj = Math.floor(Math.random() * (di + 1)); var t = dirs[di]; dirs[di] = dirs[dj]; dirs[dj] = t; } for (var di2 = 0; di2 < dirs.length; di2++) { var nr = r + dirs[di2][0], nc = c + dirs[di2][1]; if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !visited[cellIdx(nr, nc)]) { if (dirs[di2][2] === 'right') maze[cellIdx(r, c)].right = true; else if (dirs[di2][2] === 'down') maze[cellIdx(r, c)].down = true; else if (dirs[di2][2] === 'left') maze[cellIdx(r, nc)].right = true; else if (dirs[di2][2] === 'up') maze[cellIdx(nr, c)].down = true; dfs(nr, nc); } } }
    dfs(0, 0); playerPos = { r: 0, c: 0 }; showMaze = true; showTimer = 0;
  }

  function canMove(r, c, dr, dc) {
    if (dr === 0 && dc === 1) return maze[cellIdx(r, c)].right;
    if (dr === 1 && dc === 0) return maze[cellIdx(r, c)].down;
    if (dr === 0 && dc === -1) return c > 0 && maze[cellIdx(r, c - 1)].right;
    if (dr === -1 && dc === 0) return r > 0 && maze[cellIdx(r - 1, c)].down;
    return false;
  }

  function initGame() { exitPos = { r: GRID - 1, c: GRID - 1 }; escapes = 0; bumps = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; hitFlash = 0; generateMaze(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (escapes * 1000 + Math.ceil(timeLeft) * 100) : escapes * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var gx = OX + c * CELL, gy = OY + r * CELL; game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, '#0a0a20', 0.8);
      var cell = maze[cellIdx(r, c)], wc = showMaze ? C.d : '#050518', wa = showMaze ? 0.9 : 0.9;
      if (!cell.right && c < GRID - 1) game.draw.rect(gx + CELL - 4, gy, 8, CELL, wc, wa);
      if (!cell.down && r < GRID - 1) game.draw.rect(gx, gy + CELL - 4, CELL, 8, wc, wa);
    }
    var bc = showMaze ? C.e : '#050518';
    game.draw.rect(OX, OY, GRID * CELL, 6, bc, 0.9); game.draw.rect(OX, OY + GRID * CELL - 6, GRID * CELL, 6, bc, 0.9); game.draw.rect(OX, OY, 6, GRID * CELL, bc, 0.9); game.draw.rect(OX + GRID * CELL - 6, OY, 6, GRID * CELL, bc, 0.9);
    var exX = OX + exitPos.c * CELL + CELL / 2, exY = OY + exitPos.r * CELL + CELL / 2; pc(exX, exY, CELL * 0.28, C.b, showMaze ? 0.6 : 0.15 + Math.sin(game.time.elapsed * 3) * 0.05);
    var px = OX + playerPos.c * CELL + CELL / 2, py = OY + playerPos.r * CELL + CELL / 2; pc(px, py, CELL * 0.28, hitFlash > 0 ? C.a : C.c, 0.9); pc(px - 8, py - 8, CELL * 0.1, C.g, 0.5);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || showMaze) return;
    var dr = 0, dc = 0; if (dir === 'up') dr = -1; else if (dir === 'down') dr = 1; else if (dir === 'left') dc = -1; else if (dir === 'right') dc = 1;
    var nr = playerPos.r + dr, nc = playerPos.c + dc; if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return;
    if (canMove(playerPos.r, playerPos.c, dr, dc)) {
      playerPos.r = nr; playerPos.c = nc; game.audio.play('se_tap', 0.15);
      if (playerPos.r === exitPos.r && playerPos.c === exitPos.c) {
        escapes++; flash = 0.4; flashCol = C.b; game.audio.play('se_success', 0.8);
        var ex = OX + exitPos.c * CELL + CELL / 2, ey = OY + exitPos.r * CELL + CELL / 2; for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ex, y: ey, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); }
        if (escapes >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (!done) generateMaze(); }, 800);
      }
    } else { bumps++; hitFlash = 0.4; game.audio.play('se_failure', 0.25); if (bumps >= MAX_BUMPS) { finish(false); return; } }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!maze) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL ESCAPED!' : 'WALL SMASH', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (hitFlash > 0) hitFlash -= dt * 3;
      if (showMaze) { showTimer += dt; if (showTimer >= SHOW_TIME) showMaze = false; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.a, hitFlash * 0.08);
    if (showMaze) { game.draw.rect(OX, snap(OY - 40), (GRID * CELL) * (1 - showTimer / SHOW_TIME), 8, C.e, 0.8); txt('MEMORIZE!', W / 2, snap(OY - 56), 40, C.e); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(escapes + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var bi = 0; bi < MAX_BUMPS; bi++) game.draw.rect(snap(W / 2 + (bi - (MAX_BUMPS - 1) / 2) * 56) - 10, 220, 20, 20, bi < bumps ? C.a : '#1a1a3a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
