// 308-flower-bloom.js
// 花ひらく — 土の中から芽が出る瞬間をタイミングよく「水」をあげて育てる
// 操作: タップで水やり（成長ゲージが最高潮の時に当てると一気に咲く）
// 成功: 12本の花を咲かせる  失敗: 5本枯らす or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030a02',
    sky:     '#061408',
    soil:    '#3d1e0a',
    soilHi:  '#5c2e10',
    stem:    '#16a34a',
    stemHi:  '#22c55e',
    petal:   '#ec4899',
    petalHi: '#f9a8d4',
    petal2:  '#f59e0b',
    petal2Hi:'#fde68a',
    leaf:    '#15803d',
    water:   '#3b82f6',
    waterHi: '#60a5fa',
    wither:  '#78350f',
    correct: '#86efac',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var SOIL_Y = H * 0.72;
  var NUM_SLOTS = 5;
  var SLOT_W = W / NUM_SLOTS;

  var flowers = []; // {x, phase:'grow'|'bloom'|'wither', growProgress, petalAngle, color, life}
  var bloomed = 0;
  var NEEDED = 12;
  var withered = 0;
  var MAX_WITHER = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];
  var waterDrop = null; // {x, y, alpha}

  var PETAL_COLORS = [[C.petal, C.petalHi], [C.petal2, C.petal2Hi], ['#a855f7', '#d8b4fe']];

  function spawnFlower(slot) {
    var colorSet = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
    flowers.push({
      x: SLOT_W * slot + SLOT_W / 2,
      phase: 'grow',
      growProgress: 0,
      growRate: 0.12 + Math.random() * 0.08,
      petalAngle: 0,
      color: colorSet[0],
      colorHi: colorSet[1],
      life: 6 + Math.random() * 3,
      slot: slot
    });
  }

  var occupiedSlots = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    // Water the closest growing flower
    var bestDist = 120;
    var bestIdx = -1;
    for (var fi = 0; fi < flowers.length; fi++) {
      var f = flowers[fi];
      if (f.phase !== 'grow') continue;
      var dist = Math.abs(tx - f.x);
      if (dist < bestDist) { bestDist = dist; bestIdx = fi; }
    }
    if (bestIdx === -1) return;

    var fl = flowers[bestIdx];
    var bonus = fl.growProgress > 0.65 && fl.growProgress < 0.95 ? 2.0 : 0.5;
    fl.growProgress = Math.min(1, fl.growProgress + bonus * 0.25);
    fl.life = Math.max(fl.life, fl.life + 1.5);

    // Water drop animation
    waterDrop = { x: fl.x, y: ty, alpha: 1, vy: 200 };
    game.audio.play('se_tap', 0.3);

    if (fl.growProgress >= 1) {
      fl.phase = 'bloom';
      fl.petalAngle = 0;
      bloomed++;
      game.audio.play('se_success', 0.5);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: fl.x, y: SOIL_Y - 160, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180 - 60, life: 0.8, col: fl.colorHi });
      }
      if (bloomed >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(bloomed * 200 + Math.ceil(timeLeft) * 100); }, 500);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Spawn new flowers
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      var freeSlots = [];
      for (var s = 0; s < NUM_SLOTS; s++) {
        var occupied = false;
        for (var fi2 = 0; fi2 < flowers.length; fi2++) {
          if (flowers[fi2].slot === s) { occupied = true; break; }
        }
        if (!occupied) freeSlots.push(s);
      }
      if (freeSlots.length > 0 && flowers.length < 4) {
        spawnFlower(freeSlots[Math.floor(Math.random() * freeSlots.length)]);
      }
      spawnTimer = 1.5 + Math.random() * 1.0;
    }

    // Update flowers
    for (var fi3 = flowers.length - 1; fi3 >= 0; fi3--) {
      var f2 = flowers[fi3];
      if (f2.phase === 'grow') {
        f2.growProgress += f2.growRate * dt;
        f2.life -= dt;
        if (f2.life <= 0 && f2.growProgress < 1) {
          f2.phase = 'wither';
          withered++;
          game.audio.play('se_failure', 0.3);
          if (withered >= MAX_WITHER && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
      } else if (f2.phase === 'bloom') {
        f2.petalAngle += dt;
        f2.life -= dt;
        if (f2.life <= 0) {
          flowers.splice(fi3, 1);
        }
      } else if (f2.phase === 'wither') {
        f2.life -= dt;
        if (f2.life < -1.5) flowers.splice(fi3, 1);
      }
    }

    if (waterDrop) {
      waterDrop.y += waterDrop.vy * dt;
      waterDrop.alpha -= dt * 2;
      if (waterDrop.alpha <= 0) waterDrop = null;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.72, C.sky, 0.5);

    // Soil
    game.draw.rect(0, SOIL_Y, W, H - SOIL_Y, C.soil, 0.9);
    game.draw.rect(0, SOIL_Y, W, 16, C.soilHi, 0.6);

    // Flowers
    for (var fi4 = 0; fi4 < flowers.length; fi4++) {
      var f3 = flowers[fi4];
      var fx = f3.x;
      var stemTop = SOIL_Y - f3.growProgress * 220;
      var isWither = f3.phase === 'wither';

      if (isWither) {
        var wCol = C.wither;
        game.draw.line(fx, SOIL_Y, fx, stemTop + 40, wCol, 8);
      } else {
        // Stem
        game.draw.line(fx, SOIL_Y, fx, stemTop, C.stem, 10);
        game.draw.line(fx, SOIL_Y, fx, stemTop, C.stemHi, 4);
        // Leaf
        if (f3.growProgress > 0.3) {
          game.draw.circle(fx + 30, stemTop + 80, 20, C.leaf, 0.8);
        }
      }

      if (f3.phase === 'bloom') {
        // Draw petals
        for (var pet = 0; pet < 8; pet++) {
          var pang = (pet / 8) * Math.PI * 2 + f3.petalAngle * 0.3;
          var pr = 40 + 5 * Math.sin(f3.petalAngle * 2 + pet);
          game.draw.circle(fx + Math.cos(pang) * pr, stemTop + Math.sin(pang) * pr, 22, f3.color, 0.85);
        }
        game.draw.circle(fx, stemTop, 24, f3.colorHi, 0.9);
      } else if (f3.phase === 'grow') {
        // Bud
        var budR = 12 + f3.growProgress * 16;
        game.draw.circle(fx, stemTop, budR + 4, f3.colorHi, 0.2);
        game.draw.circle(fx, stemTop, budR, f3.color, 0.9);

        // Growth meter (ring around bud)
        var segs = 12;
        for (var sg = 0; sg < Math.ceil(segs * f3.growProgress); sg++) {
          var sa = -Math.PI / 2 + (sg / segs) * Math.PI * 2;
          var sa2 = -Math.PI / 2 + ((sg + 0.8) / segs) * Math.PI * 2;
          var mCol = f3.growProgress > 0.65 && f3.growProgress < 0.95 ? C.correct : C.water;
          game.draw.line(fx + Math.cos(sa) * (budR + 14), stemTop + Math.sin(sa) * (budR + 14),
                         fx + Math.cos(sa2) * (budR + 14), stemTop + Math.sin(sa2) * (budR + 14), mCol, 5);
        }
      }
    }

    // Water drop
    if (waterDrop) {
      game.draw.circle(waterDrop.x, waterDrop.y, 16, C.waterHi, waterDrop.alpha);
      game.draw.circle(waterDrop.x, waterDrop.y, 8, '#fff', waterDrop.alpha * 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 1.5, p.col, p.life * 0.8);
    }

    // Instruction
    game.draw.text('ゲージ最大でタップ！', W / 2, H * 0.87, { size: 42, color: C.ui });

    // Wither dots
    for (var wi2 = 0; wi2 < MAX_WITHER; wi2++) {
      game.draw.circle(W / 2 - (MAX_WITHER - 1) * 22 + wi2 * 44, H * 0.93, 14, wi2 < withered ? C.wither : '#030a02');
    }

    game.draw.text(bloomed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.stem : C.petal);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.3;
  });
})(game);
