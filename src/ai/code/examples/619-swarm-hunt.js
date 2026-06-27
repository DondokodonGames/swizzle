// 619-swarm-hunt.js
// スワームハント — 集団行動する虫の群れを効率よく一掃せよ
// 操作: タップで衝撃波を発生、密集している瞬間を狙え
// 成功: 60匹撃破  失敗: 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060a06',
    bug:     '#88cc44',
    bugHi:   '#ccff66',
    bugDark: '#446622',
    wave:    '#ffdd22',
    waveHi:  '#ffff88',
    killed:  '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a160a',
    safe:    '#22c55e'
  };

  var bugs = [];
  var killed = 0;
  var NEEDED = 60;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var waves = [];
  var flashAnim = 0;
  var spawnTimer = 0;

  // Boid parameters
  var ALIGN_R = 100, COHESION_R = 150, SEPARATE_R = 50;
  var ALIGN_W = 0.1, COHESION_W = 0.05, SEPARATE_W = 0.3;
  var BUG_SPEED = 120;
  var BUG_R = 12;

  function spawnBug() {
    var edge = Math.floor(Math.random() * 4);
    var x, y;
    if (edge === 0) { x = Math.random() * W; y = -20; }
    else if (edge === 1) { x = W + 20; y = Math.random() * H; }
    else if (edge === 2) { x = Math.random() * W; y = H + 20; }
    else { x = -20; y = Math.random() * H; }
    var ang = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 1.0;
    bugs.push({
      x: x, y: y,
      vx: Math.cos(ang) * BUG_SPEED,
      vy: Math.sin(ang) * BUG_SPEED,
      phase: Math.random() * Math.PI * 2,
      size: BUG_R + Math.random() * 6
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Shockwave
    waves.push({ x: tx, y: ty, r: 20, maxR: 200, life: 0.6, maxLife: 0.6 });
    game.audio.play('se_success', 0.4);
    // Kill bugs in blast zone (grows)
    var KILL_R = 140;
    for (var bi = bugs.length - 1; bi >= 0; bi--) {
      var b = bugs[bi];
      var dx = b.x - tx, dy = b.y - ty;
      if (dx * dx + dy * dy < KILL_R * KILL_R) {
        killed++;
        for (var p = 0; p < 4; p++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.3, col: C.bugHi });
        }
        bugs.splice(bi, 1);
        if (killed >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(killed * 200 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }
    flashAnim = 0.15;
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

    // Spawn bugs
    spawnTimer += dt;
    var targetCount = Math.min(30, 8 + Math.floor(elapsed * 0.5));
    if (bugs.length < targetCount && spawnTimer > 0.3) {
      spawnTimer = 0;
      spawnBug();
    }

    // Boid simulation
    for (var bi = 0; bi < bugs.length; bi++) {
      var b = bugs[bi];
      b.phase += dt * 4;
      var ax = 0, ay = 0;
      var alignX = 0, alignY = 0, alignN = 0;
      var cohX = 0, cohY = 0, cohN = 0;
      var sepX = 0, sepY = 0;

      for (var bj = 0; bj < bugs.length; bj++) {
        if (bi === bj) continue;
        var b2 = bugs[bj];
        var dx = b2.x - b.x, dy = b2.y - b.y;
        var d2 = dx * dx + dy * dy;
        var d = Math.sqrt(d2);
        if (d < ALIGN_R) { alignX += b2.vx; alignY += b2.vy; alignN++; }
        if (d < COHESION_R) { cohX += b2.x; cohY += b2.y; cohN++; }
        if (d < SEPARATE_R && d > 0) { sepX -= dx / d; sepY -= dy / d; }
      }
      if (alignN > 0) { ax += (alignX / alignN - b.vx) * ALIGN_W; ay += (alignY / alignN - b.vy) * ALIGN_W; }
      if (cohN > 0) { ax += (cohX / cohN - b.x) * COHESION_W * dt; ay += (cohY / cohN - b.y) * COHESION_W * dt; }
      ax += sepX * SEPARATE_W; ay += sepY * SEPARATE_W;

      // Wander toward center
      var cx = W / 2 - b.x, cy = H * 0.5 - b.y;
      var cd = Math.sqrt(cx * cx + cy * cy);
      if (cd > 200) { ax += cx / cd * 20 * dt; ay += cy / cd * 20 * dt; }

      b.vx += ax; b.vy += ay;
      // Clamp speed
      var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (spd > BUG_SPEED * 1.5) { b.vx = b.vx / spd * BUG_SPEED * 1.5; b.vy = b.vy / spd * BUG_SPEED * 1.5; }
      if (spd < BUG_SPEED * 0.5 && spd > 0) { b.vx = b.vx / spd * BUG_SPEED * 0.5; b.vy = b.vy / spd * BUG_SPEED * 0.5; }

      b.x += b.vx * dt; b.y += b.vy * dt;
      // Wrap edges
      if (b.x < -30) b.x = W + 30;
      if (b.x > W + 30) b.x = -30;
      if (b.y < -30) b.y = H + 30;
      if (b.y > H + 30) b.y = -30;
    }

    // Waves
    for (var wi = waves.length - 1; wi >= 0; wi--) {
      var w = waves[wi];
      w.r += (w.maxR - w.r) * dt * 5;
      w.life -= dt;
      if (w.life <= 0) waves.splice(wi, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Bug count density hint (background glow at swarm center)
    if (bugs.length > 5) {
      var sumX = 0, sumY = 0;
      for (var bi2 = 0; bi2 < bugs.length; bi2++) { sumX += bugs[bi2].x; sumY += bugs[bi2].y; }
      sumX /= bugs.length; sumY /= bugs.length;
      game.draw.circle(sumX, sumY, 80 + bugs.length * 4, C.bugDark, 0.12);
    }

    // Bugs
    for (var bi3 = 0; bi3 < bugs.length; bi3++) {
      var b3 = bugs[bi3];
      var ang2 = Math.atan2(b3.vy, b3.vx);
      var wiggle = Math.sin(b3.phase) * 0.3;
      var s = b3.size;
      // Body
      game.draw.circle(b3.x, b3.y, s, C.bugDark, 0.9);
      game.draw.circle(b3.x, b3.y, s * 0.7, C.bug, 0.8);
      game.draw.circle(b3.x - s * 0.2, b3.y - s * 0.2, s * 0.2, C.bugHi, 0.6);
      // Wings (simple ellipse suggestion)
      var wx = Math.cos(ang2 + Math.PI / 2) * s * 1.2;
      var wy = Math.sin(ang2 + Math.PI / 2) * s * 1.2;
      game.draw.circle(b3.x + wx * (1 + wiggle * 0.2), b3.y + wy * (1 + wiggle * 0.2), s * 0.7, C.bugHi, 0.15);
      game.draw.circle(b3.x - wx * (1 - wiggle * 0.2), b3.y - wy * (1 - wiggle * 0.2), s * 0.7, C.bugHi, 0.15);
    }

    // Waves
    for (var wi2 = 0; wi2 < waves.length; wi2++) {
      var w2 = waves[wi2];
      var wa = w2.life / w2.maxLife;
      game.draw.circle(w2.x, w2.y, w2.r, C.waveHi, wa * 0.5);
      game.draw.circle(w2.x, w2.y, w2.r * 0.6, C.wave, wa * 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.wave, flashAnim * 0.08);

    game.draw.text(killed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('群れ: ' + bugs.length + '匹', W / 2, 200, { size: 36, color: C.bugHi });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.killed);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    for (var i = 0; i < 8; i++) spawnBug();
  });
})(game);
