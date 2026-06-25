// 258-whack-ghost.js
// ゴーストたたき — 幽霊が穴から出てくる瞬間をたたく、でも半透明で本物を見極めて
// 操作: 本物の幽霊（不透明）をタップ、偽物（半透明）は叩かない
// 成功: 20体叩く  失敗: 偽物を5回叩く or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#06040f',
    hole:   '#0a0814',
    holeHi: '#1e1838',
    ghost:  '#a855f7',
    ghHi:   '#d8b4fe',
    fake:   '#3b82f6',
    fakHi:  '#93c5fd',
    hit:    '#22c55e',
    wrong:  '#ef4444',
    ground: '#0f0c1e',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var COLS = 3;
  var ROWS = 4;
  var CELL_W = W / COLS;
  var CELL_H = (H * 0.68) / ROWS;
  var GRID_Y = H * 0.2;

  var holes = [];
  for (var row = 0; row < ROWS; row++) {
    for (var col = 0; col < COLS; col++) {
      holes.push({
        cx: col * CELL_W + CELL_W / 2,
        cy: GRID_Y + row * CELL_H + CELL_H * 0.6,
        ghost: null
      });
    }
  }

  var ghostTimer = 0;
  var GHOST_INTERVAL = 0.6;
  var hits = 0;
  var NEEDED = 20;
  var fakeHits = 0;
  var MAX_FAKE = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];

  function spawnGhost() {
    // Pick a random empty hole
    var empty = [];
    for (var i = 0; i < holes.length; i++) {
      if (!holes[i].ghost) empty.push(i);
    }
    if (empty.length === 0) return;
    var idx = empty[Math.floor(Math.random() * empty.length)];
    var isFake = Math.random() < 0.35;
    holes[idx].ghost = {
      riseTimer: 0,
      riseDur: 0.25,
      stayTimer: 0,
      stayDur: isFake ? 0.8 + Math.random() * 0.4 : 0.6 + Math.random() * 0.5,
      sinkTimer: 0,
      sinkDur: 0.2,
      phase: 'rise', // rise, stay, sink
      fake: isFake,
      hitFlash: 0
    };
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    for (var i = 0; i < holes.length; i++) {
      var h = holes[i];
      if (!h.ghost || h.ghost.phase === 'sink') continue;
      var dx = tx - h.cx, dy = ty - h.cy;
      if (dx * dx + dy * dy < 60 * 60) {
        var g = h.ghost;
        if (g.fake) {
          fakeHits++;
          feedback = '偽物！';
          feedbackCol = C.wrong;
          feedbackTimer = 0.6;
          game.audio.play('se_failure', 0.5);
          g.hitFlash = 0.3;
          if (fakeHits >= MAX_FAKE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        } else {
          hits++;
          feedback = 'やっつけた！';
          feedbackCol = C.hit;
          feedbackTimer = 0.5;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: h.cx, y: h.cy, vx: Math.cos(ang) * 130, vy: Math.sin(ang) * 130 - 50, life: 0.5 });
          }
          h.ghost = null;
          if (hits >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(hits * 100 + Math.ceil(timeLeft) * 60); }, 500);
          }
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    ghostTimer -= dt;
    if (ghostTimer <= 0 && !done) {
      spawnGhost();
      ghostTimer = GHOST_INTERVAL * (0.7 + Math.random() * 0.6);
    }

    for (var i = 0; i < holes.length; i++) {
      var g = holes[i].ghost;
      if (!g) continue;
      if (g.hitFlash > 0) g.hitFlash -= dt;
      if (g.phase === 'rise') {
        g.riseTimer += dt;
        if (g.riseTimer >= g.riseDur) g.phase = 'stay';
      } else if (g.phase === 'stay') {
        g.stayTimer += dt;
        if (g.stayTimer >= g.stayDur) g.phase = 'sink';
      } else if (g.phase === 'sink') {
        g.sinkTimer += dt;
        if (g.sinkTimer >= g.sinkDur) holes[i].ghost = null;
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground grid
    game.draw.rect(0, GRID_Y - 20, W, H * 0.68 + 40, C.ground, 0.6);

    // Holes
    for (var i2 = 0; i2 < holes.length; i2++) {
      var h = holes[i2];
      game.draw.circle(h.cx, h.cy, 52, C.hole, 0.9);
      game.draw.circle(h.cx, h.cy, 48, '#030210', 0.9);
      game.draw.circle(h.cx, h.cy, 52, C.holeHi, 0.2);
    }

    // Ghosts
    for (var i3 = 0; i3 < holes.length; i3++) {
      var h2 = holes[i3];
      var g2 = h2.ghost;
      if (!g2) continue;

      var progress = 0;
      if (g2.phase === 'rise') progress = g2.riseTimer / g2.riseDur;
      else if (g2.phase === 'stay') progress = 1;
      else progress = 1 - g2.sinkTimer / g2.sinkDur;

      var ghostY = h2.cy - progress * 80;
      var ghostAlpha = g2.fake ? 0.35 : 0.9;
      var ghostCol = g2.fake ? C.fake : C.ghost;
      var hiCol = g2.fake ? C.fakHi : C.ghHi;

      if (g2.hitFlash > 0) { ghostCol = C.wrong; ghostAlpha = 0.9; }

      game.draw.circle(h2.cx, ghostY - 30, 40 * progress, ghostCol, ghostAlpha);
      game.draw.circle(h2.cx - 14, ghostY - 40, 12 * progress, '#fff', 0.7 * ghostAlpha);
      game.draw.circle(h2.cx + 14, ghostY - 40, 12 * progress, '#fff', 0.7 * ghostAlpha);

      if (g2.fake) {
        // Ghost outline (dashed visual hint)
        game.draw.circle(h2.cx, ghostY - 30, 44 * progress, hiCol, 0.2 * progress);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * (p.life / 0.5), C.ghHi, p.life * 0.9);
    }

    // Legend
    game.draw.circle(W * 0.25, H * 0.14, 16, C.ghost, 0.9);
    game.draw.text('本物 → たたく', W * 0.6, H * 0.143, { size: 34, color: C.text });
    game.draw.circle(W * 0.25, H * 0.18, 16, C.fake, 0.35);
    game.draw.text('偽物 → 無視', W * 0.6, H * 0.183, { size: 34, color: C.ui });

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.9, { size: 52, color: feedbackCol, bold: true });
    }

    // Fake hit dots
    for (var fi = 0; fi < MAX_FAKE; fi++) {
      game.draw.circle(W / 2 - (MAX_FAKE - 1) * 28 + fi * 56, H * 0.94, 16, fi < fakeHits ? C.wrong : '#0a0814');
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.hit : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    ghostTimer = 1.0;
  });
})(game);
