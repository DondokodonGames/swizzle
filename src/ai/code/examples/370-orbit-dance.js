// 370-orbit-dance.js
// オービットダンス — 軌道上の惑星を衝突させずにスワイプで方向転換
// 操作: スワイプで全惑星の回転方向を反転
// 成功: 90秒生き延びる  失敗: 惑星同士が衝突

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020212',
    star:   '#f1f5f9',
    sun:    '#fbbf24',
    sunHi:  '#fef3c7',
    p1:     '#3b82f6',
    p1Hi:   '#93c5fd',
    p2:     '#ef4444',
    p2Hi:   '#fca5a5',
    p3:     '#22c55e',
    p3Hi:   '#86efac',
    p4:     '#a855f7',
    p4Hi:   '#d8b4fe',
    trail:  '#475569',
    danger: '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var cx = W / 2;
  var cy = H * 0.48;

  var planets = [
    { r: 200, angle: 0,        speed: 1.2,  size: 36, col: C.p1, hi: C.p1Hi },
    { r: 320, angle: Math.PI,  speed: 0.9,  size: 44, col: C.p2, hi: C.p2Hi },
    { r: 420, angle: Math.PI/2, speed: 0.65, size: 38, col: C.p3, hi: C.p3Hi },
    { r: 520, angle: Math.PI*1.5, speed: 0.45, size: 30, col: C.p4, hi: C.p4Hi }
  ];

  var dir = 1;        // +1 or -1 for all planets
  var survived = 0;
  var GOAL = 90;
  var done = false;
  var elapsed = 0;
  var timeLeft = 90;
  var particles = [];
  var stars = [];
  var trails = [];
  var collisionFlash = 0;

  // Star field
  for (var si = 0; si < 80; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2 });
  }

  function initTrails() {
    trails = planets.map(function() { return []; });
  }

  game.onSwipe(function() {
    if (done) return;
    dir *= -1;
    game.audio.play('se_tap', 0.3);
    for (var pi = 0; pi < 4; pi++) {
      var ang2 = Math.random() * Math.PI * 2;
      particles.push({ x: cx, y: cy, vx: Math.cos(ang2)*180, vy: Math.sin(ang2)*180, life:0.4, col: C.sun });
    }
  });

  game.onTap(function() {
    if (done) return;
    dir *= -1;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      survived = elapsed;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.8);
        game.end.success(Math.round(survived * 100));
        return;
      }
    }

    if (collisionFlash > 0) collisionFlash -= dt * 4;

    // Update planets
    for (var pi2 = 0; pi2 < planets.length; pi2++) {
      planets[pi2].angle += planets[pi2].speed * dir * dt;
      var px = cx + Math.cos(planets[pi2].angle) * planets[pi2].r;
      var py = cy + Math.sin(planets[pi2].angle) * planets[pi2].r;
      planets[pi2].x = px;
      planets[pi2].y = py;
      // Trail
      trails[pi2].push({ x: px, y: py, life: 0.6 });
      if (trails[pi2].length > 30) trails[pi2].shift();
    }

    // Update trails
    for (var ti = 0; ti < trails.length; ti++) {
      for (var tj = trails[ti].length - 1; tj >= 0; tj--) {
        trails[ti][tj].life -= dt * 1.5;
        if (trails[ti][tj].life <= 0) trails[ti].splice(tj, 1);
      }
    }

    // Collision detection
    for (var a = 0; a < planets.length; a++) {
      for (var b = a + 1; b < planets.length; b++) {
        var dist = Math.hypot(planets[a].x - planets[b].x, planets[a].y - planets[b].y);
        if (dist < planets[a].size + planets[b].size) {
          // Collision!
          collisionFlash = 1;
          game.audio.play('se_failure', 0.8);
          for (var pi3 = 0; pi3 < 20; pi3++) {
            var ang3 = Math.random() * Math.PI * 2;
            particles.push({ x: (planets[a].x + planets[b].x) / 2, y: (planets[a].y + planets[b].y) / 2, vx: Math.cos(ang3)*300, vy: Math.sin(ang3)*300, life:0.8, col: C.danger });
          }
          if (!done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 800);
          }
          return;
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

    if (collisionFlash > 0) game.draw.rect(0, 0, W, H, C.danger, collisionFlash * 0.2);

    // Stars
    for (var si2 = 0; si2 < stars.length; si2++) {
      var s = stars[si2];
      game.draw.circle(s.x, s.y, s.r, C.star, 0.4 + Math.sin(elapsed * 2 + si2) * 0.2);
    }

    // Orbits
    for (var oi = 0; oi < planets.length; oi++) {
      // Approximate circle with lines
      for (var oa = 0; oa < 60; oa++) {
        var aA = oa / 60 * Math.PI * 2;
        var aB = (oa + 1) / 60 * Math.PI * 2;
        game.draw.line(
          cx + Math.cos(aA) * planets[oi].r, cy + Math.sin(aA) * planets[oi].r,
          cx + Math.cos(aB) * planets[oi].r, cy + Math.sin(aB) * planets[oi].r,
          C.ui, 1
        );
      }
    }

    // Sun
    game.draw.circle(cx, cy, 60, C.sun, 0.9);
    game.draw.circle(cx, cy, 44, C.sunHi, 0.8);
    game.draw.circle(cx, cy, 80, C.sun, 0.1 + Math.sin(elapsed * 3) * 0.05);

    // Trails
    for (var ti2 = 0; ti2 < trails.length; ti2++) {
      var col = planets[ti2].col;
      for (var tj2 = 0; tj2 < trails[ti2].length; tj2++) {
        var t = trails[ti2][tj2];
        game.draw.circle(t.x, t.y, 6 * t.life, col, t.life * 0.4);
      }
    }

    // Planets
    for (var pi4 = 0; pi4 < planets.length; pi4++) {
      var p2 = planets[pi4];
      game.draw.circle(p2.x, p2.y, p2.size + 8, p2.col, 0.15);
      game.draw.circle(p2.x, p2.y, p2.size, p2.col, 0.9);
      game.draw.circle(p2.x - p2.size * 0.35, p2.y - p2.size * 0.35, p2.size * 0.3, p2.hi, 0.6);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var pt = particles[pp2];
      game.draw.circle(pt.x, pt.y, 7 * pt.life, pt.col, pt.life * 0.8);
    }

    // Direction hint
    game.draw.text(dir > 0 ? '→ 時計回り' : '← 反時計回り', W / 2, H * 0.87, { size: 38, color: C.ui });
    game.draw.text('タップ/スワイプで反転', W / 2, H * 0.92, { size: 32, color: C.trail });

    // Progress
    var prog = Math.min(1, survived / GOAL);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * prog, 72, prog < 0.7 ? C.p1 : C.p3);
    game.draw.text(Math.round(survived) + 's / ' + GOAL + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    initTrails();
  });
})(game);
