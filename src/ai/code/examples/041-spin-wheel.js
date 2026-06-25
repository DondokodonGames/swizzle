// 041-spin-wheel.js
// スピンホイール — 回転するルーレットを狙った色で止める賭けの緊張感
// 操作: タップで回転を止める（目標セクターに止まれば成功）
// 成功: 5回目標セクターに止める  失敗: 3回外す or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#0a0814',
    ui:    '#475569',
    good:  '#22c55e',
    miss:  '#ef4444'
  };

  var WHEEL_COLORS = ['#ef4444','#f97316','#fbbf24','#22c55e','#3b82f6','#8b5cf6'];
  var WHEEL_R = 280;
  var cx = W / 2, cy = H * 0.43;
  var SECTORS = WHEEL_COLORS.length;
  var SECTOR_ANGLE = (Math.PI * 2) / SECTORS;

  var angle = 0;
  var angVel = 5.0; // radians/sec
  var spinning = true;
  var targetSector = 0;

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 20;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var waitTimer = 0;

  function newRound() {
    targetSector = Math.floor(Math.random() * SECTORS);
    angVel = 4.0 + Math.random() * 3.0 + score * 0.4;
    spinning = true;
    waitTimer = 0;
  }

  function getTopSector() {
    // Top of wheel = -π/2 (12 o'clock)
    // Sector 0 starts at angle 0, going clockwise
    var topAngle = (-Math.PI / 2 - angle + Math.PI * 100) % (Math.PI * 2);
    return Math.floor(topAngle / SECTOR_ANGLE) % SECTORS;
  }

  game.onTap(function(x, y) {
    if (done || !spinning || waitTimer > 0) return;

    spinning = false;
    var landedSector = getTopSector();
    feedback = 0.5;

    if (landedSector === targetSector) {
      score++;
      feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 20 + Math.ceil(timeLeft) * 5);
        }, 600);
        return;
      }
    } else {
      misses++;
      feedbackOk = false;
      game.audio.play('se_failure', 0.6);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    waitTimer = 0.6;
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) newRound();
    }

    if (spinning) {
      angVel *= (1 - 0.01 * dt * 60); // very slight drag
      angle += angVel * dt;
    }
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#0a0814');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#7c3aed' : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & misses
    game.draw.text(score + ' / ' + needed, W / 2, 128, { size: 56, color: '#c4b5fd', bold: true });
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses-1)/2) * 60;
      game.draw.circle(mx, 196, 18, m < misses ? C.miss : '#1a1024');
    }

    // Target indicator (which color to stop on)
    var tColor = WHEEL_COLORS[targetSector];
    game.draw.text('目標:', W * 0.15, H * 0.28, { size: 44, color: '#9ca3af' });
    game.draw.circle(W * 0.36, H * 0.27, 50, tColor);
    game.draw.circle(W * 0.36, H * 0.27, 34, '#fff', 0.2);

    // Wheel sectors
    for (var s = 0; s < SECTORS; s++) {
      var sAngle = angle + s * SECTOR_ANGLE;
      // Draw sector as a pie slice using line approximations
      var steps = 16;
      for (var step = 0; step <= steps; step++) {
        var a1 = sAngle + (step / steps) * SECTOR_ANGLE;
        var a2 = sAngle + ((step + 1) / steps) * SECTOR_ANGLE;
        var x1 = cx + Math.cos(a1) * WHEEL_R;
        var y1 = cy + Math.sin(a1) * WHEEL_R;
        var x2 = cx + Math.cos(a2) * WHEEL_R;
        var y2 = cy + Math.sin(a2) * WHEEL_R;
        game.draw.line(cx, cy, x1, y1, WHEEL_COLORS[s], 2);
      }
      // Filled-ish: draw as layered circles with clip (approximate via rect strips)
      // Better: draw thin triangles using many lines
      for (var r2 = 20; r2 <= WHEEL_R; r2 += 16) {
        var midAngle = sAngle + SECTOR_ANGLE / 2;
        var px2 = cx + Math.cos(midAngle) * r2;
        var py2 = cy + Math.sin(midAngle) * r2;
        game.draw.circle(px2, py2, 10, WHEEL_COLORS[s]);
      }
      // Sector divider lines
      game.draw.line(cx, cy, cx + Math.cos(sAngle) * WHEEL_R, cy + Math.sin(sAngle) * WHEEL_R, '#000', 4);
    }

    // Wheel center hub
    game.draw.circle(cx, cy, 36, '#111');
    game.draw.circle(cx, cy, 24, '#333');
    game.draw.circle(cx, cy, 12, '#555');

    // Pointer (arrow at top)
    game.draw.rect(cx - 8, cy - WHEEL_R - 48, 16, 52, '#fbbf24');
    game.draw.rect(cx - 20, cy - WHEEL_R - 20, 40, 24, '#fbbf24');

    // Feedback
    if (feedback > 0) {
      var prog = 1 - feedback / 0.5;
      if (feedbackOk) {
        game.draw.text('ピタリ！', W / 2, cy - WHEEL_R - 120 - prog * 60, { size: 88, color: C.good, bold: true });
      } else {
        game.draw.text('ハズレ！', W / 2, cy - WHEEL_R - 100, { size: 80, color: C.miss, bold: true });
      }
    }

    // Guide
    game.draw.text(spinning ? 'タップで止める！' : '...', W / 2, H - 200, { size: 56, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    newRound();
  });
})(game);
