// 508-maze-runner.js
// 迷路ランナー — 迷路をスワイプで素早く脱出せよ
// 操作: スワイプ4方向で移動（壁は通れない）
// 成功: 5つの迷路を脱出  失敗: 120秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020208',
    wall:    '#1e1b4b',
    wallHi:  '#4338ca',
    path:    '#0d0d1e',
    player:  '#22d3ee',
    playerHi:'#a5f3fc',
    goal:    '#f59e0b',
    goalHi:  '#fef08a',
    visited: '#0c1a30',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var GRID = 9;
  var CELL = 100;
  var OX = (W - GRID * CELL) / 2;
  var OY = H * 0.2;

  // Maze as array of cells, each cell has walls: N,E,S,W
  var maze = [];
  var pr = 0, pc = 0;
  var goalR = GRID - 1, goalC = GRID - 1;
  var visited = [];
  var steps = 0;
  var levels = 0;
  var NEEDED = 5;
  var done = false;
  var timeLeft = 120;
  var elapsed = 0;
  var particles = [];
  var moveAnim = { active: false, fromR: 0, fromC: 0, progress: 1 };
  var flashAnim = 0;

  function initMaze() {
    // Initialize all cells with all walls
    maze = [];
    visited = [];
    for (var r = 0; r < GRID; r++) {
      maze.push([]);
      visited.push([]);
      for (var c = 0; c < GRID; c++) {
        maze[r].push({ n: true, e: true, s: true, w: true });
        visited[r].push(false);
      }
    }
    // Generate maze using recursive backtracking
    var stack = [{ r: 0, c: 0 }];
    var seen = [];
    for (var r2 = 0; r2 < GRID; r2++) {
      seen.push([]);
      for (var c2 = 0; c2 < GRID; c2++) seen[r2].push(false);
    }
    seen[0][0] = true;
    while (stack.length > 0) {
      var cur = stack[stack.length - 1];
      var neighbors = [];
      var dirs = [{ dr: -1, dc: 0, wall: 'n', opp: 's' }, { dr: 0, dc: 1, wall: 'e', opp: 'w' }, { dr: 1, dc: 0, wall: 's', opp: 'n' }, { dr: 0, dc: -1, wall: 'w', opp: 'e' }];
      for (var di = 0; di < dirs.length; di++) {
        var nr = cur.r + dirs[di].dr, nc = cur.c + dirs[di].dc;
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !seen[nr][nc]) {
          neighbors.push({ r: nr, c: nc, dir: dirs[di] });
        }
      }
      if (neighbors.length > 0) {
        var next = neighbors[Math.floor(Math.random() * neighbors.length)];
        seen[next.r][next.c] = true;
        maze[cur.r][cur.c][next.dir.wall] = false;
        maze[next.r][next.c][next.dir.opp] = false;
        stack.push({ r: next.r, c: next.c });
      } else {
        stack.pop();
      }
    }
    pr = 0; pc = 0;
    goalR = GRID - 1; goalC = GRID - 1;
    visited[0][0] = true;
    steps = 0;
  }

  function tryMove(dr, dc) {
    if (moveAnim.active && moveAnim.progress < 1) return;
    var wallKey = dr === -1 ? 'n' : dr === 1 ? 's' : dc === 1 ? 'e' : 'w';
    if (maze[pr][pc][wallKey]) return; // wall
    var nr = pr + dr, nc = pc + dc;
    moveAnim = { active: true, fromR: pr, fromC: pc, progress: 0 };
    pr = nr; pc = nc;
    visited[pr][pc] = true;
    steps++;
    game.audio.play('se_tap', 0.15);
    if (pr === goalR && pc === goalC) {
      levels++;
      flashAnim = 0.5;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 14; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: OX + pc * CELL + CELL / 2, y: OY + pr * CELL + CELL / 2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.6, col: C.goalHi });
      }
      if (levels >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(levels * 1000 + Math.ceil(timeLeft) * 50); }, 700);
      } else {
        setTimeout(function() { if (!done) initMaze(); }, 700);
      }
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up')    tryMove(-1, 0);
    if (dir === 'down')  tryMove(1, 0);
    if (dir === 'left')  tryMove(0, -1);
    if (dir === 'right') tryMove(0, 1);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    var tc = Math.floor((tx - OX) / CELL);
    var tr = Math.floor((ty - OY) / CELL);
    if (tr === pr - 1 && tc === pc) tryMove(-1, 0);
    else if (tr === pr + 1 && tc === pc) tryMove(1, 0);
    else if (tr === pr && tc === pc - 1) tryMove(0, -1);
    else if (tr === pr && tc === pc + 1) tryMove(0, 1);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (moveAnim.active) {
      moveAnim.progress += dt * 10;
      if (moveAnim.progress >= 1) { moveAnim.progress = 1; moveAnim.active = false; }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Maze cells
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cx = OX + c * CELL;
        var cy = OY + r * CELL;
        var isVisited = visited[r][c];
        game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, isVisited ? C.visited : C.path, 0.9);
        // Walls
        var cell = maze[r][c];
        var WW = 6;
        if (cell.n) game.draw.rect(cx, cy, CELL, WW, C.wall, 0.9);
        if (cell.s) game.draw.rect(cx, cy + CELL - WW, CELL, WW, C.wall, 0.9);
        if (cell.w) game.draw.rect(cx, cy, WW, CELL, C.wall, 0.9);
        if (cell.e) game.draw.rect(cx + CELL - WW, cy, WW, CELL, C.wall, 0.9);
      }
    }

    // Goal
    var gx = OX + goalC * CELL + CELL / 2;
    var gy = OY + goalR * CELL + CELL / 2;
    game.draw.circle(gx, gy, 36, C.goal, 0.3 + Math.sin(elapsed * 4) * 0.1);
    game.draw.circle(gx, gy, 26, C.goal, 0.9);
    game.draw.text('★', gx, gy + 12, { size: 32, color: '#fff' });

    // Player (animated)
    var px, py;
    if (moveAnim.active && moveAnim.progress < 1) {
      var t = moveAnim.progress;
      px = OX + (moveAnim.fromC + (pc - moveAnim.fromC) * t) * CELL + CELL / 2;
      py = OY + (moveAnim.fromR + (pr - moveAnim.fromR) * t) * CELL + CELL / 2;
    } else {
      px = OX + pc * CELL + CELL / 2;
      py = OY + pr * CELL + CELL / 2;
    }
    game.draw.circle(px, py, 34, C.playerHi, 0.25);
    game.draw.circle(px, py, 26, C.player, 0.9);
    game.draw.circle(px - 8, py - 8, 8, '#fff', 0.4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.goal, flashAnim * 0.15);

    // Level dots
    for (var li = 0; li < NEEDED; li++) {
      game.draw.circle(W / 2 - (NEEDED - 1) * 60 + li * 120, H * 0.955, 22, li < levels ? C.goal : C.ui, 0.9);
    }

    game.draw.text(levels + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 120);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initMaze();
  });
})(game);
