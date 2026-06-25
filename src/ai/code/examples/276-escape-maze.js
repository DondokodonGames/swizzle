// 276-escape-maze.js
// エスケープメイズ — 時間差で迫る追手から迷路を逃げ切れ
// 操作: スワイプで移動方向を指定
// 成功: ゴールに到達  失敗: 追手に捕まる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04020a',
    wall:   '#1e1b4b',
    wallHi: '#312e81',
    floor:  '#0a0816',
    player: '#22c55e',
    plrHi:  '#86efac',
    chaser: '#ef4444',
    chasHi: '#fca5a5',
    goal:   '#fde68a',
    goalHi: '#fef3c7',
    trail:  '#7c3aed',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var MAZE_COLS = 9, MAZE_ROWS = 13;
  var CELL_W = Math.floor((W - 80) / MAZE_COLS);
  var CELL_H = Math.floor((H * 0.7) / MAZE_ROWS);
  var OX = 40, OY = H * 0.16;

  var maze = []; // 2D array: 1=wall, 0=floor
  var player = { col: 1, row: 1 };
  var chaser = { col: MAZE_COLS - 2, row: MAZE_ROWS - 2 };
  var goalCell = { col: MAZE_COLS - 2, row: 1 };
  var moveQueue = [];
  var chaserTimer = 0;
  var CHASER_INTERVAL = 0.6;
  var playerTrail = [];
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var captured = false;

  function generateMaze() {
    // Init all walls
    for (var r = 0; r < MAZE_ROWS; r++) {
      maze[r] = [];
      for (var c = 0; c < MAZE_COLS; c++) {
        maze[r][c] = 1;
      }
    }

    // Carve using iterative DFS
    function carve(cr, cc) {
      maze[cr][cc] = 0;
      var dirs = [[0,-2],[0,2],[-2,0],[2,0]];
      // Shuffle
      for (var i = dirs.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = dirs[i]; dirs[i] = dirs[j]; dirs[j] = tmp;
      }
      for (var d = 0; d < dirs.length; d++) {
        var nr = cr + dirs[d][0], nc = cc + dirs[d][1];
        if (nr >= 0 && nr < MAZE_ROWS && nc >= 0 && nc < MAZE_COLS && maze[nr][nc] === 1) {
          maze[cr + dirs[d][0] / 2][cc + dirs[d][1] / 2] = 0;
          carve(nr, nc);
        }
      }
    }
    carve(1, 1);
    maze[1][1] = 0;
    maze[MAZE_ROWS - 2][MAZE_COLS - 2] = 0;
    maze[goalCell.row][goalCell.col] = 0;
  }

  function bfsNext(from, to) {
    var visited = [];
    for (var r = 0; r < MAZE_ROWS; r++) {
      visited[r] = [];
      for (var c = 0; c < MAZE_COLS; c++) visited[r][c] = false;
    }
    var queue = [{ col: from.col, row: from.row, path: [] }];
    visited[from.row][from.col] = true;
    while (queue.length > 0) {
      var cur = queue.shift();
      if (cur.col === to.col && cur.row === to.row) return cur.path[0] || null;
      var dirs2 = [[0,1],[0,-1],[1,0],[-1,0]];
      for (var d = 0; d < dirs2.length; d++) {
        var nc = cur.col + dirs2[d][0], nr = cur.row + dirs2[d][1];
        if (nc >= 0 && nc < MAZE_COLS && nr >= 0 && nr < MAZE_ROWS &&
            maze[nr][nc] === 0 && !visited[nr][nc]) {
          visited[nr][nc] = true;
          queue.push({ col: nc, row: nr, path: cur.path.concat([{ col: nc, row: nr }]) });
        }
      }
    }
    return null;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var dc = 0, dr = 0;
    if (dir === 'left') dc = -1;
    else if (dir === 'right') dc = 1;
    else if (dir === 'up') dr = -1;
    else if (dir === 'down') dr = 1;
    var nc = player.col + dc, nr = player.row + dr;
    if (nc >= 0 && nc < MAZE_COLS && nr >= 0 && nr < MAZE_ROWS && maze[nr][nc] === 0) {
      playerTrail.push({ col: player.col, row: player.row, life: 0.5 });
      player.col = nc;
      player.row = nr;
      game.audio.play('se_tap', 0.2);
      if (player.col === goalCell.col && player.row === goalCell.row && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 200); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    chaserTimer -= dt;
    if (chaserTimer <= 0 && !done) {
      chaserTimer = CHASER_INTERVAL;
      var next = bfsNext(chaser, player);
      if (next) { chaser.col = next.col; chaser.row = next.row; }
      CHASER_INTERVAL = Math.max(0.3, 0.6 - elapsed * 0.01);
    }

    if (chaser.col === player.col && chaser.row === player.row && !done) {
      done = true;
      captured = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 500);
    }

    for (var tt = playerTrail.length - 1; tt >= 0; tt--) {
      playerTrail[tt].life -= dt * 2;
      if (playerTrail[tt].life <= 0) playerTrail.splice(tt, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Maze cells
    for (var r = 0; r < MAZE_ROWS; r++) {
      for (var c = 0; c < MAZE_COLS; c++) {
        var cx2 = OX + c * CELL_W;
        var cy2 = OY + r * CELL_H;
        if (maze[r][c] === 1) {
          game.draw.rect(cx2, cy2, CELL_W, CELL_H, C.wall, 0.9);
          game.draw.rect(cx2, cy2, CELL_W, 5, C.wallHi, 0.4);
        } else {
          game.draw.rect(cx2, cy2, CELL_W, CELL_H, C.floor, 0.9);
        }
      }
    }

    // Goal
    var gx = OX + goalCell.col * CELL_W + CELL_W / 2;
    var gy = OY + goalCell.row * CELL_H + CELL_H / 2;
    game.draw.circle(gx, gy, Math.min(CELL_W, CELL_H) * 0.4 + 4 * Math.sin(elapsed * 4), C.goal, 0.8);
    game.draw.text('G', gx, gy + 10, { size: 28, color: C.goalHi, bold: true });

    // Trail
    for (var tt2 = 0; tt2 < playerTrail.length; tt2++) {
      var tr = playerTrail[tt2];
      var tx3 = OX + tr.col * CELL_W + CELL_W / 2;
      var ty3 = OY + tr.row * CELL_H + CELL_H / 2;
      game.draw.circle(tx3, ty3, Math.min(CELL_W, CELL_H) * 0.3 * tr.life * 2, C.trail, tr.life * 0.6);
    }

    // Player
    var px = OX + player.col * CELL_W + CELL_W / 2;
    var py = OY + player.row * CELL_H + CELL_H / 2;
    game.draw.circle(px, py, Math.min(CELL_W, CELL_H) * 0.42, C.player, 0.9);
    game.draw.circle(px, py, Math.min(CELL_W, CELL_H) * 0.42, C.plrHi, 0.2);

    // Chaser
    var ex = OX + chaser.col * CELL_W + CELL_W / 2;
    var ey = OY + chaser.row * CELL_H + CELL_H / 2;
    game.draw.circle(ex, ey, Math.min(CELL_W, CELL_H) * 0.42, C.chaser, 0.9);
    game.draw.circle(ex, ey, Math.min(CELL_W, CELL_H) * 0.5 + 3 * Math.sin(elapsed * 8), C.chasHi, 0.2);

    game.draw.text('スワイプで移動', W / 2, H * 0.89, { size: 38, color: C.ui });
    if (captured) game.draw.text('つかまった！', W / 2, H * 0.92, { size: 52, color: C.chaser, bold: true });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.chaser);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    generateMaze();
  });
})(game);
