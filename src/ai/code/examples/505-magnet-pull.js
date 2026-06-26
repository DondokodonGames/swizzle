// 505-magnet-pull.js
// マグネットプル — 磁石でバラバラの金属片を引き寄せて集める
// 操作: タップでその位置に磁石を配置（保持中は引力継続）
// 成功: 20個の金属片を基地に回収  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030506',
    metal:  '#64748b',
    metalHi:'#94a3b8',
    magnet: '#ef4444',
    magnetHi:'#fca5a5',
    base:   '#22c55e',
    baseHi: '#86efac',
    field:  '#7c3aed',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var BASE_X = W / 2;
  var BASE_Y = H * 0.85;
  var BASE_R = 70;
  var MAGNET_R = 55;
  var METAL_R = 22;
  var ATTRACT_R = 220;
  var ATTRACT_FORCE = 600;

  var metals = [];
  var magnetX = -1, magnetY = -1;
  var magnetActive = false;
  var collected = 0;
  var NEEDED = 20;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];

  function spawnMetals() {
    metals = [];
    for (var i = 0; i < 25; i++) {
      var mx, my, ok, attempts = 0;
      do {
        mx = METAL_R + Math.random() * (W - METAL_R * 2);
        my = H * 0.1 + Math.random() * H * 0.65;
        ok = Math.sqrt((mx - BASE_X) * (mx - BASE_X) + (my - BASE_Y) * (my - BASE_Y)) > BASE_R + 80;
        attempts++;
      } while (!ok && attempts < 20);
      metals.push({ x: mx, y: my, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, alive: true });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    magnetX = tx;
    magnetY = ty;
    magnetActive = true;
    game.audio.play('se_tap', 0.3);
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

    // Deactivate magnet over time
    if (magnetActive) {
      magnetActive = false; // single tap - only active for one frame
    }

    // Persistent magnet while finger held
    // We simulate by checking onTap each frame - instead use flag that lasts 0.3s
    // (Handled via magnetTimer below)

    // Update metals
    for (var i = metals.length - 1; i >= 0; i--) {
      var m = metals[i];
      if (!m.alive) continue;

      // Friction
      m.vx *= Math.pow(0.85, dt * 60);
      m.vy *= Math.pow(0.85, dt * 60);

      // Magnet attraction
      if (magnetX >= 0) {
        var dx = magnetX - m.x, dy = magnetY - m.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < ATTRACT_R && dist > 1) {
          var force = ATTRACT_FORCE * (1 - dist / ATTRACT_R) * dt;
          m.vx += (dx / dist) * force;
          m.vy += (dy / dist) * force;
        }
      }

      // Base attraction (gentle)
      var bx = BASE_X - m.x, by = BASE_Y - m.y;
      var bdist = Math.sqrt(bx * bx + by * by);
      if (bdist > 1) {
        m.vx += (bx / bdist) * 30 * dt;
        m.vy += (by / bdist) * 30 * dt;
      }

      // Speed cap
      var spd = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
      var MAX_SPD = 500;
      if (spd > MAX_SPD) { m.vx *= MAX_SPD / spd; m.vy *= MAX_SPD / spd; }

      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // Wall bounce
      if (m.x < METAL_R) { m.x = METAL_R; m.vx = Math.abs(m.vx) * 0.6; }
      if (m.x > W - METAL_R) { m.x = W - METAL_R; m.vx = -Math.abs(m.vx) * 0.6; }
      if (m.y < METAL_R) { m.y = METAL_R; m.vy = Math.abs(m.vy) * 0.6; }
      if (m.y > H - METAL_R) { m.y = H - METAL_R; m.vy = -Math.abs(m.vy) * 0.6; }

      // Collect to base
      var dbx = m.x - BASE_X, dby = m.y - BASE_Y;
      if (Math.sqrt(dbx * dbx + dby * dby) < BASE_R + METAL_R) {
        m.alive = false;
        collected++;
        game.audio.play('se_tap', 0.25);
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: m.x, y: m.y, vx: Math.cos(ang) * 80, vy: Math.sin(ang) * 80, life: 0.35, col: C.metalHi });
        }
        if (collected >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(collected * 200 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }

    // Clear dead magnet position after brief moment
    magnetX = -1; magnetY = -1;

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Base
    game.draw.circle(BASE_X, BASE_Y, BASE_R + 20, C.baseHi, 0.15);
    game.draw.circle(BASE_X, BASE_Y, BASE_R, C.base, 0.8);
    game.draw.circle(BASE_X - BASE_R * 0.25, BASE_Y - BASE_R * 0.25, BASE_R * 0.25, '#fff', 0.2);

    // Metal pieces
    for (var i2 = 0; i2 < metals.length; i2++) {
      if (!metals[i2].alive) continue;
      var m2 = metals[i2];
      game.draw.circle(m2.x, m2.y, METAL_R + 4, C.metalHi, 0.15);
      game.draw.circle(m2.x, m2.y, METAL_R, C.metal, 0.85);
      game.draw.circle(m2.x - 6, m2.y - 6, 6, '#fff', 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Instructions
    game.draw.text('タップで磁石！', W / 2, H * 0.92, { size: 44, color: C.ui });

    game.draw.text(collected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.magnet : C.magnetHi);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    spawnMetals();
  });
})(game);
