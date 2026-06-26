// 409-ramp-jump.js
// スロープジャンプ — タイミングよくジャンプして遠くへ飛ぶ
// 操作: ランプの端でタップしてジャンプ、角度と力を合わせる
// 成功: 合計5000m飛ぶ  失敗: 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020c14',
    sky:    '#0c1a2e',
    ground: '#15803d',
    groundHi:'#16a34a',
    ramp:   '#92400e',
    rampHi: '#b45309',
    player: '#f97316',
    playerHi:'#fed7aa',
    trail:  '#fbbf24',
    snow:   '#f1f5f9',
    distance:'#22d3ee',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var RAMP_X = W * 0.12;
  var RAMP_Y = H * 0.75;
  var RAMP_W = 280;
  var RAMP_ANG = -Math.PI / 4;  // 45 degrees upward

  var phase = 'approach';  // approach, airborne, landed
  var playerX = -60;
  var playerY = RAMP_Y;
  var playerVX = 380;
  var playerVY = 0;
  var playerAngle = 0;
  var APPROACH_SPEED = 380;

  var jumped = false;
  var jumpPower = 0;
  var jumpAtX = 0;
  var totalDist = 0;
  var NEEDED_DIST = 5000;
  var attempts = 0;
  var bestDist = 0;
  var trail = [];
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var landingFlash = 0;
  var landingDist = 0;

  var clouds = [];
  for (var ci = 0; ci < 5; ci++) {
    clouds.push({ x: Math.random()*W, y: H*0.08+Math.random()*H*0.15, w: 100+Math.random()*160 });
  }

  function resetApproach() {
    phase = 'approach';
    playerX = -60;
    playerY = RAMP_Y;
    playerVX = APPROACH_SPEED;
    playerVY = 0;
    playerAngle = 0;
    jumped = false;
    trail = [];
  }

  function getRampEndX() { return RAMP_X + RAMP_W; }
  function getRampEndY() { return RAMP_Y - Math.tan(-RAMP_ANG)*RAMP_W; }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'approach') return;
    if (jumped) return;
    jumped = true;
    jumpAtX = playerX;
    // Power based on proximity to ramp end
    var rampEndX = getRampEndX();
    var dist = Math.abs(playerX - rampEndX);
    jumpPower = Math.max(0, 1 - dist / 200);
    // Launch angle: ramp angle + jump boost
    var launchAng = RAMP_ANG - Math.PI/4 * jumpPower;
    var speed = 600 + jumpPower * 500;
    playerVX = Math.cos(launchAng) * speed;
    playerVY = Math.sin(launchAng) * speed;
    phase = 'airborne';
    game.audio.play('se_tap', 0.5);
    for (var pi = 0; pi < 8; pi++) {
      var ang = launchAng - Math.PI/4 + Math.random()*Math.PI/2;
      particles.push({ x:playerX, y:playerY, vx:Math.cos(ang)*200, vy:Math.sin(ang)*200, life:0.6, col:C.trail });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (landingFlash > 0) landingFlash -= dt * 2;

    if (phase === 'approach') {
      playerX += APPROACH_SPEED * dt;
      // Follow ramp slope when on it
      if (playerX > RAMP_X && playerX < getRampEndX()) {
        var rampProgress = (playerX - RAMP_X) / RAMP_W;
        playerY = RAMP_Y - Math.tan(-RAMP_ANG) * (playerX - RAMP_X);
        playerAngle = RAMP_ANG;
      } else {
        playerY = RAMP_Y;
        playerAngle = 0;
      }
      // Auto-jump if past ramp without tapping (punish late)
      if (playerX > getRampEndX() + 100 && !jumped) {
        jumped = true;
        playerVX = APPROACH_SPEED;
        playerVY = -100;
        phase = 'airborne';
      }
    }

    if (phase === 'airborne') {
      trail.push({ x:playerX, y:playerY, life:0.8 });
      if (trail.length > 30) trail.shift();
      for (var ti = trail.length-1; ti >= 0; ti--) trail[ti].life -= dt*2;

      playerVY += 700 * dt;  // gravity
      playerVX *= (1 - 0.3*dt);  // air resistance
      playerX += playerVX * dt;
      playerY += playerVY * dt;
      playerAngle = Math.atan2(playerVY, playerVX);

      // Landing
      if (playerY >= H*0.88) {
        playerY = H*0.88;
        var flightDist = Math.max(0, playerX - getRampEndX());
        landingDist = Math.round(flightDist * 0.5);
        totalDist += landingDist;
        if (landingDist > bestDist) bestDist = landingDist;
        landingFlash = 0.6;
        attempts++;
        game.audio.play('se_success', Math.min(0.8, landingDist/500));
        for (var pi2 = 0; pi2 < 10; pi2++) {
          var ang2 = -Math.PI/2 + (Math.random()-0.5)*Math.PI;
          particles.push({ x:playerX, y:H*0.88, vx:Math.cos(ang2)*150, vy:Math.sin(ang2)*200, life:0.6, col:C.ground });
        }
        if (totalDist >= NEEDED_DIST && !done) { done = true; setTimeout(function(){ game.end.success(totalDist+Math.ceil(timeLeft)*80); }, 800); return; }
        phase = 'landed';
        setTimeout(function(){ resetApproach(); }, 1200);
      }

      // Off right edge
      if (playerX > W*2 && phase === 'airborne') {
        playerY = H*0.88;
        phase = 'landed';
        setTimeout(function(){ resetApproach(); }, 1200);
      }
    }

    // Clouds
    for (var ci2 = 0; ci2 < clouds.length; ci2++) clouds[ci2].x -= 20*dt;

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].vy += 300*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H*0.88, C.sky, 0.6);

    // Clouds
    for (var ci3 = 0; ci3 < clouds.length; ci3++) {
      var cl = clouds[ci3];
      if (cl.x < -200) cl.x = W+200;
      game.draw.circle(cl.x, cl.y, cl.w*0.35, C.snow, 0.12);
      game.draw.circle(cl.x+cl.w*0.22, cl.y+8, cl.w*0.28, C.snow, 0.1);
    }

    // Ground
    game.draw.rect(0, H*0.88, W, H*0.12, C.ground, 0.9);
    game.draw.rect(0, H*0.88, W, 20, C.groundHi, 0.6);

    // Ramp
    var rex = getRampEndX(), rey = getRampEndY();
    game.draw.line(RAMP_X, RAMP_Y, rex, rey, C.rampHi, 16);
    game.draw.line(RAMP_X, RAMP_Y, rex, rey, C.ramp, 10);
    game.draw.line(RAMP_X, RAMP_Y, RAMP_X, H*0.88, C.ramp, 12);
    game.draw.line(rex, RAMP_Y, RAMP_X, RAMP_Y, C.ramp, 12);

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      if (t.life > 0) game.draw.circle(t.x, t.y, 14*t.life, C.trail, t.life*0.5);
    }

    // Player
    if (playerX > -40 && playerX < W+200) {
      game.draw.circle(playerX, playerY, 30, C.playerHi, 0.15);
      game.draw.circle(playerX, playerY, 24, C.player, 0.9);
      game.draw.circle(playerX-8, playerY-8, 10, C.playerHi, 0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.8);
    }

    if (landingFlash > 0) {
      game.draw.rect(0, 0, W, H, C.distance, landingFlash*0.1);
      game.draw.text(landingDist+'m!', W/2, H*0.5, { size: 80, color: C.distance, bold: true });
    }

    // Jump zone indicator
    if (phase === 'approach' && playerX > RAMP_X - 80) {
      var prog = Math.max(0, 1 - Math.abs(playerX - getRampEndX()) / 200);
      game.draw.circle(getRampEndX(), getRampEndY(), 30+prog*30, prog > 0.6 ? C.trail : C.ramp, prog*0.5);
      if (prog > 0.5) game.draw.text('今！', getRampEndX(), getRampEndY()-60, { size: 56, color: C.trail, bold: true });
    }

    game.draw.text(Math.floor(totalDist) + ' / ' + NEEDED_DIST + 'm', W/2, 148, { size: 52, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.distance : C.player);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    resetApproach();
  });
})(game);
