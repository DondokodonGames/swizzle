// 072-asteroid-split.js
// アステロイドスプリット — 大きな隕石を分裂させながら全部消す爆発連鎖
// 操作: タップで弾を発射、隕石は分裂する
// 成功: 全隕石を破壊  失敗: 隕石が3個画面外へ or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030508',
    asteroid:'#374151',
    astHi:   '#6b7280',
    bullet:  '#fbbf24',
    bulletHi:'#fef3c7',
    explode: '#f97316',
    explHi:  '#fde68a',
    ui:      '#475569'
  };

  var asteroids = [];
  var bullets = [];
  var particles = [];
  var BULLET_SPEED = 1000;
  var GUN_X = W / 2;
  var GUN_Y = H * 0.85;
  var escapedCount = 0;
  var maxEscaped = 3;
  var timeLeft = 20;
  var done = false;
  var flashTimer = 0;

  function spawnAsteroid(x, y, r, vx, vy) {
    asteroids.push({ x: x, y: y, r: r, vx: vx, vy: vy, rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 2 });
  }

  function initialSpawn() {
    for (var i = 0; i < 4; i++) {
      var side = i % 4;
      var x, y, vx, vy;
      if (side === 0) { x = Math.random() * W; y = -80; vx = (Math.random() - 0.5) * 200; vy = 120 + Math.random() * 100; }
      else if (side === 1) { x = W + 80; y = Math.random() * H * 0.7 + 80; vx = -(120 + Math.random() * 100); vy = (Math.random() - 0.5) * 150; }
      else if (side === 2) { x = -80; y = Math.random() * H * 0.7 + 80; vx = 120 + Math.random() * 100; vy = (Math.random() - 0.5) * 150; }
      else { x = Math.random() * W; y = -80; vx = (Math.random() - 0.5) * 200; vy = 120 + Math.random() * 100; }
      spawnAsteroid(x, y, 60 + Math.random() * 30, vx, vy);
    }
  }

  game.onTap(function(x, y) {
    if (done) return;
    var dx = x - GUN_X, dy = y - GUN_Y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    bullets.push({
      x: GUN_X, y: GUN_Y,
      vx: (dx / dist) * BULLET_SPEED,
      vy: (dy / dist) * BULLET_SPEED
    });
    game.audio.play('se_tap', 0.4);
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

    if (flashTimer > 0) flashTimer -= dt;

    // Move bullets
    for (var b = bullets.length - 1; b >= 0; b--) {
      bullets[b].x += bullets[b].vx * dt;
      bullets[b].y += bullets[b].vy * dt;
      if (bullets[b].x < -20 || bullets[b].x > W + 20 || bullets[b].y < -20 || bullets[b].y > H + 20) {
        bullets.splice(b, 1);
        continue;
      }
      // Check asteroid hits
      var hit = false;
      for (var a = asteroids.length - 1; a >= 0; a--) {
        var ast = asteroids[a];
        var dx = bullets[b] ? bullets[b].x - ast.x : 0;
        var dy = bullets[b] ? bullets[b].y - ast.y : 0;
        if (Math.sqrt(dx * dx + dy * dy) < ast.r + 10) {
          // Hit! Split or destroy
          var speed = Math.sqrt(ast.vx * ast.vx + ast.vy * ast.vy);
          // Explosion particles
          for (var p = 0; p < 8; p++) {
            var ang = (p / 8) * Math.PI * 2;
            particles.push({
              x: ast.x, y: ast.y,
              vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180,
              life: 0.4, r: ast.r * 0.3, color: p % 2 === 0 ? C.explode : C.explHi
            });
          }
          if (ast.r > 24) {
            // Split into two smaller
            var perp = { x: -ast.vy / (speed || 1), y: ast.vx / (speed || 1) };
            spawnAsteroid(ast.x, ast.y, ast.r * 0.6, ast.vx * 0.7 + perp.x * 80, ast.vy * 0.7 + perp.y * 80);
            spawnAsteroid(ast.x, ast.y, ast.r * 0.6, ast.vx * 0.7 - perp.x * 80, ast.vy * 0.7 - perp.y * 80);
          }
          asteroids.splice(a, 1);
          if (bullets[b]) bullets.splice(b, 1);
          game.audio.play('se_tap', 0.7);
          flashTimer = 0.1;
          hit = true;

          // Win check
          if (asteroids.length === 0 && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(300 + Math.ceil(timeLeft) * 10); }, 400);
          }
          break;
        }
      }
    }

    // Move asteroids
    for (var i = asteroids.length - 1; i >= 0; i--) {
      var ast = asteroids[i];
      ast.x += ast.vx * dt;
      ast.y += ast.vy * dt;
      ast.rot += ast.rotV * dt;
      // Wrap edges (except up — escape from top counts as lost)
      if (ast.x < -ast.r - 20) ast.x = W + ast.r;
      if (ast.x > W + ast.r + 20) ast.x = -ast.r;
      if (ast.y > H + ast.r + 20) {
        asteroids.splice(i, 1);
        escapedCount++;
        game.audio.play('se_failure', 0.4);
        if (escapedCount >= maxEscaped && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    // Particles
    for (var p2 = particles.length - 1; p2 >= 0; p2--) {
      particles[p2].x += particles[p2].vx * dt;
      particles[p2].y += particles[p2].vy * dt;
      particles[p2].life -= dt;
      if (particles[p2].life <= 0) particles.splice(p2, 1);
    }

    // Respawn if all gone (shouldn't happen if win checked)
    if (asteroids.length === 0 && !done) {
      initialSpawn();
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var s = 0; s < 25; s++) {
      game.draw.circle((s * 239 + 80) % (W - 80), (s * 131 + 80) % (H - 80), 2, '#fff', 0.3 + s % 3 * 0.2);
    }

    // Particles
    for (var pt = 0; pt < particles.length; pt++) {
      var pp = particles[pt];
      var pa = pp.life / 0.4;
      game.draw.circle(pp.x, pp.y, pp.r * pa, pp.color, pa * 0.9);
    }

    // Asteroids (draw as irregular polygons via multiple circles)
    for (var ai = 0; ai < asteroids.length; ai++) {
      var ast2 = asteroids[ai];
      game.draw.circle(ast2.x, ast2.y, ast2.r + 4, C.astHi, 0.15);
      game.draw.circle(ast2.x, ast2.y, ast2.r, C.asteroid);
      // Crater detail
      game.draw.circle(ast2.x + ast2.r * 0.3, ast2.y - ast2.r * 0.2, ast2.r * 0.25, '#1a1c20', 0.8);
      game.draw.circle(ast2.x - ast2.r * 0.3, ast2.y + ast2.r * 0.3, ast2.r * 0.18, '#1a1c20', 0.6);
      game.draw.circle(ast2.x - ast2.r * 0.15, ast2.y - ast2.r * 0.15, ast2.r * 0.1, C.astHi, 0.4);
    }

    // Bullets
    for (var bu = 0; bu < bullets.length; bu++) {
      game.draw.circle(bullets[bu].x, bullets[bu].y, 12, C.bullet);
      game.draw.circle(bullets[bu].x, bullets[bu].y, 6, '#fff', 0.6);
    }

    // Gun
    if (flashTimer > 0) {
      game.draw.circle(GUN_X, GUN_Y, 60, '#fff', flashTimer / 0.1 * 0.4);
    }
    game.draw.circle(GUN_X, GUN_Y, 44, '#1d4ed8', 0.9);
    game.draw.circle(GUN_X, GUN_Y, 28, '#60a5fa', 0.8);
    game.draw.circle(GUN_X, GUN_Y - 28, 12, '#fff', 0.6);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#030508');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#1d4ed8' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Remaining count & escaped
    game.draw.text('残り: ' + asteroids.length, W / 2, 140, { size: 52, color: '#94a3b8', bold: true });
    for (var e = 0; e < maxEscaped; e++) {
      var ex = W / 2 + (e - 1) * 64;
      game.draw.circle(ex, 212, 20, e < escapedCount ? '#ef4444' : '#0a1428');
    }

    // Guide
    game.draw.text('タップで弾を撃て！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    initialSpawn();
  });
})(game);
