// 316-lava-jump.js
// 溶岩ジャンプ — 上昇する溶岩から逃げながら次々と崩れる足場を飛び移れ
// 操作: タップで飛び上がる（長押しでより高く）
// 成功: 高さ2000m到達  失敗: 溶岩に飲み込まれる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0200',
    sky1:   '#1a0500',
    sky2:   '#0a0200',
    lava:   '#dc2626',
    lava2:  '#ef4444',
    lavaHi: '#f97316',
    lavaGlow:'#fbbf24',
    platform:'#78350f',
    platHi: '#92400e',
    platLo: '#451a03',
    player: '#fde68a',
    playerHi:'#fff',
    heat:   '#f97316',
    ui:     '#94a3b8',
    text:   '#f1f5f9'
  };

  var playerX = W / 2;
  var playerY = H * 0.5;
  var playerVY = 0;
  var GRAVITY = 1200;
  var JUMP_FORCE = -700;
  var MAX_JUMP = -1100;
  var onGround = false;
  var holding = false;
  var holdTime = 0;

  var cameraY = 0; // world Y offset (player world coords = screen - cameraY)
  var maxHeight = 0; // in world units
  var NEEDED_HEIGHT = 2000;

  var platforms = [];
  var lavaWorldY = 0; // world Y of lava surface (starts below, rises)
  var LAVA_RISE_SPEED = 60;
  var playerWorldY = H * 0.5;

  var done = false;
  var elapsed = 0;
  var particles = [];
  var lavaParticles = [];

  function createPlatform(worldY, x, w) {
    platforms.push({ x: x, worldY: worldY, w: w, h: 16, crumble: 0 });
  }

  function initPlatforms() {
    platforms = [];
    for (var i = 0; i < 20; i++) {
      var worldY = -i * 140;
      var pw = 120 + Math.random() * 200;
      var px = Math.random() * (W - pw);
      createPlatform(worldY, px, pw);
    }
    // Starting platform
    createPlatform(H * 0.55, W / 2 - 100, 200);
    lavaWorldY = H * 0.85;
    playerWorldY = H * 0.45;
    cameraY = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (onGround) {
      playerVY = JUMP_FORCE;
      onGround = false;
      game.audio.play('se_tap', 0.25);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;
    }

    // Physics
    playerVY += GRAVITY * dt;
    playerWorldY += playerVY * dt;
    var playerScreenY = playerWorldY - cameraY;

    // Camera follows player (keep player in upper half)
    if (playerScreenY < H * 0.4) {
      cameraY -= (H * 0.4 - playerScreenY) * 0.15;
    }

    // Track max height
    var heightM = Math.round(-playerWorldY / 20);
    if (heightM > maxHeight) maxHeight = heightM;

    // Platform collision
    onGround = false;
    for (var pi2 = platforms.length - 1; pi2 >= 0; pi2--) {
      var pl = platforms[pi2];
      var plScreenY = pl.worldY - cameraY;
      if (playerVY > 0 &&
          playerWorldY + 20 >= pl.worldY &&
          playerWorldY + 20 <= pl.worldY + 30 &&
          playerX + 15 >= pl.x &&
          playerX - 15 <= pl.x + pl.w) {
        playerWorldY = pl.worldY - 20;
        playerVY = 0;
        onGround = true;
        // Crumble
        pl.crumble += dt * 0.8;
        if (pl.crumble >= 1) {
          platforms.splice(pi2, 1);
        }
      }
    }

    // Spawn new platforms above
    var highestPlatform = 0;
    for (var p3 = 0; p3 < platforms.length; p3++) {
      if (platforms[p3].worldY < highestPlatform) highestPlatform = platforms[p3].worldY;
    }
    while (highestPlatform > cameraY - H) {
      var newY = highestPlatform - 130 - Math.random() * 60;
      var npw = 80 + Math.random() * 180;
      var npx = Math.random() * (W - npw);
      createPlatform(newY, npx, npw);
      highestPlatform = newY;
    }

    // Rise lava
    lavaWorldY -= LAVA_RISE_SPEED * dt;
    var lavaScreenY = lavaWorldY - cameraY;

    // Lava particles
    if (Math.random() < 0.3) {
      lavaParticles.push({ x: Math.random() * W, y: lavaScreenY - 10, vy: -80 - Math.random() * 60, life: 0.6 });
    }
    for (var lp = lavaParticles.length - 1; lp >= 0; lp--) {
      lavaParticles[lp].y += lavaParticles[lp].vy * dt;
      lavaParticles[lp].vy += 300 * dt;
      lavaParticles[lp].life -= dt;
      if (lavaParticles[lp].life <= 0) lavaParticles.splice(lp, 1);
    }

    // Die in lava
    if (playerWorldY > lavaWorldY - 10 && !done) {
      done = true;
      game.audio.play('se_failure', 0.7);
      setTimeout(function() { game.end.failure(); }, 500);
      return;
    }

    // Success
    if (maxHeight >= NEEDED_HEIGHT && !done) {
      done = true;
      game.audio.play('se_success', 0.7);
      setTimeout(function() { game.end.success(maxHeight * 10 + Math.round(elapsed * 50)); }, 400);
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

    // Sky gradient based on height
    var skyAlpha = Math.min(1, maxHeight / 500);
    game.draw.rect(0, 0, W, H, C.sky1, 0.5 + skyAlpha * 0.3);

    // Platforms
    for (var p4 = 0; p4 < platforms.length; p4++) {
      var pl2 = platforms[p4];
      var plY2 = pl2.worldY - cameraY;
      if (plY2 < -30 || plY2 > H + 30) continue;
      var crumbleAlpha = 1 - pl2.crumble;
      var platCol = pl2.crumble > 0.5 ? C.platLo : C.platHi;
      game.draw.rect(pl2.x, plY2, pl2.w, 16, platCol, crumbleAlpha * 0.9);
      game.draw.rect(pl2.x, plY2, pl2.w, 6, C.platform, crumbleAlpha * 0.6);
      // Crumble cracks
      if (pl2.crumble > 0.3) {
        for (var cr = 0; cr < 3; cr++) {
          var cx2 = pl2.x + (cr + 0.5) * pl2.w / 3;
          game.draw.line(cx2, plY2, cx2 + (Math.random() - 0.5) * 20, plY2 + 16, C.lava, 3);
        }
      }
    }

    // Player
    var pScreenY = playerWorldY - cameraY;
    game.draw.circle(playerX, pScreenY, 22 + 4, C.player, 0.2);
    game.draw.circle(playerX, pScreenY, 22, C.player, 0.9);
    game.draw.circle(playerX, pScreenY - 10, 10, C.playerHi, 0.6);
    // Heat glow when near lava
    var distFromLava = (lavaWorldY - playerWorldY);
    if (distFromLava < 300) {
      game.draw.circle(playerX, pScreenY, 30, C.lavaHi, (1 - distFromLava / 300) * 0.3);
    }

    // Lava
    var lavaY = lavaWorldY - cameraY;
    game.draw.rect(0, lavaY, W, H - lavaY, C.lava, 0.95);
    // Lava surface wave
    for (var lw = 0; lw < W; lw += 60) {
      var waveH = 15 + 10 * Math.sin(elapsed * 3 + lw * 0.02);
      game.draw.circle(lw + 30, lavaY, 30, C.lava2, 0.8);
      game.draw.circle(lw + 20, lavaY - waveH * 0.5, 16, C.lavaHi, 0.6);
    }
    game.draw.rect(0, lavaY - 8, W, 20, C.lavaGlow, 0.3);

    // Lava particles
    for (var lp2 = 0; lp2 < lavaParticles.length; lp2++) {
      var lpa = lavaParticles[lp2];
      game.draw.circle(lpa.x, lpa.y, 10 * lpa.life * 2, C.lavaHi, lpa.life * 0.7);
    }

    // Height indicator
    game.draw.text(maxHeight + 'm', W * 0.85, 148, { size: 48, color: C.lavaGlow, bold: true });
    game.draw.text('目標: ' + NEEDED_HEIGHT + 'm', W * 0.85, 200, { size: 30, color: C.ui });

    game.draw.text('タップでジャンプ！', W / 2, H * 0.89, { size: 40, color: C.ui });

    // Progress bar
    var ratio = Math.min(1, maxHeight / NEEDED_HEIGHT);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, C.lavaHi);
    game.draw.text(maxHeight + 'm / ' + NEEDED_HEIGHT + 'm', W / 2, 36, { size: 36, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initPlatforms();
  });
})(game);
