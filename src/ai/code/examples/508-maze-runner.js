// 508-maze-runner.js
// 迷路ランナー — 自動生成された迷路をスワイプで進み、光るゴールへ最短で脱出する
// 操作: 上下左右スワイプ（または隣マスタップ）で移動（壁は通れない）
// 成功: 2つ の迷路を脱出  失敗: 30秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、電子迷宮） ──
  var C = { bg:'#020208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAZE RUNNER';
  var HOW_TO_PLAY = 'SWIPE TO MOVE THROUGH THE MAZE · REACH THE GOLD GOAL';
  var MAX_TIME = 30;
  var NEEDED   = 2;          // 修正2: 5 → 2
  var GRID = 7, CELL = 132;
  var OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.20);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var maze, pr, pc, goalR, goalC, visited, levels, timeLeft, done, particles, moveAnim, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc2(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color, alpha) { pc2(cx, cy, r, color, alpha); game.draw.rect(snap(cx) - 3, snap(cy - r - 8), 6, 16, color, alpha); game.draw.rect(snap(cx) - 3, snap(cy + r - 8), 6, 16, color, alpha); game.draw.rect(snap(cx - r - 8), snap(cy) - 3, 16, 6, color, alpha); game.draw.rect(snap(cx + r - 8), snap(cy) - 3, 16, 6, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0d0d1e');
  }

  function background() { game.draw.clear(C.bg); }

  function initMaze() {
    maze = []; visited = [];
    for (var r = 0; r < GRID; r++) { maze.push([]); visited.push([]); for (var c = 0; c < GRID; c++) { maze[r].push({ n: true, e: true, s: true, w: true }); visited[r].push(false); } }
    var stack = [{ r: 0, c: 0 }], seen = [];
    for (var r2 = 0; r2 < GRID; r2++) { seen.push([]); for (var c2 = 0; c2 < GRID; c2++) seen[r2].push(false); }
    seen[0][0] = true;
    while (stack.length > 0) {
      var cur = stack[stack.length - 1], nb = [], dirs = [{ dr: -1, dc: 0, wall: 'n', opp: 's' }, { dr: 0, dc: 1, wall: 'e', opp: 'w' }, { dr: 1, dc: 0, wall: 's', opp: 'n' }, { dr: 0, dc: -1, wall: 'w', opp: 'e' }];
      for (var di = 0; di < dirs.length; di++) { var nr = cur.r + dirs[di].dr, nc = cur.c + dirs[di].dc; if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !seen[nr][nc]) nb.push({ r: nr, c: nc, dir: dirs[di] }); }
      if (nb.length > 0) { var next = nb[Math.floor(Math.random() * nb.length)]; seen[next.r][next.c] = true; maze[cur.r][cur.c][next.dir.wall] = false; maze[next.r][next.c][next.dir.opp] = false; stack.push({ r: next.r, c: next.c }); }
      else stack.pop();
    }
    pr = 0; pc = 0; goalR = GRID - 1; goalC = GRID - 1; visited[0][0] = true;
  }

  function initGame() { levels = 0; timeLeft = MAX_TIME; done = false; particles = []; moveAnim = { active: false, fromR: 0, fromC: 0, progress: 1 }; flash = 0; initMaze(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (levels * 1000 + Math.ceil(timeLeft) * 100) : levels * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function tryMove(dr, dc) {
    if (done || (moveAnim.active && moveAnim.progress < 1)) return;
    var wk = dr === -1 ? 'n' : dr === 1 ? 's' : dc === 1 ? 'e' : 'w'; if (maze[pr][pc][wk]) return;
    moveAnim = { active: true, fromR: pr, fromC: pc, progress: 0 }; pr += dr; pc += dc; visited[pr][pc] = true; game.audio.play('se_tap', 0.15);
    if (pr === goalR && pc === goalC) {
      levels++; flash = 0.5; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: OX + pc * CELL + CELL / 2, y: OY + pr * CELL + CELL / 2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.c }); }
      if (levels >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) initMaze(); }, 700);
    }
  }

  function drawMaze() {
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var cx = OX + c * CELL, cy = OY + r * CELL, cell = maze[r][c];
      game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, visited[r][c] ? '#0c1a30' : '#0d0d1e', 0.9);
      var WW = 6;
      if (cell.n) game.draw.rect(cx, cy, CELL, WW, C.d, 0.9); if (cell.s) game.draw.rect(cx, cy + CELL - WW, CELL, WW, C.d, 0.9);
      if (cell.w) game.draw.rect(cx, cy, WW, CELL, C.d, 0.9); if (cell.e) game.draw.rect(cx + CELL - WW, cy, WW, CELL, C.d, 0.9);
    }
    star(OX + goalC * CELL + CELL / 2, OY + goalR * CELL + CELL / 2, 22, C.c, 0.9);
    var px, py;
    if (moveAnim.active && moveAnim.progress < 1) { var t = moveAnim.progress; px = OX + (moveAnim.fromC + (pc - moveAnim.fromC) * t) * CELL + CELL / 2; py = OY + (moveAnim.fromR + (pr - moveAnim.fromR) * t) * CELL + CELL / 2; }
    else { px = OX + pc * CELL + CELL / 2; py = OY + pr * CELL + CELL / 2; }
    pc2(px, py, 28, C.e, 0.9); pc2(px - 8, py - 8, 8, C.g, 0.4);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var tc = Math.floor((tx - OX) / CELL), tr = Math.floor((ty - OY) / CELL);
    if (tr === pr - 1 && tc === pc) tryMove(-1, 0); else if (tr === pr + 1 && tc === pc) tryMove(1, 0); else if (tr === pr && tc === pc - 1) tryMove(0, -1); else if (tr === pr && tc === pc + 1) tryMove(0, 1);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') tryMove(-1, 0); else if (dir === 'down') tryMove(1, 0); else if (dir === 'left') tryMove(0, -1); else tryMove(0, 1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!maze) initGame(); background(); drawMaze();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'LOST IN THE MAZE', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
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
      if (moveAnim.active) { moveAnim.progress += dt * 10; if (moveAnim.progress >= 1) { moveAnim.progress = 1; moveAnim.active = false; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawMaze();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.c, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(levels + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
