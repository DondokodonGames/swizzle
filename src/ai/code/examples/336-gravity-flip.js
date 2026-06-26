// 336-gravity-flip.js
// グラビティフリップ — 重力を反転させながら障害物を避けて進む
// 操作: タップで重力反転（天井↔床を行き来）
// 成功: ゴールに到達  失敗: 障害物に当たる3回 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04020c',
    ceiling:'#1e1b4b',
    floor:  '#1e1b4b',
    ceilHi: '#312e81',
    floorHi:'#312e81',
    player: '#f59e0b',
    playerHi:'#fde68a',
    spike:  '#ef4444',
    spikeHi:'#fca5a5',
    trail:  '#f97316',
    goal:   '#22c55e',
    goalHi: '#86efac',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var PLAYER_R = 22;
  var GRAVITY_FORCE = 1200;

  var playerX = W * 0.15;
  var playerY = H * 0.5;
  var playerVY = 0;
  var gravDir = 1; // 1=down, -1=up
  var FLOOR_Y = H * 0.88;
  var CEILING_Y = H * 0.12;

  // Obstacles (spikes from floor and ceiling)
  var obstacles = [];
  var scrollX = 0;
  var SCROLL_SPEED = 180;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var distance = 0;
  var GOAL_DIST = 2000;
  var particles = [];
  var trails = [];
  var invincible = 0;
  var flipAnim = 0;

  function generateObstacles() {
    obstacles = [];
    // Generate obstacles at regular intervals
    for (var i = 0; i < 20; i++) {
      var ox = 600 + i * 280 + Math.random() * 80;
      var side = Math.random() < 0.5 ? 'floor' : 'ceiling';
      var h = 60 + Math.random() * 100;
      obstacles.push({ ox: ox, side: side, h: h, w: 50 });
    }
  }

  game.onTap(function() {
    if (done) return;
    gravDir = -gravDir;
    flipAnim = 0.3;
    game.audio.play('se_tap', 0.3);
    for (var pi = 0; pi < 4; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: playerX, y: playerY, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.3, col: C.playerHi });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flipAnim > 0) flipAnim -= dt * 3;
    if (invincible > 0) invincible -= dt;

    // Physics
    playerVY += GRAVITY_FORCE * gravDir * dt;
    playerVY = Math.max(-900, Math.min(900, playerVY));
    playerY += playerVY * dt;

    // Floor/ceiling collision
    if (playerY > FLOOR_Y - PLAYER_R) {
      playerY = FLOOR_Y - PLAYER_R;
      playerVY = 0;
    }
    if (playerY < CEILING_Y + PLAYER_R) {
      playerY = CEILING_Y + PLAYER_R;
      playerVY = 0;
    }

    // Trail
    trails.push({ x: playerX, y: playerY, life: 0.25 });
    for (var ti = trails.length - 1; ti >= 0; ti--) {
      trails[ti].life -= dt * 4;
      if (trails[ti].life <= 0) trails.splice(ti, 1);
    }

    // Scroll
    scrollX += SCROLL_SPEED * dt;
    distance += SCROLL_SPEED * dt;

    // Spawn more obstacles as needed
    var lastObs = obstacles.length > 0 ? obstacles[obstacles.length - 1].ox : 600;
    if (lastObs - scrollX < W) {
      var ox = lastObs + 200 + Math.random() * 120;
      var side = Math.random() < 0.5 ? 'floor' : 'ceiling';
      var h = 60 + Math.random() * 100;
      obstacles.push({ ox: ox, side: side, h: h, w: 50 });
    }

    // Remove old obstacles
    while (obstacles.length > 0 && obstacles[0].ox - scrollX < -200) {
      obstacles.shift();
    }

    // Obstacle collision
    if (invincible <= 0) {
      for (var oi = 0; oi < obstacles.length; oi++) {
        var obs = obstacles[oi];
        var oScreenX = obs.ox - scrollX + playerX - playerX; // relative to screen
        var obsX = obs.ox - scrollX + W * 0.15; // screen x
        var obsTop = obs.side === 'floor' ? FLOOR_Y - obs.h : CEILING_Y;
        var obsBot = obs.side === 'floor' ? FLOOR_Y : CEILING_Y + obs.h;

        if (obsX - obs.w / 2 < playerX + PLAYER_R && obsX + obs.w / 2 > playerX - PLAYER_R &&
            playerY - PLAYER_R < obsBot && playerY + PLAYER_R > obsTop) {
          hits++;
          invincible = 1.5;
          game.audio.play('se_failure', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: playerX, y: playerY, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200, life: 0.5, col: C.spikeHi });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
          break;
        }
      }
    }

    // Goal check
    if (distance >= GOAL_DIST && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      setTimeout(function() { game.end.success(Math.round(distance) + (MAX_HITS - hits) * 500 + Math.ceil(timeLeft) * 80); }, 400);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ceiling and floor
    game.draw.rect(0, 0, W, CEILING_Y, C.ceiling, 0.9);
    game.draw.rect(0, 0, W, CEILING_Y - 8, C.ceilHi, 0.8);
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.floor, 0.9);
    game.draw.rect(0, FLOOR_Y + 8, W, H - FLOOR_Y - 8, C.floorHi, 0.8);

    // Grid lines (scrolling)
    var gridStep = 120;
    for (var gx = -(scrollX % gridStep); gx < W; gx += gridStep) {
      game.draw.line(gx, CEILING_Y, gx, FLOOR_Y, C.ceilHi, 1);
    }

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var obs2 = obstacles[oi2];
      var obsScreenX = obs2.ox - scrollX + playerX;
      if (obsScreenX < -obs2.w || obsScreenX > W + obs2.w) continue;
      var obsY = obs2.side === 'floor' ? FLOOR_Y - obs2.h : CEILING_Y;
      game.draw.rect(obsScreenX - obs2.w / 2, obsY, obs2.w, obs2.h, C.spike, 0.9);
      game.draw.rect(obsScreenX - obs2.w / 2, obsY, obs2.w, 10, C.spikeHi, 0.8);
      // Spike tip
      var tipY = obs2.side === 'floor' ? obsY : obsY + obs2.h;
      game.draw.circle(obsScreenX, tipY, 16, C.spikeHi, 0.7);
    }

    // Trail
    for (var ti2 = 0; ti2 < trails.length; ti2++) {
      var tr = trails[ti2];
      game.draw.circle(tr.x, tr.y, PLAYER_R * tr.life * 2, C.trail, tr.life * 0.4);
    }

    // Player
    var palpha = invincible > 0 ? (Math.sin(elapsed * 20) * 0.4 + 0.5) : 0.9;
    if (flipAnim > 0) game.draw.circle(playerX, playerY, PLAYER_R * (1 + flipAnim * 0.5), C.playerHi, flipAnim * 0.4);
    game.draw.circle(playerX, playerY, PLAYER_R + 4, C.playerHi, 0.2 * palpha);
    game.draw.circle(playerX, playerY, PLAYER_R, C.player, palpha);
    // Direction indicator
    game.draw.line(playerX, playerY, playerX, playerY + gravDir * (PLAYER_R + 14), C.playerHi, 4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 28 + hi * 56, H * 0.92, 16, hi < hits ? C.spike : '#04020c');
    }

    // Distance progress
    var ratio = Math.min(1, distance / GOAL_DIST);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.7 ? C.goal : C.player);
    game.draw.text(Math.round(distance) + ' / ' + GOAL_DIST + 'm', W / 2, 36, { size: 36, color: '#fff', bold: true });
    game.draw.text(Math.ceil(timeLeft) + 's', W * 0.85, 36, { size: 36, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    generateObstacles();
  });
})(game);
