// 386-bubble-drift.js
// バブルドリフト — 浮かぶシャボン玉を針で避けながら上へ運ぶ
// 操作: タップで泡を弾く
// 成功: 高さ800mに到達  失敗: 針に3回触れる or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020b18',
    sky:    '#061a30',
    bubble: '#7dd3fc',
    bubbleHi:'#e0f2fe',
    bubbleIn:'#0369a1',
    needle: '#ef4444',
    needleHi:'#fca5a5',
    cloud:  '#1e3a5f',
    goal:   '#fbbf24',
    goalHi: '#fef3c7',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  // Bubble (the one you're protecting)
  var bx = W / 2;
  var by = H * 0.7;
  var bvx = 0;
  var bvy = -60;   // naturally floats up
  var BUBBLE_R = 60;
  var GRAVITY = -120;

  // Camera
  var cameraAlt = 0;
  var GOAL = 800;
  var pops = 0;
  var MAX_POPS = 3;

  // Needles (falling spikes)
  var needles = [];
  var spawnTimer = 0;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var popFlash = 0;

  function spawnNeedle() {
    var lane = Math.floor(Math.random() * 5);
    needles.push({
      x: 80 + lane * ((W - 160) / 4),
      y: -cameraAlt * 0.1 - 80,
      speed: 200 + Math.random() * 200,
      len: 60 + Math.random() * 40
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Push bubble away from tap
    var dx = bx - tx, dy = by - (ty - cameraAlt * 0.1);
    var dist = Math.sqrt(dx*dx+dy*dy) || 1;
    var pushStrength = 500;
    bvx += (dx / dist) * pushStrength;
    bvy += (dy / dist) * pushStrength - 100;
    game.audio.play('se_tap', 0.2);
    for (var pi = 0; pi < 3; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: bx, y: by - cameraAlt * 0.1, vx: Math.cos(ang)*80, vy: Math.sin(ang)*80, life:0.3, col: C.bubbleHi });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (popFlash > 0) popFlash -= dt * 3;

    // Bubble physics
    bvy += GRAVITY * dt;  // floats up
    bvy *= (1 - 0.5 * dt);
    bvx *= (1 - 1.5 * dt);
    bx += bvx * dt;
    by += bvy * dt;

    // Wall bounce
    if (bx - BUBBLE_R < 0) { bx = BUBBLE_R; bvx = Math.abs(bvx) * 0.6; }
    if (bx + BUBBLE_R > W) { bx = W - BUBBLE_R; bvx = -Math.abs(bvx) * 0.6; }

    // Camera follows bubble
    var screenBy = by - cameraAlt * 0.1;
    if (screenBy < H * 0.45) {
      var delta = H * 0.45 - screenBy;
      cameraAlt = Math.max(cameraAlt, cameraAlt + delta / 0.1);
      cameraAlt -= delta / 0.1;
      // Simpler: just track altitude
    }

    // Altitude based on how high bubble went
    var alt = Math.max(0, (H * 0.7 - by) * 0.5);
    if (alt >= GOAL && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      for (var pi2 = 0; pi2 < 20; pi2++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: bx, y: by, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200, life:0.8, col: C.goal });
      }
      game.end.success(Math.round(alt * 2) + (MAX_POPS - pops) * 400 + Math.ceil(timeLeft) * 80);
      return;
    }

    // Spawn needles
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnNeedle();
      spawnTimer = 0.7 + Math.random() * 0.6;
    }

    // Update needles
    for (var ni = needles.length - 1; ni >= 0; ni--) {
      needles[ni].y += needles[ni].speed * dt;
      var nd = needles[ni];

      // Needle tip hits bubble
      if (Math.hypot(bx - nd.x, by - (nd.y + nd.len)) < BUBBLE_R) {
        pops++;
        popFlash = 1;
        game.audio.play('se_failure', 0.5);
        for (var pi3 = 0; pi3 < 12; pi3++) {
          var ang3 = Math.random() * Math.PI * 2;
          particles.push({ x: bx, y: by, vx: Math.cos(ang3)*200, vy: Math.sin(ang3)*200, life:0.6, col: C.bubble });
        }
        needles.splice(ni, 1);
        // Reset bubble position
        bvx = 0; bvy = -60;
        bx = W / 2; by = H * 0.7;
        if (pops >= MAX_POPS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
        continue;
      }

      if (nd.y > H + 100) needles.splice(ni, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.8);

    if (popFlash > 0) game.draw.rect(0, 0, W, H, C.needleHi, popFlash * 0.15);

    // Background clouds
    for (var ci = 0; ci < 5; ci++) {
      var cy2 = H * 0.2 + ci * H * 0.15 + elapsed * 10 % (H * 0.15);
      var cx2 = 100 + ci * (W / 4);
      game.draw.circle(cx2, cy2, 70, C.cloud, 0.4);
      game.draw.circle(cx2 + 50, cy2 + 20, 50, C.cloud, 0.35);
    }

    // Needles
    for (var ni2 = 0; ni2 < needles.length; ni2++) {
      var nd2 = needles[ni2];
      game.draw.line(nd2.x, nd2.y, nd2.x, nd2.y + nd2.len, C.needle, 8);
      game.draw.circle(nd2.x, nd2.y, 8, C.needleHi, 0.9);
    }

    // Bubble
    game.draw.circle(bx, by, BUBBLE_R + 16, C.bubble, 0.08);
    game.draw.circle(bx, by, BUBBLE_R, C.bubble, 0.25);
    // Rainbow shimmer effect
    game.draw.circle(bx, by, BUBBLE_R - 4, C.bubbleHi, 0.12);
    game.draw.line(bx - BUBBLE_R * 0.6, by - BUBBLE_R * 0.5, bx - BUBBLE_R * 0.2, by - BUBBLE_R * 0.7, C.bubbleHi, 6);
    game.draw.circle(bx - BUBBLE_R * 0.5, by - BUBBLE_R * 0.6, 10, C.bubbleHi, 0.7);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Pop dots
    for (var pi4 = 0; pi4 < MAX_POPS; pi4++) {
      game.draw.circle(W/2 - (MAX_POPS-1)*40 + pi4*80, H*0.94, 16, pi4 < pops ? C.needle : C.sky, 0.9);
    }

    // Altitude progress
    var alt2 = Math.max(0, (H * 0.7 - by) * 0.5);
    var prog = Math.min(1, alt2 / GOAL);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * prog, 72, C.bubble);
    game.draw.text(Math.round(alt2) + 'm / ' + GOAL + 'm', W / 2, 36, { size: 40, color: '#fff', bold: true });
    game.draw.text(Math.ceil(timeLeft) + 's', W * 0.88, 36, { size: 36, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnTimer = 1.0;
  });
})(game);
