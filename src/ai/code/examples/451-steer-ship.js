// 451-steer-ship.js
// 舵取り — うねる海流の中で船を操舵してゴールへ
// 操作: 左右スワイプで船の舵を切る（惰性あり）
// 成功: 10個のブイを通過  失敗: 3回座礁 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#001233',
    sea:    '#023e8a',
    seaHi:  '#0077b6',
    wave:   '#90e0ef',
    ship:   '#e2e8f0',
    shipHi: '#fff',
    mast:   '#94a3b8',
    sail:   '#f1f5f9',
    rock:   '#374151',
    rockHi: '#6b7280',
    buoy:   '#f97316',
    buoyHi: '#fed7aa',
    trail:  '#0096c7',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var ship = { x: W/2, y: H*0.8, vx: 0, vy: -120, angle: 0, rudder: 0 };
  var rocks = [];
  var buoys = [];
  var waves = [];
  var passed = 0;
  var NEEDED = 10;
  var crashes = 0;
  var MAX_CRASH = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var scrollY = 0;
  var seaAnim = 0;

  function spawnObstacles() {
    rocks = [];
    buoys = [];
    // Generate alternating rocks and buoys ahead
    for (var i = 0; i < 20; i++) {
      var y = H * 0.6 - i * 280;
      if (i % 3 === 0) {
        // Buoy to pass through (in center corridor)
        buoys.push({ x: W/2 + (Math.random() - 0.5) * 200, y: y, passed: false });
      } else {
        // Rocks on sides
        rocks.push({ x: 80 + Math.random() * 200, y: y + Math.random() * 100, r: 40 + Math.random() * 30 });
        rocks.push({ x: W - 80 - Math.random() * 200, y: y + Math.random() * 100, r: 40 + Math.random() * 30 });
      }
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') ship.rudder = -1;
    else if (dir === 'right') ship.rudder = 1;
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

    seaAnim += dt;
    scrollY += 120 * dt;

    // Steer
    ship.angle += ship.rudder * 1.5 * dt;
    ship.angle *= (1 - dt * 0.5);  // auto-straighten
    ship.rudder *= (1 - dt * 3);
    if (Math.abs(ship.angle) > 0.8) ship.angle = Math.sign(ship.angle) * 0.8;

    // Move ship
    ship.vx += Math.sin(ship.angle) * 200 * dt;
    ship.vx *= (1 - dt * 1.5);
    ship.x += ship.vx * dt;
    // Keep ship on screen
    if (ship.x < 60) { ship.x = 60; ship.vx = Math.abs(ship.vx) * 0.3; }
    if (ship.x > W - 60) { ship.x = W - 60; ship.vx = -Math.abs(ship.vx) * 0.3; }

    // Check buoys (in world coords)
    for (var bi = 0; bi < buoys.length; bi++) {
      var b = buoys[bi];
      if (b.passed) continue;
      var worldY = b.y + scrollY;
      if (worldY > H * 0.85) {
        // Check if ship near buoy when it passes
        var dx = ship.x - b.x;
        if (Math.abs(dx) < 100) {
          b.passed = true;
          passed++;
          game.audio.play('se_tap', 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: ship.x, y: ship.y, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life: 0.5, col: C.buoyHi });
          }
          if (passed >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.8);
            setTimeout(function() { game.end.success(passed * 400 + Math.ceil(timeLeft) * 80); }, 700);
          }
        } else {
          b.passed = true; // missed buoy
        }
      }
    }

    // Check rocks
    for (var ri = 0; ri < rocks.length; ri++) {
      var r = rocks[ri];
      var worldY2 = r.y + scrollY;
      if (worldY2 > ship.y - r.r - 40 && worldY2 < ship.y + r.r + 40) {
        var dx2 = ship.x - r.x;
        if (Math.abs(dx2) < r.r + 30) {
          crashes++;
          ship.vx = -ship.vx * 0.5;
          ship.x += dx2 > 0 ? 30 : -30;
          game.audio.play('se_failure', 0.5);
          for (var pi2 = 0; pi2 < 10; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: ship.x, y: ship.y, vx: Math.cos(ang2)*160, vy: Math.sin(ang2)*160, life: 0.6, col: C.wrong });
          }
          if (crashes >= MAX_CRASH && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          break;
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
    game.draw.rect(0, 0, W, H, C.sea);

    // Sea waves
    for (var wl = 0; wl < 20; wl++) {
      var wy = (wl * 110 + scrollY) % H;
      var wAlpha = 0.06 + Math.sin(seaAnim * 1.5 + wl) * 0.03;
      game.draw.rect(0, wy, W, 6, C.wave, wAlpha);
    }

    // Rocks
    for (var ri2 = 0; ri2 < rocks.length; ri2++) {
      var r2 = rocks[ri2];
      var ry = r2.y + scrollY;
      if (ry < -100 || ry > H + 100) continue;
      game.draw.circle(r2.x, ry, r2.r + 8, C.sea, 0.6);
      game.draw.circle(r2.x, ry, r2.r, C.rock, 0.9);
      game.draw.circle(r2.x - r2.r*0.3, ry - r2.r*0.3, r2.r*0.25, C.rockHi, 0.4);
    }

    // Buoys
    for (var bi2 = 0; bi2 < buoys.length; bi2++) {
      var b2 = buoys[bi2];
      if (b2.passed) continue;
      var by2 = b2.y + scrollY;
      if (by2 < -80 || by2 > H + 80) continue;
      var bpulse = Math.sin(seaAnim * 3 + bi2) * 5;
      game.draw.circle(b2.x, by2 + bpulse, 32, C.buoyHi, 0.2);
      game.draw.circle(b2.x, by2 + bpulse, 24, C.buoy, 0.9);
      game.draw.line(b2.x, by2 + bpulse, b2.x, by2 + bpulse + 40, C.buoy, 4);
    }

    // Ship trail
    game.draw.circle(ship.x, ship.y + 40, 16, C.trail, 0.3);
    game.draw.circle(ship.x, ship.y + 70, 10, C.trail, 0.2);

    // Ship body
    game.draw.circle(ship.x, ship.y, 40, C.ship, 0.9);
    game.draw.circle(ship.x, ship.y, 28, C.sea, 0.7);
    game.draw.circle(ship.x, ship.y, 20, C.shipHi, 0.4);
    // Mast
    game.draw.line(ship.x + ship.vx * 0.1, ship.y - 30, ship.x + ship.vx * 0.1, ship.y - 80, C.mast, 6);
    game.draw.line(ship.x + ship.vx*0.1, ship.y - 75, ship.x + ship.vx*0.1 + 30, ship.y - 55, C.sail, 4);
    // Rudder indicator
    game.draw.line(ship.x, ship.y + 30, ship.x + ship.rudder * 20, ship.y + 55, C.mast, 8);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Crash dots
    for (var ci2 = 0; ci2 < MAX_CRASH; ci2++) {
      game.draw.circle(W/2 - (MAX_CRASH-1)*44 + ci2*88, H*0.955, 18, ci2 < crashes ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(passed + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wave : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnObstacles();
  });
})(game);
