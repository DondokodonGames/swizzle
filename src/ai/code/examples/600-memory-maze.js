// 600-memory-maze.js
// メモリーメイズ — 一瞬だけ表示された迷路を記憶してゴールまで歩く
// 操作: スワイプで上下左右に移動、記憶だけが頼り
// 成功: 8回脱出  失敗: 5回壁に激突 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#020208',
    wallHide: '#030312',
    wallShow: '#4466cc',
    wallHi:   '#8899ee',
    path:     '#0a0a20',
    player:   '#ffcc00',
    playerHi: '#ffee88',
    exit:     '#22c55e',
    exitHi:   '#86efac',
    hit:      '#ef4444',
    text:     '#f1f5f9',
    ui:       '#1a1a3a'
  };

  var GRID = 6;
  var CELL = Math.floor(W * 0.8 / GRID);
  var OX = (W - GRID * CELL) / 2;
  var OY = H * 0.22;

  var maze = [];
  var playerPos = { r: 0, c: 0 };
  var exitPos = { r: GRID - 1, c: GRID - 1 };
  var showMaze = true;
  var showTimer = 0;
  var SHOW_TIME = 2.5;
  var escapes = 0;
  var NEEDED = 8;
  var bumps = 0;
  var MAX_BUMPS = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.exit;
  var hitFlash = 0;
  var successFlash = 0;

  function cellIdx(r, c) { return r * GRID + c; }

  function generateMaze() {
    maze = [];
    for (var i = 0; i < GRID * GRID; i++) maze.push({ right: false, down: false });
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
          else if (dirs[di2][2] === 'down') maze[cellIdx(r, c)].down = true;
          else if (dirs[di2][2] === 'left') maze[cellIdx(r, nc)].right = true;
          else if (dirs[di2][2] === 'up') maze[cellIdx(nr, c)].down = true;
          dfs(nr, nc);
        }
      }
    }
    dfs(0, 0);

    playerPos = { r: 0, c: 0 };
    showMaze = true;
    showTimer = 0;
  }

  function canMove(r, c, dr, dc) {
    if (dr === 0 && dc === 1) return maze[cellIdx(r, c)].right;
    if (dr === 1 && dc === 0) return maze[cellIdx(r, c)].down;
    if (dr === 0 && dc === -1) return c > 0 && maze[cellIdx(r, c - 1)].right;
    if (dr === -1 && dc === 0) return r > 0 && maze[cellIdx(r - 1, c)].down;
    return false;
  }

  game.onSwipe(function(dir) {
    if (done || showMaze) return;
    var dr = 0, dc = 0;
    if (dir === 'up') dr = -1;
    else if (dir === 'down') dr = 1;
    else if (dir === 'left') dc = -1;
    else if (dir === 'right') dc = 1;

    var nr = playerPos.r + dr, nc = playerPos.c + dc;
    if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) return;

    if (canMove(playerPos.r, playerPos.c, dr, dc)) {
      playerPos.r = nr;
      playerPos.c = nc;
      game.audio.play('se_tap', 0.15);

      if (playerPos.r === exitPos.r && playerPos.c === exitPos.c) {
        escapes++;
        successFlash = 0.4;
        flashCol = C.exit;
        flashAnim = 0.4;
        game.audio.play('se_success', 0.8);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          var ex = OX + exitPos.c * CELL + CELL / 2, ey = OY + exitPos.r * CELL + CELL / 2;
          particles.push({ x: ex, y: ey, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.exitHi });
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
      bumps++;
      hitFlash = 0.4;
      game.audio.play('se_failure', 0.25);
      if (bumps >= MAX_BUMPS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    game.audio.play('se_tap', 0.05);
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
    if (hitFlash > 0) hitFlash -= dt * 3;
    if (successFlash > 0) successFlash -= dt * 3;

    if (showMaze) {
      showTimer += dt;
      if (showTimer >= SHOW_TIME) {
        showMaze = false;
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

    // Grid cells
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var gx = OX + c * CELL, gy = OY + r * CELL;
        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.path, 0.8);

        if (showMaze) {
          var cell = maze[cellIdx(r, c)];
          var wallCol = C.wallShow;
          var wallA = 0.9;
          // Right wall
          if (!cell.right && c < GRID - 1) {
            game.draw.rect(gx + CELL - 4, gy, 8, CELL, wallCol, wallA);
          }
          // Bottom wall
          if (!cell.down && r < GRID - 1) {
            game.draw.rect(gx, gy + CELL - 4, CELL, 8, wallCol, wallA);
          }
        } else {
          // Hidden — draw faint walls
          var cell2 = maze[cellIdx(r, c)];
          if (!cell2.right && c < GRID - 1) {
            game.draw.rect(gx + CELL - 4, gy, 8, CELL, C.wallHide, 0.9);
          }
          if (!cell2.down && r < GRID - 1) {
            game.draw.rect(gx, gy + CELL - 4, CELL, 8, C.wallHide, 0.9);
          }
        }
      }
    }

    // Outer border
    game.draw.rect(OX, OY, GRID * CELL, 6, showMaze ? C.wallHi : C.wallHide, 0.9);
    game.draw.rect(OX, OY + GRID * CELL - 6, GRID * CELL, 6, showMaze ? C.wallHi : C.wallHide, 0.9);
    game.draw.rect(OX, OY, 6, GRID * CELL, showMaze ? C.wallHi : C.wallHide, 0.9);
    game.draw.rect(OX + GRID * CELL - 6, OY, 6, GRID * CELL, showMaze ? C.wallHi : C.wallHide, 0.9);

    // Exit
    var exX = OX + exitPos.c * CELL + CELL / 2;
    var exY = OY + exitPos.r * CELL + CELL / 2;
    game.draw.circle(exX, exY, CELL * 0.3, C.exit, 0.15 + Math.sin(elapsed * 3) * 0.05);
    if (showMaze) {
      game.draw.circle(exX, exY, CELL * 0.3, C.exitHi, 0.6);
    }

    // Player
    var px = OX + playerPos.c * CELL + CELL / 2;
    var py = OY + playerPos.r * CELL + CELL / 2;
    var playerCol = hitFlash > 0 ? C.hit : C.player;
    game.draw.circle(px + 4, py + 4, CELL * 0.3, '#000', 0.3);
    game.draw.circle(px, py, CELL * 0.3, playerCol, 0.9);
    game.draw.circle(px - 8, py - 8, CELL * 0.1, C.playerHi, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.hit, hitFlash * 0.08);

    // Show/hide indicator
    if (showMaze) {
      var showRatio = 1 - showTimer / SHOW_TIME;
      game.draw.rect(0, H * 0.12, W * showRatio, 8, C.wallHi, 0.8);
      game.draw.text('記憶せよ!', W / 2, H * 0.12 - 10, { size: 40, color: C.wallHi, bold: true });
    }

    // Bump dots
    for (var bi = 0; bi < MAX_BUMPS; bi++) {
      game.draw.circle(W / 2 - (MAX_BUMPS - 1) * 60 + bi * 120, H * 0.955, 22, bi < bumps ? C.hit : C.ui, 0.9);
    }

    game.draw.text(escapes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.wallShow : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    generateMaze();
  });
})(game);
