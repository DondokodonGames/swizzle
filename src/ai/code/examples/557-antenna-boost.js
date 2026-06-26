// 557-antenna-boost.js
// アンテナブースト — 信号強度バーを見てタップのタイミングでブースト
// 操作: タップでブースト（信号が高い時にタップするほど効果大）
// 成功: 15ブースト成功  失敗: 10ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020810',
    panel:   '#050f1a',
    bar:     '#001a2a',
    signal0: '#003355',
    signal1: '#0066aa',
    signal2: '#00aaff',
    signal3: '#44ddff',
    peak:    '#ffffff',
    boost:   '#ff6600',
    boostHi: '#ffcc44',
    hit:     '#22ff88',
    miss:    '#ff2244',
    antenna: '#334455',
    text:    '#a0d8ef',
    ui:      '#224466'
  };

  var CX = W / 2;
  var BAR_X = 120;
  var BAR_Y = H * 0.25;
  var BAR_W = W - 240;
  var BAR_H = 200;
  var SIGNAL_Y = BAR_Y + BAR_H + 80;

  var signalStrength = 0.3; // 0-1
  var signalVel = 0;
  var boostCount = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.hit;
  var boostAnim = 0;
  var lastResult = '', lastResultTimer = 0, lastResultCol = C.hit;
  var totalBoost = 0;
  var signalHistory = [];
  var HISTORY_LEN = 60;

  for (var i = 0; i < HISTORY_LEN; i++) signalHistory.push(0.3);

  var spikeTimer = 2.0;
  var spikePhase = 'none';
  var spikeTimer2 = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    if (signalStrength > 0.65) {
      // Good boost!
      var quality = (signalStrength - 0.65) / 0.35; // 0-1 within boost zone
      boostCount++;
      totalBoost += quality;
      boostAnim = 0.5;
      flashCol = C.hit;
      flashAnim = 0.3;
      lastResult = quality > 0.7 ? 'PERFECT!' : 'GOOD';
      lastResultCol = quality > 0.7 ? C.peak : C.hit;
      lastResultTimer = 0.7;
      game.audio.play('se_success', 0.7 + quality * 0.2);
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: BAR_Y + BAR_H / 2, vx: Math.cos(ang) * 240, vy: Math.sin(ang) * 240, life: 0.5, col: quality > 0.7 ? C.peak : C.boostHi });
      }
      signalStrength = 0.2; // drop after boost
      if (boostCount >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(boostCount * 300 + Math.ceil(totalBoost * 300) + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      // Miss
      misses++;
      flashCol = C.miss;
      flashAnim = 0.3;
      lastResult = 'MISS';
      lastResultCol = C.miss;
      lastResultTimer = 0.6;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
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
    if (boostAnim > 0) boostAnim -= dt * 2.5;
    if (lastResultTimer > 0) lastResultTimer -= dt;

    // Signal simulation
    if (spikePhase === 'none') {
      spikeTimer -= dt;
      signalVel += (Math.random() - 0.5) * 1.5 * dt;
      signalVel *= 0.85;
      signalStrength += signalVel;
      signalStrength = Math.max(0.05, Math.min(0.55, signalStrength));
      signalStrength += (0.3 - signalStrength) * dt * 1.5;
      if (spikeTimer <= 0) {
        spikePhase = 'rising';
        spikeTimer2 = 0.25;
        spikeTimer = 1.5 + Math.random() * 3.0;
      }
    } else if (spikePhase === 'rising') {
      spikeTimer2 -= dt;
      signalStrength = 0.3 + (0.7 - 0.3) * (1 - spikeTimer2 / 0.25);
      if (spikeTimer2 <= 0) { spikePhase = 'hold'; spikeTimer2 = 0.2 + Math.random() * 0.3; signalStrength = 0.9; }
    } else if (spikePhase === 'hold') {
      spikeTimer2 -= dt;
      signalStrength = 0.85 + Math.random() * 0.1;
      if (spikeTimer2 <= 0) { spikePhase = 'falling'; spikeTimer2 = 0.3; }
    } else if (spikePhase === 'falling') {
      spikeTimer2 -= dt;
      signalStrength = 0.3 + (0.7 - 0.3) * (spikeTimer2 / 0.3);
      if (spikeTimer2 <= 0) { spikePhase = 'none'; signalStrength = 0.3; }
    }

    signalHistory.push(signalStrength);
    if (signalHistory.length > HISTORY_LEN) signalHistory.shift();

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(BAR_X - 20, BAR_Y - 20, BAR_W + 40, BAR_H + 40, C.panel, 0.9);

    // Signal bar background
    game.draw.rect(BAR_X, BAR_Y, BAR_W, BAR_H, C.bar, 0.9);

    // Signal bar fill
    var fillH = BAR_H * signalStrength;
    var fillY = BAR_Y + BAR_H - fillH;
    var barCol = signalStrength > 0.65 ? C.signal3 : signalStrength > 0.4 ? C.signal2 : C.signal1;
    game.draw.rect(BAR_X, fillY, BAR_W, fillH, barCol, 0.9);
    if (signalStrength > 0.65) {
      game.draw.rect(BAR_X, fillY, BAR_W, fillH, C.signal3, 0.2);
    }

    // Threshold line
    var threshY = BAR_Y + BAR_H * (1 - 0.65);
    game.draw.line(BAR_X, threshY, BAR_X + BAR_W, threshY, C.boost, 4);
    game.draw.text('タップゾーン', BAR_X + BAR_W + 20, threshY + 8, { size: 28, color: C.boost });

    // Signal history (mini-graph)
    for (var hi = 1; hi < signalHistory.length; hi++) {
      var gx1 = BAR_X + (hi - 1) / (HISTORY_LEN - 1) * BAR_W;
      var gx2 = BAR_X + hi / (HISTORY_LEN - 1) * BAR_W;
      var gy1 = SIGNAL_Y + 60 - signalHistory[hi - 1] * 80;
      var gy2 = SIGNAL_Y + 60 - signalHistory[hi] * 80;
      game.draw.line(gx1, gy1, gx2, gy2, signalHistory[hi] > 0.65 ? C.boost : C.signal1, signalHistory[hi] > 0.65 ? 4 : 2);
    }
    game.draw.text('信号履歴', BAR_X, SIGNAL_Y + 100, { size: 28, color: C.ui });

    // Boost indicator
    if (signalStrength > 0.65) {
      game.draw.rect(0, 0, W, H, C.boost, 0.03 + Math.sin(elapsed * 12) * 0.02);
      game.draw.text('⚡ BOOST!', CX, BAR_Y - 60, { size: 52, color: C.boostHi, bold: true });
    }

    // Antenna visual
    var antH = 200 + signalStrength * 100;
    game.draw.line(CX, H * 0.82, CX, H * 0.82 - antH, C.antenna, 12);
    game.draw.line(CX - 80, H * 0.82 - antH * 0.5, CX + 80, H * 0.82 - antH * 0.5, C.antenna, 6);
    for (var ri = 0; ri < 3; ri++) {
      var rr = (ri + 1) * 40 + boostAnim * 60;
      game.draw.circle(CX, H * 0.82 - antH, rr, signalStrength > 0.65 ? C.boostHi : C.signal2, (1 - ri * 0.3) * signalStrength * 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (lastResultTimer > 0) {
      game.draw.text(lastResult, CX, BAR_Y + BAR_H + 160, { size: 56, color: lastResultCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(boostCount + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.signal2 : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
  });
})(game);
