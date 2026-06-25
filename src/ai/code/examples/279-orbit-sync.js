// 279-orbit-sync.js
// オービットシンク — 複数の惑星を同時に同じ位置へ合わせる天体同期パズル
// 操作: タップで惑星の公転速度を切り替え
// 成功: 全惑星を同時に目標位置に合わせる5回  失敗: 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#03010f',
    space:   '#060820',
    star:    '#fde68a',
    sun:     '#f59e0b',
    sunHi:   '#fef3c7',
    p1:      '#3b82f6',
    p1Hi:    '#93c5fd',
    p2:      '#22c55e',
    p2Hi:    '#86efac',
    p3:      '#ef4444',
    p3Hi:    '#fca5a5',
    target:  '#fde68a',
    targetA: '#fff',
    orbit:   '#1e293b',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var CX = W / 2, CY = H * 0.46;

  var PLANETS = [
    { orbitR: 120, angle: 0, speeds: [0.8, 1.6], speedIdx: 0, r: 22, col: C.p1, hiCol: C.p1Hi, target: 0 },
    { orbitR: 210, angle: Math.PI / 3, speeds: [0.5, 1.0], speedIdx: 0, r: 28, col: C.p2, hiCol: C.p2Hi, target: Math.PI * 1.5 },
    { orbitR: 310, angle: Math.PI, speeds: [0.3, 0.6], speedIdx: 0, r: 24, col: C.p3, hiCol: C.p3Hi, target: Math.PI }
  ];

  var synced = 0;
  var NEEDED = 5;
  var syncCooldown = 0;
  var SYNC_WINDOW = 0.15; // radians tolerance
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var syncFlash = 0;
  var particles = [];
  var stars = [];

  for (var si = 0; si < 100; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.3 });
  }

  function angDiff(a, b) {
    var d = ((a - b) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    return Math.abs(d);
  }

  function checkSync() {
    for (var pi = 0; pi < PLANETS.length; pi++) {
      if (angDiff(PLANETS[pi].angle, PLANETS[pi].target) > SYNC_WINDOW) return false;
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find closest planet
    for (var pi = 0; pi < PLANETS.length; pi++) {
      var px = CX + Math.cos(PLANETS[pi].angle) * PLANETS[pi].orbitR;
      var py = CY + Math.sin(PLANETS[pi].angle) * PLANETS[pi].orbitR;
      var dx = tx - px, dy = ty - py;
      if (dx * dx + dy * dy < 60 * 60) {
        PLANETS[pi].speedIdx = 1 - PLANETS[pi].speedIdx;
        game.audio.play('se_tap', 0.3);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (syncCooldown > 0) syncCooldown -= dt;
    if (syncFlash > 0) syncFlash -= dt;

    // Orbit planets
    for (var pi = 0; pi < PLANETS.length; pi++) {
      var spd = PLANETS[pi].speeds[PLANETS[pi].speedIdx];
      PLANETS[pi].angle += spd * dt;
      if (PLANETS[pi].angle > Math.PI * 2) PLANETS[pi].angle -= Math.PI * 2;
    }

    // Randomize targets after sync
    if (syncCooldown <= 0 && checkSync()) {
      synced++;
      syncFlash = 0.8;
      syncCooldown = 1.5;
      game.audio.play('se_success', 0.8);
      for (var pi2 = 0; pi2 < PLANETS.length; pi2++) {
        PLANETS[pi2].target = Math.random() * Math.PI * 2;
        var px2 = CX + Math.cos(PLANETS[pi2].angle) * PLANETS[pi2].orbitR;
        var py2 = CY + Math.sin(PLANETS[pi2].angle) * PLANETS[pi2].orbitR;
        for (var pi3 = 0; pi3 < 6; pi3++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: px2, y: py2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.6, col: PLANETS[pi2].hiCol });
        }
      }
      if (synced >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(synced * 300 + Math.ceil(timeLeft) * 100); }, 500);
        return;
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
    if (syncFlash > 0) game.draw.rect(0, 0, W, H, C.sunHi, syncFlash * 0.15);

    for (var si2 = 0; si2 < stars.length; si2++) {
      var s = stars[si2];
      game.draw.circle(s.x, s.y, s.r, C.star, 0.4 + 0.3 * Math.abs(Math.sin(elapsed + si2)));
    }

    // Orbits
    for (var pi4 = 0; pi4 < PLANETS.length; pi4++) {
      var p = PLANETS[pi4];
      // Orbit ring (approximate with line segments)
      var segs = 48;
      for (var sg = 0; sg < segs; sg++) {
        var a1 = (sg / segs) * Math.PI * 2;
        var a2 = ((sg + 1) / segs) * Math.PI * 2;
        game.draw.line(
          CX + Math.cos(a1) * p.orbitR, CY + Math.sin(a1) * p.orbitR,
          CX + Math.cos(a2) * p.orbitR, CY + Math.sin(a2) * p.orbitR,
          C.orbit, 2
        );
      }
      // Target marker
      var tx2 = CX + Math.cos(p.target) * p.orbitR;
      var ty2 = CY + Math.sin(p.target) * p.orbitR;
      game.draw.circle(tx2, ty2, p.r + 10, C.target, 0.6 + 0.2 * Math.sin(elapsed * 4));
      game.draw.circle(tx2, ty2, p.r + 10, C.targetA, 0.2);
    }

    // Sun
    game.draw.circle(CX, CY, 50 + 5 * Math.sin(elapsed * 2), C.sun, 0.9);
    game.draw.circle(CX, CY, 35, C.sunHi, 0.8);
    game.draw.circle(CX, CY, 70, C.sun, 0.15);

    // Planets
    for (var pi5 = 0; pi5 < PLANETS.length; pi5++) {
      var p2 = PLANETS[pi5];
      var px3 = CX + Math.cos(p2.angle) * p2.orbitR;
      var py3 = CY + Math.sin(p2.angle) * p2.orbitR;
      var isClose = angDiff(p2.angle, p2.target) < SYNC_WINDOW * 2;
      game.draw.circle(px3, py3, p2.r + (isClose ? 6 : 0), p2.col, 0.9);
      game.draw.circle(px3 - p2.r * 0.3, py3 - p2.r * 0.3, p2.r * 0.25, p2.hiCol, 0.6);
      // Speed indicator
      var spd2 = p2.speeds[p2.speedIdx];
      var maxSpd = p2.speeds[1];
      game.draw.text(spd2 > p2.speeds[0] ? '速' : '遅', px3, py3 + p2.r + 20, { size: 26, color: p2.hiCol });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var pt = particles[pp2];
      game.draw.circle(pt.x, pt.y, 8 * pt.life * 1.7, pt.col, pt.life * 0.8);
    }

    game.draw.text('タップで速度切替', W / 2, H * 0.87, { size: 38, color: C.ui });
    game.draw.text('目標: ○印に合わせる', W / 2, H * 0.91, { size: 36, color: C.ui });
    game.draw.text(synced + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.p2 : C.p3);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
  });
})(game);
