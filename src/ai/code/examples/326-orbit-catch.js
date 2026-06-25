// 326-orbit-catch.js
// オービットキャッチ — 軌道を周回する宇宙船でデブリをキャッチ
// 操作: タップで軌道切り替え（内側↔外側）
// 成功: 25個キャッチ  失敗: 8個逃す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020614',
    star:   '#e2e8f0',
    orbit1: '#1e3a5f',
    orbit2: '#1a2a4a',
    orbit3: '#152236',
    ship:   '#60a5fa',
    shipHi: '#bfdbfe',
    debris: '#f59e0b',
    debrisHi:'#fde68a',
    danger: '#ef4444',
    dangerHi:'#fca5a5',
    caught: '#22c55e',
    caughtHi:'#86efac',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var cx = W / 2, cy = H * 0.5;
  var ORBITS = [180, 300, 420]; // radii
  var shipOrbit = 1; // which orbit (0=inner, 1=mid, 2=outer)
  var shipAngle = -Math.PI / 2; // start at top
  var SHIP_SPEED = 1.8; // rad/sec

  var debris = [];
  var spawnTimer = 0;
  var caught = 0;
  var NEEDED = 25;
  var missed = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var stars = [];
  var switchAnim = 0;

  // Init starfield
  for (var s = 0; s < 60; s++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2, twinkle: Math.random() * Math.PI * 2 });
  }

  function spawnDebris() {
    var orbitIdx = Math.floor(Math.random() * 3);
    var startAngle = Math.random() * Math.PI * 2;
    // Travel speed (opposite or same direction as ship)
    var dir = Math.random() < 0.5 ? 1 : -1;
    debris.push({
      orbitIdx: orbitIdx,
      angle: startAngle,
      speed: (0.8 + Math.random() * 0.8) * dir,
      r: 22,
      collected: false
    });
  }

  game.onTap(function() {
    if (done) return;
    shipOrbit = (shipOrbit + 1) % 3;
    switchAnim = 0.3;
    game.audio.play('se_tap', 0.25);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (switchAnim > 0) switchAnim -= dt * 2;

    // Move ship
    shipAngle += SHIP_SPEED * dt;

    // Spawn debris
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnDebris();
      spawnTimer = 0.8 - Math.min(0.5, caught * 0.02);
    }

    // Update debris
    var shipR = ORBITS[shipOrbit];
    var shipX = cx + Math.cos(shipAngle) * shipR;
    var shipY = cy + Math.sin(shipAngle) * shipR;

    for (var di = debris.length - 1; di >= 0; di--) {
      var d = debris[di];
      d.angle += d.speed * dt;

      var dr = ORBITS[d.orbitIdx];
      var dx = cx + Math.cos(d.angle) * dr;
      var dy = cy + Math.sin(d.angle) * dr;
      d.x = dx; d.y = dy;

      // Catch check
      if (Math.hypot(dx - shipX, dy - shipY) < shipR * 0.12 + d.r + 20) {
        caught++;
        game.audio.play('se_success', 0.4);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: dx, y: dy, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160, life: 0.4, col: C.debrisHi });
        }
        debris.splice(di, 1);
        if (caught >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(caught * 120 + Math.ceil(timeLeft) * 80); }, 400);
        }
        continue;
      }

      // Remove if old (after 3 full rotations)
      if (Math.abs(d.angle) > Math.PI * 7 || (d.angle > Math.PI * 7)) {
        missed++;
        debris.splice(di, 1);
        if (missed >= MAX_MISS && !done) {
          done = true;
          game.audio.play('se_failure', 0.5);
          setTimeout(function() { game.end.failure(); }, 400);
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

    // Stars
    for (var si = 0; si < stars.length; si++) {
      var st = stars[si];
      var bri = 0.4 + 0.3 * Math.sin(elapsed * 2 + st.twinkle);
      game.draw.circle(st.x, st.y, st.r, C.star, bri);
    }

    // Planet
    game.draw.circle(cx, cy, 80, '#1e3a5f', 0.9);
    game.draw.circle(cx, cy, 60, '#1d4ed8', 0.8);
    game.draw.circle(cx - 20, cy - 20, 25, '#3b82f6', 0.5);

    // Orbit rings
    for (var oi = 0; oi < 3; oi++) {
      var isActive = oi === shipOrbit;
      game.draw.circle(cx, cy, ORBITS[oi], isActive ? C.ship : C.orbit1, isActive ? 0.25 : 0.15);
    }

    // Debris
    for (var di2 = 0; di2 < debris.length; di2++) {
      var d2 = debris[di2];
      if (!d2.x) continue;
      var dCol = d2.orbitIdx === shipOrbit ? C.debris : C.debrisHi;
      game.draw.circle(d2.x, d2.y, d2.r + 6, dCol, 0.2);
      game.draw.circle(d2.x, d2.y, d2.r, dCol, 0.8);
      game.draw.circle(d2.x - 6, d2.y - 6, 6, '#fff', 0.4);
    }

    // Ship
    var sR = ORBITS[shipOrbit];
    var sX = cx + Math.cos(shipAngle) * sR;
    var sY = cy + Math.sin(shipAngle) * sR;
    if (switchAnim > 0) {
      game.draw.circle(sX, sY, 40 + switchAnim * 30, C.shipHi, switchAnim * 0.4);
    }
    game.draw.circle(sX, sY, 32, C.ship, 0.9);
    game.draw.circle(sX - 8, sY - 8, 10, C.shipHi, 0.7);
    // Engine glow
    var trailAngle = shipAngle + Math.PI;
    game.draw.circle(sX + Math.cos(trailAngle) * 28, sY + Math.sin(trailAngle) * 28, 16, C.ship, 0.4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 20 + mi * 40, H * 0.9, 12, mi < missed ? C.danger : '#020614');
    }

    game.draw.text('タップで軌道変更', W / 2, H * 0.87, { size: 38, color: C.ui });

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ship : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnTimer = 0.5;
  });
})(game);
