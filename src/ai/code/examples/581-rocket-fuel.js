// 581-rocket-fuel.js
// ロケットフュール — 燃料タンクの残量を見ながらロケットを目標高度まで飛ばす
// 操作: タップで噴射（燃料を消費）、離すと落下
// 成功: 3回目標高度に到達  失敗: 燃料切れ落下3回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000008',
    star:    '#ffffff',
    rocket:  '#ccddee',
    rocketHi:'#eef4ff',
    flame:   '#ff6600',
    flameHi: '#ffcc00',
    fuel:    '#3b82f6',
    fuelLow: '#ef4444',
    target:  '#22c55e',
    targetHi:'#86efac',
    text:    '#f1f5f9',
    ui:      '#334455',
    danger:  '#ef4444'
  };

  var ROCKET_W = 60;
  var ROCKET_H = 110;
  var rocket = { x: W / 2, y: H * 0.8, vy: 0, thrusting: false };
  var GRAVITY = 600;
  var THRUST = -1200;
  var fuel = 1.0;
  var FUEL_RATE = 0.25;
  var TARGET_Y = H * 0.25;
  var TARGET_ZONE = 80;
  var completions = 0;
  var NEEDED = 3;
  var crashes = 0;
  var MAX_CRASH = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.target;
  var inTargetTimer = 0;
  var NEEDED_IN_TARGET = 1.5;
  var stars = [];
  var camY = 0; // camera offset (positive = looking up)

  function initStars() {
    stars = [];
    for (var i = 0; i < 60; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H * 3 - H,
        r: 1 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  function reset() {
    rocket.x = W / 2;
    rocket.y = H * 0.8;
    rocket.vy = 0;
    rocket.thrusting = false;
    fuel = 1.0;
    inTargetTimer = 0;
    camY = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Handled as press-hold in update
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    rocket.thrusting = !rocket.thrusting;
  });

  // Simulate press/release via tap state
  var pressing = false;
  var lastTapElapsed = -99;

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
    if (flashAnim > 0) flashAnim -= dt * 2.5;

    // Thrust if fuel remains
    if (rocket.thrusting && fuel > 0) {
      rocket.vy += THRUST * dt;
      fuel = Math.max(0, fuel - FUEL_RATE * dt);
      if (fuel <= 0) {
        rocket.thrusting = false;
        game.audio.play('se_failure', 0.3);
      }
      // Flame particles
      if (Math.random() < 0.5) {
        particles.push({
          x: rocket.x + (Math.random() - 0.5) * 20,
          y: rocket.y + ROCKET_H / 2 + 10,
          vx: (Math.random() - 0.5) * 100,
          vy: 200 + Math.random() * 150,
          life: 0.25,
          col: Math.random() < 0.5 ? C.flame : C.flameHi
        });
      }
    }

    // Gravity
    rocket.vy += GRAVITY * dt;
    rocket.y += rocket.vy * dt;
    rocket.vy = Math.max(-1200, Math.min(800, rocket.vy));

    // Camera follow
    var screenRocketY = rocket.y - camY;
    if (screenRocketY < H * 0.3) camY -= (H * 0.3 - screenRocketY) * dt * 4;
    if (screenRocketY > H * 0.75) camY += (screenRocketY - H * 0.75) * dt * 4;
    camY = Math.max(0, camY);

    // Screen Y of rocket
    var rScreenY = rocket.y - camY;

    // Ground collision
    var groundY = H * 0.82;
    if (rocket.y > groundY - ROCKET_H / 2) {
      if (Math.abs(rocket.vy) > 300 || fuel <= 0.02) {
        crashes++;
        flashCol = C.danger;
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.5);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: rocket.x, y: groundY - camY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 100, life: 0.4, col: C.flame });
        }
        if (crashes >= MAX_CRASH && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          setTimeout(function() { if (!done) reset(); }, 900);
        }
      } else {
        // Soft landing
        rocket.y = groundY - ROCKET_H / 2;
        rocket.vy = 0;
        // Refuel on ground
        fuel = Math.min(1, fuel + dt * 0.3);
      }
    }

    // Check target zone
    var targetScreenY = TARGET_Y - camY;
    var inTarget = Math.abs(rocket.y - TARGET_Y) < TARGET_ZONE;
    if (inTarget) {
      inTargetTimer += dt;
      if (inTargetTimer >= NEEDED_IN_TARGET && !done) {
        completions++;
        inTargetTimer = 0;
        flashCol = C.target;
        flashAnim = 0.5;
        game.audio.play('se_success', 0.8);
        for (var pi2 = 0; pi2 < 12; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: rocket.x, y: rScreenY, vx: Math.cos(ang2) * 220, vy: Math.sin(ang2) * 220, life: 0.5, col: C.targetHi });
        }
        if (completions >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(completions * 1000 + Math.ceil(timeLeft) * 100); }, 800);
        } else {
          setTimeout(function() { if (!done) reset(); }, 900);
        }
      }
    } else {
      inTargetTimer = Math.max(0, inTargetTimer - dt);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si = 0; si < stars.length; si++) {
      var s = stars[si];
      var sy = s.y + camY * 0.2;
      var alpha = 0.4 + Math.sin(elapsed * 2 + s.twinkle) * 0.3;
      game.draw.circle(s.x, sy % H, s.r, C.star, alpha);
    }

    // Ground
    game.draw.rect(0, groundY - camY, W, H - groundY + camY + 100, '#1a1a2a', 0.9);
    game.draw.rect(0, groundY - camY, W, 12, '#334455', 0.9);

    // Target zone
    var tsy = TARGET_Y - camY;
    game.draw.rect(0, tsy - TARGET_ZONE, W, TARGET_ZONE * 2, C.target, 0.06 + Math.sin(elapsed * 3) * 0.02);
    game.draw.line(0, tsy - TARGET_ZONE, W, tsy - TARGET_ZONE, C.targetHi, 3);
    game.draw.line(0, tsy + TARGET_ZONE, W, tsy + TARGET_ZONE, C.targetHi, 3);
    game.draw.text('目標ゾーン', W - 200, tsy + 20, { size: 30, color: C.targetHi });

    // Target hold progress
    if (inTargetTimer > 0) {
      var prog = inTargetTimer / NEEDED_IN_TARGET;
      game.draw.rect(rocket.x - 60, rScreenY - 80, 120 * prog, 12, C.target, 0.9);
    }

    // Rocket body
    var rsx = rocket.x, rsy = rScreenY;
    // Nozzle
    game.draw.rect(rsx - 16, rsy + ROCKET_H / 2 - 10, 32, 20, '#888', 0.8);
    // Body
    game.draw.rect(rsx - ROCKET_W / 2, rsy - ROCKET_H / 2, ROCKET_W, ROCKET_H, C.rocket, 0.9);
    game.draw.rect(rsx - ROCKET_W / 2, rsy - ROCKET_H / 2, ROCKET_W, 20, C.rocketHi, 0.5);
    // Nose
    game.draw.circle(rsx, rsy - ROCKET_H / 2 - 20, 30, C.rocketHi, 0.7);
    game.draw.circle(rsx, rsy - ROCKET_H / 2 - 20, 18, '#fff', 0.3);
    // Fins
    game.draw.rect(rsx - ROCKET_W / 2 - 20, rsy + ROCKET_H / 2 - 40, 20, 40, '#99aaaa', 0.8);
    game.draw.rect(rsx + ROCKET_W / 2, rsy + ROCKET_H / 2 - 40, 20, 40, '#99aaaa', 0.8);

    // Flame
    if (rocket.thrusting && fuel > 0) {
      var fh = 40 + Math.sin(elapsed * 20) * 20;
      game.draw.rect(rsx - 16, rsy + ROCKET_H / 2 + 10, 32, fh, C.flame, 0.9);
      game.draw.rect(rsx - 8, rsy + ROCKET_H / 2 + 10, 16, fh * 0.6, C.flameHi, 0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Fuel gauge
    var fuelW = 40, fuelH = H * 0.3;
    var fuelX = W - 80, fuelY = H * 0.35;
    game.draw.rect(fuelX, fuelY, fuelW, fuelH, C.ui, 0.5);
    var fCol = fuel < 0.2 ? C.fuelLow : C.fuel;
    game.draw.rect(fuelX, fuelY + fuelH * (1 - fuel), fuelW, fuelH * fuel, fCol, 0.9);
    game.draw.text('燃料', fuelX + fuelW / 2, fuelY - 30, { size: 26, color: C.ui });
    game.draw.text(Math.round(fuel * 100) + '%', fuelX + fuelW / 2, fuelY + fuelH + 30, { size: 24, color: fCol });

    // Thrust button hint
    game.draw.text(rocket.thrusting ? '噴射中 ▲' : 'スワイプで噴射', W / 2, H * 0.9, { size: 36, color: rocket.thrusting ? C.flameHi : C.ui });

    // Crash dots
    for (var ci = 0; ci < MAX_CRASH; ci++) {
      game.draw.circle(W / 2 - (MAX_CRASH - 1) * 50 + ci * 100, H * 0.955, 20, ci < crashes ? C.danger : C.ui, 0.9);
    }

    game.draw.text(completions + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.target : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    initStars();
    reset();
  });
})(game);
