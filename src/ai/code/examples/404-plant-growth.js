// 404-plant-growth.js
// 植物育成 — タップで水を与え、光と水のバランスで植物を育てる
// 操作: 左タップ=水やり、右タップ=日光調整
// 成功: 植物が満開  失敗: 枯れる or 溺れる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a1608',
    soil:   '#3d2007',
    soilHi: '#5c3210',
    pot:    '#78350f',
    potHi:  '#92400e',
    stem:   '#15803d',
    stemHi: '#166534',
    leaf:   '#22c55e',
    leafHi: '#86efac',
    flower: '#f97316',
    flowerHi:'#fed7aa',
    water:  '#3b82f6',
    waterHi:'#93c5fd',
    sun:    '#fbbf24',
    sunHi:  '#fef3c7',
    wilt:   '#713f12',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var water = 0.5;    // 0-1
  var sunlight = 0.5; // 0-1
  var health = 0.5;   // 0-1
  var growth = 0;     // 0-1 (1=full bloom)

  var WATER_DRAIN = 0.04;  // per second
  var WATER_ADD = 0.15;    // per tap
  var WATER_HAPPY_MIN = 0.3;
  var WATER_HAPPY_MAX = 0.7;
  var SUN_DRAIN = 0.03;
  var SUN_ADD = 0.12;

  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var stemHeight = 0;
  var leafPhase = 0;
  var growthFlash = 0;
  var flowerAnim = 0;

  var waterDrops = [];
  var sunRays = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W/2) {
      // Water
      water = Math.min(1, water + WATER_ADD);
      game.audio.play('se_tap', 0.3);
      for (var pi = 0; pi < 5; pi++) {
        waterDrops.push({ x: 100+Math.random()*(W/2-150), y: ty, vy: 100+Math.random()*200, life: 0.8 });
      }
    } else {
      // Sunlight
      sunlight = Math.min(1, sunlight + SUN_ADD);
      game.audio.play('se_tap', 0.4);
      for (var pi2 = 0; pi2 < 4; pi2++) {
        var ang = -Math.PI/2 + (Math.random()-0.5)*Math.PI/3;
        sunRays.push({ x: W*0.75+Math.random()*100-50, y: 0, vx: Math.cos(ang)*80, vy: Math.sin(ang)*200+100, life: 0.7 });
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    leafPhase += dt * 2;
    if (growthFlash > 0) growthFlash -= dt * 2;
    if (flowerAnim < 1 && growth > 0.9) flowerAnim = Math.min(1, flowerAnim + dt);

    // Resource drain
    water = Math.max(0, water - WATER_DRAIN * dt);
    sunlight = Math.max(0, sunlight - SUN_DRAIN * dt);

    // Health update
    var waterGood = water >= WATER_HAPPY_MIN && water <= WATER_HAPPY_MAX;
    var sunGood = sunlight >= 0.3 && sunlight <= 0.8;
    if (waterGood && sunGood) {
      health = Math.min(1, health + dt * 0.2);
    } else {
      health = Math.max(0, health - dt * 0.15);
    }

    // Growth
    if (health > 0.6) {
      var prevGrowth = growth;
      growth = Math.min(1, growth + dt * 0.06);
      if (Math.floor(growth * 10) > Math.floor(prevGrowth * 10)) {
        growthFlash = 0.5;
        game.audio.play('se_success', 0.3);
      }
      if (growth >= 1 && !done) {
        done = true;
        game.audio.play('se_success', 0.8);
        setTimeout(function(){ game.end.success(1000+Math.ceil(timeLeft)*80); }, 800);
      }
    } else if (health <= 0 && !done) {
      done = true;
      game.audio.play('se_failure', 0.6);
      setTimeout(function(){ game.end.failure(); }, 500);
    }

    stemHeight = 200 + growth * 360;

    // Update particles
    for (var wd = waterDrops.length-1; wd >= 0; wd--) {
      waterDrops[wd].y += waterDrops[wd].vy * dt;
      waterDrops[wd].life -= dt;
      if (waterDrops[wd].life <= 0) waterDrops.splice(wd,1);
    }
    for (var sr = sunRays.length-1; sr >= 0; sr--) {
      sunRays[sr].x += sunRays[sr].vx * dt;
      sunRays[sr].y += sunRays[sr].vy * dt;
      sunRays[sr].life -= dt;
      if (sunRays[sr].life <= 0) sunRays.splice(sr,1);
    }
    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sun rays
    for (var sr2 = 0; sr2 < sunRays.length; sr2++) {
      var r = sunRays[sr2];
      game.draw.circle(r.x, r.y, 12*r.life, C.sunHi, r.life*0.7);
    }

    // Pot
    var potX = W/2, potY = H*0.82;
    var potW = 200, potH2 = 160;
    game.draw.rect(potX-potW/2, potY, potW, potH2, C.pot, 0.9);
    game.draw.rect(potX-potW/2, potY, potW, 24, C.potHi, 0.7);
    game.draw.rect(potX-potW/2-16, potY, potW+32, 24, C.potHi, 0.8);
    // Soil
    game.draw.rect(potX-potW/2+8, potY+8, potW-16, 48, C.soilHi, 0.9);

    // Stem
    var stemCol = health > 0.3 ? C.stem : C.wilt;
    var stemTopY = potY - stemHeight;
    game.draw.rect(potX-10, stemTopY, 20, stemHeight, stemCol, 0.9);
    game.draw.rect(potX-5, stemTopY, 8, stemHeight, C.stemHi, 0.2);

    // Leaves (appear as growth increases)
    if (growth > 0.15) {
      var leafW = 60 + growth*80;
      var leafSwing = Math.sin(leafPhase)*8;
      var leafY1 = potY - stemHeight*0.4;
      game.draw.circle(potX-leafW/2+leafSwing, leafY1, leafW*0.6, C.leaf, 0.85);
      game.draw.circle(potX-leafW/2+leafSwing+20, leafY1-20, leafW*0.4, C.leafHi, 0.4);
    }
    if (growth > 0.35) {
      var leafW2 = 50 + growth*70;
      var leafY2 = potY - stemHeight*0.65;
      game.draw.circle(potX+leafW2/2-10, leafY2, leafW2*0.6, C.leaf, 0.85);
    }

    // Flower (appears at high growth)
    if (growth > 0.7) {
      var flowerR = (growth-0.7)*3.3*80*flowerAnim;
      var fx = potX, fy = stemTopY;
      game.draw.circle(fx, fy, flowerR+12, C.flowerHi, 0.15);
      for (var fp = 0; fp < 6; fp++) {
        var fa = fp/6*Math.PI*2+elapsed;
        game.draw.circle(fx+Math.cos(fa)*flowerR*0.6, fy+Math.sin(fa)*flowerR*0.6, flowerR*0.4, C.flower, 0.85);
      }
      game.draw.circle(fx, fy, flowerR*0.4, C.sunHi, 0.9);
    }

    // Water drops
    for (var wd2 = 0; wd2 < waterDrops.length; wd2++) {
      var d = waterDrops[wd2];
      game.draw.circle(d.x, d.y, 10*d.life, C.water, d.life*0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.8);
    }

    if (growthFlash > 0) game.draw.rect(0, 0, W, H, C.leafHi, growthFlash*0.08);

    // Status bars
    var barW = W/2-80;
    var barY2 = H*0.89;
    // Water bar
    game.draw.rect(40, barY2, barW, 24, '#0f172a', 0.8);
    game.draw.rect(40, barY2, barW*water, 24, C.water, 0.85);
    // Zone indicator on water bar
    game.draw.rect(40+barW*WATER_HAPPY_MIN, barY2, barW*(WATER_HAPPY_MAX-WATER_HAPPY_MIN), 24, C.leaf, 0.2);
    game.draw.text('💧', 40, barY2-8, { size: 32 });

    // Sunlight bar
    game.draw.rect(W/2+40, barY2, barW, 24, '#0f172a', 0.8);
    game.draw.rect(W/2+40, barY2, barW*sunlight, 24, C.sun, 0.85);
    game.draw.text('☀', W/2+40, barY2-8, { size: 32 });

    // Health
    game.draw.rect(W/4, H*0.93, W/2, 16, '#0f172a', 0.7);
    game.draw.rect(W/4, H*0.93, W/2*health, 16, health>0.5?C.leafHi:C.wilt, 0.85);

    // Button labels
    game.draw.text('水やり', W/4, H*0.953, { size: 36, color: C.waterHi });
    game.draw.text('日光', W*3/4, H*0.953, { size: 36, color: C.sunHi });

    game.draw.text(Math.round(growth*100)+'%', W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.leaf : C.wilt);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
