// 216-orbit-catch.js
// オービットキャッチ — 惑星の引力で弧を描いて飛んでくる隕石を軌道上でキャッチ
// 操作: タップで軌道上のネット位置を指定
// 成功: 15個キャッチ  失敗: 5個取り逃がす or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020409',
    planet: '#1e3a5f',
    planHi: '#3b82f6',
    orbit:  '#1e293b',
    net:    '#22c55e',
    netHi:  '#86efac',
    meteor: '#f59e0b',
    metHi:  '#fde68a',
    miss:   '#ef4444',
    stars:  '#334155',
    ui:     '#475569'
  };

  var CX = W / 2;
  var CY = H * 0.5;
  var PLANET_R = 80;
  var ORBIT_R = 280;
  var NET_ARC = 0.18; // catch arc half-width in radians
  var NET_SIZE = 30;

  var netAngle = -Math.PI / 2; // top
  var meteors = [];
  var stars = [];
  var caught = 0;
  var missed = 0;
  var MAX_MISS = 5;
  var NEEDED = 15;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 2.5;
  var particles = [];

  // Generate background stars
  for (var si = 0; si < 60; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2 });
  }

  function spawnMeteor() {
    var startAngle = Math.random() * Math.PI * 2;
    var startX = CX + Math.cos(startAngle) * (W * 0.7);
    var startY = CY + Math.sin(startAngle) * (H * 0.7);
    var speed = 250 + Math.random() * 150;
    // Direction roughly toward planet
    var dx = CX - startX, dy = CY - startY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var offset = (Math.random() - 0.5) * 200;
    meteors.push({
      x: startX, y: startY,
      vx: (dx / dist) * speed + dy / dist * offset / 2,
      vy: (dy / dist) * speed - dx / dist * offset / 2,
      r: 16 + Math.random() * 12,
      orbitAngle: -1, // -1 = not in orbit
      orbitDir: Math.random() < 0.5 ? 1 : -1,
      orbitSpeed: 1.2 + Math.random() * 0.8,
      orbiting: false,
      missed: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var dx = tx - CX, dy = ty - CY;
    netAngle = Math.atan2(dy, dx);
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Spawn meteors
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnMeteor();
      spawnTimer = SPAWN_INTERVAL * (0.7 + Math.random() * 0.6);
    }

    // Update meteors
    for (var mi = meteors.length - 1; mi >= 0; mi--) {
      var m = meteors[mi];

      if (!m.orbiting) {
        // Gravitational pull toward planet
        var dx = CX - m.x, dy = CY - m.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < PLANET_R + m.r) {
          // Hit planet — remove
          meteors.splice(mi, 1);
          if (!m.missed) {
            missed++;
            game.audio.play('se_failure', 0.3);
            if (missed >= MAX_MISS && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 400);
            }
          }
          continue;
        }

        if (dist < ORBIT_R + 40) {
          // Enter orbit
          m.orbiting = true;
          m.orbitAngle = Math.atan2(m.y - CY, m.x - CX);
        } else {
          // Gravity attraction
          var grav = 30000 / (dist * dist);
          m.vx += (dx / dist) * grav * dt;
          m.vy += (dy / dist) * grav * dt;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
        }
      } else {
        // Move along orbit
        m.orbitAngle += m.orbitDir * m.orbitSpeed * dt;
        m.x = CX + Math.cos(m.orbitAngle) * ORBIT_R;
        m.y = CY + Math.sin(m.orbitAngle) * ORBIT_R;

        // Check catch
        var angleDiff = m.orbitAngle - netAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (Math.abs(angleDiff) < NET_ARC && !m.caught) {
          m.caught = true;
          caught++;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: m.x, y: m.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.5 });
          }
          meteors.splice(mi, 1);
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(caught * 80 + Math.ceil(timeLeft) * 30); }, 400);
          }
          continue;
        }

        // Fall past — goes around again, eventually count as miss after 2 laps
        m.laps = (m.laps || 0);
        if (Math.abs(m.orbitAngle - m.startOrbitAngle) > Math.PI * 4) {
          meteors.splice(mi, 1);
          if (!m.missed) {
            missed++;
            if (missed >= MAX_MISS && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 400);
            }
          }
          continue;
        }
        if (!m.startOrbitAngle) m.startOrbitAngle = m.orbitAngle;
      }
    }

    // Particles
    for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].life -= dt;
      if (particles[pi2].life <= 0) particles.splice(pi2, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var sti = 0; sti < stars.length; sti++) {
      game.draw.circle(stars[sti].x, stars[sti].y, stars[sti].r, '#fff', 0.3 + Math.random() * 0.05);
    }

    // Orbit ring
    for (var a = 0; a < Math.PI * 2; a += 0.04) {
      game.draw.circle(CX + Math.cos(a) * ORBIT_R, CY + Math.sin(a) * ORBIT_R, 3, C.orbit, 0.6);
    }

    // Planet
    game.draw.circle(CX, CY, PLANET_R + 12, C.planHi, 0.15);
    game.draw.circle(CX, CY, PLANET_R, C.planet, 0.95);
    game.draw.circle(CX - PLANET_R * 0.3, CY - PLANET_R * 0.3, PLANET_R * 0.2, '#3b82f6', 0.3);

    // Net
    var nx = CX + Math.cos(netAngle) * ORBIT_R;
    var ny = CY + Math.sin(netAngle) * ORBIT_R;
    var pulse = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 4));
    game.draw.circle(nx, ny, NET_SIZE + 10, C.netHi, pulse * 0.3);
    game.draw.circle(nx, ny, NET_SIZE, C.net, 0.8);
    game.draw.text('⬡', nx, ny, { size: 36, color: '#fff', bold: true });

    // Meteors
    for (var mi2 = 0; mi2 < meteors.length; mi2++) {
      var m2 = meteors[mi2];
      game.draw.circle(m2.x, m2.y, m2.r + 5, C.metHi, 0.2);
      game.draw.circle(m2.x, m2.y, m2.r, C.meteor, 0.85);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var p = particles[pp];
      game.draw.circle(p.x, p.y, 10 * p.life, C.netHi, p.life * 0.8);
    }

    // Miss hearts
    for (var mi3 = 0; mi3 < MAX_MISS; mi3++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 30 + mi3 * 60, 210, 18, mi3 < missed ? C.miss : '#0a0a14');
      if (mi3 >= missed) game.draw.circle(W / 2 - (MAX_MISS - 1) * 30 + mi3 * 60, 210, 14, '#22c55e', 0.3);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    game.draw.text('タップで網を移動', W / 2, H * 0.93, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.net : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    spawnTimer = 0.5;
  });
})(game);
