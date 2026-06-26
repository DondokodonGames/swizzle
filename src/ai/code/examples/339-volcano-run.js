// 339-volcano-run.js
// ボルケーノラン — 噴火する火山から逃げながら岩を避けて走れ
// 操作: タップでジャンプ、スワイプ左右で走る方向を変える
// 成功: 1500m逃げ切る  失敗: 岩に当たる3回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a0500',
    sky1:   '#3b0a00',
    sky2:   '#1a0500',
    lava:   '#dc2626',
    lava2:  '#ef4444',
    lavaHi: '#f97316',
    smoke:  '#57534e',
    ash:    '#78716c',
    ground: '#451a03',
    groundHi:'#713f12',
    runner: '#fde68a',
    runnerHi:'#fff',
    rock:   '#44403c',
    rockHi: '#57534e',
    danger: '#ef4444',
    ui:     '#78716c',
    text:   '#fef3c7'
  };

  var GROUND_Y = H * 0.8;
  var runnerX = W * 0.25;
  var runnerY = GROUND_Y - 30;
  var runnerVY = 0;
  var onGround = true;
  var GRAVITY = 1400;
  var JUMP_FORCE = -680;

  var rocks = [];
  var ashClouds = [];
  var lavaFront = W * 1.2; // lava wall chasing from behind (not used as visual, just a pressure mechanic)

  var scrollSpeed = 200;
  var distance = 0;
  var GOAL_DIST = 1500;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var elapsed = 0;
  var timeLeft = 35;
  var particles = [];
  var invincible = 0;
  var spawnTimer = 0;
  var eruptions = [];
  var horizonScroll = 0;

  function spawnRock() {
    var size = 30 + Math.random() * 40;
    var vy = -300 - Math.random() * 200;
    var vx = -scrollSpeed + (Math.random() - 0.5) * 60;
    rocks.push({
      x: W + size + Math.random() * 200,
      y: GROUND_Y - size,
      vx: vx,
      vy: vy,
      r: size,
      rolling: false
    });
  }

  function spawnAsh() {
    ashClouds.push({
      x: W + Math.random() * 200,
      y: H * 0.1 + Math.random() * H * 0.3,
      vx: -scrollSpeed * 0.7,
      vy: (Math.random() - 0.5) * 30,
      r: 40 + Math.random() * 60,
      life: 3 + Math.random() * 2
    });
  }

  game.onTap(function() {
    if (done) return;
    if (onGround) {
      runnerVY = JUMP_FORCE;
      onGround = false;
      game.audio.play('se_tap', 0.25);
    }
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up' && onGround) {
      runnerVY = JUMP_FORCE * 1.1;
      onGround = false;
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      scrollSpeed = 200 + elapsed * 8;
      distance += scrollSpeed * dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
      if (distance >= GOAL_DIST) {
        done = true;
        game.audio.play('se_success', 0.8);
        setTimeout(function() { game.end.success(Math.round(distance) + (MAX_HITS - hits) * 400 + Math.ceil(timeLeft) * 60); }, 400);
        return;
      }
    }

    if (invincible > 0) invincible -= dt;

    // Runner physics
    runnerVY += GRAVITY * dt;
    runnerY += runnerVY * dt;
    if (runnerY >= GROUND_Y - 30) {
      runnerY = GROUND_Y - 30;
      runnerVY = 0;
      onGround = true;
    }

    // Spawn rocks
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnRock();
      spawnTimer = 0.8 - Math.min(0.5, elapsed * 0.02);
      if (Math.random() < 0.4) spawnAsh();
    }

    // Eruption particles from volcano (far right of screen)
    if (Math.random() < dt * 3) {
      var eang = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      eruptions.push({ x: W * 0.9, y: H * 0.25, vx: Math.cos(eang) * (100 + Math.random() * 100), vy: Math.sin(eang) * (200 + Math.random() * 150), life: 1.0, col: Math.random() < 0.5 ? C.lava : C.lavaHi });
    }

    // Update rocks
    for (var ri = rocks.length - 1; ri >= 0; ri--) {
      var r = rocks[ri];
      r.vy += 800 * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      if (r.y >= GROUND_Y - r.r) {
        r.y = GROUND_Y - r.r;
        r.vy = -Math.abs(r.vy) * 0.5;
        r.rolling = true;
        if (Math.abs(r.vy) < 20) r.vy = 0;
      }
      if (r.rolling) r.x += r.vx * dt;

      // Collision
      if (invincible <= 0 && Math.hypot(runnerX - r.x, runnerY - r.y) < r.r + 26) {
        hits++;
        invincible = 1.5;
        game.audio.play('se_failure', 0.5);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: runnerX, y: runnerY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.rockHi });
        }
        if (hits >= MAX_HITS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }

      if (r.x < -200) rocks.splice(ri, 1);
    }

    // Update ash
    for (var ai = ashClouds.length - 1; ai >= 0; ai--) {
      var a = ashClouds[ai];
      a.x += a.vx * dt;
      a.life -= dt;
      if (a.life <= 0 || a.x < -200) ashClouds.splice(ai, 1);
    }

    // Update eruptions
    for (var ei = eruptions.length - 1; ei >= 0; ei--) {
      var e = eruptions[ei];
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.vy += 400 * dt;
      e.life -= dt;
      if (e.life <= 0) eruptions.splice(ei, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    horizonScroll = (horizonScroll + dt * 60) % 200;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky
    game.draw.rect(0, 0, W, H * 0.7, C.sky1, 0.7);
    game.draw.rect(0, 0, W, H * 0.4, C.sky2, 0.5);

    // Volcano silhouette
    game.draw.rect(W * 0.75, H * 0.15, 180, H * 0.65, '#0d0500', 0.9);
    game.draw.circle(W * 0.84, H * 0.15, 120, '#150800', 0.9);
    // Lava in crater
    game.draw.circle(W * 0.84, H * 0.17, 60, C.lava2, 0.8);
    game.draw.circle(W * 0.84, H * 0.16, 40, C.lavaHi, 0.7);

    // Ash clouds
    for (var ai2 = 0; ai2 < ashClouds.length; ai2++) {
      var a2 = ashClouds[ai2];
      game.draw.circle(a2.x, a2.y, a2.r, C.smoke, Math.min(0.5, a2.life * 0.15));
    }

    // Eruption particles
    for (var ei2 = 0; ei2 < eruptions.length; ei2++) {
      var e2 = eruptions[ei2];
      game.draw.circle(e2.x, e2.y, 16 * e2.life, e2.col, e2.life * 0.8);
    }

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 0.9);
    game.draw.rect(0, GROUND_Y, W, 16, C.groundHi, 0.8);
    // Ground markings (scroll)
    for (var gx = -horizonScroll; gx < W; gx += 200) {
      game.draw.line(gx, GROUND_Y + 8, gx + 80, GROUND_Y + 8, C.groundHi, 3);
    }

    // Rocks
    for (var ri2 = 0; ri2 < rocks.length; ri2++) {
      var r2 = rocks[ri2];
      game.draw.circle(r2.x, r2.y, r2.r + 4, C.rockHi, 0.2);
      game.draw.circle(r2.x, r2.y, r2.r, C.rock, 0.9);
      game.draw.circle(r2.x - r2.r * 0.3, r2.y - r2.r * 0.3, r2.r * 0.3, C.rockHi, 0.4);
    }

    // Runner
    var palpha = invincible > 0 ? (Math.sin(elapsed * 20) * 0.4 + 0.5) : 0.9;
    // Run animation
    var legOff = onGround ? Math.sin(elapsed * 12) * 14 : 0;
    game.draw.circle(runnerX, runnerY - 14, 22, C.runnerHi, 0.9 * palpha); // head
    game.draw.line(runnerX, runnerY, runnerX - 10, runnerY + 30, C.runner, 12); // body
    game.draw.line(runnerX - 10, runnerY + 30, runnerX - 16 + legOff, runnerY + 56, C.runner, 10); // left leg
    game.draw.line(runnerX - 10, runnerY + 30, runnerX + 6 - legOff, runnerY + 56, C.runner, 10); // right leg
    game.draw.line(runnerX, runnerY + 6, runnerX - 26, runnerY + 16, C.runner, 10); // left arm
    game.draw.line(runnerX, runnerY + 6, runnerX + 20, runnerY + 6, C.runner, 10); // right arm

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 28 + hi * 56, H * 0.9, 16, hi < hits ? C.danger : '#1a0500');
    }

    // Progress
    var ratio = Math.min(1, distance / GOAL_DIST);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.6 ? C.groundHi : C.lavaHi);
    game.draw.text(Math.round(distance) + 'm / ' + GOAL_DIST + 'm', W / 2, 36, { size: 36, color: '#fff', bold: true });
    game.draw.text(Math.ceil(timeLeft) + 's', W * 0.85, 36, { size: 36, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.5;
  });
})(game);
