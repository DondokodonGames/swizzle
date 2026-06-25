// 044-spiral-run.js
// スパイラルラン — らせん状に落下する玉を外側の壁に当てないように操作
// 操作: タップで落下速度を一時的に遅くする
// 成功: 中心まで到達  失敗: 壁に当たる or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040a10',
    spiral: '#1e3a5f',
    wall:   '#2563eb',
    wallHi: '#60a5fa',
    ball:   '#fbbf24',
    ballHi: '#fef3c7',
    trail:  '#f97316',
    good:   '#22c55e',
    danger: '#ef4444',
    ui:     '#475569'
  };

  var cx = W / 2, cy = H * 0.46;
  var SPIRAL_LOOPS = 5;
  var OUTER_R = 380;
  var INNER_R = 60;

  // Ball moves along spiral path
  // Spiral: r = OUTER_R - (OUTER_R - INNER_R) * t / (SPIRAL_LOOPS * 2π)
  // where t = angle (radians)

  var t = 0;          // angular progress (0 = start, SPIRAL_LOOPS*2π = center)
  var tSpeed = 1.8;   // radians per second
  var MAX_T = SPIRAL_LOOPS * Math.PI * 2;
  var SLOW_SPEED = 0.4;
  var NORMAL_SPEED = 1.8;
  var isSlow = false;

  // Wall gaps (the spiral has openings the player must pass through)
  // Simplify: walls are at fixed angular positions, player can be "inside" or "outside" safe zone
  var TRACK_WIDTH = 48; // how wide the safe track is

  var done = false;
  var timeLeft = 20;
  var trail = [];
  var hitFlash = 0;

  function getBallPos(t2) {
    var progress = t2 / MAX_T;
    var r = OUTER_R - (OUTER_R - INNER_R) * progress;
    // Spiral starts at top (-π/2), winds clockwise
    var angle = t2 - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      r: r
    };
  }

  function isInTrack(t2) {
    var progress = t2 / MAX_T;
    var idealR = OUTER_R - (OUTER_R - INNER_R) * progress;
    // Check distance from current spiral path
    var pos = getBallPos(t2);
    var dist = Math.sqrt((pos.x - cx) * (pos.x - cx) + (pos.y - cy) * (pos.y - cy));
    return Math.abs(dist - idealR) < TRACK_WIDTH;
  }

  game.onTap(function(x, y) {
    if (done) return;
    isSlow = !isSlow;
    game.audio.play('se_tap', 0.5);
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

    var speed = isSlow ? SLOW_SPEED : NORMAL_SPEED;
    t += speed * dt;

    if (t >= MAX_T) {
      // Reached center!
      done = true;
      game.audio.play('se_success');
      setTimeout(function() {
        game.end.success(300 + Math.ceil(timeLeft) * 10);
      }, 400);
      return;
    }

    // Add trail
    var pos = getBallPos(t);
    trail.unshift({ x: pos.x, y: pos.y });
    if (trail.length > 12) trail.pop();

    if (hitFlash > 0) hitFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw spiral track
    var TRACK_SEGS = 200;
    for (var s = 0; s < TRACK_SEGS; s++) {
      var t1 = (s / TRACK_SEGS) * MAX_T;
      var t2b = ((s + 1) / TRACK_SEGS) * MAX_T;
      var p1 = getBallPos(t1);
      var p2 = getBallPos(t2b);

      var isAhead = t1 >= t;
      var isCurrent = Math.abs(t1 - t) < MAX_T / TRACK_SEGS * 5;
      var alpha = isAhead ? 0.3 : 0.15;
      var lineW = isAhead ? TRACK_WIDTH * 1.4 : TRACK_WIDTH;

      game.draw.line(p1.x, p1.y, p2.x, p2.y, isAhead ? C.wall : C.spiral, lineW);
      if (isAhead) {
        game.draw.line(p1.x, p1.y, p2.x, p2.y, C.wallHi, 4);
      }
    }

    // Center target
    game.draw.circle(cx, cy, INNER_R + 20, C.good, 0.3);
    game.draw.circle(cx, cy, INNER_R, C.good, 0.8);
    game.draw.circle(cx, cy, INNER_R * 0.5, '#fff', 0.5);

    // Trail
    for (var tr = 0; tr < trail.length; tr++) {
      var ta = (1 - tr / trail.length) * 0.6;
      game.draw.circle(trail[tr].x, trail[tr].y, 28 * (1 - tr / trail.length), C.trail, ta);
    }

    // Ball
    var ballPos = getBallPos(t);
    var pulse = 0.15 + 0.08 * Math.sin(game.time.elapsed * 10);
    game.draw.circle(ballPos.x, ballPos.y, 44 + (isSlow ? 12 : 0), C.ballHi, pulse);
    game.draw.circle(ballPos.x, ballPos.y, 36, C.ball);
    game.draw.circle(ballPos.x - 10, ballPos.y - 10, 12, '#fff', 0.6);

    // Hit flash
    if (hitFlash > 0) {
      game.draw.rect(0, 0, W, H, C.danger, hitFlash * 0.25);
    }

    // Progress ring
    var progress = t / MAX_T;
    game.draw.text(Math.floor(progress * 100) + '%', W / 2, GRID_Y2 + 60, { size: 56, color: C.wallHi, bold: true });

    // Slow indicator
    if (isSlow) {
      game.draw.rect(0, 0, W, H, '#818cf8', 0.04);
      game.draw.text('SLOW', W * 0.85, H * 0.5, { size: 44, color: '#818cf8', bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#040a10');
    game.draw.rect(0, 0, W * ratio, 72, isSlow ? '#818cf8' : (ratio > 0.3 ? C.wall : C.danger));
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('タップでスロー切替！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  // Reuse GRID_Y2 just as placeholder — define it
  var GRID_Y2 = H * 0.75;

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
