// 374-rocket-throttle.js
// ロケットスロットル — 燃料を管理しながら高度目標に到達する
// 操作: タップ長押しでエンジン噴射
// 成功: 目標高度5000mに到達  失敗: 燃料切れで落下 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020212',
    sky:    '#0c1445',
    skyHi:  '#1e3a8a',
    cloud:  '#e0f2fe',
    rocket: '#e2e8f0',
    rocketHi:'#f8fafc',
    flame:  '#f97316',
    flameHi:'#fef3c7',
    fuelBar:'#22c55e',
    fuelLow:'#ef4444',
    altBar: '#3b82f6',
    star:   '#f1f5f9',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var altitude = 0;          // meters
  var GOAL = 5000;
  var velocity = 0;          // m/s (positive = up)
  var GRAVITY = -80;         // m/s^2
  var THRUST = 220;          // m/s^2 when engine on
  var fuel = 1.0;            // 0-1
  var FUEL_BURN = 0.025;     // per second of thrust
  var thrusting = false;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var stars = [];
  var clouds = [];
  var cameraY = 0;
  var rocketY = H * 0.7;
  var flameSize = 0;

  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * 8000, r: 1 + Math.random() * 3 });
  }
  for (var ci = 0; ci < 8; ci++) {
    clouds.push({ x: Math.random() * W, y: Math.random() * 2000, w: 120 + Math.random() * 200 });
  }

  game.onTap(function() {});  // handled via holding

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Detect hold (approximation: use elapsed tap detection)
    // We'll use onUpdate to check — the game reads touch state via onTap
    // Simplified: thrusting is set by onTap, cleared automatically
    // We use an alternate: track last tap time
    if (elapsed - lastTapTime < 0.12 && fuel > 0) {
      thrusting = true;
    } else {
      thrusting = false;
    }

    // Physics
    if (thrusting && fuel > 0) {
      velocity += THRUST * dt;
      fuel -= FUEL_BURN * dt;
      if (fuel < 0) fuel = 0;
      // Flame particles
      if (Math.random() < dt * 20) {
        var ang = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
        var spd = 200 + Math.random() * 200;
        particles.push({ x: W / 2, y: rocketY + 80, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, life: 0.3, col: Math.random() < 0.5 ? C.flame : C.flameHi });
      }
      flameSize = Math.min(1, flameSize + dt * 6);
    } else {
      flameSize = Math.max(0, flameSize - dt * 8);
    }

    velocity += GRAVITY * dt;
    altitude += velocity * dt;

    if (altitude < 0) {
      altitude = 0;
      if (velocity < -50) {
        // Crash
        if (!done) {
          done = true;
          game.audio.play('se_failure', 0.7);
          for (var ei = 0; ei < 20; ei++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: W / 2, y: rocketY, vx: Math.cos(ang2) * 300, vy: Math.sin(ang2) * 300, life: 0.8, col: C.flame });
          }
          setTimeout(function() { game.end.failure(); }, 600);
        }
        return;
      }
      velocity = 0;
    }

    if (altitude >= GOAL && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      game.end.success(Math.round(fuel * 1000) + Math.ceil(timeLeft) * 100);
      return;
    }

    // Camera
    cameraY = altitude;

    // Update particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    var skyFrac = Math.min(1, altitude / 3000);
    var skyR = Math.round(2 + skyFrac * (2 - 2));
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, Math.max(0, 0.9 - skyFrac * 0.8));

    // Stars (appear above 1000m)
    if (altitude > 500) {
      var starAlpha = Math.min(1, (altitude - 500) / 2000);
      for (var si2 = 0; si2 < stars.length; si2++) {
        var s = stars[si2];
        var sy = H * 0.5 - (s.y - cameraY) * 0.1;
        if (sy > 0 && sy < H) {
          game.draw.circle(s.x, sy, s.r, C.star, starAlpha * 0.8);
        }
      }
    }

    // Clouds (visible below 2000m)
    if (altitude < 3000) {
      var cloudAlpha = Math.max(0, 1 - altitude / 1500);
      for (var ci2 = 0; ci2 < clouds.length; ci2++) {
        var cl = clouds[ci2];
        var cy2 = H * 0.6 - (cl.y - cameraY) * 0.12;
        if (cy2 > -60 && cy2 < H + 60) {
          game.draw.circle(cl.x, cy2, cl.w * 0.5, C.cloud, cloudAlpha * 0.6);
          game.draw.circle(cl.x - cl.w * 0.3, cy2 + 20, cl.w * 0.35, C.cloud, cloudAlpha * 0.5);
          game.draw.circle(cl.x + cl.w * 0.35, cy2 + 15, cl.w * 0.4, C.cloud, cloudAlpha * 0.5);
        }
      }
    }

    // Rocket
    // Body
    game.draw.rect(W / 2 - 30, rocketY - 100, 60, 130, C.rocket, 0.9);
    // Nose
    game.draw.circle(W / 2, rocketY - 110, 32, C.rocketHi, 0.9);
    // Fins
    game.draw.rect(W / 2 - 56, rocketY - 10, 28, 50, C.rocket, 0.8);
    game.draw.rect(W / 2 + 28, rocketY - 10, 28, 50, C.rocket, 0.8);
    // Window
    game.draw.circle(W / 2, rocketY - 60, 20, C.skyHi, 0.9);

    // Flame
    if (flameSize > 0) {
      game.draw.circle(W / 2, rocketY + 40, 20 + flameSize * 40, C.flame, 0.7);
      game.draw.circle(W / 2, rocketY + 50, 10 + flameSize * 20, C.flameHi, 0.8);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.9);
    }

    // Ground indicator
    if (altitude < 200) {
      var groundY = rocketY + altitude * 1.5 + 100;
      game.draw.rect(0, Math.min(groundY, H - 20), W, 40, '#166534', 0.8);
    }

    // Fuel bar
    var fuelH = 400;
    var fuelX = 60;
    var fuelY = H * 0.3;
    game.draw.rect(fuelX - 16, fuelY, 32, fuelH, C.ui, 0.4);
    game.draw.rect(fuelX - 14, fuelY + fuelH * (1 - fuel), 28, fuelH * fuel, fuel > 0.25 ? C.fuelBar : C.fuelLow, 0.9);
    game.draw.text('燃料', fuelX, fuelY + fuelH + 36, { size: 28, color: C.ui });

    // Altitude bar
    var altH = 400;
    var altX = W - 60;
    var altFrac = Math.min(1, altitude / GOAL);
    game.draw.rect(altX - 16, fuelY, 32, altH, C.ui, 0.4);
    game.draw.rect(altX - 14, fuelY + altH * (1 - altFrac), 28, altH * altFrac, C.altBar, 0.9);
    game.draw.text('高度', altX, fuelY + altH + 36, { size: 28, color: C.ui });

    // Numbers
    game.draw.text(Math.round(altitude) + 'm', W / 2, 160, { size: 52, color: C.text, bold: true });
    game.draw.text('目標: ' + GOAL + 'm', W / 2, 220, { size: 34, color: C.ui });
    game.draw.text('速度: ' + (velocity > 0 ? '+' : '') + Math.round(velocity) + 'm/s', W / 2, 270, { size: 34, color: velocity > 0 ? C.fuelBar : C.fuelLow });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, C.altBar);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  var lastTapTime = -999;
  game.onTap(function() {
    lastTapTime = elapsed;
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
