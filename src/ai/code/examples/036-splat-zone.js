// 036-splat-zone.js
// スプラットゾーン — 落ちてくる的にタイミングよく飛びかかる爽快感
// 操作: スワイプ上で飛び上がる、的が頭上を通過する瞬間にタップ
// 成功: 5匹撃墜  失敗: 3回外す or 15秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a1a0a',
    ground:  '#0f2010',
    grass:   '#166534',
    player:  '#4ade80',
    playerHi:'#bbf7d0',
    enemy:   '#f97316',
    enemyHi: '#fed7aa',
    splat:   '#fbbf24',
    good:    '#22c55e',
    miss:    '#ef4444',
    ui:      '#475569'
  };

  var GROUND_Y = H * 0.78;
  var PLAYER_W = 100;
  var PLAYER_H = 140;
  var playerX = W / 2;
  var playerY = GROUND_Y - PLAYER_H;

  // Jump state
  var isJumping = false;
  var jumpVy = 0;
  var JUMP_FORCE = -1100;
  var GRAVITY = 2200;

  // Enemies pass overhead
  var enemies = [];
  var ENEMY_W = 120;
  var ENEMY_H = 80;
  var ENEMY_SPEED = 400;
  var spawnTimer = 1.5;
  var ENEMY_Y_RANGE = [H * 0.28, H * 0.5]; // height range for enemies

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 15;
  var done = false;

  var splatParticles = [];

  function spawnEnemy() {
    var ey = game.random(ENEMY_Y_RANGE[0], ENEMY_Y_RANGE[1]);
    enemies.push({ x: -ENEMY_W, y: ey, alive: true, hit: false });
  }

  function addSplat(x, y) {
    for (var i = 0; i < 10; i++) {
      var angle = Math.random() * Math.PI * 2;
      var spd = 200 + Math.random() * 400;
      splatParticles.push({
        x: x, y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        r: 8 + Math.random() * 16,
        life: 0.5 + Math.random() * 0.3
      });
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up' && !isJumping) {
      isJumping = true;
      jumpVy = JUMP_FORCE;
      game.audio.play('se_tap', 0.6);
    }
  });

  game.onTap(function(x, y) {
    if (done || !isJumping) return;

    // Check if player overlaps any enemy
    var hitIdx = -1;
    for (var i = 0; i < enemies.length; i++) {
      var en = enemies[i];
      if (!en.alive) continue;
      // Player head at playerY
      if (Math.abs(playerX - en.x) < (PLAYER_W + ENEMY_W) / 2 &&
          Math.abs(playerY - en.y) < (PLAYER_H + ENEMY_H) / 2) {
        hitIdx = i;
        break;
      }
    }

    if (hitIdx >= 0) {
      enemies[hitIdx].alive = false;
      score++;
      addSplat(enemies[hitIdx].x, enemies[hitIdx].y);
      game.audio.play('se_tap', 1.0);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 20 + Math.ceil(timeLeft) * 6);
        }, 400);
      }
    } else {
      // Miss (tapped but hit nothing)
      misses++;
      game.audio.play('se_failure', 0.4);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
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

    // Player jump physics
    if (isJumping) {
      jumpVy += GRAVITY * dt;
      playerY += jumpVy * dt;
      if (playerY >= GROUND_Y - PLAYER_H) {
        playerY = GROUND_Y - PLAYER_H;
        isJumping = false;
        jumpVy = 0;
      }
    }

    // Enemies
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = 1.0 + Math.random() * 0.8;
    }

    for (var i = enemies.length - 1; i >= 0; i--) {
      var en = enemies[i];
      if (!en.alive) { enemies.splice(i, 1); continue; }
      en.x += ENEMY_SPEED * dt;
      if (en.x > W + ENEMY_W) {
        // Missed enemy that flew past
        enemies.splice(i, 1);
        // Only count as miss if player could have hit it (was near ground)
        // Actually: any enemy flying past is fine — they don't auto-miss
        // Player must tap proactively; if they miss a tap attempt, that's a miss
      }
    }

    // Splat particles
    for (var s = splatParticles.length - 1; s >= 0; s--) {
      var sp = splatParticles[s];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 800 * dt;
      sp.life -= dt;
      if (sp.life <= 0) splatParticles.splice(s, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky (dark green night)
    game.draw.rect(0, 0, W, GROUND_Y, '#050f08');

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground);
    game.draw.rect(0, GROUND_Y, W, 12, C.grass);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#05100a');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#166534' : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & misses
    game.draw.text(score + ' / ' + needed, W / 2, 128, { size: 56, color: C.good, bold: true });
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 60;
      game.draw.circle(mx, 200, 18, m < misses ? C.miss : '#1a2a1a');
    }

    // Enemies
    for (var j = 0; j < enemies.length; j++) {
      var en2 = enemies[j];
      if (!en2.alive) continue;
      // Enemy body (rounded rect approximation)
      game.draw.circle(en2.x, en2.y, ENEMY_H * 0.5, C.enemy);
      game.draw.circle(en2.x - 20, en2.y - 12, ENEMY_H * 0.18, C.enemyHi, 0.7);
      // Eyes
      game.draw.circle(en2.x - 22, en2.y, 14, '#fff');
      game.draw.circle(en2.x + 22, en2.y, 14, '#fff');
      game.draw.circle(en2.x - 22, en2.y, 7, '#000');
      game.draw.circle(en2.x + 22, en2.y, 7, '#000');
      // Wings (oscillating)
      var wingA = Math.sin(game.time.elapsed * 12 + j) * 0.3;
      game.draw.rect(en2.x - ENEMY_H, en2.y - 24 + wingA * 40, ENEMY_H * 0.8, 16, C.enemyHi, 0.7);
      game.draw.rect(en2.x + ENEMY_H * 0.2, en2.y - 24 - wingA * 40, ENEMY_H * 0.8, 16, C.enemyHi, 0.7);
    }

    // Splat particles
    for (var sp2 = 0; sp2 < splatParticles.length; sp2++) {
      var spar = splatParticles[sp2];
      game.draw.circle(spar.x, spar.y, spar.r * spar.life / 0.8, C.splat, spar.life / 0.8);
    }

    // Player (jumping frog-like character)
    var px = playerX;
    var py = playerY;
    var jumpProgress = isJumping ? 1 - (playerY - (GROUND_Y - PLAYER_H * 2)) / PLAYER_H : 0;
    var squishY = isJumping ? 1.3 : 1.0;
    var squishX = isJumping ? 0.8 : 1.0;

    game.draw.circle(px, py + PLAYER_H * 0.4, PLAYER_H * 0.5 * squishX, C.player);
    game.draw.circle(px, py + PLAYER_H * 0.35, PLAYER_H * 0.42 * squishX, C.playerHi, 0.4);
    // Eyes
    var eyeOffset = isJumping ? -20 : -10;
    game.draw.circle(px - 24, py + PLAYER_H * 0.2 + eyeOffset, 20, '#fff');
    game.draw.circle(px + 24, py + PLAYER_H * 0.2 + eyeOffset, 20, '#fff');
    game.draw.circle(px - 24, py + PLAYER_H * 0.2 + eyeOffset, 10, '#1a4a1a');
    game.draw.circle(px + 24, py + PLAYER_H * 0.2 + eyeOffset, 10, '#1a4a1a');

    // Shadow on ground
    var shadowScale = 1 - (GROUND_Y - playerY - PLAYER_H) / (GROUND_Y - ENEMY_Y_RANGE[0]);
    game.draw.rect(px - 60 * shadowScale, GROUND_Y + 4, 120 * shadowScale, 16, '#000', 0.4 * shadowScale);

    // Guide
    game.draw.text(isJumping ? 'タップで撃墜！' : '↑スワイプでジャンプ', W / 2, H - 190, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnEnemy();
  });
})(game);
