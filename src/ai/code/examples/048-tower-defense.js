// 048-tower-defense.js
// タワーディフェンス — 迫りくる敵をタップで撃退するシンプルな防衛戦
// 操作: 画面をタップして敵を撃つ
// 成功: 20秒生き残る  失敗: 5体の敵がゴールに到達

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050810',
    path:    '#0f1a08',
    pathHi:  '#1a2e0f',
    tower:   '#4f46e5',
    towerHi: '#818cf8',
    enemy:   '#ef4444',
    enemyHi: '#fca5a5',
    bullet:  '#fbbf24',
    goal:    '#22c55e',
    life:    '#22c55e',
    ui:      '#475569'
  };

  // Tower is at the bottom center
  var TOWER_X = W / 2;
  var TOWER_Y = H * 0.82;

  // Enemies come from top, move toward tower
  var enemies = [];
  var ENEMY_R = 44;
  var spawnTimer = 1.5;
  var bullets = [];
  var BULLET_R = 12;
  var BULLET_SPEED = 800;

  var lives = 5;
  var timeLeft = 20;
  var done = false;
  var kills = 0;

  var muzzleFlash = 0;
  var explosions = [];

  function spawnEnemy() {
    var x = game.random(80, W - 80);
    var speed = 150 + Math.random() * 80 + (20 - timeLeft) * 8;
    enemies.push({ x: x, y: -ENEMY_R, speed: speed, hp: 1, hit: false });
  }

  game.onTap(function(x, y) {
    if (done) return;
    // Fire bullet toward tap position
    var dx = x - TOWER_X;
    var dy = y - TOWER_Y;
    var dist = Math.sqrt(dx*dx + dy*dy) || 1;
    bullets.push({
      x: TOWER_X, y: TOWER_Y,
      vx: dx / dist * BULLET_SPEED,
      vy: dy / dist * BULLET_SPEED
    });
    muzzleFlash = 0.08;
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(200 + kills * 8 + lives * 30); }, 300);
        return;
      }
    }

    // Spawn enemies
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = Math.max(0.6, 1.5 - (20 - timeLeft) * 0.04);
    }

    // Move bullets
    for (var b = bullets.length - 1; b >= 0; b--) {
      var bul = bullets[b];
      bul.x += bul.vx * dt;
      bul.y += bul.vy * dt;
      if (bul.x < 0 || bul.x > W || bul.y < 0 || bul.y > H) {
        bullets.splice(b, 1);
        continue;
      }
      // Hit enemies
      var hit = false;
      for (var e = 0; e < enemies.length; e++) {
        var en = enemies[e];
        if (!en.hit) {
          var dx2 = bul.x - en.x, dy2 = bul.y - en.y;
          if (Math.sqrt(dx2*dx2+dy2*dy2) < ENEMY_R + BULLET_R) {
            en.hit = true;
            kills++;
            explosions.push({ x: en.x, y: en.y, r: 0, life: 0.35 });
            game.audio.play('se_tap', 0.7);
            hit = true;
            break;
          }
        }
      }
      if (hit) { bullets.splice(b, 1); continue; }
    }

    // Move enemies
    for (var i = enemies.length - 1; i >= 0; i--) {
      var en2 = enemies[i];
      if (en2.hit) { enemies.splice(i, 1); continue; }
      // Move toward tower
      var dx3 = TOWER_X - en2.x;
      var dy3 = TOWER_Y - en2.y;
      var dist2 = Math.sqrt(dx3*dx3+dy3*dy3) || 1;
      en2.x += dx3 / dist2 * en2.speed * dt;
      en2.y += dy3 / dist2 * en2.speed * dt;

      // Reached tower
      if (dist2 < ENEMY_R + 60) {
        enemies.splice(i, 1);
        lives--;
        if (lives <= 0 && !done) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
        }
        game.audio.play('se_failure', 0.5);
      }
    }

    // Update explosions
    for (var ex = explosions.length - 1; ex >= 0; ex--) {
      explosions[ex].r += 120 * dt;
      explosions[ex].life -= dt;
      if (explosions[ex].life <= 0) explosions.splice(ex, 1);
    }

    if (muzzleFlash > 0) muzzleFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Arena
    game.draw.circle(TOWER_X, TOWER_Y, 340, C.path, 0.3);
    game.draw.circle(TOWER_X, TOWER_Y, 200, C.path, 0.2);

    // Enemies
    for (var j = 0; j < enemies.length; j++) {
      var en3 = enemies[j];
      // Glow
      game.draw.circle(en3.x, en3.y, ENEMY_R + 10, C.enemy, 0.2);
      game.draw.circle(en3.x, en3.y, ENEMY_R, C.enemy);
      game.draw.circle(en3.x - 14, en3.y - 12, ENEMY_R * 0.3, C.enemyHi, 0.6);
      // Horns
      game.draw.rect(en3.x - 20, en3.y - ENEMY_R - 20, 12, 24, C.enemyHi, 0.7);
      game.draw.rect(en3.x + 8, en3.y - ENEMY_R - 16, 12, 20, C.enemyHi, 0.7);
    }

    // Bullets
    for (var bu = 0; bu < bullets.length; bu++) {
      game.draw.circle(bullets[bu].x, bullets[bu].y, BULLET_R, C.bullet);
      game.draw.circle(bullets[bu].x, bullets[bu].y, BULLET_R * 0.5, '#fff', 0.8);
    }

    // Explosions
    for (var exp = 0; exp < explosions.length; exp++) {
      var e2 = explosions[exp];
      var ea = e2.life / 0.35;
      game.draw.circle(e2.x, e2.y, e2.r, '#fbbf24', ea * 0.6);
      game.draw.circle(e2.x, e2.y, e2.r * 0.5, '#fff', ea * 0.4);
    }

    // Tower
    if (muzzleFlash > 0) {
      game.draw.circle(TOWER_X, TOWER_Y, 100, '#fff', muzzleFlash / 0.08 * 0.5);
    }
    game.draw.circle(TOWER_X, TOWER_Y, 80, '#0f0c28');
    game.draw.circle(TOWER_X, TOWER_Y, 64, C.tower);
    game.draw.circle(TOWER_X, TOWER_Y, 44, C.towerHi, 0.8);
    game.draw.circle(TOWER_X, TOWER_Y, 24, '#fff', 0.6);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#050810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.tower : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Lives
    for (var lv = 0; lv < 5; lv++) {
      var lvx = W / 2 + (lv - 2) * 68;
      game.draw.circle(lvx, 128, 24, lv < lives ? C.life : '#1a1428');
      if (lv < lives) game.draw.circle(lvx, 128, 14, '#86efac', 0.5);
    }

    // Kill count
    game.draw.text('撃破: ' + kills, W / 2, 200, { size: 48, color: C.towerHi, bold: true });

    // Guide
    game.draw.text('タップで撃て！', W / 2, H - 190, { size: 56, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnEnemy();
  });
})(game);
