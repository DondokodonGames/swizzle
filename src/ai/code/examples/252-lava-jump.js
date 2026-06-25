// 252-lava-jump.js
// ラバジャンプ — 上昇する溶岩から逃げるために石柱を渡り歩く
// 操作: タップで次の石柱へジャンプ
// 成功: 高度50m到達  失敗: 溶岩に落ちる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0300',
    lava:   '#ef4444',
    lavaHi: '#f97316',
    lavaLo: '#7f1d1d',
    pillar: '#44403c',
    pilHi:  '#78716c',
    top:    '#57534e',
    player: '#fde68a',
    plrHi:  '#fff',
    sky:    '#1c0700',
    smoke:  '#4a1008',
    ui:     '#78716c'
  };

  var pillars = [];
  var PILLAR_W = 140;
  var playerPillar = 0;
  var playerX = 0, playerY = 0;
  var lavaY = H + 100; // lava surface y (rises)
  var lavaSpeed = 30;
  var scrollOffset = 0;
  var altitudeGained = 0;
  var GOAL = 50 * 60; // 50m in pixels
  var jumping = false;
  var jumpAnim = 0, jumpDur = 0.4;
  var jumpFromX, jumpFromY, jumpToX, jumpToY;
  var jumpTargetPillar = -1;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];

  function pillarTopY(p) {
    return p.baseY - p.height;
  }

  function initPillars() {
    pillars = [];
    var cols = [W * 0.2, W * 0.5, W * 0.8];
    for (var i = 0; i < 15; i++) {
      var col = cols[i % 3];
      var py = H * 0.7 - i * 140;
      var height = 200 + Math.random() * 200;
      pillars.push({ x: col - PILLAR_W / 2, cx: col, baseY: H + 100, height: height, topY: py, r: PILLAR_W / 2 });
      pillars[i].baseY = py + height;
    }
    playerPillar = 0;
    playerX = pillars[0].cx;
    playerY = pillars[0].topY - 30;
  }

  game.onTap(function(tx, ty) {
    if (done || jumping) return;

    var curPillar = pillars[playerPillar];

    // Find tapped pillar
    var target = -1;
    var bestDist = Infinity;
    for (var pi = 0; pi < pillars.length; pi++) {
      if (pi === playerPillar) continue;
      var p = pillars[pi];
      var dx = tx - p.cx, dy = ty - p.topY;
      if (Math.abs(dx) < PILLAR_W / 2 + 20) {
        var dist = Math.abs(p.topY - curPillar.topY);
        if (dist < bestDist) { bestDist = dist; target = pi; }
      }
    }

    if (target < 0) {
      // Tap anywhere — jump to nearest adjacent pillar above
      for (var pi2 = 0; pi2 < pillars.length; pi2++) {
        if (pi2 === playerPillar) continue;
        var p2 = pillars[pi2];
        var dy2 = curPillar.topY - p2.topY;
        if (dy2 > 20 && dy2 < 400) {
          var dx2 = Math.abs(tx - p2.cx);
          if (dx2 < W / 2) { target = pi2; break; }
        }
      }
    }
    if (target < 0) return;

    var tp = pillars[target];
    jumping = true;
    jumpAnim = 0;
    jumpFromX = playerX;
    jumpFromY = playerY;
    jumpToX = tp.cx;
    jumpToY = tp.topY - 30;
    jumpTargetPillar = target;
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Rise lava
    var rise = lavaSpeed * dt;
    lavaY -= rise;
    scrollOffset += rise;
    altitudeGained += rise;
    lavaSpeed = 30 + altitudeGained / GOAL * 50;

    // Scroll pillars down (camera follows lava rise)
    for (var pi = 0; pi < pillars.length; pi++) {
      pillars[pi].topY += rise * 0.6;
      pillars[pi].baseY += rise * 0.6;
    }
    if (!jumping) {
      playerY += rise * 0.6;
    } else {
      jumpFromY += rise * 0.6;
      jumpToY += rise * 0.6;
    }
    lavaY += rise * 0.4; // lava rises relative to camera

    // Check win
    if (altitudeGained >= GOAL && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.floor(altitudeGained / 60) * 100 + Math.ceil(timeLeft) * 80); }, 400);
      return;
    }

    // Generate new pillars as player climbs
    var highest = Infinity;
    for (var pi2 = 0; pi2 < pillars.length; pi2++) {
      if (pillars[pi2].topY < highest) highest = pillars[pi2].topY;
    }
    var cols = [W * 0.2, W * 0.5, W * 0.8];
    while (highest > H * 0.15) {
      highest -= 140;
      var height = 200 + Math.random() * 200;
      var col2 = cols[Math.floor(Math.random() * 3)];
      pillars.push({ x: col2 - PILLAR_W / 2, cx: col2, topY: highest, baseY: highest + height, height: height, r: PILLAR_W / 2 });
    }

    // Jump animation
    if (jumping) {
      jumpAnim += dt / jumpDur;
      if (jumpAnim >= 1) { jumpAnim = 1; jumping = false; playerPillar = jumpTargetPillar; }
      var t = jumpAnim;
      var arc = Math.sin(t * Math.PI) * -100;
      playerX = jumpFromX + (jumpToX - jumpFromX) * t;
      playerY = jumpFromY + (jumpToY - jumpFromY) * t + arc;
    }

    // Check lava collision
    if (!done && playerY > lavaY - 10) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // Lava particles
    if (Math.random() < 0.3) {
      particles.push({ x: Math.random() * W, y: lavaY, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 100, life: 0.6, size: 8 + Math.random() * 12 });
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

    // Sky gradient (smoke near lava)
    game.draw.rect(0, 0, W, H, C.smoke, Math.min(0.3, lavaY > H ? 0 : (1 - lavaY / H) * 0.5));

    // Pillars
    for (var pi3 = 0; pi3 < pillars.length; pi3++) {
      var p3 = pillars[pi3];
      if (p3.topY > H + 100 || p3.baseY < -100) continue;
      // Pillar body
      game.draw.rect(p3.x, p3.topY, PILLAR_W, Math.max(0, p3.baseY - p3.topY), C.pillar, 0.9);
      // Top cap
      game.draw.rect(p3.x - 10, p3.topY, PILLAR_W + 20, 16, C.top, 0.9);
      game.draw.rect(p3.x, p3.topY, PILLAR_W, 4, C.pilHi, 0.6);
    }

    // Player
    game.draw.circle(playerX, playerY, 24, C.plrHi, 0.3);
    game.draw.circle(playerX, playerY, 22, C.player, 0.95);
    game.draw.circle(playerX - 7, playerY - 7, 7, '#fff', 0.5);

    // Lava surface
    var lavaBaseY = Math.max(lavaY, H - 200);
    for (var xi = 0; xi < W; xi += 4) {
      var waveH = Math.sin(xi * 0.03 + elapsed * 4) * 12;
      game.draw.rect(xi, lavaY + waveH, 4, H - lavaY, C.lava, 0.95);
    }
    game.draw.rect(0, lavaY, W, 8, C.lavaHi, 0.9);

    // Lava particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p4 = particles[pp2];
      var alpha = p4.life / 0.6;
      var col3 = p4.life > 0.3 ? C.lavaHi : C.lava;
      game.draw.circle(p4.x, p4.y, p4.size * alpha, col3, alpha * 0.8);
    }

    // Height indicator
    var meters = Math.floor(altitudeGained / 60);
    game.draw.text(meters + 'm / 50m', W / 2, H * 0.9, { size: 50, color: C.player, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.lavaHi : C.lava);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initPillars();
    lavaY = H * 0.9;
  });
})(game);
