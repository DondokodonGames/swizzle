// 220-sand-timer.js
// サンドタイマー — 砂時計を傾けるタイミングで5秒ぴったりを狙う時間感覚ゲーム
// 操作: タップで砂時計を反転  ちょうど5秒の感覚を鍛える
// 成功: 5回連続±0.5秒以内  失敗: 3回大きくズレる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a0f08',
    glass:  '#7c6048',
    glassHi:'#c4a882',
    sand:   '#f59e0b',
    sandHi: '#fde68a',
    perfect:'#22c55e',
    good:   '#a855f7',
    miss:   '#ef4444',
    ui:     '#6b5a3e'
  };

  var TARGET_TIME = 5.0;
  var PERFECT_RANGE = 0.35;
  var GOOD_RANGE = 0.7;

  var timerRunning = false;
  var timerStart = 0;
  var sandLevel = 1.0;   // 1=full top, 0=all in bottom
  var flipped = false;   // false=normal (sand falls down), true=inverted
  var roundTime = 0;     // elapsed this round

  var successes = 0;
  var NEEDED = 5;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var phase = 'waiting'; // 'waiting' | 'running' | 'judged'
  var judgeTimer = 0;
  var totalTime = 60;
  var timeLeft = totalTime;

  var results = []; // last few results for display

  function startRound() {
    timerRunning = true;
    timerStart = elapsed;
    roundTime = 0;
    sandLevel = 1.0;
    flipped = false;
    phase = 'running';
  }

  function judgeRound() {
    var diff = Math.abs(roundTime - TARGET_TIME);
    timerRunning = false;
    phase = 'judged';
    judgeTimer = 1.2;

    results.unshift({ time: roundTime, diff: diff });
    if (results.length > 5) results.pop();

    if (diff <= PERFECT_RANGE) {
      successes++;
      feedback = 'PERFECT! ' + roundTime.toFixed(2) + 's';
      feedbackCol = C.perfect;
      feedbackTimer = 1.0;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.55, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.6 });
      }
      if (successes >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(successes * 200 + Math.ceil(timeLeft) * 30); }, 500);
      }
    } else if (diff <= GOOD_RANGE) {
      feedback = 'GOOD  ' + roundTime.toFixed(2) + 's';
      feedbackCol = C.good;
      feedbackTimer = 0.8;
      game.audio.play('se_tap', 0.5);
    } else {
      misses++;
      feedback = 'MISS  ' + roundTime.toFixed(2) + 's';
      feedbackCol = C.miss;
      feedbackTimer = 0.8;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'waiting') {
      startRound();
      game.audio.play('se_tap', 0.3);
    } else if (phase === 'running') {
      judgeRound();
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    if (phase === 'running') {
      roundTime = elapsed - timerStart;
      sandLevel = Math.max(0, 1.0 - roundTime / 10.0); // empties over 10s
    }

    if (phase === 'judged') {
      judgeTimer -= dt;
      if (judgeTimer <= 0 && !done) phase = 'waiting';
    }

    // Particles
    for (var pi = particles.length - 1; pi >= 0; pi--) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].vy += 200 * dt;
      particles[pi].life -= dt;
      if (particles[pi].life <= 0) particles.splice(pi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Hourglass shape
    var cx = W / 2;
    var cy = H * 0.45;
    var glW = 160;
    var glH = 240;

    // Top bulb
    game.draw.rect(cx - glW / 2, cy - glH, glW, glH, C.glass, 0.4);
    game.draw.rect(cx - glW / 2, cy - glH, glW, 8, C.glassHi, 0.5);
    // Top sand fill
    var topSandH = sandLevel * (glH - 20);
    if (topSandH > 0) {
      game.draw.rect(cx - glW / 2 + 4, cy - topSandH - 10, glW - 8, topSandH, C.sand, 0.85);
      game.draw.rect(cx - glW / 2 + 4, cy - topSandH - 10, glW - 8, 6, C.sandHi, 0.5);
    }

    // Neck (center)
    game.draw.rect(cx - 12, cy - 20, 24, 40, C.glass, 0.7);

    // Bottom bulb
    game.draw.rect(cx - glW / 2, cy, glW, glH, C.glass, 0.4);
    // Bottom sand fill
    var bottomSandH = (1.0 - sandLevel) * (glH - 20);
    if (bottomSandH > 0) {
      game.draw.rect(cx - glW / 2 + 4, cy + glH - bottomSandH - 4, glW - 8, bottomSandH, C.sand, 0.85);
    }

    // Frame lines
    game.draw.line(cx - glW / 2 - 10, cy - glH - 10, cx + glW / 2 + 10, cy - glH - 10, C.glassHi, 6);
    game.draw.line(cx - glW / 2 - 10, cy + glH + 10, cx + glW / 2 + 10, cy + glH + 10, C.glassHi, 6);
    game.draw.line(cx - glW / 2 - 10, cy - glH - 10, cx, cy, C.glassHi, 4);
    game.draw.line(cx + glW / 2 + 10, cy - glH - 10, cx, cy, C.glassHi, 4);
    game.draw.line(cx - glW / 2 - 10, cy + glH + 10, cx, cy, C.glassHi, 4);
    game.draw.line(cx + glW / 2 + 10, cy + glH + 10, cx, cy, C.glassHi, 4);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var p = particles[pp];
      game.draw.circle(p.x, p.y, 8 * p.life, C.sandHi, p.life * 0.8);
    }

    // Target indicator
    game.draw.rect(cx + glW / 2 + 20, cy - glH + (glH * (TARGET_TIME / 10.0)) - 4, 30, 8, C.perfect, 0.8);
    game.draw.text('5s', cx + glW / 2 + 60, cy - glH + (glH * (TARGET_TIME / 10.0)) + 8, { size: 30, color: C.perfect });

    // Timer display (only during running)
    if (phase === 'running') {
      game.draw.text(roundTime.toFixed(1) + 's', cx, cy + glH + 60, { size: 72, color: C.sand, bold: true });
    } else if (phase === 'waiting') {
      game.draw.text('タップでスタート', cx, cy + glH + 60, { size: 48, color: C.ui, bold: true });
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, cx, H * 0.88, { size: 44, color: feedbackCol, bold: true });
    }

    // Success counter
    game.draw.text(successes + ' / ' + NEEDED, cx, 148, { size: 60, color: '#f1f5f9', bold: true });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(cx - (MAX_MISS - 1) * 30 + mi * 60, 210, 18, mi < misses ? C.miss : '#1a0f08');
    }

    var ratio = Math.max(0, timeLeft / totalTime);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sand : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
