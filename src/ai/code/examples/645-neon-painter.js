// 645-neon-painter.js
// ネオンペインター — 動く的を通り過ぎる瞬間にペイントしろ
// 操作: タップでペイントショット
// 成功: 10個の的を全て塗る  失敗: 5回空振り or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060010',
    target:  '#1a002a',
    targetHi:'#2e0050',
    painted: '#e879f9',
    paintedHi:'#fae8ff',
    shot:    '#f0abfc',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0014',
    trail:   '#a855f7'
  };

  var NEON_COLORS = ['#e879f9','#22d3ee','#4ade80','#facc15','#f87171','#60a5fa'];

  var NUM_TARGETS = 10;
  var targets = [];
  var shots = [];
  var paints = [];

  var painted = 0;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.painted;

  function initTargets() {
    targets = [];
    for (var i = 0; i < NUM_TARGETS; i++) {
      var col = NEON_COLORS[i % NEON_COLORS.length];
      targets.push({
        x: W * 0.15 + Math.random() * (W * 0.7),
        y: H * 0.2 + (i / (NUM_TARGETS - 1)) * H * 0.55,
        vx: (Math.random() > 0.5 ? 1 : -1) * (150 + Math.random() * 200),
        r: 56,
        color: col,
        painted: false,
        paintAlpha: 0
      });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Fire paint shot at tap position
    shots.push({ x: tx, y: ty, r: 20, life: 0.3 });

    var hit = false;
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti];
      if (t.painted) continue;
      var dx = tx - t.x, dy = ty - t.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < t.r + 30) {
        t.painted = true;
        painted++;
        flashCol = t.color;
        flashAnim = 0.2;
        game.audio.play('se_success', 0.5);
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: t.x, y: t.y, vx: Math.cos(pa) * 250, vy: Math.sin(pa) * 250, life: 0.5, col: t.color });
        }
        hit = true;
        if (painted >= NUM_TARGETS && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(painted * 400 + Math.ceil(timeLeft) * 100); }, 700);
        }
        break;
      }
    }

    if (!hit) {
      misses++;
      flashCol = C.miss;
      flashAnim = 0.2;
      game.audio.play('se_failure', 0.25);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
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
    if (flashAnim > 0) flashAnim -= dt * 4;

    // Move targets
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti];
      if (t.painted) {
        t.paintAlpha = Math.min(1, t.paintAlpha + dt * 3);
        continue;
      }
      t.x += t.vx * dt;
      if (t.x < t.r) { t.x = t.r; t.vx = Math.abs(t.vx); }
      if (t.x > W - t.r) { t.x = W - t.r; t.vx = -Math.abs(t.vx); }
    }

    for (var si = shots.length - 1; si >= 0; si--) {
      shots[si].life -= dt * 4;
      if (shots[si].life <= 0) shots.splice(si, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Targets
    for (var ti2 = 0; ti2 < targets.length; ti2++) {
      var t2 = targets[ti2];
      if (t2.painted) {
        // Painted — show as filled splat
        game.draw.circle(t2.x, t2.y, t2.r * 1.3, t2.color, t2.paintAlpha * 0.5);
        game.draw.circle(t2.x, t2.y, t2.r, t2.color, t2.paintAlpha * 0.9);
        game.draw.text('✓', t2.x, t2.y + 16, { size: 56, color: '#fff', bold: true });
      } else {
        // Unpainted
        game.draw.circle(t2.x + 5, t2.y + 5, t2.r, '#000', 0.3);
        game.draw.circle(t2.x, t2.y, t2.r, C.target, 0.85);
        game.draw.circle(t2.x, t2.y, t2.r - 10, C.targetHi, 0.6);
        // Pulsing ring
        var pulse = 0.3 + Math.sin(elapsed * 5 + ti2) * 0.15;
        game.draw.circle(t2.x, t2.y, t2.r + 16, t2.color, pulse * 0.3);
        game.draw.circle(t2.x, t2.y, t2.r, t2.color, 0.2);
      }
    }

    // Shot indicators
    for (var si2 = 0; si2 < shots.length; si2++) {
      var sh = shots[si2];
      game.draw.circle(sh.x, sh.y, sh.r * (1 - sh.life * 2), C.shot, sh.life * 2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 12 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 52 + mi * 104, H * 0.955, 22, mi < misses ? C.miss : C.ui, 0.9);
    }

    game.draw.text(painted + ' / ' + NUM_TARGETS, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.trail : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    initTargets();
  });
})(game);
