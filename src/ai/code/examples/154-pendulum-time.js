// 154-pendulum-time.js
// 振り子タイミング — 揺れる振り子がピタリと的に重なる瞬間を狙い続ける快感
// 操作: タップで振り子を止める
// 成功: 8回連続命中  失敗: 3回外す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#07050f',
    rod:     '#4b5563',
    rodHi:   '#9ca3af',
    bob:     '#f59e0b',
    bobHi:   '#fef08a',
    zone:    '#22c55e',
    zoneHi:  '#86efac',
    danger:  '#ef4444',
    pivot:   '#6366f1',
    ui:      '#334155'
  };

  var PIVOT_X = W / 2;
  var PIVOT_Y = H * 0.18;
  var ROD_LEN = 520;

  // Pendulum physics
  var angle = 0.9; // radians from vertical
  var angleVel = 0;
  var GRAVITY_COEFF = 3.2; // pendulum speed
  var pendulumRunning = true;

  // Target zone
  var targetAngle = 0;
  var targetWidth = 0.18; // radians half-width
  var MIN_TARGET = 0.05;

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var frozenTimer = 0;
  var FREEZE_TIME = 0.5;

  function newTarget() {
    // Target somewhere the pendulum naturally swings through
    targetAngle = (Math.random() - 0.5) * 1.4;
    targetWidth = Math.max(MIN_TARGET, 0.18 - score * 0.012);
    angle = (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.3);
    angleVel = 0;
    pendulumRunning = true;
  }

  game.onTap(function() {
    if (done || frozenTimer > 0) return;
    pendulumRunning = false;
    var diff = Math.abs(angle - targetAngle);
    if (diff < targetWidth) {
      score++;
      feedbackOk = true;
      feedback = 0.5;
      game.audio.play('se_success', 0.8);
      frozenTimer = FREEZE_TIME;
      if (score >= needed && !done) {
        done = true;
        setTimeout(function() { game.end.success(score * 80 + Math.ceil(timeLeft) * 25); }, 500);
      } else {
        setTimeout(function() { newTarget(); }, FREEZE_TIME * 1000);
      }
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.5;
      game.audio.play('se_failure', 0.6);
      frozenTimer = 0.3;
      pendulumRunning = true;
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (frozenTimer > 0) frozenTimer -= dt;
    if (feedback > 0) feedback -= dt;

    if (pendulumRunning) {
      // Simple pendulum: angleAcc = -g/L * sin(angle)
      var angleAcc = -GRAVITY_COEFF * Math.sin(angle);
      angleVel += angleAcc * dt;
      angleVel *= Math.pow(0.999, dt * 60); // tiny damping
      angle += angleVel * dt;
    }

    var bobX = PIVOT_X + Math.sin(angle) * ROD_LEN;
    var bobY = PIVOT_Y + Math.cos(angle) * ROD_LEN;

    var zoneX1 = PIVOT_X + Math.sin(targetAngle - targetWidth) * ROD_LEN;
    var zoneY1 = PIVOT_Y + Math.cos(targetAngle - targetWidth) * ROD_LEN;
    var zoneX2 = PIVOT_X + Math.sin(targetAngle + targetWidth) * ROD_LEN;
    var zoneY2 = PIVOT_Y + Math.cos(targetAngle + targetWidth) * ROD_LEN;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Pendulum arc guide
    for (var a = -1.1; a <= 1.1; a += 0.04) {
      var ax = PIVOT_X + Math.sin(a) * ROD_LEN;
      var ay = PIVOT_Y + Math.cos(a) * ROD_LEN;
      game.draw.circle(ax, ay, 3, C.rod, 0.25);
    }

    // Target zone highlight on arc
    for (var a2 = targetAngle - targetWidth; a2 <= targetAngle + targetWidth; a2 += 0.01) {
      var tx = PIVOT_X + Math.sin(a2) * ROD_LEN;
      var ty = PIVOT_Y + Math.cos(a2) * ROD_LEN;
      game.draw.circle(tx, ty, 10, C.zone, 0.4);
    }
    // Target center
    var tzX = PIVOT_X + Math.sin(targetAngle) * ROD_LEN;
    var tzY = PIVOT_Y + Math.cos(targetAngle) * ROD_LEN;
    game.draw.circle(tzX, tzY, 24, C.zone, 0.7);
    game.draw.circle(tzX, tzY, 12, C.zoneHi, 0.9);

    // Target zone lines
    game.draw.line(PIVOT_X, PIVOT_Y, zoneX1, zoneY1, C.zone, 2);
    game.draw.line(PIVOT_X, PIVOT_Y, zoneX2, zoneY2, C.zone, 2);

    // Rod
    game.draw.line(PIVOT_X, PIVOT_Y, bobX, bobY, C.rod, 10);
    game.draw.line(PIVOT_X, PIVOT_Y, bobX, bobY, C.rodHi, 4);

    // Pivot
    game.draw.circle(PIVOT_X, PIVOT_Y, 22, C.pivot, 0.9);
    game.draw.circle(PIVOT_X, PIVOT_Y, 12, '#fff', 0.6);

    // Bob
    var inZone = Math.abs(angle - targetAngle) < targetWidth;
    game.draw.circle(bobX, bobY, 52, C.bobHi, 0.25);
    game.draw.circle(bobX, bobY, 40, inZone ? C.zone : C.bob, 0.95);
    game.draw.circle(bobX - 12, bobY - 14, 12, '#fff', 0.5);

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.zone : C.danger, feedback * 0.15);
    }

    // Zone width indicator
    var zonePercent = Math.round((targetWidth / 0.18) * 100);
    game.draw.text('的の広さ ' + zonePercent + '%', W / 2, H * 0.85, { size: 38, color: C.ui });
    game.draw.text('タップで止める', W / 2, H * 0.91, { size: 42, color: C.ui });

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 + (mi - 1) * 52, 218, 18, mi < misses ? C.danger : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.pivot : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.25); newTarget(); });
})(game);
