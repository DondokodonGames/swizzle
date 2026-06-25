// 295-sand-timer.js
// 砂時計の番人 — 砂が落ちきる前にタップして砂時計をひっくり返せ
// 操作: タップで砂時計を反転
// 成功: 60秒間砂を切らさずに管理  失敗: 砂が完全に落ちきる or 60秒経過で失敗3回

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0612',
    glass:  '#1e1b4b',
    glassHi:'#312e81',
    sand1:  '#f59e0b',
    sand1Hi:'#fde68a',
    sand2:  '#d97706',
    neck:   '#4338ca',
    frame:  '#6d28d9',
    frameHi:'#8b5cf6',
    danger: '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var sandTop = 0;       // 0.0–1.0 (fraction of sand in top chamber)
  var sandBot = 1.0;     // sand in bottom
  var flipped = false;   // which way it's draining (true = draining to top)
  var DRAIN_RATE = 0.08; // per second
  var elapsed = 0;
  var survived = 0;
  var NEEDED = 60; // 60 seconds
  var fails = 0;
  var MAX_FAIL = 3;
  var done = false;
  var flipAnim = 0; // 0→1 animation
  var rotation = 0; // current display rotation (degrees)
  var targetRot = 0;
  var lastFlipTime = -10;
  var particles = [];
  var sandParticles = [];
  var totalElapsed = 0;

  function doFlip() {
    if (flipAnim > 0 && flipAnim < 1) return; // mid-animation
    var now = totalElapsed;
    if (now - lastFlipTime < 0.3) return;
    lastFlipTime = now;
    flipped = !flipped;
    flipAnim = 0.001;
    targetRot = flipped ? 180 : 0;
    game.audio.play('se_tap', 0.3);
    // Swap chambers
    var tmp = sandTop;
    sandTop = sandBot;
    sandBot = tmp;
    // Particles at neck
    for (var i = 0; i < 8; i++) {
      var ang = Math.random() * Math.PI * 2;
      sandParticles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 100, life: 0.5 });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    doFlip();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;
      totalElapsed += dt;
      survived = Math.min(totalElapsed, NEEDED);
      if (totalElapsed >= NEEDED) {
        done = true;
        setTimeout(function() { game.end.success(Math.round(survived * 100)); }, 400);
        return;
      }
    }

    // Animate flip
    if (flipAnim > 0 && flipAnim < 1) {
      flipAnim = Math.min(1, flipAnim + dt * 4);
      rotation = flipped
        ? 180 * flipAnim
        : 180 - 180 * flipAnim;
    } else {
      rotation = flipped ? 180 : 0;
    }

    // Drain sand from top → bottom
    if (!done) {
      var draining = Math.min(sandTop, DRAIN_RATE * dt);
      sandTop -= draining;
      sandBot += draining;

      // Clamp
      if (sandTop < 0) sandTop = 0;
      if (sandBot > 1) sandBot = 1;

      // Fail if top is empty (no more sand to drain — means we missed it)
      if (sandTop <= 0.001 && !done) {
        fails++;
        game.audio.play('se_failure', 0.6);
        // Reset: refill top
        sandTop = 1.0;
        sandBot = 0;
        flipped = false;
        rotation = 0;
        flipAnim = 0;
        for (var fi = 0; fi < 12; fi++) {
          var fang = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(fang) * 200, vy: Math.sin(fang) * 200, life: 0.6, col: C.danger });
        }
        if (fails >= MAX_FAIL) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    // Sand particles
    for (var sp = sandParticles.length - 1; sp >= 0; sp--) {
      sandParticles[sp].x += sandParticles[sp].vx * dt;
      sandParticles[sp].y += sandParticles[sp].vy * dt;
      sandParticles[sp].vy += 300 * dt;
      sandParticles[sp].life -= dt;
      if (sandParticles[sp].life <= 0) sandParticles.splice(sp, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    var cx = W / 2, cy = H * 0.48;
    var cos = Math.cos(rotation * Math.PI / 180);
    var sin = Math.sin(rotation * Math.PI / 180);

    // Hourglass shape (simplified rects)
    var GW = 260, GH = 500;
    var halfH = GH / 2;
    var neckH = 30;

    // Draw glass frame (2 triangles → rects for simplicity)
    // Top chamber
    var topFill = sandTop;
    var botFill = sandBot;

    // Visual representation: draw hourglass as static shape, sand fills from middle
    // Top glass
    game.draw.rect(cx - GW / 2, cy - halfH - 20, GW, halfH + 10, C.glassHi, 0.15);
    game.draw.rect(cx - GW / 2, cy - halfH - 20, GW, halfH + 10, C.glass, 0.6);
    // Top sand
    var topSandH = (halfH - neckH / 2) * topFill;
    game.draw.rect(cx - GW / 2 + 8, cy - halfH - 12 + (halfH - neckH / 2 - topSandH), GW - 16, topSandH, C.sand1, 0.9);
    game.draw.rect(cx - GW / 2 + 8, cy - halfH - 12 + (halfH - neckH / 2 - topSandH), GW - 16, 8, C.sand1Hi, 0.5);

    // Neck
    game.draw.rect(cx - 20, cy - neckH / 2, 40, neckH, C.neck, 0.9);

    // Bottom glass
    game.draw.rect(cx - GW / 2, cy + 10, GW, halfH + 10, C.glassHi, 0.15);
    game.draw.rect(cx - GW / 2, cy + 10, GW, halfH + 10, C.glass, 0.6);
    // Bottom sand
    var botSandH = (halfH - neckH / 2) * botFill;
    var botSandY = cy + 10 + (halfH - botSandH);
    game.draw.rect(cx - GW / 2 + 8, botSandY, GW - 16, botSandH, C.sand2, 0.9);

    // Frame lines
    game.draw.line(cx - GW / 2, cy - halfH - 20, cx - 20, cy - neckH / 2, C.frame, 8);
    game.draw.line(cx + GW / 2, cy - halfH - 20, cx + 20, cy - neckH / 2, C.frame, 8);
    game.draw.line(cx - GW / 2, cy + halfH + 20, cx - 20, cy + neckH / 2, C.frame, 8);
    game.draw.line(cx + GW / 2, cy + halfH + 20, cx + 20, cy + neckH / 2, C.frame, 8);
    // Top/bottom bars
    game.draw.rect(cx - GW / 2 - 10, cy - halfH - 30, GW + 20, 20, C.frameHi, 0.9);
    game.draw.rect(cx - GW / 2 - 10, cy + halfH + 10, GW + 20, 20, C.frameHi, 0.9);

    // Falling sand particle at neck
    if (topFill > 0.01 && !done) {
      var fallY = cy - neckH / 2 + (totalElapsed * 200 % (halfH - neckH / 2));
      game.draw.circle(cx, cy + fallY * 0.1, 6, C.sand1Hi, 0.8);
      game.draw.circle(cx, cy - neckH / 4, 5, C.sand1, 0.9);
    }

    // Danger indicator
    if (topFill < 0.2 && !done) {
      var blink = Math.sin(totalElapsed * 8) > 0;
      if (blink) game.draw.rect(cx - GW / 2, cy - halfH - 20, GW, halfH + 10, C.danger, 0.25);
    }

    // Sand particles
    for (var sp2 = 0; sp2 < sandParticles.length; sp2++) {
      var sp3 = sandParticles[sp2];
      game.draw.circle(sp3.x, sp3.y, 6 * sp3.life * 2, C.sand1Hi, sp3.life);
    }
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 1.5, p.col, p.life);
    }

    // Tap hint
    game.draw.text('タップで反転', W / 2, H * 0.87, { size: 42, color: C.ui });

    // Progress: sand level warning
    var pct = Math.round(topFill * 100);
    game.draw.text(pct + '%', cx - GW / 2 - 80, cy, { size: 36, color: topFill < 0.2 ? C.danger : C.sand1Hi });

    // Fail dots
    for (var fi2 = 0; fi2 < MAX_FAIL; fi2++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 30 + fi2 * 60, H * 0.93, 16, fi2 < fails ? C.danger : '#0a0510');
    }

    // Timer
    var timeRemain = Math.max(0, NEEDED - totalElapsed);
    var ratio = timeRemain / NEEDED;
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.frameHi : C.danger);
    game.draw.text(Math.ceil(timeRemain) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    sandTop = 1.0;
    sandBot = 0;
  });
})(game);
