// 321-magnet-pull.js
// マグネットプル — 磁石で金属ボールを引き寄せてゴールに導く
// 操作: タップした方向に磁力が働く（タップ位置に引き寄せ）
// 成功: 10個ゴール  失敗: 5個落下 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0f14',
    ball:   '#94a3b8',
    ballHi: '#e2e8f0',
    magnet: '#ef4444',
    magnetHi:'#fca5a5',
    goal:   '#22c55e',
    goalHi: '#86efac',
    field:  '#1e3a5f',
    wall:   '#334155',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var GOAL_X = W / 2;
  var GOAL_Y = H * 0.72;
  var GOAL_R = 60;

  var balls = [];
  var magnetX = -1, magnetY = -1;
  var magnetActive = false;
  var scored = 0;
  var NEEDED = 10;
  var lost = 0;
  var MAX_LOST = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var spawnTimer = 0;

  function spawnBall() {
    var side = Math.floor(Math.random() * 4);
    var bx, by, bvx, bvy;
    var speed = 80 + Math.random() * 60;
    if (side === 0) { bx = 80 + Math.random() * (W - 160); by = H * 0.2; bvx = (Math.random() - 0.5) * 80; bvy = speed; }
    else if (side === 1) { bx = 80; by = H * 0.25 + Math.random() * H * 0.4; bvx = speed; bvy = (Math.random() - 0.5) * 80; }
    else if (side === 2) { bx = W - 80; by = H * 0.25 + Math.random() * H * 0.4; bvx = -speed; bvy = (Math.random() - 0.5) * 80; }
    else { bx = 80 + Math.random() * (W - 160); by = H * 0.25; bvx = (Math.random() - 0.5) * 80; bvy = speed * 0.5; }
    balls.push({ x: bx, y: by, vx: bvx, vy: bvy, r: 28 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    magnetX = tx;
    magnetY = ty;
    magnetActive = true;
    game.audio.play('se_tap', 0.2);
    setTimeout(function() { magnetActive = false; }, 400);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnBall();
      spawnTimer = 1.2 - Math.min(0.7, scored * 0.05);
    }

    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];

      // Magnet pull
      if (magnetActive) {
        var dx = magnetX - b.x;
        var dy = magnetY - b.y;
        var dist = Math.hypot(dx, dy);
        if (dist < 400) {
          var force = 1200 / (dist + 50);
          b.vx += (dx / dist) * force * dt;
          b.vy += (dy / dist) * force * dt;
        }
      }

      // Gravity
      b.vy += 120 * dt;

      // Speed limit
      var speed = Math.hypot(b.vx, b.vy);
      if (speed > 600) { b.vx = b.vx / speed * 600; b.vy = b.vy / speed * 600; }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Wall bounce
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.7; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.7; }
      if (b.y < H * 0.18) { b.y = H * 0.18; b.vy = Math.abs(b.vy) * 0.7; }

      // Goal check
      if (Math.hypot(b.x - GOAL_X, b.y - GOAL_Y) < GOAL_R + b.r) {
        scored++;
        game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.goalHi });
        }
        balls.splice(bi, 1);
        if (scored >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(scored * 200 + Math.ceil(timeLeft) * 80); }, 400);
        }
        continue;
      }

      // Fall off bottom
      if (b.y > H * 0.9) {
        lost++;
        game.audio.play('se_failure', 0.2);
        balls.splice(bi, 1);
        if (lost >= MAX_LOST && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
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

    // Field guide lines
    for (var fy = 0; fy < 5; fy++) {
      game.draw.rect(0, H * 0.2 + fy * H * 0.14, W, 2, C.field, 0.3);
    }

    // Goal
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R + 16, C.goal, 0.2 + 0.1 * Math.sin(elapsed * 4));
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R, C.goal, 0.8);
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R - 20, C.goalHi, 0.4);
    game.draw.text('GOAL', GOAL_X, GOAL_Y + 14, { size: 36, color: '#fff', bold: true });

    // Balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b2 = balls[bi2];
      game.draw.circle(b2.x, b2.y, b2.r + 6, C.ball, 0.2);
      game.draw.circle(b2.x, b2.y, b2.r, C.ball, 0.9);
      game.draw.circle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, b2.r * 0.25, C.ballHi, 0.7);
    }

    // Magnet
    if (magnetActive) {
      game.draw.circle(magnetX, magnetY, 50, C.magnet, 0.4);
      game.draw.circle(magnetX, magnetY, 30, C.magnetHi, 0.7);
      game.draw.text('N', magnetX, magnetY + 12, { size: 36, color: '#fff', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Lost dots
    for (var li = 0; li < MAX_LOST; li++) {
      game.draw.circle(W / 2 - (MAX_LOST - 1) * 28 + li * 56, H * 0.88, 16, li < lost ? C.magnet : '#0a0f14');
    }

    game.draw.text('タップで磁力！', W / 2, H * 0.84, { size: 38, color: C.ui });

    game.draw.text(scored + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.goal : C.magnet);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.3;
  });
})(game);
