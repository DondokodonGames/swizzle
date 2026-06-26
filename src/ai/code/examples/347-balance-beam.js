// 347-balance-beam.js
// バランスビーム — 左右に揺れる棒の上で玉を落とさないように保つ
// 操作: タップで棒を左右に傾ける
// 成功: 20秒間落とさない  失敗: 玉が落ちる3回 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f0a1a',
    beam:   '#7c3aed',
    beamHi: '#a78bfa',
    ball:   '#fbbf24',
    ballHi: '#fef3c7',
    shadow: '#1a1a2e',
    danger: '#ef4444',
    success:'#22c55e',
    ui:     '#6366f1',
    text:   '#f1f5f9'
  };

  var BEAM_W = 700;
  var BEAM_H = 24;
  var beamX = W / 2;
  var beamY = H * 0.52;
  var beamAngle = 0; // radians
  var MAX_ANGLE = Math.PI / 5;
  var ANGLE_STEP = Math.PI / 12;

  var ballX = 0; // relative to beam center
  var ballVX = 0;
  var BALL_R = 36;
  var GRAVITY = 600;

  var survived = 0;
  var TARGET = 20;
  var falls = 0;
  var MAX_FALLS = 3;
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var particles = [];
  var warningAnim = 0;
  var successAnim = 0;

  function resetBall() {
    ballX = (Math.random() - 0.5) * 200;
    ballVX = (Math.random() - 0.5) * 100;
    beamAngle = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      beamAngle = Math.max(-MAX_ANGLE, beamAngle - ANGLE_STEP);
    } else {
      beamAngle = Math.min(MAX_ANGLE, beamAngle + ANGLE_STEP);
    }
    game.audio.play('se_tap', 0.15);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      survived = Math.min(TARGET, elapsed - falls * 2); // lose time for each fall
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
      if (survived >= TARGET && !done) {
        done = true;
        game.audio.play('se_success', 0.8);
        setTimeout(function() { game.end.success(Math.round(survived * 300) + Math.ceil(timeLeft) * 100); }, 400);
        return;
      }
    }

    if (warningAnim > 0) warningAnim -= dt * 2;
    if (successAnim > 0) successAnim -= dt * 2;

    // Ball physics on inclined beam
    var gravComponent = GRAVITY * Math.sin(beamAngle);
    ballVX += gravComponent * dt;
    // Damping
    ballVX *= (1 - 0.5 * dt);
    ballX += ballVX * dt;

    // Ball limits on beam
    var halfBeam = BEAM_W / 2 - BALL_R;
    if (ballX < -halfBeam) {
      ballX = -halfBeam;
      ballVX = Math.abs(ballVX) * 0.5;
    }
    if (ballX > halfBeam) {
      ballX = halfBeam;
      ballVX = -Math.abs(ballVX) * 0.5;
    }

    // Check if ball slides off
    var absBall = Math.abs(ballX);
    if (absBall > BEAM_W / 2 + BALL_R * 2) {
      falls++;
      game.audio.play('se_failure', 0.5);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: beamX + ballX, y: beamY, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200-100, life: 0.6, col: C.ball });
      }
      warningAnim = 0.8;
      if (falls >= MAX_FALLS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
      resetBall();
    }

    // Warning when near edge
    if (absBall > BEAM_W / 2 - 80) warningAnim = 0.1;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background glow
    game.draw.circle(W / 2, H * 0.52, 400, C.ui, 0.04);

    // Pivot support
    game.draw.rect(W / 2 - 16, beamY, 32, H * 0.25, C.beamHi, 0.4);
    game.draw.circle(W / 2, beamY, 20, C.beamHi, 0.7);

    // Beam (rotated visually via endpoints)
    var cos = Math.cos(beamAngle), sin = Math.sin(beamAngle);
    var bx1 = beamX - (BEAM_W / 2) * cos;
    var by1 = beamY - (BEAM_W / 2) * sin;
    var bx2 = beamX + (BEAM_W / 2) * cos;
    var by2 = beamY + (BEAM_W / 2) * sin;
    game.draw.line(bx1, by1, bx2, by2, C.beam, BEAM_H + 8);
    game.draw.line(bx1, by1, bx2, by2, C.beamHi, BEAM_H);

    // Edge warnings
    var edgeFraction = Math.abs(ballX) / (BEAM_W / 2);
    if (edgeFraction > 0.7) {
      var warnAlpha = (edgeFraction - 0.7) / 0.3 * 0.6;
      game.draw.line(bx1, by1, bx1 + cos * 80, by1 + sin * 80, C.danger, 8 + Math.sin(elapsed * 10) * 4);
      game.draw.line(bx2, by2, bx2 - cos * 80, by2 - sin * 80, C.danger, 8 + Math.sin(elapsed * 10) * 4);
    }

    // Ball
    var ballWorldX = beamX + ballX * cos;
    var ballWorldY = beamY + ballX * sin - BALL_R;
    game.draw.circle(ballWorldX, ballWorldY, BALL_R + 6, C.shadow, 0.4);
    game.draw.circle(ballWorldX, ballWorldY, BALL_R, C.ball, 0.9);
    game.draw.circle(ballWorldX - BALL_R * 0.3, ballWorldY - BALL_R * 0.3, BALL_R * 0.3, C.ballHi, 0.7);

    // Direction hints
    game.draw.text('◀ タップ', W * 0.2, H * 0.75, { size: 36, color: C.ui });
    game.draw.text('タップ ▶', W * 0.8, H * 0.75, { size: 36, color: C.ui });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 28 + fi * 56, H * 0.91, 16, fi < falls ? C.danger : '#1a1a2e');
    }

    // Survival progress
    var prog = Math.min(1, survived / TARGET);
    game.draw.rect(W * 0.1, H * 0.84, W * 0.8, 20, '#1a1a2e', 0.8);
    game.draw.rect(W * 0.1, H * 0.84, W * 0.8 * prog, 20, C.success, 0.8);
    game.draw.text(Math.floor(survived) + 's / ' + TARGET + 's', W / 2, H * 0.88, { size: 36, color: C.text });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ui : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    resetBall();
  });
})(game);
