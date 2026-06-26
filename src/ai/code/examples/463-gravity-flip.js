// 463-gravity-flip.js
// 重力反転 — タップで重力の向きを逆にして壁の障害物を避ける
// 操作: タップで重力上下を切り替える
// 成功: 距離1500m到達  失敗: 壁に激突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020818',
    tunnel0:'#0a1628',
    tunnel1:'#0f2040',
    wall:   '#1e40af',
    wallHi: '#3b82f6',
    wallSpike:'#60a5fa',
    player: '#22d3ee',
    playerHi:'#cffafe',
    trail:  '#0891b2',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    dist:   '#fbbf24'
  };

  var TUNNEL_H = H;
  var PLAYER_X = 200;
  var PLAYER_R = 22;
  var GRAVITY = 1400;
  var WALL_SPEED = 280;

  var playerY = H / 2;
  var playerVY = 0;
  var gravDir = 1;  // 1=down, -1=up
  var walls = [];
  var particles = [];
  var trail = [];
  var distance = 0;
  var TARGET_DIST = 1500;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var nextWall = 1.5;

  function addWall() {
    var gapH = 280 - distance * 0.04;
    if (gapH < 160) gapH = 160;
    var gapY = 120 + Math.random() * (H - 240 - gapH);
    walls.push({ x: W + 60, gapY: gapY, gapH: gapH });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    gravDir = -gravDir;
    playerVY *= 0.3;
    game.audio.play('se_tap', 0.3);
    for (var pi = 0; pi < 4; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(ang)*80, vy: Math.sin(ang)*80, life: 0.3, col: C.playerHi });
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

    // Physics
    playerVY += GRAVITY * gravDir * dt;
    playerVY = Math.max(-800, Math.min(800, playerVY));
    playerY += playerVY * dt;

    // Wall bounds
    if (playerY - PLAYER_R < 80) {
      playerY = 80 + PLAYER_R;
      playerVY = Math.abs(playerVY) * 0.4;
      // Collision with ceiling
      if (gravDir === -1) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (playerY + PLAYER_R > H - 80) {
      playerY = H - 80 - PLAYER_R;
      playerVY = -Math.abs(playerVY) * 0.4;
      if (gravDir === 1) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    // Trail
    trail.push({ x: PLAYER_X, y: playerY });
    if (trail.length > 15) trail.shift();

    // Distance
    distance += WALL_SPEED * dt;
    if (distance >= TARGET_DIST && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      setTimeout(function() { game.end.success(Math.floor(distance) * 10 + Math.ceil(timeLeft) * 80); }, 700);
      return;
    }

    // Walls
    nextWall -= dt;
    if (nextWall <= 0 && !done) {
      addWall();
      nextWall = 0.8 + Math.random() * 0.4;
    }

    for (var wi = walls.length - 1; wi >= 0; wi--) {
      walls[wi].x -= WALL_SPEED * dt;
      var w = walls[wi];

      // Collision check
      if (Math.abs(w.x - PLAYER_X) < 50 + PLAYER_R) {
        // Top wall collision
        if (playerY - PLAYER_R < w.gapY || playerY + PLAYER_R > w.gapY + w.gapH) {
          done = true;
          game.audio.play('se_failure', 0.6);
          for (var pi2 = 0; pi2 < 12; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200, life: 0.6, col: C.wrong });
          }
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
      }

      if (w.x < -100) walls.splice(wi, 1);
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Tunnel sides
    game.draw.rect(0, 0, W, 80, C.tunnel1, 0.9);
    game.draw.rect(0, H - 80, W, 80, C.tunnel1, 0.9);

    // Walls
    for (var wi2 = 0; wi2 < walls.length; wi2++) {
      var w2 = walls[wi2];
      // Top wall
      game.draw.rect(w2.x - 50, 80, 100, w2.gapY - 80, C.wall, 0.9);
      game.draw.rect(w2.x - 50, 80, 100, 8, C.wallHi, 0.6);
      // Bottom wall
      var botTop = w2.gapY + w2.gapH;
      game.draw.rect(w2.x - 50, botTop, 100, H - 80 - botTop, C.wall, 0.9);
      game.draw.rect(w2.x - 50, botTop, 100, 8, C.wallHi, 0.6);
      // Spikes at gap edges
      game.draw.circle(w2.x, w2.gapY, 20, C.wallSpike, 0.8);
      game.draw.circle(w2.x, w2.gapY + w2.gapH, 20, C.wallSpike, 0.8);
    }

    // Trail
    for (var ti = 0; ti < trail.length; ti++) {
      var tRatio = ti / trail.length;
      game.draw.circle(trail[ti].x, trail[ti].y, PLAYER_R * tRatio * 0.7, C.trail, tRatio * 0.4);
    }

    // Player
    var gravGlow = gravDir === 1 ? 1 : 0;
    game.draw.circle(PLAYER_X, playerY, PLAYER_R + 8, C.playerHi, 0.15);
    game.draw.circle(PLAYER_X, playerY, PLAYER_R, C.player, 0.9);
    game.draw.circle(PLAYER_X, playerY, PLAYER_R * 0.5, C.playerHi, 0.5);
    // Gravity arrow
    var arrowDir = gravDir === 1 ? 1 : -1;
    game.draw.line(PLAYER_X, playerY, PLAYER_X, playerY + arrowDir * 40, C.playerHi, 4);
    game.draw.circle(PLAYER_X, playerY + arrowDir * 40, 8, C.playerHi, 0.8);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.wrong, flashAnim * 0.1);

    // Distance bar
    var distRatio = Math.min(1, distance / TARGET_DIST);
    game.draw.rect(0, H - 78, W * distRatio, 6, C.dist, 0.8);
    game.draw.text(Math.floor(distance) + 'm / ' + TARGET_DIST + 'm', W/2, H - 40, { size: 38, color: C.dist, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
