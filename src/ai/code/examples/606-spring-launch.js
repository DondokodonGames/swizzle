// 606-spring-launch.js
// スプリングランチ — バネを引っ張って的をピンポイントで狙い撃ち
// 操作: スワイプで引っ張り向きと強さを調整、放してで発射
// 成功: 15的命中  失敗: 8回外れ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020508',
    spring:  '#558844',
    springHi:'#88cc66',
    ball:    '#ffaa22',
    ballHi:  '#ffdd88',
    target:  '#ff3355',
    targetHi:'#ff88aa',
    trail:   '#ffaa2233',
    hit:     '#22c55e',
    hitHi:   '#86efac',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#1a2a1a'
  };

  var SPRING_X = W / 2;
  var SPRING_Y = H * 0.8;
  var MAX_PULL = 220;
  var BALL_R = 24;

  var ball = null; // null = on spring, else flying
  var pullX = 0, pullY = 0;
  var pulling = false;
  var targets = [];
  var hits = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.hit;
  var trail = [];
  var resultText = '';
  var resultTimer = 0;

  function spawnTarget() {
    targets.push({
      x: 80 + Math.random() * (W - 160),
      y: H * 0.1 + Math.random() * (H * 0.5),
      r: 36 + Math.random() * 20,
      vx: (Math.random() - 0.5) * 60,
      vy: 0,
      phase: Math.random() * Math.PI * 2
    });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (ball) return; // ball in flight

    // Calculate pull vector
    var dx = x2 - SPRING_X, dy = y2 - SPRING_Y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 10) {
      var clampedDist = Math.min(dist, MAX_PULL);
      var launchVX = -(dx / dist) * clampedDist * 8;
      var launchVY = -(dy / dist) * clampedDist * 8;

      ball = {
        x: SPRING_X, y: SPRING_Y,
        vx: launchVX, vy: launchVY,
        active: true
      };
      pulling = false;
      game.audio.play('se_tap', 0.4);
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!ball) {
      pulling = true;
      pullX = tx; pullY = ty;
      game.audio.play('se_tap', 0.1);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Update targets
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti];
      t.x += t.vx * dt;
      t.phase += dt * 2;
      // Bounce horizontally
      if (t.x < t.r) { t.x = t.r; t.vx = Math.abs(t.vx); }
      if (t.x > W - t.r) { t.x = W - t.r; t.vx = -Math.abs(t.vx); }
    }

    // Spawn targets
    if (targets.length < 3 + Math.floor(elapsed / 10)) {
      spawnTarget();
    }

    // Update ball
    if (ball) {
      ball.vx += 0; // no gravity for now
      ball.vy += 600 * dt; // gravity
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Trail
      trail.push({ x: ball.x, y: ball.y, life: 0.3 });

      // Check target hits
      var hitTarget = false;
      for (var ti2 = targets.length - 1; ti2 >= 0; ti2--) {
        var t2 = targets[ti2];
        var dx2 = ball.x - t2.x, dy2 = ball.y - t2.y;
        if (dx2 * dx2 + dy2 * dy2 < (BALL_R + t2.r) * (BALL_R + t2.r)) {
          // Hit!
          targets.splice(ti2, 1);
          hits++;
          flashCol = C.hit;
          flashAnim = 0.25;
          resultText = '命中!';
          resultTimer = 0.5;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: t2.x, y: t2.y, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5, col: C.hitHi });
          }
          ball = null;
          hitTarget = true;
          if (hits >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(hits * 300 + Math.ceil(timeLeft) * 100); }, 700);
          }
          break;
        }
      }

      // Ball off screen
      if (!hitTarget && ball && (ball.x < -100 || ball.x > W + 100 || ball.y > H + 100 || ball.y < -200)) {
        misses++;
        flashCol = C.miss;
        flashAnim = 0.25;
        resultText = 'はずれ';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.25);
        ball = null;
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    // Update trail
    for (var tri = trail.length - 1; tri >= 0; tri--) {
      trail[tri].life -= dt * 3;
      if (trail[tri].life <= 0) trail.splice(tri, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Targets
    for (var ti3 = 0; ti3 < targets.length; ti3++) {
      var t3 = targets[ti3];
      var pulse = 1 + Math.sin(t3.phase) * 0.1;
      game.draw.circle(t3.x, t3.y, t3.r * pulse + 10, C.target, 0.15);
      game.draw.circle(t3.x, t3.y, t3.r * pulse, C.target, 0.85);
      game.draw.circle(t3.x - t3.r * 0.3, t3.y - t3.r * 0.3, t3.r * 0.3, C.targetHi, 0.5);
      // Bullseye rings
      game.draw.circle(t3.x, t3.y, t3.r * 0.6, C.targetHi, 0.15);
      game.draw.circle(t3.x, t3.y, t3.r * 0.25, C.targetHi, 0.3);
    }

    // Spring base
    game.draw.circle(SPRING_X, SPRING_Y + 20, 40, C.spring, 0.8);
    game.draw.rect(SPRING_X - 4, SPRING_Y - MAX_PULL * 0.1, 8, MAX_PULL * 0.1 + 30, C.springHi, 0.8);

    // Pull indicator
    if (!ball) {
      // Draw potential launch arc indicator
      game.draw.circle(SPRING_X, SPRING_Y, MAX_PULL, C.spring, 0.06);
      game.draw.circle(SPRING_X, SPRING_Y, MAX_PULL, C.springHi, 0.03);
    }

    // Trail
    for (var tri2 = 0; tri2 < trail.length; tri2++) {
      var tp = trail[tri2];
      game.draw.circle(tp.x, tp.y, BALL_R * 0.5 * (tp.life / 0.3), C.trail.slice(0, 7), tp.life * 0.5);
    }

    // Ball
    if (ball) {
      game.draw.circle(ball.x + 5, ball.y + 5, BALL_R, '#000', 0.3);
      game.draw.circle(ball.x, ball.y, BALL_R, C.ball, 0.9);
      game.draw.circle(ball.x - 8, ball.y - 8, BALL_R * 0.3, C.ballHi, 0.5);
    } else {
      // Ball on spring
      game.draw.circle(SPRING_X + 5, SPRING_Y - BALL_R + 5, BALL_R, '#000', 0.25);
      game.draw.circle(SPRING_X, SPRING_Y - BALL_R, BALL_R, C.ball, 0.9);
      game.draw.circle(SPRING_X - 8, SPRING_Y - BALL_R - 8, BALL_R * 0.3, C.ballHi, 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: flashCol, bold: true });
    } else if (!ball) {
      game.draw.text('スワイプで狙って発射!', W / 2, H * 0.88, { size: 36, color: C.ui });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.spring : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnTarget();
    spawnTarget();
  });
})(game);
