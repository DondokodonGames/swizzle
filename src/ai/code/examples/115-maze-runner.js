// 115-maze-runner.js
// 迷宮脱出 — 壁に触れずにゴールへたどり着く指一本の集中力ゲーム
// 操作: スワイプで上下左右に移動
// 成功: ゴールに到達  失敗: 壁に触れる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020408',
    wall:   '#1e3a5f',
    wallHi: '#2563eb',
    floor:  '#040c18',
    player: '#f97316',
    playerHi:'#fed7aa',
    goal:   '#22c55e',
    goalHi: '#86efac',
    trail:  '#7c3aed',
    wrong:  '#ef4444',
    ui:     '#334155'
  };

  // Maze definition: 11x15 grid, 0=floor, 1=wall, 2=goal, 3=start
  var COLS = 11, ROWS = 15;
  var MAZE = [
    [1,1,1,1,1,1,1,1,1,1,1],
    [1,3,0,0,1,0,0,0,1,2,1],
    [1,0,1,0,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,1],
    [1,1,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,0,1,0,1,0,1],
    [1,0,0,0,1,0,0,0,1,0,1],
    [1,1,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1]
  ];

  var CELL = Math.floor(Math.min(W / COLS, H * 0.75 / ROWS));
  var MAZE_W = COLS * CELL;
  var MAZE_H = ROWS * CELL;
  var MAZE_X = (W - MAZE_W) / 2;
  var MAZE_Y = (H - MAZE_H) / 2;

  // Player position (in cells)
  var px = 1, py = 1; // start cell (where 3 is)
  var trail = [{ x: 1, y: 1 }];

  var timeLeft = 30;
  var done = false;
  var deathFlash = 0;
  var winFlash = 0;

  function tryMove(dc, dr) {
    var nx = px + dc, ny = py + dr;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
    var cell = MAZE[ny][nx];
    if (cell === 1) {
      // Wall hit
      if (!done) {
        done = true;
        deathFlash = 0.6;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 700);
      }
      return;
    }
    px = nx; py = ny;
    trail.push({ x: px, y: py });
    if (trail.length > 20) trail.shift();
    game.audio.play('se_tap', 0.4);
    if (cell === 2 && !done) {
      // Goal!
      done = true;
      winFlash = 0.8;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(500 + Math.ceil(timeLeft) * 20); }, 700);
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up')    tryMove(0, -1);
    if (dir === 'down')  tryMove(0, 1);
    if (dir === 'left')  tryMove(-1, 0);
    if (dir === 'right') tryMove(1, 0);
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

    if (deathFlash > 0) deathFlash -= dt;
    if (winFlash > 0) winFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw maze
    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        var cell = MAZE[row][col];
        var cx = MAZE_X + col * CELL;
        var cy = MAZE_Y + row * CELL;
        if (cell === 1) {
          game.draw.rect(cx, cy, CELL, CELL, C.wall);
          game.draw.rect(cx, cy, CELL, 4, C.wallHi);
          game.draw.rect(cx, cy, 4, CELL, C.wallHi);
        } else if (cell === 2) {
          // Goal
          game.draw.rect(cx + 4, cy + 4, CELL - 8, CELL - 8, C.floor);
          var gPulse = 0.5 + 0.4 * Math.abs(Math.sin(timeLeft * 3));
          game.draw.rect(cx + 8, cy + 8, CELL - 16, CELL - 16, C.goal, gPulse * 0.5);
          game.draw.circle(cx + CELL / 2, cy + CELL / 2, CELL * 0.25, C.goalHi, gPulse * 0.8);
        } else {
          game.draw.rect(cx, cy, CELL, CELL, C.floor);
        }
      }
    }

    // Trail
    for (var ti = 0; ti < trail.length; ti++) {
      var tf = ti / trail.length;
      var tcx = MAZE_X + trail[ti].x * CELL + CELL / 2;
      var tcy = MAZE_Y + trail[ti].y * CELL + CELL / 2;
      game.draw.circle(tcx, tcy, CELL * 0.18 * tf, C.trail, tf * 0.4);
    }

    // Player
    var plx = MAZE_X + px * CELL + CELL / 2;
    var ply = MAZE_Y + py * CELL + CELL / 2;
    var pPulse = 0.7 + 0.3 * Math.abs(Math.sin(timeLeft * 6));
    game.draw.circle(plx, ply, CELL * 0.35, C.playerHi, pPulse * 0.3);
    game.draw.circle(plx, ply, CELL * 0.28, C.player);

    // Overlays
    if (deathFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, deathFlash * 0.35);
      game.draw.text('ぶつかった！', W / 2, H * 0.22, { size: 80, color: C.wrong, bold: true });
    }
    if (winFlash > 0) {
      game.draw.rect(0, 0, W, H, C.goal, winFlash * 0.3);
      game.draw.text('脱出！', W / 2, H * 0.22, { size: 96, color: C.goalHi, bold: true });
    }

    game.draw.text('スワイプで移動', W / 2, H * 0.9, { size: 44, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
  });
})(game);
