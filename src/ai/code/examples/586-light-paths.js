// 586-light-paths.js
// ライトパス — 暗闇の中で光の道を辿って出口に辿り着く
// 操作: スワイプで光の方向を進む、光が消える前に出口へ
// 成功: 10回脱出  失敗: 5回迷子 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000000',
    wall:    '#0a0a1a',
    path:    '#1a1a3a',
    light:   '#ffee88',
    lightHi: '#ffffff',
    player:  '#ffaa00',
    playerHi:'#ffdd88',
    exit:    '#22c55e',
    exitHi:  '#86efac',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#334455'
  };

  var GRID = 7;
  var CELL = Math.floor(W * 0.85 / GRID);
  var OX = (W - GRID * CELL) / 2;
  var OY = H * 0.2;

  var playerPos = { r: 0, c: 0 };
  var exitPos = { r: GRID - 1, c: GRID - 1 };
  var lightPath = []; // revealed path cells
  var lightLife = 3.0; // seconds light stays on
  var lightTimers = {};
  var maze = []; // adjacency: can we go right/down?
  var escapes = 0;
  var NEEDED = 10;
  var lost = 0;
  var MAX_LOST = 5;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.exit;
  var lightFlashTimer = 0;

  function cellIdx(r, c) { return r * GRID + c; }

  function generateMaze() {
    maze = [];
    for (var i = 0; i < GRID * GRID; i++) {
      maze.push({ right: false, down: false });
    }
    // DFS maze generation
    var visited = [];
    for (var j = 0; j < GRID * GRID; j++) visited.push(false);

    function dfs(r, c) {
      visited[cellIdx(r, c)] = true;
      var dirs = [[0,1,'right'],[1,0,'down'],[0,-1,'left'],[-1,0,'up']];
      for (var di = dirs.length - 1; di > 0; di--) {
        var dj = Math.floor(Math.random() * (di + 1));
        var tmp = dirs[di]; dirs[di] = dirs[dj]; dirs[dj] = tmp;
      }
      for (var di2 = 0; di2 < dirs.length; di2++) {
        var nr = r + dirs[di2][0], nc = c + dirs[di2][1];
        if (nr >= 0 && nr < GRID && nc >= 0 && nc < GRID && !visited[cellIdx(nr, nc)]) {
          if (dirs[di2][2] === 'right') maze[cellIdx(r, c)].right = true;
          if (dirs[di2][2] === 'down') maze[cellIdx(r, c)].down = true;
          if (dirs[di2][2] === 'left') maze[cellIdx(r, nc)].right = true;
          if (dirs[di2][2] === 'up') maze[cellIdx(nr, c)].down = true;
          dfs(nr, nc);
        }
      }
    }
    dfs(0, 0);

    playerPos = { r: 0, c: 0 };
    exitPos = { r: GRID - 1, c: GRID - 1 };
    lightPath = [];
    lightTimers = {};

    // Reveal initial position
    revealCell(0, 0, lightLife);
  }

  function revealCell(r, c, life) {
    var key = r + ',' + c;
    lightTimers[key] = life;
    if (lightPath.indexOf(key) < 0) lightPath.push(key);
  }

  function canMove(r, c, dr, dc) {
    if (dr === 0 && dc === 1) return maze[cellIdx(r, c)].right;
    if (dr === 1 && dc === 0) return maze[cellIdx(r, c)].down;
    if (dr === 0 && dc === -1) return c > 0 && maze[cellIdx(r, c - 1)].right;
    if (dr === -1 && dc === 0) return r > 0 && maze[cellIdx(r - 1, c)].down;
    return false;
  }

  function tryMove(dr, dc) {
    var nr = playerPos.r + dr, nc = playerPos.c + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return false;
    if (!canMove(playerPos.r, playerPos.c, dr, dc)) return false;
    playerPos.r = nr;
    playerPos.c = nc;
    revealCell(nr, nc, lightLife);
    // Also reveal adjacent connected cells briefly
    var nDirs = [[0,1],[1,0],[0,-1],[-1,0]];
    for (var di = 0; di < nDirs.length; di++) {
      var ar = nr + nDirs[di][0], ac = nc + nDirs[di][1];
      if (ar >= 0 && ar < GRID && ac >= 0 && ac < GRID && canMove(nr, nc, nDirs[di][0], nDirs[di][1])) {
        revealCell(ar, ac, lightLife * 0.4);
      }
    }
    return true;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var moved = false;
    if (dir === 'up') moved = tryMove(-1, 0);
    else if (dir === 'down') moved = tryMove(1, 0);
    else if (dir === 'left') moved = tryMove(0, -1);
    else if (dir === 'right') moved = tryMove(0, 1);

    if (moved) {
      game.audio.play('se_tap', 0.2);
      // Check exit
      if (playerPos.r === exitPos.r && playerPos.c === exitPos.c) {
        escapes++;
        flashCol = C.exit;
        flashAnim = 0.4;
        game.audio.play('se_success', 0.8);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          var ex2 = OX + exitPos.c * CELL + CELL / 2;
          var ey2 = OY + exitPos.r * CELL + CELL / 2;
          particles.push({ x: ex2, y: ey2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.exitHi });
        }
        if (escapes >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(escapes * 500 + Math.ceil(timeLeft) * 80); }, 800);
        } else {
          setTimeout(function() { if (!done) generateMaze(); }, 900);
        }
      }
    } else {
      // Hit wall
      lost++;
      flashCol = C.wrong;
      flashAnim = 0.25;
      game.audio.play('se_failure', 0.2);
      if (lost >= MAX_LOST && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap reveals current cell light
    var key = playerPos.r + ',' + playerPos.c;
    lightTimers[key] = lightLife;
    lightFlashTimer = 0.2;
    game.audio.play('se_tap', 0.1);
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
    if (lightFlashTimer > 0) lightFlashTimer -= dt * 5;

    // Update light timers
    for (var li = lightPath.length - 1; li >= 0; li--) {
      var key = lightPath[li];
      lightTimers[key] -= dt;
      if (lightTimers[key] <= 0) {
        delete lightTimers[key];
        lightPath.splice(li, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid cells (only revealed ones)
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var key2 = r + ',' + c;
        var gx = OX + c * CELL;
        var gy = OY + r * CELL;

        if (lightTimers[key2] !== undefined) {
          var life = lightTimers[key2] / lightLife;
          life = Math.min(1, life);
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.path, life * 0.8);
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.light, life * 0.15);

          // Walls (no passage = wall)
          var cell = maze[cellIdx(r, c)];
          // Right wall
          if (!cell.right && c < GRID - 1) {
            game.draw.line(gx + CELL, gy, gx + CELL, gy + CELL, C.wall, 6);
          }
          // Bottom wall
          if (!cell.down && r < GRID - 1) {
            game.draw.line(gx, gy + CELL, gx + CELL, gy + CELL, C.wall, 6);
          }
        } else {
          // Dark cell — barely visible
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, '#050510', 0.9);
        }
      }
    }

    // Exit marker (always faintly visible)
    var exX = OX + exitPos.c * CELL + CELL / 2;
    var exY = OY + exitPos.r * CELL + CELL / 2;
    game.draw.circle(exX, exY, CELL * 0.35, C.exit, 0.1 + Math.sin(elapsed * 3) * 0.05);
    var exKey = exitPos.r + ',' + exitPos.c;
    if (lightTimers[exKey]) {
      game.draw.circle(exX, exY, CELL * 0.35, C.exitHi, 0.5);
      game.draw.text('出口', exX, exY + 12, { size: 28, color: C.exitHi, bold: true });
    }

    // Player
    var px = OX + playerPos.c * CELL + CELL / 2;
    var py = OY + playerPos.r * CELL + CELL / 2;
    var glow = 20 + Math.sin(elapsed * 6) * 6;
    game.draw.circle(px, py, glow + 20, C.player, 0.15);
    game.draw.circle(px, py, 28, C.player, 0.9);
    game.draw.circle(px - 8, py - 8, 10, C.playerHi, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Lose dots
    for (var wi = 0; wi < MAX_LOST; wi++) {
      game.draw.circle(W / 2 - (MAX_LOST - 1) * 50 + wi * 100, H * 0.955, 20, wi < lost ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(escapes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.light : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    generateMaze();
  });
})(game);
