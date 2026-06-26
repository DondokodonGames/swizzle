// 403-gravity-flip.js
// 重力反転 — タップで重力を反転させて障害物を避ける
// 操作: タップで重力を上下反転
// 成功: 3000の距離を走りきる  失敗: 壁に衝突 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050210',
    tunnel: '#1e1b4b',
    tunnelHi:'#312e81',
    wall:   '#4f46e5',
    wallHi: '#6d28d9',
    player: '#22d3ee',
    playerHi:'#cffafe',
    trail:  '#0ea5e9',
    danger: '#ef4444',
    safe:   '#22c55e',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var TUNNEL_TOP = H * 0.15;
  var TUNNEL_BOT = H * 0.85;
  var TUNNEL_H = TUNNEL_BOT - TUNNEL_TOP;

  var playerX = W * 0.22;
  var playerY = (TUNNEL_TOP + TUNNEL_BOT) / 2;
  var playerVY = 0;
  var gravDir = 1;  // 1=down, -1=up
  var GRAV = 1800;
  var playerR = 28;

  var scrollX = 0;
  var SCROLL_SPEED = 280;
  var distance = 0;
  var NEEDED_DIST = 3000;

  // Obstacles: { x, topH, botH } relative to tunnel
  var obstacles = [];
  var nextObstacleX = 600;
  var GAP = 260;  // gap between top and bottom obstacle

  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var trail = [];
  var flashAnim = 0;

  function spawnObstacle() {
    var gapY = 80 + Math.random() * (TUNNEL_H - GAP - 80);
    obstacles.push({
      x: nextObstacleX + scrollX,
      topH: gapY,
      botH: TUNNEL_H - gapY - GAP
    });
    nextObstacleX += 350 + Math.random() * 200;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    gravDir *= -1;
    playerVY *= 0.4;
    game.audio.play('se_tap', 0.3);
    // Flip particle burst
    for (var pi = 0; pi < 6; pi++) {
      var ang = Math.random()*Math.PI*2;
      particles.push({ x:playerX, y:playerY, vx:Math.cos(ang)*100, vy:Math.sin(ang)*100, life:0.4, col:C.playerHi });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Scroll
    scrollX += SCROLL_SPEED * dt;
    distance += SCROLL_SPEED * dt;

    if (distance >= NEEDED_DIST && !done) {
      done = true;
      game.audio.play('se_success', 0.7);
      setTimeout(function(){ game.end.success(Math.floor(distance)+Math.ceil(timeLeft)*80); }, 600);
    }

    // Player physics
    playerVY += GRAV * gravDir * dt;
    playerVY = Math.max(-1200, Math.min(1200, playerVY));
    playerY += playerVY * dt;

    // Tunnel walls
    if (playerY - playerR < TUNNEL_TOP) {
      playerY = TUNNEL_TOP + playerR;
      playerVY = Math.abs(playerVY) * 0.3;
      if (!done) { done = true; game.audio.play('se_failure', 0.6); setTimeout(function(){ game.end.failure(); }, 400); }
    }
    if (playerY + playerR > TUNNEL_BOT) {
      playerY = TUNNEL_BOT - playerR;
      playerVY = -Math.abs(playerVY) * 0.3;
      if (!done) { done = true; game.audio.play('se_failure', 0.6); setTimeout(function(){ game.end.failure(); }, 400); }
    }

    // Spawn obstacles
    while (nextObstacleX < scrollX + W + 200) spawnObstacle();

    // Trail
    trail.push({ x: playerX, y: playerY, life: 0.5 });
    if (trail.length > 20) trail.shift();
    for (var ti = trail.length-1; ti >= 0; ti--) trail[ti].life -= dt*2;

    // Check obstacles
    for (var oi = 0; oi < obstacles.length; oi++) {
      var obs = obstacles[oi];
      var ox = obs.x - scrollX;
      if (ox > W + 100 || ox < -200) continue;

      var topRect = { x: ox-40, y: TUNNEL_TOP, w: 80, h: obs.topH };
      var botRect = { x: ox-40, y: TUNNEL_BOT - obs.botH, w: 80, h: obs.botH };

      function collide(rect) {
        return playerX+playerR > rect.x && playerX-playerR < rect.x+rect.w &&
               playerY+playerR > rect.y && playerY-playerR < rect.y+rect.h;
      }
      if (collide(topRect) || collide(botRect)) {
        if (!done) {
          flashAnim = 0.5;
          done = true;
          game.audio.play('se_failure', 0.6);
          for (var pi2 = 0; pi2 < 12; pi2++) {
            var ang2 = Math.random()*Math.PI*2;
            particles.push({ x:playerX, y:playerY, vx:Math.cos(ang2)*200, vy:Math.sin(ang2)*200, life:0.6, col:C.danger });
          }
          setTimeout(function(){ game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Tunnel
    game.draw.rect(0, 0, W, TUNNEL_TOP, C.tunnel, 0.95);
    game.draw.rect(0, TUNNEL_BOT, W, H-TUNNEL_BOT, C.tunnel, 0.95);
    game.draw.line(0, TUNNEL_TOP, W, TUNNEL_TOP, C.tunnelHi, 4);
    game.draw.line(0, TUNNEL_BOT, W, TUNNEL_BOT, C.tunnelHi, 4);

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var obs2 = obstacles[oi2];
      var ox2 = obs2.x - scrollX;
      if (ox2 > W + 100 || ox2 < -200) continue;
      game.draw.rect(ox2-36, TUNNEL_TOP, 72, obs2.topH, C.wall, 0.9);
      game.draw.rect(ox2-36, TUNNEL_TOP, 72, obs2.topH, C.wallHi, 0.2);
      game.draw.rect(ox2-36, TUNNEL_BOT - obs2.botH, 72, obs2.botH, C.wall, 0.9);
      game.draw.rect(ox2-36, TUNNEL_BOT - obs2.botH, 72, obs2.botH, C.wallHi, 0.2);
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      if (trail[ti2].life > 0) game.draw.circle(trail[ti2].x, trail[ti2].y, playerR*0.7*trail[ti2].life, C.trail, trail[ti2].life*0.5);
    }

    // Player
    var gravIndicator = gravDir > 0 ? '↓' : '↑';
    game.draw.circle(playerX, playerY, playerR+6, C.playerHi, 0.15);
    game.draw.circle(playerX, playerY, playerR, C.player, 0.9);
    game.draw.circle(playerX-playerR*0.3, playerY-playerR*0.3, playerR*0.3, C.playerHi, 0.7);
    game.draw.text(gravIndicator, playerX, playerY+12, { size: 36, color: C.bg, bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9*p.life, p.col, p.life*0.8);
    }

    if (flashAnim > 0) {
      flashAnim -= dt * 3;
      game.draw.rect(0, 0, W, H, C.danger, flashAnim*0.2);
    }

    // Distance bar
    var distRatio = Math.min(1, distance/NEEDED_DIST);
    game.draw.text(Math.floor(distance) + ' / ' + NEEDED_DIST, W/2, 148, { size: 52, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.wall : C.danger);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnObstacle();
    spawnObstacle();
  });
})(game);
