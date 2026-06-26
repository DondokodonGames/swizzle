// 478-orbit-catch.js
// 軌道キャッチ — 惑星の周回軌道上を回るボールをタップで引き寄せる
// 操作: タップで磁力を発動して近くのボールを引き寄せる
// 成功: 20個キャッチ  失敗: 10個逃す or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000510',
    planet: '#1e3a5f',
    planetHi:'#2563eb',
    orbit:  '#1e3a5f',
    ball0:  '#ef4444',
    ball1:  '#f59e0b',
    ball2:  '#22c55e',
    ball3:  '#a855f7',
    ball4:  '#06b6d4',
    magnet: '#fbbf24',
    magnetGlo:'#fde68a',
    caught: '#86efac',
    miss:   '#ef4444',
    star:   '#94a3b8',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var CX = W / 2;
  var CY = H * 0.48;
  var PLANET_R = 90;

  var BALL_COLORS = [C.ball0, C.ball1, C.ball2, C.ball3, C.ball4];
  var ORBIT_RADII = [200, 290, 380, 470];

  var balls = [];
  var stars = [];
  var particles = [];
  var caught = 0;
  var NEEDED = 20;
  var escaped = 0;
  var MAX_ESCAPE = 10;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var nextSpawn = 1.0;
  var magnetActive = false;
  var magnetTimer = 0;
  var MAGNET_DURATION = 0.5;
  var magnetX = 0, magnetY = 0;
  var flashAnim = 0;

  // Generate stars
  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, twinkle: Math.random() * Math.PI * 2 });
  }

  function spawnBall() {
    var orbitR = ORBIT_RADII[Math.floor(Math.random() * ORBIT_RADII.length)];
    var angle = Math.random() * Math.PI * 2;
    var speed = (0.8 + Math.random() * 0.6) * (Math.random() < 0.5 ? 1 : -1);
    balls.push({
      angle: angle,
      orbitR: orbitR,
      angVel: speed / orbitR,
      r: 24 + Math.random() * 14,
      col: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
      pulled: false,
      pullVx: 0, pullVy: 0,
      x: CX + Math.cos(angle) * orbitR,
      y: CY + Math.sin(angle) * orbitR,
      life: 6 + Math.random() * 4
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    magnetActive = true;
    magnetTimer = MAGNET_DURATION;
    magnetX = tx;
    magnetY = ty;
    game.audio.play('se_tap', 0.4);

    // Pull all balls near tap
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      var dx = tx - b.x;
      var dy = ty - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 140) {
        // Catch!
        b.pulled = true;
        b.pullVx = dx / dist * 600;
        b.pullVy = dy / dist * 600;
      }
    }
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

    if (magnetTimer > 0) { magnetTimer -= dt; if (magnetTimer <= 0) magnetActive = false; }
    if (flashAnim > 0) flashAnim -= dt * 3;

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done && balls.length < 12) {
      spawnBall();
      nextSpawn = 0.5 + Math.random() * 0.7;
    }

    // Update balls
    for (var bi2 = balls.length - 1; bi2 >= 0; bi2--) {
      var b2 = balls[bi2];
      b2.life -= dt;

      if (b2.pulled) {
        // Moving toward tap point
        b2.x += b2.pullVx * dt;
        b2.y += b2.pullVy * dt;
        // Check if reached planet or tap point
        var dx2 = b2.x - magnetX;
        var dy2 = b2.y - magnetY;
        if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < 40) {
          // Caught!
          caught++;
          balls.splice(bi2, 1);
          flashAnim = 0.3;
          game.audio.play('se_tap', 0.6);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: magnetX, y: magnetY, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.5, col: C.caught });
          }
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.8);
            setTimeout(function() { game.end.success(caught * 200 + Math.ceil(timeLeft) * 100); }, 700);
          }
          continue;
        }
      } else {
        // Orbit
        b2.angle += b2.angVel * dt;
        b2.x = CX + Math.cos(b2.angle) * b2.orbitR;
        b2.y = CY + Math.sin(b2.angle) * b2.orbitR;
      }

      // Life expired — escaped
      if (b2.life <= 0) {
        balls.splice(bi2, 1);
        escaped++;
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        continue;
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s = stars[si2];
      var twinkle = Math.sin(elapsed * 2 + s.twinkle) * 0.3 + 0.7;
      game.draw.circle(s.x, s.y, s.r, C.star, twinkle * 0.8);
    }

    // Orbit rings
    for (var oi = 0; oi < ORBIT_RADII.length; oi++) {
      var or2 = ORBIT_RADII[oi];
      // Draw orbit as circle (approximated with segments)
      for (var seg = 0; seg < 48; seg++) {
        var a1 = (seg / 48) * Math.PI * 2;
        var a2 = ((seg + 0.7) / 48) * Math.PI * 2;
        game.draw.line(CX + Math.cos(a1) * or2, CY + Math.sin(a1) * or2, CX + Math.cos(a2) * or2, CY + Math.sin(a2) * or2, C.orbit, 2);
      }
    }

    // Planet
    game.draw.circle(CX, CY, PLANET_R + 16, C.planet, 0.3);
    game.draw.circle(CX, CY, PLANET_R, C.planet, 0.9);
    game.draw.circle(CX, CY, PLANET_R, C.planetHi, 0.2);
    game.draw.circle(CX - PLANET_R * 0.25, CY - PLANET_R * 0.25, PLANET_R * 0.35, '#fff', 0.1);

    // Balls
    for (var bi3 = 0; bi3 < balls.length; bi3++) {
      var b3 = balls[bi3];
      var lifeRatio = b3.life / 10;
      game.draw.circle(b3.x, b3.y, b3.r + 8, b3.col, 0.15);
      game.draw.circle(b3.x, b3.y, b3.r, b3.col, lifeRatio * 0.9 + 0.1);
      game.draw.circle(b3.x - b3.r * 0.3, b3.y - b3.r * 0.3, b3.r * 0.3, '#fff', 0.3);
    }

    // Magnet effect
    if (magnetActive) {
      var mRadius = 140 * (magnetTimer / MAGNET_DURATION);
      game.draw.circle(magnetX, magnetY, mRadius, C.magnetGlo, 0.1);
      game.draw.circle(magnetX, magnetY, 30, C.magnet, 0.8);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.caught, flashAnim * 0.1);

    // Escape dots
    var missPerRow = 5;
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      var ex = W * 0.1 + (ei % missPerRow) * (W * 0.8 / (missPerRow - 1));
      var ey = ei < missPerRow ? H * 0.948 : H * 0.963;
      game.draw.circle(ex, ey, 13, ei < escaped ? C.miss : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio2 = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio2, 72, ratio2 > 0.3 ? C.planetHi : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnBall();
    spawnBall();
    spawnBall();
  });
})(game);
