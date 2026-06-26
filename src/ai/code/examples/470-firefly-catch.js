// 470-firefly-catch.js
// ホタル捕獲 — 暗闇の中でほんの一瞬だけ光るホタルを素早くタップ
// 操作: タップでホタルを捕まえる（光っている間だけ有効）
// 成功: 20匹捕獲  失敗: 10匹逃がす or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#010508',
    sky:    '#030c14',
    grass:  '#061a0a',
    fly:    '#d4f542',
    flyHi:  '#f0ff80',
    flyGlo: '#86efac',
    dark:   '#0a1505',
    miss:   '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var fireflies = [];
  var particles = [];
  var caught = 0;
  var NEEDED = 20;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var nextSpawn = 0.5;

  function spawnFirefly() {
    var margin = 120;
    fireflies.push({
      x: margin + Math.random() * (W - margin * 2),
      y: H * 0.12 + Math.random() * (H * 0.72),
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 60,
      phase: Math.random() * Math.PI * 2,
      period: 1.2 + Math.random() * 1.5,
      litDuration: 0.3 + Math.random() * 0.4,
      litTimer: 0,
      waitTimer: 1.0 + Math.random() * 2.0,
      lit: false,
      escaped: false,
      life: 4 + Math.random() * 4
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitAny = false;
    for (var fi = fireflies.length - 1; fi >= 0; fi--) {
      var f = fireflies[fi];
      if (!f.lit) continue;
      var dx = tx - f.x;
      var dy = ty - f.y;
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: f.x, y: f.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.7, col: C.flyHi });
        }
        fireflies.splice(fi, 1);
        caught++;
        hitAny = true;
        game.audio.play('se_tap', 0.5);
        if (caught >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.8);
          setTimeout(function() { game.end.success(caught * 200 + Math.ceil(timeLeft) * 100); }, 700);
        }
        break;
      }
    }
    if (!hitAny) {
      // Missed tap (no lit firefly nearby)
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

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      if (fireflies.length < 8) spawnFirefly();
      nextSpawn = 0.6 + Math.random() * 0.8;
    }

    // Update fireflies
    for (var fi2 = fireflies.length - 1; fi2 >= 0; fi2--) {
      var f2 = fireflies[fi2];
      f2.life -= dt;
      f2.phase += dt;

      // Wander movement
      f2.vx += (Math.random() - 0.5) * 30 * dt;
      f2.vy += (Math.random() - 0.5) * 30 * dt;
      f2.vx *= 0.98;
      f2.vy *= 0.98;
      var spd = Math.sqrt(f2.vx * f2.vx + f2.vy * f2.vy);
      if (spd > 90) { f2.vx = f2.vx / spd * 90; f2.vy = f2.vy / spd * 90; }
      f2.x += f2.vx * dt;
      f2.y += f2.vy * dt;

      // Bounce off edges
      if (f2.x < 60) { f2.x = 60; f2.vx = Math.abs(f2.vx); }
      if (f2.x > W - 60) { f2.x = W - 60; f2.vx = -Math.abs(f2.vx); }
      if (f2.y < H * 0.1) { f2.y = H * 0.1; f2.vy = Math.abs(f2.vy); }
      if (f2.y > H * 0.86) { f2.y = H * 0.86; f2.vy = -Math.abs(f2.vy); }

      // Blink logic
      if (f2.lit) {
        f2.litTimer -= dt;
        if (f2.litTimer <= 0) {
          f2.lit = false;
          f2.waitTimer = 0.8 + Math.random() * 2.0;
        }
      } else {
        f2.waitTimer -= dt;
        if (f2.waitTimer <= 0) {
          f2.lit = true;
          f2.litTimer = f2.litDuration;
        }
      }

      // Life expired — escaped
      if (f2.life <= 0 && !f2.escaped) {
        f2.escaped = true;
        fireflies.splice(fi2, 1);
        missed++;
        game.audio.play('se_failure', 0.2);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        continue;
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    // Sky gradient hint
    game.draw.rect(0, 0, W, H * 0.9, C.sky, 0.6);
    // Grass
    game.draw.rect(0, H * 0.88, W, H * 0.12, C.grass, 0.9);

    // Fireflies
    for (var fi3 = 0; fi3 < fireflies.length; fi3++) {
      var f3 = fireflies[fi3];
      if (f3.lit) {
        var glowR = 70 + Math.sin(f3.phase * 8) * 15;
        game.draw.circle(f3.x, f3.y, glowR, C.flyGlo, 0.12);
        game.draw.circle(f3.x, f3.y, 36, C.flyHi, 0.5);
        game.draw.circle(f3.x, f3.y, 18, C.fly, 1.0);
        // Hit radius hint
        game.draw.circle(f3.x, f3.y, 60, C.flyHi, 0.08);
      } else {
        // Dark unlit body
        game.draw.circle(f3.x, f3.y, 10, C.dark, 0.6);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Miss dots
    var missPerRow = 5;
    for (var mi = 0; mi < MAX_MISS; mi++) {
      var mx = W * 0.1 + (mi % missPerRow) * (W * 0.8 / (missPerRow - 1));
      var my2 = mi < missPerRow ? H * 0.948 : H * 0.963;
      game.draw.circle(mx, my2, 14, mi < missed ? C.miss : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.flyHi, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.flyGlo : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnFirefly();
    spawnFirefly();
    spawnFirefly();
  });
})(game);
