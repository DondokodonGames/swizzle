// 382-sticky-wall.js
// スティッキーウォール — ジャンプして壁に張り付き、上へ上へ登る
// 操作: タップで壁に向かってジャンプ (左右交互)
// 成功: 2000px登る  失敗: 落下3回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a18',
    wallL:  '#1e3a5f',
    wallLHi:'#1d4ed8',
    wallR:  '#1f3326',
    wallRHi:'#15803d',
    player: '#f59e0b',
    playerHi:'#fef3c7',
    trail:  '#a78bfa',
    danger: '#ef4444',
    goal:   '#fbbf24',
    star:   '#f1f5f9',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var WALL_W = 100;
  var WALL_L_X = WALL_W;   // left wall right edge
  var WALL_R_X = W - WALL_W; // right wall left edge
  var CHANNEL_W = W - 2 * WALL_W;

  var px = W / 2;
  var py = H - 60;
  var pvx = 0;
  var pvy = 0;
  var GRAVITY = 1200;
  var JUMP_V = -1100;
  var PLAYER_R = 24;
  var stuckWall = 0;  // -1 = left, 1 = right, 0 = free
  var climbing = 0;   // total distance climbed
  var GOAL = 2000;
  var cameraY = 0;    // how much screen has scrolled

  var falls = 0;
  var MAX_FALLS = 3;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var particles = [];
  var trail = [];

  function respawn() {
    falls++;
    game.audio.play('se_failure', 0.5);
    for (var pi = 0; pi < 8; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: px, y: py - cameraY, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life:0.5, col: C.playerHi });
    }
    px = W / 2;
    py = H - 60 + cameraY;
    pvx = 0; pvy = 0;
    stuckWall = 0;
    if (falls >= MAX_FALLS && !done) {
      done = true;
      setTimeout(function() { game.end.failure(); }, 500);
    }
  }

  game.onTap(function() {
    if (done) return;
    if (stuckWall !== 0) {
      // Jump from wall toward opposite wall
      var jumpDir = stuckWall > 0 ? -1 : 1;
      pvx = jumpDir * 600;
      pvy = JUMP_V;
      stuckWall = 0;
      game.audio.play('se_tap', 0.4);
      for (var pi = 0; pi < 4; pi++) {
        var ang = Math.random() * Math.PI;
        particles.push({ x: px, y: py - cameraY, vx: jumpDir * 80 + Math.cos(ang)*60, vy: -Math.abs(Math.sin(ang))*80, life:0.4, col: C.trail });
      }
    } else if (py > H - 80 + cameraY) {
      // Starting jump
      pvx = (Math.random() < 0.5 ? -1 : 1) * 500;
      pvy = JUMP_V;
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (stuckWall !== 0) {
      // Slide down slightly
      pvy = Math.min(pvy + 80 * dt, 60);
      py += pvy * dt;
    } else {
      pvx += 0;
      pvy += GRAVITY * dt;
      px += pvx * dt;
      py += pvy * dt;

      // Check wall collision
      if (px - PLAYER_R <= WALL_W && pvx < 0) {
        px = WALL_W + PLAYER_R;
        stuckWall = -1;
        pvx = 0;
        pvy = 0;
        game.audio.play('se_tap', 0.2);
        for (var pi2 = 0; pi2 < 3; pi2++) {
          particles.push({ x: px, y: py - cameraY, vx: 80+Math.random()*40, vy: (Math.random()-0.5)*60, life:0.3, col: C.wallLHi });
        }
      } else if (px + PLAYER_R >= W - WALL_W && pvx > 0) {
        px = W - WALL_W - PLAYER_R;
        stuckWall = 1;
        pvx = 0;
        pvy = 0;
        game.audio.play('se_tap', 0.2);
        for (var pi3 = 0; pi3 < 3; pi3++) {
          particles.push({ x: px, y: py - cameraY, vx: -80-Math.random()*40, vy: (Math.random()-0.5)*60, life:0.3, col: C.wallRHi });
        }
      }

      // Off screen sides
      if (px < -PLAYER_R || px > W + PLAYER_R) {
        respawn(); return;
      }
    }

    // Update camera
    var highestPoint = H - 60;
    var screenPy = py - cameraY;
    if (screenPy < H * 0.45) {
      var delta = H * 0.45 - screenPy;
      cameraY -= delta;
      climbing = Math.max(climbing, -cameraY);
    }

    // Fell below screen
    if (py - cameraY > H + 60) {
      respawn(); return;
    }

    // Win
    if (climbing >= GOAL && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      for (var pi4 = 0; pi4 < 20; pi4++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: px, y: py - cameraY, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200, life:0.8, col: C.goal });
      }
      game.end.success(Math.round(climbing * 2) + (MAX_FALLS - falls) * 400 + Math.ceil(timeLeft) * 80);
    }

    // Trail
    trail.push({ x: px, y: py - cameraY, life: 0.4 });
    if (trail.length > 20) trail.shift();
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt * 2.5;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    game.draw.rect(0, 0, WALL_W, H, C.wallL, 0.9);
    game.draw.rect(W - WALL_W, 0, WALL_W, H, C.wallR, 0.9);
    // Wall texture stripes
    for (var wi = 0; wi < H / 60; wi++) {
      var wy = (wi * 60 + cameraY * 0.2) % H;
      game.draw.rect(8, wy, WALL_W - 16, 8, C.wallLHi, 0.4);
      game.draw.rect(W - WALL_W + 8, wy, WALL_W - 16, 8, C.wallRHi, 0.4);
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      game.draw.circle(trail[ti2].x, trail[ti2].y, 8 * trail[ti2].life, C.trail, trail[ti2].life * 0.5);
    }

    // Player
    var screenPy2 = py - cameraY;
    game.draw.circle(px, screenPy2, PLAYER_R + 8, C.player, 0.2);
    game.draw.circle(px, screenPy2, PLAYER_R, C.player, 0.9);
    game.draw.circle(px - 8, screenPy2 - 8, 10, C.playerHi, 0.8);
    // Sticky effect when on wall
    if (stuckWall !== 0) {
      var stickyX = stuckWall < 0 ? px - PLAYER_R - 16 : px + PLAYER_R + 16;
      game.draw.circle(stickyX, screenPy2, 12, C.player, 0.5 + Math.sin(elapsed * 6) * 0.2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W/2 - (MAX_FALLS-1)*32 + fi*64, H*0.94, 16, fi < falls ? C.danger : C.bg, 0.9);
    }

    // Progress
    var prog = Math.min(1, climbing / GOAL);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * prog, 72, C.trail);
    game.draw.text(Math.round(climbing) + 'px / ' + GOAL + 'px', W / 2, 36, { size: 40, color: '#fff', bold: true });
    game.draw.text(Math.ceil(timeLeft) + 's', W * 0.88, 36, { size: 36, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
