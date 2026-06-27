// 624-rush-hour.js
// ラッシュアワー — 交差点を渡る車をタイミングよく停止・通過させろ
// 操作: タップで車を一時停止/再開
// 成功: 20台通過  失敗: 3回衝突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0a0a',
    road:     '#1a1a1a',
    roadLine: '#333333',
    car1:     '#3b82f6',
    car2:     '#ef4444',
    car3:     '#22c55e',
    car4:     '#f59e0b',
    crash:    '#ff4444',
    safe:     '#22c55e',
    text:     '#f1f5f9',
    ui:       '#1a1a2a',
    cross:    '#2a2a2a'
  };

  var CAR_COLORS = [C.car1, C.car2, C.car3, C.car4];
  var INTER_X = W / 2;
  var INTER_Y = H * 0.45;
  var ROAD_W = 140;

  var cars = [];
  var passed = 0;
  var NEEDED = 20;
  var crashes = 0;
  var MAX_CRASH = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var spawnTimer = 0;
  var nextId = 0;

  // Direction: 0=right, 1=left, 2=down, 3=up
  function spawnCar() {
    var dir = Math.floor(Math.random() * 4);
    var speed = 200 + Math.random() * 100 + elapsed * 2;
    var col = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    var cx, cy, vx, vy;
    var CW = 100, CH = 60;
    if (dir === 0) { // left to right
      cx = -CW; cy = INTER_Y - ROAD_W / 4;
      vx = speed; vy = 0;
    } else if (dir === 1) { // right to left
      cx = W + CW; cy = INTER_Y + ROAD_W / 4;
      vx = -speed; vy = 0;
    } else if (dir === 2) { // top to bottom
      cx = INTER_X + ROAD_W / 4; cy = -CH;
      vx = 0; vy = speed;
    } else { // bottom to top
      cx = INTER_X - ROAD_W / 4; cy = H + CH;
      vx = 0; vy = -speed;
    }
    cars.push({
      id: nextId++,
      x: cx, y: cy,
      vx: vx, vy: vy,
      svx: vx, svy: vy, // saved velocity
      w: CW, h: CH,
      col: col,
      dir: dir,
      stopped: false,
      phase: Math.random() * Math.PI * 2
    });
  }

  function carRect(c) {
    var hw = c.w / 2, hh = c.h / 2;
    if (c.dir === 2 || c.dir === 3) { hw = c.h / 2; hh = c.w / 2; }
    return { left: c.x - hw, right: c.x + hw, top: c.y - hh, bot: c.y + hh };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find tapped car
    for (var ci = 0; ci < cars.length; ci++) {
      var c = cars[ci];
      var r = carRect(c);
      if (tx >= r.left - 20 && tx <= r.right + 20 && ty >= r.top - 20 && ty <= r.bot + 20) {
        c.stopped = !c.stopped;
        if (c.stopped) {
          c.svx = c.vx; c.svy = c.vy;
          c.vx = 0; c.vy = 0;
        } else {
          c.vx = c.svx; c.vy = c.svy;
        }
        game.audio.play('se_tap', 0.2);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 4;

    spawnTimer += dt;
    if (spawnTimer > Math.max(0.8, 2.0 - elapsed * 0.02) && cars.length < 6) {
      spawnTimer = 0;
      spawnCar();
    }

    for (var ci = 0; ci < cars.length; ci++) {
      var c = cars[ci];
      c.phase += dt * 3;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
    }

    // Collision detection
    for (var ci2 = 0; ci2 < cars.length; ci2++) {
      for (var cj = ci2 + 1; cj < cars.length; cj++) {
        var a = cars[ci2], b = cars[cj];
        if (a.stopped && b.stopped) continue;
        var ra = carRect(a), rb = carRect(b);
        if (ra.left < rb.right && ra.right > rb.left && ra.top < rb.bot && ra.bot > rb.top) {
          // Crash!
          crashes++;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.6);
          var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          for (var p = 0; p < 12; p++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: mx, y: my, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.5, col: C.crash });
          }
          // Remove both cars
          cars.splice(cj, 1);
          cars.splice(ci2, 1);
          if (crashes >= MAX_CRASH && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          break;
        }
      }
      if (ci2 >= cars.length) break;
    }

    // Remove off-screen cars
    for (var ci3 = cars.length - 1; ci3 >= 0; ci3--) {
      var c2 = cars[ci3];
      if (c2.x < -200 || c2.x > W + 200 || c2.y < -200 || c2.y > H + 200) {
        passed++;
        cars.splice(ci3, 1);
        if (passed >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(passed * 200 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Roads
    game.draw.rect(0, INTER_Y - ROAD_W / 2, W, ROAD_W, C.road, 1);
    game.draw.rect(INTER_X - ROAD_W / 2, 0, ROAD_W, H, C.road, 1);
    // Road lines
    game.draw.line(0, INTER_Y, W, INTER_Y, C.roadLine, 3);
    game.draw.line(INTER_X, 0, INTER_X, H, C.roadLine, 3);
    // Intersection
    game.draw.rect(INTER_X - ROAD_W / 2, INTER_Y - ROAD_W / 2, ROAD_W, ROAD_W, C.cross, 1);

    // Cars
    for (var ci4 = 0; ci4 < cars.length; ci4++) {
      var car = cars[ci4];
      var cw = car.w, ch = car.h;
      if (car.dir === 2 || car.dir === 3) { cw = car.h; ch = car.w; }
      var glow = car.stopped ? 0.4 + Math.sin(car.phase * 8) * 0.2 : 0;
      if (car.stopped) game.draw.rect(car.x - cw / 2 - 8, car.y - ch / 2 - 8, cw + 16, ch + 16, car.col, glow);
      game.draw.rect(car.x - cw / 2 + 4, car.y - ch / 2 + 4, cw - 8, ch - 8, '#000', 0.3);
      game.draw.rect(car.x - cw / 2, car.y - ch / 2, cw, ch, car.col, 0.9);
      // Windows
      game.draw.rect(car.x - cw * 0.25, car.y - ch * 0.25, cw * 0.5, ch * 0.5, '#aaddff', 0.4);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 14 * p2.life, p2.col, p2.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.crash, flashAnim * 0.1);

    // Crash dots
    for (var cri = 0; cri < MAX_CRASH; cri++) {
      game.draw.circle(W / 2 - (MAX_CRASH - 1) * 80 + cri * 160, H * 0.955, 28, cri < crashes ? C.crash : C.ui, 0.9);
    }

    game.draw.text(passed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.crash);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnCar();
    spawnCar();
  });
})(game);
