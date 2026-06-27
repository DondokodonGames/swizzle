// 785-frequency-tune.js
// フリークエンシーチューン — ノイズの中から目標周波数を合わせろ
// 操作: タップ左半分で周波数↓、タップ右半分で周波数↑、緑ゾーンに合わせる
// 成功: 25回チューン成功  失敗: 8回ミス or 80秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#03070a',
    wave:    '#0ea5e9',
    waveFade:'#0c4a6e',
    target:  '#22c55e',
    tuned:   '#4ade80',
    knob:    '#94a3b8',
    knobHi:  '#f1f5f9',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#040810'
  };

  var currentFreq = 0.5; // 0 to 1 normalized
  var targetFreq = 0.5;
  var TUNE_ZONE = 0.06; // how close = tuned
  var DRIFT_SPEED = 0; // target drifts slowly

  var tuned = false;
  var tunedTimer = 0;
  var TUNE_HOLD = 0.6; // hold for this long to score
  var waitTimer = 0;
  var WAIT_DUR = 0.5;

  var score = 0;
  var NEEDED = 25;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 80;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var confirming = false;
  var confirmTimer = 0;

  function newTarget() {
    var oldTarget = targetFreq;
    do {
      targetFreq = 0.1 + Math.random() * 0.8;
    } while (Math.abs(targetFreq - oldTarget) < 0.2);
    DRIFT_SPEED = (Math.random() - 0.5) * 0.04 * Math.min(1, score * 0.08);
    tuned = false;
    tunedTimer = 0;
    confirming = false;
    confirmTimer = 0;
  }

  function isInTune() {
    return Math.abs(currentFreq - targetFreq) <= TUNE_ZONE;
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0) return;
    var step = 0.03 - Math.min(0.015, score * 0.001);
    if (tx < W / 2) {
      currentFreq -= step;
      if (currentFreq < 0) currentFreq = 0;
    } else {
      currentFreq += step;
      if (currentFreq > 1) currentFreq = 1;
    }
    game.audio.play('se_tap', 0.04);
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
      if (waitTimer <= 0 && !done) newTarget();
      // Draw during wait too
    } else {
      // Target drift
      targetFreq += DRIFT_SPEED * dt;
      if (targetFreq < 0.05) { targetFreq = 0.05; DRIFT_SPEED = Math.abs(DRIFT_SPEED); }
      if (targetFreq > 0.95) { targetFreq = 0.95; DRIFT_SPEED = -Math.abs(DRIFT_SPEED); }

      if (isInTune()) {
        tunedTimer += dt;
        if (tunedTimer >= TUNE_HOLD && !confirming) {
          confirming = true;
          score++;
          flashCol = C.correct;
          flashAnim = 0.22;
          resultText = 'チューン！';
          resultTimer = 0.4;
          game.audio.play('se_success', 0.65);
          for (var p = 0; p < 8; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.4, col: C.tuned });
          }
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 380 + Math.ceil(timeLeft) * 120); }, 700);
            return;
          }
          waitTimer = WAIT_DUR;
        }
      } else {
        if (tunedTimer > 0.2) {
          // Was tuned but lost it
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.28;
          resultText = 'ズレた！';
          resultTimer = 0.4;
          game.audio.play('se_failure', 0.3);
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            waitTimer = WAIT_DUR;
          }
        }
        tunedTimer = 0;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var inTune = isInTune();

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Frequency display: oscilloscope wave
    var waveY = H * 0.45;
    var waveAmp = 120;
    var freq = 4 + currentFreq * 12;
    var tFreq = 4 + targetFreq * 12;
    var noiseAmt = inTune ? 0 : (1 - Math.max(0, 1 - Math.abs(currentFreq - targetFreq) * 5)) * 0.4;

    // Draw target wave (green, behind)
    for (var xi = 0; xi < W; xi += 4) {
      var tx2 = xi / W;
      var ty2 = waveY + Math.sin(tx2 * tFreq * Math.PI * 2 + elapsed * 3) * waveAmp * 0.6;
      game.draw.circle(xi, ty2, 4, C.target, 0.25);
    }

    // Draw current wave (blue)
    for (var xi2 = 0; xi2 < W; xi2 += 4) {
      var tx3 = xi2 / W;
      var noise = (Math.random() - 0.5) * waveAmp * noiseAmt;
      var ty3 = waveY + Math.sin(tx3 * freq * Math.PI * 2 + elapsed * 4) * waveAmp + noise;
      var wCol = inTune ? C.tuned : C.wave;
      game.draw.circle(xi2, ty3, 5, wCol, inTune ? 0.8 : 0.6);
    }

    // Spectrum bar at bottom
    var specY = H * 0.68;
    var specH = 60;
    game.draw.rect(40, specY, W - 80, specH, '#0a1520', 0.9);
    // Target marker
    var tX = 40 + (W - 80) * targetFreq;
    game.draw.rect(tX - 4, specY - 6, 8, specH + 12, C.target, 0.8);
    game.draw.text('▼', tX, specY - 18, { size: 28, color: C.target });
    // Tune zone
    var zoneW = (W - 80) * TUNE_ZONE * 2;
    game.draw.rect(tX - zoneW / 2, specY, zoneW, specH, C.target, 0.15);
    // Current position
    var cX = 40 + (W - 80) * currentFreq;
    game.draw.rect(cX - 5, specY - 8, 10, specH + 16, inTune ? C.tuned : C.knob, 0.95);

    // Tune progress bar (hold duration)
    if (inTune && tunedTimer > 0) {
      var holdPct = Math.min(1, tunedTimer / TUNE_HOLD);
      game.draw.rect(W * 0.2, H * 0.76, W * 0.6 * holdPct, 18, C.tuned, 0.9);
      game.draw.rect(W * 0.2, H * 0.76, W * 0.6, 18, C.tuned, 0.15);
    }

    // Label
    game.draw.text('目標周波数', tX, specY + specH + 28, { size: 30, color: C.target });
    game.draw.text('現在', cX, specY - 45, { size: 28, color: inTune ? C.tuned : C.knob });

    // Left/right tap hint
    game.draw.text('◀ 下げる', W * 0.22, H * 0.87, { size: 36, color: C.text + '44' });
    game.draw.text('上げる ▶', W * 0.78, H * 0.87, { size: 36, color: C.text + '44' });

    // Divider line
    game.draw.line(W / 2, H * 0.84, W / 2, H * 0.92, C.ui, 2);

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (inTune) {
      game.draw.text('キープ！', W / 2, H * 0.18, { size: 60, color: C.tuned, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.22, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 80);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newTarget();
  });
})(game);
