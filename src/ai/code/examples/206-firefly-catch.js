// 206-firefly-catch.js
// 蛍キャッチ — 夜に光っている時間だけがチャンス、消える前にタップして捕まえる
// 操作: タップで光っている蛍を捕まえる
// 成功: 20匹捕まえる  失敗: 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010205',
    grass:   '#0a1a0a',
    firefly: '#fde68a',
    firflyHi:'#ffffff',
    glow:    '#f59e0b',
    caught:  '#22c55e',
    ui:      '#334155'
  };

  var fireflies = [];
  var score = 0;
  var needed = 20;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var particles = [];

  function spawnFirefly() {
    var glowDuration = 1.0 + Math.random() * 1.5;
    var darkDuration = 1.5 + Math.random() * 2.0;
    fireflies.push({
      x: 80 + Math.random() * (W - 160),
      y: H * 0.15 + Math.random() * (H * 0.65),
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 40,
      phase: 0,
      glowDuration: glowDuration,
      darkDuration: darkDuration,
      glowing: Math.random() > 0.4,
      size: 10 + Math.random() * 8
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var fi = fireflies.length - 1; fi >= 0; fi--) {
      var f = fireflies[fi];
      if (!f.glowing) continue;
      var dx = tx - f.x, dy = ty - f.y;
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        score++;
        fireflies.splice(fi, 1);
        hit = true;
        game.audio.play('se_tap', 0.5);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: tx, y: ty, vx: Math.cos(ang) * (80 + Math.random() * 80), vy: Math.sin(ang) * (80 + Math.random() * 80), life: 0.6 });
        }
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score * 80 + Math.ceil(timeLeft) * 40); }, 400);
        }
        break;
      }
    }
    if (!hit) {
      game.audio.play('se_failure', 0.1);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Spawn fireflies
    if (fireflies.length < 12 && Math.random() < dt * 2) {
      spawnFirefly();
    }

    // Update fireflies
    for (var fi2 = 0; fi2 < fireflies.length; fi2++) {
      var f2 = fireflies[fi2];
      f2.phase += dt;
      f2.x += f2.vx * dt;
      f2.y += f2.vy * dt;
      // Wander
      f2.vx += (Math.random() - 0.5) * 30 * dt;
      f2.vy += (Math.random() - 0.5) * 20 * dt;
      f2.vx = Math.max(-80, Math.min(80, f2.vx));
      f2.vy = Math.max(-50, Math.min(50, f2.vy));
      // Bounds
      if (f2.x < 40) { f2.x = 40; f2.vx = Math.abs(f2.vx); }
      if (f2.x > W - 40) { f2.x = W - 40; f2.vx = -Math.abs(f2.vx); }
      if (f2.y < H * 0.1) { f2.y = H * 0.1; f2.vy = Math.abs(f2.vy); }
      if (f2.y > H * 0.82) { f2.y = H * 0.82; f2.vy = -Math.abs(f2.vy); }
      // Glow cycle
      var cycleDur = f2.glowing ? f2.glowDuration : f2.darkDuration;
      if (f2.phase >= cycleDur) {
        f2.phase = 0;
        f2.glowing = !f2.glowing;
      }
    }

    for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy -= 60 * dt; // float up
      particles[pi2].life -= dt;
      if (particles[pi2].life <= 0) particles.splice(pi2, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Night sky gradient (simple)
    for (var sy = 0; sy < H * 0.8; sy += 80) {
      game.draw.rect(0, sy, W, 80, '#010208', (H * 0.8 - sy) / (H * 0.8) * 0.3);
    }

    // Grass
    game.draw.rect(0, H * 0.82, W, H * 0.18, C.grass, 0.8);
    for (var gx = 0; gx < W; gx += 30) {
      game.draw.line(gx, H * 0.82, gx + 10, H * 0.82 - 30, '#0d2a0d', 4);
      game.draw.line(gx + 15, H * 0.82, gx + 5, H * 0.82 - 20, '#0d2a0d', 4);
    }

    // Stars
    for (var si = 0; si < 50; si++) {
      var sx = (si * 137 + 30) % W;
      var sy2 = (si * 89 + 20) % (H * 0.75);
      var twinkle = 0.2 + 0.4 * Math.abs(Math.sin(elapsed * 1.5 + si * 0.8));
      game.draw.circle(sx, sy2, 2, '#fff', twinkle);
    }

    // Fireflies
    for (var fi3 = 0; fi3 < fireflies.length; fi3++) {
      var f3 = fireflies[fi3];
      if (f3.glowing) {
        var glowT = f3.phase / f3.glowDuration;
        var glowAlpha = Math.sin(glowT * Math.PI) * 0.8 + 0.1;
        game.draw.circle(f3.x, f3.y, f3.size * 3.5, C.glow, glowAlpha * 0.25);
        game.draw.circle(f3.x, f3.y, f3.size * 2, C.firefly, glowAlpha * 0.6);
        game.draw.circle(f3.x, f3.y, f3.size, C.firflyHi, glowAlpha);
      } else {
        // Dark firefly (barely visible)
        game.draw.circle(f3.x, f3.y, f3.size * 0.5, '#2a2a10', 0.3);
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8 * part.life, C.firefly, part.life);
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: C.firefly, bold: true });
    game.draw.text('光ってる時にタップ！', W / 2, H * 0.88, { size: 42, color: C.ui });

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#22c55e' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    for (var i = 0; i < 8; i++) spawnFirefly();
  });
})(game);
