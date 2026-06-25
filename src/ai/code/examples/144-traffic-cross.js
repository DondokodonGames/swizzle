// 144-traffic-cross.js
// 交差点横断 — 車が途切れた瞬間を見極めてキャラを渡らせる瞬時判断ゲーム
// 操作: タップでキャラを前進させる（2回タップで渡り切る）
// 成功: 10回渡る  失敗: 3回轢かれる or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0c10',
    road:    '#1a1f2e',
    roadHi:  '#2d3347',
    lane:    '#334155',
    dash:    '#f1f5f9',
    car1:    '#ef4444',
    car2:    '#3b82f6',
    car3:    '#f59e0b',
    player:  '#22c55e',
    playerHi:'#86efac',
    sidewalk:'#1e3a5f',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  // Two lanes: left lane goes left, right lane goes right
  var LANE_Y = [H * 0.42, H * 0.58];
  var LANE_DIR = [-1, 1]; // -1=left, 1=right
  var CAR_W = 160, CAR_H = 64;
  var CAR_SPEED = [320, 280];

  var SIDEWALK_Y1 = H * 0.28;
  var SIDEWALK_Y2 = H * 0.74;
  var MIDPOINT_Y = H * 0.50;

  // Player positions: 0=bottom, 1=middle, 2=top (safe zones or crossing)
  var PLAYER_X = W / 2;
  var PLAYER_POSITIONS = [SIDEWALK_Y2, MIDPOINT_Y, SIDEWALK_Y1];
  var playerPos = 0;
  var playerY = PLAYER_POSITIONS[0];
  var targetY = PLAYER_POSITIONS[0];
  var moving = false;
  var moveSpeed = 600;

  var cars = [];
  var SPAWN_INTERVAL = [1.2, 1.4];
  var spawnTimers = [0, 0];
  var CAR_COLORS = [C.car1, C.car2, C.car3];

  var score = 0;
  var needed = 10;
  var hits = 0;
  var maxHits = 3;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var hitFlash = 0;

  function spawnCar(laneIdx) {
    var dir = LANE_DIR[laneIdx];
    var x = dir > 0 ? -CAR_W : W + CAR_W;
    var col = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    cars.push({ x: x, y: LANE_Y[laneIdx], dir: dir, lane: laneIdx, color: col, speed: CAR_SPEED[laneIdx] + (Math.random()-0.5)*60 });
  }

  game.onTap(function() {
    if (done || moving) return;
    if (playerPos < 2) {
      playerPos++;
      targetY = PLAYER_POSITIONS[playerPos];
      moving = true;
      game.audio.play('se_tap', 0.5);
    }
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

    // Move player
    if (moving) {
      var diff = targetY - playerY;
      var step = moveSpeed * dt * (diff < 0 ? -1 : 1);
      if (Math.abs(step) >= Math.abs(diff)) {
        playerY = targetY;
        moving = false;
        // Reached top — success!
        if (playerPos === 2) {
          score++;
          feedbackOk = true;
          feedback = 0.5;
          game.audio.play('se_success');
          if (score >= needed && !done) {
            done = true;
            setTimeout(function() { game.end.success(score*50 + Math.ceil(timeLeft)*15); }, 500);
            return;
          }
          // Reset to bottom
          setTimeout(function() {
            playerPos = 0;
            targetY = PLAYER_POSITIONS[0];
            playerY = PLAYER_POSITIONS[0];
          }, 400);
        }
      } else {
        playerY += step;
      }
    }

    // Spawn cars
    for (var li = 0; li < 2; li++) {
      spawnTimers[li] -= dt;
      if (spawnTimers[li] <= 0) {
        spawnTimers[li] = SPAWN_INTERVAL[li] * (0.7 + Math.random() * 0.6);
        spawnCar(li);
      }
    }

    // Move cars
    for (var ci = 0; ci < cars.length; ci++) {
      cars[ci].x += cars[ci].dir * cars[ci].speed * dt;
    }
    cars = cars.filter(function(c) { return c.x > -CAR_W*2 && c.x < W + CAR_W*2; });

    // Collision detection
    for (var ci2 = 0; ci2 < cars.length; ci2++) {
      var car = cars[ci2];
      var dy = Math.abs(playerY - car.y);
      var dx = Math.abs(PLAYER_X - car.x);
      if (dy < 40 && dx < CAR_W/2 + 28) {
        // Hit!
        hits++;
        hitFlash = 0.5;
        feedbackOk = false;
        feedback = 0.5;
        game.audio.play('se_failure');
        playerPos = 0;
        playerY = PLAYER_POSITIONS[0];
        targetY = PLAYER_POSITIONS[0];
        moving = false;
        // Remove all cars for moment
        cars = [];
        if (hits >= maxHits && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        break;
      }
    }

    if (feedback > 0) feedback -= dt;
    if (hitFlash > 0) hitFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sidewalks
    game.draw.rect(0, SIDEWALK_Y1 - 60, W, 60, C.sidewalk);
    game.draw.rect(0, SIDEWALK_Y2, W, 60, C.sidewalk);

    // Road
    game.draw.rect(0, SIDEWALK_Y1, W, SIDEWALK_Y2 - SIDEWALK_Y1, C.road);
    // Center dashed line
    for (var dx2 = 0; dx2 < W; dx2 += 80) {
      game.draw.rect(dx2, (LANE_Y[0]+LANE_Y[1])/2 - 4, 48, 8, C.dash, 0.4);
    }
    // Lane edges
    game.draw.rect(0, SIDEWALK_Y1, W, 6, C.lane);
    game.draw.rect(0, SIDEWALK_Y2 - 6, W, 6, C.lane);

    // Cars
    for (var ci3 = 0; ci3 < cars.length; ci3++) {
      var car2 = cars[ci3];
      game.draw.rect(car2.x - CAR_W/2, car2.y - CAR_H/2, CAR_W, CAR_H, car2.color, 0.9);
      game.draw.rect(car2.x - CAR_W/2, car2.y - CAR_H/2, CAR_W, 10, '#fff', 0.25);
      // Wheels
      game.draw.circle(car2.x - CAR_W*0.32, car2.y + CAR_H/2 - 4, 14, '#000', 0.8);
      game.draw.circle(car2.x + CAR_W*0.32, car2.y + CAR_H/2 - 4, 14, '#000', 0.8);
    }

    // Player
    game.draw.circle(PLAYER_X, playerY, 36, C.player, 0.9);
    game.draw.circle(PLAYER_X, playerY, 24, C.playerHi, 0.8);
    game.draw.text('🚶', PLAYER_X, playerY, { size: 36, color: '#fff' });

    // Hit flash
    if (hitFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, hitFlash * 0.3);
    }

    // Tap hint
    if (!moving && playerPos < 2) {
      var pulse = 0.5 + 0.4 * Math.abs(Math.sin(timeLeft * 2));
      game.draw.text('▲ タップで前進', W/2, playerY - 70, { size: 40, color: C.playerHi, bold: true });
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '渡り切った！' : 'はねられた！', W/2, H * 0.2, {
        size: 72, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Score
    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var hi = 0; hi < maxHits; hi++) {
      game.draw.circle(W/2+(hi-1)*52, 218, 18, hi < hits ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft/40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.player : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnCar(0);
    spawnCar(1);
  });
})(game);
