// 122-freeze-frame.js
// フリーズフレーム — 動く標的がぴったり重なった瞬間にタップする一瞬の快感
// 操作: タップでフリーズ（2つの図形が重なった瞬間を狙う）
// 成功: 8回ぴったり重ねる  失敗: 5回外す or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040610',
    target:  '#22c55e',
    mover:   '#f97316',
    overlap: '#facc15',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var CX = W / 2;
  var CY = H * 0.5;
  var ORBIT_R = 200; // mover orbits this radius
  var OBJ_R = 56; // radius of each shape
  var OVERLAP_THRESHOLD = 44; // centers must be within this to count

  // Fixed target
  var targetX = CX;
  var targetY = CY;

  // Moving object orbiting around center
  var angle = 0;
  var ORBIT_SPEED = 2.2; // rad/s, increases with level
  var speed = ORBIT_SPEED;

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 35;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var freezeTimer = 0;
  var frozen = false;

  // Second orbiting arm at different speed
  var angle2 = Math.PI;
  var speed2 = 1.5;

  // Determine target position: shifts after each success
  var targetOffsets = [
    [0, 0], [ORBIT_R, 0], [0, ORBIT_R], [-ORBIT_R, 0],
    [0, -ORBIT_R], [ORBIT_R*0.7, ORBIT_R*0.7], [-ORBIT_R*0.7, ORBIT_R*0.7],
    [ORBIT_R*0.7, -ORBIT_R*0.7], [-ORBIT_R*0.7, -ORBIT_R*0.7]
  ];
  var targetLevel = 0;

  function setTarget() {
    var off = targetOffsets[targetLevel % targetOffsets.length];
    targetX = CX + off[0];
    targetY = CY + off[1];
  }

  game.onTap(function() {
    if (done || frozen) return;
    frozen = true;
    freezeTimer = 0.5;

    // Check overlap of mover with target
    var mx = CX + Math.cos(angle) * ORBIT_R;
    var my = CY + Math.sin(angle) * ORBIT_R;
    var dx = mx - targetX, dy = my - targetY;
    var dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < OVERLAP_THRESHOLD) {
      score++;
      feedbackOk = true;
      feedback = 0.5;
      targetLevel++;
      speed = ORBIT_SPEED + score * 0.25;
      game.audio.play('se_success');
      if (score >= needed && !done) {
        done = true;
        setTimeout(function() { game.end.success(score * 80 + Math.ceil(timeLeft) * 12); }, 500);
        return;
      }
      setTimeout(function() { setTarget(); frozen = false; }, 550);
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.4;
      game.audio.play('se_failure');
      setTimeout(function() { frozen = false; }, 550);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
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

    if (!frozen) {
      angle += speed * dt;
      angle2 += speed2 * dt;
    }
    if (freezeTimer > 0) freezeTimer -= dt;
    if (feedback > 0) feedback -= dt;

    var mx = CX + Math.cos(angle) * ORBIT_R;
    var my = CY + Math.sin(angle) * ORBIT_R;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Orbit ring (guide)
    game.draw.circle(CX, CY, ORBIT_R, '#1a2035', 0.6);
    game.draw.circle(CX, CY, ORBIT_R, '#2a3555', 0);
    // Dotted orbit indication
    for (var di = 0; di < 24; di++) {
      var da = di / 24 * Math.PI * 2;
      var dx2 = CX + Math.cos(da) * ORBIT_R;
      var dy2 = CY + Math.sin(da) * ORBIT_R;
      game.draw.circle(dx2, dy2, 4, '#1e3050', 0.5);
    }

    // Target shape (fixed diamond)
    var dist2 = Math.sqrt((mx-targetX)*(mx-targetX) + (my-targetY)*(my-targetY));
    var isClose = dist2 < OVERLAP_THRESHOLD;
    var targetPulse = isClose ? (0.6 + 0.4 * Math.abs(Math.sin(timeLeft * 10))) : (0.5 + 0.3 * Math.abs(Math.sin(timeLeft * 2)));
    game.draw.circle(targetX, targetY, OBJ_R + 16, C.target, isClose ? targetPulse * 0.5 : 0.1);
    game.draw.circle(targetX, targetY, OBJ_R, C.target, 0.5);
    game.draw.rect(targetX - OBJ_R * 0.5, targetY - OBJ_R * 0.5, OBJ_R, OBJ_R, C.target, 0.7);

    // Moving shape (circle)
    var overlapAlpha = isClose ? 0.7 : 0.9;
    game.draw.circle(mx, my, OBJ_R + 10, C.mover, 0.25);
    game.draw.circle(mx, my, OBJ_R, isClose ? C.overlap : C.mover, overlapAlpha);
    game.draw.circle(mx - OBJ_R * 0.25, my - OBJ_R * 0.25, OBJ_R * 0.3, '#fff', 0.3);

    // Overlap indicator
    if (isClose) {
      game.draw.text('NOW!', CX, CY - 80, { size: 72, color: C.overlap, bold: true });
    }

    // Feedback
    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.2);
      game.draw.text(feedbackOk ? 'ぴったり！' : 'はずれ', W / 2, H * 0.2, {
        size: 72, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Score
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mii = 0; mii < maxMisses; mii++) {
      game.draw.circle(W/2 + (mii-2)*56, 216, 18, mii < misses ? C.wrong : '#0a1020');
    }

    game.draw.text('重なったらタップ！', W / 2, H * 0.88, { size: 52, color: C.ui });

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.mover : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    setTarget();
  });
})(game);
