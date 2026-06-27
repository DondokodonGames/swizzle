// 700-fireworks.js
// 花火師 — タップした場所で花火を打ち上げ、空を彩れ
// 操作: タップで花火発射（爆発のタイミングは自動）
// 成功: 30発打ち上げる  失敗: なし（全弾使い切りで成功）

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#000108',
    rocket:   '#fbbf24',
    text:     '#f1f5f9',
    correct:  '#22c55e',
    ui:       '#000208'
  };

  // 8 vivid firework palettes
  var PALETTES = [
    ['#f87171', '#fca5a5', '#fee2e2'],
    ['#fb923c', '#fdba74', '#ffedd5'],
    ['#facc15', '#fde68a', '#fef9c3'],
    ['#4ade80', '#86efac', '#dcfce7'],
    ['#38bdf8', '#7dd3fc', '#e0f2fe'],
    ['#818cf8', '#a5b4fc', '#e0e7ff'],
    ['#e879f9', '#f0abfc', '#fae8ff'],
    ['#f472b6', '#f9a8d4', '#fce7f3']
  ];

  var rockets = [];
  var explosions = [];
  var stars = [];
  var launched = 0;
  var NEEDED = 30;
  var done = false;
  var timeLeft = 120;
  var elapsed = 0;

  // Generate background stars
  for (var si = 0; si < 80; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H * 0.9, r: Math.random() * 1.5 + 0.3, p: Math.random() * Math.PI * 2 });
  }

  function launchRocket(tx, ty) {
    var targetY = Math.max(H * 0.1, Math.min(H * 0.55, ty));
    var palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    rockets.push({
      x: tx,
      y: H * 0.95,
      targetY: targetY,
      vy: -(H * 0.95 - targetY) / 0.9, // arrive in ~0.9s
      trail: [],
      palette: palette,
      exploded: false
    });
  }

  function explodeRocket(r) {
    r.exploded = true;
    var palette = r.palette;
    var count = 60 + Math.floor(Math.random() * 40);
    var particles = [];
    var style = Math.floor(Math.random() * 3); // 0=burst, 1=ring, 2=willow
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      var speed, life;
      if (style === 0) {
        speed = 200 + Math.random() * 300;
        life = 0.8 + Math.random() * 0.5;
      } else if (style === 1) {
        speed = 280 + Math.random() * 40;
        life = 0.6 + Math.random() * 0.3;
      } else {
        // Willow: slower, longer
        speed = 120 + Math.random() * 180;
        life = 1.2 + Math.random() * 0.6;
      }
      var col = palette[Math.floor(Math.random() * palette.length)];
      particles.push({
        x: r.x, y: r.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (style === 2 ? 0 : 50),
        life: life,
        maxLife: life,
        col: col,
        gravity: style === 2 ? 200 : 80,
        r: 4 + Math.random() * 5
      });
    }
    // Star burst (center glow)
    explosions.push({ x: r.x, y: r.y, particles: particles, glow: 1.0, palette: palette });
    game.audio.play('se_success', 0.4 + Math.random() * 0.3);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    launchRocket(tx, ty);
    launched++;
    game.audio.play('se_tap', 0.1);
    if (launched >= NEEDED && !done) {
      // Wait for last explosion, then succeed
      done = true;
      setTimeout(function() {
        game.end.success(launched * 500 + 1000);
      }, 2000);
    }
  });

  game.onUpdate(function(dt) {
    elapsed += dt;
    if (done && rockets.length === 0 && explosions.every(function(e) { return e.particles.length === 0; })) {
      // Game already ended via timeout
    }

    // Update rockets
    for (var ri = rockets.length - 1; ri >= 0; ri--) {
      var r = rockets[ri];
      r.trail.push({ x: r.x, y: r.y, life: 0.3 });
      r.y += r.vy * dt;

      if (r.y <= r.targetY && !r.exploded) {
        explodeRocket(r);
        rockets.splice(ri, 1);
        continue;
      }
      for (var tr = r.trail.length - 1; tr >= 0; tr--) {
        r.trail[tr].life -= dt * 4;
        if (r.trail[tr].life <= 0) r.trail.splice(tr, 1);
      }
    }

    // Update explosions
    for (var ei = explosions.length - 1; ei >= 0; ei--) {
      var exp = explosions[ei];
      exp.glow -= dt * 2;
      for (var pi = exp.particles.length - 1; pi >= 0; pi--) {
        var p = exp.particles[pi];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.vx *= 1 - dt * 0.8;
        p.life -= dt;
        if (p.life <= 0) exp.particles.splice(pi, 1);
      }
      if (exp.particles.length === 0) explosions.splice(ei, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars (twinkle)
    for (var sti = 0; sti < stars.length; sti++) {
      var s = stars[sti];
      s.p += dt;
      var tw = 0.3 + 0.7 * Math.abs(Math.sin(s.p * 1.5));
      game.draw.circle(s.x, s.y, s.r, '#ffffff', tw * 0.5);
    }

    // Silhouette hills at bottom
    game.draw.rect(0, H * 0.88, W, H * 0.12, '#020410', 1.0);
    // Simple city silhouette
    var buildings = [80, 120, 60, 100, 150, 80, 200, 70, 110, 90, 160, 75, 130];
    var bw = W / buildings.length;
    for (var bi = 0; bi < buildings.length; bi++) {
      game.draw.rect(bi * bw + 4, H * 0.88 - buildings[bi], bw - 8, buildings[bi] + H * 0.12, '#050510', 1.0);
    }

    // Rockets
    for (var ri2 = 0; ri2 < rockets.length; ri2++) {
      var r2 = rockets[ri2];
      for (var tr2 = 0; tr2 < r2.trail.length; tr2++) {
        var t = r2.trail[tr2];
        game.draw.circle(t.x, t.y, 6 * t.life, C.rocket, t.life * 0.8);
      }
      game.draw.circle(r2.x, r2.y, 8, C.rocket, 0.95);
    }

    // Explosions
    for (var ei2 = 0; ei2 < explosions.length; ei2++) {
      var exp2 = explosions[ei2];
      // Center glow
      if (exp2.glow > 0) {
        game.draw.circle(exp2.x, exp2.y, 60 * exp2.glow, exp2.palette[0], exp2.glow * 0.3);
      }
      for (var pi2 = 0; pi2 < exp2.particles.length; pi2++) {
        var p2 = exp2.particles[pi2];
        var lifeRatio = p2.life / p2.maxLife;
        game.draw.circle(p2.x, p2.y, p2.r * lifeRatio, p2.col, lifeRatio * 0.9);
      }
    }

    // Timer / failure condition
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.4);
        game.end.failure();
        return;
      }
    }

    // UI
    game.draw.text(launched + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('タップで花火！', W / 2, H * 0.93, { size: 44, color: '#ffffff33', bold: true });
    game.draw.rect(0, 0, W, 72, C.bg);
    var ratio = Math.min(1, launched / NEEDED);
    game.draw.rect(0, 0, W * ratio, 12, C.correct);
    game.draw.text('700', W / 2, 36, { size: 44, color: launched >= NEEDED ? C.correct : '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
  });
})(game);
