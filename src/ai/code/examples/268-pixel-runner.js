// 268-pixel-runner.js
// ピクセルランナー — 8ビット風横スクロールで障害物を乗り越えるランゲーム
// 操作: タップでジャンプ（空中で再タップで2段ジャンプ）
// 成功: 距離100m走る  失敗: 障害物に当たる or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#05030e',
    sky1:   '#1a1240',
    sky2:   '#0d0820',
    ground: '#1e3a1e',
    gndHi:  '#2d5a2d',
    player: '#22c55e',
    plrHi:  '#86efac',
    obs:    '#ef4444',
    obsHi:  '#fca5a5',
    star:   '#fde68a',
    ui:     '#475569',
    text:   '#f1f5f9',
    cloud:  '#1e293b'
  };

  var GROUND_Y = H * 0.72;
  var PLAYER_X = W * 0.2;
  var PLAYER_W = 44;
  var PLAYER_H = 56;

  var player = {
    x: PLAYER_X, y: GROUND_Y - PLAYER_H,
    vy: 0,
    jumps: 0,
    maxJumps: 2,
    onGround: true,
    runFrame: 0,
    runTimer: 0
  };

  var obstacles = [];
  var distance = 0;
  var NEEDED = 100; // meters
  var scrollSpeed = 200;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var spawnTimer = 0;
  var stars = [];
  var clouds = [];
  var dustParticles = [];

  // Init stars
  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * GROUND_Y * 0.8 });
  }
  // Init clouds
  for (var ci = 0; ci < 4; ci++) {
    clouds.push({ x: Math.random() * W, y: 80 + Math.random() * H * 0.3, w: 100 + Math.random() * 150, speed: 20 + Math.random() * 20 });
  }

  function spawnObstacle() {
    var h = 50 + Math.floor(Math.random() * 3) * 30;
    var w = 28 + Math.floor(Math.random() * 3) * 8;
    obstacles.push({ x: W + 40, w: w, h: h, y: GROUND_Y - h });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (player.jumps < player.maxJumps) {
      player.vy = -700;
      player.jumps++;
      player.onGround = false;
      game.audio.play('se_tap', 0.35);
      // Dust
      for (var di = 0; di < 4; di++) {
        var ang = Math.PI + (Math.random() - 0.5) * 1;
        dustParticles.push({ x: player.x + PLAYER_W / 2, y: player.y + PLAYER_H, vx: Math.cos(ang) * 60, vy: Math.sin(ang) * 60 - 30, life: 0.3 });
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Player physics
    player.vy += 1800 * dt;
    player.y += player.vy * dt;

    if (player.y >= GROUND_Y - PLAYER_H) {
      player.y = GROUND_Y - PLAYER_H;
      player.vy = 0;
      player.jumps = 0;
      player.onGround = true;
    }

    // Run animation
    player.runTimer += dt;
    if (player.runTimer > 0.12) { player.runTimer = 0; player.runFrame = (player.runFrame + 1) % 4; }

    // Scroll
    scrollSpeed = 200 + distance * 0.8;
    distance += scrollSpeed * dt / 100;

    if (distance >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.floor(distance) * 50 + Math.ceil(timeLeft) * 100); }, 400);
      return;
    }

    // Move obstacles
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnObstacle();
      spawnTimer = 0.9 + Math.random() * 1.4;
    }
    for (var oi = obstacles.length - 1; oi >= 0; oi--) {
      obstacles[oi].x -= scrollSpeed * dt;
      if (obstacles[oi].x + obstacles[oi].w < 0) { obstacles.splice(oi, 1); continue; }
      // Collision
      var obs = obstacles[oi];
      if (player.x + PLAYER_W - 8 > obs.x + 6 && player.x + 8 < obs.x + obs.w - 6 &&
          player.y + PLAYER_H - 8 > obs.y + 6) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }

    // Move clouds
    for (var ci2 = 0; ci2 < clouds.length; ci2++) {
      clouds[ci2].x -= clouds[ci2].speed * dt;
      if (clouds[ci2].x + clouds[ci2].w < 0) { clouds[ci2].x = W + 20; clouds[ci2].y = 80 + Math.random() * H * 0.3; }
    }

    // Dust particles
    for (var di = dustParticles.length - 1; di >= 0; di--) {
      dustParticles[di].x += dustParticles[di].vx * dt;
      dustParticles[di].y += dustParticles[di].vy * dt;
      dustParticles[di].vy += 300 * dt;
      dustParticles[di].life -= dt;
      if (dustParticles[di].life <= 0) dustParticles.splice(di, 1);
    }

    // ---- draw ----
    // Sky gradient
    game.draw.rect(0, 0, W, GROUND_Y, C.sky1, 1);
    game.draw.rect(0, GROUND_Y * 0.5, W, GROUND_Y * 0.5, C.sky2, 0.5);

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      game.draw.circle(stars[si2].x, stars[si2].y, 2, C.star, 0.6);
    }

    // Clouds
    for (var ci3 = 0; ci3 < clouds.length; ci3++) {
      var cl = clouds[ci3];
      game.draw.rect(cl.x, cl.y, cl.w, 28, C.cloud, 0.5);
      game.draw.rect(cl.x + 20, cl.y - 14, cl.w - 40, 14, C.cloud, 0.5);
    }

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 1);
    game.draw.rect(0, GROUND_Y, W, 10, C.gndHi, 0.8);
    // Ground tiles
    var tileSize = 40;
    var tileOffset = (elapsed * scrollSpeed) % tileSize;
    for (var ti = 0; ti < Math.ceil(W / tileSize) + 1; ti++) {
      game.draw.rect(ti * tileSize - tileOffset, GROUND_Y + 10, tileSize - 2, 14, C.gndHi, 0.2);
    }

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var obs2 = obstacles[oi2];
      game.draw.rect(obs2.x, obs2.y, obs2.w, obs2.h, C.obs, 0.9);
      game.draw.rect(obs2.x, obs2.y, obs2.w, 8, C.obsHi, 0.7);
      // Pixel pattern
      for (var pi2 = 0; pi2 < Math.floor(obs2.h / 14); pi2++) {
        game.draw.rect(obs2.x + 4, obs2.y + 10 + pi2 * 14, obs2.w - 8, 6, C.obsHi, 0.15);
      }
    }

    // Dust particles
    for (var di2 = 0; di2 < dustParticles.length; di2++) {
      var dp = dustParticles[di2];
      game.draw.circle(dp.x, dp.y, 5 * (dp.life / 0.3), C.gndHi, dp.life * 0.6);
    }

    // Player (pixel style)
    var px = player.x, py = player.y;
    // Body
    game.draw.rect(px + 4, py, PLAYER_W - 8, PLAYER_H, C.player, 0.9);
    // Head
    game.draw.rect(px + 8, py - 24, PLAYER_W - 16, 24, C.plrHi, 0.9);
    // Eye
    game.draw.rect(px + PLAYER_W - 16, py - 18, 8, 8, C.bg, 0.9);
    // Legs (animated)
    var legOff = player.onGround ? Math.sin(player.runFrame * Math.PI / 2) * 12 : 0;
    game.draw.rect(px + 4, py + PLAYER_H, 14, 16 + legOff, C.plrHi, 0.8);
    game.draw.rect(px + PLAYER_W - 18, py + PLAYER_H, 14, 16 - legOff, C.plrHi, 0.8);

    // Distance progress
    var distRatio = Math.min(1, distance / NEEDED);
    game.draw.rect(40, H * 0.82, W - 80, 14, C.ui, 0.3);
    game.draw.rect(40, H * 0.82, (W - 80) * distRatio, 14, C.player, 0.9);
    game.draw.text(Math.floor(distance) + 'm / ' + NEEDED + 'm', W / 2, H * 0.87, { size: 42, color: C.text, bold: true });
    game.draw.text('タップ / 2段ジャンプ', W / 2, H * 0.91, { size: 34, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.obs);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 1.5;
  });
})(game);
