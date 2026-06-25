// 249-falling-platform.js
// フォールプラットフォーム — 次々と落ちる足場を渡って高く登り続ける
// 操作: タップで着地先の足場を選ぶ（左右）
// 成功: 高度30m到達  失敗: 落下 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#06080f',
    plat:   '#1e3a5f',
    platHi: '#3b82f6',
    safe:   '#22c55e',
    safeHi: '#86efac',
    danger: '#ef4444',
    player: '#fde68a',
    plrHi:  '#fff',
    ui:     '#475569',
    sky:    '#0a1628'
  };

  var PLAT_W = 280;
  var PLAT_H = 20;
  var platforms = [];
  var scrollSpeed = 60; // pixels/sec rising
  var scrollTotal = 0;
  var GOAL_HEIGHT = 30 * 80; // 30 meters at 80px/m
  var player = { x: W / 2, y: H * 0.6, vy: 0, onPlatform: -1, jumping: false, jumpTimer: 0 };
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var particles = [];

  function generatePlatform(y) {
    var x = Math.random() < 0.5 ? W * 0.25 - PLAT_W / 2 : W * 0.75 - PLAT_W / 2;
    var falling = Math.random() < 0.3; // some platforms fall shortly after stepped on
    platforms.push({ x: x, y: y, w: PLAT_W, h: PLAT_H, vy: 0, falling: falling, fallTimer: 0, active: true });
  }

  function initPlatforms() {
    platforms = [];
    // Starting platform
    platforms.push({ x: W / 2 - PLAT_W / 2, y: H * 0.65, w: PLAT_W, h: PLAT_H, vy: 0, falling: false, fallTimer: 0, active: true });
    for (var i = 1; i <= 12; i++) {
      generatePlatform(H * 0.65 - i * 140);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!player.jumping && player.onPlatform >= 0) {
      // Jump to nearest platform above that's on the tapped side
      var targetSide = tx < W / 2 ? 'left' : 'right';
      var best = -1, bestY = Infinity;
      for (var pi = 0; pi < platforms.length; pi++) {
        var pl = platforms[pi];
        if (!pl.active) continue;
        var side = pl.x + pl.w / 2 < W / 2 ? 'left' : 'right';
        if (side !== targetSide) continue;
        var dy = player.y - pl.y;
        if (dy > 30 && dy < bestY) { bestY = dy; best = pi; }
      }
      if (best >= 0) {
        var target = platforms[best];
        player.jumping = true;
        player.onPlatform = -1;
        player.jumpTimer = 0;
        player.startX = player.x;
        player.startY = player.y;
        player.targetX = target.x + target.w / 2;
        player.targetY = target.y - 30;
        player.jumpDur = 0.35;
        player.landPlatform = best;
        game.audio.play('se_tap', 0.4);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Scroll everything up
    var scroll = scrollSpeed * dt;
    scrollTotal += scroll;
    for (var pi2 = 0; pi2 < platforms.length; pi2++) {
      platforms[pi2].y += scroll;
    }
    player.y += scroll;
    if (player.jumping) {
      player.startY += scroll;
      player.targetY += scroll;
    }

    // Check win
    if (scrollTotal >= GOAL_HEIGHT && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.floor(scrollTotal / 80) * 100 + Math.ceil(timeLeft) * 80); }, 400);
      return;
    }

    // Increase scroll speed
    scrollSpeed = 60 + scrollTotal / GOAL_HEIGHT * 80;

    // Player jump animation
    if (player.jumping) {
      player.jumpTimer += dt;
      var t = Math.min(1, player.jumpTimer / player.jumpDur);
      var arc = Math.sin(t * Math.PI) * -120;
      player.x = player.startX + (player.targetX - player.startX) * t;
      player.y = player.startY + (player.targetY - player.startY) * t + arc;
      if (t >= 1) {
        player.jumping = false;
        player.onPlatform = player.landPlatform;
        var lp = platforms[player.landPlatform];
        if (lp && lp.falling) {
          lp.fallTimer = 0.5; // starts falling after 0.5s
        }
        game.audio.play('se_tap', 0.3);
        for (var pi3 = 0; pi3 < 4; pi3++) {
          var ang = Math.random() * Math.PI + Math.PI; // downward
          particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 80, vy: Math.sin(ang) * 80, life: 0.3 });
        }
      }
    }

    // Falling platforms
    for (var pi4 = 0; pi4 < platforms.length; pi4++) {
      var pl2 = platforms[pi4];
      if (!pl2.active) continue;
      if (pl2.falling && pl2.fallTimer > 0) {
        pl2.fallTimer -= dt;
        if (pl2.fallTimer <= 0) {
          pl2.vy = 300; // start falling down
        }
      }
      if (pl2.vy > 0) {
        pl2.y += pl2.vy * dt;
      }
    }

    // Update player Y if on platform
    if (!player.jumping && player.onPlatform >= 0) {
      var onPl = platforms[player.onPlatform];
      if (!onPl || !onPl.active || onPl.y > H + 100) {
        // Fell off
        player.onPlatform = -1;
      } else {
        player.y = onPl.y - 30;
      }
    }

    // Check if player fell off screen
    if (player.y > H + 100 && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
      return;
    }

    // Remove off-screen platforms and generate new ones
    for (var pi5 = platforms.length - 1; pi5 >= 0; pi5--) {
      if (platforms[pi5].y > H + 60) platforms.splice(pi5, 1);
    }
    var highestY = Infinity;
    for (var pi6 = 0; pi6 < platforms.length; pi6++) {
      if (platforms[pi6].y < highestY) highestY = platforms[pi6].y;
    }
    while (highestY > 140) {
      highestY -= 140;
      generatePlatform(highestY);
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Platforms
    for (var pi7 = 0; pi7 < platforms.length; pi7++) {
      var pl3 = platforms[pi7];
      var isFalling = pl3.vy > 0;
      var col = isFalling ? C.danger : C.plat;
      var hiCol = isFalling ? '#fca5a5' : C.platHi;
      game.draw.rect(pl3.x, pl3.y, pl3.w, pl3.h, col, 0.85);
      game.draw.rect(pl3.x, pl3.y, pl3.w, 5, hiCol, 0.6);
      if (pl3.falling && pl3.fallTimer > 0) {
        game.draw.rect(pl3.x, pl3.y, pl3.w * (pl3.fallTimer / 0.5), 3, C.danger, 0.8);
      }
    }

    // Player
    var px = player.x;
    var py = player.y;
    var arc2 = player.jumping ? Math.sin((player.jumpTimer / player.jumpDur) * Math.PI) * 0.3 : 0;
    game.draw.circle(px, py, 26 + arc2 * 10, C.plrHi, 0.3);
    game.draw.circle(px, py, 26, C.player, 0.9);
    game.draw.circle(px - 8, py - 8, 8, '#fff', 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 6 * p.life / 0.3, C.safeHi, p.life * 0.8);
    }

    // Height display
    var meters = Math.floor(scrollTotal / 80);
    game.draw.text(meters + 'm / 30m', W / 2, H * 0.9, { size: 50, color: C.safe, bold: true });

    var heightRatio = Math.min(1, scrollTotal / GOAL_HEIGHT);
    game.draw.rect(W - 20, H * 0.1, 12, H * 0.78, C.ui, 0.3);
    game.draw.rect(W - 20, H * 0.1 + H * 0.78 * (1 - heightRatio), 12, H * 0.78 * heightRatio, C.safe, 0.8);

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.safe : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initPlatforms();
    player.onPlatform = 0;
  });
})(game);
