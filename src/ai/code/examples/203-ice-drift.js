// 203-ice-drift.js
// アイスドリフト — 氷上をドリフトする車を壁に当てないよう操る、慣性との格闘
// 操作: タップで加速方向を指定
// 成功: 20秒生き残る  失敗: 壁に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#e8f4fd',
    ice:     '#d4eaf7',
    iceHi:   '#f0f8ff',
    wall:    '#1e3a5f',
    wallHi:  '#2d5a8e',
    car:     '#ef4444',
    carHi:   '#fca5a5',
    trail:   '#93c5fd',
    danger:  '#ef4444',
    ui:      '#334155'
  };

  var WALL_W = 60;
  var PLAY_X = WALL_W;
  var PLAY_Y = WALL_W;
  var PLAY_W = W - WALL_W * 2;
  var PLAY_H = H - WALL_W * 2;

  var carX = W / 2;
  var carY = H / 2;
  var carVX = 100;
  var carVY = -80;
  var CAR_R = 32;
  var FRICTION = 0.993; // very low friction = ice
  var ACCEL = 600;
  var trail = [];
  var survived = 0;
  var NEEDED = 20;
  var done = false;
  var elapsed = 0;
  var particles = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    var dx = tx - carX, dy = ty - carY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 20) {
      carVX += (dx / dist) * ACCEL;
      carVY += (dy / dist) * ACCEL;
    }
    // Exhaust
    for (var pi = 0; pi < 4; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: carX, y: carY, vx: Math.cos(ang) * 80 - (dx / dist) * 60, vy: Math.sin(ang) * 80 - (dy / dist) * 60, life: 0.4 });
    }
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      survived += dt;
      elapsed += dt;
      if (survived >= NEEDED) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 80 + 500); }, 400);
        return;
      }
    }

    // Apply friction (ice = very little)
    carVX *= Math.pow(FRICTION, dt * 60);
    carVY *= Math.pow(FRICTION, dt * 60);

    carX += carVX * dt;
    carY += carVY * dt;

    // Wall collisions
    var hit = false;
    if (carX - CAR_R < PLAY_X) {
      carX = PLAY_X + CAR_R;
      carVX = Math.abs(carVX) * 0.6;
      hit = true;
    }
    if (carX + CAR_R > PLAY_X + PLAY_W) {
      carX = PLAY_X + PLAY_W - CAR_R;
      carVX = -Math.abs(carVX) * 0.6;
      hit = true;
    }
    if (carY - CAR_R < PLAY_Y) {
      carY = PLAY_Y + CAR_R;
      carVY = Math.abs(carVY) * 0.6;
      hit = true;
    }
    if (carY + CAR_R > PLAY_Y + PLAY_H) {
      carY = PLAY_Y + PLAY_H - CAR_R;
      carVY = -Math.abs(carVY) * 0.6;
      hit = true;
    }

    var speed = Math.sqrt(carVX * carVX + carVY * carVY);
    if (hit && speed > 500 && !done) {
      // Hard crash
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // Trail
    trail.push({ x: carX, y: carY, life: 0.8 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].life -= dt;
      if (particles[pi2].life <= 0) particles.splice(pi2, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ice floor
    game.draw.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H, C.ice, 0.8);
    // Ice shine patches
    for (var ix = 0; ix < 6; ix++) {
      for (var iy = 0; iy < 10; iy++) {
        var px2 = PLAY_X + ix * 160 + 40;
        var py2 = PLAY_Y + iy * 140 + 40;
        game.draw.circle(px2, py2, 30, C.iceHi, 0.3);
      }
    }

    // Walls
    game.draw.rect(0, 0, WALL_W, H, C.wall, 0.9);
    game.draw.rect(W - WALL_W, 0, WALL_W, H, C.wall, 0.9);
    game.draw.rect(0, 0, W, WALL_W, C.wall, 0.9);
    game.draw.rect(0, H - WALL_W, W, WALL_W, C.wall, 0.9);
    // Wall highlights
    game.draw.rect(WALL_W, WALL_W - 8, PLAY_W, 8, C.wallHi, 0.3);
    game.draw.rect(WALL_W - 8, WALL_W, 8, PLAY_H, C.wallHi, 0.3);

    // Trail (ice marks)
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, CAR_R * 0.5 * t.life, C.trail, t.life * 0.35);
    }

    // Particles
    for (var pi3 = 0; pi3 < particles.length; pi3++) {
      var p3 = particles[pi3];
      game.draw.circle(p3.x, p3.y, 10 * p3.life * 2, '#fff', p3.life * 0.5);
    }

    // Car (angle = velocity direction)
    var angle = Math.atan2(carVY, carVX);
    var speed2 = Math.sqrt(carVX * carVX + carVY * carVY);
    game.draw.circle(carX, carY, CAR_R + 8, C.carHi, 0.25);
    game.draw.circle(carX, carY, CAR_R, C.car, 0.9);
    // Direction arrow
    game.draw.line(carX, carY, carX + Math.cos(angle) * (CAR_R + 16), carY + Math.sin(angle) * (CAR_R + 16), C.carHi, 5);
    // Wheels
    var wx = Math.cos(angle + Math.PI / 2) * CAR_R * 0.7;
    var wy = Math.sin(angle + Math.PI / 2) * CAR_R * 0.7;
    game.draw.circle(carX + wx, carY + wy, 12, '#1a1a1a', 0.8);
    game.draw.circle(carX - wx, carY - wy, 12, '#1a1a1a', 0.8);

    // Speed indicator (proximity to walls)
    var wallDist = Math.min(carX - PLAY_X, PLAY_X + PLAY_W - carX, carY - PLAY_Y, PLAY_Y + PLAY_H - carY);
    if (wallDist < 100) {
      game.draw.rect(0, 0, W, H, C.danger, (1 - wallDist / 100) * 0.1);
    }

    game.draw.text(survived.toFixed(1) + 's / ' + NEEDED + 's', W / 2, PLAY_Y + 50, { size: 44, color: C.wall, bold: true });
    game.draw.text('タップで向き変更！', W / 2, PLAY_Y + PLAY_H - 50, { size: 36, color: C.ui });

    var ratio = survived / NEEDED;
    game.draw.rect(0, 0, W, 40, C.bg);
    game.draw.rect(0, 0, W * Math.min(1, ratio), 40, '#22c55e');
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.2); });
})(game);
