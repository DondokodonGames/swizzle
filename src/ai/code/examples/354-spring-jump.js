// 354-spring-jump.js
// スプリングジャンプ — バネのタイミングで高く跳んで浮かぶ星を掴め
// 操作: タップでバネを押す（長押しで溜める、離すで発射）
// 成功: 星を12個収集  失敗: バネから落ちる3回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020b18',
    sky1:   '#0a1628',
    sky2:   '#051020',
    spring: '#22c55e',
    springHi:'#86efac',
    springBase:'#15803d',
    ball:   '#fbbf24',
    ballHi: '#fef3c7',
    star:   '#f59e0b',
    starHi: '#fef08a',
    platform:'#374151',
    platformHi:'#4b5563',
    danger: '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var GROUND_Y = H * 0.82;
  var springX = W / 2;
  var springBaseY = GROUND_Y;
  var springCompress = 0; // 0=natural, 1=fully compressed
  var SPRING_NATURAL = 120;

  var ballX = W / 2;
  var ballY = GROUND_Y - SPRING_NATURAL - 30;
  var ballVY = 0;
  var ballVX = 0;
  var BALL_R = 30;
  var onSpring = true;
  var pressing = false;
  var chargeTime = 0;

  var stars = [];
  var collected = 0;
  var NEEDED = 12;
  var falls = 0;
  var MAX_FALLS = 3;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var particles = [];
  var trail = [];
  var cameraY = 0;

  function spawnStars() {
    stars = [];
    for (var i = 0; i < NEEDED + 3; i++) {
      stars.push({
        x: W * 0.1 + Math.random() * W * 0.8,
        y: GROUND_Y - 300 - Math.random() * 1200,
        r: 28,
        collected: false,
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  game.onTap(function() {
    if (done) return;
    if (onSpring) {
      pressing = true;
      chargeTime = 0;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Charge spring while pressing
    if (pressing && onSpring) {
      chargeTime = Math.min(chargeTime + dt, 1.0);
      springCompress = chargeTime;
    }

    // Detect release (simulated: auto-launch after 0.8s charge, or on second tap)
    // Since onTap fires on press, we launch on second tap
    // Actually let's auto-launch at max charge after 0.7s
    if (pressing && chargeTime >= 0.7) {
      // Launch!
      var launchPower = 900 + chargeTime * 400;
      ballVY = -launchPower;
      ballVX = (Math.random() - 0.5) * 200;
      onSpring = false;
      pressing = false;
      springCompress = 0;
      game.audio.play('se_tap', 0.5);
    }

    if (!onSpring) {
      // Physics
      ballVY += 500 * dt;
      ballX += ballVX * dt;
      ballY += ballVY * dt;

      // Bounce off walls
      if (ballX < BALL_R) { ballX = BALL_R; ballVX = Math.abs(ballVX); }
      if (ballX > W - BALL_R) { ballX = W - BALL_R; ballVX = -Math.abs(ballVX); }

      // Trail
      trail.push({ x: ballX, y: ballY, life: 0.3 });

      // Check star collection
      for (var si = 0; si < stars.length; si++) {
        var s = stars[si];
        if (!s.collected && Math.hypot(ballX - s.x, ballY - s.y) < BALL_R + s.r) {
          s.collected = true;
          collected++;
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: s.x, y: s.y, vx: Math.cos(ang)*160, vy: Math.sin(ang)*160, life:0.5, col: C.starHi });
          }
          if (collected >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(collected * 300 + Math.ceil(timeLeft) * 80); }, 500);
            return;
          }
        }
      }

      // Land on spring
      if (ballY >= GROUND_Y - SPRING_NATURAL - BALL_R && Math.abs(ballX - springX) < 80) {
        ballY = GROUND_Y - SPRING_NATURAL - BALL_R;
        ballVY = 0;
        ballVX = 0;
        onSpring = true;
        springCompress = 0;
        game.audio.play('se_tap', 0.2);
      } else if (ballY > GROUND_Y + 100) {
        // Fell off spring
        falls++;
        game.audio.play('se_failure', 0.5);
        ballX = springX;
        ballY = GROUND_Y - SPRING_NATURAL - BALL_R;
        ballVX = 0;
        ballVY = 0;
        onSpring = true;
        if (falls >= MAX_FALLS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }
    }

    // Camera
    cameraY = Math.min(0, ballY - H * 0.4);
    if (onSpring) cameraY = 0;

    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }
    for (var ss = 0; ss < stars.length; ss++) {
      if (!stars[ss].collected) stars[ss].wobble += dt * 2;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky1, 0.5);

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s2 = stars[si2];
      if (s2.collected) continue;
      var sy = s2.y - cameraY;
      if (sy < -60 || sy > H + 60) continue;
      var sw = Math.sin(s2.wobble) * 4;
      game.draw.circle(s2.x, sy, s2.r + sw, C.star, 0.8);
      game.draw.circle(s2.x, sy, s2.r * 0.5 + sw * 0.5, C.starHi, 0.9);
    }

    // Ground
    game.draw.rect(0, GROUND_Y - cameraY, W, H - GROUND_Y + cameraY, C.platform, 0.9);
    game.draw.rect(0, GROUND_Y - cameraY, W, 16, C.platformHi, 0.8);

    // Spring
    var springTop = GROUND_Y - SPRING_NATURAL * (1 - springCompress * 0.7);
    var segments = 6;
    for (var seg = 0; seg < segments; seg++) {
      var sy2 = GROUND_Y - cameraY - (seg / segments) * (GROUND_Y - springTop);
      var sx = springX + Math.sin(seg * 1.2) * 20;
      var nextSy = GROUND_Y - cameraY - ((seg + 1) / segments) * (GROUND_Y - springTop);
      var nextSx = springX + Math.sin((seg + 1) * 1.2) * 20;
      game.draw.line(sx, sy2, nextSx, nextSy, C.spring, 10);
    }
    game.draw.rect(springX - 50, GROUND_Y - 20 - cameraY, 100, 24, C.springBase, 0.9);

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y - cameraY, 12 * t.life * 3, C.ball, t.life * 0.5);
    }

    // Ball
    var bsy = ballY - cameraY;
    game.draw.circle(ballX, bsy, BALL_R + 4, C.ballHi, 0.2);
    game.draw.circle(ballX, bsy, BALL_R, C.ball, 0.9);
    game.draw.circle(ballX - BALL_R * 0.3, bsy - BALL_R * 0.3, BALL_R * 0.3, C.ballHi, 0.7);

    // Charge indicator
    if (pressing && onSpring) {
      var chargeColor = chargeTime > 0.5 ? C.springHi : C.spring;
      game.draw.rect(W * 0.2, H * 0.9, W * 0.6 * chargeTime, 16, chargeColor, 0.9);
      game.draw.rect(W * 0.2, H * 0.9, W * 0.6, 16, '#1a1a1a', 0.3);
    }

    if (onSpring && !pressing) {
      game.draw.text('タップで溜める！', W / 2, H * 0.92, { size: 40, color: C.ui });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y - cameraY, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 28 + fi * 56, H * 0.96, 14, fi < falls ? C.danger : '#0a0a10');
    }

    game.draw.text(collected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.spring : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    spawnStars();
  });
})(game);
