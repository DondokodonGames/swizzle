// 647-magnet-maze.js
// マグネットメイズ — 磁石で鉄球を誘導しゴールへ送れ
// 操作: タップで磁石の位置を変える
// 成功: 10回ゴール  失敗: 10回穴落下 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030406',
    track:   '#0f1117',
    trackHi: '#1a1f2e',
    ball:    '#94a3b8',
    ballHi:  '#e2e8f0',
    magnet:  '#dc2626',
    magnetHi:'#fca5a5',
    magnetN: '#3b82f6',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    hole:    '#111',
    text:    '#f1f5f9',
    ui:      '#030408',
    wall:    '#1e293b'
  };

  var MAZE_X = 60, MAZE_Y = H * 0.18;
  var MAZE_W = W - 120, MAZE_H = H * 0.65;
  var BALL_R = 28;
  var MAG_R = 50;
  var MAG_STRENGTH = 800;

  var ballX = MAZE_X + MAZE_W / 2;
  var ballY = MAZE_Y + 60;
  var ballVX = 0, ballVY = 0;

  var magX = W / 2, magY = H * 0.88;
  var targetMagX = W / 2, targetMagY = H * 0.88;

  // Holes and goal
  var holes = [];
  var goalX = 0, goalY = 0;

  var scored = 0;
  var NEEDED = 10;
  var fell = 0;
  var MAX_FELL = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.goal;

  function genLevel() {
    ballX = MAZE_X + 80 + Math.random() * (MAZE_W - 160);
    ballY = MAZE_Y + 80;
    ballVX = (Math.random() - 0.5) * 100;
    ballVY = 50 + Math.random() * 100;

    goalX = MAZE_X + 80 + Math.random() * (MAZE_W - 160);
    goalY = MAZE_Y + MAZE_H - 80;

    holes = [];
    var hCount = 4 + Math.floor(elapsed / 10);
    for (var h = 0; h < hCount; h++) {
      holes.push({
        x: MAZE_X + 60 + Math.random() * (MAZE_W - 120),
        y: MAZE_Y + 100 + Math.random() * (MAZE_H - 200),
        r: 28
      });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    targetMagX = tx;
    targetMagY = ty;
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
    if (flashAnim > 0) flashAnim -= dt * 4;

    // Smooth magnet movement
    magX += (targetMagX - magX) * Math.min(1, dt * 9);
    magY += (targetMagY - magY) * Math.min(1, dt * 9);

    // Magnetic force on ball
    var mdx = magX - ballX, mdy = magY - ballY;
    var mDist = Math.sqrt(mdx * mdx + mdy * mdy);
    if (mDist > 5) {
      var force = MAG_STRENGTH / (mDist * mDist) * Math.min(1, mDist / 200);
      ballVX += (mdx / mDist) * force * dt;
      ballVY += (mdy / mDist) * force * dt;
    }

    // Slight gravity
    ballVY += 120 * dt;

    // Damping
    ballVX *= (1 - dt * 1.5);
    ballVY *= (1 - dt * 1.5);

    // Clamp velocity
    var spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
    if (spd > 600) { ballVX = ballVX / spd * 600; ballVY = ballVY / spd * 600; }

    ballX += ballVX * dt;
    ballY += ballVY * dt;

    // Wall bounce
    if (ballX - BALL_R < MAZE_X) { ballX = MAZE_X + BALL_R; ballVX = Math.abs(ballVX) * 0.7; }
    if (ballX + BALL_R > MAZE_X + MAZE_W) { ballX = MAZE_X + MAZE_W - BALL_R; ballVX = -Math.abs(ballVX) * 0.7; }
    if (ballY - BALL_R < MAZE_Y) { ballY = MAZE_Y + BALL_R; ballVY = Math.abs(ballVY) * 0.7; }

    // Check holes
    for (var hi = 0; hi < holes.length; hi++) {
      var h = holes[hi];
      var dx2 = ballX - h.x, dy2 = ballY - h.y;
      if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < BALL_R + h.r) {
        fell++;
        flashCol = '#ff0000';
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.35);
        for (var p = 0; p < 5; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: ballX, y: ballY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.ballHi });
        }
        if (fell >= MAX_FELL && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        } else {
          genLevel();
        }
        return;
      }
    }

    // Check goal
    var gdx = ballX - goalX, gdy = ballY - goalY;
    if (Math.sqrt(gdx * gdx + gdy * gdy) < BALL_R + 36) {
      scored++;
      flashCol = C.goal;
      flashAnim = 0.3;
      game.audio.play('se_success', 0.6);
      for (var p2 = 0; p2 < 8; p2++) {
        var pa2 = Math.random() * Math.PI * 2;
        particles.push({ x: goalX, y: goalY, vx: Math.cos(pa2) * 300, vy: Math.sin(pa2) * 300, life: 0.5, col: C.goalHi });
      }
      if (scored >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(scored * 400 + Math.ceil(timeLeft) * 80); }, 700);
      } else {
        genLevel();
      }
      return;
    }

    // Ball out of bounds bottom
    if (ballY > MAZE_Y + MAZE_H + 60) {
      fell++;
      game.audio.play('se_failure', 0.3);
      if (fell >= MAX_FELL && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        genLevel();
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Maze area
    game.draw.rect(MAZE_X - 4, MAZE_Y - 4, MAZE_W + 8, MAZE_H + 8, C.wall, 0.5);
    game.draw.rect(MAZE_X, MAZE_Y, MAZE_W, MAZE_H, C.track, 0.8);

    // Holes
    for (var hi2 = 0; hi2 < holes.length; hi2++) {
      var h2 = holes[hi2];
      game.draw.circle(h2.x, h2.y, h2.r + 6, '#000', 0.5);
      game.draw.circle(h2.x, h2.y, h2.r, C.hole, 0.95);
    }

    // Goal
    game.draw.circle(goalX, goalY, 40, C.goal, 0.25 + Math.sin(elapsed * 4) * 0.1);
    game.draw.circle(goalX, goalY, 32, C.goal, 0.7);
    game.draw.text('★', goalX, goalY + 14, { size: 44, color: C.goalHi });

    // Ball
    game.draw.circle(ballX + 4, ballY + 4, BALL_R, '#000', 0.4);
    game.draw.circle(ballX, ballY, BALL_R, C.ball, 0.9);
    game.draw.circle(ballX - 8, ballY - 8, BALL_R * 0.35, C.ballHi, 0.5);

    // Magnet
    game.draw.circle(magX + 4, magY + 4, MAG_R, '#000', 0.3);
    game.draw.circle(magX, magY, MAG_R, C.magnet, 0.85);
    game.draw.circle(magX, magY, MAG_R * 0.6, C.magnetHi, 0.6);
    game.draw.text('N', magX - 14, magY + 8, { size: 32, color: '#fff', bold: true });
    game.draw.text('S', magX + 14, magY + 8, { size: 32, color: C.magnetHi, bold: true });

    // Magnetic field lines
    for (var fl = 0; fl < 6; fl++) {
      var fAngle = (fl / 6) * Math.PI * 2;
      var fx = magX + Math.cos(fAngle) * (MAG_R + 30);
      var fy = magY + Math.sin(fAngle) * (MAG_R + 30);
      game.draw.circle(fx, fy, 6, C.magnetHi, 0.2 + Math.sin(elapsed * 3 + fl) * 0.1);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 10 * p3.life, p3.col, p3.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Fall dots
    for (var fi = 0; fi < MAX_FELL; fi++) {
      game.draw.circle(W / 2 - (MAX_FELL - 1) * 40 + fi * 80, H * 0.955, 16, fi < fell ? C.magnet : C.ui, 0.9);
    }

    game.draw.text(scored + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.goal : C.magnet);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    genLevel();
  });
})(game);
