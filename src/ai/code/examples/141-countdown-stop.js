// 141-countdown-stop.js
// カウントダウン止め — 0になる寸前でタップする究極の「待つ」緊張感
// 操作: タップで止める（0.3秒以内なら成功）
// 成功: 8回成功  失敗: 4回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06040a',
    ring:    '#1e1a2e',
    ringHi:  '#6d28d9',
    fill:    '#7c3aed',
    safe:    '#22c55e',
    danger:  '#ef4444',
    warn:    '#f59e0b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var DIAL_X = W / 2;
  var DIAL_Y = H * 0.48;
  var DIAL_R = 220;
  var SAFE_WINDOW = 0.3; // seconds

  var countdown = 0;
  var COUNTDOWN_MAX = 0;
  var running = false;
  var stopped = false;
  var stopTime = 0;

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 4;
  var timeLeft = 45;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var level = 0;

  function newRound() {
    level++;
    // Gets faster each round
    COUNTDOWN_MAX = 4.5 - level * 0.2;
    if (COUNTDOWN_MAX < 1.8) COUNTDOWN_MAX = 1.8;
    countdown = COUNTDOWN_MAX;
    running = true;
    stopped = false;
  }

  game.onTap(function() {
    if (done) return;
    if (!running && !stopped) {
      newRound();
      return;
    }
    if (stopped) return;
    // Stop the countdown
    running = false;
    stopped = true;
    stopTime = countdown;

    if (countdown <= SAFE_WINDOW) {
      score++;
      feedbackOk = true;
      feedback = 0.8;
      game.audio.play('se_success');
      if (score >= needed && !done) {
        done = true;
        setTimeout(function() { game.end.success(score*80 + Math.ceil(timeLeft)*15); }, 600);
        return;
      }
      setTimeout(function() { newRound(); }, 900);
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.8;
      game.audio.play('se_failure');
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      setTimeout(function() { newRound(); }, 900);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (running) {
      countdown -= dt;
      if (countdown <= 0) {
        // Time's up — missed
        countdown = 0;
        running = false;
        stopped = true;
        misses++;
        feedbackOk = false;
        feedback = 0.8;
        game.audio.play('se_failure');
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          setTimeout(function() { newRound(); }, 900);
        }
      }
    }
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Dial ring
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R + 20, C.ring, 0.5);
    game.draw.circle(DIAL_X, DIAL_Y, DIAL_R, C.ring, 0.9);

    // Fill arc (simulate with many small rects — draw as swept line indicator)
    var ratio = (running || stopped) ? countdown / COUNTDOWN_MAX : 1;
    var sweepColor = ratio < (SAFE_WINDOW / COUNTDOWN_MAX + 0.05) ? C.safe : (ratio < 0.35 ? C.warn : C.fill);
    // Draw arc via multiple lines from center
    var steps = 60;
    var startAngle = -Math.PI / 2;
    var endAngle = startAngle + (1 - ratio) * Math.PI * 2;
    for (var s = 0; s < steps; s++) {
      var ang = startAngle + (s / steps) * (endAngle - startAngle + Math.PI * 2 * ratio - Math.PI * 2);
      // Fill remaining (countdown ratio)
      var ang2 = startAngle + (s / steps) * ratio * Math.PI * 2;
      var ox = Math.cos(ang2) * DIAL_R * 0.8;
      var oy = Math.sin(ang2) * DIAL_R * 0.8;
      game.draw.line(DIAL_X, DIAL_Y, DIAL_X + Math.cos(ang2)*DIAL_R, DIAL_Y + Math.sin(ang2)*DIAL_R, sweepColor, 8);
    }

    // Center
    game.draw.circle(DIAL_X, DIAL_Y, 80, C.bg);
    game.draw.circle(DIAL_X, DIAL_Y, 60, sweepColor, 0.2);

    // Countdown number
    var dispNum = running ? countdown.toFixed(1) : (stopped ? stopTime.toFixed(1) : '---');
    game.draw.text(dispNum, DIAL_X, DIAL_Y, { size: 100, color: sweepColor, bold: true });

    // Safe zone indicator
    var safeAngle = -Math.PI/2 + (1 - SAFE_WINDOW / COUNTDOWN_MAX) * Math.PI * 2;
    game.draw.line(
      DIAL_X + Math.cos(safeAngle) * (DIAL_R - 40),
      DIAL_Y + Math.sin(safeAngle) * (DIAL_R - 40),
      DIAL_X + Math.cos(safeAngle) * (DIAL_R + 20),
      DIAL_Y + Math.sin(safeAngle) * (DIAL_R + 20),
      C.safe, 6
    );
    game.draw.text('HERE!', DIAL_X + Math.cos(safeAngle) * (DIAL_R + 60), DIAL_Y + Math.sin(safeAngle) * (DIAL_R + 60), { size: 36, color: C.safe, bold: true });

    // State text
    if (!running && !stopped) {
      var pulse = 0.6 + 0.4 * Math.abs(Math.sin(timeLeft * 2));
      game.draw.text('タップでスタート', W/2, H * 0.82, { size: 52, color: C.ringHi, bold: true });
      game.draw.circle(W/2, H * 0.82 + 60, 20, C.ringHi, pulse * 0.5);
    } else if (running) {
      var urgency = ratio < 0.25 ? C.danger : C.ui;
      game.draw.text('0に近づけてタップ！', W/2, H * 0.82, { size: 44, color: urgency });
    }

    // Feedback
    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.15);
      game.draw.text(feedbackOk ? '完璧！' : 'まだ早い！', W/2, H * 0.2, {
        size: 80, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Score
    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W/2+(mi-(maxMisses-1)/2)*52, 218, 18, mi < misses ? C.wrong : '#0a1020');
    }

    var tratio = Math.max(0, timeLeft/45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*tratio, 72, tratio > 0.3 ? C.fill : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
