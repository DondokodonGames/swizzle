// 500-space-dock.js
// スペースドック — 宇宙船をスワイプで操作してドッキングポートに静かに着岸せよ
// 操作: スワイプで推進方向を指定（慣性あり）。ゆっくり接触でドッキング成功
// 成功: 8回ドッキング  失敗: 3回クラッシュ or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000008',
    stars:  '#c7d2fe',
    ship:   '#94a3b8',
    shipHi: '#f1f5f9',
    engine: '#f59e0b',
    port:   '#22c55e',
    portHi: '#86efac',
    portRim:'#166534',
    crash:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151',
    thrust: '#fde68a'
  };

  var stars = [];
  for (var si = 0; si < 80; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 3, blink: Math.random() * Math.PI * 2 });
  }

  var ship = { x: W / 2, y: H * 0.2, vx: 0, vy: 0, angle: Math.PI / 2 };
  var port = { x: W / 2, y: H * 0.75, r: 60, w: 120 };
  var docked = 0;
  var crashes = 0;
  var MAX_CRASH = 3;
  var NEEDED = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var thrustDir = null;
  var thrustTimer = 0;
  var dockAnim = 0;
  var crashAnim = 0;
  var SAFE_SPEED = 120; // max approach speed
  var MAX_SPEED = 400;

  function resetShip() {
    ship.x = 100 + Math.random() * (W - 200);
    ship.y = 100 + Math.random() * H * 0.2;
    ship.vx = (Math.random() - 0.5) * 60;
    ship.vy = Math.random() * 30;
    // Spawn port at random x, fixed lower area
    port.x = 150 + Math.random() * (W - 300);
    port.y = H * 0.65 + Math.random() * H * 0.15;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    var thrust = 220;
    if (dir === 'up')    { ship.vy -= thrust; thrustDir = 'up'; }
    if (dir === 'down')  { ship.vy += thrust; thrustDir = 'down'; }
    if (dir === 'left')  { ship.vx -= thrust; thrustDir = 'left'; }
    if (dir === 'right') { ship.vx += thrust; thrustDir = 'right'; }
    thrustTimer = 0.3;
    game.audio.play('se_tap', 0.3);
    for (var pi = 0; pi < 5; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: ship.x, y: ship.y, vx: Math.cos(ang) * 80 - ship.vx * 0.3, vy: Math.sin(ang) * 80 - ship.vy * 0.3, life: 0.5, col: C.thrust });
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Fine adjustment: push toward tap
    var dx = tx - ship.x, dy = ty - ship.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) {
      var thrust = 100;
      ship.vx += (dx / len) * thrust;
      ship.vy += (dy / len) * thrust;
    }
    game.audio.play('se_tap', 0.2);
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

    if (thrustTimer > 0) { thrustTimer -= dt; if (thrustTimer <= 0) thrustDir = null; }
    if (dockAnim > 0) dockAnim -= dt * 3;
    if (crashAnim > 0) crashAnim -= dt * 3;

    // Physics
    ship.vx *= Math.pow(0.98, dt * 60);
    ship.vy *= Math.pow(0.98, dt * 60);
    // Speed cap
    var spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (spd > MAX_SPEED) { ship.vx *= MAX_SPEED / spd; ship.vy *= MAX_SPEED / spd; }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    // Wrap at edges
    if (ship.x < 0) ship.x = W;
    if (ship.x > W) ship.x = 0;
    if (ship.y < 0) ship.y = H;
    if (ship.y > H) ship.y = 0;

    // Check dock
    var dx2 = ship.x - port.x, dy2 = ship.y - port.y;
    var dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (dist < port.r + 30) {
      var approach = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
      if (approach < SAFE_SPEED) {
        // Successful dock
        docked++;
        dockAnim = 1.0;
        game.audio.play('se_success', 0.8);
        ship.vx = 0; ship.vy = 0;
        for (var pi2 = 0; pi2 < 14; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: port.x, y: port.y, vx: Math.cos(ang2) * 160, vy: Math.sin(ang2) * 160, life: 0.7, col: C.portHi });
        }
        if (docked >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(docked * 500 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          setTimeout(function() { if (!done) resetShip(); }, 700);
        }
      } else {
        // Crash!
        crashes++;
        crashAnim = 1.0;
        game.audio.play('se_failure', 0.6);
        ship.vx = -ship.vx * 0.5;
        ship.vy = -ship.vy * 0.5;
        for (var pi3 = 0; pi3 < 10; pi3++) {
          var ang3 = Math.random() * Math.PI * 2;
          particles.push({ x: ship.x, y: ship.y, vx: Math.cos(ang3) * 200, vy: Math.sin(ang3) * 200, life: 0.6, col: C.crash });
        }
        if (crashes >= MAX_CRASH && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          setTimeout(function() { if (!done) resetShip(); }, 700);
        }
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var sti = 0; sti < stars.length; sti++) {
      var star = stars[sti];
      star.blink += dt;
      game.draw.circle(star.x, star.y, star.r, C.stars, 0.5 + Math.sin(star.blink) * 0.3);
    }

    // Docking port
    var portPulse = Math.sin(elapsed * 3) * 8;
    game.draw.circle(port.x, port.y, port.r + 20 + portPulse, C.port, 0.15);
    game.draw.circle(port.x, port.y, port.r, C.portRim, 0.9);
    game.draw.circle(port.x, port.y, port.r - 12, C.port, 0.4);
    // Port arms
    game.draw.line(port.x - port.r, port.y, port.x - port.r - 40, port.y, C.portHi, 8);
    game.draw.line(port.x + port.r, port.y, port.x + port.r + 40, port.y, C.portHi, 8);
    if (dockAnim > 0) {
      game.draw.circle(port.x, port.y, port.r + dockAnim * 60, C.portHi, dockAnim * 0.4);
    }

    // Ship
    var sCol = crashAnim > 0 ? C.crash : C.ship;
    // Body: diamond shape via 4 lines
    var sw = 40, sl = 70;
    game.draw.circle(ship.x, ship.y, sw + 5, sCol, 0.2);
    game.draw.circle(ship.x, ship.y, sw, sCol, 0.85);
    // Nose (direction of motion)
    var vlen = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (vlen > 20) {
      var nx = ship.vx / vlen, ny = ship.vy / vlen;
      game.draw.circle(ship.x + nx * sl, ship.y + ny * sl, 18, C.shipHi, 0.8);
      // Thruster glow at opposite end
      if (thrustDir) {
        game.draw.circle(ship.x - nx * sw, ship.y - ny * sw, 22, C.engine, 0.7 + Math.sin(elapsed * 20) * 0.2);
      }
    }
    game.draw.circle(ship.x - 14, ship.y - 14, 10, '#fff', 0.4); // window

    // Speed indicator
    var spd2 = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    var spdCol = spd2 > SAFE_SPEED ? C.crash : C.portHi;
    game.draw.text(Math.floor(spd2) + '', W - 80, H * 0.12, { size: 48, color: spdCol, bold: true });
    game.draw.text('速度', W - 80, H * 0.12 - 44, { size: 32, color: C.ui });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    // Crash dots
    for (var ci2 = 0; ci2 < MAX_CRASH; ci2++) {
      game.draw.circle(W / 2 - (MAX_CRASH - 1) * 60 + ci2 * 120, H * 0.955, 22, ci2 < crashes ? C.crash : C.ui, 0.9);
    }

    game.draw.text(docked + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.port : C.crash);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    resetShip();
  });
})(game);
