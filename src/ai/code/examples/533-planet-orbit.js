// 533-planet-orbit.js
// プラネットオービット — 軌道上の惑星をタップして宇宙船をキャッチ
// 操作: タップで宇宙船が軌道を跳び、次の惑星にキャッチされる
// 成功: 8惑星到達  失敗: 3回ミス or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#01010a',
    star:     '#c7d2fe',
    planet1:  '#3b82f6',
    planet2:  '#ef4444',
    planet3:  '#22c55e',
    planet4:  '#f59e0b',
    planet5:  '#a855f7',
    ship:     '#f1f5f9',
    shipHi:   '#ffffff',
    trail:    '#7dd3fc',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#374151'
  };

  var PLANET_COLORS = [C.planet1, C.planet2, C.planet3, C.planet4, C.planet5];
  var CENTER_X = W / 2;
  var CENTER_Y = H / 2;

  var planets = [];
  var ship = { orbitIdx: 0, angle: 0, orbitSpeed: 2.5, launching: false, x: 0, y: 0, vx: 0, vy: 0 };
  var reached = 0;
  var NEEDED = 8;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var stars = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var trail = [];

  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 0.5 + Math.random() * 2, t: Math.random() * Math.PI * 2 });
  }

  function genPlanets() {
    planets = [];
    var count = 5;
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      var dist = 200 + Math.random() * 260;
      planets.push({
        x: CENTER_X + Math.cos(angle) * dist,
        y: CENTER_Y + Math.sin(angle) * dist,
        r: 36 + Math.random() * 20,
        col: PLANET_COLORS[i % PLANET_COLORS.length],
        orbitAngle: angle,
        orbitDist: dist,
        orbitSpeed: (Math.random() - 0.5) * 0.4,
        spinAngle: Math.random() * Math.PI * 2
      });
    }
    // Place ship on first planet
    ship.orbitIdx = 0;
    ship.angle = 0;
    ship.launching = false;
    updateShipOnOrbit();
  }

  function updateShipOnOrbit() {
    var p = planets[ship.orbitIdx];
    if (!p) return;
    ship.x = p.x + Math.cos(ship.angle) * (p.r + 18);
    ship.y = p.y + Math.sin(ship.angle) * (p.r + 18);
  }

  game.onTap(function(tx, ty) {
    if (done || ship.launching) return;

    // Launch ship tangentially from current planet
    var p = planets[ship.orbitIdx];
    var tangX = -Math.sin(ship.angle);
    var tangY = Math.cos(ship.angle);
    var speed = 700;
    ship.launching = true;
    ship.vx = tangX * speed;
    ship.vy = tangY * speed;
    game.audio.play('se_tap', 0.4);
    trail = [];
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

    // Update planets
    for (var pi = 0; pi < planets.length; pi++) {
      var p = planets[pi];
      p.orbitAngle += p.orbitSpeed * dt;
      p.x = CENTER_X + Math.cos(p.orbitAngle) * p.orbitDist;
      p.y = CENTER_Y + Math.sin(p.orbitAngle) * p.orbitDist;
      p.spinAngle += dt;
    }

    // Update ship
    if (ship.launching) {
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      trail.push({ x: ship.x, y: ship.y, life: 0.5 });

      // Check if ship left screen or went too far
      if (ship.x < -100 || ship.x > W + 100 || ship.y < -100 || ship.y > H + 100) {
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.5;
        game.audio.play('se_failure', 0.5);
        ship.launching = false;
        updateShipOnOrbit();
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        return;
      }

      // Check collision with any planet (except current)
      for (var pi2 = 0; pi2 < planets.length; pi2++) {
        if (pi2 === ship.orbitIdx) continue;
        var p2 = planets[pi2];
        var dx = ship.x - p2.x, dy = ship.y - p2.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < p2.r + 24) {
          // Caught!
          ship.launching = false;
          ship.orbitIdx = pi2;
          ship.angle = Math.atan2(ship.y - p2.y, ship.x - p2.x);
          reached++;
          flashCol = C.correct;
          flashAnim = 0.4;
          game.audio.play('se_success', 0.7);
          for (var ppi = 0; ppi < 10; ppi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: ship.x, y: ship.y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: p2.col });
          }
          if (reached >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(reached * 400 + Math.ceil(timeLeft) * 100); }, 700);
          }
          break;
        }
      }
    } else {
      // Orbit current planet
      ship.angle += ship.orbitSpeed * dt;
      updateShipOnOrbit();
    }

    // Update trail
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt * 2;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Stars twinkle
    for (var si2 = 0; si2 < stars.length; si2++) stars[si2].t += dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var si3 = 0; si3 < stars.length; si3++) {
      var st = stars[si3];
      game.draw.circle(st.x, st.y, st.r, C.star, 0.3 + Math.sin(st.t) * 0.2);
    }

    // Orbit paths (faint)
    for (var pi3 = 0; pi3 < planets.length; pi3++) {
      var p3 = planets[pi3];
      game.draw.circle(CENTER_X, CENTER_Y, p3.orbitDist, p3.col, 0.04);
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      game.draw.circle(trail[ti2].x, trail[ti2].y, 8 * trail[ti2].life, C.trail, trail[ti2].life * 0.6);
    }

    // Planets
    for (var pi4 = 0; pi4 < planets.length; pi4++) {
      var p4 = planets[pi4];
      var isCurrent = pi4 === ship.orbitIdx;
      game.draw.circle(p4.x, p4.y, p4.r + 8, p4.col, 0.15);
      game.draw.circle(p4.x, p4.y, p4.r, p4.col, 0.9);
      // Shine
      game.draw.circle(p4.x - p4.r * 0.25, p4.y - p4.r * 0.25, p4.r * 0.2, '#fff', 0.3);
      if (isCurrent && !ship.launching) {
        game.draw.circle(p4.x, p4.y, p4.r + 16 + Math.sin(elapsed * 4) * 6, p4.col, 0.3);
      }
    }

    // Ship
    game.draw.circle(ship.x, ship.y, 16, C.shipHi, 0.3);
    game.draw.circle(ship.x, ship.y, 12, C.ship, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p5 = particles[pp2];
      game.draw.circle(p5.x, p5.y, 10 * p5.life, p5.col, p5.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 60 + mi * 120, H * 0.955, 22, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(reached + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.planet1 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    genPlanets();
  });
})(game);
