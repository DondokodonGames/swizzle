// 287-turbine-tap.js
// タービンタップ — 発電タービンをタップして回転を維持、過回転と停止を防ぐ
// 操作: タップでタービンを回す（速すぎず遅すぎず）
// 成功: 30秒間最適回転数を維持  失敗: 過回転または停止 3回

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#02040a',
    turbine: '#334155',
    turbHi:  '#64748b',
    blade:   '#1e40af',
    bladeHi: '#3b82f6',
    safe:    '#22c55e',
    safeHi:  '#86efac',
    danger:  '#ef4444',
    danHi:   '#fca5a5',
    warn:    '#f59e0b',
    warnHi:  '#fde68a',
    power:   '#fde68a',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var CX = W / 2, CY = H * 0.42;
  var BLADE_COUNT = 5;
  var rotation = 0;
  var rpm = 0; // current RPM
  var targetRPM = 60; // optimal range 50-70
  var rpmDecay = 8; // RPM drops per second
  var rpmGain = 20; // RPM gain per tap
  var failures = 0;
  var MAX_FAIL = 3;
  var safeTime = 0; // time spent in safe zone
  var NEEDED_TIME = 30;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var powerOutput = 0;
  var sparkParticles = [];

  function isInSafeZone() {
    return rpm >= 50 && rpm <= 70;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var dx = tx - CX, dy = ty - CY;
    if (dx * dx + dy * dy < 200 * 200) {
      rpm += rpmGain;
      if (rpm > 90) {
        // Over-rev!
        failures++;
        rpm = 30;
        feedback = '過回転！ (' + failures + '/' + MAX_FAIL + ')';
        feedbackCol = C.danger;
        feedbackTimer = 0.8;
        game.audio.play('se_failure', 0.6);
        // Sparks
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          sparkParticles.push({ x: CX, y: CY, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.5 });
        }
        if (failures >= MAX_FAIL && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      } else {
        game.audio.play('se_tap', 0.2);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    // RPM decay
    rpm -= rpmDecay * dt;
    rpm = Math.max(0, rpm);

    // Stall check
    if (rpm < 5 && elapsed > 2) {
      failures++;
      rpm = 0;
      feedback = 'ストール！ (' + failures + '/' + MAX_FAIL + ')';
      feedbackCol = C.warn;
      feedbackTimer = 0.8;
      game.audio.play('se_failure', 0.5);
      if (failures >= MAX_FAIL && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }

    rotation += (rpm / 60) * 2 * Math.PI * dt;

    // Safe zone time
    if (isInSafeZone()) {
      safeTime += dt;
      powerOutput = Math.round(rpm * 10);
      if (safeTime >= NEEDED_TIME && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.round(safeTime) * 100 + Math.ceil(timeLeft) * 50); }, 400);
      }
    }

    for (var sp = sparkParticles.length - 1; sp >= 0; sp--) {
      sparkParticles[sp].x += sparkParticles[sp].vx * dt;
      sparkParticles[sp].y += sparkParticles[sp].vy * dt;
      sparkParticles[sp].vy += 400 * dt;
      sparkParticles[sp].life -= dt;
      if (sparkParticles[sp].life <= 0) sparkParticles.splice(sp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Power lines in background
    for (var li = 0; li < 5; li++) {
      var lx = li * W / 4;
      game.draw.line(lx, H * 0.02, lx, H * 0.98, C.ui, 1);
      var pulseY = (elapsed * 200 + li * 200) % H;
      game.draw.circle(lx, pulseY, 4, isInSafeZone() ? C.safe : C.warn, 0.6);
    }

    // Turbine housing
    game.draw.circle(CX, CY, 170, C.turbine, 0.9);
    game.draw.circle(CX, CY, 170, C.turbHi, 0.2);
    game.draw.circle(CX, CY, 30, C.turbHi, 0.9);

    // Blades
    for (var bi = 0; bi < BLADE_COUNT; bi++) {
      var bladeAng = rotation + (bi / BLADE_COUNT) * Math.PI * 2;
      var col = isInSafeZone() ? C.blade : (rpm > 70 ? C.danHi : C.warn);
      var hiCol = isInSafeZone() ? C.bladeHi : (rpm > 70 ? C.danger : C.warnHi);
      game.draw.line(CX + Math.cos(bladeAng) * 28, CY + Math.sin(bladeAng) * 28,
                     CX + Math.cos(bladeAng) * 150, CY + Math.sin(bladeAng) * 150, col, 22);
      game.draw.line(CX + Math.cos(bladeAng) * 60, CY + Math.sin(bladeAng) * 60,
                     CX + Math.cos(bladeAng + 0.4) * 140, CY + Math.sin(bladeAng + 0.4) * 140, hiCol, 8);
    }
    game.draw.circle(CX, CY, 28, C.turbHi, 0.95);

    // Sparks
    for (var sp2 = 0; sp2 < sparkParticles.length; sp2++) {
      var s = sparkParticles[sp2];
      game.draw.circle(s.x, s.y, 5, C.power, s.life * 0.9);
    }

    // RPM Gauge
    var gaugeX = W * 0.15, gaugeY = H * 0.7;
    game.draw.rect(gaugeX - 10, gaugeY, W * 0.7 + 20, 40, C.turbine, 0.8);
    // Safe zone
    game.draw.rect(gaugeX + W * 0.7 * 0.5, gaugeY, W * 0.7 * 0.2, 40, C.safe, 0.3);
    // RPM bar
    var rpmFrac = Math.min(1, rpm / 90);
    var barCol = rpm < 50 ? C.warn : (rpm > 70 ? C.danger : C.safe);
    game.draw.rect(gaugeX, gaugeY, W * 0.7 * rpmFrac, 40, barCol, 0.9);
    game.draw.text('0', gaugeX - 6, gaugeY + 28, { size: 28, color: C.ui });
    game.draw.text('90', gaugeX + W * 0.7, gaugeY + 28, { size: 28, color: C.ui });
    game.draw.text(Math.round(rpm) + ' RPM', W / 2, gaugeY + 65, { size: 40, color: barCol, bold: true });
    game.draw.text('最適: 50〜70', W / 2, gaugeY + 105, { size: 34, color: C.safe });

    // Safe time progress
    var safeRatio = Math.min(1, safeTime / NEEDED_TIME);
    game.draw.rect(40, H * 0.84, W - 80, 18, C.ui, 0.2);
    game.draw.rect(40, H * 0.84, (W - 80) * safeRatio, 18, C.safe, 0.9);
    game.draw.text('安定: ' + Math.floor(safeTime) + '/' + NEEDED_TIME + 's', W / 2, H * 0.87, { size: 38, color: C.text, bold: true });

    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.91, { size: 46, color: feedbackCol, bold: true });
    }

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 28 + fi * 56, H * 0.95, 15, fi < failures ? C.danger : '#05080e');
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.blade : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    rpm = 20;
  });
})(game);
