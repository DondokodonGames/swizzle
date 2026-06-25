// 114-pendulum-swing.js
// 振り子の弧 — 完璧なタイミングで手を離して的に飛び込む空中ブランコの緊張感
// 操作: タップで手を離してジャンプ
// 成功: 8回的に着地  失敗: 5回外す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#030812',
    rope:     '#475569',
    swinger:  '#f97316',
    swingerHi:'#fed7aa',
    target:   '#22c55e',
    targetHi: '#86efac',
    wrong:    '#ef4444',
    correct:  '#22c55e',
    ui:       '#334155'
  };

  var PIVOT_X = W / 2;
  var PIVOT_Y = H * 0.08;
  var ROPE_L = 480;
  var angle = -Math.PI / 3; // start left
  var angVel = 0;
  var GRAVITY = 9.8;
  var swinging = true;
  var released = false;

  // Projectile after release
  var projX = 0, projY = 0, projVX = 0, projVY = 0;

  var targets = []; // { x, y, r, hit }
  var TARGET_R = 70;
  var PERSON_R = 28;

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var round = 0;

  function placePlatform() {
    var side = Math.random() > 0.5 ? 1 : -1;
    var tx = W / 2 + side * (160 + Math.random() * 280);
    var ty = H * 0.5 + Math.random() * H * 0.2;
    targets = [{ x: tx, y: ty, r: TARGET_R, hit: false }];
  }

  function resetSwing() {
    angle = (Math.random() > 0.5 ? -1 : 1) * (Math.PI / 4 + Math.random() * Math.PI / 6);
    angVel = 0;
    swinging = true;
    released = false;
    round++;
  }

  game.onTap(function() {
    if (done || !swinging) return;
    // Release
    swinging = false;
    released = true;
    var sx = PIVOT_X + Math.sin(angle) * ROPE_L;
    var sy = PIVOT_Y + Math.cos(angle) * ROPE_L;
    // Velocity from angular velocity
    projX = sx; projY = sy;
    projVX = angVel * ROPE_L * Math.cos(angle);
    projVY = angVel * ROPE_L * -Math.sin(angle);
    game.audio.play('se_tap', 0.7);
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

    if (swinging) {
      // Pendulum physics
      var accel = -(GRAVITY / (ROPE_L / 100)) * Math.sin(angle);
      angVel += accel * dt * 3;
      angVel *= 0.999; // very light damping
      angle += angVel * dt;
    }

    if (released) {
      projVY += 1600 * dt;
      projX += projVX * dt;
      projY += projVY * dt;

      // Check hit
      if (targets.length > 0) {
        var t = targets[0];
        var dx = projX - t.x, dy = projY - t.y;
        if (Math.sqrt(dx * dx + dy * dy) < TARGET_R + PERSON_R) {
          score++;
          feedbackOk = true;
          feedback = 0.5;
          game.audio.play('se_success');
          released = false;
          placePlatform();
          if (score >= needed && !done) {
            done = true;
            setTimeout(function() { game.end.success(score * 60 + Math.ceil(timeLeft) * 10); }, 600);
            return;
          }
          setTimeout(function() { resetSwing(); }, 600);
          return;
        }
      }

      // Miss (fell off screen)
      if (projY > H + 100) {
        misses++;
        feedbackOk = false;
        feedback = 0.5;
        game.audio.play('se_failure');
        released = false;
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
        setTimeout(function() { resetSwing(); }, 600);
      }
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Target platform
    if (targets.length > 0) {
      var t2 = targets[0];
      var tPulse = 0.5 + 0.4 * Math.abs(Math.sin(timeLeft * 2));
      game.draw.circle(t2.x, t2.y, t2.r + 16, C.targetHi, tPulse * 0.2);
      game.draw.circle(t2.x, t2.y, t2.r, C.target, 0.5);
      game.draw.circle(t2.x, t2.y, t2.r * 0.5, C.target, 0.8);
      game.draw.circle(t2.x, t2.y, 16, C.targetHi);
    }

    if (swinging) {
      var sx2 = PIVOT_X + Math.sin(angle) * ROPE_L;
      var sy2 = PIVOT_Y + Math.cos(angle) * ROPE_L;
      // Rope
      game.draw.line(PIVOT_X, PIVOT_Y, sx2, sy2, C.rope, 6);
      // Pivot
      game.draw.circle(PIVOT_X, PIVOT_Y, 20, '#1e2d45');
      game.draw.circle(PIVOT_X, PIVOT_Y, 12, C.rope);
      // Swinger
      game.draw.circle(sx2, sy2, PERSON_R + 6, C.swingerHi, 0.3);
      game.draw.circle(sx2, sy2, PERSON_R, C.swinger);
    }

    if (released) {
      game.draw.circle(projX, projY, PERSON_R + 6, C.swingerHi, 0.3);
      game.draw.circle(projX, projY, PERSON_R, C.swinger);
    }

    // Feedback
    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.2);
      game.draw.text(feedbackOk ? '着地！' : '落下…', W / 2, H * 0.3, {
        size: 88, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Score & misses
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 + (mi - 2) * 56, 216, 18, mi < misses ? C.wrong : '#0a1428');
    }

    game.draw.text('タップで手を離す！', W / 2, H * 0.9, { size: 48, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.swinger : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    placePlatform();
  });
})(game);
