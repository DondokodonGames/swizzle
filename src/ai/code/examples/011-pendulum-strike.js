// 011-pendulum-strike.js
// 振り子ストライク — ちょうど真下に来た瞬間を狙う快感
// 操作: 振り子が中央ゾーンにいる間にタップ
// 成功: 5回ヒット  失敗: 3回ミス or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#10080a',
    rod:      '#92400e',
    ball:     '#fbbf24',
    ballEdge: '#f59e0b',
    zone:     '#22c55e',
    zoneGlow: '#4ade80',
    miss:     '#ef4444',
    trail:    '#fcd34d',
    ui:       '#78716c'
  };

  var PIVOT_X = W / 2;
  var PIVOT_Y = 180;
  var ROD_LEN = 600;

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 20;
  var done = false;

  var angle = Math.PI / 4;    // initial angle (radians from vertical)
  var angVel = 0;
  var GRAVITY = 3.2;          // angular gravity constant

  var feedback = 0; // timer
  var feedbackOk = false;

  var trailAngles = [];

  // Zone: ±18 degrees around center (vertical)
  var ZONE_HALF_DEG = 18 * Math.PI / 180;

  game.onTap(function(x, y) {
    if (done) return;
    feedback = 0.4;
    if (Math.abs(angle) <= ZONE_HALF_DEG) {
      score++;
      feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      // speed up next swing
      angVel *= 0.85;
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 20 + Math.ceil(timeLeft) * 4);
        }, 500);
      }
    } else {
      misses++;
      feedbackOk = false;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) {
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
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // pendulum physics: angular acceleration = -gravity * sin(angle)
    var angAccel = -GRAVITY * Math.sin(angle);
    angVel += angAccel * dt;
    angVel *= 0.999; // tiny damping (keep swinging)
    angle += angVel * dt;

    trailAngles.unshift(angle);
    if (trailAngles.length > 12) trailAngles.pop();

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // ceiling attachment
    game.draw.rect(W / 2 - 40, 0, 80, PIVOT_Y + 20, '#1c1008');
    game.draw.circle(PIVOT_X, PIVOT_Y, 24, '#6b3a0a');
    game.draw.circle(PIVOT_X, PIVOT_Y, 14, '#92400e');

    // timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#0d0608');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#92400e' : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fcd34d', bold: true });

    // score & misses
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 80;
      game.draw.circle(sx, 128, 24, s < score ? C.ball : '#1c1008');
      if (s < score) game.draw.circle(sx, 128, 14, '#ffffffaa');
    }
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 64;
      game.draw.circle(mx, 196, 18, m < misses ? C.miss : '#1c1008');
    }

    // target zone arc at bottom
    var arcY = PIVOT_Y + ROD_LEN + 40;
    var arcR = 80;
    // green zone
    game.draw.rect(PIVOT_X - arcR, arcY - 24, arcR * 2, 48, C.zone, 0.3);
    game.draw.rect(PIVOT_X - 8, arcY - 20, 16, 40, C.zone, 0.8);
    // zone glow
    var inZone = Math.abs(angle) <= ZONE_HALF_DEG;
    if (inZone) {
      game.draw.rect(PIVOT_X - arcR, arcY - 30, arcR * 2, 60, C.zoneGlow, 0.2 + 0.15 * Math.sin(game.time.elapsed * 12));
    }

    // trail (faint previous positions)
    for (var t = trailAngles.length - 1; t >= 1; t--) {
      var ta = trailAngles[t];
      var tbx = PIVOT_X + Math.sin(ta) * ROD_LEN;
      var tby = PIVOT_Y + Math.cos(ta) * ROD_LEN;
      var alpha = (1 - t / trailAngles.length) * 0.35;
      game.draw.circle(tbx, tby, 20 * (1 - t / trailAngles.length), C.trail, alpha);
    }

    // rod
    var ballX = PIVOT_X + Math.sin(angle) * ROD_LEN;
    var ballY = PIVOT_Y + Math.cos(angle) * ROD_LEN;
    game.draw.line(PIVOT_X, PIVOT_Y, ballX, ballY, C.rod, 10);
    game.draw.line(PIVOT_X, PIVOT_Y, ballX, ballY, '#78350f', 4);

    // ball
    game.draw.circle(ballX, ballY, 52, C.ballEdge);
    game.draw.circle(ballX, ballY, 44, C.ball);
    game.draw.circle(ballX - 14, ballY - 14, 16, '#fffbeb', 0.7);

    // feedback
    if (feedback > 0) {
      var p = 1 - feedback / 0.4;
      if (feedbackOk) {
        game.draw.text('HIT!', W / 2, arcY - 120 - p * 80, { size: 80, color: C.zoneGlow, bold: true });
        game.draw.circle(ballX, ballY, 52 + p * 60, C.zoneGlow, (1 - p) * 0.7);
      } else {
        game.draw.text('MISS', W / 2, arcY - 80, { size: 72, color: C.miss, bold: true });
      }
    }

    // guide
    game.draw.text('中央でタップ！', W / 2, H - 180, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
  });
})(game);
