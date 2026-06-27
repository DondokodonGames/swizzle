// 610-orbit-guard.js
// オービットガード — 惑星を周回しながら飛来する隕石を撃ち落とせ
// 操作: タップで現在の軌道角度に弾を発射
// 成功: 25隕石撃破  失敗: 3個着弾 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#000814',
    planet:   '#2563eb',
    planetHi: '#60a5fa',
    orbit:    '#1e3a5f',
    guard:    '#f59e0b',
    guardHi:  '#fde68a',
    bullet:   '#fbbf24',
    meteor:   '#dc2626',
    meteorHi: '#fca5a5',
    hit:      '#22c55e',
    text:     '#f1f5f9',
    ui:       '#0a1628',
    miss:     '#ef4444'
  };

  var CX = W / 2, CY = H * 0.45;
  var PLANET_R = 90;
  var ORBIT_R = 220;
  var GUARD_R = 28;

  var guardAngle = 0;
  var guardSpeed = 1.8; // rad/s
  var bullets = [];
  var meteors = [];
  var killed = 0;
  var NEEDED = 25;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.hit;
  var spawnTimer = 0;
  var stars = [];

  for (var si = 0; si < 70; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.5, phase: Math.random() * Math.PI * 2 });
  }

  function spawnMeteor() {
    var ang = Math.random() * Math.PI * 2;
    var spawnR = 600;
    var mx = CX + Math.cos(ang) * spawnR;
    var my = CY + Math.sin(ang) * spawnR;
    var speed = 150 + Math.random() * 100 + elapsed * 2;
    var dx = CX - mx, dy = CY - my;
    var dist = Math.sqrt(dx * dx + dy * dy);
    meteors.push({
      x: mx, y: my,
      vx: dx / dist * speed,
      vy: dy / dist * speed,
      r: 22 + Math.random() * 18,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 4
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Fire bullet from guard position outward
    var gx = CX + Math.cos(guardAngle) * ORBIT_R;
    var gy = CY + Math.sin(guardAngle) * ORBIT_R;
    var outAng = guardAngle;
    var speed = 800;
    bullets.push({
      x: gx, y: gy,
      vx: Math.cos(outAng) * speed,
      vy: Math.sin(outAng) * speed,
      life: 1.2
    });
    game.audio.play('se_tap', 0.3);
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

    guardAngle += guardSpeed * dt;

    // Spawn meteors
    spawnTimer += dt;
    var spawnRate = Math.max(0.6, 2.0 - elapsed * 0.02);
    if (spawnTimer > spawnRate) {
      spawnTimer = 0;
      spawnMeteor();
    }

    // Update meteors
    for (var mi = meteors.length - 1; mi >= 0; mi--) {
      var m = meteors[mi];
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rot += m.rotV * dt;
      var dx = m.x - CX, dy = m.y - CY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PLANET_R + m.r) {
        // Hit planet
        hits++;
        meteors.splice(mi, 1);
        flashCol = C.miss;
        flashAnim = 0.4;
        game.audio.play('se_failure', 0.5);
        for (var p = 0; p < 8; p++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: m.x, y: m.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.meteorHi });
        }
        if (hits >= MAX_HITS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    // Update bullets
    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var b = bullets[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) { bullets.splice(bi, 1); continue; }

      // Bullet vs meteor collision
      var hitMeteor = false;
      for (var mi2 = meteors.length - 1; mi2 >= 0; mi2--) {
        var m2 = meteors[mi2];
        var bx = b.x - m2.x, by = b.y - m2.y;
        if (bx * bx + by * by < m2.r * m2.r) {
          killed++;
          bullets.splice(bi, 1);
          for (var p2 = 0; p2 < 10; p2++) {
            var a2 = Math.random() * Math.PI * 2;
            particles.push({ x: m2.x, y: m2.y, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180, life: 0.5, col: C.meteorHi });
          }
          meteors.splice(mi2, 1);
          flashCol = C.hit;
          flashAnim = 0.2;
          game.audio.play('se_success', 0.5);
          hitMeteor = true;
          if (killed >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(killed * 300 + Math.ceil(timeLeft) * 100); }, 700);
          }
          break;
        }
      }
      if (hitMeteor) continue;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    for (var sti = 0; sti < stars.length; sti++) {
      stars[sti].phase += dt;
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var sti2 = 0; sti2 < stars.length; sti2++) {
      var st = stars[sti2];
      game.draw.circle(st.x, st.y, st.r, '#fff', 0.3 + Math.sin(st.phase) * 0.2);
    }

    // Orbit ring
    game.draw.circle(CX, CY, ORBIT_R + 6, C.orbit, 0.3);
    game.draw.circle(CX, CY, ORBIT_R, C.orbit, 0.5);

    // Planet
    game.draw.circle(CX, CY, PLANET_R + 20, C.planet, 0.1);
    game.draw.circle(CX, CY, PLANET_R, C.planet, 0.9);
    game.draw.circle(CX - 28, CY - 28, PLANET_R * 0.35, C.planetHi, 0.4);
    game.draw.circle(CX + 20, CY + 20, PLANET_R * 0.18, C.planetHi, 0.25);

    // Meteors
    for (var mi3 = 0; mi3 < meteors.length; mi3++) {
      var m3 = meteors[mi3];
      game.draw.circle(m3.x, m3.y, m3.r + 4, C.meteorHi, 0.15);
      game.draw.circle(m3.x, m3.y, m3.r, C.meteor, 0.9);
      game.draw.circle(m3.x - m3.r * 0.3, m3.y - m3.r * 0.3, m3.r * 0.3, C.meteorHi, 0.5);
    }

    // Guard
    var gx2 = CX + Math.cos(guardAngle) * ORBIT_R;
    var gy2 = CY + Math.sin(guardAngle) * ORBIT_R;
    game.draw.circle(gx2, gy2, GUARD_R + 8, C.guardHi, 0.2);
    game.draw.circle(gx2, gy2, GUARD_R, C.guard, 0.9);
    game.draw.circle(gx2 - 8, gy2 - 8, GUARD_R * 0.3, C.guardHi, 0.6);

    // Bullets
    for (var bi2 = 0; bi2 < bullets.length; bi2++) {
      var b2 = bullets[bi2];
      game.draw.circle(b2.x, b2.y, 10, C.bullet, b2.life);
      game.draw.circle(b2.x, b2.y, 5, C.guardHi, 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 10 * p3.life, p3.col, p3.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 80 + hi * 160, H * 0.955, 28, hi < hits ? C.miss : C.ui, 0.9);
    }

    game.draw.text(killed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.guard : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnMeteor();
    spawnMeteor();
  });
})(game);
