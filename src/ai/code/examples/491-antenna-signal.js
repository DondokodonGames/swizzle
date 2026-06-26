// 491-antenna-signal.js
// アンテナ信号 — 電波の強度グラフを見ながら最強ポイントでタップ
// 操作: 信号が最大に近い瞬間をタップ
// 成功: 10回最大付近キャッチ  失敗: 10回失敗 or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020a06',
    panel:  '#0a1a0e',
    grid:   '#0f2a14',
    signal: '#22c55e',
    signalHi:'#86efac',
    peak:   '#fbbf24',
    peakHi: '#fef08a',
    miss:   '#ef4444',
    dot:    '#34d399',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var GRAPH_X = 60;
  var GRAPH_W = W - 120;
  var GRAPH_Y = H * 0.32;
  var GRAPH_H = H * 0.30;

  var signal = 0;        // current signal 0..1
  var signalPhase = 0;
  var signalPeriod = 3.0;
  var signalTarget = 0;
  var signalCurrent = 0;

  var hits = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var resultText = '';
  var resultCol = C.signal;
  var resultLife = 0;
  var THRESHOLD_HI = 0.82;
  var THRESHOLD_MED = 0.65;

  var history = []; // signal values for graph
  var MAX_HISTORY = 100;

  function newWave() {
    signalPeriod = 2.0 + Math.random() * 2.5;
    signalPhase = Math.random() * Math.PI * 2;
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    var val = signal;
    if (val >= THRESHOLD_HI) {
      hits++;
      resultText = '最強！';
      resultCol = C.peak;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: GRAPH_Y + GRAPH_H * (1 - val), vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.6, col: C.peakHi });
      }
      if (hits >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(hits * 500 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else if (val >= THRESHOLD_MED) {
      // Partial hit
      hits++;
      resultText = 'まあまあ';
      resultCol = C.signal;
      game.audio.play('se_tap', 0.5);
      if (hits >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(hits * 300 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      misses++;
      resultText = '弱すぎ！';
      resultCol = C.miss;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    resultLife = 0.8;
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

    if (resultLife > 0) resultLife -= dt * 2;

    // Signal oscillation (compound wave)
    signalPhase += dt / signalPeriod * Math.PI * 2;
    var wave1 = Math.sin(signalPhase) * 0.5 + 0.5;
    var wave2 = Math.sin(signalPhase * 2.3 + 1.1) * 0.2;
    var wave3 = Math.sin(signalPhase * 0.7 + 2.2) * 0.15;
    signal = Math.max(0, Math.min(1, wave1 + wave2 + wave3));

    // Occasionally reset wave
    if (Math.random() < dt * 0.3) {
      newWave();
    }

    // Record history
    history.push(signal);
    if (history.length > MAX_HISTORY) history.shift();

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(GRAPH_X - 10, GRAPH_Y - 10, GRAPH_W + 20, GRAPH_H + 20, C.panel, 0.9);

    // Grid lines
    for (var gi = 0; gi <= 4; gi++) {
      var gy = GRAPH_Y + GRAPH_H * (gi / 4);
      game.draw.line(GRAPH_X, gy, GRAPH_X + GRAPH_W, gy, C.grid, 2);
    }

    // Threshold lines
    game.draw.line(GRAPH_X, GRAPH_Y + GRAPH_H * (1 - THRESHOLD_HI), GRAPH_X + GRAPH_W, GRAPH_Y + GRAPH_H * (1 - THRESHOLD_HI), C.peak, 3);
    game.draw.line(GRAPH_X, GRAPH_Y + GRAPH_H * (1 - THRESHOLD_MED), GRAPH_X + GRAPH_W, GRAPH_Y + GRAPH_H * (1 - THRESHOLD_MED), C.signal, 2);
    game.draw.text('最強', GRAPH_X - 50, GRAPH_Y + GRAPH_H * (1 - THRESHOLD_HI) + 6, { size: 28, color: C.peak });
    game.draw.text('可', GRAPH_X - 30, GRAPH_Y + GRAPH_H * (1 - THRESHOLD_MED) + 6, { size: 28, color: C.signal });

    // Signal history graph
    for (var hi = 1; hi < history.length; hi++) {
      var x1 = GRAPH_X + (hi - 1) / MAX_HISTORY * GRAPH_W;
      var x2 = GRAPH_X + hi / MAX_HISTORY * GRAPH_W;
      var y1 = GRAPH_Y + GRAPH_H * (1 - history[hi - 1]);
      var y2 = GRAPH_Y + GRAPH_H * (1 - history[hi]);
      var lineCol = history[hi] >= THRESHOLD_HI ? C.peak : history[hi] >= THRESHOLD_MED ? C.signalHi : C.signal;
      game.draw.line(x1, y1, x2, y2, lineCol, 4);
    }

    // Current signal dot
    var curY = GRAPH_Y + GRAPH_H * (1 - signal);
    var dotCol = signal >= THRESHOLD_HI ? C.peakHi : signal >= THRESHOLD_MED ? C.signalHi : C.signal;
    game.draw.circle(GRAPH_X + GRAPH_W, curY, 24, dotCol, 0.3);
    game.draw.circle(GRAPH_X + GRAPH_W, curY, 16, dotCol, 0.9);

    // Big signal meter
    var meterH = H * 0.16;
    var meterX = W / 2;
    var meterY = H * 0.73;
    game.draw.rect(meterX - 200, meterY, 400, meterH, C.panel, 0.8);
    var fillCol = signal >= THRESHOLD_HI ? C.peak : signal >= THRESHOLD_MED ? C.signalHi : C.signal;
    game.draw.rect(meterX - 200, meterY + meterH * (1 - signal), 400, meterH * signal, fillCol, 0.85);
    game.draw.rect(meterX - 200, meterY + meterH * (1 - THRESHOLD_HI), 400, 6, C.peak, 0.7);
    game.draw.text(Math.floor(signal * 100) + '%', meterX, meterY + meterH / 2 + 16, { size: 72, color: '#fff', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Result feedback
    if (resultLife > 0) {
      game.draw.text(resultText, W / 2, H * 0.93, { size: 60, color: resultCol, bold: true });
    } else {
      game.draw.text('タップ！', W / 2, H * 0.93, { size: 52, color: C.ui });
    }

    // Miss indicators
    var missPerRow = 5;
    for (var mi = 0; mi < MAX_MISS; mi++) {
      var mx = W * 0.1 + (mi % missPerRow) * (W * 0.8 / (missPerRow - 1));
      var my2 = mi < missPerRow ? H * 0.948 : H * 0.963;
      game.draw.circle(mx, my2, 12, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.signal : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    newWave();
  });
})(game);
