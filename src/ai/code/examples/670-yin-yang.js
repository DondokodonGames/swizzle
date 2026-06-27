// 670-yin-yang.js
// 陰陽バランス — 黒と白のエネルギーを均等に保てるだけ保て
// 操作: タップで光と影を交互に吸収
// 成功: 60秒間バランスを保つ  失敗: 差が大きくなりすぎる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080808',
    light:   '#f8fafc',
    dark:    '#020204',
    yang:    '#f1f5f9',
    yin:     '#1e293b',
    accent:  '#a78bfa',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0c0c0c'
  };

  var CENTER_X = W / 2;
  var CENTER_Y = H / 2;
  var ORBS_R = 380;

  var yinEnergy = 50; // 0-100
  var yangEnergy = 50; // 0-100
  var BALANCE_THRESHOLD = 30; // max allowed difference
  var DRAIN_RATE = 6; // per second
  var ABSORB_AMOUNT = 18;

  // Alternating: first tap absorbs yang (light), next tap absorbs yin (dark)
  var absorbMode = 'yang'; // 'yang' | 'yin'

  var orbAngle = 0;
  var ORB_SPEED = 1.2;

  var survived = 0;
  var NEEDED_TIME = 60;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var survived2 = 0;

  function getDiff() {
    return Math.abs(yinEnergy - yangEnergy);
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    if (absorbMode === 'yang') {
      yangEnergy = Math.min(100, yangEnergy + ABSORB_AMOUNT);
      absorbMode = 'yin';
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CENTER_X + 100, y: CENTER_Y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.yang });
      }
      game.audio.play('se_tap', 0.12);
    } else {
      yinEnergy = Math.min(100, yinEnergy + ABSORB_AMOUNT);
      absorbMode = 'yang';
      for (var p2 = 0; p2 < 5; p2++) {
        var pa2 = Math.random() * Math.PI * 2;
        particles.push({ x: CENTER_X - 100, y: CENTER_Y, vx: Math.cos(pa2) * 180, vy: Math.sin(pa2) * 180, life: 0.4, col: '#94a3b8' });
      }
      game.audio.play('se_tap', 0.12);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;

      // Both drain over time
      yangEnergy = Math.max(0, yangEnergy - DRAIN_RATE * dt);
      yinEnergy = Math.max(0, yinEnergy - DRAIN_RATE * dt);

      var diff = getDiff();
      if (diff > BALANCE_THRESHOLD || yangEnergy <= 0 || yinEnergy <= 0) {
        done = true;
        flashCol = C.wrong;
        flashAnim = 0.5;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }

      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        game.end.success(Math.floor(elapsed * 100) + 1000);
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    orbAngle += ORB_SPEED * dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background yin-yang visualization
    var diff2 = getDiff();
    var balanceAlpha = Math.max(0, 0.12 - diff2 * 0.003);
    game.draw.circle(CENTER_X, CENTER_Y, ORBS_R + 20, C.accent, balanceAlpha);

    // Yang side (bright) - right
    var yangRadius = 140 + (yangEnergy / 100) * 120;
    game.draw.circle(CENTER_X + 80, CENTER_Y, yangRadius, C.yang, 0.12);
    game.draw.circle(CENTER_X + 80, CENTER_Y, yangRadius * 0.6, C.yang, 0.08);

    // Yin side (dark) - left
    var yinRadius = 140 + (yinEnergy / 100) * 120;
    game.draw.circle(CENTER_X - 80, CENTER_Y, yinRadius, '#334155', 0.3);
    game.draw.circle(CENTER_X - 80, CENTER_Y, yinRadius * 0.6, '#475569', 0.2);

    // Center divider
    game.draw.line(CENTER_X, CENTER_Y - 280, CENTER_X, CENTER_Y + 280, C.accent, 2);

    // Orbiting energy dots
    for (var oi = 0; oi < 3; oi++) {
      var oaY = orbAngle + oi * Math.PI * 2 / 3;
      var oaD = orbAngle * 1.3 + oi * Math.PI * 2 / 3 + Math.PI;
      game.draw.circle(CENTER_X + Math.cos(oaY) * ORBS_R * 0.7, CENTER_Y + Math.sin(oaY) * ORBS_R * 0.5, 20, C.yang, 0.6);
      game.draw.circle(CENTER_X + Math.cos(oaD) * ORBS_R * 0.7, CENTER_Y + Math.sin(oaD) * ORBS_R * 0.5, 20, '#475569', 0.8);
    }

    // Energy bars
    var barW = 300;
    var barH2 = 28;
    var barY = H * 0.78;

    // Yang bar (right side)
    game.draw.rect(CENTER_X + 30, barY, barW, barH2, C.ui, 0.8);
    game.draw.rect(CENTER_X + 30, barY, barW * (yangEnergy / 100), barH2, C.yang, 0.85);
    game.draw.text('光 ' + Math.floor(yangEnergy), CENTER_X + 30 + barW / 2, barY + barH2 + 36, { size: 32, color: C.yang });

    // Yin bar (left side)
    game.draw.rect(CENTER_X - 30 - barW, barY, barW, barH2, C.ui, 0.8);
    game.draw.rect(CENTER_X - 30 - barW, barY, barW * (yinEnergy / 100), barH2, '#64748b', 0.85);
    game.draw.text('影 ' + Math.floor(yinEnergy), CENTER_X - 30 - barW / 2, barY + barH2 + 36, { size: 32, color: '#94a3b8' });

    // Balance indicator
    var diff3 = getDiff();
    var balRatio = Math.max(0, 1 - diff3 / BALANCE_THRESHOLD);
    var balCol = balRatio > 0.5 ? C.correct : C.wrong;
    game.draw.rect(W / 2 - 100, H * 0.85, 200, 16, C.ui, 0.8);
    game.draw.rect(W / 2 - 100, H * 0.85, 200 * balRatio, 16, balCol, 0.85);
    game.draw.text('バランス', W / 2, H * 0.85 + 40, { size: 32, color: balCol });

    // Next tap hint
    var hint = absorbMode === 'yang' ? '右(光)をタップ' : '左(影)をタップ';
    game.draw.text(hint, CENTER_X, CENTER_Y + 340, { size: 36, color: absorbMode === 'yang' ? C.yang : '#94a3b8' });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.73, { size: 64, color: flashCol, bold: true });
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.accent : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('陰陽バランス', W / 2, 80, { size: 32, color: '#ffffff44' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
