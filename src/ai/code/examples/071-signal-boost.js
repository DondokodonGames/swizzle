// 071-signal-boost.js
// シグナルブースト — 弱まる電波信号を連打でブーストし続けるサバイバル
// 操作: タップで信号を増幅、ただし過剰増幅（100%）はクラッシュ
// 成功: 30秒間信号を維持  失敗: 信号が0%以下 or 3回100%超過

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#030810',
    sigLow:   '#ef4444',
    sigMid:   '#eab308',
    sigHigh:  '#22c55e',
    sigOver:  '#ef4444',
    wave:     '#3b82f6',
    waveHi:   '#93c5fd',
    crash:    '#ef4444',
    ui:       '#475569'
  };

  var signal = 0.5; // 0.0 to 1.0
  var BOOST_AMOUNT = 0.08;
  var DECAY_RATE = 0.04; // per second
  var SAFE_MAX = 0.85; // above this, getting dangerous
  var CRASH_MAX = 1.0;

  var overloads = 0;
  var maxOverloads = 3;
  var timeLeft = 30;
  var done = false;

  var wavePhase = 0;
  var crashFlash = 0;
  var lastBoostTime = 0;
  var boostPulse = 0;

  var waveHistory = []; // signal history for visualization

  game.onTap(function(x, y) {
    if (done) return;
    signal += BOOST_AMOUNT;
    boostPulse = 0.15;
    game.audio.play('se_tap', 0.4);
    if (signal >= CRASH_MAX) {
      signal = 0.6;
      overloads++;
      crashFlash = 0.5;
      game.audio.play('se_failure', 0.8);
      if (overloads >= maxOverloads && !done) {
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
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(200 + Math.ceil(signal * 100)); }, 300);
        return;
      }
    }

    // Signal decays faster over time
    var decayMult = 1 + (30 - timeLeft) * 0.04;
    signal -= DECAY_RATE * decayMult * dt;
    if (signal < 0) {
      signal = 0;
      if (!done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }

    wavePhase += dt * 3;
    if (boostPulse > 0) boostPulse -= dt;
    if (crashFlash > 0) crashFlash -= dt;

    // Track signal history
    waveHistory.push(signal);
    if (waveHistory.length > 200) waveHistory.shift();

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    if (crashFlash > 0) {
      game.draw.rect(0, 0, W, H, C.crash, crashFlash * 0.3);
    }

    // Signal wave visualization
    var WH_X = 80;
    var WH_Y = H * 0.22;
    var WH_W = W - 160;
    var WH_H = H * 0.3;
    game.draw.rect(WH_X - 4, WH_Y - 4, WH_W + 8, WH_H + 8, '#050d18');
    game.draw.rect(WH_X, WH_Y, WH_W, WH_H, '#020608');

    // Draw signal history as wave
    for (var i = 1; i < waveHistory.length && i < WH_W; i++) {
      var x1 = WH_X + (i - 1) / waveHistory.length * WH_W;
      var x2 = WH_X + i / waveHistory.length * WH_W;
      var y1 = WH_Y + WH_H * (1 - waveHistory[i - 1]);
      var y2 = WH_Y + WH_H * (1 - waveHistory[i]);
      var col = waveHistory[i] < 0.3 ? C.sigLow : (waveHistory[i] < 0.7 ? C.sigMid : C.sigHigh);
      game.draw.line(x1, y1, x2, y2, col, 4);
    }

    // Current signal line (rightmost)
    var curX = WH_X + WH_W;
    var curY = WH_Y + WH_H * (1 - signal);
    game.draw.circle(curX, curY, 12, '#fff', 0.8);

    // Safe zone markers
    game.draw.line(WH_X, WH_Y + WH_H * (1 - SAFE_MAX), WH_X + WH_W, WH_Y + WH_H * (1 - SAFE_MAX), C.sigOver, 2);
    game.draw.text('MAX', WH_X - 60, WH_Y + WH_H * (1 - SAFE_MAX), { size: 28, color: '#ef4444' });
    game.draw.line(WH_X, WH_Y + WH_H * 0.7, WH_X + WH_W, WH_Y + WH_H * 0.7, C.sigMid, 2);
    game.draw.text('MIN', WH_X - 60, WH_Y + WH_H * 0.7, { size: 28, color: '#eab308' });

    // Big signal gauge
    var GAUGE_X = W / 2 - 80;
    var GAUGE_Y = H * 0.6;
    var GAUGE_W = 160;
    var GAUGE_H = H * 0.22;
    game.draw.rect(GAUGE_X - 8, GAUGE_Y - 8, GAUGE_W + 16, GAUGE_H + 16, '#050d18');
    game.draw.rect(GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H, '#020608');

    var fillH = GAUGE_H * signal;
    var fillY = GAUGE_Y + GAUGE_H - fillH;
    var gaugeColor = signal < 0.3 ? C.sigLow : (signal < SAFE_MAX ? C.sigHigh : C.sigOver);
    if (fillH > 0) {
      game.draw.rect(GAUGE_X, fillY, GAUGE_W, fillH, gaugeColor);
      game.draw.rect(GAUGE_X + 12, fillY + 8, GAUGE_W - 24, 12, '#fff', 0.2);
    }

    // Boost pulse
    if (boostPulse > 0) {
      game.draw.rect(GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H, '#fff', boostPulse / 0.15 * 0.4);
    }

    // Signal percentage
    game.draw.text(Math.floor(signal * 100) + '%', W / 2, GAUGE_Y + GAUGE_H + 60, {
      size: 64, color: gaugeColor, bold: true
    });

    // Danger animation when near max
    if (signal > SAFE_MAX) {
      var oPulse = 0.5 + 0.5 * Math.sin(game.time.elapsed * 16);
      game.draw.rect(GAUGE_X, GAUGE_Y, GAUGE_W, GAUGE_H * 0.1, C.crash, oPulse * 0.5);
      game.draw.text('危険！', W / 2, H * 0.58, { size: 56, color: C.crash, bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#030810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wave : C.sigLow);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Overload pips
    for (var o = 0; o < maxOverloads; o++) {
      var ox = W / 2 + (o - 1) * 64;
      game.draw.circle(ox, 140, 20, o < overloads ? C.crash : '#0a1428');
    }

    // Guide
    game.draw.text('連打で信号を維持！(~85%)', W / 2, H - 200, { size: 48, color: C.ui });
    game.draw.text('100%でクラッシュ！', W / 2, H - 140, { size: 40, color: '#334155' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
