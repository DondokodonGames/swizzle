// 735-gravity-wells.js
// 重力の穴 — 漂う星をタップして重力井戸を作り、惑星の軌道に乗せろ
// 操作: タップで重力発生（星を惑星の周回軌道に引き込む）
// 成功: 20個軌道に乗せる  失敗: 15個逃がす or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010108',
    planet:  '#1d4ed8',
    planetHi:'#93c5fd',
    star:    '#fde68a',
    starHi:  '#fff',
    orbit:   '#1e40af',
    well:    '#7c3aed',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030310'
  };

  var CX = W / 2;
  var CY = H * 0.45;
  var PLANET_R = 60;
  var ORBIT_R = 220;
  var ORBIT_TOLERANCE = 60; // ±60px of orbit counts as captured
  var STAR_R = 16;

  var stars = [];
  var wells = [];  // temporary gravity wells
  var orbitParticles = [];
  var spawnTimer = 1.5;

  var score = 0;
  var NEEDED = 20;
  var escaped = 0;
  var MAX_ESCAPE = 15;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  // Background star field
  var bgStars = [];
  for (var bsi = 0; bsi < 50; bsi++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.5 });
  }

  function spawnStar() {
    var angle = Math.random() * Math.PI * 2;
    var spawnR = 500;
    var sx = CX + Math.cos(angle) * spawnR;
    var sy = CY + Math.sin(angle) * spawnR;
    sx = Math.max(-50, Math.min(W + 50, sx));
    sy = Math.max(-50, Math.min(H + 50, sy));
    // Drift toward planet with slight offset
    var tx = CX + (Math.random() - 0.5) * 400;
    var ty = CY + (Math.random() - 0.5) * 400;
    var dx = tx - sx, dy = ty - sy;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var spd = 80 + Math.random() * 60;
    stars.push({ x: sx, y: sy, vx: (dx / dist) * spd, vy: (dy / dist) * spd, phase: Math.random() * Math.PI * 2, captured: false });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    wells.push({ x: tx, y: ty, life: 0.6, maxLife: 0.6 });
    game.audio.play('se_tap', 0.08);
    // Gravity well visual
    for (var p = 0; p < 4; p++) {
      var pa = Math.random() * Math.PI * 2;
      particles.push({ x: tx, y: ty, vx: Math.cos(pa)*60, vy: Math.sin(pa)*60, life: 0.3, col: C.well });
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

    // Spawn stars
    spawnTimer -= dt;
    var rate = Math.max(0.6, 1.5 - score * 0.04);
    if (spawnTimer <= 0) {
      spawnTimer = rate;
      if (stars.length < 8 && !done) spawnStar();
    }

    // Update wells
    for (var wi = wells.length - 1; wi >= 0; wi--) {
      wells[wi].life -= dt;
      if (wells[wi].life <= 0) wells.splice(wi, 1);
    }

    // Update stars
    for (var si = stars.length - 1; si >= 0; si--) {
      var s = stars[si];
      if (s.captured) {
        s.phase += dt * 2;
        continue;
      }

      // Apply gravity wells
      for (var wj = 0; wj < wells.length; wj++) {
        var w = wells[wj];
        var dx = w.x - s.x, dy = w.y - s.y;
        var dist2 = dx * dx + dy * dy;
        if (dist2 < 300 * 300 && dist2 > 1) {
          var force = 1200 * (w.life / w.maxLife) / Math.sqrt(dist2);
          s.vx += (dx / Math.sqrt(dist2)) * force * dt;
          s.vy += (dy / Math.sqrt(dist2)) * force * dt;
        }
      }

      // Apply planet gravity (weaker)
      var pdx = CX - s.x, pdy = CY - s.y;
      var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist > 1) {
        var pgrav = 80 / pdist;
        s.vx += (pdx / pdist) * pgrav * dt;
        s.vy += (pdy / pdist) * pgrav * dt;
      }

      // Speed cap
      var spd = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      if (spd > 500) { s.vx = s.vx / spd * 500; s.vy = s.vy / spd * 500; }

      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.phase += dt * 2;

      // Check if captured (in orbit zone)
      var orbitDist = Math.abs(Math.sqrt((s.x - CX) * (s.x - CX) + (s.y - CY) * (s.y - CY)) - ORBIT_R);
      var orbitSpeed = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      if (orbitDist < ORBIT_TOLERANCE && orbitSpeed < 250) {
        s.captured = true;
        score++;
        flashCol = C.correct;
        flashAnim = 0.3;
        resultText = '軌道に乗った！';
        resultTimer = 0.5;
        game.audio.play('se_success', 0.5);
        for (var p2 = 0; p2 < 6; p2++) {
          var pa2 = Math.random() * Math.PI * 2;
          particles.push({ x: s.x, y: s.y, vx: Math.cos(pa2)*150, vy: Math.sin(pa2)*150, life: 0.4, col: C.starHi });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 80); }, 700);
        }
        continue;
      }

      // Check if star hits planet
      if (pdist < PLANET_R + STAR_R) {
        stars.splice(si, 1);
        escaped++;
        flashCol = C.wrong;
        flashAnim = 0.3;
        resultText = '衝突！';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.25);
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
        continue;
      }

      // Check if escaped off screen
      if (s.x < -100 || s.x > W + 100 || s.y < -100 || s.y > H + 100) {
        stars.splice(si, 1);
        escaped++;
        flashCol = C.wrong;
        flashAnim = 0.25;
        resultText = '逃げた！';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.2);
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background stars
    for (var bsi2 = 0; bsi2 < bgStars.length; bsi2++) {
      game.draw.circle(bgStars[bsi2].x, bgStars[bsi2].y, bgStars[bsi2].r, C.star, 0.3);
    }

    // Orbit ring (dashed via circles)
    for (var oi = 0; oi < 36; oi++) {
      var oa = oi * Math.PI * 2 / 36;
      game.draw.circle(CX + Math.cos(oa) * ORBIT_R, CY + Math.sin(oa) * ORBIT_R, 4, C.orbit, 0.4);
    }

    // Gravity wells
    for (var wi2 = 0; wi2 < wells.length; wi2++) {
      var wl = wells[wi2];
      var wa = wl.life / wl.maxLife;
      game.draw.circle(wl.x, wl.y, 120 * wa, C.well, wa * 0.12);
      game.draw.circle(wl.x, wl.y, 24 * wa, C.well, wa * 0.7);
    }

    // Captured stars in orbit
    for (var si2 = 0; si2 < stars.length; si2++) {
      var st = stars[si2];
      if (st.captured) {
        var pulse = 0.9 + 0.1 * Math.sin(st.phase * 4);
        game.draw.circle(st.x, st.y, STAR_R * pulse, C.starHi, 0.9);
      }
    }

    // Planet
    game.draw.circle(CX + 5, CY + 5, PLANET_R, '#000', 0.25);
    game.draw.circle(CX, CY, PLANET_R, C.planet, 0.9);
    game.draw.circle(CX - PLANET_R * 0.3, CY - PLANET_R * 0.3, PLANET_R * 0.25, C.planetHi, 0.3);

    // Free stars
    for (var si3 = 0; si3 < stars.length; si3++) {
      var st3 = stars[si3];
      if (st3.captured) continue;
      var p3 = 0.85 + 0.15 * Math.sin(st3.phase * 3);
      game.draw.circle(st3.x + 3, st3.y + 3, STAR_R, '#000', 0.2);
      game.draw.circle(st3.x, st3.y, STAR_R * p3, C.star, 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p4 = particles[pp2];
      game.draw.circle(p4.x, p4.y, 8 * p4.life, p4.col, p4.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 33 + ei * 66, H * 0.955, 15, ei < escaped ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    spawnStar();
  });
})(game);
