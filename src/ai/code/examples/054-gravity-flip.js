// 054-gravity-flip.js
// グラビティフリップ — 重力の向きを反転させてキャラクターを障害物の間を通す
// 操作: タップで重力を上下反転
// 成功: ゴールまで到達  失敗: 障害物に当たる or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    floor:   '#1e3a5f',
    floorHi: '#2563eb',
    player:  '#f97316',
    playerHi:'#fde68a',
    obstacle:'#ef4444',
    obstHi:  '#fca5a5',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    ui:      '#475569'
  };

  var PLAYER_R = 32;
  var GRAVITY = 1800;
  var PLAYER_X = 160;
  var WALL_W = 80;
  var GAP_H = 320;
  var SCROLL_SPEED = 320;

  var playerY = H / 2;
  var playerVy = 0;
  var gravityDir = 1; // 1=down, -1=up
  var flipAnim = 0; // visual flip timer

  var walls = [];
  var wallSpawnX = W + 200;
  var wallTimer = 0;
  var WALL_INTERVAL = 1.1;

  var distanceTraveled = 0;
  var GOAL_DISTANCE = 3000;

  var timeLeft = 20;
  var done = false;
  var deathFlash = 0;

  function spawnWall() {
    var gapTop = 180 + Math.random() * (H - 360 - GAP_H);
    walls.push({
      x: wallSpawnX,
      gapTop: gapTop,
      gapBottom: gapTop + GAP_H
    });
  }

  game.onTap(function(x, y) {
    if (done) return;
    gravityDir = -gravityDir;
    playerVy = playerVy * 0.3; // dampen on flip
    flipAnim = 0.15;
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Physics
    playerVy += GRAVITY * gravityDir * dt;
    playerY += playerVy * dt;

    // Clamp to screen
    if (playerY - PLAYER_R < 0) {
      playerY = PLAYER_R;
      playerVy = Math.abs(playerVy) * 0.3;
    }
    if (playerY + PLAYER_R > H) {
      playerY = H - PLAYER_R;
      playerVy = -Math.abs(playerVy) * 0.3;
    }

    if (flipAnim > 0) flipAnim -= dt;

    // Scroll
    distanceTraveled += SCROLL_SPEED * dt;
    wallTimer -= dt;
    if (wallTimer <= 0) {
      spawnWall();
      wallTimer = WALL_INTERVAL;
    }

    // Move walls
    for (var i = walls.length - 1; i >= 0; i--) {
      walls[i].x -= SCROLL_SPEED * dt;

      // Collision check
      if (walls[i].x + WALL_W > PLAYER_X - PLAYER_R && walls[i].x < PLAYER_X + PLAYER_R) {
        if (playerY - PLAYER_R < walls[i].gapTop || playerY + PLAYER_R > walls[i].gapBottom) {
          // Hit!
          if (!done) {
            done = true;
            deathFlash = 0.5;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }

      if (walls[i].x < -WALL_W - 20) walls.splice(i, 1);
    }

    // Win condition
    if (distanceTraveled >= GOAL_DISTANCE && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(300 + Math.ceil(timeLeft) * 10); }, 400);
    }

    if (deathFlash > 0) deathFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Progress bar (horizontal)
    var prog = Math.min(1, distanceTraveled / GOAL_DISTANCE);
    game.draw.rect(0, H - 24, W, 24, '#0a1428');
    game.draw.rect(0, H - 24, W * prog, 24, C.goal);
    if (prog > 0.95) {
      game.draw.text('GOAL!', W * prog - 120, H - 32, { size: 32, color: C.goalHi, bold: true });
    }

    // Walls
    for (var w = 0; w < walls.length; w++) {
      var wall = walls[w];
      // Top obstacle
      game.draw.rect(wall.x, 0, WALL_W, wall.gapTop, C.obstacle);
      game.draw.rect(wall.x + 8, 0, WALL_W - 16, 20, C.obstHi, 0.4);
      game.draw.rect(wall.x, wall.gapTop - 12, WALL_W, 12, C.obstHi, 0.6);
      // Bottom obstacle
      game.draw.rect(wall.x, wall.gapBottom, WALL_W, H - wall.gapBottom, C.obstacle);
      game.draw.rect(wall.x + 8, wall.gapBottom, WALL_W - 16, 20, C.obstHi, 0.4);
    }

    // Player
    var squish = 1 + (flipAnim > 0 ? 0.4 * (flipAnim / 0.15) : 0);
    var pColor = flipAnim > 0 ? '#fff' : C.player;
    game.draw.circle(PLAYER_X, playerY, PLAYER_R * squish, pColor, 0.9);
    game.draw.circle(PLAYER_X, playerY, PLAYER_R, C.player);
    game.draw.circle(PLAYER_X - 10, playerY - 10, 12, C.playerHi, 0.6);
    // Gravity direction indicator (arrow on player)
    var arrowDir = gravityDir;
    game.draw.line(PLAYER_X, playerY - 8, PLAYER_X, playerY + 8, '#fff', 3);
    game.draw.line(PLAYER_X, playerY + arrowDir * 8, PLAYER_X - 6, playerY + arrowDir * 2, '#fff', 3);
    game.draw.line(PLAYER_X, playerY + arrowDir * 8, PLAYER_X + 6, playerY + arrowDir * 2, '#fff', 3);

    // Death flash
    if (deathFlash > 0) {
      game.draw.rect(0, 0, W, H, C.obstacle, deathFlash * 0.4);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#040810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.floorHi : C.obstacle);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Distance display
    game.draw.text(Math.floor(distanceTraveled) + ' / ' + GOAL_DISTANCE, W / 2, 140, {
      size: 44, color: C.goalHi, bold: true
    });

    // Guide
    game.draw.text('タップで重力反転！', W / 2, H - 200, { size: 56, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnWall();
    wallTimer = WALL_INTERVAL * 0.7;
  });
})(game);
