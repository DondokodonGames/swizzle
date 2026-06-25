// 236-pendulum-aim.js
// ペンデュラムエイム — 振り子の先端が目標を通過する瞬間にタップする狙撃感覚
// 操作: タップで発射（振り子先端の位置に弾を放つ）
// 成功: 10回ヒット  失敗: 10回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040a0f',
    pendArm:'#64748b',
    bob:    '#3b82f6',
    bobHi:  '#93c5fd',
    target: '#ef4444',
    tarHi:  '#fca5a5',
    bullet: '#f59e0b',
    hit:    '#22c55e',
    hitHi:  '#86efac',
    ui:     '#475569'
  };

  // Pendulum
  var PIVOT_X = W / 2;
  var PIVOT_Y = H * 0.12;
  var ARM_LEN = 400;
  var pendAngle = Math.PI / 4; // start angle from vertical
  var pendVel = 0;
  var GRAVITY = 9.8;
  var DAMPING = 0.999;

  // Target
  var target = { x: 0, y: 0, r: 50 };
  var targetTimer = 0;
  var TARGET_LIFE = 2.5;

  // Bullets
  var bullets = [];

  var hits = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;

  function bobPos() {
    return {
      x: PIVOT_X + Math.sin(pendAngle) * ARM_LEN,
      y: PIVOT_Y + Math.cos(pendAngle) * ARM_LEN
    };
  }

  function spawnTarget() {
    target.x = 80 + Math.random() * (W - 160);
    target.y = H * 0.4 + Math.random() * H * 0.35;
    targetTimer = TARGET_LIFE;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var bob = bobPos();
    // Fire bullet from bob position
    bullets.push({
      x: bob.x, y: bob.y,
      // Velocity: shoot toward tap point
      vx: (tx - bob.x) / 0.3,
      vy: (ty - bob.y) / 0.3,
      life: 0.4,
      r: 12
    });
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    // Pendulum physics
    var acc = -(GRAVITY / ARM_LEN * 200) * Math.sin(pendAngle);
    pendVel += acc * dt;
    pendVel *= DAMPING;
    pendAngle += pendVel * dt;

    // Target timer
    targetTimer -= dt;
    if (targetTimer <= 0) {
      // Target expired — miss
      misses++;
      feedback = 'MISS!';
      feedbackCol = C.target;
      feedbackTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      spawnTarget();
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }

    // Bullets
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      // Check target hit
      if (targetTimer > 0) {
        var dx = b.x - target.x, dy = b.y - target.y;
        if (Math.sqrt(dx * dx + dy * dy) < target.r + b.r) {
          hits++;
          feedback = 'HIT! (' + hits + '/' + NEEDED + ')';
          feedbackCol = C.hit;
          feedbackTimer = 0.6;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5 });
          }
          spawnTarget();
          bullets.splice(bi, 1);
          if (hits >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(hits * 100 + Math.ceil(timeLeft) * 30); }, 400);
          }
          continue;
        }
      }

      if (b.life <= 0) bullets.splice(bi, 1);
    }

    for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 200 * dt;
      particles[pi2].life -= dt;
      if (particles[pi2].life <= 0) particles.splice(pi2, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target
    if (targetTimer > 0) {
      var tarPulse = targetTimer / TARGET_LIFE;
      game.draw.circle(target.x, target.y, target.r + 15, C.tarHi, (1 - tarPulse) * 0.4);
      game.draw.circle(target.x, target.y, target.r, C.target, 0.8);
      // Concentric rings
      game.draw.circle(target.x, target.y, target.r * 0.6, C.tarHi, 0.4);
      game.draw.circle(target.x, target.y, target.r * 0.25, '#fff', 0.7);
      // Timer ring
      for (var a = 0; a < Math.PI * 2 * (targetTimer / TARGET_LIFE); a += 0.05) {
        game.draw.circle(target.x + Math.cos(a) * (target.r + 5), target.y + Math.sin(a) * (target.r + 5), 4, '#f59e0b', 0.7);
      }
    }

    // Pendulum arm
    var bob = bobPos();
    game.draw.line(PIVOT_X, PIVOT_Y, bob.x, bob.y, C.pendArm, 4);
    game.draw.circle(PIVOT_X, PIVOT_Y, 12, C.pendArm, 0.8);

    // Bob
    game.draw.circle(bob.x, bob.y, 28 + 8, C.bobHi, 0.25);
    game.draw.circle(bob.x, bob.y, 28, C.bob, 0.9);
    game.draw.circle(bob.x - 8, bob.y - 8, 10, '#fff', 0.4);

    // Bullets
    for (var bi2 = 0; bi2 < bullets.length; bi2++) {
      var b2 = bullets[bi2];
      game.draw.circle(b2.x, b2.y, b2.r, C.bullet, b2.life * 2);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var p = particles[pp];
      game.draw.circle(p.x, p.y, 8 * p.life, C.hitHi, p.life * 0.8);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.88, { size: 52, color: feedbackCol, bold: true });
    }

    // Score/miss dots
    for (var hi2 = 0; hi2 < NEEDED; hi2++) {
      game.draw.circle(W / 2 - (NEEDED - 1) * 20 + hi2 * 40, H * 0.93, 13, hi2 < hits ? C.hit : '#0a0a14');
    }
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 18 + mi * 36, H * 0.96, 10, mi < misses ? C.target : '#0a0a14');
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    game.draw.text('タップで狙撃！', W / 2, H * 0.9, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.bob : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTarget();
  });
})(game);
