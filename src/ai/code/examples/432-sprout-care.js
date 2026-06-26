// 432-sprout-care.js
// 芽吹きの世話 — 水と日光のバランスで苗を育てる（リアルタイム管理）
// 操作: 左半分タップ=水やり、右半分タップ=日光、両方のバランスを保つ
// 成功: 5本の苗を全て100%成長させる  失敗: 1本でも枯れる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020a02',
    soil:   '#1a0d00',
    soilHi: '#2d1a00',
    sprout: '#16a34a',
    sproutHi:'#4ade80',
    sproutLo:'#15803d',
    leaf:   '#22c55e',
    water:  '#3b82f6',
    waterHi:'#93c5fd',
    sun:    '#fbbf24',
    sunHi:  '#fef08a',
    dry:    '#92400e',
    wilt:   '#dc2626',
    bloom:  '#f472b6',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var NUM_PLANTS = 5;
  var plants = [];
  var spacing = W / (NUM_PLANTS + 1);
  for (var i = 0; i < NUM_PLANTS; i++) {
    plants.push({
      x: spacing * (i + 1),
      growth: 0.05 + Math.random() * 0.1,
      water: 0.5,
      sun: 0.5,
      health: 1.0,
      wilting: false,
      bloomed: false,
      phase: 0  // 0=seed,1=sprout,2=plant,3=bloom
    });
  }

  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var bloomed = 0;
  var dead = 0;

  var waterEffect = 0;
  var sunEffect = 0;
  var lastTapSide = -1;

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      waterEffect = 1.0;
      // Water nearest plant on left side
      var nearest = -1;
      var nearDist = 999;
      for (var pi = 0; pi < plants.length; pi++) {
        if (plants[pi].bloomed) continue;
        var d = Math.abs(plants[pi].x - tx);
        if (d < nearDist) { nearDist = d; nearest = pi; }
      }
      if (nearest >= 0) {
        plants[nearest].water = Math.min(1, plants[nearest].water + 0.25);
        for (var wi = 0; wi < 4; wi++) {
          var ang = -Math.PI/2 + (Math.random()-0.5) * Math.PI;
          particles.push({ x: plants[nearest].x, y: H*0.82, vx: Math.cos(ang)*60, vy: Math.sin(ang)*60, life: 0.5, col: C.waterHi });
        }
      }
      game.audio.play('se_tap', 0.3);
    } else {
      sunEffect = 1.0;
      game.audio.play('se_tap', 0.2);
      // Sun boosts all
      for (var pi2 = 0; pi2 < plants.length; pi2++) {
        if (!plants[pi2].bloomed) {
          plants[pi2].sun = Math.min(1, plants[pi2].sun + 0.12);
        }
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

    if (flashAnim > 0) flashAnim -= dt * 2;
    if (waterEffect > 0) waterEffect -= dt * 3;
    if (sunEffect > 0) sunEffect -= dt * 3;

    // Update plants
    dead = 0;
    bloomed = 0;
    for (var pi3 = 0; pi3 < plants.length; pi3++) {
      var p = plants[pi3];
      if (p.bloomed) { bloomed++; continue; }

      // Resources decay over time
      p.water -= dt * 0.08;
      p.sun -= dt * 0.05;
      p.water = Math.max(0, p.water);
      p.sun = Math.max(0, p.sun);

      // Balance factor — both needed
      var balance = Math.min(p.water, p.sun);
      var stress = Math.abs(p.water - p.sun);

      // Grow when balanced
      if (balance > 0.3 && stress < 0.4) {
        p.growth += dt * 0.03 * balance;
      }

      // Health
      if (p.water < 0.1 || p.sun < 0.1 || stress > 0.6) {
        p.health -= dt * 0.15;
        p.wilting = true;
      } else {
        p.health = Math.min(1, p.health + dt * 0.05);
        p.wilting = p.health < 0.5;
      }

      if (p.health <= 0 && !p.bloomed) {
        dead++;
      }

      // Phase
      if (p.growth < 0.25) p.phase = 0;
      else if (p.growth < 0.6) p.phase = 1;
      else if (p.growth < 0.95) p.phase = 2;
      else p.phase = 3;

      if (p.growth >= 1.0 && !p.bloomed) {
        p.bloomed = true;
        bloomed++;
        flashCol = C.correct;
        flashAnim = 0.7;
        game.audio.play('se_success', 0.6);
        for (var fi = 0; fi < 10; fi++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: p.x, y: H*0.5, vx: Math.cos(ang2)*150, vy: Math.sin(ang2)*150-80, life: 0.8, col: C.bloom });
        }
      }
    }

    if (dead > 0 && !done) {
      done = true;
      flashCol = C.wrong;
      flashAnim = 0.9;
      game.audio.play('se_failure', 0.8);
      setTimeout(function() { game.end.failure(); }, 700);
    }

    if (bloomed >= NUM_PLANTS && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(bloomed * 800 + Math.ceil(timeLeft) * 80); }, 600);
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky gradient
    var skyAlpha = 0.4 + sunEffect * 0.2;
    game.draw.rect(0, 0, W, H * 0.82, '#001020', skyAlpha);

    // Sun
    if (sunEffect > 0) {
      game.draw.circle(W*0.8, 150, 70 + sunEffect*20, C.sunHi, 0.3);
      game.draw.circle(W*0.8, 150, 50 + sunEffect*10, C.sun, 0.7);
    } else {
      game.draw.circle(W*0.8, 150, 50, C.sun, 0.4);
    }

    // Water indicator
    if (waterEffect > 0) {
      game.draw.circle(W*0.18, 300, 40 + waterEffect*20, C.waterHi, 0.3);
      game.draw.circle(W*0.18, 300, 28, C.water, 0.7);
    }

    // Soil
    game.draw.rect(0, H*0.82, W, H*0.18, C.soil, 0.9);
    game.draw.line(0, H*0.82, W, H*0.82, C.soilHi, 4);

    // Plants
    for (var pi4 = 0; pi4 < plants.length; pi4++) {
      var pl = plants[pi4];
      var px = pl.x;
      var groundY = H * 0.82;
      var stemH = pl.growth * 280;
      var stemCol = pl.wilting ? C.dry : (pl.health < 0.7 ? C.sproutLo : C.sprout);
      var stemW = 8 + pl.growth * 12;

      if (pl.bloomed) {
        // Full bloom
        game.draw.line(px, groundY, px, groundY - 320, C.sproutHi, stemW);
        game.draw.circle(px, groundY - 320, 50, C.bloom, 0.8);
        game.draw.circle(px, groundY - 320, 35, C.sunHi, 0.6);
        for (var li = 0; li < 6; li++) {
          var la = li * Math.PI / 3;
          game.draw.circle(px + Math.cos(la)*45, groundY - 320 + Math.sin(la)*45, 20, C.bloom, 0.6);
        }
        // Leaves
        game.draw.circle(px - 40, groundY - 180, 30, C.leaf, 0.8);
        game.draw.circle(px + 40, groundY - 120, 28, C.leaf, 0.7);
      } else if (pl.phase >= 1) {
        game.draw.line(px, groundY, px, groundY - stemH, stemCol, stemW);
        // Leaves based on phase
        if (pl.phase >= 2) {
          game.draw.circle(px - 30, groundY - stemH * 0.6, 24, C.leaf, 0.7);
          game.draw.circle(px + 28, groundY - stemH * 0.4, 22, C.leaf, 0.6);
        }
        if (pl.phase >= 1) {
          game.draw.circle(px, groundY - stemH, 16, C.sproutHi, 0.8);
        }
      } else {
        game.draw.circle(px, groundY - 10, 14, stemCol, 0.6);
      }

      // Resource bars
      var barW = 60;
      var barY = groundY + 20;
      game.draw.rect(px - barW/2, barY, barW, 10, '#0a1020', 0.8);
      game.draw.rect(px - barW/2, barY, barW * pl.water, 10, C.water, 0.8);
      game.draw.rect(px - barW/2, barY + 14, barW, 10, '#0a1020', 0.8);
      game.draw.rect(px - barW/2, barY + 14, barW * pl.sun, 10, C.sun, 0.8);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var pt = particles[pp2];
      game.draw.circle(pt.x, pt.y, 8 * pt.life, pt.col, pt.life * 0.8);
    }

    // Tap hints
    game.draw.text('水', W*0.15, H*0.77, { size: 56, color: C.waterHi, bold: true });
    game.draw.text('日光', W*0.78, H*0.77, { size: 56, color: C.sunHi, bold: true });

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    game.draw.text(bloomed + ' / ' + NUM_PLANTS, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sprout : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
