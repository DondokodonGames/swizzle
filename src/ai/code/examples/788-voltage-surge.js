// 788-voltage-surge.js
// ボルテージサージ — 電圧スパイクの頂点を一撃で叩け
// 操作: タップ — 電圧が最高値（スパイク頂点）に達した瞬間だけ
// 成功: 25回ヒット  失敗: 8回ミス or 80秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#020408',
    grid:     '#0a1520',
    line:     '#1e40af',
    spike:    '#38bdf8',
    spikeGlow:'#0ea5e9',
    peak:     '#fbbf24',
    peakGlow: '#f59e0b',
    hit:      '#22c55e',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#04060f'
  };

  var HISTORY_LEN = 80;
  var voltageHistory = [];
  for (var hi2 = 0; hi2 < HISTORY_LEN; hi2++) voltageHistory.push(0.1);

  var voltage = 0.1;
  var spiking = false;
  var spikeTimer = 0;
  var SPIKE_RISE = 0;
  var SPIKE_PEAK_DUR = 0;
  var SPIKE_FALL = 0;
  var spikePhase = 'idle'; // 'rise' | 'peak' | 'fall'
  var nextSpikeTime = 0;
  var IDLE_VOLTAGE = 0.1;

  var answered = false;
  var waitTimer = 0;
  var WAIT_DUR = 0.3;

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
  var hitAnim = 0;

  function scheduleNextSpike() {
    nextSpikeTime = 1.0 + Math.random() * 2.0 - Math.min(0.5, score * 0.04);
    if (nextSpikeTime < 0.5) nextSpikeTime = 0.5;
    spikePhase = 'idle';
    voltage = IDLE_VOLTAGE;
    answered = false;
  }

  function startSpike() {
    spikePhase = 'rise';
    spikeTimer = 0;
    SPIKE_RISE = 0.25 + Math.random() * 0.15;
    SPIKE_PEAK_DUR = Math.max(0.12, 0.28 - score * 0.006);
    SPIKE_FALL = 0.35 + Math.random() * 0.15;
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0 || answered) return;
    var atPeak = spikePhase === 'peak';
    answered = true;
    if (atPeak) {
      score++;
      hitAnim = 0.5;
      flashCol = C.hit;
      flashAnim = 0.2;
      resultText = 'ヒット！';
      resultTimer = 0.38;
      game.audio.play('se_success', 0.65);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.peak });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 380 + Math.ceil(timeLeft) * 130); }, 700);
        return;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = spikePhase === 'idle' ? '早い！' : 'もう遅い！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    waitTimer = WAIT_DUR;
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
      if (waitTimer <= 0 && !done) scheduleNextSpike();
    } else {
      // Spike state machine
      if (spikePhase === 'idle') {
        nextSpikeTime -= dt;
        // Slight noise
        voltage = IDLE_VOLTAGE + (Math.random() - 0.5) * 0.04;
        if (nextSpikeTime <= 0) startSpike();
      } else if (spikePhase === 'rise') {
        spikeTimer += dt;
        voltage = IDLE_VOLTAGE + (1.0 - IDLE_VOLTAGE) * (spikeTimer / SPIKE_RISE);
        if (spikeTimer >= SPIKE_RISE) {
          spikePhase = 'peak';
          spikeTimer = 0;
          voltage = 1.0;
        }
      } else if (spikePhase === 'peak') {
        spikeTimer += dt;
        voltage = 1.0;
        if (spikeTimer >= SPIKE_PEAK_DUR && !answered) {
          // Missed peak
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.28;
          resultText = '逃した！';
          resultTimer = 0.4;
          game.audio.play('se_failure', 0.28);
          answered = true;
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            waitTimer = WAIT_DUR;
          }
          spikePhase = 'fall';
        } else if (spikeTimer >= SPIKE_PEAK_DUR) {
          spikePhase = 'fall';
          spikeTimer = 0;
        }
      } else if (spikePhase === 'fall') {
        spikeTimer += dt;
        voltage = 1.0 - (1.0 - IDLE_VOLTAGE) * (spikeTimer / SPIKE_FALL);
        if (spikeTimer >= SPIKE_FALL) {
          scheduleNextSpike();
        }
      }
    }

    // History
    voltageHistory.push(voltage);
    if (voltageHistory.length > HISTORY_LEN) voltageHistory.shift();

    if (hitAnim > 0) hitAnim -= dt * 2.5;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Oscilloscope grid
    var oscX = 40;
    var oscY = H * 0.22;
    var oscW = W - 80;
    var oscH = H * 0.42;
    game.draw.rect(oscX, oscY, oscW, oscH, C.grid, 0.9);
    for (var gi = 0; gi <= 4; gi++) {
      var gy = oscY + (gi / 4) * oscH;
      game.draw.line(oscX, gy, oscX + oscW, gy, '#0f2040', 2);
    }
    for (var gxi = 0; gxi <= 8; gxi++) {
      var gxx = oscX + (gxi / 8) * oscW;
      game.draw.line(gxx, oscY, gxx, oscY + oscH, '#0f2040', 2);
    }

    // Voltage line
    for (var vi = 1; vi < voltageHistory.length; vi++) {
      var x1 = oscX + (vi - 1) / (HISTORY_LEN - 1) * oscW;
      var y1 = oscY + oscH - voltageHistory[vi - 1] * oscH;
      var x2 = oscX + vi / (HISTORY_LEN - 1) * oscW;
      var y2 = oscY + oscH - voltageHistory[vi] * oscH;
      var v = voltageHistory[vi];
      var vCol = v > 0.85 ? C.peak : (v > 0.5 ? C.spike : C.line);
      game.draw.circle(x2, y2, v > 0.85 ? 6 : 4, vCol, 0.8);
    }

    // Current voltage indicator
    var curX = oscX + oscW;
    var curY = oscY + oscH - voltage * oscH;
    var vCol2 = voltage > 0.85 ? C.peak : C.spike;
    game.draw.circle(curX, curY, 14 + hitAnim * 10, vCol2, 0.4);
    game.draw.circle(curX, curY, 10, vCol2, 0.95);

    // Peak zone line
    var peakY = oscY + oscH - 0.85 * oscH;
    game.draw.line(oscX, peakY, oscX + oscW, peakY, C.peak, 2);
    game.draw.text('ピーク', oscX + oscW + 10, peakY + 5, { size: 26, color: C.peak });

    // Voltage readout
    var vPct = Math.round(voltage * 100);
    var readCol = voltage > 0.85 ? C.peak : C.spike;
    game.draw.text(vPct + ' V', W / 2, oscY + oscH + 50, { size: 56, color: readCol, bold: true });

    // Prompt
    if (spikePhase === 'peak' && !answered) {
      var pulse = 1 + 0.08 * Math.sin(elapsed * 20);
      game.draw.text('今！！', W / 2, H * 0.73, { size: Math.floor(72 * pulse), color: C.peak, bold: true });
    } else if (spikePhase === 'rise') {
      game.draw.text('上昇中...', W / 2, H * 0.73, { size: 44, color: C.spike + 'aa' });
    } else if (spikePhase === 'idle') {
      game.draw.text('スパイクを待て', W / 2, H * 0.73, { size: 40, color: C.text + '44' });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.84, { size: 52, color: flashCol, bold: true });
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
    scheduleNextSpike();
  });
})(game);
