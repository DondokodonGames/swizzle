// 194-escape-gravity.js
// 重力脱出 — 重力に引かれる宇宙船を連続タップで引力圏を突破する達成感ゲーム
// 操作: タップで推力を与える
// 成功: 引力圏を脱出（画面上部まで到達）  失敗: 30秒以内に脱出できない or 落下

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020204',
    stars:   '#ffffff',
    planet:  '#1e3a5f',
    planetHi:'#2d5a8e',
    ship:    '#22c55e',
    shipHi:  '#86efac',
    thrust:  '#f59e0b',
    thrustHi:'#fde68a',
    danger:  '#ef4444',
    escape:  '#a855f7',
    ui:      '#334155'
  };

  var PLANET_X = W / 2;
  var PLANET_Y = H * 0.88;
  var PLANET_R = 200;
  var GRAVITY_RANGE = H * 0.85;
  var GRAVITY_STRENGTH = 1800;

  var shipX = W / 2;
  var shipY = H * 0.65;
  var shipVX = 0;
  var shipVY = 0;
  var THRUST = 1200;
  var DRAG = 0.98;

  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var thrustFlash = 0;
  var exhaust = [];
  var stars = [];
  var escaped = false;

  function initStars() {
    for (var i = 0; i < 80; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 3 + 1, bright: Math.random() });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Thrust away from planet (upward mainly)
    var dx = shipX - PLANET_X;
    var dy = shipY - PLANET_Y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      // Thrust in opposite direction from planet, influenced by tap direction
      var tapDX = tx - shipX, tapDY = ty - shipY;
      var tapDist = Math.sqrt(tapDX * tapDX + tapDY * tapDY);
      if (tapDist > 10) {
        shipVX += (tapDX / tapDist) * THRUST * 0.5;
        shipVY += (tapDY / tapDist) * THRUST * 0.5;
      }
      // Always add upward component
      shipVY -= THRUST * 0.6;
    } else {
      shipVY -= THRUST;
    }
    thrustFlash = 0.25;
    game.audio.play('se_tap', 0.5);

    // Exhaust particles
    for (var ei = 0; ei < 5; ei++) {
      exhaust.push({
        x: shipX + (Math.random() - 0.5) * 20,
        y: shipY + 30,
        vx: (Math.random() - 0.5) * 100,
        vy: 200 + Math.random() * 150,
        life: 0.4 + Math.random() * 0.3
      });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (thrustFlash > 0) thrustFlash -= dt;

    // Gravity
    var dx = PLANET_X - shipX;
    var dy = PLANET_Y - shipY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < GRAVITY_RANGE && dist > PLANET_R) {
      var gForce = GRAVITY_STRENGTH / (dist * dist) * 3000;
      shipVX += (dx / dist) * gForce * dt;
      shipVY += (dy / dist) * gForce * dt;
    }

    // Drag
    shipVX *= Math.pow(DRAG, dt * 60);
    shipVY *= Math.pow(DRAG, dt * 60);

    shipX += shipVX * dt;
    shipY += shipVY * dt;

    // Keep in horizontal bounds
    if (shipX < 40) { shipX = 40; shipVX = Math.abs(shipVX) * 0.5; }
    if (shipX > W - 40) { shipX = W - 40; shipVX = -Math.abs(shipVX) * 0.5; }

    // Check escape (top of screen)
    if (shipY < 80 && !done) {
      done = true;
      escaped = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 80 + 600); }, 400);
    }

    // Check crash into planet
    if (dist < PLANET_R + 20 && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // Check fell off bottom
    if (shipY > H + 50 && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // Exhaust
    for (var ei2 = exhaust.length - 1; ei2 >= 0; ei2--) {
      exhaust[ei2].x += exhaust[ei2].vx * dt;
      exhaust[ei2].y += exhaust[ei2].vy * dt;
      exhaust[ei2].life -= dt;
      if (exhaust[ei2].life <= 0) exhaust.splice(ei2, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si = 0; si < stars.length; si++) {
      var s = stars[si];
      var twinkle = 0.4 + 0.6 * Math.abs(Math.sin(elapsed * 1.5 + s.bright * 7));
      game.draw.circle(s.x, s.y, s.r, C.stars, twinkle * 0.7);
    }

    // Escape zone
    game.draw.rect(0, 0, W, 100, C.escape, 0.08 + 0.06 * Math.abs(Math.sin(elapsed * 2)));
    game.draw.text('脱出ゾーン', W / 2, 50, { size: 36, color: '#d8b4fe', bold: true });
    game.draw.line(0, 100, W, 100, C.escape, 3);

    // Gravity field visualization
    var gDist = Math.sqrt((shipX - PLANET_X) * (shipX - PLANET_X) + (shipY - PLANET_Y) * (shipY - PLANET_Y));
    var gIntensity = Math.max(0, 1 - gDist / GRAVITY_RANGE);
    if (gIntensity > 0.1) {
      game.draw.circle(PLANET_X, PLANET_Y, PLANET_R + 80, C.danger, gIntensity * 0.06);
      game.draw.circle(PLANET_X, PLANET_Y, PLANET_R + 160, C.danger, gIntensity * 0.04);
    }

    // Planet
    game.draw.circle(PLANET_X, PLANET_Y, PLANET_R + 30, C.planetHi, 0.15);
    game.draw.circle(PLANET_X, PLANET_Y, PLANET_R, C.planet, 0.9);
    game.draw.circle(PLANET_X - PLANET_R * 0.3, PLANET_Y - PLANET_R * 0.25, PLANET_R * 0.25, C.planetHi, 0.2);
    game.draw.circle(PLANET_X + PLANET_R * 0.2, PLANET_Y + PLANET_R * 0.15, PLANET_R * 0.15, C.planetHi, 0.15);

    // Exhaust
    for (var ei3 = 0; ei3 < exhaust.length; ei3++) {
      var e = exhaust[ei3];
      game.draw.circle(e.x, e.y, 14 * e.life * 2, C.thrust, e.life * 0.6);
    }

    // Ship
    if (thrustFlash > 0) {
      game.draw.circle(shipX, shipY, 40, C.shipHi, 0.4);
    }
    game.draw.circle(shipX, shipY, 32, C.shipHi, 0.25);
    game.draw.circle(shipX, shipY, 24, C.ship, 0.9);
    // Ship body (triangle shape via circles)
    game.draw.circle(shipX, shipY - 20, 14, C.shipHi, 0.7);
    game.draw.circle(shipX - 18, shipY + 12, 10, C.ship, 0.8);
    game.draw.circle(shipX + 18, shipY + 12, 10, C.ship, 0.8);

    // Altitude indicator
    var altitude = Math.max(0, 1 - (shipY - 100) / (H - 100));
    game.draw.rect(W - 40, 100, 24, H - 180, '#1a1a2e', 0.7);
    var altH = (H - 180) * altitude;
    game.draw.rect(W - 40, H - 80 - altH, 24, altH, altitude > 0.7 ? C.escape : C.ship);
    game.draw.text('高', W - 28, 120, { size: 28, color: C.ui });

    game.draw.text('タップで推力！', W / 2, H * 0.92, { size: 42, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ship : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initStars();
  });
})(game);
