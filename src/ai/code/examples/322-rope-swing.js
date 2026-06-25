// 322-rope-swing.js
// ロープスイング — 振り子のロープでプラットフォームからプラットフォームへ
// 操作: タップでロープを離す、次のアンカーに掴む
// 成功: ゴールまで到達  失敗: 落下3回 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a1628',
    sky:    '#0d2144',
    platform:'#475569',
    platHi: '#64748b',
    anchor: '#fbbf24',
    anchorHi:'#fef3c7',
    rope:   '#92400e',
    ropeHi: '#b45309',
    player: '#f97316',
    playerHi:'#fed7aa',
    goal:   '#22c55e',
    goalHi: '#86efac',
    danger: '#ef4444',
    ui:     '#94a3b8',
    text:   '#f1f5f9'
  };

  // Platforms
  var platforms = [
    { x: 60, y: H * 0.85, w: 200, h: 24 },
    { x: 400, y: H * 0.75, w: 180, h: 24 },
    { x: 750, y: H * 0.68, w: 160, h: 24 },
    { x: 300, y: H * 0.58, w: 140, h: 24 },
    { x: 650, y: H * 0.5, w: 160, h: 24 },
    { x: 150, y: H * 0.42, w: 180, h: 24 },
    { x: 500, y: H * 0.34, w: 200, h: 24 }
  ];

  // Anchor points (above platforms)
  var anchors = [
    { x: 200, y: H * 0.6 },
    { x: 600, y: H * 0.5 },
    { x: 350, y: H * 0.42 },
    { x: 750, y: H * 0.35 },
    { x: 250, y: H * 0.28 },
    { x: 580, y: H * 0.22 }
  ];

  var GOAL_Y = H * 0.28;

  // Player state
  var playerX = 160;
  var playerY = H * 0.83;
  var playerVX = 0;
  var playerVY = 0;
  var onGround = true;
  var swinging = false;
  var anchorIdx = -1;
  var ropeLen = 0;
  var ropeAngle = 0;
  var ropeAV = 0; // angular velocity
  var falls = 0;
  var MAX_FALLS = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var reachedGoal = false;

  function resetPlayer() {
    playerX = 160;
    playerY = H * 0.83;
    playerVX = 0;
    playerVY = 0;
    onGround = true;
    swinging = false;
    anchorIdx = -1;
  }

  function findNearestAnchor() {
    var best = -1, bestDist = 999999;
    for (var i = 0; i < anchors.length; i++) {
      var d = Math.hypot(anchors[i].x - playerX, anchors[i].y - playerY);
      if (d < bestDist && anchors[i].y < playerY) {
        bestDist = d;
        best = i;
      }
    }
    return (best >= 0 && bestDist < 350) ? best : -1;
  }

  game.onTap(function() {
    if (done) return;

    if (swinging) {
      // Release rope — convert to flying
      var ax = anchors[anchorIdx].x;
      var ay = anchors[anchorIdx].y;
      playerX = ax + Math.sin(ropeAngle) * ropeLen;
      playerY = ay + Math.cos(ropeAngle) * ropeLen;
      // Velocity from swing
      playerVX = ropeAV * ropeLen * Math.cos(ropeAngle);
      playerVY = -ropeAV * ropeLen * Math.sin(ropeAngle);
      swinging = false;
      onGround = false;
      game.audio.play('se_tap', 0.3);
    } else if (onGround) {
      // Jump and grab anchor
      var ai = findNearestAnchor();
      if (ai >= 0) {
        anchorIdx = ai;
        var ax2 = anchors[ai].x;
        var ay2 = anchors[ai].y;
        ropeLen = Math.hypot(ax2 - playerX, ay2 - playerY);
        ropeAngle = Math.atan2(playerX - ax2, playerY - ay2);
        ropeAV = -0.8; // start swinging
        swinging = true;
        onGround = false;
        game.audio.play('se_tap', 0.3);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (swinging) {
      var ax = anchors[anchorIdx].x;
      var ay = anchors[anchorIdx].y;
      // Pendulum physics: angular accel = -(g/L)*sin(angle)
      var gravity = 9.8 * 120;
      ropeAV += (-gravity / ropeLen) * Math.sin(ropeAngle) * dt;
      ropeAV *= 0.998; // slight damping
      ropeAngle += ropeAV * dt;
      playerX = ax + Math.sin(ropeAngle) * ropeLen;
      playerY = ay + Math.cos(ropeAngle) * ropeLen;

      // Check if player hits a platform
      for (var pi = 0; pi < platforms.length; pi++) {
        var pl = platforms[pi];
        if (playerX >= pl.x && playerX <= pl.x + pl.w &&
            playerY >= pl.y - 20 && playerY <= pl.y + pl.h) {
          playerY = pl.y;
          swinging = false;
          onGround = true;
          playerVX = 0; playerVY = 0;
        }
      }
    } else if (!onGround) {
      playerVY += 500 * dt;
      playerX += playerVX * dt;
      playerY += playerVY * dt;

      // Land on platform
      for (var pi2 = 0; pi2 < platforms.length; pi2++) {
        var pl2 = platforms[pi2];
        if (playerVY > 0 && playerX >= pl2.x && playerX <= pl2.x + pl2.w &&
            playerY >= pl2.y - 30 && playerY <= pl2.y + pl2.h) {
          playerY = pl2.y;
          onGround = true;
          playerVX = 0; playerVY = 0;
        }
      }

      // Fall off
      if (playerY > H * 0.97 || playerX < -50 || playerX > W + 50) {
        falls++;
        game.audio.play('se_failure', 0.5);
        for (var ppi = 0; ppi < 8; ppi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: playerX, y: playerY > H ? H * 0.9 : playerY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 100, life: 0.5, col: C.danger });
        }
        if (falls >= MAX_FALLS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
        resetPlayer();
      }
    }

    // Goal check
    if (playerY < GOAL_Y + 60 && !reachedGoal && !done) {
      reachedGoal = true;
      done = true;
      game.audio.play('se_success', 0.8);
      for (var gpi = 0; gpi < 16; gpi++) {
        var ga = Math.random() * Math.PI * 2;
        particles.push({ x: playerX, y: playerY, vx: Math.cos(ga) * 300, vy: Math.sin(ga) * 300, life: 0.8, col: C.goalHi });
      }
      setTimeout(function() { game.end.success(3000 - falls * 500 + Math.ceil(timeLeft) * 80); }, 600);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.3, C.sky, 0.4);

    // Goal star
    game.draw.circle(W / 2, GOAL_Y, 50 + 10 * Math.sin(elapsed * 3), C.goal, 0.4);
    game.draw.circle(W / 2, GOAL_Y, 40, C.goalHi, 0.8);
    game.draw.text('★', W / 2, GOAL_Y + 16, { size: 44, color: '#fff', bold: true });
    game.draw.text('GOAL', W / 2, GOAL_Y + 60, { size: 32, color: C.goalHi });

    // Platforms
    for (var pi3 = 0; pi3 < platforms.length; pi3++) {
      var pl3 = platforms[pi3];
      game.draw.rect(pl3.x, pl3.y, pl3.w, pl3.h, C.platHi, 0.9);
      game.draw.rect(pl3.x, pl3.y, pl3.w, 8, C.platform, 0.9);
    }

    // Anchors
    for (var ai2 = 0; ai2 < anchors.length; ai2++) {
      game.draw.circle(anchors[ai2].x, anchors[ai2].y, 16, C.anchorHi, 0.9);
      game.draw.circle(anchors[ai2].x, anchors[ai2].y, 8, C.anchor, 0.9);
    }

    // Rope
    if (swinging) {
      var rax = anchors[anchorIdx].x;
      var ray = anchors[anchorIdx].y;
      game.draw.line(rax, ray, playerX, playerY, C.rope, 6);
    }

    // Player
    game.draw.circle(playerX, playerY, 26, C.playerHi, 0.3);
    game.draw.circle(playerX, playerY, 22, C.player, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Fall counter
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 28 + fi * 56, H * 0.9, 16, fi < falls ? C.danger : '#0a1628');
    }

    var hint = onGround ? 'タップでロープ！' : (swinging ? 'タップで離す！' : '');
    if (hint) game.draw.text(hint, W / 2, H * 0.88, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.anchor : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
