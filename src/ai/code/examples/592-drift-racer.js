// 592-drift-racer.js
// ドリフトレーサー — コーナーで滑らかにドリフトして最速ラップを刻む
// 操作: 左右スワイプでステアリング、長押しでブレーキ
// 成功: 5ラップ完走  失敗: 壁に3回衝突 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0800',
    track:    '#1a1a10',
    trackEdge:'#333320',
    grass:    '#0a1800',
    car:      '#ff4422',
    carHi:    '#ff8866',
    drift:    '#ff440033',
    marker:   '#ffdd00',
    markerHi: '#ffffff',
    crash:    '#ef4444',
    safe:     '#22c55e',
    text:     '#f1f5f9',
    ui:       '#2a2010'
  };

  // Oval track waypoints (center-line)
  var CX = W / 2, CY = H * 0.5;
  var RX = W * 0.38, RY = H * 0.3;
  var TRACK_W = 160;
  var NUM_POINTS = 32;

  var trackPoints = [];
  for (var ti = 0; ti < NUM_POINTS; ti++) {
    var ang = (ti / NUM_POINTS) * Math.PI * 2 - Math.PI / 2;
    trackPoints.push({ x: CX + Math.cos(ang) * RX, y: CY + Math.sin(ang) * RY });
  }

  var carAngle = -Math.PI / 2;
  var carX = CX;
  var carY = CY - RY;
  var carSpeed = 0;
  var carVX = 0, carVY = 0;
  var STEER_SPEED = 2.5;
  var MAX_SPEED = 700;
  var ACCEL = 300;
  var DRIFT_FACTOR = 0.85;
  var steerDir = 0;
  var braking = false;
  var laps = 0;
  var NEEDED = 5;
  var crashes = 0;
  var MAX_CRASH = 3;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.crash;
  var lastCheckpoint = 0;
  var checkpointTimer = 0;
  var invincible = 0;
  var trail = [];
  var lapFlash = 0;
  var driftAmount = 0;

  function getClosestTrackPoint() {
    var best = 0, bestDist = 1e9;
    for (var i = 0; i < NUM_POINTS; i++) {
      var dx = carX - trackPoints[i].x, dy = carY - trackPoints[i].y;
      var d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  function isOnTrack() {
    for (var i = 0; i < NUM_POINTS; i++) {
      var dx = carX - trackPoints[i].x, dy = carY - trackPoints[i].y;
      if (dx * dx + dy * dy < TRACK_W * TRACK_W * 0.5) return true;
    }
    return false;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') steerDir = -1;
    else if (dir === 'right') steerDir = 1;
    else if (dir === 'up') { braking = false; }
    else if (dir === 'down') { braking = true; }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap left/right half to steer
    if (tx < W / 2) steerDir = -1;
    else steerDir = 1;
    game.audio.play('se_tap', 0.1);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (lapFlash > 0) lapFlash -= dt * 2;
    if (invincible > 0) invincible -= dt;
    if (checkpointTimer > 0) checkpointTimer -= dt;

    // Physics
    carAngle += steerDir * STEER_SPEED * dt * (carSpeed / MAX_SPEED + 0.2);
    steerDir *= 0.85; // decay

    if (!braking) {
      carSpeed = Math.min(MAX_SPEED, carSpeed + ACCEL * dt);
    } else {
      carSpeed = Math.max(0, carSpeed - ACCEL * 2 * dt);
    }

    // Drift: velocity lags behind angle
    var targetVX = Math.cos(carAngle) * carSpeed;
    var targetVY = Math.sin(carAngle) * carSpeed;
    carVX += (targetVX - carVX) * (1 - DRIFT_FACTOR) * (dt * 8);
    carVY += (targetVY - carVY) * (1 - DRIFT_FACTOR) * (dt * 8);

    // Actual drift amount
    var velAng = Math.atan2(carVY, carVX);
    driftAmount = Math.abs(carAngle - velAng) % (Math.PI * 2);
    if (driftAmount > Math.PI) driftAmount = Math.PI * 2 - driftAmount;

    carX += carVX * dt;
    carY += carVY * dt;

    // Trail
    if (driftAmount > 0.15) {
      trail.push({ x: carX, y: carY, life: 0.5, alpha: Math.min(1, driftAmount) });
    }
    for (var ti2 = trail.length - 1; ti2 >= 0; ti2--) {
      trail[ti2].life -= dt * 2;
      if (trail[ti2].life <= 0) trail.splice(ti2, 1);
    }

    // Off-track collision
    if (!isOnTrack() && invincible <= 0) {
      crashes++;
      invincible = 1.5;
      carSpeed *= 0.3;
      carVX *= 0.3; carVY *= 0.3;
      flashCol = C.crash;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.5);
      for (var pi = 0; pi < 8; pi++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: carX, y: carY, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200, life: 0.4, col: C.crash });
      }
      if (crashes >= MAX_CRASH && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }

    // Lap detection (cross start line)
    var startX = CX, startY = CY - RY;
    var distToStart = Math.sqrt((carX - startX) * (carX - startX) + (carY - startY) * (carY - startY));
    if (distToStart < 80 && checkpointTimer <= 0 && elapsed > 1) {
      laps++;
      lapFlash = 1.0;
      checkpointTimer = 2.0; // prevent multi-trigger
      game.audio.play('se_success', 0.6);
      if (laps >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(laps * 1000 + Math.ceil(timeLeft) * 100); }, 700);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grass
    game.draw.rect(0, 0, W, H, C.grass, 0.8);

    // Track (outer + inner ellipse fill)
    // Draw track as series of thick line segments
    for (var i2 = 0; i2 < NUM_POINTS; i2++) {
      var p1 = trackPoints[i2];
      var p2 = trackPoints[(i2 + 1) % NUM_POINTS];
      game.draw.line(p1.x, p1.y, p2.x, p2.y, C.trackEdge, TRACK_W + 20);
    }
    for (var i3 = 0; i3 < NUM_POINTS; i3++) {
      var p3 = trackPoints[i3];
      var p4 = trackPoints[(i3 + 1) % NUM_POINTS];
      game.draw.line(p3.x, p3.y, p4.x, p4.y, C.track, TRACK_W);
    }

    // Start/finish line
    game.draw.rect(CX - 4, CY - RY - 40, 8, 80, C.markerHi, 0.8);
    if (lapFlash > 0) {
      game.draw.rect(CX - 60, CY - RY - 60, 120, 120, C.marker, lapFlash * 0.3);
    }

    // Drift trail
    for (var ti3 = 0; ti3 < trail.length; ti3++) {
      var tp = trail[ti3];
      game.draw.circle(tp.x, tp.y, 8 * tp.life, C.drift.slice(0, 7), tp.life * 0.4);
    }

    // Car
    var carAlpha = (invincible > 0 && Math.floor(elapsed * 8) % 2 === 0) ? 0.4 : 1.0;
    game.draw.circle(carX + 5, carY + 5, 28, '#000', 0.3);
    game.draw.circle(carX, carY, 28, C.car, carAlpha * 0.9);
    game.draw.circle(carX - 8, carY - 8, 10, C.carHi, 0.5);
    // Direction indicator
    game.draw.line(carX, carY, carX + Math.cos(carAngle) * 40, carY + Math.sin(carAngle) * 40, C.carHi, 5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Crash dots
    for (var ci = 0; ci < MAX_CRASH; ci++) {
      game.draw.circle(W / 2 - (MAX_CRASH - 1) * 80 + ci * 160, H * 0.955, 28, ci < crashes ? C.crash : C.ui, 0.9);
    }

    game.draw.text('LAP ' + laps + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.marker : C.crash);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
  });
})(game);
