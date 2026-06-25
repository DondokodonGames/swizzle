// 328-traffic-flow.js
// トラフィックフロー — 交差点の信号をタップで切り替えて渋滞を防ぐ
// 操作: タップで交差点の信号を切り替える
// 成功: 40台通過  失敗: 5台衝突 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a0a',
    road:   '#1c1c1e',
    roadHi: '#2c2c2e',
    line:   '#404040',
    carR:   '#ef4444',
    carB:   '#3b82f6',
    carG:   '#22c55e',
    carY:   '#f59e0b',
    greenL: '#22c55e',
    redL:   '#ef4444',
    crash:  '#fbbf24',
    ui:     '#6b7280',
    text:   '#f9fafb'
  };

  var CAR_COLORS = [C.carR, C.carB, C.carG, C.carY];

  // 2x2 intersection layout
  // Roads: horizontal (y=H*0.38, y=H*0.62) and vertical (x=W*0.35, x=W*0.65)
  var H_ROAD1_Y = H * 0.38;
  var H_ROAD2_Y = H * 0.62;
  var V_ROAD1_X = W * 0.35;
  var V_ROAD2_X = W * 0.65;
  var ROAD_W = 80;

  // 4 intersections
  var intersections = [
    { x: V_ROAD1_X, y: H_ROAD1_Y, greenH: true }, // green=horizontal means horizontal cars can pass
    { x: V_ROAD2_X, y: H_ROAD1_Y, greenH: false },
    { x: V_ROAD1_X, y: H_ROAD2_Y, greenH: false },
    { x: V_ROAD2_X, y: H_ROAD2_Y, greenH: true }
  ];

  var cars = [];
  var spawnTimer = 0;
  var passed = 0;
  var NEEDED = 40;
  var crashes = 0;
  var MAX_CRASHES = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var carId = 0;

  function spawnCar() {
    // Random direction: 0=right, 1=left, 2=down, 3=up
    var dir = Math.floor(Math.random() * 4);
    var col = CAR_COLORS[Math.floor(Math.random() * 4)];
    var car;
    if (dir === 0) { // left to right on H_ROAD1
      car = { x: -50, y: H_ROAD1_Y + (Math.random() < 0.5 ? -18 : 18), vx: 160, vy: 0, dir: 0, w: 60, h: 30, col: col, id: carId++ };
    } else if (dir === 1) { // right to left on H_ROAD2
      car = { x: W + 50, y: H_ROAD2_Y + (Math.random() < 0.5 ? -18 : 18), vx: -160, vy: 0, dir: 1, w: 60, h: 30, col: col, id: carId++ };
    } else if (dir === 2) { // top to bottom on V_ROAD1
      car = { x: V_ROAD1_X + (Math.random() < 0.5 ? -18 : 18), y: -50, vx: 0, vy: 160, dir: 2, w: 30, h: 60, col: col, id: carId++ };
    } else { // bottom to top on V_ROAD2
      car = { x: V_ROAD2_X + (Math.random() < 0.5 ? -18 : 18), y: H + 50, vx: 0, vy: -160, dir: 3, w: 30, h: 60, col: col, id: carId++ };
    }
    cars.push(car);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find nearest intersection
    var best = -1, bestDist = 999;
    for (var ii = 0; ii < intersections.length; ii++) {
      var d = Math.hypot(tx - intersections[ii].x, ty - intersections[ii].y);
      if (d < bestDist) { bestDist = d; best = ii; }
    }
    if (best >= 0 && bestDist < 100) {
      intersections[best].greenH = !intersections[best].greenH;
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnCar();
      spawnTimer = 0.7 - Math.min(0.4, passed * 0.008);
    }

    // Move cars with traffic light logic
    for (var ci = 0; ci < cars.length; ci++) {
      var car = cars[ci];
      var canMove = true;

      // Check each intersection
      for (var ii = 0; ii < intersections.length; ii++) {
        var inter = intersections[ii];
        var isHoriz = car.dir === 0 || car.dir === 1;
        var isVert = car.dir === 2 || car.dir === 3;
        var greenForMe = (isHoriz && inter.greenH) || (isVert && !inter.greenH);

        if (!greenForMe) {
          // Check if car is approaching this intersection
          var approachDist = 40;
          var atIntersection = false;
          if (isHoriz && Math.abs(car.y - inter.y) < ROAD_W / 2) {
            if (car.dir === 0 && car.x < inter.x - approachDist && car.x > inter.x - 200) atIntersection = true;
            if (car.dir === 1 && car.x > inter.x + approachDist && car.x < inter.x + 200) atIntersection = true;
          }
          if (isVert && Math.abs(car.x - inter.x) < ROAD_W / 2) {
            if (car.dir === 2 && car.y < inter.y - approachDist && car.y > inter.y - 200) atIntersection = true;
            if (car.dir === 3 && car.y > inter.y + approachDist && car.y < inter.y + 200) atIntersection = true;
          }
          if (atIntersection) { canMove = false; break; }
        }
      }

      if (canMove) {
        car.x += car.vx * dt;
        car.y += car.vy * dt;
      }
    }

    // Check collisions between cars in intersections
    for (var ci2 = 0; ci2 < cars.length; ci2++) {
      for (var cj = ci2 + 1; cj < cars.length; cj++) {
        var a = cars[ci2], b = cars[cj];
        var dx = Math.abs(a.x - b.x);
        var dy = Math.abs(a.y - b.y);
        if (dx < (a.w + b.w) / 2 && dy < (a.h + b.h) / 2) {
          crashes++;
          game.audio.play('se_failure', 0.6);
          var cx = (a.x + b.x) / 2, cy2 = (a.y + b.y) / 2;
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: cx, y: cy2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.7, col: C.crash });
          }
          // Remove both cars
          cars.splice(cj, 1);
          cars.splice(ci2, 1);
          if (crashes >= MAX_CRASHES && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
          break;
        }
      }
    }

    // Remove cars that left screen
    for (var ci3 = cars.length - 1; ci3 >= 0; ci3--) {
      var c = cars[ci3];
      if (c.x < -100 || c.x > W + 100 || c.y < -100 || c.y > H + 100) {
        passed++;
        cars.splice(ci3, 1);
        if (passed >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(passed * 80 + Math.ceil(timeLeft) * 80); }, 400);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Roads
    game.draw.rect(0, H_ROAD1_Y - ROAD_W / 2, W, ROAD_W, C.road, 0.9);
    game.draw.rect(0, H_ROAD2_Y - ROAD_W / 2, W, ROAD_W, C.road, 0.9);
    game.draw.rect(V_ROAD1_X - ROAD_W / 2, 0, ROAD_W, H, C.road, 0.9);
    game.draw.rect(V_ROAD2_X - ROAD_W / 2, 0, ROAD_W, H, C.road, 0.9);

    // Lane lines
    game.draw.line(0, H_ROAD1_Y, W, H_ROAD1_Y, C.line, 3);
    game.draw.line(0, H_ROAD2_Y, W, H_ROAD2_Y, C.line, 3);
    game.draw.line(V_ROAD1_X, 0, V_ROAD1_X, H, C.line, 3);
    game.draw.line(V_ROAD2_X, 0, V_ROAD2_X, H, C.line, 3);

    // Traffic lights
    for (var ii2 = 0; ii2 < intersections.length; ii2++) {
      var inter2 = intersections[ii2];
      var gH = inter2.greenH;
      // H light
      game.draw.circle(inter2.x - 50, inter2.y, 20, gH ? C.greenL : C.redL, 0.9);
      // V light
      game.draw.circle(inter2.x, inter2.y - 50, 20, gH ? C.redL : C.greenL, 0.9);
    }

    // Cars
    for (var ci4 = 0; ci4 < cars.length; ci4++) {
      var car4 = cars[ci4];
      game.draw.rect(car4.x - car4.w / 2, car4.y - car4.h / 2, car4.w, car4.h, car4.col, 0.9);
      game.draw.rect(car4.x - car4.w / 2 + 4, car4.y - car4.h / 2 + 4, car4.w - 8, car4.h - 8, '#fff', 0.2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life * 2, p.col, p.life * 0.8);
    }

    // Crash dots
    for (var cri = 0; cri < MAX_CRASHES; cri++) {
      game.draw.circle(W / 2 - (MAX_CRASHES - 1) * 28 + cri * 56, H * 0.92, 16, cri < crashes ? C.crash : '#0a0a0a');
    }

    game.draw.text(passed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.greenL : C.redL);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.5;
  });
})(game);
