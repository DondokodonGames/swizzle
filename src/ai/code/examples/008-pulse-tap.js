// 008-pulse-tap.js
// 心拍タップ — 脈打つリズムの頂点でタップする心地よさ
// 操作: 円が最大に膨らんだ瞬間にタップ
// 成功: 5回正確にタップ  失敗: タイミングを外しすぎると×（3回）

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0d0010',
    core:     '#e11d48',
    ring1:    '#f43f5e',
    ring2:    '#fb7185',
    good:     '#22c55e',
    miss:     '#ef4444',
    ecg:      '#f43f5e',
    ui:       '#64748b'
  };

  var PERIOD = 1.4; // seconds per pulse
  var t = 0;        // phase within period (0 to 1)
  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 25;
  var done = false;

  var feedbackTimer = 0;
  var feedbackOk = false;

  // ECG trail
  var ecgPoints = [];
  var ecgX = 0;
  var ECG_W = W - 80;

  function getPulseValue(phase) {
    // sharp spike at phase = 0
    if (phase < 0.12) return phase / 0.12;       // rise
    if (phase < 0.22) return 1 - (phase - 0.12) / 0.10; // fall
    if (phase < 0.35) return -0.2 * Math.sin((phase - 0.22) / 0.13 * Math.PI); // dip
    return 0; // flat line
  }

  var lastPhase = 0;
  var tapWindowOpen = false;

  game.onTap(function(x, y) {
    if (done) return;

    // Window: peak of pulse = phase near 0.08-0.16
    var atPeak = t > 0.06 && t < 0.20;
    feedbackTimer = 0.45;

    if (atPeak) {
      score++;
      feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 20 + Math.ceil(timeLeft) * 4);
        }, 500);
      }
    } else {
      misses++;
      feedbackOk = false;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // advance phase
    t = (t + dt / PERIOD) % 1;

    // ECG
    var pulse = getPulseValue(t);
    ecgX = (ecgX + dt * 120) % ECG_W;
    ecgPoints.push({ x: 40 + ecgX, y: pulse });
    if (ecgPoints.length > 320) ecgPoints.shift();

    if (feedbackTimer > 0) feedbackTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // ECG background
    var ecgY = H * 0.78;
    var ecgH = 180;
    game.draw.rect(20, ecgY - ecgH / 2, ECG_W + 20, ecgH + 4, '#0d0010');
    game.draw.rect(20, ecgY, ECG_W + 20, 2, '#1a0020');

    // ECG line
    for (var i = 1; i < ecgPoints.length; i++) {
      var ep = ecgPoints[i - 1];
      var en = ecgPoints[i];
      // only draw adjacent points (gap when x wraps)
      if (Math.abs(en.x - ep.x) < 10) {
        var a1 = Math.min(1, i / 20);
        game.draw.line(
          ep.x, ecgY - ep.y * 70,
          en.x, ecgY - en.y * 70,
          C.ecg, 3
        );
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#1a0020');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ring1 : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 76;
      game.draw.circle(sx, 140, 26, s < score ? C.good : '#2d0030');
      if (s < score) game.draw.circle(sx, 140, 16, '#ffffff80');
    }

    // Miss indicators
    for (var mm = 0; mm < maxMisses; mm++) {
      var mx = W / 2 + (mm - (maxMisses - 1) / 2) * 64;
      game.draw.circle(mx, 208, 18, mm < misses ? C.miss : '#1a0020');
    }

    // Main pulse circle
    var pulseVal = getPulseValue(t);
    var baseR = 200;
    var pulseR = baseR + pulseVal * 120;

    // outer rings
    game.draw.circle(W / 2, H * 0.44, pulseR + 40, C.ring1, 0.15 + pulseVal * 0.25);
    game.draw.circle(W / 2, H * 0.44, pulseR + 80, C.ring2, 0.06 + pulseVal * 0.12);

    // main
    game.draw.circle(W / 2, H * 0.44, pulseR, C.core);
    game.draw.circle(W / 2, H * 0.44, pulseR - 24, '#be123c');
    game.draw.circle(W / 2, H * 0.44, pulseR * 0.4, C.ring2, 0.6);

    // Feedback overlay
    if (feedbackTimer > 0) {
      var progress = 1 - feedbackTimer / 0.45;
      if (feedbackOk) {
        game.draw.text('♥', W / 2, H * 0.44 - 20, { size: 120, color: C.good, bold: true });
        game.draw.circle(W / 2, H * 0.44, pulseR * (1 + progress * 0.4), C.good, (1 - progress) * 0.5);
      } else {
        game.draw.text('✕', W / 2, H * 0.44 - 20, { size: 100, color: C.miss, bold: true });
        game.draw.rect(0, 0, W, H, C.miss, (1 - progress) * 0.15);
      }
    }

    // Guide
    var peakNear = t > 0.02 && t < 0.25;
    if (!done) {
      game.draw.text(
        peakNear ? '今！タップ！' : '脈動を感じろ',
        W / 2, H - 200,
        { size: peakNear ? 72 : 52, color: peakNear ? C.ring2 : C.ui, bold: peakNear }
      );
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
