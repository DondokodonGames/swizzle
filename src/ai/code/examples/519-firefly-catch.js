// 519-firefly-catch.js
// ホタル捕獲 — 暗闇の中で光るホタルを素早くタップして捕まえる
// 操作: 光るホタルをタップ
// 成功: 20匹捕獲  失敗: 10匹逃げる or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#010208',
    sky:      '#02040f',
    grass:    '#0a1a05',
    grassHi:  '#142808',
    fly:      '#d4f542',
    flyGlow:  '#a8ff00',
    flyBody:  '#1a2a00',
    caught:   '#22c55e',
    escaped:  '#ef4444',
    text:     '#f1f5f9',
    ui:       '#374151'
  };

  var GROUND_Y = H * 0.85;
  var flies = [];
  var caught = 0;
  var NEEDED = 20;
  var escaped = 0;
  var MAX_ESCAPE = 10;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var nextSpawn = 0.8;
  var stars = [];

  for (var si = 0; si < 50; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * GROUND_Y * 0.7, r: 0.5 + Math.random() * 1.5, twinkle: Math.random() * Math.PI * 2 });
  }

  function spawnFly() {
    var x = 80 + Math.random() * (W - 160);
    var y = H * 0.15 + Math.random() * (GROUND_Y - H * 0.2);
    flies.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 80,
      vy: (Math.random() - 0.5) * 80,
      r: 22,
      lit: true,
      litTimer: 0.5 + Math.random() * 1.0,
      darkTimer: 0,
      DARK_DUR: 0.4 + Math.random() * 0.6,
      LIT_DUR: 0.5 + Math.random() * 1.0,
      life: 3 + Math.random() * 2,
      glow: Math.random() * Math.PI * 2,
      caught: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var i = flies.length - 1; i >= 0; i--) {
      var f = flies[i];
      if (!f.lit || f.caught) continue;
      var dx = tx - f.x, dy = ty - f.y;
      if (Math.sqrt(dx * dx + dy * dy) < f.r + 40) {
        f.caught = true;
        caught++;
        game.audio.play('se_tap', 0.4);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: f.x, y: f.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.5, col: C.fly });
        }
        flies.splice(i, 1);
        hit = true;
        if (caught >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(caught * 300 + Math.ceil(timeLeft) * 100); }, 700);
        }
        break;
      }
    }
    if (!hit) {
      // missed tap — slight penalty feeling but no miss count
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
      spawnFly();
      nextSpawn = 0.5 + Math.random() * 0.8;
    }

    // Stars twinkle
    for (var si2 = 0; si2 < stars.length; si2++) stars[si2].twinkle += dt;

    // Update flies
    for (var fi = flies.length - 1; fi >= 0; fi--) {
      var f = flies[fi];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.glow += dt * 3;

      // Bounce off edges
      if (f.x < 40 || f.x > W - 40) { f.vx = -f.vx; f.x = Math.max(40, Math.min(W - 40, f.x)); }
      if (f.y < H * 0.1 || f.y > GROUND_Y - 20) { f.vy = -f.vy; }

      // Slight drift
      f.vx += (Math.random() - 0.5) * 30 * dt;
      f.vy += (Math.random() - 0.5) * 30 * dt;
      var speed = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
      if (speed > 120) { f.vx = f.vx / speed * 120; f.vy = f.vy / speed * 120; }

      // Blink
      if (f.lit) {
        f.litTimer -= dt;
        if (f.litTimer <= 0) { f.lit = false; f.darkTimer = f.DARK_DUR; }
      } else {
        f.darkTimer -= dt;
        if (f.darkTimer <= 0) { f.lit = true; f.litTimer = f.LIT_DUR; }
      }

      // Lifetime
      f.life -= dt;
      if (f.life <= 0) {
        escaped++;
        flies.splice(fi, 1);
        game.audio.play('se_failure', 0.2);
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, GROUND_Y * 0.7, C.sky, 0.5);

    // Stars
    for (var si3 = 0; si3 < stars.length; si3++) {
      var st = stars[si3];
      game.draw.circle(st.x, st.y, st.r, '#fff', 0.3 + Math.sin(st.twinkle) * 0.3);
    }

    // Ground grass
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.grass, 0.9);
    game.draw.rect(0, GROUND_Y, W, 16, C.grassHi, 0.7);

    // Fireflies
    for (var fi2 = 0; fi2 < flies.length; fi2++) {
      var f2 = flies[fi2];
      if (f2.lit) {
        var glowA = 0.6 + Math.sin(f2.glow) * 0.2;
        // Glow rings
        game.draw.circle(f2.x, f2.y, f2.r + 30, C.flyGlow, glowA * 0.08);
        game.draw.circle(f2.x, f2.y, f2.r + 16, C.flyGlow, glowA * 0.15);
        game.draw.circle(f2.x, f2.y, f2.r + 6, C.fly, glowA * 0.4);
        game.draw.circle(f2.x, f2.y, f2.r, C.fly, glowA);
        // Body
        game.draw.circle(f2.x, f2.y - 6, 8, C.flyBody, 0.9);
      } else {
        // Dark — barely visible
        game.draw.circle(f2.x, f2.y, f2.r * 0.4, '#333', 0.3);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.9);
    }

    // Escape dots
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 48 + ei * 96, H * 0.955, 18, ei < escaped ? C.escaped : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.flyGlow : C.escaped);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnFly();
    spawnFly();
  });
})(game);
