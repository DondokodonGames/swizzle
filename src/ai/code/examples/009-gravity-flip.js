// 009-gravity-flip.js
// 重力反転 — タップで上下を逆転させて壁をすり抜ける驚き
// 操作: タップで重力を反転
// 成功: 3つのゲートをくぐり抜ける  失敗: 壁に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#030c06',
    wall:     '#166534',
    wallEdge: '#15803d',
    player:   '#4ade80',
    playerGlow:'#bbf7d0',
    gate:     '#86efac',
    danger:   '#ef4444',
    trail:    '#22c55e',
    ui:       '#4b5563'
  };

  var gravity = 1;           // 1 = fall down, -1 = fall up
  var vy = 0;
  var playerX = 200;
  var playerY = H / 2;
  var playerR = 36;
  var ACCEL = 1800;

  var gatesPassed = 0;
  var needed = 3;
  var done = false;
  var dead = false;

  // Scrolling obstacles (pairs of wall segments with gaps)
  var SCROLL_SPD = 380;
  var obstacles = [];
  var trailPoints = [];
  var obSpawnX = W + 200;

  // Wall thickness at top/bottom
  var WALL_H = 140;

  function spawnObstacle() {
    var gapCenter = game.random(WALL_H + 160, H - WALL_H - 160);
    var gapH = game.random(260, 360);
    obstacles.push({
      x:    obSpawnX,
      topH:  gapCenter - gapH / 2,
      botY:  gapCenter + gapH / 2,
      passed: false,
      color: GATE_COLORS[gatesPassed % GATE_COLORS.length]
    });
  }

  var GATE_COLORS = ['#86efac', '#67e8f9', '#a78bfa', '#fcd34d'];

  var obTimer = 0;

  game.onTap(function() {
    if (done || dead) return;
    gravity = -gravity;
    vy = 0;
    game.audio.play('se_tap', 0.6);
  });

  game.onUpdate(function(dt) {
    if (done || dead) {
      drawScene();
      return;
    }

    // Physics
    vy += gravity * ACCEL * dt;
    vy = Math.max(-900, Math.min(900, vy));
    playerY += vy * dt;

    // trail
    trailPoints.unshift({ x: playerX, y: playerY });
    if (trailPoints.length > 10) trailPoints.pop();

    // top/bottom walls
    if (playerY - playerR < WALL_H || playerY + playerR > H - WALL_H) {
      dead = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
      return;
    }

    // scroll obstacles
    obTimer -= dt;
    if (obTimer <= 0) {
      spawnObstacle();
      obTimer = 1.8 - gatesPassed * 0.15;
    }

    for (var i = obstacles.length - 1; i >= 0; i--) {
      obstacles[i].x -= SCROLL_SPD * dt;

      // collision
      var ob = obstacles[i];
      if (playerX + playerR > ob.x && playerX - playerR < ob.x + 60) {
        if (playerY - playerR < ob.topH || playerY + playerR > ob.botY) {
          dead = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
        // passed gate
        if (!ob.passed && playerX > ob.x + 30) {
          ob.passed = true;
          gatesPassed++;
          game.audio.play('se_tap', 1.0);
          if (gatesPassed >= needed) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() {
              game.end.success(gatesPassed * 50);
            }, 400);
          }
        }
      }

      if (ob.x + 100 < 0) obstacles.splice(i, 1);
    }

    drawScene();
  });

  function drawScene() {
    game.draw.rect(0, 0, W, H, C.bg);

    // background grid lines (sci-fi feel)
    for (var gy = WALL_H; gy < H - WALL_H; gy += 80) {
      game.draw.rect(0, gy, W, 1, '#0d2a0d', 0.5);
    }

    // Top and bottom walls
    game.draw.rect(0, 0, W, WALL_H, C.wall);
    game.draw.rect(0, 0, W, 8, C.wallEdge);
    game.draw.rect(0, WALL_H - 8, W, 8, C.wallEdge);

    game.draw.rect(0, H - WALL_H, W, WALL_H, C.wall);
    game.draw.rect(0, H - WALL_H, W, 8, C.wallEdge);
    game.draw.rect(0, H - 8, W, 8, C.wallEdge);

    // obstacles
    for (var i = 0; i < obstacles.length; i++) {
      var ob = obstacles[i];
      var col = ob.color || C.wallEdge;
      // top block
      game.draw.rect(ob.x, WALL_H, 60, ob.topH - WALL_H, '#064e1e');
      game.draw.rect(ob.x, WALL_H, 60, ob.topH - WALL_H - 12, '#0f5c20');
      game.draw.rect(ob.x, ob.topH - 16, 60, 16, col);
      // bottom block
      game.draw.rect(ob.x, ob.botY, 60, H - WALL_H - ob.botY, '#064e1e');
      game.draw.rect(ob.x, ob.botY + 12, 60, H - WALL_H - ob.botY - 12, '#0f5c20');
      game.draw.rect(ob.x, ob.botY, 60, 16, col);
      // gate glow
      if (!ob.passed) {
        game.draw.rect(ob.x + 8, ob.topH, 44, ob.botY - ob.topH, col, 0.1);
      }
    }

    // trail
    for (var t = 0; t < trailPoints.length; t++) {
      var tp = trailPoints[t];
      var ta = 1 - t / trailPoints.length;
      game.draw.circle(tp.x, tp.y, playerR * 0.5 * ta, C.trail, ta * 0.5);
    }

    // Player
    if (!dead) {
      game.draw.circle(playerX, playerY, playerR + 10, C.playerGlow, 0.3);
      game.draw.circle(playerX, playerY, playerR, C.player);
      game.draw.circle(playerX, playerY, playerR * 0.45, C.playerGlow, 0.8);
      // gravity indicator
      var arrowDir = gravity > 0 ? 1 : -1;
      var ay = playerY + arrowDir * (playerR + 24);
      game.draw.text(gravity > 0 ? '▼' : '▲', playerX, ay, { size: 36, color: C.playerGlow, bold: true });
    }

    // UI
    game.draw.text(gatesPassed + ' / ' + needed, W / 2, 50, { size: 48, color: '#4ade80', bold: true });

    // gate indicators at top
    for (var g = 0; g < needed; g++) {
      var gx = W / 2 + (g - (needed - 1) / 2) * 80;
      var gc = GATE_COLORS[g];
      game.draw.circle(gx, 92, 22, g < gatesPassed ? gc : '#1a2e1a');
    }

    // guide
    if (!dead && !done) {
      game.draw.text('タップで反転！', W / 2, H - 180, { size: 52, color: C.ui });
    }
  }

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnObstacle();
  });
})(game);
