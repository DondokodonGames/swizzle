// 698-orbit.js
// 軌道捕獲 — 飛んでくる小惑星をタップして引力圏に捕まえろ
// 操作: タップで小惑星を引力圏に引き込む（近い小惑星に作用）
// 成功: 20個捕獲  失敗: 15個逃した or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#00020a',
    planet:  '#4f46e5',
    planHi:  '#818cf8',
    asteroid:'#92400e',
    astHi:   '#d97706',
    orbit:   '#1e1b4b',
    captured:'#22c55e',
    escaped: '#ef4444',
    text:    '#f1f5f9',
    ui:      '#02040f',
    star:    '#ffffff'
  };

  var CX = W / 2;
  var CY = H * 0.45;
  var PLANET_R = 110;
  var CAPTURE_R = 320;
  var AST_R = 28;

  var asteroids = [];
  var spawnTimer = 0;
  var SPAWN_RATE = 1.4;

  var captured = 0;
  var escaped = 0;
  var NEEDED = 20;
  var MAX_ESCAPE = 15;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.captured;
  var stars = [];
  var orbitingDebris = [];

  // Generate static stars
  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2.5 + 0.5, bright: Math.random() });
  }

  function spawnAsteroid() {
    // Spawn from random screen edge
    var side = Math.floor(Math.random() * 4);
    var sx, sy, vx, vy;
    var speed = 180 + Math.random() * 120 + elapsed * 2;
    if (side === 0) { sx = Math.random() * W; sy = -40; }
    else if (side === 1) { sx = W + 40; sy = Math.random() * H; }
    else if (side === 2) { sx = Math.random() * W; sy = H + 40; }
    else { sx = -40; sy = Math.random() * H; }

    // Aim roughly toward planet with some offset
    var dx = CX + (Math.random() - 0.5) * 400 - sx;
    var dy = CY + (Math.random() - 0.5) * 400 - sy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    vx = dx / dist * speed;
    vy = dy / dist * speed;

    asteroids.push({
      x: sx, y: sy, vx: vx, vy: vy,
      r: AST_R + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
      pulled: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find closest asteroid to tap point (within 120px)
    var best = -1;
    var bestDist = 160 * 160;
    for (var i = 0; i < asteroids.length; i++) {
      var a = asteroids[i];
      if (a.pulled) continue;
      var dx = tx - a.x;
      var dy = ty - a.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < bestDist) { bestDist = d2; best = i; }
    }
    if (best >= 0) {
      asteroids[best].pulled = true;
      game.audio.play('se_tap', 0.12);
      for (var p = 0; p < 3; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: asteroids[best].x, y: asteroids[best].y, vx: Math.cos(pa)*100, vy: Math.sin(pa)*100, life: 0.4, col: C.astHi });
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
    if (flashAnim > 0) flashAnim -= dt * 3;

    spawnTimer += dt;
    var rate = Math.max(0.7, SPAWN_RATE - elapsed * 0.01);
    if (spawnTimer >= rate) { spawnTimer = 0; spawnAsteroid(); }

    // Update asteroids
    for (var i = asteroids.length - 1; i >= 0; i--) {
      var a = asteroids[i];
      a.phase += dt * 2;

      if (a.pulled) {
        // Pull toward planet
        var dx = CX - a.x;
        var dy = CY - a.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          var pullStr = 800 / dist;
          a.vx += dx / dist * pullStr * dt * 60;
          a.vy += dy / dist * pullStr * dt * 60;
        }
      }

      a.x += a.vx * dt;
      a.y += a.vy * dt;

      // Captured by planet
      var dx2 = a.x - CX;
      var dy2 = a.y - CY;
      var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (dist2 < PLANET_R + a.r) {
        captured++;
        flashCol = C.captured;
        flashAnim = 0.25;
        game.audio.play('se_tap', 0.2);
        // Add debris to orbit
        var angle = Math.atan2(dy2, dx2);
        orbitingDebris.push({ angle: angle, r: PLANET_R + 30 + Math.random() * 60, speed: 0.5 + Math.random() * 0.8, size: a.r * 0.5, life: 8 });
        for (var p2 = 0; p2 < 5; p2++) {
          var pa2 = Math.random() * Math.PI * 2;
          particles.push({ x: a.x, y: a.y, vx: Math.cos(pa2)*160, vy: Math.sin(pa2)*160, life: 0.5, col: C.captured });
        }
        asteroids.splice(i, 1);
        if (captured >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(captured * 400 + Math.ceil(timeLeft) * 100); }, 700);
        }
        continue;
      }

      // Escaped (off-screen far or missed planet and out of bounds)
      var offW = 200;
      if (a.x < -offW || a.x > W + offW || a.y < -offW || a.y > H + offW) {
        if (!a.pulled || (a.x < -offW || a.x > W + offW || a.y < -offW || a.y > H + offW)) {
          escaped++;
          flashCol = C.escaped;
          flashAnim = 0.3;
          asteroids.splice(i, 1);
          if (escaped >= MAX_ESCAPE && !done) {
            done = true;
            game.audio.play('se_failure', 0.6);
            setTimeout(function() { game.end.failure(); }, 500);
          }
          continue;
        }
      }
    }

    // Update orbiting debris
    for (var od = orbitingDebris.length - 1; od >= 0; od--) {
      orbitingDebris[od].angle += orbitingDebris[od].speed * dt;
      orbitingDebris[od].life -= dt;
      if (orbitingDebris[od].life <= 0) orbitingDebris.splice(od, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var sti = 0; sti < stars.length; sti++) {
      var s = stars[sti];
      var twinkle = 0.3 + 0.7 * Math.abs(Math.sin(elapsed * 0.8 + s.bright * 10));
      game.draw.circle(s.x, s.y, s.r, C.star, twinkle * 0.6);
    }

    // Capture radius ring
    game.draw.circle(CX, CY, CAPTURE_R, C.orbit, 0.12);
    game.draw.circle(CX, CY, CAPTURE_R + 8, C.orbit, 0.04);

    // Orbiting debris
    for (var od2 = 0; od2 < orbitingDebris.length; od2++) {
      var odb = orbitingDebris[od2];
      var ox = CX + Math.cos(odb.angle) * odb.r;
      var oy = CY + Math.sin(odb.angle) * odb.r;
      game.draw.circle(ox, oy, odb.size, C.astHi, Math.min(1, odb.life) * 0.7);
    }

    // Planet
    game.draw.circle(CX + 8, CY + 8, PLANET_R, '#000', 0.4);
    game.draw.circle(CX, CY, PLANET_R, C.planet, 0.9);
    game.draw.circle(CX - PLANET_R * 0.25, CY - PLANET_R * 0.3, PLANET_R * 0.35, C.planHi, 0.25);
    game.draw.circle(CX, CY, PLANET_R * 0.4, C.planHi, 0.12);

    // Asteroids
    for (var ai = 0; ai < asteroids.length; ai++) {
      var ast = asteroids[ai];
      var aCol = ast.pulled ? C.captured : C.asteroid;
      game.draw.circle(ast.x + 3, ast.y + 3, ast.r, '#000', 0.3);
      game.draw.circle(ast.x, ast.y, ast.r, aCol, 0.9);
      if (ast.pulled) {
        // Gravity trail
        var dx3 = CX - ast.x;
        var dy3 = CY - ast.y;
        var td = Math.sqrt(dx3 * dx3 + dy3 * dy3);
        if (td > 0) {
          game.draw.line(ast.x, ast.y, ast.x + dx3 / td * 60, ast.y + dy3 / td * 60, C.captured, 2);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.07);

    // Escape counter
    game.draw.text('逃: ' + escaped + '/' + MAX_ESCAPE, W * 0.2, 148, { size: 40, color: C.escaped, bold: true });
    game.draw.text(captured + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.captured : C.escaped);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    spawnAsteroid();
    spawnAsteroid();
  });
})(game);
