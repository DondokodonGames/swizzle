// 267-traffic-control.js
// トラフィックコントロール — 十字路の信号を操作して事故を防ぐ交通整理
// 操作: タップで交差点の信号を切り替え
// 成功: 40台通過させる  失敗: 衝突3回 or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030508',
    road:   '#1e293b',
    roadHi: '#334155',
    grn:    '#22c55e',
    grnHi:  '#86efac',
    red:    '#ef4444',
    redHi:  '#fca5a5',
    car1:   '#3b82f6',
    car2:   '#f59e0b',
    car3:   '#a855f7',
    crash:  '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var INTER_X = W / 2;
  var INTER_Y = H / 2 + 50;
  var ROAD_W = 80;
  var SAFE_ZONE = ROAD_W / 2 + 30;

  // Two signals: H (horizontal) and V (vertical)
  // true = green, false = red
  var hGreen = true;
  var switchCooldown = 0;

  var cars = [];
  var passed = 0;
  var NEEDED = 40;
  var crashes = 0;
  var MAX_CRASH = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 1.4;
  var flashTimer = 0;

  var CAR_COLORS = [C.car1, C.car2, C.car3];

  function spawnCar() {
    var side = Math.floor(Math.random() * 4); // 0=left, 1=right, 2=top, 3=bottom
    var isH = side < 2;
    var speed = 120 + Math.random() * 60;
    var col = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    var car = {
      isH: isH,
      col: col,
      speed: speed,
      waiting: false,
      crashed: false
    };
    switch (side) {
      case 0: car.x = -40; car.y = INTER_Y; car.vx = speed; car.vy = 0; car.dir = 1; break;
      case 1: car.x = W + 40; car.y = INTER_Y; car.vx = -speed; car.vy = 0; car.dir = -1; break;
      case 2: car.x = INTER_X; car.y = -40; car.vx = 0; car.vy = speed; car.dir = 1; break;
      case 3: car.x = INTER_X; car.y = H + 40; car.vx = 0; car.vy = -speed; car.dir = -1; break;
    }
    cars.push(car);
  }

  game.onTap(function(tx, ty) {
    if (done || switchCooldown > 0) return;
    hGreen = !hGreen;
    switchCooldown = 0.8;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (switchCooldown > 0) switchCooldown -= dt;
    if (feedbackTimer > 0) feedbackTimer -= dt;
    if (flashTimer > 0) flashTimer -= dt;

    // Spawn cars
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnCar();
      spawnTimer = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6);
    }

    // Check collisions
    for (var i = 0; i < cars.length; i++) {
      for (var j = i + 1; j < cars.length; j++) {
        var a = cars[i], b = cars[j];
        if (a.crashed || b.crashed) continue;
        if (a.isH === b.isH) continue; // same direction, no collision
        var dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy < 35 * 35) {
          crashes++;
          a.crashed = b.crashed = true;
          flashTimer = 0.5;
          feedback = '衝突！ (' + crashes + '/' + MAX_CRASH + ')';
          feedbackCol = C.crash;
          feedbackTimer = 0.8;
          game.audio.play('se_failure', 0.7);
          if (crashes >= MAX_CRASH && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
    }

    for (var ci = cars.length - 1; ci >= 0; ci--) {
      var car = cars[ci];
      if (car.crashed) {
        car.crashTimer = (car.crashTimer || 0) + dt;
        if (car.crashTimer > 0.8) cars.splice(ci, 1);
        continue;
      }

      // Check if car should stop at red
      var greenForThis = car.isH ? hGreen : !hGreen;
      var distToInter = car.isH ? Math.abs(car.x - INTER_X) : Math.abs(car.y - INTER_Y);

      if (!greenForThis && distToInter < SAFE_ZONE + 20 && distToInter > 20) {
        car.waiting = true;
      } else if (greenForThis || distToInter <= 20) {
        car.waiting = false;
      }

      if (!car.waiting) {
        car.x += car.vx * dt;
        car.y += car.vy * dt;
      }

      // Remove off-screen
      if (car.x < -80 || car.x > W + 80 || car.y < -80 || car.y > H + 80) {
        if (!car.waiting) {
          passed++;
          if (passed >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(passed * 50 + Math.ceil(timeLeft) * 80); }, 400);
          }
        }
        cars.splice(ci, 1);
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Flash
    if (flashTimer > 0) {
      game.draw.rect(0, 0, W, H, C.crash, flashTimer * 0.3);
    }

    // Roads
    game.draw.rect(0, INTER_Y - ROAD_W / 2, W, ROAD_W, C.road, 0.9); // horizontal
    game.draw.rect(INTER_X - ROAD_W / 2, 0, ROAD_W, H, C.road, 0.9); // vertical
    // Dividers
    game.draw.line(0, INTER_Y, W, INTER_Y, C.roadHi, 2);
    game.draw.line(INTER_X, 0, INTER_X, H, C.roadHi, 2);

    // Intersection
    game.draw.rect(INTER_X - ROAD_W / 2, INTER_Y - ROAD_W / 2, ROAD_W, ROAD_W, '#1a2a3a', 0.9);

    // Traffic lights
    var LIGHT_R = 22;
    // H lights
    var hCol = hGreen ? C.grn : C.red;
    game.draw.circle(INTER_X - 80, INTER_Y - 60, LIGHT_R, hCol, 0.9);
    game.draw.circle(INTER_X + 80, INTER_Y + 60, LIGHT_R, hCol, 0.9);
    // V lights
    var vCol = hGreen ? C.red : C.grn;
    game.draw.circle(INTER_X - 60, INTER_Y - 80, LIGHT_R, vCol, 0.9);
    game.draw.circle(INTER_X + 60, INTER_Y + 80, LIGHT_R, vCol, 0.9);

    // Cars
    for (var ci2 = 0; ci2 < cars.length; ci2++) {
      var c2 = cars[ci2];
      var cw = c2.isH ? 50 : 30, ch = c2.isH ? 30 : 50;
      var cx = c2.x, cy = c2.y;
      var alpha = c2.crashed ? 0.4 : 0.9;
      game.draw.rect(cx - cw / 2, cy - ch / 2, cw, ch, c2.col, alpha);
      game.draw.rect(cx - cw / 2, cy - ch / 2, cw, 6, '#fff', 0.3 * alpha);
      if (c2.crashed) {
        game.draw.text('💥', cx, cy + 10, { size: 40 });
      }
    }

    // Signals label
    game.draw.text('←→: ' + (hGreen ? '青' : '赤'), W * 0.2, H * 0.14, { size: 40, color: hGreen ? C.grnHi : C.redHi, bold: true });
    game.draw.text('↑↓: ' + (hGreen ? '赤' : '青'), W * 0.8, H * 0.14, { size: 40, color: hGreen ? C.redHi : C.grnHi, bold: true });
    game.draw.text('タップで切替', W / 2, H * 0.88, { size: 38, color: C.ui });

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.84, { size: 48, color: feedbackCol, bold: true });
    }

    // Crash dots
    for (var ki = 0; ki < MAX_CRASH; ki++) {
      game.draw.circle(W / 2 - (MAX_CRASH - 1) * 28 + ki * 56, H * 0.93, 16, ki < crashes ? C.crash : '#050810');
    }

    game.draw.text(passed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.grn : C.red);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 0.8;
  });
})(game);
