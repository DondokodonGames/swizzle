// 218-magnet-push.js
// マグネットプッシュ — 同極が反発する磁石の力で金属球をゴールに押し込む物理パズル
// 操作: タップで自分の磁石を配置（反発で球を押す）
// 成功: 球をゴールに入れる  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0f1a',
    ball:   '#94a3b8',
    ballHi: '#cbd5e1',
    magN:   '#ef4444',
    magNHi: '#fca5a5',
    magS:   '#3b82f6',
    magSHi: '#93c5fd',
    goal:   '#22c55e',
    goalHi: '#86efac',
    wall:   '#1e293b',
    ui:     '#475569'
  };

  // Ball
  var ballX = W * 0.5;
  var ballY = H * 0.7;
  var ballVX = 0;
  var ballVY = 0;
  var BALL_R = 32;
  var FRICTION = 0.97;

  // Goal
  var goalX = W * 0.5;
  var goalY = H * 0.18;
  var GOAL_R = 50;

  // Player magnet (placed by tap)
  var magnets = []; // { x, y, polarity: 1(N) or -1(S) }
  var MAX_MAGNETS = 3;
  var polarity = 1; // toggle with each tap sequence

  // Walls
  var walls = [
    { x: 0, y: 0, w: W, h: 30 },
    { x: 0, y: H - 30, w: W, h: 30 },
    { x: 0, y: 0, w: 30, h: H },
    { x: W - 30, y: 0, w: 30, h: H }
  ];

  // Inner obstacle walls
  var obstacles = [
    { x: W * 0.2, y: H * 0.35, w: W * 0.25, h: 20 },
    { x: W * 0.55, y: H * 0.5, w: W * 0.25, h: 20 },
    { x: W * 0.15, y: H * 0.62, w: W * 0.3, h: 20 }
  ];

  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var trail = [];

  function collideBallWall(wx, wy, ww, wh) {
    var left = wx, right = wx + ww, top = wy, bottom = wy + wh;
    var bLeft = ballX - BALL_R, bRight = ballX + BALL_R;
    var bTop = ballY - BALL_R, bBottom = ballY + BALL_R;
    if (bRight > left && bLeft < right && bBottom > top && bTop < bottom) {
      // push out shortest axis
      var overlapX = Math.min(bRight - left, right - bLeft);
      var overlapY = Math.min(bBottom - top, bottom - bTop);
      if (overlapX < overlapY) {
        if (ballX < wx + ww / 2) { ballX -= overlapX; ballVX = -Math.abs(ballVX) * 0.6; }
        else { ballX += overlapX; ballVX = Math.abs(ballVX) * 0.6; }
      } else {
        if (ballY < wy + wh / 2) { ballY -= overlapY; ballVY = -Math.abs(ballVY) * 0.6; }
        else { ballY += overlapY; ballVY = Math.abs(ballVY) * 0.6; }
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Don't place magnet too close to goal or inside walls
    var dx = tx - goalX, dy = ty - goalY;
    if (Math.sqrt(dx * dx + dy * dy) < GOAL_R + 30) return;

    if (magnets.length >= MAX_MAGNETS) magnets.shift();
    magnets.push({ x: tx, y: ty, pol: polarity });
    polarity = -polarity; // alternate N/S
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Magnetic force from each magnet (same polarity = repulsion)
    for (var mi = 0; mi < magnets.length; mi++) {
      var mag = magnets[mi];
      var dx = ballX - mag.x;
      var dy = ballY - mag.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 8) continue;
      // Ball has N polarity; N magnets repel, S attract
      var force = mag.pol * 120000 / (dist * dist);
      ballVX += (dx / dist) * force * dt;
      ballVY += (dy / dist) * force * dt;
    }

    // Speed cap
    var spd = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
    if (spd > 900) { ballVX = ballVX / spd * 900; ballVY = ballVY / spd * 900; }

    ballX += ballVX * dt;
    ballY += ballVY * dt;
    ballVX *= FRICTION;
    ballVY *= FRICTION;

    // Wall collisions
    for (var wi = 0; wi < walls.length; wi++) collideBallWall(walls[wi].x, walls[wi].y, walls[wi].w, walls[wi].h);
    for (var oi = 0; oi < obstacles.length; oi++) collideBallWall(obstacles[oi].x, obstacles[oi].y, obstacles[oi].w, obstacles[oi].h);

    // Check goal
    var gDx = ballX - goalX, gDy = ballY - goalY;
    if (Math.sqrt(gDx * gDx + gDy * gDy) < GOAL_R && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 100 + 800); }, 400);
    }

    // Trail
    trail.push({ x: ballX, y: ballY, life: 0.3 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    for (var wi2 = 0; wi2 < walls.length; wi2++) {
      var w = walls[wi2];
      game.draw.rect(w.x, w.y, w.w, w.h, C.wall, 0.9);
    }
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var o = obstacles[oi2];
      game.draw.rect(o.x, o.y, o.w, o.h, C.wall, 0.8);
      game.draw.rect(o.x, o.y, o.w, 6, '#475569', 0.5);
    }

    // Goal
    var gPulse = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 3));
    game.draw.circle(goalX, goalY, GOAL_R + 15, C.goalHi, gPulse * 0.3);
    game.draw.circle(goalX, goalY, GOAL_R, C.goal, 0.4);
    game.draw.text('★', goalX, goalY, { size: 60, color: C.goalHi, bold: true });

    // Magnets
    for (var mi2 = 0; mi2 < magnets.length; mi2++) {
      var mag2 = magnets[mi2];
      var col = mag2.pol > 0 ? C.magN : C.magS;
      var hi = mag2.pol > 0 ? C.magNHi : C.magSHi;
      var label = mag2.pol > 0 ? 'N' : 'S';
      // Field lines
      for (var a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        game.draw.line(mag2.x, mag2.y, mag2.x + Math.cos(a) * 60, mag2.y + Math.sin(a) * 60, col, 2);
      }
      game.draw.circle(mag2.x, mag2.y, 28, col, 0.85);
      game.draw.text(label, mag2.x, mag2.y, { size: 32, color: '#fff', bold: true });
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, BALL_R * t.life, C.ballHi, t.life * 0.3);
    }

    // Ball
    game.draw.circle(ballX, ballY, BALL_R + 6, C.ballHi, 0.25);
    game.draw.circle(ballX, ballY, BALL_R, C.ball, 0.9);
    game.draw.circle(ballX - 10, ballY - 10, 10, '#fff', 0.4);
    game.draw.text('N', ballX, ballY, { size: 26, color: '#0f172a', bold: true });

    // Next polarity indicator
    var nextCol = polarity > 0 ? C.magN : C.magS;
    var nextLabel = polarity > 0 ? 'N' : 'S';
    game.draw.text('次: ' + nextLabel + ' 磁石', W / 2, H * 0.93, { size: 38, color: nextCol, bold: true });
    game.draw.text('磁石は' + MAX_MAGNETS + '個まで', W / 2, H * 0.96, { size: 30, color: C.ui });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.goal : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
  });
})(game);
