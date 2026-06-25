// 074-arrow-maze.js
// アローメイズ — 矢印が指す方向に従って進む自動移動パズル、うまくゴールへ誘導する
// 操作: タップで矢印の向きを変更してルートを作る
// 成功: プレイヤーをゴールへ誘導  失敗: 落下 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080c',
    grid:    '#0a1420',
    arrow:   '#3b82f6',
    arrowHi: '#93c5fd',
    player:  '#f97316',
    playerHi:'#fed7aa',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    wall:    '#1e3a5f',
    ui:      '#475569'
  };

  var COLS = 7;
  var ROWS = 9;
  var CELL = 120;
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = H * 0.14;

  var DIRS = ['up', 'right', 'down', 'left'];
  var DIR_ARROWS = { up: '↑', right: '→', down: '↓', left: '←' };
  var DIR_VEC = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };

  var grid = []; // each cell: {type:'arrow'|'wall'|'empty', dir}
  var playerC = 0, playerR = 0; // player grid position
  var goalC = COLS - 1, goalR = ROWS - 1;

  var moveTimer = 0;
  var MOVE_INTERVAL = 0.35;
  var playerX = 0, playerY = 0; // pixel position (animated)
  var targetX = 0, targetY = 0;

  var done = false;
  var timeLeft = 30;
  var stepCount = 0;

  function cellCenter(c, r) {
    return {
      x: GRID_X + c * CELL + CELL / 2,
      y: GRID_Y + r * CELL + CELL / 2
    };
  }

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        // Random arrow or wall
        if (c === 0 && r === 0) {
          row.push({ type: 'arrow', dir: 'right' }); // start
        } else if (c === goalC && r === goalR) {
          row.push({ type: 'goal' });
        } else if (Math.random() < 0.12) {
          row.push({ type: 'wall' });
        } else {
          row.push({ type: 'arrow', dir: DIRS[Math.floor(Math.random() * 4)] });
        }
      }
      grid.push(row);
    }
    playerC = 0;
    playerR = 0;
    var pos = cellCenter(0, 0);
    playerX = pos.x; playerY = pos.y;
    targetX = pos.x; targetY = pos.y;
    moveTimer = MOVE_INTERVAL;
  }

  game.onTap(function(x, y) {
    if (done) return;
    // Find tapped cell
    var c = Math.floor((x - GRID_X) / CELL);
    var r = Math.floor((y - GRID_Y) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    var cell = grid[r][c];
    if (cell.type === 'wall' || cell.type === 'goal') return;
    if (c === playerC && r === playerR) return; // can't change current cell
    // Rotate arrow
    var di = DIRS.indexOf(cell.dir);
    cell.dir = DIRS[(di + 1) % 4];
    game.audio.play('se_tap', 0.4);
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

    // Animate player toward target
    var dx = targetX - playerX, dy = targetY - playerY;
    var speed = CELL / MOVE_INTERVAL * 0.9;
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
      playerX = targetX; playerY = targetY;
    } else {
      playerX += (dx / (Math.abs(dx) + Math.abs(dy) + 1)) * speed * dt * 2;
      playerY += (dy / (Math.abs(dx) + Math.abs(dy) + 1)) * speed * dt * 2;
    }

    moveTimer -= dt;
    if (moveTimer <= 0) {
      moveTimer = MOVE_INTERVAL;
      // Get current cell's direction
      var cell = grid[playerR][playerC];
      if (cell.type === 'goal') {
        if (!done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(300 + Math.ceil(timeLeft) * 8); }, 400);
        }
        return;
      }
      if (cell.type !== 'arrow') return;
      var dv = DIR_VEC[cell.dir];
      var nc = playerC + dv[0];
      var nr = playerR + dv[1];
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) {
        // Fell off!
        if (!done) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
        }
        return;
      }
      var nextCell = grid[nr][nc];
      if (nextCell.type === 'wall') {
        // Bounce back (stay)
        game.audio.play('se_failure', 0.3);
        return;
      }
      playerC = nc;
      playerR = nr;
      stepCount++;
      var pos = cellCenter(nc, nr);
      targetX = pos.x;
      targetY = pos.y;
      if (nextCell.type === 'goal' && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + Math.ceil(timeLeft) * 8); }, 600);
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = GRID_X + c * CELL;
        var gy = GRID_Y + r * CELL;
        var cell2 = grid[r][c];
        var isPlayer = c === playerC && r === playerR;

        if (cell2.type === 'wall') {
          game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, C.wall);
          game.draw.rect(gx + 12, gy + 12, CELL - 24, 12, '#2563eb', 0.3);
        } else if (cell2.type === 'goal') {
          var gPulse = 0.4 + 0.3 * Math.sin(game.time.elapsed * 5);
          game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, C.goal, gPulse);
          game.draw.text('G', gx + CELL / 2, gy + CELL / 2, { size: 52, color: '#fff', bold: true });
        } else {
          game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, C.grid);
          // Arrow
          if (!isPlayer) {
            var isPulsing = false;
            game.draw.text(DIR_ARROWS[cell2.dir], gx + CELL / 2, gy + CELL / 2, {
              size: 52, color: C.arrow, bold: false
            });
          }
        }
      }
    }

    // Player
    game.draw.circle(playerX, playerY, 36, C.playerHi, 0.25);
    game.draw.circle(playerX, playerY, 28, C.player);
    game.draw.circle(playerX - 8, playerY - 8, 10, '#fff', 0.5);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#04080c');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.arrow : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Steps
    game.draw.text('歩数: ' + stepCount, W / 2, 140, { size: 48, color: '#64748b' });

    // Guide
    game.draw.text('矢印をタップして向きを変える！', W / 2, H - 200, { size: 44, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initGrid();
  });
})(game);
