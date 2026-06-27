// 704-laser-aim.js
// レーザー狙撃 — 回転する照準を合わせてターゲットを撃ち抜け
// 操作: タップで発射（照準がターゲット上にある瞬間に）
// 成功: 20体撃破  失敗: 10発外す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020810',
    reticle: '#ef4444',
    retHi:   '#fca5a5',
    target:  '#22c55e',
    tarHi:   '#86efac',
    laser:   '#ef4444',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#04060f'
  };

  var CX = W / 2;
  var CY = H * 0.45;
  var ORBIT_R = 280; // reticle orbits this radius around center
  var RETICLE_R = 60;
  var TARGET_R = 52;

  var reticleAngle = 0;
  var reticleSpeed = 1.8; // radians per second
  var reticleX = CX;
  var reticleY = CY;

  var target = { x: CX, y: CY, angle: 0, orbitR: 0 };
  var laserBeam = null; // { x1,y1,x2,y2, life }

  var hits = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var targetFlash = 0;

  function placeTarget() {
    // Place target at random position within inner circle
    var angle = Math.random() * Math.PI * 2;
    var r = 80 + Math.random() * 180;
    target.x = CX + Math.cos(angle) * r;
    target.y = CY + Math.sin(angle) * r;
    targetFlash = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Shoot laser from center toward reticle position
    var dx = reticleX - CX;
    var dy = reticleY - CY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var dirX = dist > 0 ? dx / dist : 1;
    var dirY = dist > 0 ? dy / dist : 0;

    // Extend laser to edge of screen
    var laserEndX = CX + dirX * 1200;
    var laserEndY = CY + dirY * 1200;

    laserBeam = { x1: CX, y1: CY, x2: laserEndX, y2: laserEndY, life: 0.25 };
    game.audio.play('se_tap', 0.15);

    // Check hit: does laser pass near target?
    // Line-point distance
    var tdx = target.x - CX;
    var tdy = target.y - CY;
    var t = tdx * dirX + tdy * dirY;
    var closestX = CX + dirX * t;
    var closestY = CY + dirY * t;
    var perpDist = Math.sqrt((target.x - closestX) * (target.x - closestX) + (target.y - closestY) * (target.y - closestY));

    if (perpDist < TARGET_R + 15 && t > 0) {
      // Hit!
      hits++;
      targetFlash = 0.8;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = '命中！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.5);
      for (var p = 0; p < 7; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: target.x, y: target.y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.tarHi });
      }
      placeTarget();
      // Speed up slightly
      reticleSpeed = Math.min(3.8, 1.8 + hits * 0.08);
      if (hits >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(hits * 400 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      // Miss
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = 'ミス！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (targetFlash > 0) targetFlash -= dt * 3;

    // Reticle orbits center
    reticleAngle += reticleSpeed * dt;
    reticleX = CX + Math.cos(reticleAngle) * ORBIT_R;
    reticleY = CY + Math.sin(reticleAngle) * ORBIT_R;

    if (laserBeam) {
      laserBeam.life -= dt * 4;
      if (laserBeam.life <= 0) laserBeam = null;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Orbit ring (faint)
    for (var seg = 0; seg < 36; seg++) {
      var a1 = seg * Math.PI * 2 / 36;
      var ox = CX + Math.cos(a1) * ORBIT_R;
      var oy = CY + Math.sin(a1) * ORBIT_R;
      game.draw.circle(ox, oy, 4, '#ffffff08', 1);
    }

    // Grid lines (faint crosshair background)
    game.draw.line(0, CY, W, CY, '#ffffff05', 2);
    game.draw.line(CX, 0, CX, H, '#ffffff05', 2);

    // Target
    var tAlpha = 0.85 + targetFlash * 0.15;
    game.draw.circle(target.x + 4, target.y + 4, TARGET_R, '#000', 0.3);
    game.draw.circle(target.x, target.y, TARGET_R, C.target, tAlpha);
    game.draw.circle(target.x, target.y, TARGET_R * 0.55, C.tarHi, tAlpha * 0.3);
    // Crosshair on target
    game.draw.line(target.x - TARGET_R, target.y, target.x + TARGET_R, target.y, C.tarHi, 3);
    game.draw.line(target.x, target.y - TARGET_R, target.x, target.y + TARGET_R, C.tarHi, 3);
    if (targetFlash > 0) {
      game.draw.circle(target.x, target.y, TARGET_R + 20, C.correct, targetFlash * 0.35);
    }

    // Laser beam
    if (laserBeam) {
      game.draw.line(laserBeam.x1, laserBeam.y1, laserBeam.x2, laserBeam.y2, C.laser, 4);
      game.draw.line(laserBeam.x1, laserBeam.y1, laserBeam.x2, laserBeam.y2, '#fca5a5', 2);
    }

    // Gun (center circle)
    game.draw.circle(CX + 3, CY + 3, 24, '#000', 0.4);
    game.draw.circle(CX, CY, 24, '#334155', 0.9);
    game.draw.circle(CX, CY, 12, '#94a3b8', 0.9);

    // Line from gun to reticle
    game.draw.line(CX, CY, reticleX, reticleY, '#ef444422', 2);

    // Reticle
    game.draw.circle(reticleX + 3, reticleY + 3, RETICLE_R, '#000', 0.3);
    game.draw.circle(reticleX, reticleY, RETICLE_R, C.reticle, 0.15);
    game.draw.circle(reticleX, reticleY, RETICLE_R, C.reticle, 0);
    // Reticle crosshair
    game.draw.line(reticleX - RETICLE_R, reticleY, reticleX + RETICLE_R, reticleY, C.reticle, 4);
    game.draw.line(reticleX, reticleY - RETICLE_R, reticleX, reticleY + RETICLE_R, C.reticle, 4);
    game.draw.circle(reticleX, reticleY, 10, C.retHi, 0.9);
    game.draw.circle(reticleX, reticleY, RETICLE_R, C.reticle, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 64, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi += 2) {
      game.draw.circle(W / 2 - (MAX_MISS / 2 - 1) * 52 + (mi / 2) * 104, H * 0.955, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    placeTarget();
  });
})(game);
