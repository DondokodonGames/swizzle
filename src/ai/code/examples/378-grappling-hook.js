// 378-grappling-hook.js
// グラップリングフック — フックを引っかけてスイングしながらゴールへ
// 操作: タップでフックを飛ばす、もう一度タップで手放す
// 成功: ゴールに到達  失敗: 落下3回 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060c14',
    sky:    '#0f172a',
    platform:'#334155',
    platformHi:'#475569',
    hook:   '#fbbf24',
    hookHi: '#fef3c7',
    rope:   '#a78bfa',
    player: '#22c55e',
    playerHi:'#86efac',
    goal:   '#f59e0b',
    goalHi: '#fde68a',
    danger: '#ef4444',
    star:   '#f1f5f9',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  // Platforms
  var platforms = [
    { x: 0, y: H * 0.9, w: 300, h: 30 },
    { x: 350, y: H * 0.75, w: 200, h: 25 },
    { x: 650, y: H * 0.6, w: 180, h: 25 },
    { x: 100, y: H * 0.55, w: 160, h: 25 },
    { x: 400, y: H * 0.42, w: 200, h: 25 },
    { x: 700, y: H * 0.3, w: 200, h: 25 },
    { x: 200, y: H * 0.2, w: 160, h: 25 },
    { x: 500, y: H * 0.12, w: 200, h: 30 }
  ];

  // Player
  var px = 140, py = H * 0.9 - 32, pvx = 0, pvy = 0;
  var onGround = false;
  var GRAVITY = 900;
  var PLAYER_R = 22;

  // Hook
  var hookX = px, hookY = py;
  var hookVX = 0, hookVY = 0;
  var hookAttached = false;
  var hookFired = false;
  var hookAnchorX = 0, hookAnchorY = 0;
  var ropeLen = 0;
  var swinging = false;
  var HOOK_SPEED = 1200;

  var falls = 0;
  var MAX_FALLS = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];

  // Goal
  var goalX = platforms[7].x + platforms[7].w / 2;
  var goalY = platforms[7].y - 40;

  function respawn() {
    px = 140; py = H * 0.9 - 32;
    pvx = 0; pvy = 0;
    hookFired = false;
    hookAttached = false;
    swinging = false;
    onGround = false;
    game.audio.play('se_failure', 0.4);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!hookFired && !hookAttached) {
      // Fire hook toward tap
      hookX = px; hookY = py;
      var dx = tx - px, dy = ty - py;
      var len = Math.sqrt(dx*dx+dy*dy) || 1;
      hookVX = (dx/len) * HOOK_SPEED;
      hookVY = (dy/len) * HOOK_SPEED;
      hookFired = true;
      hookAttached = false;
      swinging = false;
      game.audio.play('se_tap', 0.3);
    } else if (hookAttached || swinging) {
      // Release
      hookFired = false;
      hookAttached = false;
      swinging = false;
      // Keep current velocity
      game.audio.play('se_tap', 0.2);
    } else if (hookFired) {
      // Cancel in-flight hook
      hookFired = false;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Hook physics
    if (hookFired && !hookAttached) {
      hookX += hookVX * dt;
      hookY += hookVY * dt;
      // Check hit platform
      for (var pi = 0; pi < platforms.length; pi++) {
        var pl = platforms[pi];
        if (hookX >= pl.x && hookX <= pl.x + pl.w && hookY >= pl.y && hookY <= pl.y + pl.h) {
          hookAnchorX = hookX;
          hookAnchorY = pl.y;
          hookAttached = true;
          hookFired = false;
          swinging = true;
          ropeLen = Math.hypot(hookAnchorX - px, hookAnchorY - py);
          game.audio.play('se_success', 0.3);
          break;
        }
      }
      // Off screen
      if (hookX < 0 || hookX > W || hookY < 0 || hookY > H) {
        hookFired = false;
      }
    }

    // Player physics
    if (swinging && hookAttached) {
      // Pendulum constraint
      var dx = px - hookAnchorX, dy = py - hookAnchorY;
      var dist = Math.sqrt(dx*dx+dy*dy);
      // Gravity
      pvy += GRAVITY * dt;
      pvx *= (1 - 0.01 * dt);
      px += pvx * dt;
      py += pvy * dt;
      // Enforce rope length
      var dx2 = px - hookAnchorX, dy2 = py - hookAnchorY;
      var dist2 = Math.sqrt(dx2*dx2+dy2*dy2);
      if (dist2 > ropeLen) {
        var nx = dx2/dist2, ny = dy2/dist2;
        px = hookAnchorX + nx * ropeLen;
        py = hookAnchorY + ny * ropeLen;
        // Remove radial velocity component
        var vr = pvx * nx + pvy * ny;
        pvx -= vr * nx;
        pvy -= vr * ny;
      }
    } else {
      // Free fall
      pvy += GRAVITY * dt;
      px += pvx * dt;
      py += pvy * dt;
      pvx *= (1 - 0.3 * dt);
    }

    // Clamp horizontal
    if (px < PLAYER_R) { px = PLAYER_R; pvx = Math.abs(pvx) * 0.5; }
    if (px > W - PLAYER_R) { px = W - PLAYER_R; pvx = -Math.abs(pvx) * 0.5; }

    // Platform collision
    onGround = false;
    for (var pi2 = 0; pi2 < platforms.length; pi2++) {
      var pl2 = platforms[pi2];
      if (px > pl2.x - PLAYER_R && px < pl2.x + pl2.w + PLAYER_R &&
          py + PLAYER_R > pl2.y && py + PLAYER_R < pl2.y + pl2.h + 30 && pvy > 0) {
        py = pl2.y - PLAYER_R;
        pvy = 0;
        pvx *= 0.8;
        onGround = true;
      }
    }

    // Fell off
    if (py > H + 60) {
      falls++;
      for (var pi3 = 0; pi3 < 8; pi3++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: px, y: H - 20, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life:0.5, col: C.playerHi });
      }
      respawn();
      if (falls >= MAX_FALLS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }

    // Goal check
    if (Math.hypot(px - goalX, py - goalY) < 50 && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      for (var pi4 = 0; pi4 < 16; pi4++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: goalX, y: goalY, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200, life:0.7, col: C.goal });
      }
      game.end.success(5000 - falls * 500 + Math.ceil(timeLeft) * 80);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.7);

    // Platforms
    for (var pi5 = 0; pi5 < platforms.length; pi5++) {
      var pl3 = platforms[pi5];
      game.draw.rect(pl3.x, pl3.y, pl3.w, pl3.h, C.platform, 0.9);
      game.draw.rect(pl3.x, pl3.y, pl3.w, 6, C.platformHi, 0.7);
    }

    // Goal
    game.draw.circle(goalX, goalY, 30, C.goal, 0.9);
    game.draw.circle(goalX, goalY, 20, C.goalHi, 0.8);
    game.draw.text('★', goalX, goalY + 12, { size: 36, color: '#fff' });

    // Rope
    if (hookAttached && swinging) {
      game.draw.line(px, py, hookAnchorX, hookAnchorY, C.rope, 3);
      game.draw.circle(hookAnchorX, hookAnchorY, 10, C.hook, 0.9);
    }
    if (hookFired) {
      game.draw.line(px, py, hookX, hookY, C.rope, 3);
      game.draw.circle(hookX, hookY, 8, C.hookHi, 0.9);
    }

    // Player
    game.draw.circle(px, py, PLAYER_R + 6, C.player, 0.2);
    game.draw.circle(px, py, PLAYER_R, C.player, 0.9);
    game.draw.circle(px, py - 8, 14, C.playerHi, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS-1)*32 + fi*64, H*0.945, 16, fi < falls ? C.danger : C.platform, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
