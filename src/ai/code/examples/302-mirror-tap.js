// 302-mirror-tap.js
// ミラータップ — 鏡に映った自分の反転した動きを読んで正確にタップ
// 操作: 鏡の中のターゲットの「実際の位置」をタップ
// 成功: 20回正確にタップ  失敗: 5回ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050210',
    mirror:  '#0f0c28',
    mirrorHi:'#1a1640',
    frame:   '#4338ca',
    frameHi: '#6d28d9',
    target:  '#ec4899',
    targetHi:'#f9a8d4',
    real:    '#22c55e',
    realHi:  '#86efac',
    hit:     '#f59e0b',
    miss:    '#ef4444',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var MIRROR_X = W * 0.08;
  var MIRROR_Y = H * 0.18;
  var MIRROR_W = W * 0.84;
  var MIRROR_H = H * 0.55;

  var targets = []; // {mx, my, pulse, life} — mirror coordinates
  var scored = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];
  var hitAnim = []; // {x, y, ok, life}

  function spawnTarget() {
    if (targets.length >= 3) return;
    // Random position in mirror (mirror coords)
    var mx = MIRROR_X + 60 + Math.random() * (MIRROR_W - 120);
    var my = MIRROR_Y + 60 + Math.random() * (MIRROR_H - 120);
    targets.push({ mx: mx, my: my, pulse: Math.random() * Math.PI * 2, life: 4 + Math.random() * 2 });
  }

  function mirrorToReal(mx, my) {
    // Mirror: horizontally flipped within the mirror frame
    var relX = mx - MIRROR_X;
    var relY = my - MIRROR_Y;
    var realRelX = MIRROR_W - relX; // flip X
    return { x: MIRROR_X + realRelX, y: my };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var ti = targets.length - 1; ti >= 0; ti--) {
      var tg = targets[ti];
      var real = mirrorToReal(tg.mx, tg.my);
      var dx = tx - real.x, dy = ty - real.y;
      if (dx * dx + dy * dy < 70 * 70) {
        // Correct tap
        scored++;
        hitAnim.push({ x: real.x, y: real.y, ok: true, life: 0.6 });
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: real.x, y: real.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.realHi });
        }
        targets.splice(ti, 1);
        game.audio.play('se_success', 0.4);
        hit = true;
        if (scored >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(scored * 150 + Math.ceil(timeLeft) * 100); }, 400);
        }
        break;
      }
    }
    if (!hit && ty > MIRROR_Y && ty < MIRROR_Y + MIRROR_H && tx > MIRROR_X && tx < MIRROR_X + MIRROR_W) {
      misses++;
      hitAnim.push({ x: tx, y: ty, ok: false, life: 0.5 });
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnTarget();
      spawnTimer = 1.2 + Math.random() * 0.8;
    }

    // Age targets
    for (var ti = targets.length - 1; ti >= 0; ti--) {
      targets[ti].life -= dt;
      targets[ti].pulse += dt * 4;
      if (targets[ti].life <= 0) {
        misses++;
        game.audio.play('se_failure', 0.3);
        targets.splice(ti, 1);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var hi = hitAnim.length - 1; hi >= 0; hi--) {
      hitAnim[hi].life -= dt * 2;
      if (hitAnim[hi].life <= 0) hitAnim.splice(hi, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Mirror frame
    game.draw.rect(MIRROR_X - 16, MIRROR_Y - 16, MIRROR_W + 32, MIRROR_H + 32, C.frame, 0.9);
    game.draw.rect(MIRROR_X - 8, MIRROR_Y - 8, MIRROR_W + 16, MIRROR_H + 16, C.frameHi, 0.4);
    // Mirror surface
    game.draw.rect(MIRROR_X, MIRROR_Y, MIRROR_W, MIRROR_H, C.mirror, 0.95);
    // Mirror reflections (sheen)
    game.draw.rect(MIRROR_X + 10, MIRROR_Y + 10, 40, MIRROR_H - 20, C.mirrorHi, 0.15);
    game.draw.rect(MIRROR_X + 60, MIRROR_Y + 10, 15, MIRROR_H - 20, C.mirrorHi, 0.08);

    // Mirror divider line (to show which side is flipped)
    game.draw.line(W / 2, MIRROR_Y, W / 2, MIRROR_Y + MIRROR_H, C.frameHi, 2);
    game.draw.text('←鏡像', MIRROR_X + MIRROR_W * 0.25, MIRROR_Y - 28, { size: 28, color: C.frame });
    game.draw.text('実際→', MIRROR_X + MIRROR_W * 0.72, MIRROR_Y - 28, { size: 28, color: C.real });

    // Targets in mirror (shown as pink circles)
    for (var ti2 = 0; ti2 < targets.length; ti2++) {
      var tg2 = targets[ti2];
      var pulse = 3 * Math.sin(tg2.pulse);
      var lifeRatio = tg2.life / 6;
      // Mirror position (draw in left half of mirror display)
      game.draw.circle(tg2.mx, tg2.my, 36 + pulse + 10, C.target, lifeRatio * 0.2);
      game.draw.circle(tg2.mx, tg2.my, 36 + pulse, C.target, lifeRatio * 0.9);
      game.draw.circle(tg2.mx, tg2.my, 20, C.targetHi, lifeRatio * 0.7);

      // Real position indicator (outside mirror, right side)
      var real2 = mirrorToReal(tg2.mx, tg2.my);
      // Only show real target position hint faintly
      game.draw.circle(real2.x, real2.y, 36 + pulse, C.real, 0.15);
      game.draw.circle(real2.x, real2.y, 20, C.realHi, 0.3);
    }

    // Hit animations
    for (var hi2 = 0; hi2 < hitAnim.length; hi2++) {
      var ha = hitAnim[hi2];
      var col = ha.ok ? C.hit : C.miss;
      game.draw.circle(ha.x, ha.y, 50 * ha.life * 2, col, ha.life * 0.5);
      game.draw.text(ha.ok ? '✓' : '✕', ha.x, ha.y + 12, { size: 48, color: col, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Instructions
    game.draw.text('鏡に映った的の「本当の位置」をタップ', W / 2, H * 0.84, { size: 32, color: C.ui });

    game.draw.text(scored + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 22 + mi * 44, H * 0.93, 14, mi < misses ? C.miss : '#050210');
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.frame : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.5;
  });
})(game);
