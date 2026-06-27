// 630-firefly-jar.js
// ホタルのビン — 光るホタルをビンに捕まえろ、光が消える前に
// 操作: タップで光っているホタルを捕獲
// 成功: 20匹捕獲  失敗: 10匹逃がす or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020608',
    firefly: '#aaff44',
    ffHi:    '#ddff99',
    ffDark:  '#224400',
    jar:     '#335566',
    jarHi:   '#558899',
    jarGlass:'#aaddff',
    caught:  '#22c55e',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a1006',
    glow:    '#aaff4422'
  };

  var fireflies = [];
  var caught = 0;
  var NEEDED = 20;
  var escaped = 0;
  var MAX_ESCAPE = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.caught;
  var spawnTimer = 0;
  var jarX = W / 2, jarY = H * 0.9;
  var jarCaught = 0; // animated count in jar

  function spawnFirefly() {
    var x = 60 + Math.random() * (W - 120);
    var y = H * 0.15 + Math.random() * (H * 0.65);
    var ang = Math.random() * Math.PI * 2;
    fireflies.push({
      x: x, y: y,
      vx: Math.cos(ang) * 80,
      vy: Math.sin(ang) * 80,
      glowPhase: Math.random() * Math.PI * 2,
      glowSpeed: 1.5 + Math.random() * 2,
      glowOn: true,
      glowTimer: 0.5 + Math.random() * 1.5,
      r: 10 + Math.random() * 6,
      wanderTimer: 0,
      life: 5 + Math.random() * 8 // time before escaping
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitIdx = -1;
    var bestDist = 60;
    for (var fi = 0; fi < fireflies.length; fi++) {
      var ff = fireflies[fi];
      if (!ff.glowOn) continue; // only catchable when glowing
      var dx = tx - ff.x, dy = ty - ff.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; hitIdx = fi; }
    }
    if (hitIdx >= 0) {
      var ff2 = fireflies[hitIdx];
      caught++;
      jarCaught++;
      flashCol = C.caught;
      flashAnim = 0.2;
      game.audio.play('se_success', 0.5);
      for (var p = 0; p < 8; p++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: ff2.x, y: ff2.y, vx: Math.cos(ang2) * 120, vy: Math.sin(ang2) * 120, life: 0.4, col: C.ffHi });
      }
      fireflies.splice(hitIdx, 1);
      if (caught >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(caught * 300 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      // Miss flash
      flashCol = C.miss;
      flashAnim = 0.1;
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

    spawnTimer += dt;
    if (spawnTimer > Math.max(0.8, 2.0 - elapsed * 0.02) && fireflies.length < 12) {
      spawnTimer = 0;
      spawnFirefly();
    }

    for (var fi = fireflies.length - 1; fi >= 0; fi--) {
      var ff = fireflies[fi];
      ff.life -= dt;
      ff.glowPhase += ff.glowSpeed * dt;

      // Glow on/off timing
      ff.glowTimer -= dt;
      if (ff.glowTimer <= 0) {
        ff.glowOn = !ff.glowOn;
        ff.glowTimer = ff.glowOn ? (0.4 + Math.random() * 0.8) : (0.3 + Math.random() * 0.5);
      }

      // Wander
      ff.wanderTimer -= dt;
      if (ff.wanderTimer <= 0) {
        ff.wanderTimer = 0.5 + Math.random() * 1.0;
        var a3 = Math.random() * Math.PI * 2;
        ff.vx += Math.cos(a3) * 60;
        ff.vy += Math.sin(a3) * 60;
        // Limit speed
        var spd = Math.sqrt(ff.vx * ff.vx + ff.vy * ff.vy);
        if (spd > 120) { ff.vx = ff.vx / spd * 120; ff.vy = ff.vy / spd * 120; }
      }

      ff.x += ff.vx * dt;
      ff.y += ff.vy * dt;

      // Wall bounce
      if (ff.x < ff.r) { ff.x = ff.r; ff.vx = Math.abs(ff.vx); }
      if (ff.x > W - ff.r) { ff.x = W - ff.r; ff.vx = -Math.abs(ff.vx); }
      if (ff.y < H * 0.12) { ff.y = H * 0.12; ff.vy = Math.abs(ff.vy); }
      if (ff.y > H * 0.85) { ff.y = H * 0.85; ff.vy = -Math.abs(ff.vy); }

      // Life expired
      if (ff.life <= 0) {
        escaped++;
        fireflies.splice(fi, 1);
        flashCol = C.miss;
        flashAnim = 0.15;
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          game.audio.play('se_failure', 0.6);
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars background
    for (var st = 0; st < 30; st++) {
      var sx = (st * 37 + 13) % W;
      var sy = (st * 73 + 29) % (H * 0.8);
      game.draw.circle(sx, sy, 1.5, '#aaaacc', 0.2 + Math.sin(elapsed + st) * 0.1);
    }

    // Fireflies
    for (var fi2 = 0; fi2 < fireflies.length; fi2++) {
      var ff3 = fireflies[fi2];
      var glowAmt = ff3.glowOn ? (0.6 + Math.sin(ff3.glowPhase) * 0.4) : 0.0;
      // Glow aura
      if (ff3.glowOn) {
        game.draw.circle(ff3.x, ff3.y, ff3.r * 3, C.firefly, glowAmt * 0.2);
        game.draw.circle(ff3.x, ff3.y, ff3.r * 1.8, C.ffHi, glowAmt * 0.3);
      }
      // Body
      game.draw.circle(ff3.x, ff3.y, ff3.r, ff3.glowOn ? C.ffHi : C.ffDark, 0.9);
      // Life indicator (warning when close to escaping)
      if (ff3.life < 2) {
        var lifeAlpha = 0.4 + Math.sin(elapsed * 10) * 0.3;
        game.draw.circle(ff3.x, ff3.y, ff3.r + 8, C.miss, lifeAlpha * 0.4);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    // Jar at bottom
    var JW = 140, JH = 110;
    game.draw.rect(jarX - JW / 2, jarY - JH, JW, JH, C.jar, 0.8);
    game.draw.rect(jarX - JW / 2, jarY - JH, JW, 14, C.jarHi, 0.6);
    game.draw.rect(jarX - JW / 2 + 8, jarY - JH + 14, JW - 16, JH - 14, C.jarGlass, 0.08);
    // Caught fireflies in jar
    for (var jfi = 0; jfi < Math.min(jarCaught, 6); jfi++) {
      var jx = jarX - JW * 0.3 + (jfi % 3) * JW * 0.3;
      var jy = jarY - JH * 0.4 - Math.floor(jfi / 3) * 20;
      game.draw.circle(jx, jy, 8, C.ffHi, 0.4 + Math.sin(elapsed * 2 + jfi) * 0.2);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Escape dots
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 40 + ei * 80, H * 0.955, 16, ei < escaped ? C.miss : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.firefly : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnFirefly();
    spawnFirefly();
    spawnFirefly();
  });
})(game);
