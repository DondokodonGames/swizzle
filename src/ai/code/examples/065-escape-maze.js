// 065-escape-maze.js
// エスケープメイズ — シンプルな迷路を最短ルートで脱出する
// 操作: スワイプで移動
// 成功: ゴールに到達  失敗: 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04080c',
    wall:   '#1e3a5f',
    wallHi: '#2563eb',
    floor:  '#050d18',
    player: '#f97316',
    playerHi:'#fed7aa',
    goal:   '#22c55e',
    goalHi: '#86efac',
    trail:  '#7c3aed',
    ui:     '#475569'
  };

  var COLS = 9;
  var ROWS = 12;
  var CELL = 96;
  var MAZE_X = (W - COLS * CELL) / 2;
  var MAZE_Y = H * 0.18;

  var maze = []; // 2D: 0=open, 1=wall
  var playerCol = 0;
  var playerRow = 0;
  var goalCol = COLS - 1;
  var goalRow = ROWS - 1;
  var trailCells = [];
  var timeLeft = 25;
  var done = false;
  var moveFlash = 0;
  var bumpFlash = 0;

  function buildMaze() {
    // Initialize all walls
    maze = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) row.push(1);
      maze.push(row);
    }

    // Recursive backtracking maze generation
    var visited = [];
    for (var r2 = 0; r2 < ROWS; r2++) {
      var vr = [];
      for (var c2 = 0; c2 < COLS; c2++) vr.push(false);
      visited.push(vr);
    }

    function carve(r, c) {
      visited[r][c] = true;
      maze[r][c] = 0;
      var dirs = [[0,2],[0,-2],[2,0],[-2,0]];
      // Shuffle dirs
      for (var s = dirs.length - 1; s > 0; s--) {
        var ri = Math.floor(Math.random() * (s + 1));
        var tmp = dirs[s]; dirs[s] = dirs[ri]; dirs[ri] = tmp;
      }
      for (var d = 0; d < dirs.length; d++) {
        var nr = r + dirs[d][0];
        var nc = c + dirs[d][1];
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr][nc]) {
          // Carve wall between
          maze[r + dirs[d][0] / 2][c + dirs[d][1] / 2] = 0;
          carve(nr, nc);
        }
      }
    }

    // Start from top-left (even coords only for recursive backtracking)
    carve(0, 0);
    maze[0][0] = 0;
    maze[ROWS - 1][COLS - 1] = 0;
  }

  function tryMove(dr, dc) {
    var nr = playerRow + dr;
    var nc = playerCol + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) { bumpFlash = 0.1; return; }
    if (maze[nr][nc] === 1) { bumpFlash = 0.1; game.audio.play('se_failure', 0.2); return; }

    trailCells.push({ r: playerRow, c: playerCol });
    if (trailCells.length > 24) trailCells.shift();
    playerRow = nr;
    playerCol = nc;
    moveFlash = 0.1;
    game.audio.play('se_tap', 0.3);

    if (playerRow === goalRow && playerCol === goalCol) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(300 + Math.ceil(timeLeft) * 10); }, 400);
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up') tryMove(-1, 0);
    else if (dir === 'down') tryMove(1, 0);
    else if (dir === 'left') tryMove(0, -1);
    else if (dir === 'right') tryMove(0, 1);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (moveFlash > 0) moveFlash -= dt;
    if (bumpFlash > 0) bumpFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw maze
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = MAZE_X + c * CELL;
        var gy = MAZE_Y + r * CELL;
        if (maze[r][c] === 1) {
          game.draw.rect(gx, gy, CELL, CELL, C.wall);
          game.draw.rect(gx + 4, gy + 4, CELL - 8, 8, C.wallHi, 0.3);
        } else {
          game.draw.rect(gx, gy, CELL, CELL, C.floor);
        }
      }
    }

    // Trail
    for (var t = 0; t < trailCells.length; t++) {
      var tc = trailCells[t];
      var ta = (t / trailCells.length) * 0.5;
      var tx = MAZE_X + tc.c * CELL + CELL / 2;
      var ty = MAZE_Y + tc.r * CELL + CELL / 2;
      game.draw.circle(tx, ty, 16, C.trail, ta);
    }

    // Goal
    var gx2 = MAZE_X + goalCol * CELL;
    var gy2 = MAZE_Y + goalRow * CELL;
    var pulse = 0.4 + 0.3 * Math.sin(game.time.elapsed * 5);
    game.draw.rect(gx2, gy2, CELL, CELL, C.goal, pulse);
    game.draw.rect(gx2 + 16, gy2 + 16, CELL - 32, CELL - 32, C.goalHi, 0.5);
    game.draw.text('G', gx2 + CELL / 2, gy2 + CELL / 2, { size: 48, color: '#fff', bold: true });

    // Player
    var px = MAZE_X + playerCol * CELL + CELL / 2;
    var py = MAZE_Y + playerRow * CELL + CELL / 2;
    if (moveFlash > 0) {
      game.draw.circle(px, py, 48, '#fff', moveFlash / 0.1 * 0.5);
    }
    if (bumpFlash > 0) {
      game.draw.circle(px, py, 48, '#ef4444', bumpFlash / 0.1 * 0.4);
    }
    game.draw.circle(px, py, 36, C.player);
    game.draw.circle(px - 10, py - 10, 12, C.playerHi, 0.6);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#04080c');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('スワイプで移動→GOALへ！', W / 2, H - 200, { size: 48, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    buildMaze();
  });
})(game);
