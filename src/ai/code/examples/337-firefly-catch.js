// 337-firefly-catch.js
// ホタルキャッチ — 暗闇に光るホタルを素早くタップして捕まえる
// 操作: タップして光っているホタルを捕まえる
// 成功: 25匹捕獲  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#010508',
    grass:  '#052e16',
    grassHi:'#065f46',
    tree:   '#1c3d12',
    treeHi: '#2d5a1b',
    firefly:'#a3e635',
    fireflyHi:'#d9f99d',
    fireflyGlow:'#4ade80',
    caught: '#22c55e',
    caughtHi:'#86efac',
    miss:   '#fbbf24',
    ui:     '#374151',
    text:   '#ecfdf5'
  };

  var fireflies = [];
  var caught = 0;
  var NEEDED = 25;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var catchAnims = [];

  function spawnFirefly() {
    var x = 80 + Math.random() * (W - 160);
    var y = H * 0.18 + Math.random() * H * 0.65;
    var glowCycle = 1.5 + Math.random() * 3; // seconds for one glow pulse
    var glowPhase = Math.random() * Math.PI * 2;
    var vx = (Math.random() - 0.5) * 60;
    var vy = (Math.random() - 0.5) * 40;
    fireflies.push({
      x: x, y: y, vx: vx, vy: vy,
      glowCycle: glowCycle, glowPhase: glowPhase,
      r: 14,
      changeDir: 1 + Math.random() * 2
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find the brightest firefly near tap
    var best = -1, bestGlow = 0.3; // minimum glow to be catchable
    for (var fi = 0; fi < fireflies.length; fi++) {
      var f = fireflies[fi];
      var glow = (Math.sin(elapsed / f.glowCycle * Math.PI * 2 + f.glowPhase) + 1) / 2;
      var dist = Math.hypot(tx - f.x, ty - f.y);
      if (dist < f.r + 40 && glow > bestGlow) {
        bestGlow = glow;
        best = fi;
      }
    }

    if (best >= 0) {
      var f2 = fireflies[best];
      caught++;
      catchAnims.push({ x: f2.x, y: f2.y, life: 0.7, text: '+1' });
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: f2.x, y: f2.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.5, col: C.firefly });
      }
      game.audio.play('se_success', 0.4);
      fireflies.splice(best, 1);
      if (caught >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(caught * 80 + Math.ceil(timeLeft) * 100); }, 400);
      }
    } else {
      // Miss - disturb nearby fireflies
      catchAnims.push({ x: tx, y: ty, life: 0.4, text: 'ミス' });
      for (var fi2 = 0; fi2 < fireflies.length; fi2++) {
        if (Math.hypot(tx - fireflies[fi2].x, ty - fireflies[fi2].y) < 120) {
          var ang2 = Math.atan2(fireflies[fi2].y - ty, fireflies[fi2].x - tx);
          fireflies[fi2].vx += Math.cos(ang2) * 80;
          fireflies[fi2].vy += Math.sin(ang2) * 80;
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Maintain firefly count
    while (fireflies.length < 8 + Math.floor(elapsed / 10)) {
      spawnFirefly();
    }

    // Update fireflies
    for (var fi = 0; fi < fireflies.length; fi++) {
      var f = fireflies[fi];
      f.changeDir -= dt;
      if (f.changeDir <= 0) {
        f.vx = (Math.random() - 0.5) * 80;
        f.vy = (Math.random() - 0.5) * 60;
        f.changeDir = 1 + Math.random() * 2;
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      // Keep in bounds
      if (f.x < 60) { f.x = 60; f.vx = Math.abs(f.vx); }
      if (f.x > W - 60) { f.x = W - 60; f.vx = -Math.abs(f.vx); }
      if (f.y < H * 0.15) { f.y = H * 0.15; f.vy = Math.abs(f.vy); }
      if (f.y > H * 0.85) { f.y = H * 0.85; f.vy = -Math.abs(f.vy); }
    }

    for (var ca = catchAnims.length - 1; ca >= 0; ca--) {
      catchAnims[ca].y -= 40 * dt;
      catchAnims[ca].life -= dt * 2;
      if (catchAnims[ca].life <= 0) catchAnims.splice(ca, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Night sky gradient
    game.draw.rect(0, 0, W, H * 0.8, '#010810', 0.6);

    // Trees (silhouettes)
    for (var ti = 0; ti < 5; ti++) {
      var tx2 = ti * W * 0.25 - 20;
      var th = 200 + (ti % 3) * 80;
      game.draw.rect(tx2 + 40, H * 0.78 - th, 40, th, C.tree, 0.9);
      game.draw.circle(tx2 + 60, H * 0.78 - th, 70, C.treeHi, 0.8);
      game.draw.circle(tx2 + 60, H * 0.78 - th - 40, 55, C.tree, 0.9);
    }

    // Ground
    game.draw.rect(0, H * 0.85, W, H * 0.15, C.grass, 0.9);
    game.draw.rect(0, H * 0.85, W, 16, C.grassHi, 0.6);

    // Fireflies glow halos + bodies
    for (var fi3 = 0; fi3 < fireflies.length; fi3++) {
      var f3 = fireflies[fi3];
      var glow = (Math.sin(elapsed / f3.glowCycle * Math.PI * 2 + f3.glowPhase) + 1) / 2;
      if (glow > 0.1) {
        game.draw.circle(f3.x, f3.y, f3.r * 4, C.fireflyGlow, glow * 0.2);
        game.draw.circle(f3.x, f3.y, f3.r * 2.5, C.fireflyGlow, glow * 0.3);
        game.draw.circle(f3.x, f3.y, f3.r, C.firefly, glow * 0.9 + 0.1);
        game.draw.circle(f3.x, f3.y, f3.r * 0.4, C.fireflyHi, glow * 0.8);
      } else {
        game.draw.circle(f3.x, f3.y, f3.r * 0.5, '#1a2e0a', 0.6);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Catch/miss animations
    for (var ca2 = 0; ca2 < catchAnims.length; ca2++) {
      var anim = catchAnims[ca2];
      game.draw.text(anim.text, anim.x, anim.y, { size: 40, color: anim.text === '+1' ? C.caughtHi : C.miss, bold: true });
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.grassHi : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    // Spawn initial fireflies
    for (var i = 0; i < 6; i++) spawnFirefly();
  });
})(game);
