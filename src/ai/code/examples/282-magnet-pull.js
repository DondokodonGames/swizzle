// 282-magnet-pull.js
// マグネットプル — 磁石の引力と斥力を使って金属ボールをゴールに誘導する
// 操作: タップで磁石の極性を切り替え（引力/斥力）
// 成功: 10個のボールをゴールに入れる  失敗: 5個壁に衝突 or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020408',
    magnet:  '#ef4444',
    magHi:   '#fca5a5',
    magBlue: '#3b82f6',
    magBHi:  '#93c5fd',
    ball:    '#94a3b8',
    ballHi:  '#e2e8f0',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    wall:    '#1e293b',
    wallHi:  '#334155',
    field:   '#fde68a',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var MAGNET_X = W / 2, MAGNET_Y = H * 0.45;
  var MAGNET_R = 60;
  var polarity = 1; // 1=attract, -1=repel
  var balls = [];
  var goal = { x: W / 2, y: H * 0.82, r: 48 };
  var scored = 0;
  var NEEDED = 10;
  var wallHits = 0;
  var MAX_HIT = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var spawnTimer = 0;
  var fieldPulse = 0;
  var particles = [];

  function spawnBall() {
    var side = Math.floor(Math.random() * 4);
    var x, y;
    if (side === 0) { x = Math.random() * W; y = H * 0.15; }
    else if (side === 1) { x = W - 40; y = H * 0.2 + Math.random() * H * 0.5; }
    else if (side === 2) { x = Math.random() * W; y = H * 0.35; }
    else { x = 40; y = H * 0.2 + Math.random() * H * 0.5; }
    balls.push({ x: x, y: y, vx: (Math.random() - 0.5) * 80, vy: 60, r: 20 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    polarity *= -1;
    fieldPulse = 0.4;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (fieldPulse > 0) fieldPulse -= dt;

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done && balls.length < 5) {
      spawnBall();
      spawnTimer = 1.2 + Math.random() * 0.8;
    }

    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      var dx = MAGNET_X - b.x, dy = MAGNET_Y - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) dist = 1;

      // Magnetic force
      var force = polarity * 18000 / (dist * dist + 100);
      b.vx += (dx / dist) * force * dt;
      b.vy += (dy / dist) * force * dt;

      // Gravity
      b.vy += 120 * dt;

      // Damping
      b.vx *= (1 - dt * 0.5);
      b.vy *= (1 - dt * 0.5);

      // Speed limit
      var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (spd > 500) { b.vx *= 500 / spd; b.vy *= 500 / spd; }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Goal check
      var gdx = b.x - goal.x, gdy = b.y - goal.y;
      if (gdx * gdx + gdy * gdy < (goal.r + b.r) * (goal.r + b.r) * 0.5) {
        scored++;
        balls.splice(bi, 1);
        game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: goal.x, y: goal.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5, col: C.goalHi });
        }
        if (scored >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(scored * 150 + Math.ceil(timeLeft) * 80); }, 400);
        }
        continue;
      }

      // Wall collision
      var hitWall = false;
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); hitWall = true; }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); hitWall = true; }
      if (b.y - b.r < H * 0.12) { b.y = H * 0.12 + b.r; b.vy = Math.abs(b.vy); hitWall = true; }
      if (b.y + b.r > H * 0.95) {
        wallHits++;
        balls.splice(bi, 1);
        game.audio.play('se_failure', 0.5);
        if (wallHits >= MAX_HIT && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
        continue;
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Field lines (visual)
    var numLines = 8;
    for (var li = 0; li < numLines; li++) {
      var ang2 = (li / numLines) * Math.PI * 2;
      var lineLen = 100 + 20 * Math.sin(elapsed * 3 + li);
      var lx = MAGNET_X + Math.cos(ang2) * lineLen;
      var ly = MAGNET_Y + Math.sin(ang2) * lineLen;
      game.draw.line(MAGNET_X + Math.cos(ang2) * MAGNET_R, MAGNET_Y + Math.sin(ang2) * MAGNET_R, lx, ly,
        polarity > 0 ? C.magHi : C.magBHi, 3);
    }

    // Magnet
    var mCol = polarity > 0 ? C.magnet : C.magBlue;
    var mHiCol = polarity > 0 ? C.magHi : C.magBHi;
    game.draw.circle(MAGNET_X, MAGNET_Y, MAGNET_R + (fieldPulse > 0 ? 20 * fieldPulse : 0), mCol, 0.85);
    game.draw.circle(MAGNET_X, MAGNET_Y, MAGNET_R * 0.6, mHiCol, 0.7);
    game.draw.text(polarity > 0 ? '引' : '斥', MAGNET_X, MAGNET_Y + 16, { size: 54, color: '#fff', bold: true });

    // Goal
    game.draw.circle(goal.x, goal.y, goal.r + 8 * Math.sin(elapsed * 4), C.goal, 0.3);
    game.draw.circle(goal.x, goal.y, goal.r, C.goal, 0.8);
    game.draw.text('G', goal.x, goal.y + 14, { size: 46, color: C.goalHi, bold: true });

    // Balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b2 = balls[bi2];
      game.draw.circle(b2.x, b2.y, b2.r + 4, C.ball, 0.2);
      game.draw.circle(b2.x, b2.y, b2.r, C.ball, 0.9);
      game.draw.circle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, b2.r * 0.25, C.ballHi, 0.6);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HIT; hi++) {
      game.draw.circle(W / 2 - (MAX_HIT - 1) * 28 + hi * 56, H * 0.93, 16, hi < wallHits ? C.magnet : '#030608');
    }

    game.draw.text(scored + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('タップで引力/斥力切替', W / 2, H * 0.89, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.goal : C.magnet);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.5;
  });
})(game);
