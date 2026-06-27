// 721-crystal-crack.js
// クリスタル割り — 弱点を見つけてクリスタルを正確に叩き割れ
// 操作: タップ — 光る弱点スポットに当てると割れる
// 成功: 20個割る  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020614',
    crystal: '#818cf8',
    crystHi: '#c7d2fe',
    crack:   '#e0e7ff',
    weak:    '#f59e0b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#04081c'
  };

  var CX = W / 2;
  var CY = H * 0.45;

  var CRYSTAL_W = 220;
  var CRYSTAL_H = 300;

  // Weak spot: rotates around crystal
  var weakAngle = 0;
  var WEAK_SPEED = 1.8;
  var WEAK_R = 22;
  var ORBIT_R = 160;

  var crystalHealth = 3;
  var crackLines = [];
  var shakeX = 0, shakeY = 0, shakeTimer = 0;
  var glowAnim = 0;

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function resetCrystal() {
    crystalHealth = 3;
    crackLines = [];
    WEAK_SPEED = Math.min(4.5, 1.8 + score * 0.12);
  }

  function weakX() { return CX + Math.cos(weakAngle) * ORBIT_R; }
  function weakY() { return CY + Math.sin(weakAngle) * ORBIT_R; }

  game.onTap(function(tx, ty) {
    if (done) return;
    var wx = weakX(), wy = weakY();
    var dx = tx - wx, dy = ty - wy;
    if (dx * dx + dy * dy < (WEAK_R + 36) * (WEAK_R + 36)) {
      // Hit weak spot
      crystalHealth--;
      shakeTimer = 0.15;
      shakeX = (Math.random() - 0.5) * 24;
      shakeY = (Math.random() - 0.5) * 24;
      game.audio.play('se_tap', 0.15);
      // Add crack line through crystal
      crackLines.push({
        x1: CX + (Math.random() - 0.5) * CRYSTAL_W,
        y1: CY - CRYSTAL_H / 2,
        x2: CX + (Math.random() - 0.5) * CRYSTAL_W,
        y2: CY + CRYSTAL_H / 2
      });
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: wx, y: wy, vx: Math.cos(pa)*160, vy: Math.sin(pa)*160, life: 0.4, col: C.weak });
      }
      if (crystalHealth <= 0) {
        // Crystal shattered!
        score++;
        glowAnim = 0.5;
        flashCol = C.correct;
        flashAnim = 0.35;
        resultText = '粉砕！';
        resultTimer = 0.6;
        game.audio.play('se_success', 0.6);
        for (var p2 = 0; p2 < 10; p2++) {
          var pa2 = Math.random() * Math.PI * 2;
          var sp = 180 + Math.random() * 200;
          particles.push({ x: CX, y: CY, vx: Math.cos(pa2)*sp, vy: Math.sin(pa2)*sp, life: 0.55, col: C.crystHi });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 80); }, 700);
        } else {
          setTimeout(function() { resetCrystal(); }, 400);
        }
      }
    } else {
      // Miss
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.25;
      resultText = 'ミス！';
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.25);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
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

    weakAngle += WEAK_SPEED * dt;
    if (shakeTimer > 0) { shakeTimer -= dt; } else { shakeX *= 0.7; shakeY *= 0.7; }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (glowAnim > 0) glowAnim -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var cx = CX + shakeX, cy = CY + shakeY;
    var wx = cx + Math.cos(weakAngle) * ORBIT_R;
    var wy = cy + Math.sin(weakAngle) * ORBIT_R;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Crystal body (diamond shape via overlapping rects)
    var alpha = crystalHealth > 0 ? 0.85 : 0.2;
    game.draw.rect(cx - CRYSTAL_W / 2 + 4, cy - CRYSTAL_H / 2 + 4, CRYSTAL_W, CRYSTAL_H, '#000', 0.25);
    game.draw.rect(cx - CRYSTAL_W / 2, cy - CRYSTAL_H / 2, CRYSTAL_W, CRYSTAL_H, C.crystal, alpha);
    // Highlight facets
    game.draw.rect(cx - CRYSTAL_W / 2, cy - CRYSTAL_H / 2, CRYSTAL_W, 12, C.crystHi, 0.35);
    game.draw.rect(cx - CRYSTAL_W / 2, cy - CRYSTAL_H / 2, 12, CRYSTAL_H, C.crystHi, 0.2);

    // Health indicators
    for (var hi = 0; hi < 3; hi++) {
      game.draw.circle(cx - 40 + hi * 40, cy + CRYSTAL_H / 2 + 36, 14,
        hi < crystalHealth ? C.crystHi : '#1e1b4b', 0.9);
    }

    // Crack lines
    for (var ci = 0; ci < crackLines.length; ci++) {
      var cl = crackLines[ci];
      game.draw.line(cl.x1 + shakeX, cl.y1 + shakeY, cl.x2 + shakeX, cl.y2 + shakeY, C.crack, 3);
    }

    // Weak spot orbit trail
    for (var ti = 1; ti <= 5; ti++) {
      var ta = weakAngle - ti * 0.25;
      var tx2 = cx + Math.cos(ta) * ORBIT_R;
      var ty2 = cy + Math.sin(ta) * ORBIT_R;
      game.draw.circle(tx2, ty2, WEAK_R * (0.3 + ti * 0.06), C.weak, (6 - ti) * 0.05);
    }

    // Weak spot
    game.draw.circle(wx + 3, wy + 3, WEAK_R, '#000', 0.2);
    game.draw.circle(wx, wy, WEAK_R, C.weak, 0.92);
    game.draw.circle(wx - WEAK_R * 0.3, wy - WEAK_R * 0.3, WEAK_R * 0.3, '#fff', 0.4);

    // Glow on shatter
    if (glowAnim > 0) {
      game.draw.circle(CX, CY, CRYSTAL_W, C.crystHi, glowAnim * 0.25);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 60, color: flashCol, bold: true });
    }

    game.draw.text('弱点を叩け', W / 2, H * 0.82, { size: 38, color: '#ffffff33' });

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    resetCrystal();
  });
})(game);
