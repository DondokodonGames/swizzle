// 209-gravity-switch.js
// 重力スイッチ — 4方向に重力を切り替えながらゴールまで誘導するパズル感
// 操作: スワイプで重力方向を変える
// 成功: ゴールに到達  失敗: 60秒 or 棘に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060408',
    wall:    '#1e293b',
    wallHi:  '#334155',
    ball:    '#f59e0b',
    ballHi:  '#fde68a',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    spike:   '#ef4444',
    spikeHi: '#fca5a5',
    arrow:   '#64748b',
    ui:      '#334155'
  };

  var CELL = 120;
  var COLS = 9;
  var ROWS = 14;
  var GX = (W - COLS * CELL) / 2;
  var GY = H * 0.08;

  // Level: 0=empty, 1=wall, 2=spike, 3=goal, 4=ball_start
  var level = [
    [1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,1,0,0,1,0,0,1],
    [1,0,1,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,1],
    [1,0,0,0,1,0,1,0,1],
    [1,0,1,0,0,0,1,0,1],
    [1,0,1,0,0,0,0,0,1],
    [1,0,0,0,2,2,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,2,2,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,1],
    [1,4,0,0,0,0,3,0,1],
    [1,1,1,1,1,1,1,1,1]
  ];

  var BALL_R = 32;
  var ballX, ballY, ballVX, ballVY;
  var gravDir = { x: 0, y: 1 }; // down
  var GRAVITY = 1200;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var trail = [];

  function initBall() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (level[r][c] === 4) {
          ballX = GX + c * CELL + CELL / 2;
          ballY = GY + r * CELL + CELL / 2;
          ballVX = 0; ballVY = 0;
          return;
        }
      }
    }
  }

  function cellAt(wx, wy) {
    var c = Math.floor((wx - GX) / CELL);
    var r = Math.floor((wy - GY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return 1;
    return level[r][c];
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up') { gravDir = { x: 0, y: -1 }; game.audio.play('se_tap', 0.4); }
    else if (dir === 'down') { gravDir = { x: 0, y: 1 }; game.audio.play('se_tap', 0.4); }
    else if (dir === 'left') { gravDir = { x: -1, y: 0 }; game.audio.play('se_tap', 0.4); }
    else if (dir === 'right') { gravDir = { x: 1, y: 0 }; game.audio.play('se_tap', 0.4); }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Apply gravity
    ballVX += gravDir.x * GRAVITY * dt;
    ballVY += gravDir.y * GRAVITY * dt;

    // Move ball
    var steps = 4;
    for (var s = 0; s < steps; s++) {
      ballX += ballVX * dt / steps;
      ballY += ballVY * dt / steps;

      // Wall collision
      var left = cellAt(ballX - BALL_R, ballY);
      var right = cellAt(ballX + BALL_R, ballY);
      var top = cellAt(ballX, ballY - BALL_R);
      var bottom = cellAt(ballX, ballY + BALL_R);

      if (left === 1) { ballVX = Math.abs(ballVX) * 0.5; ballX = Math.floor((ballX - GX) / CELL) * CELL + GX + BALL_R + CELL; }
      if (right === 1) { ballVX = -Math.abs(ballVX) * 0.5; ballX = Math.floor((ballX + BALL_R - GX) / CELL) * CELL + GX - BALL_R; }
      if (top === 1) { ballVY = Math.abs(ballVY) * 0.5; ballY = Math.floor((ballY - GY) / CELL) * CELL + GY + BALL_R + CELL; }
      if (bottom === 1) { ballVY = -Math.abs(ballVY) * 0.5; ballY = Math.floor((ballY + BALL_R - GY) / CELL) * CELL + GY - BALL_R; }

      // Check spike
      if ((left === 2 || right === 2 || top === 2 || bottom === 2) && !done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }

      // Check goal
      if ((left === 3 || right === 3 || top === 3 || bottom === 3 || cellAt(ballX, ballY) === 3) && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 80 + 600); }, 400);
        return;
      }
    }

    // Speed cap
    var spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
    if (spd > 800) { ballVX = ballVX / spd * 800; ballVY = ballVY / spd * 800; }

    trail.push({ x: ballX, y: ballY, life: 0.4 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Cells
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cx = GX + c * CELL;
        var cy = GY + r * CELL;
        var cell = level[r][c];
        if (cell === 1) {
          game.draw.rect(cx, cy, CELL, CELL, C.wall, 0.9);
          game.draw.rect(cx, cy, CELL, 8, C.wallHi, 0.3);
        } else if (cell === 2) {
          // Spike
          game.draw.rect(cx + 8, cy + 8, CELL - 16, CELL - 16, C.spike, 0.15);
          game.draw.line(cx + CELL / 2, cy + CELL - 8, cx + CELL / 2, cy + 8, C.spike, 8);
          game.draw.line(cx + 8, cy + CELL / 2, cx + CELL - 8, cy + CELL / 2, C.spike, 8);
          game.draw.circle(cx + CELL / 2, cy + CELL / 2, 12, C.spikeHi, 0.6);
        } else if (cell === 3) {
          var gp = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 3));
          game.draw.rect(cx, cy, CELL, CELL, C.goal, 0.15 + gp * 0.15);
          game.draw.circle(cx + CELL / 2, cy + CELL / 2, CELL * 0.35, C.goalHi, gp * 0.5);
          game.draw.text('★', cx + CELL / 2, cy + CELL / 2, { size: 60, color: C.goal, bold: true });
        }
      }
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, BALL_R * t.life, C.ball, t.life * 0.35);
    }

    // Ball
    game.draw.circle(ballX, ballY, BALL_R + 8, C.ballHi, 0.3);
    game.draw.circle(ballX, ballY, BALL_R, C.ball, 0.9);
    game.draw.circle(ballX - BALL_R * 0.3, ballY - BALL_R * 0.3, BALL_R * 0.25, '#fff', 0.5);

    // Gravity direction indicator
    var arrowX = W * 0.5;
    var arrowY = H * 0.93;
    game.draw.text('重力: ' + (gravDir.y === 1 ? '↓' : gravDir.y === -1 ? '↑' : gravDir.x === 1 ? '→' : '←'), arrowX, arrowY, { size: 48, color: '#f1f5f9', bold: true });
    game.draw.text('スワイプで重力方向変更', W / 2, H * 0.96, { size: 30, color: C.ui });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.goal : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initBall();
  });
})(game);
