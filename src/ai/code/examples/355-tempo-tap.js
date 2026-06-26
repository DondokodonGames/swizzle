// 355-tempo-tap.js
// テンポタップ — リズムに合わせてぴったりのタイミングでタップし続ける
// 操作: タップ（BPMに合わせて正確に叩く）
// 成功: 30回連続95%以上精度を維持  失敗: 10回大きくズレる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050210',
    ring:   '#1e1b4b',
    ringHi: '#4338ca',
    pulse:  '#818cf8',
    pulseHi:'#a5b4fc',
    perfect:'#22c55e',
    perfectHi:'#86efac',
    good:   '#f59e0b',
    goodHi: '#fde68a',
    miss:   '#ef4444',
    missHi: '#fca5a5',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var BPM = 90;
  var beatInterval = 60 / BPM;
  var gameTime = 0;
  var nextBeatTime = 0;
  var PERFECT_WINDOW = 0.08; // ±80ms
  var GOOD_WINDOW = 0.18;    // ±180ms

  var hits = 0;
  var NEEDED = 30;
  var misses = 0;
  var MAX_MISS = 10;
  var combo = 0;
  var accuracy = 0; // 0-1
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var ringScale = 1.0;
  var ringAlpha = 0.0;
  var lastTapDiff = 0;
  var lastTapResult = '';
  var lastTapCol = C.perfect;
  var tapAnim = 0;
  var pulses = [];
  var beatFlash = 0;

  function beatPhase() {
    return (gameTime % beatInterval) / beatInterval;
  }

  function timeToBeat() {
    var phase = gameTime % beatInterval;
    if (phase < beatInterval / 2) return phase;
    return phase - beatInterval;
  }

  game.onTap(function() {
    if (done) return;
    var diff = Math.abs(timeToBeat());
    lastTapDiff = diff;

    if (diff < PERFECT_WINDOW) {
      hits++;
      combo++;
      lastTapResult = 'PERFECT!';
      lastTapCol = C.perfectHi;
      tapAnim = 0.6;
      game.audio.play('se_tap', 0.6);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W/2, y: H*0.42, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life:0.5, col: C.perfectHi });
      }
      if (hits >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(hits * 150 + combo * 50 + Math.ceil(timeLeft) * 80); }, 400);
        return;
      }
    } else if (diff < GOOD_WINDOW) {
      hits++;
      combo++;
      lastTapResult = 'GOOD';
      lastTapCol = C.goodHi;
      tapAnim = 0.5;
      game.audio.play('se_tap', 0.4);
    } else {
      misses++;
      combo = 0;
      lastTapResult = 'MISS';
      lastTapCol = C.missHi;
      tapAnim = 0.5;
      game.audio.play('se_failure', 0.25);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      gameTime += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (tapAnim > 0) tapAnim -= dt * 2.5;
    if (beatFlash > 0) beatFlash -= dt * 4;

    // Beat pulse visual
    var phase = beatPhase();
    if (phase < 0.05) {
      if (!pulses.length || pulses[pulses.length-1].born < gameTime - beatInterval * 0.9) {
        pulses.push({ r: 20, born: gameTime, life: 1.0 });
        beatFlash = 0.3;
      }
    }

    for (var pu = pulses.length - 1; pu >= 0; pu--) {
      pulses[pu].r += 300 * dt;
      pulses[pu].life -= dt * 2.5;
      if (pulses[pu].life <= 0) pulses.splice(pu, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background beat flash
    if (beatFlash > 0) {
      game.draw.rect(0, 0, W, H, C.ringHi, beatFlash * 0.08);
    }

    // Pulse rings
    for (var pu2 = 0; pu2 < pulses.length; pu2++) {
      var p2 = pulses[pu2];
      game.draw.circle(W / 2, H * 0.42, p2.r, C.ringHi, p2.life * 0.4);
    }

    // Main ring
    var ph = beatPhase();
    var ringPulse = 1 - ph; // grows as beat approaches
    var ringR = 160 + ringPulse * 60;
    game.draw.circle(W / 2, H * 0.42, ringR + 12, C.ring, 0.5);
    game.draw.circle(W / 2, H * 0.42, ringR, C.ringHi, 0.3 + ringPulse * 0.4);

    // Perfect zone indicator (inner ring at timing moment)
    var innerR = 80;
    game.draw.circle(W / 2, H * 0.42, innerR, C.perfect, 0.15 + Math.sin(elapsed * 4) * 0.05);
    game.draw.circle(W / 2, H * 0.42, innerR - 8, C.perfect, 0.1);

    // Tap target
    game.draw.circle(W / 2, H * 0.42, 44, C.pulse, 0.7 + beatFlash * 0.3);
    game.draw.circle(W / 2, H * 0.42, 28, C.pulseHi, 0.9);

    // Tap animation
    if (tapAnim > 0) {
      game.draw.circle(W / 2, H * 0.42, 44 + (1 - tapAnim) * 60, lastTapCol, tapAnim * 0.5);
    }

    // BPM display
    game.draw.text(BPM + ' BPM', W / 2, H * 0.66, { size: 40, color: C.ui });

    // Timing indicator bar
    var barW = 400;
    var barX = W / 2 - barW / 2;
    var barY = H * 0.7;
    game.draw.rect(barX, barY, barW, 20, '#1a1a2e', 0.9);
    // Perfect zone
    game.draw.rect(W/2 - PERFECT_WINDOW / beatInterval * barW, barY, PERFECT_WINDOW / beatInterval * barW * 2, 20, C.perfect, 0.5);
    // Good zone
    game.draw.rect(W/2 - GOOD_WINDOW / beatInterval * barW, barY, GOOD_WINDOW / beatInterval * barW * 2, 20, C.good, 0.3);
    // Needle (current beat phase)
    var needleX = barX + ph * barW;
    game.draw.line(needleX, barY - 8, needleX, barY + 28, C.pulseHi, 4);

    // Result text
    if (tapAnim > 0) {
      game.draw.text(lastTapResult, W / 2, H * 0.76, { size: 56, color: lastTapCol, bold: true });
    }
    if (combo > 2) {
      game.draw.text(combo + ' COMBO', W / 2, H * 0.8, { size: 40, color: C.pulseHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 8 * p3.life * 2, p3.col, p3.life * 0.8);
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 18 + mi * 36, H * 0.92, 12, mi < misses ? C.miss : '#0a0a18');
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ringHi : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    gameTime = 0;
    nextBeatTime = beatInterval * 0.5;
  });
})(game);
