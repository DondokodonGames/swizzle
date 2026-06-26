// 419-magnet-sort.js
// 磁石選別 — 磁石で金属ボールだけを引き寄せる
// 操作: スワイプで磁石を動かしてボールを引き付け、ゴールへ誘導
// 成功: 金属10個をゴールへ  失敗: ガラス玉3個を誤ってゴールへ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0f1a',
    magnet: '#dc2626',
    magnetHi:'#fca5a5',
    metal:  '#94a3b8',
    metalHi:'#e2e8f0',
    glass:  '#67e8f9',
    glassHi:'#a5f3fc',
    goal:   '#22c55e',
    goalHi: '#86efac',
    wrong:  '#ef4444',
    track:  '#1e293b',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var magnetX = W / 2;
  var magnetY = H * 0.35;
  var MAGNET_R = 70;
  var PULL_RANGE = 280;

  var balls = [];
  var GOAL_X = W * 0.5;
  var GOAL_Y = H * 0.85;
  var GOAL_R = 90;

  var metalGot = 0;
  var NEEDED = 10;
  var wrongGot = 0;
  var MAX_WRONG = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.goal;
  var particles = [];
  var spawnTimer = 0;
  var spawnInterval = 2.5;

  function spawnBall() {
    var isMetal = Math.random() < 0.6;
    var side = Math.random() < 0.5 ? 0 : 1;
    var x = side < 0.5 ? 80 + Math.random() * 200 : W - 80 - Math.random() * 200;
    balls.push({
      x: x,
      y: 150 + Math.random() * (H * 0.5),
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80,
      r: isMetal ? 28 + Math.random() * 12 : 22 + Math.random() * 10,
      metal: isMetal,
      attracted: 0,
      scored: false
    });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (x2 !== undefined) {
      magnetX = x2;
      magnetY = y2;
    } else {
      var step = 120;
      if (dir === 'left') magnetX = Math.max(MAGNET_R, magnetX - step);
      else if (dir === 'right') magnetX = Math.min(W - MAGNET_R, magnetX + step);
      else if (dir === 'up') magnetY = Math.max(MAGNET_R + 80, magnetY - step);
      else if (dir === 'down') magnetY = Math.min(H * 0.75, magnetY + step);
    }
    magnetX = Math.max(MAGNET_R, Math.min(W - MAGNET_R, magnetX));
    magnetY = Math.max(MAGNET_R + 80, Math.min(H * 0.75, magnetY));
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    magnetX = tx;
    magnetY = Math.max(MAGNET_R + 80, Math.min(H * 0.75, ty));
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0 && balls.length < 12) {
      spawnBall();
      spawnInterval = Math.max(1.2, 2.5 - elapsed * 0.02);
      spawnTimer = spawnInterval;
    }

    // Update balls
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      if (b.scored) { balls.splice(bi, 1); continue; }

      var dx = magnetX - b.x;
      var dy = magnetY - b.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (b.metal && dist < PULL_RANGE) {
        var force = (1 - dist / PULL_RANGE) * 600;
        b.vx += (dx / dist) * force * dt;
        b.vy += (dy / dist) * force * dt;
        b.attracted = Math.min(1, b.attracted + dt * 3);
      } else {
        b.attracted = Math.max(0, b.attracted - dt * 2);
      }

      // Drift
      b.vx *= (1 - dt * 1.5);
      b.vy *= (1 - dt * 1.5);
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Bounce off walls
      if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.7; }
      if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.7; }
      if (b.y < b.r + 80) { b.y = b.r + 80; b.vy = Math.abs(b.vy) * 0.7; }
      if (b.y > H * 0.8) { b.y = H * 0.8; b.vy = -Math.abs(b.vy) * 0.7; }

      // Check if in goal
      var gdx = b.x - GOAL_X;
      var gdy = b.y - GOAL_Y;
      if (Math.sqrt(gdx * gdx + gdy * gdy) < GOAL_R - b.r/2) {
        b.scored = true;
        if (b.metal) {
          metalGot++;
          flashCol = C.goal;
          flashAnim = 0.6;
          game.audio.play('se_success', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5, col: C.metalHi });
          }
          if (metalGot >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(metalGot * 400 + Math.ceil(timeLeft) * 80); }, 500);
          }
        } else {
          wrongGot++;
          flashCol = C.wrong;
          flashAnim = 0.7;
          game.audio.play('se_failure', 0.5);
          for (var pi2 = 0; pi2 < 8; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: b.y, vx: Math.cos(ang2) * 150, vy: Math.sin(ang2) * 150, life: 0.5, col: C.wrong });
          }
          if (wrongGot >= MAX_WRONG && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
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

    // Goal zone
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R + 12, C.goal, 0.12);
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R, C.goalHi, 0.25);
    game.draw.text('GOAL', GOAL_X, GOAL_Y + 12, { size: 44, color: C.goalHi, bold: true });

    // Balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b2 = balls[bi2];
      var col = b2.metal ? C.metal : C.glass;
      var hi = b2.metal ? C.metalHi : C.glassHi;
      if (b2.metal && b2.attracted > 0.1) {
        game.draw.circle(b2.x, b2.y, b2.r + 8, col, b2.attracted * 0.3);
      }
      game.draw.circle(b2.x, b2.y, b2.r, col, b2.metal ? 0.85 : 0.6);
      game.draw.circle(b2.x - b2.r*0.3, b2.y - b2.r*0.3, b2.r * 0.35, '#fff', b2.metal ? 0.2 : 0.5);
      if (!b2.metal) {
        // Glass transparency
        game.draw.circle(b2.x, b2.y, b2.r, hi, 0.12);
      }
    }

    // Magnet
    game.draw.circle(magnetX, magnetY, MAGNET_R + 10, C.magnet, 0.15);
    game.draw.circle(magnetX, magnetY, MAGNET_R, C.magnet, 0.9);
    game.draw.circle(magnetX - 20, magnetY - 22, MAGNET_R * 0.35, C.magnetHi, 0.5);
    game.draw.text('N', magnetX - 24, magnetY + 14, { size: 40, color: C.magnetHi, bold: true });
    game.draw.text('S', magnetX + 24, magnetY + 14, { size: 40, color: '#60a5fa', bold: true });

    // Pull range indicator
    game.draw.circle(magnetX, magnetY, PULL_RANGE, C.magnet, 0.06);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W/2 - (MAX_WRONG-1)*44 + wi*88, H*0.935, 18, wi < wrongGot ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(metalGot + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.goal : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    spawnBall();
    spawnBall();
    spawnBall();
    spawnTimer = 2.0;
  });
})(game);
