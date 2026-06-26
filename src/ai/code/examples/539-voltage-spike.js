// 539-voltage-spike.js
// ボルテージスパイク — 電圧グラフが跳ね上がる瞬間をタップでキャッチ
// 操作: 電圧が急上昇したらタップ（波形を監視）
// 成功: 15スパイク検出  失敗: 10見逃し or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000a02',
    grid:    '#001a04',
    line:    '#00ff41',
    lineLow: '#005514',
    spike:   '#ff6b00',
    spikeLo: '#ff9900',
    hit:     '#22c55e',
    miss:    '#ef4444',
    text:    '#00ff41',
    ui:      '#005500',
    scanline:'#00ff4122'
  };

  var GRAPH_X = 60, GRAPH_Y = H * 0.2;
  var GRAPH_W = W - 120, GRAPH_H = H * 0.45;
  var HISTORY_LEN = 120;

  var voltageHistory = [];
  var baseVoltage = 0.4;
  var voltage = baseVoltage;
  var voltageVel = 0;
  var spikeActive = false;
  var spikeCooldown = 0;
  var SPIKE_INTERVAL_MIN = 1.5;
  var SPIKE_INTERVAL_MAX = 4.0;
  var nextSpikeTimer = 2.0;
  var spikeDuration = 0;
  var SPIKE_RISE = 0.12;
  var SPIKE_HOLD = 0.25;
  var SPIKE_FALL = 0.18;
  var spikePhase = 'none'; // 'rising' | 'hold' | 'falling'
  var spikePhaseTimer = 0;

  var detected = 0;
  var NEEDED = 15;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.hit;
  var scanLine = 0;
  var resultText = '';
  var resultTimer = 0;
  var tapConsumed = false;

  for (var i = 0; i < HISTORY_LEN; i++) voltageHistory.push(baseVoltage);

  game.onTap(function(tx, ty) {
    if (done) return;
    if (voltage > 0.7) {
      // Hit!
      detected++;
      spikeActive = false;
      spikePhase = 'none';
      flashCol = C.hit;
      flashAnim = 0.4;
      resultText = 'SPIKE DETECTED!';
      resultTimer = 0.8;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: GRAPH_Y + GRAPH_H * (1 - voltage), vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160, life: 0.4, col: C.spike });
      }
      voltage = baseVoltage;
      tapConsumed = true;
      if (detected >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(detected * 300 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      // False positive
      missed++;
      flashCol = C.miss;
      flashAnim = 0.3;
      resultText = 'FALSE ALARM';
      resultTimer = 0.7;
      game.audio.play('se_failure', 0.3);
      if (missed >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    scanLine = (scanLine + dt * 160) % GRAPH_W;

    // Spike logic
    if (spikePhase === 'none') {
      nextSpikeTimer -= dt;
      // Random noise on baseline
      voltageVel += (Math.random() - 0.5) * 0.8 * dt;
      voltageVel *= 0.9;
      voltage += voltageVel;
      voltage = Math.max(0.1, Math.min(0.65, voltage));
      voltage += (baseVoltage - voltage) * dt * 1.5;

      if (nextSpikeTimer <= 0) {
        spikePhase = 'rising';
        spikePhaseTimer = SPIKE_RISE;
        nextSpikeTimer = SPIKE_INTERVAL_MIN + Math.random() * (SPIKE_INTERVAL_MAX - SPIKE_INTERVAL_MIN);
      }
    } else if (spikePhase === 'rising') {
      spikePhaseTimer -= dt;
      voltage = baseVoltage + (1.0 - baseVoltage) * (1 - spikePhaseTimer / SPIKE_RISE);
      if (spikePhaseTimer <= 0) {
        spikePhase = 'hold';
        spikePhaseTimer = SPIKE_HOLD;
        voltage = 1.0;
      }
    } else if (spikePhase === 'hold') {
      spikePhaseTimer -= dt;
      voltage = 1.0;
      if (spikePhaseTimer <= 0) {
        spikePhase = 'falling';
        spikePhaseTimer = SPIKE_FALL;
      }
    } else if (spikePhase === 'falling') {
      spikePhaseTimer -= dt;
      voltage = baseVoltage + (1.0 - baseVoltage) * (spikePhaseTimer / SPIKE_FALL);
      if (spikePhaseTimer <= 0) {
        // Missed spike
        if (voltage > 0.65) {
          missed++;
          resultText = 'MISSED!';
          resultTimer = 0.7;
          flashCol = C.miss;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.4);
          if (missed >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        spikePhase = 'none';
        voltage = baseVoltage;
      }
    }

    // Record history
    voltageHistory.push(voltage);
    if (voltageHistory.length > HISTORY_LEN) voltageHistory.shift();

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Graph background
    game.draw.rect(GRAPH_X, GRAPH_Y, GRAPH_W, GRAPH_H, C.grid, 0.9);

    // Grid lines
    for (var gi = 1; gi < 4; gi++) {
      game.draw.line(GRAPH_X, GRAPH_Y + GRAPH_H * gi / 4, GRAPH_X + GRAPH_W, GRAPH_Y + GRAPH_H * gi / 4, C.ui, 1);
    }
    for (var gj = 1; gj < 8; gj++) {
      game.draw.line(GRAPH_X + GRAPH_W * gj / 8, GRAPH_Y, GRAPH_X + GRAPH_W * gj / 8, GRAPH_Y + GRAPH_H, C.ui, 1);
    }

    // Threshold line
    var threshY = GRAPH_Y + GRAPH_H * (1 - 0.7);
    game.draw.line(GRAPH_X, threshY, GRAPH_X + GRAPH_W, threshY, C.spike, 2);
    game.draw.text('閾値', GRAPH_X + GRAPH_W + 16, threshY + 8, { size: 28, color: C.spike });

    // Voltage history line
    for (var hi = 1; hi < voltageHistory.length; hi++) {
      var x1 = GRAPH_X + (hi - 1) / (HISTORY_LEN - 1) * GRAPH_W;
      var x2 = GRAPH_X + hi / (HISTORY_LEN - 1) * GRAPH_W;
      var y1 = GRAPH_Y + GRAPH_H * (1 - voltageHistory[hi - 1]);
      var y2 = GRAPH_Y + GRAPH_H * (1 - voltageHistory[hi]);
      var isSpiking = voltageHistory[hi] > 0.7;
      game.draw.line(x1, y1, x2, y2, isSpiking ? C.spike : C.line, isSpiking ? 4 : 2);
    }

    // Scan line
    game.draw.line(GRAPH_X + scanLine, GRAPH_Y, GRAPH_X + scanLine, GRAPH_Y + GRAPH_H, C.line, 1);

    // Current voltage dot
    var curY = GRAPH_Y + GRAPH_H * (1 - voltage);
    var dotCol = voltage > 0.7 ? C.spike : C.line;
    game.draw.circle(GRAPH_X + GRAPH_W, curY, 14, dotCol, 0.9);
    if (voltage > 0.7) {
      game.draw.circle(GRAPH_X + GRAPH_W, curY, 24 + Math.sin(elapsed * 12) * 6, C.spike, 0.3);
      game.draw.text('SPIKE!', GRAPH_X + GRAPH_W - 80, curY - 40, { size: 36, color: C.spike, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Result
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, GRAPH_Y + GRAPH_H + 60, { size: 52, color: resultText.includes('DETECTED') ? C.hit : C.miss, bold: true });
    } else {
      var indicator = voltage > 0.7 ? '⚡ タップ！' : '監視中...';
      game.draw.text(indicator, W / 2, GRAPH_Y + GRAPH_H + 60, { size: 48, color: voltage > 0.7 ? C.spike : C.ui });
    }

    // Voltage display
    game.draw.text('V: ' + voltage.toFixed(2), GRAPH_X + 80, GRAPH_Y - 30, { size: 36, color: voltage > 0.7 ? C.spike : C.text });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < missed ? C.miss : C.ui, 0.9);
    }

    game.draw.text(detected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.line : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
  });
})(game);
