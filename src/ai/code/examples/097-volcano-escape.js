// 097-volcano-escape.js
// 火山脱出 — 上昇する溶岩から逃げながら上にスワイプでジャンプし続けるサバイバル感
// 操作: スワイプ上でジャンプ、左右でレーン移動
// 成功: 20秒生き残る  失敗: 溶岩に飲まれる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0400',
    lava:    '#ef4444',
    lavaHi:  '#f97316',
    lavaGlow:'#fbbf24',
    rock:    '#292524',
    rockHi:  '#44403c',
    player:  '#22d3ee',
    playerHi:'#67e8f9',
    safe:    '#22c55e',
    ui:      '#475569'
  };

  var LANES = 3;
  var LANE_XS = [W * 0.22, W * 0.5, W * 0.78];
  var PLAYER_Y_BASE = H * 0.7;

  var playerLane = 1;
  var targetLane = 1;
  var laneT = 1.0;

  var playerY = PLAYER_Y_BASE;
  var playerVY = 0;
  var GRAVITY = 1800;
  var JUMP_VY = -800;
  var onGround = true;

  var lavaY = H + 100; // lava surface
  var LAVA_RISE = 40; // pixels per second
  var lavaRiseAccel = 2;

  var platforms = []; // { x, y, w }
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.7;

  var timeLeft = 20;
  var done = false;
  var survived = 0;

  function spawnPlatform() {
    var lane = Math.floor(Math.random() * LANES);
    var w = 140 + Math.random() * 80;
    platforms.push({
      x: LANE_XS[lane] - w / 2,
      y: H * 0.15 + Math.random() * H * 0.5,
      w: w,
      scrollY: 0
    });
  }

  function initPlatforms() {
    platforms = [];
    // Starting platforms
    for (var i = 0; i < 4; i++) {
      platforms.push({
        x: LANE_XS[i % LANES] - 80,
        y: H * 0.4 + i * (H * 0.15),
        w: 160,
        scrollY: 0
      });
    }
    // Ground platforms for each lane
    for (var j = 0; j < LANES; j++) {
      platforms.push({ x: LANE_XS[j] - 80, y: H * 0.78, w: 160, scrollY: 0 });
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up' && onGround) {
      playerVY = JUMP_VY;
      onGround = false;
      game.audio.play('se_tap', 0.7);
    } else if (dir === 'left') {
      targetLane = Math.max(0, playerLane - 1);
      laneT = 0;
    } else if (dir === 'right') {
      targetLane = Math.min(LANES - 1, playerLane + 1);
      laneT = 0;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;
      LAVA_RISE += lavaRiseAccel * dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + Math.ceil(survived) * 15); }, 400);
        return;
      }
    }

    // Lane transition
    if (laneT < 1) {
      laneT += dt * 10;
      if (laneT >= 1) { laneT = 1; playerLane = targetLane; }
    }
    var displayX = LANE_XS[playerLane] * laneT + LANE_XS[targetLane] * (1 - laneT);
    // Actually:
    displayX = LANE_XS[playerLane] + (LANE_XS[targetLane] - LANE_XS[playerLane]) * (1 - laneT);

    // Gravity
    playerVY += GRAVITY * dt;
    playerY += playerVY * dt;

    // Platform collision
    onGround = false;
    var playerX = displayX;
    for (var i = 0; i < platforms.length; i++) {
      var pl = platforms[i];
      var py = pl.y + pl.scrollY;
      if (playerX >= pl.x - 20 && playerX <= pl.x + pl.w + 20 &&
          playerY >= py - 80 && playerY <= py + 10 && playerVY >= 0) {
        playerY = py - 80;
        playerVY = 0;
        onGround = true;
        break;
      }
    }

    // Scroll world up if player gets too high
    if (playerY < H * 0.4) {
      var scroll = H * 0.4 - playerY;
      playerY += scroll;
      lavaY += scroll;
      for (var j = 0; j < platforms.length; j++) {
        platforms[j].scrollY = (platforms[j].scrollY || 0) + scroll;
      }
    }

    // Lava rises
    lavaY -= LAVA_RISE * dt;

    // Spawn new platforms above
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL;
      spawnPlatform();
    }

    // Remove platforms that fell below lava
    platforms = platforms.filter(function(pl) {
      return pl.y + (pl.scrollY || 0) < lavaY;
    });

    // Player touches lava?
    if (playerY + 36 >= lavaY) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
      return;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Platforms
    for (var k = 0; k < platforms.length; k++) {
      var p = platforms[k];
      var py2 = p.y + (p.scrollY || 0);
      if (py2 > H + 50 || py2 < -100) continue;
      game.draw.rect(p.x, py2 - 20, p.w, 20, C.rock);
      game.draw.rect(p.x, py2 - 20, p.w, 6, C.rockHi);
    }

    // Player
    var pulse = 0.5 + 0.5 * Math.abs(Math.sin(game.time.elapsed * 6));
    game.draw.circle(displayX, playerY, 32 + pulse * 4, C.playerHi, pulse * 0.3);
    game.draw.circle(displayX, playerY, 32, C.player);
    game.draw.circle(displayX - 8, playerY - 8, 10, '#fff', 0.5);

    // Lava surface
    for (var lx = 0; lx < W; lx += 60) {
      var wave = Math.sin(game.time.elapsed * 3 + lx * 0.02) * 12;
      game.draw.rect(lx, lavaY + wave, 60, H - lavaY + 50, C.lava);
    }
    // Lava glow
    game.draw.rect(0, lavaY - 30, W, 30, C.lavaGlow, 0.3 + 0.2 * Math.abs(Math.sin(game.time.elapsed * 2)));

    // Danger zone tint
    var lavaDistFrac = Math.max(0, Math.min(1, (playerY - lavaY) / 300));
    if (lavaDistFrac < 0.5) {
      game.draw.rect(0, 0, W, H, C.lava, (0.5 - lavaDistFrac) * 0.3);
    }

    // Lane guides
    for (var l = 0; l < LANES; l++) {
      game.draw.line(LANE_XS[l], 0, LANE_XS[l], H, '#1c0a00', 2);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#0c0400');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.lava);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Survival time
    game.draw.text(Math.floor(survived) + 's', W / 2, 140, { size: 52, color: C.safe, bold: true });

    // Guide
    game.draw.text('↑ジャンプ / ←→移動', W / 2, H - 200, { size: 44, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    initPlatforms();
  });
})(game);
