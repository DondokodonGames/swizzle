// 178-arc-throw.js
// 放物線投石 — 変化する発射角度を見極めてタップ、的に石を当て続ける爽快感
// 操作: タップで発射
// 成功: 10発命中  失敗: 8発外す or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060a06',
    ground:  '#0f2010',
    target:  '#ef4444',
    targetHi:'#fca5a5',
    stone:   '#9ca3af',
    stoneHi: '#e5e7eb',
    arc:     '#374151',
    launch:  '#22c55e',
    hit:     '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var LAUNCH_X = W * 0.12;
  var LAUNCH_Y = H * 0.78;
  var TARGET_X = W * 0.82;
  var TARGET_Y = H * 0.72;
  var TARGET_R = 56;
  var STONE_R = 20;
  var STONE_SPEED = 880;
  var GRAVITY = 1800;

  // Rotating angle selector
  var aimAngle = -Math.PI * 0.6; // start pointing up-right
  var AIM_SPEED = 1.2; // rad/sec
  var aimDir = 1;
  var MIN_ANGLE = -Math.PI * 0.85;
  var MAX_ANGLE = -Math.PI * 0.1;

  var stone = null;
  var arcPoints = [];
  var score = 0;
  var needed = 10;
  var misses = 0;
  var maxMisses = 8;
  var timeLeft = 45;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  function computeArcPoints(angle) {
    var pts = [];
    var vx = Math.cos(angle) * STONE_SPEED;
    var vy = Math.sin(angle) * STONE_SPEED;
    var x = LAUNCH_X, y = LAUNCH_Y;
    for (var t = 0; t < 1.8; t += 0.04) {
      x = LAUNCH_X + vx * t;
      y = LAUNCH_Y + vy * t + 0.5 * GRAVITY * t * t;
      pts.push({ x: x, y: y });
      if (y > H + 50) break;
    }
    return pts;
  }

  game.onTap(function() {
    if (done || stone) return;
    stone = {
      x: LAUNCH_X,
      y: LAUNCH_Y,
      vx: Math.cos(aimAngle) * STONE_SPEED,
      vy: Math.sin(aimAngle) * STONE_SPEED
    };
    game.audio.play('se_tap', 0.7);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    // Rotate aim
    aimAngle += AIM_SPEED * aimDir * dt;
    if (aimAngle > MAX_ANGLE) { aimAngle = MAX_ANGLE; aimDir = -1; }
    if (aimAngle < MIN_ANGLE) { aimAngle = MIN_ANGLE; aimDir = 1; }
    arcPoints = computeArcPoints(aimAngle);

    // Move stone
    if (stone) {
      stone.vy += GRAVITY * dt;
      stone.x += stone.vx * dt;
      stone.y += stone.vy * dt;

      // Check target hit
      var dx = stone.x - TARGET_X, dy = stone.y - TARGET_Y;
      if (Math.sqrt(dx * dx + dy * dy) < STONE_R + TARGET_R) {
        score++;
        feedbackOk = true; feedback = 0.4;
        game.audio.play('se_success', 0.9);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: TARGET_X, y: TARGET_Y, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5 });
        }
        stone = null;
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 70 + Math.ceil(timeLeft) * 20); }, 400);
        }
        return;
      }

      // Off screen
      if (stone.y > H + 50 || stone.x > W + 50) {
        misses++;
        feedbackOk = false; feedback = 0.35;
        game.audio.play('se_failure', 0.4);
        stone = null;
        if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 400); }
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 400 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, H * 0.88, W, H * 0.12, C.ground, 0.9);
    game.draw.rect(0, H * 0.88, W, 8, '#14532d', 0.8);

    // Arc preview
    for (var ai = 0; ai < arcPoints.length; ai++) {
      var pt = arcPoints[ai];
      if (pt.y > H * 0.88) break;
      var alpha = (1 - ai / arcPoints.length) * 0.35;
      game.draw.circle(pt.x, pt.y, 5, C.arc, alpha);
    }
    // Aim line
    game.draw.line(LAUNCH_X, LAUNCH_Y,
      LAUNCH_X + Math.cos(aimAngle) * 100,
      LAUNCH_Y + Math.sin(aimAngle) * 100,
      C.launch, 5);

    // Target
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R + 12, C.targetHi, 0.15);
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R, C.target, 0.85);
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R * 0.55, C.targetHi, 0.5);
    game.draw.circle(TARGET_X, TARGET_Y, 12, '#fff', 0.8);

    // Launch platform
    game.draw.rect(LAUNCH_X - 60, LAUNCH_Y + STONE_R, 120, 60, '#1a2e1a', 0.9);
    game.draw.circle(LAUNCH_X, LAUNCH_Y + STONE_R, 40, '#2d4a2d', 0.8);

    // Stone (when not flying)
    if (!stone) {
      game.draw.circle(LAUNCH_X, LAUNCH_Y, STONE_R + 4, C.stoneHi, 0.3);
      game.draw.circle(LAUNCH_X, LAUNCH_Y, STONE_R, C.stone, 0.9);
    } else {
      game.draw.circle(stone.x, stone.y, STONE_R + 4, C.stoneHi, 0.3);
      game.draw.circle(stone.x, stone.y, STONE_R, C.stone, 0.9);
      // Trailing dust
      game.draw.circle(stone.x - stone.vx * 0.03, stone.y - stone.vy * 0.03, STONE_R * 0.7, C.stone, 0.3);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, C.hit, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.hit : C.wrong, feedback * 0.12);
    }

    if (!stone) game.draw.text('タップで投げる！', W / 2, H * 0.92, { size: 46, color: C.ui });
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W * 0.1 + mi * 42, 218, 14, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.launch : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); });
})(game);
