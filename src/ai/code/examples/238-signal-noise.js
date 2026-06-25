// 238-signal-noise.js
// シグナルノイズ — ノイズの中に隠れた信号パターンを見つけてタップする知覚ゲーム
// 操作: タップで信号を検出
// 成功: 15回正確に検出  失敗: 8回誤検出 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020208',
    noise:  '#1e293b',
    signal: '#22c55e',
    sigHi:  '#86efac',
    wrong:  '#ef4444',
    ui:     '#475569',
    waveN:  '#334155',
    waveS:  '#22c55e'
  };

  var SIGNAL_ZONE_Y = H * 0.4;
  var SIGNAL_ZONE_H = H * 0.35;

  // Wave display
  var wavePoints = [];
  var WAVE_W = W - 80;
  var WAVE_X = 40;
  var WAVE_PTS = 80;
  var waveTimer = 0;
  var signalActive = false;
  var signalStart = 0; // which wave point segment the signal appears
  var signalDur = 0;   // how many points wide the signal is
  var signalPhase = 0;
  var SIGNAL_LIFE = 1.5; // how long signal window lasts
  var signalTimer = 0;
  var NOISE_CYCLE = 0.8;
  var noiseTimer = 0;

  var detected = 0;
  var NEEDED = 15;
  var wrongs = 0;
  var MAX_WRONG = 8;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];

  function generateWave() {
    wavePoints = [];
    for (var i = 0; i < WAVE_PTS; i++) {
      var noise = (Math.random() - 0.5) * 60;
      wavePoints.push(noise);
    }

    // Possibly embed a signal
    if (signalActive) {
      var sigAmp = 80 + Math.random() * 40;
      var sigFreq = 0.3 + Math.random() * 0.4;
      signalStart = Math.floor(WAVE_PTS * 0.2 + Math.random() * WAVE_PTS * 0.6);
      signalDur = 8 + Math.floor(Math.random() * 8);
      for (var si = signalStart; si < Math.min(WAVE_PTS, signalStart + signalDur); si++) {
        wavePoints[si] = Math.sin((si - signalStart) * sigFreq * Math.PI) * sigAmp;
      }
    }
  }

  function startSignal() {
    signalActive = true;
    signalTimer = SIGNAL_LIFE;
    generateWave();
    game.audio.play('se_tap', 0.1);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var inZone = ty >= SIGNAL_ZONE_Y && ty <= SIGNAL_ZONE_Y + SIGNAL_ZONE_H;
    if (!inZone) return;

    if (signalActive && signalTimer > 0) {
      detected++;
      feedback = 'DETECTED! (' + detected + '/' + NEEDED + ')';
      feedbackCol = C.signal;
      feedbackTimer = 0.6;
      game.audio.play('se_success', 0.7);
      signalActive = false;
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: tx, y: ty, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.5 });
      }
      if (detected >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(detected * 100 + Math.ceil(timeLeft) * 30); }, 400);
      }
    } else {
      wrongs++;
      feedback = 'FALSE POSITIVE! (' + wrongs + '/' + MAX_WRONG + ')';
      feedbackCol = C.wrong;
      feedbackTimer = 0.6;
      game.audio.play('se_failure', 0.4);
      if (wrongs >= MAX_WRONG && !done) {
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

    // Signal timer
    if (signalActive) {
      signalTimer -= dt;
      if (signalTimer <= 0) {
        signalActive = false;
        // Missed
        wrongs++;
        feedback = 'MISSED SIGNAL!';
        feedbackCol = C.wrong;
        feedbackTimer = 0.5;
        game.audio.play('se_failure', 0.3);
        if (wrongs >= MAX_WRONG && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    // Noise cycle
    noiseTimer -= dt;
    if (noiseTimer <= 0) {
      generateWave();
      noiseTimer = NOISE_CYCLE;
      // Random chance to trigger signal
      if (!signalActive && Math.random() < 0.5) {
        startSignal();
      }
    }

    signalPhase += dt * 5;

    for (var pi = particles.length - 1; pi >= 0; pi--) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].life -= dt;
      if (particles[pi].life <= 0) particles.splice(pi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Signal zone background
    game.draw.rect(0, SIGNAL_ZONE_Y, W, SIGNAL_ZONE_H, C.noise, 0.3);
    game.draw.rect(0, SIGNAL_ZONE_Y, W, 4, signalActive ? C.sigHi : C.waveN, 0.7);
    game.draw.rect(0, SIGNAL_ZONE_Y + SIGNAL_ZONE_H - 4, W, 4, signalActive ? C.sigHi : C.waveN, 0.7);

    // Draw waveform
    var midY = SIGNAL_ZONE_Y + SIGNAL_ZONE_H / 2;
    for (var i = 0; i < wavePoints.length - 1; i++) {
      var x1 = WAVE_X + (i / WAVE_PTS) * WAVE_W;
      var y1 = midY + wavePoints[i];
      var x2 = WAVE_X + ((i + 1) / WAVE_PTS) * WAVE_W;
      var y2 = midY + wavePoints[i + 1];

      // Determine if this is signal segment
      var isSig = signalActive && i >= signalStart && i < signalStart + signalDur;
      var lineCol = isSig ? C.signal : C.waveN;
      var lineW = isSig ? 4 : 2;
      game.draw.line(x1, y1, x2, y2, lineCol, lineW);
    }

    // Signal indicator
    if (signalActive) {
      var pulse = 0.5 + 0.5 * Math.abs(Math.sin(signalPhase));
      game.draw.text('◉ 信号検出！タップ！', W / 2, SIGNAL_ZONE_Y - 40, { size: 44, color: C.signal, bold: true });
      game.draw.rect(0, SIGNAL_ZONE_Y, W, SIGNAL_ZONE_H, C.signal, pulse * 0.08);
    } else {
      game.draw.text('〜 ノイズ 〜', W / 2, SIGNAL_ZONE_Y - 40, { size: 42, color: C.ui });
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var p = particles[pp];
      game.draw.circle(p.x, p.y, 8 * p.life, C.sigHi, p.life * 0.8);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.82, { size: 42, color: feedbackCol, bold: true });
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 22 + wi * 44, H * 0.88, 14, wi < wrongs ? C.wrong : '#0a0a14');
    }

    game.draw.text(detected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.signal : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    generateWave();
    noiseTimer = 0.5;
  });
})(game);
