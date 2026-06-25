// 172-magnet-maze.js
// 磁石迷路 — 磁力で引き寄せられる玉を壁に触れずゴールまで導く吸いつき感
// 操作: タップでN/S極を切り替え(引き寄せ/押し出し)
// 成功: ゴール到達  失敗: 壁に当たる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04070f',
    wall:    '#1e3a5f',
    wallHi:  '#2563eb',
    ball:    '#06b6d4',
    ballHi:  '#67e8f9',
    magN:    '#ef4444',
    magS:    '#3b82f6',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    trail:   '#0891b2',
    ui:      '#334155'
  };

  var CELL = 120;
  var COLS = 8;
  var ROWS = 14;
  var MAZE_X = (W - COLS * CELL) / 2;
  var MAZE_Y = H * 0.08;

  // Maze: 0=open, 1=wall
  var MAZE = [
    [0,0,0,0,0,0,0,0],
    [0,1,1,0,1,1,0,0],
    [0,0,1,0,1,0,0,0],
    [0,0,1,1,1,0,1,0],
    [0,0,0,0,0,0,1,0],
    [1,0,1,1,0,1,1,0],
    [0,0,0,1,0,0,0,0],
    [0,1,0,0,0,1,0,0],
    [0,1,1,0,1,1,0,0],
    [0,0,0,0,0,0,0,0],
    [0,1,0,1,0,1,0,0],
    [0,1,0,0,0,0,1,0],
    [0,0,0,1,0,0,0,0],
    [0,0,0,0,0,0,0,0]
  ];

  var BALL_R = 28;
  var bx = MAZE_X + CELL * 0.5; // start top-left
  var by = MAZE_Y + CELL * 0.5;
  var bvx = 0, bvy = 0;
  var FRICTION = 0.88;

  // Magnet: position and polarity
  var magX = W / 2;
  var magY = H / 2;
  var magPole = 1; // 1=attract, -1=repel
  var MAG_FORCE = 900;
  var MAG_DIST = 350;

  var goalX = MAZE_X + CELL * (COLS - 0.5);
  var goalY = MAZE_Y + CELL * (ROWS - 0.5);

  var timeLeft = 30;
  var done = false;
  var trail = [];
  var feedback = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    magPole *= -1; // toggle attract/repel
    magX = tx; magY = ty; // move magnet to tap
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    // Magnetic force
    var dx = magX - bx, dy = magY - by;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < MAG_DIST && dist > 10) {
      var force = MAG_FORCE * magPole * (1 - dist / MAG_DIST);
      bvx += (dx / dist) * force * dt;
      bvy += (dy / dist) * force * dt;
    }

    // Friction
    bvx *= Math.pow(FRICTION, dt * 60);
    bvy *= Math.pow(FRICTION, dt * 60);

    // Move
    var nbx = bx + bvx * dt;
    var nby = by + bvy * dt;

    // Wall collision
    var col = Math.floor((nbx - MAZE_X) / CELL);
    var row = Math.floor((nby - MAZE_Y) / CELL);
    var hitWall = false;

    // Check nearby cells for collision
    for (var r = Math.max(0, row - 1); r <= Math.min(ROWS - 1, row + 1); r++) {
      for (var c = Math.max(0, col - 1); c <= Math.min(COLS - 1, col + 1); c++) {
        if (MAZE[r] && MAZE[r][c] === 1) {
          var wx = MAZE_X + c * CELL;
          var wy = MAZE_Y + r * CELL;
          var cx2 = Math.max(wx, Math.min(wx + CELL, nbx));
          var cy2 = Math.max(wy, Math.min(wy + CELL, nby));
          var ddx = nbx - cx2, ddy = nby - cy2;
          var dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dd < BALL_R) {
            hitWall = true;
            break;
          }
        }
      }
      if (hitWall) break;
    }

    if (hitWall && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
      return;
    }

    // Boundary
    nbx = Math.max(MAZE_X + BALL_R, Math.min(MAZE_X + COLS * CELL - BALL_R, nbx));
    nby = Math.max(MAZE_Y + BALL_R, Math.min(MAZE_Y + ROWS * CELL - BALL_R, nby));

    bx = nbx; by = nby;
    trail.push({ x: bx, y: by, life: 0.4 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Goal check
    var gdx = bx - goalX, gdy = by - goalY;
    if (Math.sqrt(gdx * gdx + gdy * gdy) < BALL_R + 40 && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 80 + 500); }, 400);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Maze walls
    for (var mr = 0; mr < ROWS; mr++) {
      for (var mc = 0; mc < COLS; mc++) {
        var wx2 = MAZE_X + mc * CELL;
        var wy2 = MAZE_Y + mr * CELL;
        if (MAZE[mr] && MAZE[mr][mc] === 1) {
          game.draw.rect(wx2, wy2, CELL, CELL, C.wall, 0.9);
          game.draw.rect(wx2, wy2, CELL, 8, C.wallHi, 0.5);
        } else {
          game.draw.rect(wx2, wy2, CELL, CELL, '#060d18', 0.5);
        }
      }
    }
    // Grid lines
    for (var gr = 0; gr <= ROWS; gr++) {
      game.draw.line(MAZE_X, MAZE_Y + gr * CELL, MAZE_X + COLS * CELL, MAZE_Y + gr * CELL, C.wall, 1);
    }
    for (var gc = 0; gc <= COLS; gc++) {
      game.draw.line(MAZE_X + gc * CELL, MAZE_Y, MAZE_X + gc * CELL, MAZE_Y + ROWS * CELL, C.wall, 1);
    }

    // Goal
    game.draw.circle(goalX, goalY, 44, C.goalHi, 0.3);
    game.draw.circle(goalX, goalY, 32, C.goal, 0.8);
    game.draw.text('G', goalX, goalY, { size: 36, color: '#fff', bold: true });

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, BALL_R * t.life * 2, C.trail, t.life * 0.4);
    }

    // Magnet
    var mCol = magPole > 0 ? C.magN : C.magS;
    var mLabel = magPole > 0 ? 'N' : 'S';
    game.draw.circle(magX, magY, 50, mCol, 0.25);
    game.draw.circle(magX, magY, 36, mCol, 0.6);
    game.draw.text(mLabel, magX, magY, { size: 40, color: '#fff', bold: true });
    // Magnetic field lines
    for (var fi = 0; fi < 8; fi++) {
      var fa = fi * Math.PI / 4;
      for (var fd = 0; fd < 3; fd++) {
        var fr = 80 + fd * 70;
        var fxx = magX + Math.cos(fa) * fr;
        var fyy = magY + Math.sin(fa) * fr;
        game.draw.circle(fxx, fyy, 6, mCol, 0.15 * (1 - fd / 3));
      }
    }

    // Ball
    game.draw.circle(bx, by, BALL_R + 8, C.ballHi, 0.25);
    game.draw.circle(bx, by, BALL_R, C.ball, 0.9);
    game.draw.circle(bx - BALL_R * 0.3, by - BALL_R * 0.3, BALL_R * 0.25, '#fff', 0.5);

    game.draw.text('タップで磁石切り替え', W / 2, H * 0.94, { size: 36, color: C.ui });
    game.draw.text(mLabel + '極: ' + (magPole > 0 ? '引き寄せ' : '押し出し'), W / 2, H * 0.9, { size: 38, color: mCol });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : C.magN);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.2); });
})(game);
