// 158-gap-runner.js
// 隙間抜け — 迫り来る壁の隙間を見切って通り抜ける緊張と爽快感
// 操作: タップで上/下に移動 (トグル式)
// 成功: 15枚の壁を通過  失敗: 壁に当たる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080f',
    wall:    '#1e3a5f',
    wallHi:  '#2563eb',
    player:  '#f59e0b',
    playerHi:'#fef08a',
    gap:     '#0ea5e9',
    danger:  '#ef4444',
    correct: '#22c55e',
    ui:      '#334155'
  };

  var PLAYER_X = W * 0.2;
  var PLAYER_R = 44;
  var WALL_W = 60;
  var WALL_SPEED_BASE = 600;
  var GAP_H = 340;
  var MIN_GAP_H = 180;

  var playerY = H / 2;
  var playerTargetY = H / 2;
  var PLAYER_SNAP_SPEED = 1400;

  var walls = [];
  var WALL_INTERVAL = 1.4;
  var wallTimer = 0;
  var score = 0;
  var needed = 15;
  var timeLeft = 45;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];
  var laneTop = true; // toggle between two positions

  var LANE_TOP = H * 0.28;
  var LANE_MID = H * 0.5;
  var LANE_BOT = H * 0.72;
  var lanes = [LANE_TOP, LANE_MID, LANE_BOT];
  var currentLane = 1;

  function spawnWall() {
    var progress = score / needed;
    var gapH = GAP_H - progress * (GAP_H - MIN_GAP_H);
    var gapY = H * 0.15 + Math.random() * (H * 0.7 - gapH);
    walls.push({
      x: W + WALL_W,
      gapY: gapY,
      gapH: gapH,
      passed: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (ty < H / 2) {
      currentLane = Math.max(0, currentLane - 1);
    } else {
      currentLane = Math.min(lanes.length - 1, currentLane + 1);
    }
    playerTargetY = lanes[currentLane];
    game.audio.play('se_tap', 0.3);
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up') {
      currentLane = Math.max(0, currentLane - 1);
    } else if (dir === 'down') {
      currentLane = Math.min(lanes.length - 1, currentLane + 1);
    }
    playerTargetY = lanes[currentLane];
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    // Snap player to lane
    var dy = playerTargetY - playerY;
    var move = PLAYER_SNAP_SPEED * dt;
    if (Math.abs(dy) < move) playerY = playerTargetY;
    else playerY += (dy > 0 ? move : -move);

    // Wall movement
    var wallSpeed = WALL_SPEED_BASE + score * 20;
    wallTimer -= dt;
    if (wallTimer <= 0) {
      wallTimer = WALL_INTERVAL * (0.85 + Math.random() * 0.3);
      spawnWall();
    }

    for (var wi = walls.length - 1; wi >= 0; wi--) {
      var w = walls[wi];
      w.x -= wallSpeed * dt;

      // Check pass
      if (!w.passed && w.x + WALL_W < PLAYER_X - PLAYER_R) {
        w.passed = true;
        score++;
        feedbackOk = true; feedback = 0.25;
        game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4 });
        }
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 50 + Math.ceil(timeLeft) * 25); }, 400);
        }
      }

      // Collision detection
      if (!done) {
        var wallLeft = w.x;
        var wallRight = w.x + WALL_W;
        if (PLAYER_X + PLAYER_R > wallLeft && PLAYER_X - PLAYER_R < wallRight) {
          // In wall zone - check gap
          var inGap = playerY > w.gapY && playerY < w.gapY + w.gapH;
          if (!inGap) {
            feedbackOk = false; feedback = 0.5;
            done = true;
            game.audio.play('se_failure');
            for (var pi2 = 0; pi2 < 16; pi2++) {
              var ang2 = Math.random() * Math.PI * 2;
              particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(ang2) * 350, vy: Math.sin(ang2) * 350, life: 0.7 });
            }
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }

      if (w.x < -WALL_W - 10) walls.splice(wi, 1);
    }

    for (var pi3 = 0; pi3 < particles.length; pi3++) {
      particles[pi3].x += particles[pi3].vx * dt; particles[pi3].y += particles[pi3].vy * dt;
      particles[pi3].vy += 300 * dt; particles[pi3].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Lane guides
    for (var li = 0; li < lanes.length; li++) {
      game.draw.line(0, lanes[li], W, lanes[li], C.ui, li === currentLane ? 3 : 1);
      game.draw.circle(PLAYER_X, lanes[li], 16, li === currentLane ? C.playerHi : C.ui, li === currentLane ? 0.6 : 0.2);
    }

    // Walls
    for (var wi2 = 0; wi2 < walls.length; wi2++) {
      var w2 = walls[wi2];
      // Top wall
      if (w2.gapY > 0) {
        game.draw.rect(w2.x, 0, WALL_W, w2.gapY, C.wall, 0.9);
        game.draw.rect(w2.x, 0, WALL_W, 12, C.wallHi, 0.5);
        game.draw.rect(w2.x, w2.gapY - 12, WALL_W, 12, C.wallHi, 0.7);
      }
      // Bottom wall
      var botStart = w2.gapY + w2.gapH;
      if (botStart < H) {
        game.draw.rect(w2.x, botStart, WALL_W, H - botStart, C.wall, 0.9);
        game.draw.rect(w2.x, botStart, WALL_W, 12, C.wallHi, 0.7);
        game.draw.rect(w2.x, H - 12, WALL_W, 12, C.wallHi, 0.5);
      }
      // Gap edge highlight
      game.draw.rect(w2.x, w2.gapY, WALL_W, w2.gapH, C.gap, 0.06);
    }

    // Player
    game.draw.circle(PLAYER_X, playerY, PLAYER_R + 8, C.playerHi, 0.2);
    game.draw.circle(PLAYER_X, playerY, PLAYER_R, C.player, 0.95);
    game.draw.circle(PLAYER_X - PLAYER_R * 0.3, playerY - PLAYER_R * 0.3, PLAYER_R * 0.25, '#fff', 0.5);
    // Speed trail
    game.draw.circle(PLAYER_X - 40, playerY, PLAYER_R * 0.6, C.player, 0.3);
    game.draw.circle(PLAYER_X - 80, playerY, PLAYER_R * 0.3, C.player, 0.15);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, feedbackOk ? C.correct : C.danger, part.life);
    }

    if (feedback > 0 && !feedbackOk) {
      game.draw.rect(0, 0, W, H, C.danger, feedback * 0.2);
    }

    game.draw.text('↑タップ上  ↓タップ下', W / 2, H * 0.91, { size: 38, color: C.ui });
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    playerTargetY = lanes[currentLane];
    playerY = lanes[currentLane];
    setTimeout(function() { spawnWall(); }, 800);
  });
})(game);
