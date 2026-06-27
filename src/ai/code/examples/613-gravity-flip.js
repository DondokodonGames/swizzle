// 613-gravity-flip.js
// グラビティフリップ — 重力を逆転させながら障害物をすり抜けろ
// 操作: タップで重力反転
// 成功: 20秒生存  失敗: 3回衝突 or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#05001a',
    player:   '#00e5ff',
    playerHi: '#aaffff',
    obs:      '#7c3aed',
    obsHi:    '#a78bfa',
    wall:     '#1a1040',
    wallHi:   '#2a2060',
    hit:      '#ef4444',
    safe:     '#22c55e',
    text:     '#f1f5f9',
    ui:       '#0a0025',
    trail:    '#00e5ff'
  };

  var PLAYER_X = W * 0.25;
  var PLAYER_R = 28;
  var CHANNEL_Y1 = H * 0.1;
  var CHANNEL_Y2 = H * 0.9;
  var GRAVITY_STRENGTH = 1800;

  var playerY = H / 2;
  var playerVY = 0;
  var gravityDir = 1; // 1=down, -1=up
  var trail = [];

  var obstacles = [];
  var hits = 0;
  var MAX_HITS = 3;
  var survived = 0;
  var SURVIVE_TIME = 20;
  var done = false;
  var timeLeft = SURVIVE_TIME;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var invincible = 0;
  var spawnTimer = 0;
  var speed = 350;

  function spawnObstacle() {
    var gapY = CHANNEL_Y1 + 200 + Math.random() * (CHANNEL_Y2 - CHANNEL_Y1 - 400);
    var gapH = 220 - elapsed * 2;
    if (gapH < 150) gapH = 150;
    obstacles.push({
      x: W + 80,
      topH: gapY - CHANNEL_Y1,
      botY: gapY + gapH,
      botH: CHANNEL_Y2 - (gapY + gapH),
      w: 60
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    gravityDir *= -1;
    playerVY *= 0.3; // damp on flip
    game.audio.play('se_tap', 0.2);
    // Flip trail
    for (var ti = 0; ti < trail.length; ti++) trail[ti].life *= 0.5;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(SURVIVE_TIME * 200 + (MAX_HITS - hits) * 400); }, 700);
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (invincible > 0) invincible -= dt;

    // Physics
    playerVY += GRAVITY_STRENGTH * gravityDir * dt;
    playerVY = Math.max(-900, Math.min(900, playerVY));
    playerY += playerVY * dt;

    // Wall collisions
    if (playerY - PLAYER_R < CHANNEL_Y1) {
      playerY = CHANNEL_Y1 + PLAYER_R;
      if (playerVY < 0) playerVY = 0;
      if (gravityDir < 0 && invincible <= 0) checkWallHit();
    }
    if (playerY + PLAYER_R > CHANNEL_Y2) {
      playerY = CHANNEL_Y2 - PLAYER_R;
      if (playerVY > 0) playerVY = 0;
      if (gravityDir > 0 && invincible <= 0) checkWallHit();
    }

    function checkWallHit() {
      hits++;
      invincible = 0.8;
      flashAnim = 0.4;
      game.audio.play('se_failure', 0.4);
      for (var p = 0; p < 6; p++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: C.playerHi });
      }
      if (hits >= MAX_HITS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }

    // Trail
    trail.push({ x: PLAYER_X, y: playerY, life: 0.5 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt * 2;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Speed increase
    speed = 350 + elapsed * 8;

    // Spawn obstacles
    spawnTimer += dt;
    if (spawnTimer > 1.5) {
      spawnTimer = 0;
      spawnObstacle();
    }

    // Move & check obstacles
    for (var oi = obstacles.length - 1; oi >= 0; oi--) {
      var o = obstacles[oi];
      o.x -= speed * dt;
      if (o.x + o.w < 0) { obstacles.splice(oi, 1); continue; }

      // Collision
      if (invincible <= 0 && PLAYER_X + PLAYER_R > o.x && PLAYER_X - PLAYER_R < o.x + o.w) {
        var topBot = CHANNEL_Y1 + o.topH;
        var botTop = o.botY;
        if (playerY - PLAYER_R < topBot || playerY + PLAYER_R > botTop) {
          hits++;
          invincible = 0.8;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.4);
          for (var p2 = 0; p2 < 8; p2++) {
            var a2 = Math.random() * Math.PI * 2;
            particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200, life: 0.4, col: C.playerHi });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    game.draw.rect(0, 0, W, CHANNEL_Y1, C.wall, 1);
    game.draw.rect(0, CHANNEL_Y2, W, H - CHANNEL_Y2, C.wall, 1);
    game.draw.rect(0, CHANNEL_Y1 - 4, W, 8, C.wallHi, 0.7);
    game.draw.rect(0, CHANNEL_Y2 - 4, W, 8, C.wallHi, 0.7);

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var o2 = obstacles[oi2];
      game.draw.rect(o2.x, CHANNEL_Y1, o2.w, o2.topH, C.obs, 0.9);
      game.draw.rect(o2.x, o2.botY, o2.w, o2.botH, C.obs, 0.9);
      game.draw.rect(o2.x, CHANNEL_Y1 + o2.topH - 8, o2.w, 8, C.obsHi, 0.6);
      game.draw.rect(o2.x, o2.botY, o2.w, 8, C.obsHi, 0.6);
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var tr = trail[ti2];
      game.draw.circle(tr.x, tr.y, PLAYER_R * 0.4 * tr.life, C.trail, tr.life * 0.5);
    }

    // Player
    var pAlpha = (invincible > 0 && Math.floor(elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    game.draw.circle(PLAYER_X + 4, playerY + 4, PLAYER_R, '#000', 0.3);
    game.draw.circle(PLAYER_X, playerY, PLAYER_R, C.player, pAlpha);
    game.draw.circle(PLAYER_X - 8, playerY - 8 * gravityDir, PLAYER_R * 0.3, C.playerHi, pAlpha * 0.6);
    // Gravity indicator arrow
    var arrowDir = gravityDir;
    game.draw.line(PLAYER_X, playerY, PLAYER_X, playerY + arrowDir * 20, C.playerHi, 3);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 10 * p3.life, p3.col, p3.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.1);

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 80 + hi * 160, H * 0.955, 28, hi < hits ? C.hit : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / SURVIVE_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '秒', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('タップで重力反転', W / 2, 80, { size: 32, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnObstacle();
    spawnObstacle();
  });
})(game);
