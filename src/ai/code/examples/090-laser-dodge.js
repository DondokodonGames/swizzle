// 090-laser-dodge.js
// レーザー回避 — 壁から走査するレーザーを見切ってスワイプで避けるスリル
// 操作: スワイプで自機を上下に移動
// 成功: 20秒生き残る  失敗: レーザーに当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020812',
    laser:   '#ef4444',
    laserHi: '#fca5a5',
    ship:    '#22d3ee',
    shipHi:  '#a5f3fc',
    shield:  '#6d28d9',
    safe:    '#22c55e',
    ui:      '#334155'
  };

  var LANES = 5;
  var LANE_H = (H * 0.72) / LANES;
  var LANE_Y_START = H * 0.14;
  var SHIP_X = W * 0.18;

  var playerLane = 2; // 0-4
  var targetLane = 2;
  var laneProgress = 1.0; // 0=moving, 1=at target

  var lasers = []; // { lane, x, dir(1=right,-1=left), speed, width, warning }
  var score = 0;
  var timeLeft = 20;
  var done = false;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.9;
  var hitFlash = 0;
  var survived = 0; // seconds survived without dying

  function laneY(lane) {
    return LANE_Y_START + (lane + 0.5) * LANE_H;
  }

  function spawnLaser() {
    var lane = Math.floor(Math.random() * LANES);
    var fromRight = Math.random() > 0.5;
    var speed = 600 + survived * 20;
    lasers.push({
      lane: lane,
      x: fromRight ? W + 40 : -40,
      dir: fromRight ? -1 : 1,
      speed: speed,
      width: 8,
      warning: 0.5 // warning flicker duration before full beam
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up') targetLane = Math.max(0, playerLane - 1);
    if (dir === 'down') targetLane = Math.min(LANES - 1, playerLane + 1);
    if (targetLane !== playerLane) laneProgress = 0;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + Math.ceil(survived) * 15); }, 300);
        return;
      }
    }

    // Move player toward target
    if (laneProgress < 1) {
      laneProgress += dt * 8;
      if (laneProgress >= 1) {
        laneProgress = 1;
        playerLane = targetLane;
      }
    }

    // Spawn lasers
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL - survived * 0.02;
      if (spawnTimer < 0.5) spawnTimer = 0.5;
      spawnLaser();
    }

    // Update lasers
    var toRemove = [];
    for (var i = 0; i < lasers.length; i++) {
      var l = lasers[i];
      if (l.warning > 0) {
        l.warning -= dt;
        if (l.warning < 0) l.warning = 0;
        continue; // still warning, not moving
      }
      l.x += l.dir * l.speed * dt;

      // Collision check with player
      var playerY = laneY(playerLane);
      var interpY = laneY(playerLane) * laneProgress + laneY(targetLane) * (1 - laneProgress);
      // Actually interpolate properly
      var curY = laneY(playerLane) * (1 - laneProgress) + laneY(targetLane) * laneProgress;
      if (curY === undefined) curY = laneY(playerLane);
      var laserY = laneY(l.lane);
      var hitY = Math.abs(curY - laserY) < LANE_H * 0.35;
      var hitX = l.x > SHIP_X - 40 && l.x < SHIP_X + 40;
      if (hitY && hitX) {
        if (!done) {
          done = true;
          hitFlash = 0.5;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
      }

      // Remove off-screen
      if (l.x < -100 || l.x > W + 100) toRemove.push(i);
    }
    for (var j = toRemove.length - 1; j >= 0; j--) lasers.splice(toRemove[j], 1);

    if (hitFlash > 0) hitFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Lane tracks
    for (var li = 0; li < LANES; li++) {
      var ty = LANE_Y_START + li * LANE_H;
      game.draw.rect(0, ty, W, LANE_H, li % 2 === 0 ? '#040a18' : '#050e20');
      game.draw.line(0, ty, W, ty, '#0a1428', 2);
    }
    game.draw.line(0, LANE_Y_START + LANES * LANE_H, W, LANE_Y_START + LANES * LANE_H, '#0a1428', 2);

    // Lasers
    for (var ki = 0; ki < lasers.length; ki++) {
      var las = lasers[ki];
      var laserCY = laneY(las.lane);
      if (las.warning > 0) {
        // Warning blink
        var wBlink = Math.sin(game.time.elapsed * 20) > 0;
        if (wBlink) {
          game.draw.rect(0, laserCY - LANE_H * 0.4, W, LANE_H * 0.8, C.laser, 0.12);
          game.draw.text('⚠', las.dir > 0 ? 60 : W - 60, laserCY, { size: 40, color: C.laser });
        }
      } else {
        // Full beam — draw as long line from edge
        var beamFrom = las.dir > 0 ? 0 : W;
        game.draw.line(beamFrom, laserCY, las.x, laserCY, C.laser, 8);
        game.draw.line(beamFrom, laserCY, las.x, laserCY, C.laserHi, 3);
        // Tip glow
        game.draw.circle(las.x, laserCY, 20, C.laserHi, 0.8);
      }
    }

    // Player ship
    var curPlayerY = laneY(playerLane) * (1 - laneProgress) + laneY(targetLane) * laneProgress;
    game.draw.circle(SHIP_X, curPlayerY, 36, C.ship);
    game.draw.circle(SHIP_X + 12, curPlayerY - 12, 12, '#fff', 0.4);
    game.draw.rect(SHIP_X + 28, curPlayerY - 8, 40, 16, C.shipHi, 0.6);
    game.draw.rect(SHIP_X - 36, curPlayerY - 4, 20, 8, C.shipHi, 0.6);

    // Hit flash
    if (hitFlash > 0) {
      game.draw.rect(0, 0, W, H, C.laser, hitFlash * 0.5);
    }

    // Swipe guide arrows
    game.draw.text('↑↓', W * 0.9, curPlayerY, { size: 52, color: C.ui, bold: true });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#020812');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ship : C.laser);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Survival bar
    game.draw.text('生存 ' + Math.ceil(survived) + 's', W / 2, 136, { size: 48, color: C.safe, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
  });
})(game);
