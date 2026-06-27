// 710-tower-defense-solo.js
// 一人タワー防衛 — 右から来る敵をタップで撃破して塔を守れ
// 操作: タップで敵をクリックして撃破
// 成功: 40体撃破  失敗: 8体を通す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030810',
    tower:   '#1e3a5f',
    towerHi: '#3b82f6',
    enemyA:  '#dc2626',
    enemyB:  '#ea580c',
    enemyC:  '#7c3aed',
    bullet:  '#fbbf24',
    ground:  '#0f172a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#05080f'
  };

  var TOWER_X = 120;
  var GROUND_Y = H * 0.76;
  var TOWER_W = 100;
  var TOWER_H = 280;

  var enemies = [];
  var bullets = [];
  var spawnTimer = 0;
  var SPAWN_RATE = 1.0;

  var killed = 0;
  var NEEDED = 40;
  var leaked = 0;
  var MAX_LEAK = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var autoShootTimer = 0;

  var ENEMY_TYPES = [
    { r: 36, speed: 200, hp: 1, pts: 1, col: C.enemyA },
    { r: 50, speed: 120, hp: 2, pts: 2, col: C.enemyB },
    { r: 60, speed: 80,  hp: 3, pts: 3, col: C.enemyC }
  ];

  function spawnEnemy() {
    var typeIdx = Math.min(2, Math.floor(elapsed / 15));
    // Sometimes mix types
    if (Math.random() < 0.3) typeIdx = Math.max(0, typeIdx - 1);
    var t = ENEMY_TYPES[typeIdx];
    var y = GROUND_Y - t.r;
    enemies.push({
      x: W + t.r,
      y: y,
      r: t.r,
      speed: t.speed + elapsed * 2,
      hp: t.hp,
      maxHp: t.hp,
      pts: t.pts,
      col: t.col,
      hitFlash: 0
    });
  }

  function shootBullet(targetX, targetY) {
    var dx = targetX - TOWER_X;
    var dy = targetY - (GROUND_Y - TOWER_H / 2);
    var dist = Math.sqrt(dx * dx + dy * dy);
    var speed = 900;
    bullets.push({
      x: TOWER_X + TOWER_W / 2,
      y: GROUND_Y - TOWER_H / 2,
      vx: dx / dist * speed,
      vy: dy / dist * speed,
      life: 1.0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check if tapping an enemy
    var hit = false;
    for (var i = enemies.length - 1; i >= 0; i--) {
      var e = enemies[i];
      var dx = tx - e.x, dy = ty - e.y;
      if (dx * dx + dy * dy < (e.r + 20) * (e.r + 20)) {
        // Direct tap hit
        e.hp--;
        e.hitFlash = 0.25;
        game.audio.play('se_tap', 0.12);
        for (var p = 0; p < 3; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: e.x, y: e.y, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.3, col: e.col });
        }
        if (e.hp <= 0) {
          killed += e.pts;
          for (var p2 = 0; p2 < 5; p2++) {
            var pa2 = Math.random() * Math.PI * 2;
            particles.push({ x: e.x, y: e.y, vx: Math.cos(pa2) * 220, vy: Math.sin(pa2) * 220, life: 0.45, col: e.col });
          }
          game.audio.play('se_success', 0.35);
          enemies.splice(i, 1);
          if (killed >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(killed * 200 + Math.ceil(timeLeft) * 100); }, 700);
          }
        }
        hit = true;
        // Also shoot a bullet toward tap point
        shootBullet(tx, ty);
        break;
      }
    }
    if (!hit) {
      // Shoot bullet toward tap point
      shootBullet(tx, ty);
    }
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    spawnTimer += dt;
    var rate = Math.max(0.5, SPAWN_RATE - elapsed * 0.01);
    if (spawnTimer >= rate) { spawnTimer = 0; spawnEnemy(); }

    // Auto-shoot at nearest enemy periodically
    autoShootTimer -= dt;
    if (autoShootTimer <= 0) {
      autoShootTimer = 0.8;
      if (enemies.length > 0) {
        var closest = enemies[0];
        for (var ec = 1; ec < enemies.length; ec++) {
          if (enemies[ec].x < closest.x) closest = enemies[ec];
        }
        shootBullet(closest.x, closest.y);
        game.audio.play('se_tap', 0.04);
      }
    }

    // Update bullets
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt * 2;
      if (b.life <= 0 || b.x > W + 50 || b.x < -50) { bullets.splice(bi, 1); continue; }
      // Check bullet-enemy collision
      for (var ei = enemies.length - 1; ei >= 0; ei--) {
        var e2 = enemies[ei];
        var bdx = b.x - e2.x, bdy = b.y - e2.y;
        if (bdx * bdx + bdy * bdy < e2.r * e2.r) {
          e2.hp--;
          e2.hitFlash = 0.2;
          bullets.splice(bi, 1);
          if (e2.hp <= 0) {
            killed += e2.pts;
            for (var p3 = 0; p3 < 4; p3++) {
              var pa3 = Math.random() * Math.PI * 2;
              particles.push({ x: e2.x, y: e2.y, vx: Math.cos(pa3) * 180, vy: Math.sin(pa3) * 180, life: 0.4, col: e2.col });
            }
            game.audio.play('se_tap', 0.1);
            enemies.splice(ei, 1);
            if (killed >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(killed * 200 + Math.ceil(timeLeft) * 100); }, 700);
            }
          }
          break;
        }
      }
    }

    // Update enemies
    for (var i2 = enemies.length - 1; i2 >= 0; i2--) {
      var en = enemies[i2];
      en.x -= en.speed * dt;
      if (en.hitFlash > 0) en.hitFlash -= dt * 4;
      // Reached tower
      if (en.x < TOWER_X + TOWER_W / 2 + en.r) {
        leaked++;
        flashCol = C.wrong;
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.4);
        enemies.splice(i2, 1);
        if (leaked >= MAX_LEAK && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 0.9);
    game.draw.line(0, GROUND_Y, W, GROUND_Y, '#ffffff14', 2);

    // Tower
    game.draw.rect(TOWER_X - TOWER_W / 2 + 4, GROUND_Y - TOWER_H + 4, TOWER_W, TOWER_H, '#000', 0.3);
    game.draw.rect(TOWER_X - TOWER_W / 2, GROUND_Y - TOWER_H, TOWER_W, TOWER_H, C.tower, 0.9);
    // Battlements
    for (var bi2 = 0; bi2 < 3; bi2++) {
      var bx = TOWER_X - TOWER_W / 2 + bi2 * 38;
      game.draw.rect(bx, GROUND_Y - TOWER_H - 36, 28, 36, C.tower, 0.9);
    }
    game.draw.rect(TOWER_X - TOWER_W / 2, GROUND_Y - TOWER_H, TOWER_W, 12, C.towerHi, 0.5);
    // Gun port
    game.draw.rect(TOWER_X, GROUND_Y - TOWER_H / 2 - 8, 40, 16, C.towerHi, 0.9);

    // Bullets
    for (var bi3 = 0; bi3 < bullets.length; bi3++) {
      var bu = bullets[bi3];
      game.draw.circle(bu.x, bu.y, 10 * bu.life, C.bullet, bu.life * 0.9);
    }

    // Enemies
    for (var ei2 = 0; ei2 < enemies.length; ei2++) {
      var en2 = enemies[ei2];
      var eAlpha = 0.85 + en2.hitFlash * 0.15;
      game.draw.circle(en2.x + 4, en2.y + 4, en2.r, '#000', 0.3);
      game.draw.circle(en2.x, en2.y, en2.r, en2.hitFlash > 0 ? '#fff' : en2.col, eAlpha);
      // HP bar
      var hpRatio = en2.hp / en2.maxHp;
      if (en2.maxHp > 1) {
        game.draw.rect(en2.x - en2.r, en2.y + en2.r + 5, en2.r * 2, 10, '#333', 0.8);
        game.draw.rect(en2.x - en2.r, en2.y + en2.r + 5, en2.r * 2 * hpRatio, 10, C.correct, 0.85);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Leak indicators
    for (var li = 0; li < MAX_LEAK; li++) {
      game.draw.circle(W / 2 - (MAX_LEAK - 1) * 46 + li * 92, H * 0.955, 18, li < leaked ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(killed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnEnemy();
  });
})(game);
