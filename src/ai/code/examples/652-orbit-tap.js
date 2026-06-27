// 652-orbit-tap.js
// オービットタップ — 軌道上の衛星を決めたタイミングでタップしろ
// 操作: タップで通過ゾーンを狙う
// 成功: 20回ゾーン通過  失敗: 10回外す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020408',
    orbit1:  '#1e3a5f',
    orbit2:  '#164e63',
    orbit3:  '#1e1b4b',
    planet:  '#1d4ed8',
    planetHi:'#60a5fa',
    sat:     '#f59e0b',
    satHi:   '#fde68a',
    zone:    '#22c55e',
    zoneHi:  '#86efac',
    hit:     '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030609'
  };

  var CX = W / 2, CY = H * 0.5;

  // Three orbiting satellites
  var orbits = [
    { r: 200, speed: 1.2, angle: 0, zoneAngle: 0 },
    { r: 330, speed: -0.85, angle: Math.PI * 0.7, zoneAngle: Math.PI * 0.3 },
    { r: 460, speed: 0.6, angle: Math.PI * 1.4, zoneAngle: Math.PI * 1.1 }
  ];

  var activeOrbit = 0;
  var correct = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.zone;
  var resultTimer = 0, resultText = '';
  var ZONE_HALF = 0.22; // radians — width of hit zone

  function nextOrbit() {
    activeOrbit = Math.floor(Math.random() * orbits.length);
    // Randomize zone position
    orbits[activeOrbit].zoneAngle = Math.random() * Math.PI * 2;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var orb = orbits[activeOrbit];
    var satX = CX + Math.cos(orb.angle) * orb.r;
    var satY = CY + Math.sin(orb.angle) * orb.r;
    var zoneX = CX + Math.cos(orb.zoneAngle) * orb.r;
    var zoneY = CY + Math.sin(orb.zoneAngle) * orb.r;

    var dx = tx - satX, dy = ty - satY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    // Check if tap is near satellite AND satellite is near zone
    var angleDiff = Math.abs(((orb.angle - orb.zoneAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    var isInZone = angleDiff < ZONE_HALF;
    var isTapOnSat = dist < 80;

    if (isTapOnSat && isInZone) {
      correct++;
      flashCol = C.zone;
      flashAnim = 0.25;
      resultText = '通過！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.5);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: satX, y: satY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.satHi });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correct * 300 + Math.ceil(timeLeft) * 80); }, 700);
        return;
      }
      nextOrbit();
    } else if (isTapOnSat) {
      misses++;
      flashCol = C.hit;
      flashAnim = 0.3;
      resultText = '早すぎ/遅すぎ';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (resultTimer > 0) resultTimer -= dt;

    for (var i = 0; i < orbits.length; i++) {
      var speedMult = 1 + elapsed * 0.008;
      orbits[i].angle += orbits[i].speed * speedMult * dt;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var st = 0; st < 35; st++) {
      var sx = (st * 59 + 13) % W;
      var sy = (st * 83 + 17) % H;
      game.draw.circle(sx, sy, 2, '#8888aa', 0.2 + Math.sin(elapsed * 0.5 + st) * 0.1);
    }

    // Orbit rings
    var orbitCols = [C.orbit1, C.orbit2, C.orbit3];
    for (var oi = 0; oi < orbits.length; oi++) {
      var orb = orbits[oi];
      // Draw orbit as dotted ring
      for (var dot = 0; dot < 36; dot++) {
        var da = (dot / 36) * Math.PI * 2;
        var dx2 = CX + Math.cos(da) * orb.r;
        var dy2 = CY + Math.sin(da) * orb.r;
        game.draw.circle(dx2, dy2, 4, orbitCols[oi], oi === activeOrbit ? 0.4 : 0.2);
      }

      // Zone indicator (only for active orbit)
      if (oi === activeOrbit) {
        for (var za = -10; za <= 10; za++) {
          var zAngle = orb.zoneAngle + za * (ZONE_HALF / 10);
          var zx = CX + Math.cos(zAngle) * orb.r;
          var zy = CY + Math.sin(zAngle) * orb.r;
          game.draw.circle(zx, zy, 12, C.zone, 0.35 - Math.abs(za) * 0.03);
        }
      }

      // Satellite
      var satX2 = CX + Math.cos(orb.angle) * orb.r;
      var satY2 = CY + Math.sin(orb.angle) * orb.r;
      var isActive = oi === activeOrbit;
      var satAlpha = isActive ? 0.9 : 0.5;
      // Glow if near zone
      if (isActive) {
        var ad = Math.abs(((orb.angle - orb.zoneAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (ad < ZONE_HALF * 2) {
          var glow = 1 - ad / (ZONE_HALF * 2);
          game.draw.circle(satX2, satY2, 56, C.zone, glow * 0.3);
        }
      }
      game.draw.circle(satX2 + 4, satY2 + 4, 32, '#000', 0.3);
      game.draw.circle(satX2, satY2, 32, isActive ? C.sat : '#64748b', satAlpha);
      game.draw.circle(satX2 - 8, satY2 - 8, 12, C.satHi, satAlpha * 0.5);
    }

    // Planet
    game.draw.circle(CX + 8, CY + 8, 60, '#000', 0.4);
    game.draw.circle(CX, CY, 60, C.planet, 0.9);
    game.draw.circle(CX - 18, CY - 18, 22, C.planetHi, 0.4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 64, color: flashCol, bold: true });
    }
    game.draw.text('軌道 ' + (activeOrbit + 1), W / 2, H * 0.92, { size: 32, color: orbitCols[activeOrbit] });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.hit : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.zone : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    nextOrbit();
  });
})(game);
