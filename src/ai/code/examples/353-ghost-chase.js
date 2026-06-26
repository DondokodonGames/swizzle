// 353-ghost-chase.js
// ゴーストチェイス — 暗闇に現れるゴーストを懐中電灯で照らして退治
// 操作: タップで懐中電灯を向けてゴーストを照らす
// 成功: 15体退治  失敗: 5体通り抜けられる or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#000508',
    dark:   '#020b10',
    light:  '#fef9c3',
    lightHi:'#fffde7',
    ghost:  '#a5b4fc',
    ghostHi:'#e0e7ff',
    ghostDim:'#3730a3',
    scared: '#f0abfc',
    scaredHi:'#fae8ff',
    hit:    '#22c55e',
    hitHi:  '#86efac',
    miss:   '#ef4444',
    ui:     '#475569',
    text:   '#e2e8f0'
  };

  var torchX = W / 2;
  var torchY = H * 0.75;
  var TORCH_R = 200;

  var ghosts = [];
  var killed = 0;
  var NEEDED = 15;
  var passed = 0;
  var MAX_PASS = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var spawnTimer = 0;
  var hitAnims = [];

  function spawnGhost() {
    var side = Math.random() < 0.5 ? 0 : 1;
    var startX = side === 0 ? -60 : W + 60;
    var startY = H * 0.2 + Math.random() * H * 0.5;
    var speed = 60 + Math.random() * 80;
    ghosts.push({
      x: startX,
      y: startY,
      vx: side === 0 ? speed : -speed,
      vy: (Math.random() - 0.5) * 30,
      r: 44,
      wobble: Math.random() * Math.PI * 2,
      lit: 0,
      dying: false,
      dyingTimer: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    torchX = tx;
    torchY = ty;
    game.audio.play('se_tap', 0.15);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Spawn ghosts
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnGhost();
      spawnTimer = 1.2 - Math.min(0.7, elapsed * 0.015);
    }

    // Update ghosts
    for (var gi = ghosts.length - 1; gi >= 0; gi--) {
      var g = ghosts[gi];

      if (g.dying) {
        g.dyingTimer += dt;
        for (var pi = 0; pi < 2; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: g.x, y: g.y, vx: Math.cos(ang)*100, vy: Math.sin(ang)*100-50, life:0.4, col: C.scaredHi });
        }
        if (g.dyingTimer > 0.4) {
          ghosts.splice(gi, 1);
        }
        continue;
      }

      g.wobble += dt * 2;
      g.x += g.vx * dt;
      g.y += g.vy * dt + Math.sin(g.wobble) * 20 * dt;

      // Check if in torch light
      var dist = Math.hypot(g.x - torchX, g.y - torchY);
      g.lit = dist < TORCH_R ? 1 - dist / TORCH_R : 0;

      // Scared ghosts slow down
      if (g.lit > 0.3) {
        g.vx *= (1 - 2 * dt);
      }

      // If fully lit, start dying
      if (g.lit > 0.7) {
        g.dying = true;
        killed++;
        hitAnims.push({ x: g.x, y: g.y, life: 0.6 });
        game.audio.play('se_success', 0.4);
        if (killed >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(killed * 200 + Math.ceil(timeLeft) * 80); }, 500);
          return;
        }
        continue;
      }

      // Off screen = passed
      if (g.x < -120 || g.x > W + 120) {
        passed++;
        ghosts.splice(gi, 1);
        game.audio.play('se_failure', 0.3);
        if (passed >= MAX_PASS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }
    }

    for (var ha = hitAnims.length - 1; ha >= 0; ha--) {
      hitAnims[ha].life -= dt * 2;
      if (hitAnims[ha].life <= 0) hitAnims.splice(ha, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Dark atmosphere
    game.draw.rect(0, 0, W, H, C.dark, 0.7);

    // Torch light cone
    game.draw.circle(torchX, torchY, TORCH_R * 1.5, C.light, 0.04);
    game.draw.circle(torchX, torchY, TORCH_R, C.light, 0.08);
    game.draw.circle(torchX, torchY, TORCH_R * 0.5, C.light, 0.12);
    game.draw.circle(torchX, torchY, 30, C.lightHi, 0.7);

    // Ghosts
    for (var gi2 = 0; gi2 < ghosts.length; gi2++) {
      var g2 = ghosts[gi2];
      var alpha = 0.2 + g2.lit * 0.7;
      var col = g2.dying ? C.scared : (g2.lit > 0.3 ? C.scared : C.ghostDim);
      if (g2.lit > 0.1) col = C.ghost;

      var wobY = Math.sin(g2.wobble) * 10;

      // Ghost body
      game.draw.circle(g2.x, g2.y + wobY - 10, g2.r, col, alpha);
      // Ghost tail (wavy bottom)
      for (var ti = -2; ti <= 2; ti++) {
        game.draw.circle(g2.x + ti * 20, g2.y + wobY + 40 + Math.sin(g2.wobble + ti) * 10, 18, col, alpha * 0.8);
      }
      // Eyes
      if (g2.lit > 0.2) {
        var eyeCol = g2.lit > 0.6 ? C.scared : C.ghostHi;
        game.draw.circle(g2.x - 14, g2.y + wobY - 16, 10, eyeCol, alpha);
        game.draw.circle(g2.x + 14, g2.y + wobY - 16, 10, eyeCol, alpha);
        if (g2.lit > 0.5) {
          // Scared expression
          game.draw.text('!', g2.x, g2.y + wobY - 60, { size: 36, color: C.scaredHi });
        }
      }
    }

    // Hit animations
    for (var ha2 = 0; ha2 < hitAnims.length; ha2++) {
      var h = hitAnims[ha2];
      game.draw.circle(h.x, h.y, 80 * (1 - h.life), C.hitHi, h.life * 0.6);
      game.draw.text('退治！', h.x, h.y, { size: 44, color: C.hitHi, bold: true });
    }

    // Torch handle
    game.draw.rect(torchX - 12, torchY - 8, 24, 60, '#44403c', 0.9);
    game.draw.rect(torchX - 8, torchY - 20, 16, 24, '#fef08a', 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Pass dots
    for (var pi2 = 0; pi2 < MAX_PASS; pi2++) {
      game.draw.circle(W / 2 - (MAX_PASS - 1) * 28 + pi2 * 56, H * 0.91, 16, pi2 < passed ? C.miss : '#0a0a10');
    }

    game.draw.text(killed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ghostDim : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#e0e7ff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    torchX = W / 2;
    torchY = H * 0.5;
  });
})(game);
