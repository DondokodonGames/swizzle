// 725-voltage-surge.js
// 電圧サージ — 乱高下する電圧が安全ゾーンにいる間だけタップして電力を集めろ
// 操作: タップ — 電圧ゲージが緑ゾーン内にいるとき充電
// 成功: 30回充電  失敗: 10回オーバーロード or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#020a04',
    safe:     '#22c55e',
    safeZone: '#052e16',
    danger:   '#ef4444',
    needle:   '#fbbf24',
    gauge:    '#14532d',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#030e05'
  };

  // Gauge: vertical bar on screen
  var GAUGE_X = W / 2 - 60;
  var GAUGE_W = 120;
  var GAUGE_Y0 = H * 0.18;
  var GAUGE_H = H * 0.58;

  // Safe zone: between 35% and 65% from top
  var SAFE_TOP = 0.30;
  var SAFE_BOT = 0.70;

  // Voltage oscillates between 0 and 1
  var voltage = 0.5;
  var voltVel = 0.0;
  var VOLT_NOISE_SCALE = 0.9;

  // Noise-driven movement
  var noiseTime = 0;
  var noisePhase1 = 0, noisePhase2 = Math.random() * 10;
  var noisePhase3 = Math.random() * 10;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var chargeAnim = 0;

  function inSafeZone() {
    return voltage >= SAFE_TOP && voltage <= SAFE_BOT;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (inSafeZone()) {
      score++;
      chargeAnim = 0.4;
      flashCol = C.correct;
      flashAnim = 0.25;
      resultText = '充電！';
      resultTimer = 0.4;
      game.audio.play('se_tap', 0.12);
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({
          x: GAUGE_X + GAUGE_W / 2,
          y: GAUGE_Y0 + voltage * GAUGE_H,
          vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.4, col: C.safe
        });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = 'オーバーロード！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.4);
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

    // Noisy voltage movement
    noiseTime += dt;
    var spd = 1.0 + elapsed * 0.02;
    noisePhase1 += dt * 2.1 * spd;
    noisePhase2 += dt * 3.7 * spd;
    noisePhase3 += dt * 5.3 * spd;
    var target = 0.5
      + 0.25 * Math.sin(noisePhase1)
      + 0.15 * Math.sin(noisePhase2)
      + 0.08 * Math.sin(noisePhase3);
    target = Math.max(0.05, Math.min(0.95, target));
    voltage += (target - voltage) * dt * 3.5;
    voltage = Math.max(0.02, Math.min(0.98, voltage));

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (chargeAnim > 0) chargeAnim -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var safe = inSafeZone();
    var needleY = GAUGE_Y0 + voltage * GAUGE_H;
    var safeY0 = GAUGE_Y0 + SAFE_TOP * GAUGE_H;
    var safeY1 = GAUGE_Y0 + SAFE_BOT * GAUGE_H;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Gauge background
    game.draw.rect(GAUGE_X - 4, GAUGE_Y0 - 4, GAUGE_W + 8, GAUGE_H + 8, '#052e16', 0.9);
    game.draw.rect(GAUGE_X, GAUGE_Y0, GAUGE_W, GAUGE_H, '#000', 0.6);

    // Safe zone highlight
    game.draw.rect(GAUGE_X, safeY0, GAUGE_W, safeY1 - safeY0, C.safeZone, 0.9);
    game.draw.rect(GAUGE_X, safeY0, GAUGE_W, safeY1 - safeY0, C.safe, 0.12);

    // Safe zone borders
    game.draw.line(GAUGE_X, safeY0, GAUGE_X + GAUGE_W, safeY0, C.safe, 4);
    game.draw.line(GAUGE_X, safeY1, GAUGE_X + GAUGE_W, safeY1, C.safe, 4);

    // Voltage fill (partial bar)
    var fillH = voltage * GAUGE_H;
    var fillCol = safe ? C.safe : C.danger;
    game.draw.rect(GAUGE_X, GAUGE_Y0 + GAUGE_H - fillH, GAUGE_W, fillH, fillCol, 0.55);

    // Charge animation
    if (chargeAnim > 0) {
      game.draw.rect(GAUGE_X - 10, GAUGE_Y0 - 10, GAUGE_W + 20, GAUGE_H + 20, C.safe, chargeAnim * 0.2);
    }

    // Needle
    game.draw.rect(GAUGE_X - 20, needleY - 5, GAUGE_W + 40, 10, C.needle, 0.95);
    game.draw.circle(GAUGE_X - 20, needleY, 16, C.needle, 0.95);

    // Labels
    game.draw.text('HIGH', GAUGE_X + GAUGE_W / 2, GAUGE_Y0 - 32, { size: 30, color: C.danger + '88' });
    game.draw.text('LOW',  GAUGE_X + GAUGE_W / 2, GAUGE_Y0 + GAUGE_H + 36, { size: 30, color: C.danger + '88' });
    game.draw.text('SAFE', GAUGE_X + GAUGE_W + 28, (safeY0 + safeY1) / 2 + 14, { size: 32, color: C.safe, bold: true });

    // Status
    var statusText = safe ? 'タップ！' : (voltage < SAFE_TOP ? '低すぎ' : '高すぎ');
    var statusCol = safe ? C.safe : C.danger;
    game.draw.text(statusText, W / 2, H * 0.83, { size: 52, color: statusCol, bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 48, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
