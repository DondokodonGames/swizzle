// 277-pressure-cook.js
// プレッシャークック — 圧力鍋の蒸気を管理してレシピ通りに調理
// 操作: タップで蒸気弁を開閉して圧力をコントロール
// 成功: 3品を丁度よく調理  失敗: 爆発2回 or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04020a',
    pot:     '#334155',
    potHi:   '#64748b',
    potDark: '#1e293b',
    steam:   '#94a3b8',
    steamHi: '#e2e8f0',
    safe:    '#22c55e',
    safeHi:  '#86efac',
    danger:  '#ef4444',
    danHi:   '#fca5a5',
    warning: '#f59e0b',
    warnHi:  '#fde68a',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var pressure = 0; // 0-100
  var valve = false; // valve open = pressure decreasing
  var recipe = null;
  var cookTimer = 0;
  var cooked = 0;
  var NEEDED = 3;
  var explosions = 0;
  var MAX_EXPLODE = 2;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var steamParticles = [];
  var explosionFlash = 0;
  var shakeX = 0;

  var RECIPES = [
    { name: '白米', minP: 55, maxP: 75, cookTime: 5 },
    { name: '豚肉', minP: 65, maxP: 80, cookTime: 4 },
    { name: 'ポテト', minP: 40, maxP: 60, cookTime: 3.5 },
    { name: '卵', minP: 30, maxP: 50, cookTime: 3 },
    { name: 'カレー', minP: 70, maxP: 85, cookTime: 6 }
  ];

  function nextRecipe() {
    recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
    cookTimer = 0;
    pressure = 20 + Math.random() * 15;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var vx = W / 2, vy = H * 0.42;
    var dx = tx - vx, dy = ty - vy;
    if (dx * dx + dy * dy < 90 * 90) {
      valve = !valve;
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;
    if (explosionFlash > 0) explosionFlash -= dt;
    shakeX *= 0.85;

    if (!recipe) { nextRecipe(); return; }

    // Pressure dynamics
    var heatRate = 22; // pressure rise per second
    var releaseRate = 40; // pressure drop when valve open
    if (valve) {
      pressure -= releaseRate * dt;
      // Steam particles
      if (Math.random() < 0.4) {
        steamParticles.push({ x: W / 2, y: H * 0.36, vx: (Math.random() - 0.5) * 80, vy: -120 - Math.random() * 60, life: 0.5 + Math.random() * 0.3, r: 8 + Math.random() * 8 });
      }
    } else {
      pressure += heatRate * dt;
    }
    pressure = Math.max(0, Math.min(110, pressure));

    // Explosion
    if (pressure >= 100 && !done) {
      explosions++;
      pressure = 30;
      valve = false;
      explosionFlash = 0.5;
      shakeX = 30;
      game.audio.play('se_failure', 0.8);
      feedback = '爆発！ (' + explosions + '/' + MAX_EXPLODE + ')';
      feedbackCol = C.danger;
      feedbackTimer = 1.0;
      if (explosions >= MAX_EXPLODE) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }

    // Cook in safe range
    if (pressure >= recipe.minP && pressure <= recipe.maxP) {
      cookTimer += dt;
      if (cookTimer >= recipe.cookTime) {
        cooked++;
        feedback = recipe.name + ' 完成！ ' + cooked + '/' + NEEDED;
        feedbackCol = C.safeHi;
        feedbackTimer = 1.0;
        game.audio.play('se_success', 0.7);
        valve = false;
        nextRecipe();
        if (cooked >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(cooked * 300 + Math.ceil(timeLeft) * 100); }, 500);
          return;
        }
      }
    }

    for (var sp = steamParticles.length - 1; sp >= 0; sp--) {
      steamParticles[sp].x += steamParticles[sp].vx * dt;
      steamParticles[sp].y += steamParticles[sp].vy * dt;
      steamParticles[sp].vx *= (1 - dt * 2);
      steamParticles[sp].vy *= (1 - dt * 1.5);
      steamParticles[sp].r += dt * 8;
      steamParticles[sp].life -= dt;
      if (steamParticles[sp].life <= 0) steamParticles.splice(sp, 1);
    }

    // ---- draw ----
    var sx = explosionFlash > 0 ? (Math.random() - 0.5) * shakeX : 0;
    game.draw.rect(0, 0, W, H, C.bg);
    if (explosionFlash > 0) game.draw.rect(0, 0, W, H, C.danger, explosionFlash * 0.4);

    // Pot body
    game.draw.rect(sx + W / 2 - 180, H * 0.52, 360, 300, C.pot, 0.9);
    game.draw.rect(sx + W / 2 - 180, H * 0.52, 360, 16, C.potHi, 0.7);
    game.draw.rect(sx + W / 2 - 180, H * 0.52 + 280, 360, 20, C.potDark, 0.6);
    // Handles
    game.draw.rect(sx + W / 2 - 230, H * 0.55, 50, 80, C.pot, 0.8);
    game.draw.rect(sx + W / 2 + 180, H * 0.55, 50, 80, C.pot, 0.8);

    // Lid
    game.draw.rect(sx + W / 2 - 190, H * 0.49, 380, 36, C.potHi, 0.9);

    // Valve button
    var vCol = valve ? C.safe : C.danger;
    var vHiCol = valve ? C.safeHi : C.danHi;
    game.draw.circle(sx + W / 2, H * 0.42, 60, vCol, 0.9);
    game.draw.circle(sx + W / 2, H * 0.42, 60, vHiCol, 0.25);
    game.draw.text(valve ? '開' : '閉', sx + W / 2, H * 0.43, { size: 52, color: '#fff', bold: true });

    // Steam particles
    for (var sp2 = 0; sp2 < steamParticles.length; sp2++) {
      var spt = steamParticles[sp2];
      game.draw.circle(sx + spt.x, spt.y, spt.r, C.steam, spt.life * 0.4);
    }

    // Pressure gauge
    var gaugeX = W * 0.15, gaugeY = H * 0.55, gaugeR = 90;
    game.draw.circle(gaugeX, gaugeY, gaugeR, C.potDark, 0.9);
    game.draw.circle(gaugeX, gaugeY, gaugeR, C.potHi, 0.3);
    // Gauge zones
    var zoneAngle = function(p) { return -Math.PI * 1.2 + p / 100 * Math.PI * 1.4; };
    var minA = zoneAngle(recipe.minP), maxA = zoneAngle(recipe.maxP);
    var segs = 20;
    for (var sg = 0; sg < segs; sg++) {
      var a1 = minA + (maxA - minA) * sg / segs;
      var a2 = minA + (maxA - minA) * (sg + 1) / segs;
      game.draw.line(gaugeX + Math.cos(a1) * 50, gaugeY + Math.sin(a1) * 50,
                     gaugeX + Math.cos(a2) * 50, gaugeY + Math.sin(a2) * 50, C.safe, 14);
    }
    // Needle
    var needleA = zoneAngle(pressure);
    game.draw.line(gaugeX, gaugeY, gaugeX + Math.cos(needleA) * 72, gaugeY + Math.sin(needleA) * 72,
      pressure >= 100 ? C.danger : (pressure >= recipe.minP && pressure <= recipe.maxP ? C.safe : C.warning), 6);
    game.draw.circle(gaugeX, gaugeY, 12, C.steamHi, 0.9);
    game.draw.text(Math.round(pressure), gaugeX, gaugeY + 32, { size: 32, color: C.text, bold: true });

    // Cook progress
    if (recipe) {
      var prog = Math.min(1, cookTimer / recipe.cookTime);
      game.draw.rect(W * 0.55, H * 0.55, W * 0.35, 20, C.ui, 0.3);
      game.draw.rect(W * 0.55, H * 0.55, W * 0.35 * prog, 20, C.safe, 0.9);
      game.draw.text(recipe.name, W * 0.72, H * 0.59, { size: 36, color: C.text, bold: true });
      game.draw.text(recipe.minP + '〜' + recipe.maxP + 'kPa', W * 0.72, H * 0.63, { size: 30, color: C.ui });
    }

    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.87, { size: 46, color: feedbackCol, bold: true });
    }

    game.draw.text(cooked + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.safe : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    nextRecipe();
  });
})(game);
