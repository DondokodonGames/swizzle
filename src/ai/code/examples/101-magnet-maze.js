// 101-magnet-maze.js
// 磁石迷路 — 磁力で引き寄せられながら迷路を抜ける不思議な操作感
// 操作: タップした位置に磁力を発生させてボールを誘導
// 成功: ゴールに到達  失敗: 壁に触れる or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080f',
    wall:    '#1e3a5f',
    wallHi:  '#2563eb',
    ball:    '#f97316',
    ballHi:  '#fed7aa',
    magnet:  '#8b5cf6',
    magnetHi:'#c4b5fd',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    trail:   '#f97316',
    ui:      '#334155'
  };

  var BALL_R = 20;
  var WALL_W = 20;
  var MAGNET_FORCE = 1200;
  var MAGNET_R = 200; // radius of effect
  var FRICTION = 0.88;

  // Maze layout: array of wall segments { x1,y1,x2,y2 }
  var PLAY_X = 80, PLAY_Y = H * 0.18;
  var PLAY_W = W - 160, PLAY_H = H * 0.62;

  // Build maze walls
  var walls = [];

  function addWall(x1, y1, x2, y2) {
    walls.push({ x1: PLAY_X + x1 * PLAY_W, y1: PLAY_Y + y1 * PLAY_H, x2: PLAY_X + x2 * PLAY_W, y2: PLAY_Y + y2 * PLAY_H });
  }

  // Outer boundary
  addWall(0, 0, 1, 0);
  addWall(1, 0, 1, 1);
  addWall(0, 1, 1, 1);
  addWall(0, 0, 0, 1);

  // Interior walls
  addWall(0.3, 0, 0.3, 0.4);
  addWall(0.3, 0.5, 0.3, 1.0);
  addWall(0.6, 0.3, 0.6, 0.8);
  addWall(0.0, 0.3, 0.5, 0.3);
  addWall(0.6, 0.6, 1.0, 0.6);
  addWall(0.5, 0.7, 0.5, 1.0);

  var ballX = PLAY_X + PLAY_W * 0.08;
  var ballY = PLAY_Y + PLAY_H * 0.08;
  var ballVX = 0, ballVY = 0;

  var goalX = PLAY_X + PLAY_W * 0.88;
  var goalY = PLAY_Y + PLAY_H * 0.88;

  var magnetX = -1, magnetY = -1;
  var magnetActive = false;

  var trail = []; // { x, y, age }
  var timeLeft = 25;
  var done = false;
  var deathFlash = 0;

  function segmentCircleCollide(x1, y1, x2, y2, cx, cy, r) {
    var dx = x2 - x1, dy = y2 - y1;
    var len2 = dx * dx + dy * dy;
    var t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / len2));
    var nearX = x1 + t * dx, nearY = y1 + t * dy;
    var distX = cx - nearX, distY = cy - nearY;
    var dist2 = distX * distX + distY * distY;
    if (dist2 < r * r) {
      var dist = Math.sqrt(dist2) || 0.001;
      return { hit: true, nx: distX / dist, ny: distY / dist, pen: r - dist };
    }
    return { hit: false };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    magnetX = tx;
    magnetY = ty;
    magnetActive = true;
    setTimeout(function() { magnetActive = false; }, 400);
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

    // Magnet force
    if (magnetActive && magnetX >= 0) {
      var dx = magnetX - ballX, dy = magnetY - ballY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0 && dist < MAGNET_R) {
        var force = MAGNET_FORCE * (1 - dist / MAGNET_R);
        ballVX += (dx / dist) * force * dt;
        ballVY += (dy / dist) * force * dt;
      }
    }

    // Friction
    ballVX *= FRICTION;
    ballVY *= FRICTION;

    // Move ball
    ballX += ballVX * dt;
    ballY += ballVY * dt;

    // Wall collisions
    for (var i = 0; i < walls.length; i++) {
      var w = walls[i];
      var col = segmentCircleCollide(w.x1, w.y1, w.x2, w.y2, ballX, ballY, BALL_R + WALL_W / 2);
      if (col.hit) {
        // Push out
        ballX += col.nx * col.pen;
        ballY += col.ny * col.pen;
        // Reflect velocity
        var dot = ballVX * col.nx + ballVY * col.ny;
        if (dot < 0) {
          ballVX -= 2 * dot * col.nx;
          ballVY -= 2 * dot * col.ny;
          ballVX *= 0.5; ballVY *= 0.5;
          // Death check: fast collision
          if (Math.abs(dot) > 200) {
            if (!done) {
              done = true;
              deathFlash = 0.5;
              game.audio.play('se_failure');
              setTimeout(function() { game.end.failure(); }, 600);
              return;
            }
          }
        }
      }
    }

    // Trail
    trail.push({ x: ballX, y: ballY, age: 0 });
    for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
    trail = trail.filter(function(t) { return t.age < 0.5; });

    // Goal check
    var gdx = ballX - goalX, gdy = ballY - goalY;
    if (Math.sqrt(gdx * gdx + gdy * gdy) < BALL_R + 40) {
      if (!done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(500 + Math.ceil(timeLeft) * 20); }, 400);
      }
    }

    if (deathFlash > 0) deathFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ball trail
    for (var tri = 0; tri < trail.length; tri++) {
      var tr = trail[tri];
      game.draw.circle(tr.x, tr.y, BALL_R * (1 - tr.age * 2), C.trail, (1 - tr.age * 2) * 0.4);
    }

    // Walls
    for (var wi = 0; wi < walls.length; wi++) {
      var wal = walls[wi];
      game.draw.line(wal.x1, wal.y1, wal.x2, wal.y2, C.wall, WALL_W + 4);
      game.draw.line(wal.x1, wal.y1, wal.x2, wal.y2, C.wallHi, 3);
    }

    // Goal
    var gPulse = 0.4 + 0.3 * Math.abs(Math.sin(game.time.elapsed * 3));
    game.draw.circle(goalX, goalY, 52 + gPulse * 10, C.goalHi, gPulse * 0.4);
    game.draw.circle(goalX, goalY, 44, C.goal, 0.8);
    game.draw.text('★', goalX, goalY, { size: 44, color: '#fff', bold: true });

    // Magnet effect
    if (magnetActive && magnetX >= 0) {
      var mPulse = 0.5 + 0.5 * Math.abs(Math.sin(game.time.elapsed * 10));
      game.draw.circle(magnetX, magnetY, MAGNET_R, C.magnet, 0.05);
      game.draw.circle(magnetX, magnetY, 32, C.magnetHi, mPulse);
      game.draw.text('N', magnetX, magnetY, { size: 32, color: '#fff', bold: true });
    }

    // Ball
    game.draw.circle(ballX, ballY, BALL_R + 6, C.ballHi, 0.3);
    game.draw.circle(ballX, ballY, BALL_R, C.ball);
    game.draw.circle(ballX - 5, ballY - 5, 6, '#fff', 0.5);

    // Death flash
    if (deathFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wallHi, deathFlash * 0.4);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#04080f');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.magnet : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('タップで磁石！ゴールへ誘導', W / 2, H * 0.88, { size: 44, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
