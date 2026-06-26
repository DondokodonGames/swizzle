// 357-asteroid-split.js
// アステロイドスプリット — 巨大小惑星を小さく割って全て消滅させる
// 操作: タップで射撃（画面の方向に向かって発射）
// 成功: 全小惑星を消す  失敗: 宇宙船に当たる3回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000408',
    star:   '#e2e8f0',
    ship:   '#60a5fa',
    shipHi: '#bfdbfe',
    bullet: '#fbbf24',
    bulletHi:'#fef3c7',
    ast:    '#6b7280',
    astHi:  '#9ca3af',
    astSml: '#d1d5db',
    danger: '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var shipX = W / 2;
  var shipY = H * 0.6;
  var shipAngle = -Math.PI / 2;
  var bullets = [];
  var asteroids = [];
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var particles = [];
  var invincible = 0;
  var bgStars = [];
  var clearAnim = 0;

  function initBgStars() {
    for (var i = 0; i < 60; i++) {
      bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 3 });
    }
  }

  function spawnAsteroids() {
    asteroids = [];
    var count = 3;
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2;
      var dist = 300;
      asteroids.push({
        x: W / 2 + Math.cos(angle) * dist,
        y: H / 2 + Math.sin(angle) * dist,
        vx: Math.cos(angle + Math.PI / 2) * 80,
        vy: Math.sin(angle + Math.PI / 2) * 80,
        r: 80,
        size: 2 // 2=large, 1=medium, 0=small
      });
    }
  }

  function spawnBullet(tx, ty) {
    var dx = tx - shipX, dy = ty - shipY;
    var len = Math.sqrt(dx*dx+dy*dy);
    if (len < 1) return;
    var speed = 700;
    bullets.push({ x: shipX, y: shipY, vx: dx/len*speed, vy: dy/len*speed, life: 1.2 });
    game.audio.play('se_tap', 0.3);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    shipAngle = Math.atan2(ty - shipY, tx - shipX);
    spawnBullet(tx, ty);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (invincible > 0) invincible -= dt;
    if (clearAnim > 0) clearAnim -= dt;

    // Bullets
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) {
        bullets.splice(bi, 1);
        continue;
      }

      // Hit asteroid
      var hit = false;
      for (var ai = asteroids.length - 1; ai >= 0; ai--) {
        var a = asteroids[ai];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r + 10) {
          bullets.splice(bi, 1);
          // Split asteroid
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: a.x, y: a.y, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life:0.5, col: C.astHi });
          }
          if (a.size > 0) {
            // Split into 2 smaller
            for (var s = 0; s < 2; s++) {
              var splitAng = Math.atan2(b.vy, b.vx) + (Math.PI / 2) * (s === 0 ? 1 : -1);
              var newR = a.size === 2 ? 44 : 22;
              asteroids.push({
                x: a.x, y: a.y,
                vx: Math.cos(splitAng) * (a.size === 2 ? 120 : 180),
                vy: Math.sin(splitAng) * (a.size === 2 ? 120 : 180),
                r: newR,
                size: a.size - 1
              });
            }
          }
          game.audio.play('se_success', 0.4);
          asteroids.splice(ai, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    // Move asteroids
    for (var ai2 = 0; ai2 < asteroids.length; ai2++) {
      var a2 = asteroids[ai2];
      a2.x = (a2.x + a2.vx * dt + W) % W;
      a2.y = (a2.y + a2.vy * dt + H) % H;

      // Hit ship
      if (invincible <= 0 && Math.hypot(a2.x - shipX, a2.y - shipY) < a2.r + 30) {
        hits++;
        invincible = 2.0;
        game.audio.play('se_failure', 0.5);
        for (var pi2 = 0; pi2 < 8; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: shipX, y: shipY, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200, life:0.5, col: C.shipHi });
        }
        if (hits >= MAX_HITS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
      }
    }

    // Check clear
    if (asteroids.length === 0 && !clearAnim && !done) {
      clearAnim = 1.0;
      game.audio.play('se_success', 0.7);
      for (var pi3 = 0; pi3 < 15; pi3++) {
        var ang3 = Math.random() * Math.PI * 2;
        particles.push({ x: W/2, y: H/2, vx: Math.cos(ang3)*250, vy: Math.sin(ang3)*250, life:0.7, col: C.bulletHi });
      }
      done = true;
      setTimeout(function() { game.end.success(5000 + Math.ceil(timeLeft) * 150); }, 600);
      return;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si = 0; si < bgStars.length; si++) {
      game.draw.circle(bgStars[si].x, bgStars[si].y, bgStars[si].r, C.star, 0.5 + Math.sin(elapsed * 0.8 + si) * 0.3);
    }

    // Asteroids
    for (var ai3 = 0; ai3 < asteroids.length; ai3++) {
      var a3 = asteroids[ai3];
      var ac = a3.size === 2 ? C.ast : (a3.size === 1 ? C.astHi : C.astSml);
      game.draw.circle(a3.x, a3.y, a3.r + 6, ac, 0.2);
      game.draw.circle(a3.x, a3.y, a3.r, ac, 0.85);
      game.draw.circle(a3.x - a3.r * 0.3, a3.y - a3.r * 0.3, a3.r * 0.25, '#fff', 0.15);
    }

    // Bullets
    for (var bi2 = 0; bi2 < bullets.length; bi2++) {
      var b2 = bullets[bi2];
      game.draw.circle(b2.x, b2.y, 10, C.bullet, 0.9);
      game.draw.circle(b2.x - b2.vx * 0.02, b2.y - b2.vy * 0.02, 6, C.bulletHi, 0.6);
    }

    // Ship
    var sa = shipAngle;
    var palpha = invincible > 0 ? (Math.sin(elapsed * 15) * 0.4 + 0.5) : 1.0;
    game.draw.circle(shipX, shipY, 30, C.ship, 0.9 * palpha);
    game.draw.circle(shipX, shipY, 18, C.shipHi, 0.7 * palpha);
    // Ship nose
    game.draw.line(shipX, shipY, shipX + Math.cos(sa) * 48, shipY + Math.sin(sa) * 48, C.shipHi, 6 * palpha);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 28 + hi * 56, H * 0.91, 16, hi < hits ? C.danger : '#000408');
    }

    // Asteroid count
    game.draw.text('残り ' + asteroids.length + '個', W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ship : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    initBgStars();
    spawnAsteroids();
  });
})(game);
