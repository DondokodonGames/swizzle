// 309-space-dock.js
// 宇宙ドッキング — 漂う宇宙船をスワイプで操作してポートに静かに着岸させる
// 操作: 4方向スワイプで推進（慣性あり）、速度は遅いほど安全
// 成功: 8回ドッキング成功  失敗: 衝突3回 or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020410',
    space:  '#030618',
    ship:   '#94a3b8',
    shipHi: '#e2e8f0',
    thrust: '#f59e0b',
    port:   '#22c55e',
    portHi: '#86efac',
    portRing:'#166534',
    danger: '#ef4444',
    dangerHi:'#fca5a5',
    star:   '#f1f5f9',
    asteroid:'#475569',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var shipX = W / 2, shipY = H * 0.6;
  var shipVX = 0, shipVY = 0;
  var THRUST = 120;
  var DRAG = 0.6;
  var MAX_SPEED = 300;
  var shipAngle = 0;

  var portX = 0, portY = 0;
  var portR = 50;
  var portPulse = 0;

  var docked = 0;
  var NEEDED = 8;
  var crashes = 0;
  var MAX_CRASH = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var bgStars = [];
  var asteroids = [];
  var dockFlash = 0;
  var crashFlash = 0;
  var thrustDir = null;
  var thrustTimer = 0;

  // Background stars
  for (var bs = 0; bs < 60; bs++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, twinkle: Math.random() * Math.PI * 2 });
  }

  function placePort() {
    var margin = 100;
    portX = margin + Math.random() * (W - margin * 2);
    portY = H * 0.2 + Math.random() * (H * 0.6);
    // Don't place on ship
    while (Math.hypot(portX - shipX, portY - shipY) < 200) {
      portX = margin + Math.random() * (W - margin * 2);
      portY = H * 0.2 + Math.random() * (H * 0.6);
    }
    // Spawn asteroid obstacle
    if (docked % 2 === 0 && docked > 0) {
      asteroids.push({ x: (portX + shipX) / 2 + (Math.random() - 0.5) * 150, y: (portY + shipY) / 2 + (Math.random() - 0.5) * 150, r: 35 + Math.random() * 25, rot: 0, rotSpeed: (Math.random() - 0.5) * 2 });
    }
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    var tx = 0, ty = 0;
    if (dir === 'left') { tx = -1; }
    else if (dir === 'right') { tx = 1; }
    else if (dir === 'up') { ty = -1; }
    else if (dir === 'down') { ty = 1; }

    shipVX += tx * THRUST;
    shipVY += ty * THRUST;
    var spd = Math.hypot(shipVX, shipVY);
    if (spd > MAX_SPEED) {
      shipVX = shipVX / spd * MAX_SPEED;
      shipVY = shipVY / spd * MAX_SPEED;
    }

    thrustDir = dir;
    thrustTimer = 0.3;
    game.audio.play('se_tap', 0.2);

    // Thrust particles
    var px = shipX - tx * 30, py = shipY - ty * 30;
    for (var pi = 0; pi < 5; pi++) {
      particles.push({ x: px, y: py, vx: -tx * 80 + (Math.random() - 0.5) * 60, vy: -ty * 80 + (Math.random() - 0.5) * 60, life: 0.4, col: C.thrust });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    portPulse += dt * 3;
    if (thrustTimer > 0) thrustTimer -= dt;
    if (dockFlash > 0) dockFlash -= dt;
    if (crashFlash > 0) crashFlash -= dt;

    // Ship physics
    shipVX *= Math.pow(1 - DRAG * dt, 1);
    shipVY *= Math.pow(1 - DRAG * dt, 1);
    shipX += shipVX * dt;
    shipY += shipVY * dt;

    // Boundary wrap (or bounce)
    if (shipX < 30) { shipX = 30; shipVX = Math.abs(shipVX) * 0.5; }
    if (shipX > W - 30) { shipX = W - 30; shipVX = -Math.abs(shipVX) * 0.5; }
    if (shipY < 80) { shipY = 80; shipVY = Math.abs(shipVY) * 0.5; }
    if (shipY > H - 80) { shipY = H - 80; shipVY = -Math.abs(shipVY) * 0.5; }

    // Update asteroids
    for (var ai = 0; ai < asteroids.length; ai++) {
      asteroids[ai].rot += asteroids[ai].rotSpeed * dt;
      // Check ship-asteroid collision
      var adx = shipX - asteroids[ai].x, ady = shipY - asteroids[ai].y;
      if (Math.hypot(adx, ady) < asteroids[ai].r + 25) {
        crashes++;
        crashFlash = 0.5;
        game.audio.play('se_failure', 0.6);
        shipVX = adx * 3;
        shipVY = ady * 3;
        for (var pi2 = 0; pi2 < 8; pi2++) {
          var fang = Math.random() * Math.PI * 2;
          particles.push({ x: shipX, y: shipY, vx: Math.cos(fang) * 200, vy: Math.sin(fang) * 200, life: 0.6, col: C.dangerHi });
        }
        if (crashes >= MAX_CRASH && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    // Check dock
    var spd2 = Math.hypot(shipVX, shipVY);
    var dist = Math.hypot(shipX - portX, shipY - portY);
    if (dist < portR + 20) {
      if (spd2 < 80) {
        // Successful dock!
        docked++;
        dockFlash = 0.8;
        game.audio.play('se_success', 0.6);
        for (var pi3 = 0; pi3 < 12; pi3++) {
          var pang = Math.random() * Math.PI * 2;
          particles.push({ x: portX, y: portY, vx: Math.cos(pang) * 200, vy: Math.sin(pang) * 200, life: 0.7, col: C.portHi });
        }
        shipVX = 0; shipVY = 0;
        if (docked >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(docked * 300 + Math.ceil(timeLeft) * 100); }, 500);
          return;
        }
        setTimeout(function() {
          if (!done) {
            shipX = W / 2 + (Math.random() - 0.5) * 200;
            shipY = H * 0.6;
            placePort();
          }
        }, 600);
      } else {
        // Too fast — crash
        crashes++;
        crashFlash = 0.4;
        game.audio.play('se_failure', 0.5);
        shipVX = -shipVX * 0.6;
        shipVY = -shipVY * 0.6;
        if (crashes >= MAX_CRASH && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
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

    // Stars
    for (var bs2 = 0; bs2 < bgStars.length; bs2++) {
      var b = bgStars[bs2];
      b.twinkle += dt;
      game.draw.circle(b.x, b.y, b.r, C.star, 0.3 + 0.3 * Math.sin(b.twinkle));
    }

    // Asteroids
    for (var ai2 = 0; ai2 < asteroids.length; ai2++) {
      var ast = asteroids[ai2];
      var ar = ast.r;
      game.draw.circle(ast.x, ast.y, ar + 4, C.asteroid, 0.2);
      game.draw.circle(ast.x, ast.y, ar, C.asteroid, 0.8);
      game.draw.circle(ast.x + ar * 0.3, ast.y - ar * 0.2, ar * 0.2, '#334155', 0.6);
    }

    // Port
    var pPulse = 5 * Math.sin(portPulse);
    game.draw.circle(portX, portY, portR + pPulse + 20, C.portRing, 0.15);
    game.draw.circle(portX, portY, portR + pPulse, C.port, 0.3);
    game.draw.circle(portX, portY, portR, C.portHi, 0.7);
    // Speed zone indicator
    var dist2 = Math.hypot(shipX - portX, shipY - portY);
    if (dist2 < 200) {
      var spd3 = Math.hypot(shipVX, shipVY);
      var safeCol = spd3 < 80 ? C.port : C.danger;
      game.draw.circle(portX, portY, portR + 40, safeCol, 0.2);
    }
    if (dockFlash > 0) game.draw.circle(portX, portY, portR + 60, C.portHi, dockFlash * 0.4);

    // Ship
    var spd4 = Math.hypot(shipVX, shipVY);
    var shipDir2 = spd4 > 5 ? Math.atan2(shipVY, shipVX) : 0;
    game.draw.circle(shipX, shipY, 28 + 4, crashFlash > 0 ? C.danger : C.shipHi, 0.3);
    game.draw.circle(shipX, shipY, 28, C.ship, 0.9);
    game.draw.circle(shipX + Math.cos(shipDir2) * 15, shipY + Math.sin(shipDir2) * 15, 12, C.shipHi, 0.7);

    // Thrust flame
    if (thrustTimer > 0) {
      game.draw.circle(shipX - Math.cos(shipDir2) * 30, shipY - Math.sin(shipDir2) * 30, 14 * thrustTimer / 0.3, C.thrust, thrustTimer * 0.8);
    }

    // Speed indicator
    var spdRatio = spd4 / MAX_SPEED;
    var spdCol = spdRatio < 0.25 ? C.port : (spdRatio < 0.6 ? C.thruster : C.danger);
    game.draw.rect(30, H * 0.82, 20, 120, '#1e293b', 0.8);
    game.draw.rect(30, H * 0.82 + 120 * (1 - spdRatio), 20, 120 * spdRatio, spdRatio < 0.25 ? C.port : C.danger, 0.9);
    game.draw.text('速', 40, H * 0.81, { size: 26, color: C.ui });

    // Crash flash
    if (crashFlash > 0) game.draw.rect(0, 0, W, H, C.danger, crashFlash * 0.2);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text('スワイプで推進', W / 2, H * 0.88, { size: 40, color: C.ui });
    game.draw.text(docked + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    for (var ci2 = 0; ci2 < MAX_CRASH; ci2++) {
      game.draw.circle(W / 2 - (MAX_CRASH - 1) * 28 + ci2 * 56, H * 0.93, 16, ci2 < crashes ? C.danger : '#020410');
    }

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.port : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    placePort();
  });
})(game);
