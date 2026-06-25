// 196-blink-dodge.js
// ブリンク回避 — 時々消えて現れる壁の隙間を、残像を頼りに通り抜ける
// 操作: タップで左右に移動
// 成功: 20秒生き残る  失敗: 壁に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040408',
    player:  '#22c55e',
    playerHi:'#86efac',
    wall:    '#ef4444',
    wallHi:  '#fca5a5',
    ghost:   '#374151',
    ui:      '#334155'
  };

  var PLAYER_X_OPTIONS = [W * 0.2, W * 0.4, W * 0.6, W * 0.8];
  var playerLane = 1;
  var PLAYER_W = 80;
  var PLAYER_H = 100;
  var PLAYER_Y = H * 0.75;
  var PLAYER_R = 40;

  var walls = [];
  var WALL_H = 32;
  var WALL_SPEED = 500;
  var GAP_W = 180;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 1.1;

  var survived = 0;
  var NEEDED = 20;
  var done = false;
  var elapsed = 0;
  var blinkTimer = 0;
  var BLINK_PERIOD = 2.0;
  var BLINK_HIDE = 0.35; // fraction of period hidden
  var visible = true;
  var ghostWalls = []; // last known positions

  function spawnWall() {
    // Random gap position across 4 lanes
    var gapCenter = PLAYER_X_OPTIONS[Math.floor(Math.random() * PLAYER_X_OPTIONS.length)];
    walls.push({ y: -WALL_H, gapCenter: gapCenter, blinked: false });
  }

  game.onTap(function(tx) {
    if (done) return;
    if (tx < W / 2) playerLane = Math.max(0, playerLane - 1);
    else playerLane = Math.min(3, playerLane + 1);
    game.audio.play('se_tap', 0.3);
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') playerLane = Math.max(0, playerLane - 1);
    else if (dir === 'right') playerLane = Math.min(3, playerLane + 1);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      survived += dt;
      elapsed += dt;
      if (survived >= NEEDED) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 60 + 500); }, 400);
        return;
      }
    }

    // Blink cycle
    blinkTimer += dt;
    if (blinkTimer >= BLINK_PERIOD) blinkTimer -= BLINK_PERIOD;
    var blinkPhase = blinkTimer / BLINK_PERIOD;
    visible = blinkPhase < (1 - BLINK_HIDE);
    if (!visible) {
      // Store ghost positions
      ghostWalls = walls.map(function(w) { return { y: w.y, gapCenter: w.gapCenter }; });
    }

    // Spawn walls
    spawnTimer -= dt;
    var speedMult = 1 + survived / 40;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL / speedMult;
      spawnWall();
    }

    // Move walls
    var px = PLAYER_X_OPTIONS[playerLane];
    for (var wi = walls.length - 1; wi >= 0; wi--) {
      walls[wi].y += WALL_SPEED * speedMult * dt;

      // Collision check
      if (!done && visible) {
        var wy = walls[wi].y;
        if (wy > PLAYER_Y - PLAYER_H / 2 && wy < PLAYER_Y + PLAYER_H / 2) {
          var gapLeft = walls[wi].gapCenter - GAP_W / 2;
          var gapRight = walls[wi].gapCenter + GAP_W / 2;
          if (px - PLAYER_R < gapLeft || px + PLAYER_R > gapRight) {
            done = true;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
      }

      if (walls[wi].y > H + 20) walls.splice(wi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Lane guides
    for (var li = 0; li < 4; li++) {
      game.draw.line(PLAYER_X_OPTIONS[li], 0, PLAYER_X_OPTIONS[li], H, '#0a0a18', 1);
    }

    // Ghost walls (last seen when blinking)
    if (!visible) {
      for (var gi = 0; gi < ghostWalls.length; gi++) {
        var gw = ghostWalls[gi];
        game.draw.rect(0, gw.y, gw.gapCenter - GAP_W / 2, WALL_H, C.ghost, 0.4);
        game.draw.rect(gw.gapCenter + GAP_W / 2, gw.y, W - gw.gapCenter - GAP_W / 2, WALL_H, C.ghost, 0.4);
      }
    }

    // Walls
    if (visible) {
      for (var wi2 = 0; wi2 < walls.length; wi2++) {
        var w2 = walls[wi2];
        game.draw.rect(0, w2.y, w2.gapCenter - GAP_W / 2, WALL_H, C.wall, 0.85);
        game.draw.rect(w2.gapCenter + GAP_W / 2, w2.y, W - w2.gapCenter - GAP_W / 2, WALL_H, C.wall, 0.85);
        game.draw.rect(0, w2.y, w2.gapCenter - GAP_W / 2, 8, C.wallHi, 0.5);
        game.draw.rect(w2.gapCenter + GAP_W / 2, w2.y, W - w2.gapCenter - GAP_W / 2, 8, C.wallHi, 0.5);
      }
    } else {
      // Flash warning
      game.draw.rect(0, 0, W, H, '#ef4444', 0.04);
    }

    // Player
    var px2 = PLAYER_X_OPTIONS[playerLane];
    game.draw.circle(px2, PLAYER_Y, PLAYER_R + 10, C.playerHi, 0.25);
    game.draw.circle(px2, PLAYER_Y, PLAYER_R, C.player, 0.9);
    game.draw.circle(px2 - 12, PLAYER_Y - 12, 14, '#fff', 0.5);

    // Lane indicators
    for (var li2 = 0; li2 < 4; li2++) {
      var liX = PLAYER_X_OPTIONS[li2];
      game.draw.circle(liX, PLAYER_Y + 80, li2 === playerLane ? 20 : 10, li2 === playerLane ? C.playerHi : '#1a2030');
    }

    // Blink warning
    var blinkWarning = blinkPhase > 0.7 ? (blinkPhase - 0.7) / 0.3 : 0;
    if (blinkWarning > 0) {
      game.draw.rect(0, 0, W, H, '#f59e0b', blinkWarning * 0.05);
    }

    game.draw.text('← タップ →', W / 2, H * 0.92, { size: 40, color: C.ui });

    var ratio = Math.max(0, (NEEDED - survived) / NEEDED);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * (survived / NEEDED), 72, '#22c55e');
    game.draw.text(survived.toFixed(1) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.25); });
})(game);
