// 586-light-paths.js
// ライトパス — 暗い迷路を、通った先だけ数秒だけ光る手がかりを頼りにスワイプで出口へ進む
// 操作: 上下左右スワイプで移動（壁があると進めず迷子カウント）。タップで現在地を再点灯
// 成功: 出口 3回 到達  失敗: 3回 迷子 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、暗黒迷路） ──
  var C = { bg:'#000000', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LIGHT PATHS';
  var HOW_TO_PLAY = 'SWIPE TO MOVE THROUGH THE DARK MAZE · REACH THE GLOWING EXIT';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_LOST = 3;          // 修正2: 5 → 3
  var GRID = 5, CELL = Math.floor(W * 0.84 / 5), LIGHT_LIFE = 3.0;
  var OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.24);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var maze, playerPos, exitPos, lightPath, lightTimers, escapes, lost, timeLeft, done, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a18');
  }

  function background() { game.draw.clear(C.bg); }

  function cellIdx(r, c) { return r * GRID + c; }

  function revealCell(r, c, life) { var key = r + ',' + c; lightTimers[key] = life; if (lightPath.indexOf(key) < 0) lightPath.push(key); }

  function generateMaze() {
    maze = []; for (var i = 0; i < GRID * GRID; i++) maze.push({ right: false, down: false });
    var visited = []; for (var j = 0; j < GRID * GRID; j++) visited.push(false);
    function dfs(r, c) {
      visited[cellIdx(r, c)] = true;
      var dirs = [[0, 1, 'right'], [1, 0, 'down'], [0, -1, 'left'], [-1, 0, 'up']];
      for (var di = dirs.length - 1; di > 0; di--) { var dj = Math.floor(Math.random() * (di + 1)); var t = dirs[di]; dirs[di] = dirs[dj]; dirs[dj] = t; }
      for (var di2 = 0; di2 < dirs.length; di2++) { var nr = r + dirs[di2][0], nc = c + dirs[di2][1]; if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !visited[cellIdx(nr, nc)]) { if (dirs[di2][2] === 'right') maze[cellIdx(r, c)].right = true; if (dirs[di2][2] === 'down') maze[cellIdx(r, c)].down = true; if (dirs[di2][2] === 'left') maze[cellIdx(r, nc)].right = true; if (dirs[di2][2] === 'up') maze[cellIdx(nr, c)].down = true; dfs(nr, nc); } }
    }
    dfs(0, 0);
    playerPos = { r: 0, c: 0 }; exitPos = { r: GRID - 1, c: GRID - 1 }; lightPath = []; lightTimers = {}; revealCell(0, 0, LIGHT_LIFE);
  }

  function canMove(r, c, dr, dc) {
    if (dr === 0 && dc === 1) return maze[cellIdx(r, c)].right;
    if (dr === 1 && dc === 0) return maze[cellIdx(r, c)].down;
    if (dr === 0 && dc === -1) return c > 0 && maze[cellIdx(r, c - 1)].right;
    if (dr === -1 && dc === 0) return r > 0 && maze[cellIdx(r - 1, c)].down;
    return false;
  }

  function tryMove(dr, dc) {
    var nr = playerPos.r + dr, nc = playerPos.c + dc; if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return false;
    if (!canMove(playerPos.r, playerPos.c, dr, dc)) return false;
    playerPos.r = nr; playerPos.c = nc; revealCell(nr, nc, LIGHT_LIFE);
    var nd = [[0, 1], [1, 0], [0, -1], [-1, 0]]; for (var di = 0; di < nd.length; di++) { var ar = nr + nd[di][0], ac = nc + nd[di][1]; if (ar >= 0 && ar < GRID && ac >= 0 && ac < GRID && canMove(nr, nc, nd[di][0], nd[di][1])) revealCell(ar, ac, LIGHT_LIFE * 0.4); }
    return true;
  }

  function initGame() { escapes = 0; lost = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; generateMaze(); }

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
      var key = r + ',' + c, gx = OX + c * CELL, gy = OY + r * CELL;
      if (lightTimers[key] !== undefined) {
        var life = Math.min(1, lightTimers[key] / LIGHT_LIFE);
        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.d, life * 0.5); game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.c, life * 0.12);
        var cell = maze[cellIdx(r, c)];
        if (!cell.right && c < GRID - 1) game.draw.rect(gx + CELL - 3, gy, 6, CELL, '#0a0a1a', life * 0.9);
        if (!cell.down && r < GRID - 1) game.draw.rect(gx, gy + CELL - 3, CELL, 6, '#0a0a1a', life * 0.9);
      } else game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, '#050510', 0.9);
    }
    var exX = OX + exitPos.c * CELL + CELL / 2, exY = OY + exitPos.r * CELL + CELL / 2;
    pc(exX, exY, CELL * 0.32, C.b, 0.1 + Math.sin(game.time.elapsed * 3) * 0.05);
    if (lightTimers[exitPos.r + ',' + exitPos.c]) { pc(exX, exY, CELL * 0.32, C.b, 0.5); txt('EXIT', exX, exY + 12, 28, C.g); }
    var px = OX + playerPos.c * CELL + CELL / 2, py = OY + playerPos.r * CELL + CELL / 2;
    pc(px, py, 28 + Math.sin(game.time.elapsed * 6) * 6, C.f, 0.2); pc(px, py, 26, C.f, 0.9); pc(px - 8, py - 8, 10, C.g, 0.5);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var moved = false;
    if (dir === 'up') moved = tryMove(-1, 0); else if (dir === 'down') moved = tryMove(1, 0); else if (dir === 'left') moved = tryMove(0, -1); else if (dir === 'right') moved = tryMove(0, 1);
    if (moved) {
      game.audio.play('se_tap', 0.2);
      if (playerPos.r === exitPos.r && playerPos.c === exitPos.c) {
        escapes++; flash = 0.4; flashCol = C.b; game.audio.play('se_success', 0.8);
        var ex2 = OX + exitPos.c * CELL + CELL / 2, ey2 = OY + exitPos.r * CELL + CELL / 2;
        for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ex2, y: ey2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); }
        if (escapes >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (!done) generateMaze(); }, 800);
      }
    } else { lost++; flash = 0.25; flashCol = C.a; game.audio.play('se_failure', 0.2); if (lost >= MAX_LOST) { finish(false); return; } }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    revealCell(playerPos.r, playerPos.c, LIGHT_LIFE); game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!maze) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
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
      txt(resultSuccess ? 'ESCAPED!' : 'LOST IN DARK', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
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
      for (var li = lightPath.length - 1; li >= 0; li--) { var key = lightPath[li]; lightTimers[key] -= dt; if (lightTimers[key] <= 0) { delete lightTimers[key]; lightPath.splice(li, 1); } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(escapes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_LOST; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_LOST - 1) / 2) * 56) - 10, 224, 20, 20, wi < lost ? C.a : '#0a0a18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
