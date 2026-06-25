// 229-roulette-stop.js
// ルーレットストップ — 高速回転するルーレットをジャストのタイミングで止める度胸
// 操作: タップで回転を止める
// 成功: 5回連続で緑ゾーンに止める  失敗: 3回外す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0405',
    wheel:  '#1a1a2e',
    green:  '#22c55e',
    greenHi:'#86efac',
    red:    '#ef4444',
    yellow: '#f59e0b',
    needle: '#fff',
    ui:     '#475569'
  };

  // Roulette sectors (angle portions)
  // Green = target, red = fail, yellow = neutral
  var SECTORS = [
    { color: C.green,  arc: 0.15, pts: true },
    { color: C.red,    arc: 0.2,  pts: false },
    { color: C.yellow, arc: 0.1,  pts: null },
    { color: C.red,    arc: 0.2,  pts: false },
    { color: C.green,  arc: 0.1,  pts: true },
    { color: C.red,    arc: 0.15, pts: false },
    { color: C.yellow, arc: 0.1,  pts: null }
  ];

  var CX = W / 2;
  var CY = H * 0.47;
  var WHEEL_R = 260;

  var angle = 0;
  var speed = 4.0; // radians per second
  var spinning = true;
  var successes = 0;
  var NEEDED = 5;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var needleAngle = -Math.PI / 2; // top
  var judging = false;
  var judgeTimer = 0;
  var JUDGE_PAUSE = 1.0;
  var particles = [];
  var speedMult = 1.0;

  function judgeResult() {
    // Find which sector the needle points to
    var normalizedAngle = ((needleAngle - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    var cumArc = 0;
    var result = null;
    for (var si = 0; si < SECTORS.length; si++) {
      cumArc += SECTORS[si].arc * Math.PI * 2;
      if (normalizedAngle < cumArc) {
        result = SECTORS[si];
        break;
      }
    }
    if (!result) result = SECTORS[0];

    if (result.pts === true) {
      successes++;
      feedback = 'HIT! (' + successes + '/' + NEEDED + ')';
      feedbackCol = C.green;
      feedbackTimer = 0.9;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 8; pi++) {
        var a = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5 });
      }
      if (successes >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(successes * 200 + Math.ceil(timeLeft) * 30); }, 400);
      }
    } else if (result.pts === false) {
      misses++;
      successes = 0; // reset streak
      feedback = 'MISS (' + misses + '/' + MAX_MISS + ')';
      feedbackCol = C.red;
      feedbackTimer = 0.8;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    } else {
      feedback = 'NO POINT';
      feedbackCol = C.yellow;
      feedbackTimer = 0.5;
      game.audio.play('se_tap', 0.3);
    }
  }

  game.onTap(function(tx, ty) {
    if (done || !spinning || judging) return;
    spinning = false;
    judging = true;
    judgeTimer = JUDGE_PAUSE;
    game.audio.play('se_tap', 0.4);
    judgeResult();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    if (judging) {
      judgeTimer -= dt;
      if (judgeTimer <= 0 && !done) {
        judging = false;
        spinning = true;
        // Increase speed slightly each round
        speedMult = Math.min(2.0, speedMult + 0.08);
      }
    }

    if (spinning) {
      angle += speed * speedMult * dt;
    }

    // Particles
    for (var pi = particles.length - 1; pi >= 0; pi--) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].vy += 300 * dt;
      particles[pi].life -= dt;
      if (particles[pi].life <= 0) particles.splice(pi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw wheel sectors
    var cumAngle = angle;
    for (var si = 0; si < SECTORS.length; si++) {
      var sec = SECTORS[si];
      var arcAngle = sec.arc * Math.PI * 2;
      // Draw filled arc segments
      var steps = Math.max(8, Math.ceil(arcAngle / 0.05));
      var stepA = arcAngle / steps;
      for (var step = 0; step < steps; step++) {
        var a1 = cumAngle + step * stepA;
        var a2 = cumAngle + (step + 1) * stepA;
        var x1 = CX + Math.cos(a1) * WHEEL_R;
        var y1 = CY + Math.sin(a1) * WHEEL_R;
        var x2 = CX + Math.cos(a2) * WHEEL_R;
        var y2 = CY + Math.sin(a2) * WHEEL_R;
        game.draw.line(CX, CY, x1, y1, sec.color, 2);
        game.draw.line(x1, y1, x2, y2, sec.color, WHEEL_R * 2 / steps);
      }
      cumAngle += arcAngle;
    }

    // Wheel rim
    game.draw.circle(CX, CY, WHEEL_R + 8, '#334155', 0.8);
    game.draw.circle(CX, CY, WHEEL_R, C.wheel, 0.3);
    game.draw.circle(CX, CY, 24, '#fff', 0.9);

    // Needle (fixed at top)
    var nx = CX + Math.cos(needleAngle) * (WHEEL_R - 20);
    var ny = CY + Math.sin(needleAngle) * (WHEEL_R - 20);
    game.draw.line(CX, CY - WHEEL_R - 10, nx, ny, C.needle, 6);
    game.draw.circle(nx, ny, 18, '#fff', 0.9);
    game.draw.circle(CX, CY - WHEEL_R - 10, 10, C.needle, 0.9);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var p = particles[pp];
      game.draw.circle(p.x, p.y, 10 * p.life, C.greenHi, p.life * 0.7);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, CX, CY + WHEEL_R + 70, { size: 52, color: feedbackCol, bold: true });
    }

    // Success dots
    for (var si2 = 0; si2 < NEEDED; si2++) {
      game.draw.circle(CX - (NEEDED - 1) * 28 + si2 * 56, H * 0.88, 18, si2 < successes ? C.green : '#1a1a2e');
    }

    game.draw.text('連続 ' + successes + ' / ' + NEEDED, CX, 148, { size: 56, color: '#f1f5f9', bold: true });
    game.draw.text('タップで止める！', CX, H * 0.93, { size: 42, color: spinning ? C.green : C.ui, bold: spinning });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.green : C.red);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
  });
})(game);
