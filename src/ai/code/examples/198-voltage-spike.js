// 198-voltage-spike.js
// 電圧スパイク — 急上昇する電圧グラフのスパイクを即座にタップしてリセットするゲーム
// 操作: タップで電圧をリセット
// 成功: 30秒維持  失敗: 電圧が上限を超える

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020604',
    grid:    '#0a1a0a',
    line:    '#22c55e',
    lineHi:  '#86efac',
    spike:   '#ef4444',
    spikeHi: '#fca5a5',
    safe:    '#22c55e',
    danger:  '#f59e0b',
    critical:'#ef4444',
    ui:      '#334155'
  };

  var voltage = 0.2; // 0-1
  var SAFE_MAX = 0.7;
  var CRITICAL_MAX = 0.9;
  var BASE_RISE = 0.06; // per second
  var SPIKE_RISE = 0.8; // during spike
  var RESET_AMOUNT = 0.55;

  var spiking = false;
  var spikeTimer = 0;
  var SPIKE_DURATION = 1.2;
  var nextSpikeT = 2.0;
  var spikeInterval = 3.5;

  var survived = 0;
  var NEEDED = 30;
  var done = false;
  var elapsed = 0;

  var history = [];
  var HISTORY_LEN = 80;
  var tapFlash = 0;

  game.onTap(function() {
    if (done) return;
    voltage = Math.max(0, voltage - RESET_AMOUNT);
    spiking = false;
    spikeTimer = 0;
    tapFlash = 0.25;
    game.audio.play('se_tap', 0.6);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      survived += dt;
      elapsed += dt;
      if (survived >= NEEDED) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 60 + 500); }, 400);
        return;
      }
    }

    if (tapFlash > 0) tapFlash -= dt;

    // Spike logic
    if (!spiking) {
      nextSpikeT -= dt;
      if (nextSpikeT <= 0) {
        spiking = true;
        spikeTimer = SPIKE_DURATION;
        nextSpikeT = spikeInterval * (0.7 + Math.random() * 0.6);
        spikeInterval = Math.max(1.5, spikeInterval - 0.1);
      }
    } else {
      spikeTimer -= dt;
      if (spikeTimer <= 0) spiking = false;
    }

    // Voltage change
    var rise = spiking ? SPIKE_RISE : BASE_RISE;
    rise *= (1 + survived / 30);
    voltage = Math.min(1, voltage + rise * dt);

    // Record history
    history.push(voltage);
    if (history.length > HISTORY_LEN) history.shift();

    // Failure
    if (voltage >= 1 && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid lines
    for (var gy = 0; gy <= 4; gy++) {
      var gyY = H * 0.15 + gy * H * 0.14;
      game.draw.rect(80, gyY, W - 100, 2, C.grid, 0.6);
      var label = ['MAX', '75%', '50%', '25%', '0%'][gy];
      game.draw.text(label, 64, gyY, { size: 28, color: '#334155' });
    }

    // History graph
    var graphH = H * 0.56;
    var graphY = H * 0.15;
    var graphW = W - 100;
    var graphX = 80;
    for (var hi = 1; hi < history.length; hi++) {
      var x1 = graphX + (hi - 1) / HISTORY_LEN * graphW;
      var x2 = graphX + hi / HISTORY_LEN * graphW;
      var y1 = graphY + graphH * (1 - history[hi - 1]);
      var y2 = graphY + graphH * (1 - history[hi]);
      var col2 = history[hi] > CRITICAL_MAX ? C.critical : (history[hi] > SAFE_MAX ? C.danger : C.line);
      game.draw.line(x1, y1, x2, y2, col2, 4);
    }

    // Current voltage indicator
    var curY = graphY + graphH * (1 - voltage);
    var volCol = voltage > CRITICAL_MAX ? C.critical : (voltage > SAFE_MAX ? C.danger : C.safe);
    game.draw.circle(graphX + graphW, curY, 20, volCol, 0.4);
    game.draw.circle(graphX + graphW, curY, 12, volCol, 0.9);

    // Safe zone marker
    var safeY = graphY + graphH * (1 - SAFE_MAX);
    game.draw.rect(graphX, safeY, graphW, 3, C.danger, 0.6);
    var critY = graphY + graphH * (1 - CRITICAL_MAX);
    game.draw.rect(graphX, critY, graphW, 3, C.critical, 0.7);

    // Voltage readout
    game.draw.text(Math.round(voltage * 100) + 'V', W / 2, H * 0.76, { size: 80, color: volCol, bold: true });

    // Spike warning
    if (spiking) {
      var spikeAlpha = (1 - spikeTimer / SPIKE_DURATION) * 0.3;
      game.draw.rect(0, 0, W, H, C.critical, spikeAlpha + 0.05 * Math.abs(Math.sin(elapsed * 10)));
      game.draw.text('スパイク！', W / 2, H * 0.82, { size: 60, color: C.spikeHi, bold: true });
    } else {
      game.draw.text('タップでリセット', W / 2, H * 0.82, { size: 44, color: C.ui });
    }

    if (tapFlash > 0) {
      game.draw.rect(0, 0, W, H, C.safe, tapFlash * 0.15);
    }

    var ratio = Math.max(0, survived / NEEDED);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, C.line);
    game.draw.text(survived.toFixed(1) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.2); });
})(game);
