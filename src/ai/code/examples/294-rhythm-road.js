// 294-rhythm-road.js
// リズムロード — 道路の上を走る車、ビートに合わせてレーン変更でコインを取れ
// 操作: 左スワイプで左レーン、右スワイプで右レーン
// 成功: 30コイン獲得  失敗: 障害物3回 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030508',
    road:   '#1e293b',
    roadHi: '#334155',
    lane:   '#475569',
    car:    '#22c55e',
    carHi:  '#86efac',
    coin:   '#f59e0b',
    coinHi: '#fde68a',
    obs:    '#ef4444',
    obsHi:  '#fca5a5',
    sky:    '#060c18',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var LANES = 3;
  var LANE_W = W / LANES;
  var CAR_W = 80, CAR_H = 120;
  var playerLane = 1; // 0=left, 1=center, 2=right
  var carX = LANE_W * 1.5; // x center
  var carY = H * 0.78;
  var targetX = carX;
  var laneChangeSpeed = 800;

  var scrollSpeed = 300;
  var objects = []; // {lane, y, type:'coin'|'obs'}
  var coins = 0;
  var NEEDED = 30;
  var hits = 0;
  var MAX_HIT = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var spawnTimer = 0;
  var roadOffset = 0;
  var particles = [];

  // Beat: objects spawn on beat
  var BEAT = 0.55;
  var beatTimer = 0;

  function spawnObjects() {
    // On each beat, spawn a pattern
    var pattern = Math.floor(Math.random() * 4);
    if (pattern === 0) {
      // Single coin
      objects.push({ lane: Math.floor(Math.random() * LANES), y: -60, type: 'coin' });
    } else if (pattern === 1) {
      // Two coins
      var l = Math.floor(Math.random() * LANES);
      objects.push({ lane: l, y: -60, type: 'coin' });
      objects.push({ lane: (l + 1) % LANES, y: -60, type: 'coin' });
    } else if (pattern === 2) {
      // Obstacle in one lane
      var obsLane = Math.floor(Math.random() * LANES);
      objects.push({ lane: obsLane, y: -60, type: 'obs' });
      // Coins in other lanes
      for (var l2 = 0; l2 < LANES; l2++) {
        if (l2 !== obsLane && Math.random() < 0.5) objects.push({ lane: l2, y: -60, type: 'coin' });
      }
    } else {
      // Two obstacles
      var obs1 = Math.floor(Math.random() * LANES);
      var obs2 = (obs1 + 1 + Math.floor(Math.random() * (LANES - 1))) % LANES;
      objects.push({ lane: obs1, y: -60, type: 'obs' });
      objects.push({ lane: obs2, y: -60, type: 'obs' });
    }
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (dir === 'left' && playerLane > 0) {
      playerLane--;
      targetX = LANE_W * (playerLane + 0.5);
      game.audio.play('se_tap', 0.2);
    } else if (dir === 'right' && playerLane < LANES - 1) {
      playerLane++;
      targetX = LANE_W * (playerLane + 0.5);
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Car movement
    carX += (targetX - carX) * Math.min(1, laneChangeSpeed * dt / Math.max(1, Math.abs(targetX - carX)));

    // Beat spawn
    beatTimer += dt;
    if (beatTimer >= BEAT) {
      beatTimer -= BEAT;
      if (!done) spawnObjects();
    }

    scrollSpeed = 300 + coins * 3;
    roadOffset = (roadOffset + scrollSpeed * dt) % 80;

    for (var oi = objects.length - 1; oi >= 0; oi--) {
      objects[oi].y += scrollSpeed * dt;

      // Check collision with player
      var objX = LANE_W * (objects[oi].lane + 0.5);
      if (objects[oi].y + 30 > carY - CAR_H / 2 && objects[oi].y - 30 < carY + CAR_H / 2 &&
          Math.abs(objX - carX) < LANE_W * 0.4) {
        if (objects[oi].type === 'coin') {
          coins++;
          for (var pi = 0; pi < 4; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: objX, y: objects[oi].y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.coinHi });
          }
          game.audio.play('se_success', 0.3);
          objects.splice(oi, 1);
          if (coins >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(coins * 60 + Math.ceil(timeLeft) * 100); }, 400);
          }
        } else {
          hits++;
          for (var pi2 = 0; pi2 < 6; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: carX, y: carY, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200, life: 0.5, col: C.obsHi });
          }
          objects.splice(oi, 1);
          game.audio.play('se_failure', 0.5);
          if (hits >= MAX_HIT && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        continue;
      }

      if (objects[oi] && objects[oi].y > H + 60) objects.splice(oi, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.3, C.sky, 0.6);

    // Road
    game.draw.rect(0, H * 0.15, W, H, C.road, 0.9);
    // Lane markings
    for (var li = 1; li < LANES; li++) {
      var lx = li * LANE_W;
      for (var seg = -1; seg < Math.ceil(H / 80) + 1; seg++) {
        var sy = seg * 80 + roadOffset;
        game.draw.rect(lx - 3, H * 0.15 + sy, 6, 50, C.lane, 0.5);
      }
    }
    // Road edges
    game.draw.rect(0, H * 0.15, 10, H, C.roadHi, 0.6);
    game.draw.rect(W - 10, H * 0.15, 10, H, C.roadHi, 0.6);

    // Objects
    for (var oi2 = 0; oi2 < objects.length; oi2++) {
      var obj = objects[oi2];
      var ox = LANE_W * (obj.lane + 0.5);
      var oy = H * 0.15 + obj.y;
      if (obj.type === 'coin') {
        game.draw.circle(ox, oy, 28, C.coin, 0.9);
        game.draw.circle(ox, oy, 28, C.coinHi, 0.25);
        game.draw.text('$', ox, oy + 10, { size: 32, color: '#fff', bold: true });
      } else {
        game.draw.rect(ox - 36, oy - 40, 72, 80, C.obs, 0.9);
        game.draw.rect(ox - 36, oy - 40, 72, 12, C.obsHi, 0.5);
        game.draw.text('!', ox, oy + 8, { size: 48, color: '#fff', bold: true });
      }
    }

    // Player car
    var cx2 = carX;
    // Body
    game.draw.rect(cx2 - CAR_W / 2, carY - CAR_H / 2, CAR_W, CAR_H, C.car, 0.9);
    game.draw.rect(cx2 - CAR_W / 2, carY - CAR_H / 2, CAR_W, 14, C.carHi, 0.6);
    // Windows
    game.draw.rect(cx2 - CAR_W / 2 + 8, carY - CAR_H / 2 + 18, CAR_W - 16, 30, C.carHi, 0.3);
    // Wheels
    game.draw.circle(cx2 - CAR_W / 2 + 8, carY + CAR_H / 2 - 8, 16, '#1a1a1a', 0.9);
    game.draw.circle(cx2 + CAR_W / 2 - 8, carY + CAR_H / 2 - 8, 16, '#1a1a1a', 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y + H * 0.15, 8 * p.life * 2.5, p.col, p.life * 0.7);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HIT; hi++) {
      game.draw.circle(W / 2 - (MAX_HIT - 1) * 28 + hi * 56, H * 0.92, 16, hi < hits ? C.obs : '#04060c');
    }

    game.draw.text(coins + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('スワイプでレーン変更', W / 2, H * 0.89, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.car : C.obs);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    targetX = LANE_W * 1.5;
  });
})(game);
