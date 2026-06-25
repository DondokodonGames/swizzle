// 271-heartbeat-tap.js
// ハートビートタップ — 心電図の波形に合わせてタップする医療系リズムゲーム
// 操作: 心電図のピークに合わせてタップ
// 成功: 20回正確にタップ  失敗: 8回外す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030508',
    grid:   '#0d1f1a',
    line:   '#22c55e',
    lineHi: '#86efac',
    peak:   '#ef4444',
    peakHi: '#fca5a5',
    tap:    '#fde68a',
    miss:   '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var CY = H * 0.48;
  var GRAPH_W = W;
  var history = [];
  var histMax = W;
  var phase = 0;
  var beatPeriod = 1.1; // seconds per beat
  var beatTimer = 0;
  var peaked = false;
  var peakWindow = false;
  var peakWindowTimer = 0;
  var PEAK_WINDOW = 0.22;

  var hits = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var tapFlash = [];

  function ecgSample(t) {
    // Simplified ECG waveform as function of beat phase
    var p = t % 1;
    if (p < 0.1) return Math.sin(p * Math.PI * 10) * 20; // P wave
    if (p < 0.38) return 0;
    if (p < 0.4) return -30; // Q dip
    if (p < 0.43) return 200; // R peak (tall spike)
    if (p < 0.46) return -40; // S dip
    if (p < 0.55) return 0;
    if (p < 0.7) return Math.sin((p - 0.55) / 0.15 * Math.PI) * 35; // T wave
    return 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (peakWindow) {
      hits++;
      feedback = 'ナイス！ ' + hits + '/' + NEEDED;
      feedbackCol = C.lineHi;
      feedbackTimer = 0.5;
      peakWindow = false;
      game.audio.play('se_success', 0.5);
      tapFlash.push({ x: tx, y: ty, life: 0.4 });
      if (hits >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(hits * 150 + Math.ceil(timeLeft) * 80); }, 400);
      }
    } else {
      misses++;
      feedback = 'ミス！ (' + misses + '/' + MAX_MISS + ')';
      feedbackCol = C.miss;
      feedbackTimer = 0.5;
      game.audio.play('se_failure', 0.4);
      tapFlash.push({ x: tx, y: ty, life: 0.4, bad: true });
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
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

    beatTimer += dt;
    phase = beatTimer / beatPeriod;
    var sample = ecgSample(phase);

    history.push(CY - sample);
    if (history.length > histMax) history.shift();

    // Detect R peak: phase ~ 0.43 in beat period
    var beatPhase = (beatTimer % beatPeriod) / beatPeriod;
    if (beatPhase > 0.4 && beatPhase < 0.46 && !peaked) {
      peaked = true;
      peakWindow = true;
      peakWindowTimer = PEAK_WINDOW;
    } else if (beatPhase > 0.5) {
      peaked = false;
      if (peakWindow) {
        // Missed the peak
        misses++;
        feedback = '外した！ (' + misses + '/' + MAX_MISS + ')';
        feedbackCol = C.miss;
        feedbackTimer = 0.5;
        game.audio.play('se_failure', 0.35);
        peakWindow = false;
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    if (peakWindow) {
      peakWindowTimer -= dt;
      if (peakWindowTimer <= 0) peakWindow = false;
    }

    // Speed up over time
    beatPeriod = Math.max(0.7, 1.1 - hits * 0.02);

    for (var tf = tapFlash.length - 1; tf >= 0; tf--) {
      tapFlash[tf].life -= dt;
      if (tapFlash[tf].life <= 0) tapFlash.splice(tf, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid lines
    for (var gy = 0; gy < 8; gy++) {
      var yy = H * 0.2 + gy * H * 0.1;
      game.draw.line(0, yy, W, yy, C.grid, 1);
    }
    for (var gx = 0; gx < 12; gx++) {
      game.draw.line(gx * W / 10, H * 0.2, gx * W / 10, H * 0.78, C.grid, 1);
    }

    // ECG line
    if (history.length > 1) {
      var step = W / histMax;
      for (var i = 1; i < history.length; i++) {
        var x1 = (i - 1) * step;
        var x2 = i * step;
        game.draw.line(x1, history[i - 1], x2, history[i], C.line, 4);
      }
    }

    // Peak window indicator
    if (peakWindow) {
      game.draw.rect(W - 120, CY - 220, 80, 40, C.peak, 0.8);
      game.draw.text('TAP!', W - 80, CY - 200, { size: 36, color: '#fff', bold: true });
      game.draw.circle(W - 30, CY - 200, 18, C.peak, 0.9 + 0.1 * Math.sin(elapsed * 20));
    }

    // Current ECG dot
    var curY = history[history.length - 1] || CY;
    game.draw.circle(W - 10, curY, 10, C.lineHi, 0.9);

    // Tap flashes
    for (var tf2 = 0; tf2 < tapFlash.length; tf2++) {
      var t2 = tapFlash[tf2];
      var a6 = t2.life / 0.4;
      game.draw.circle(t2.x, t2.y, 50 * (1 - a6) + 20, t2.bad ? C.miss : C.tap, a6 * 0.8);
    }

    // Heart icon
    var hb = 0.85 + 0.15 * Math.abs(Math.sin(elapsed * (60 / beatPeriod) * Math.PI / 30));
    game.draw.text('♥', W * 0.82, H * 0.74, { size: 80 * hb, color: C.peak, bold: true });
    game.draw.text(Math.round(60 / beatPeriod) + ' bpm', W * 0.82, H * 0.81, { size: 34, color: C.ui });

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.87, { size: 46, color: feedbackCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 24 + mi * 48, H * 0.93, 14, mi < misses ? C.miss : '#060a10');
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.line : C.peak);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    for (var i = 0; i < histMax; i++) history.push(CY);
  });
})(game);
