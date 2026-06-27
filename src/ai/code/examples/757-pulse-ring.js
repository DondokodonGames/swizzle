// 757-pulse-ring.js
// パルスリング — 拡大するリングが目標帯に重なった瞬間タップせよ
// 操作: タップ — 拡大リングが目標リングと重なったとき
// 成功: 30回成功  失敗: 10回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040812',
    pulse:   '#38bdf8',
    pulseHi: '#e0f2fe',
    target:  '#f97316',
    targetHi:'#fde68a',
    zone:    '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080c18'
  };

  var CX = W / 2;
  var CY = H * 0.44;
  var MAX_R = 340;
  var TOL = 22;

  var pulseR = 0;
  var PULSE_SPEED = 200;
  var targetR = 0;
  var pulsing = true;
  var waitTimer = 0;
  var WAIT_DUR = 0.5;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function nextPulse() {
    pulseR = 0;
    targetR = 80 + Math.random() * 200;
    PULSE_SPEED = Math.min(380, 200 + score * 6);
    pulsing = true;
  }

  game.onTap(function(tx, ty) {
    if (done || !pulsing || waitTimer > 0) return;
    var diff = Math.abs(pulseR - targetR);
    if (diff < TOL) {
      score++;
      pulsing = false;
      flashCol = C.correct;
      flashAnim = 0.22;
      resultText = '±' + Math.round(diff) + 'px！';
      resultTimer = 0.38;
      game.audio.play('se_success', 0.55);
      for (var p = 0; p < 10; p++) {
        var pa = Math.random() * Math.PI * 2;
        var sp = 120 + Math.random() * 140;
        particles.push({ x: CX + Math.cos(pa) * targetR, y: CY + Math.sin(pa) * targetR, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp, life: 0.4, col: C.zone });
      }
      waitTimer = WAIT_DUR;
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 350 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      errors++;
      pulsing = false;
      flashCol = C.wrong;
      flashAnim = 0.32;
      var over = pulseR > targetR;
      resultText = over ? (Math.round(pulseR - targetR) + 'px 外側') : (Math.round(targetR - pulseR) + 'px 手前');
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.28);
      waitTimer = WAIT_DUR;
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) nextPulse();
    } else if (pulsing) {
      pulseR += PULSE_SPEED * dt;
      if (pulseR > MAX_R + TOL) {
        // Overshot without tapping
        errors++;
        pulsing = false;
        flashCol = C.wrong;
        flashAnim = 0.32;
        resultText = '通過！遅すぎ';
        resultTimer = 0.45;
        game.audio.play('se_failure', 0.25);
        waitTimer = WAIT_DUR;
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.4;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var inZone = Math.abs(pulseR - targetR) < TOL && pulsing;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target zone (dashed band)
    var steps = 48;
    for (var ti = 0; ti < steps; ti++) {
      if (ti % 3 === 2) continue;
      var ta = ti * Math.PI * 2 / steps;
      var rx = CX + Math.cos(ta) * targetR;
      var ry = CY + Math.sin(ta) * targetR;
      game.draw.circle(rx, ry, inZone ? 8 : 5, inZone ? C.targetHi : C.target, inZone ? 0.95 : 0.6);
    }
    // Tolerance inner/outer rings (faint)
    var steps2 = 32;
    for (var ti2 = 0; ti2 < steps2; ti2++) {
      if (ti2 % 4 === 3) continue;
      var ta2 = ti2 * Math.PI * 2 / steps2;
      game.draw.circle(CX + Math.cos(ta2) * (targetR - TOL), CY + Math.sin(ta2) * (targetR - TOL), 3, C.target, 0.18);
      game.draw.circle(CX + Math.cos(ta2) * (targetR + TOL), CY + Math.sin(ta2) * (targetR + TOL), 3, C.target, 0.18);
    }
    game.draw.text('目標', CX + targetR + 32, CY - 20, { size: 32, color: C.target });

    // Expanding pulse ring
    if (pulseR > 0) {
      var alpha = pulsing ? (inZone ? 1.0 : 0.85) : 0.3;
      var col = inZone ? C.zone : C.pulse;
      // Ring as arc of dots
      var psteps = Math.max(32, Math.floor(pulseR * 0.4));
      for (var pi2 = 0; pi2 < psteps; pi2++) {
        var pa2 = pi2 * Math.PI * 2 / psteps;
        var prx = CX + Math.cos(pa2) * pulseR;
        var pry = CY + Math.sin(pa2) * pulseR;
        game.draw.circle(prx, pry, inZone ? 7 : 5, col, alpha);
      }
      // Inner glow
      if (inZone) {
        game.draw.circle(CX, CY, pulseR - 4, C.zone, 0.06);
      }
      game.draw.circle(CX, CY, 12, col, 0.7);
      game.draw.circle(CX, CY, 6, C.pulseHi, 0.9);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9 * p.life, p.col, p.life);
    }

    if (inZone && pulsing) {
      game.draw.text('今！', W / 2, H * 0.80, { size: 72, color: C.targetHi, bold: true });
    } else if (pulsing) {
      game.draw.text('目標リングに合わせろ', W / 2, H * 0.80, { size: 36, color: C.text + '55' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 50, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    nextPulse();
  });
})(game);
