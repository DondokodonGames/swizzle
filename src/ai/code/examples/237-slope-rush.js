// 237-slope-rush.js
// スロープラッシュ — 急な坂を転がるボールを左右に避けながらゴールまで
// 操作: 左右スワイプでボールを横に動かす
// 成功: ゴールに到達  失敗: 障害物に当たる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#080c14',
    slope:  '#1e293b',
    sloHi:  '#334155',
    ball:   '#22c55e',
    ballHi: '#86efac',
    obs:    '#ef4444',
    obsHi:  '#fca5a5',
    wall:   '#0f172a',
    goal:   '#f59e0b',
    goalHi: '#fde68a',
    ui:     '#475569'
  };

  var BALL_R = 28;
  var LANE_W = W / 3;

  var ballLane = 1; // 0=left, 1=center, 2=right
  var ballX = W / 2;
  var ballTargetX = W / 2;
  var ballY = H * 0.3;
  var ballPY = ballY; // pixel position on screen
  var scrollSpeed = 300; // pixels per second
  var distance = 0;
  var NEEDED_DIST = 50; // arbitrary distance units
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var trail = [];

  var obstacles = []; // {lane, dist}
  var goalDist = NEEDED_DIST;
  var obspawnDist = 8; // next obstacle at distance
  var totalScrolled = 0; // pixels scrolled for tile generation

  // Level segments (tiles scrolling upward)
  var segments = []; // {y, color, type: 'road'|'obstacle' lane}

  function initSegments() {
    for (var i = 0; i < 20; i++) {
      segments.push({
        y: H - i * 80,
        type: 'road'
      });
    }
  }

  var obstacleDist = 10; // when to spawn next obstacle (in scroll px)

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left' && ballLane > 0) {
      ballLane--;
      game.audio.play('se_tap', 0.3);
    } else if (dir === 'right' && ballLane < 2) {
      ballLane++;
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Scroll
    var scroll = scrollSpeed * dt;
    totalScrolled += scroll;
    distance += scroll / 50;

    // Move ball toward target lane
    ballTargetX = LANE_W * ballLane + LANE_W / 2;
    ballX += (ballTargetX - ballX) * dt * 8;

    // Update obstacles
    for (var oi = obstacles.length - 1; oi >= 0; oi--) {
      obstacles[oi].y += scroll;
      if (obstacles[oi].y > H + 80) {
        obstacles.splice(oi, 1);
        continue;
      }
      // Collision
      if (Math.abs(obstacles[oi].y - ballPY) < BALL_R + 30 && Math.abs(obstacles[oi].x - ballX) < BALL_R + 40) {
        if (!done) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    // Spawn obstacles
    obstacleDist -= scroll;
    if (obstacleDist <= 0) {
      var lane = Math.floor(Math.random() * 3);
      obstacles.push({
        x: LANE_W * lane + LANE_W / 2,
        y: -40,
        lane: lane,
        r: 32
      });
      obstacleDist = 120 + Math.random() * 180;
    }

    // Check goal
    if (distance >= NEEDED_DIST && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 100 + 800); }, 400);
    }

    // Trail
    trail.push({ x: ballX, y: ballPY, life: 0.25 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Road (3 lanes)
    game.draw.rect(0, 0, W, H, C.slope, 0.5);
    // Lane dividers
    game.draw.line(LANE_W, 0, LANE_W, H, C.sloHi, 3);
    game.draw.line(LANE_W * 2, 0, LANE_W * 2, H, C.sloHi, 3);

    // Scrolling dashes in each lane
    var dashOffset = totalScrolled % 120;
    for (var dc = 0; dc < 3; dc++) {
      for (var drow = -1; drow < H / 120 + 1; drow++) {
        var dy = drow * 120 + dashOffset - 60;
        game.draw.rect(LANE_W * dc + LANE_W / 2 - 6, dy, 12, 60, C.sloHi, 0.3);
      }
    }

    // Wall borders
    game.draw.rect(0, 0, 20, H, C.wall, 0.9);
    game.draw.rect(W - 20, 0, 20, H, C.wall, 0.9);

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var o = obstacles[oi2];
      game.draw.circle(o.x, o.y, o.r + 8, C.obsHi, 0.2);
      game.draw.rect(o.x - o.r, o.y - o.r, o.r * 2, o.r * 2, C.obs, 0.85);
      game.draw.rect(o.x - o.r, o.y - o.r, o.r * 2, 8, C.obsHi, 0.4);
      game.draw.text('■', o.x, o.y, { size: 36, color: '#fff', bold: true });
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, BALL_R * t.life * 4, C.ballHi, t.life * 0.2);
    }

    // Ball
    game.draw.circle(ballX, ballPY, BALL_R + 10, C.ballHi, 0.3);
    game.draw.circle(ballX, ballPY, BALL_R, C.ball, 0.9);
    game.draw.circle(ballX - 8, ballPY - 8, 10, '#fff', 0.4);

    // Progress bar
    var distRatio = Math.min(1, distance / NEEDED_DIST);
    game.draw.rect(0, H * 0.91, W, 16, C.ui, 0.3);
    game.draw.rect(0, H * 0.91, W * distRatio, 16, C.goal, 0.85);
    game.draw.text(Math.floor(distance) + ' / ' + Math.floor(NEEDED_DIST), W / 2, H * 0.95, { size: 44, color: '#f1f5f9', bold: true });
    game.draw.text('スワイプで左右！', W / 2, H * 0.98, { size: 32, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ball : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
  });
})(game);
