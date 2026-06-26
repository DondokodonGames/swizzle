// 371-tower-defense-solo.js
// タワーディフェンス1人 — タップで弾を撃って侵入者を全滅させる
// 操作: タップで砲台を向けて発射
// 成功: 30体倒す  失敗: 5体通過 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0d1117',
    path:   '#1e2a3a',
    pathHi: '#263445',
    tower:  '#334155',
    towerHi:'#475569',
    cannon: '#64748b',
    bullet: '#fbbf24',
    bulletHi:'#fef3c7',
    enemy:  '#ef4444',
    enemyHi:'#fca5a5',
    base:   '#22c55e',
    baseHi: '#86efac',
    danger: '#dc2626',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var TOWER_X = W / 2;
  var TOWER_Y = H * 0.75;

  var enemies = [];
  var bullets = [];
  var particles = [];
  var spawnTimer = 0;
  var killed = 0;
  var NEEDED = 30;
  var leaked = 0;
  var MAX_LEAK = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var cannonAngle = -Math.PI / 2;

  function spawnEnemy() {
    var side = Math.floor(Math.random() * 4);
    var x, y, vx, vy;
    var speed = 180 + Math.random() * 80;
    if (side === 0) { x = Math.random() * W; y = -50; vx = 0; vy = speed; }
    else if (side === 1) { x = W + 50; y = Math.random() * H * 0.6; vx = -speed; vy = 0; }
    else if (side === 2) { x = -50; y = Math.random() * H * 0.6; vx = speed; vy = 0; }
    else { x = Math.random() * W; y = -50; vx = 0; vy = speed; }
    enemies.push({ x: x, y: y, vx: vx, vy: vy, hp: 2, maxHp: 2, r: 28 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Aim cannon and shoot
    var dx = tx - TOWER_X;
    var dy = ty - TOWER_Y;
    cannonAngle = Math.atan2(dy, dx);
    // Fire bullet
    var speed = 900;
    bullets.push({
      x: TOWER_X + Math.cos(cannonAngle) * 60,
      y: TOWER_Y + Math.sin(cannonAngle) * 60,
      vx: Math.cos(cannonAngle) * speed,
      vy: Math.sin(cannonAngle) * speed,
      life: 1.2
    });
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnEnemy();
      spawnTimer = 0.6 + Math.random() * 0.5 - Math.min(0.3, elapsed * 0.005);
    }

    // Update enemies
    for (var ei = enemies.length - 1; ei >= 0; ei--) {
      var e = enemies[ei];
      // Steer toward tower
      var dx = TOWER_X - e.x, dy = TOWER_Y - e.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 60) {
        var spd = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
        e.vx = (dx / dist) * spd;
        e.vy = (dy / dist) * spd;
      }
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      // Reached tower?
      if (dist < 50) {
        leaked++;
        for (var pi2 = 0; pi2 < 6; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: e.x, y: e.y, vx: Math.cos(ang2)*150, vy: Math.sin(ang2)*150, life:0.4, col: C.baseHi });
        }
        enemies.splice(ei, 1);
        game.audio.play('se_failure', 0.3);
        if (leaked >= MAX_LEAK && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }
    }

    // Update bullets
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
        bullets.splice(bi, 1);
        continue;
      }
      // Hit enemies
      for (var ei2 = enemies.length - 1; ei2 >= 0; ei2--) {
        if (Math.hypot(b.x - enemies[ei2].x, b.y - enemies[ei2].y) < enemies[ei2].r) {
          enemies[ei2].hp--;
          for (var pi3 = 0; pi3 < 4; pi3++) {
            var ang3 = Math.random() * Math.PI * 2;
            particles.push({ x: enemies[ei2].x, y: enemies[ei2].y, vx: Math.cos(ang3)*120, vy: Math.sin(ang3)*120, life:0.3, col: C.enemyHi });
          }
          if (enemies[ei2].hp <= 0) {
            killed++;
            game.audio.play('se_success', 0.3);
            for (var pi4 = 0; pi4 < 8; pi4++) {
              var ang4 = Math.random() * Math.PI * 2;
              particles.push({ x: enemies[ei2].x, y: enemies[ei2].y, vx: Math.cos(ang4)*200, vy: Math.sin(ang4)*200, life:0.5, col: C.bullet });
            }
            enemies.splice(ei2, 1);
            if (killed >= NEEDED && !done) {
              done = true;
              game.end.success(killed * 200 + Math.ceil(timeLeft) * 80);
            }
          }
          bullets.splice(bi, 1);
          break;
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

    // Path grid
    for (var gx = 0; gx < W; gx += 80) {
      game.draw.line(gx, 0, gx, H, C.path, 1);
    }
    for (var gy = 0; gy < H; gy += 80) {
      game.draw.line(0, gy, W, gy, C.path, 1);
    }

    // Tower base
    game.draw.circle(TOWER_X, TOWER_Y, 60, C.tower, 0.9);
    game.draw.circle(TOWER_X, TOWER_Y, 44, C.towerHi, 0.85);
    // Cannon
    var canLen = 80;
    game.draw.line(TOWER_X, TOWER_Y,
      TOWER_X + Math.cos(cannonAngle) * canLen,
      TOWER_Y + Math.sin(cannonAngle) * canLen,
      C.cannon, 24);
    game.draw.circle(TOWER_X, TOWER_Y, 24, C.cannon, 0.9);

    // Base HP indicators
    for (var li = 0; li < MAX_LEAK; li++) {
      game.draw.circle(W / 2 - (MAX_LEAK - 1) * 40 + li * 80, TOWER_Y + 80, 18, li < leaked ? C.danger : C.base, 0.9);
    }

    // Enemies
    for (var ei3 = 0; ei3 < enemies.length; ei3++) {
      var e2 = enemies[ei3];
      game.draw.circle(e2.x, e2.y, e2.r + 6, C.enemy, 0.2);
      game.draw.circle(e2.x, e2.y, e2.r, C.enemy, 0.9);
      // HP bar
      var hpFrac = e2.hp / e2.maxHp;
      game.draw.rect(e2.x - 24, e2.y - e2.r - 14, 48, 8, '#333', 0.8);
      game.draw.rect(e2.x - 24, e2.y - e2.r - 14, 48 * hpFrac, 8, C.enemyHi, 0.9);
    }

    // Bullets
    for (var bi2 = 0; bi2 < bullets.length; bi2++) {
      var b2 = bullets[bi2];
      game.draw.circle(b2.x, b2.y, 10, C.bullet, 0.9);
      game.draw.circle(b2.x - b2.vx * 0.02, b2.y - b2.vy * 0.02, 6, C.bulletHi, 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 7 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text(killed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.base : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.5;
  });
})(game);
