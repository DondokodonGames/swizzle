// 022-drift-lane.js
// ドリフトレーン — ドリフトしながらカーブを抜けるコントロールの快感
// 操作: スワイプ左右で車線変更しながら障害物を避ける
// 成功: 20秒完走  失敗: 障害物に衝突

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080812',
    road:    '#111118',
    lane:    '#1e1e2e',
    line:    '#2a2a45',
    car:     '#f97316',
    carBody: '#fb923c',
    carGlow: '#fed7aa',
    barrier: '#ef4444',
    barrierB:'#7f1d1d',
    boost:   '#22d3ee',
    ui:      '#475569'
  };

  var LANES = 3;
  var LANE_W = W / LANES;
  var CAR_Y = H * 0.78;
  var CAR_W = 160;
  var CAR_H = 220;
  var SCROLL_SPEED = 700; // px/sec

  var carLane = 1; // 0=left, 1=center, 2=right
  var carX = LANE_W * carLane + LANE_W / 2;
  var targetX = carX;

  var obstacles = [];
  var spawnTimer = 1.2;
  var timeLeft = 20;
  var done = false;
  var scrollY = 0;
  var laneOffset = carX; // for smooth drift

  // Visual drift lean
  var leanAngle = 0;
  var leanTarget = 0;

  var roadMarks = [];
  for (var i = 0; i < 8; i++) {
    roadMarks.push({ y: i * (H / 8), lane: Math.floor(Math.random() * 2) + 0.5 });
  }

  function spawnObstacle() {
    var lane = Math.floor(Math.random() * 3);
    // Sometimes double-block two lanes to force a specific one
    var shape = Math.random();
    obstacles.push({ lane: lane, y: -CAR_H * 2, w: CAR_W, h: CAR_H * 1.3 });
    if (shape > 0.6) {
      var otherLane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
      obstacles.push({ lane: otherLane, y: -CAR_H * 2 - 50, w: CAR_W, h: CAR_H * 1.3 });
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left' && carLane > 0) {
      carLane--;
      leanTarget = -0.3;
    } else if (dir === 'right' && carLane < 2) {
      carLane++;
      leanTarget = 0.3;
    }
    targetX = LANE_W * carLane + LANE_W / 2;
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(400 + Math.floor(SCROLL_SPEED * 0.3)); }, 300);
        return;
      }
    }

    // Smooth car movement
    carX += (targetX - carX) * 8 * dt;
    leanAngle += (leanTarget - leanAngle) * 6 * dt;
    leanTarget *= 0.9;

    // Scroll
    var speed = SCROLL_SPEED + (20 - timeLeft) * 15;
    scrollY = (scrollY + speed * dt) % (H / 8);

    // Spawn obstacles
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = Math.max(0.6, 1.4 - (20 - timeLeft) * 0.03);
    }

    // Move obstacles
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var ob = obstacles[i];
      ob.y += speed * dt;

      // Collision check
      var obX = LANE_W * ob.lane + (LANE_W - ob.w) / 2;
      if (ob.y + ob.h > CAR_Y && ob.y < CAR_Y + CAR_H) {
        if (Math.abs(carX - (obX + ob.w / 2)) < (CAR_W / 2 + ob.w / 2) * 0.7) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }

      if (ob.y > H + 100) obstacles.splice(i, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Road
    game.draw.rect(0, 0, W, H, C.road);

    // Lane dividers (scrolling dashes)
    for (var l = 1; l < LANES; l++) {
      var lx = LANE_W * l;
      for (var d = 0; d < 12; d++) {
        var dy = (d * 200 - scrollY) % H;
        if (dy < 0) dy += H;
        game.draw.rect(lx - 3, dy, 6, 120, C.line, 0.6);
      }
    }

    // Road edge lines
    game.draw.rect(0, 0, 8, H, '#ff6600', 0.5);
    game.draw.rect(W - 8, 0, 8, H, '#ff6600', 0.5);

    // Obstacles (barriers)
    for (var k = 0; k < obstacles.length; k++) {
      var obs = obstacles[k];
      var bx = LANE_W * obs.lane + (LANE_W - obs.w) / 2;
      // shadow
      game.draw.rect(bx + 8, obs.y + 12, obs.w, obs.h, '#000', 0.4);
      // body
      game.draw.rect(bx, obs.y, obs.w, obs.h, C.barrierB);
      game.draw.rect(bx, obs.y, obs.w, obs.h * 0.35, C.barrier);
      // stripes
      game.draw.rect(bx + 20, obs.y + obs.h * 0.15, obs.w - 40, 12, C.barrier, 0.5);
      game.draw.rect(bx + 20, obs.y + obs.h * 0.55, obs.w - 40, 12, C.barrier, 0.5);
    }

    // Car shadow
    game.draw.rect(carX - CAR_W / 2 + 10, CAR_Y + CAR_H - 20, CAR_W, 24, '#000', 0.5);

    // Car body (rotated via layering)
    var leanPx = leanAngle * 60;
    // body
    game.draw.rect(carX - CAR_W / 2 + leanPx * 0.3, CAR_Y, CAR_W, CAR_H, C.car);
    // cabin
    game.draw.rect(carX - CAR_W / 2 + 24 + leanPx * 0.2, CAR_Y + 30, CAR_W - 48, CAR_H * 0.45, C.carBody);
    // windshield
    game.draw.rect(carX - CAR_W / 2 + 32 + leanPx * 0.15, CAR_Y + 44, CAR_W - 64, 70, '#60a5fa', 0.7);
    // glow
    game.draw.circle(carX, CAR_Y + CAR_H - 40, 100, C.carGlow, 0.12);

    // Timer bar (at top)
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#08081a');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#f97316' : C.barrier);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('スワイプで避けろ！', W / 2, H - 180, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    spawnObstacle();
  });
})(game);
