// 292-nano-repair.js
// ナノリペア — 電子回路の断線箇所を素早く見つけてタップ修理する
// 操作: タップで断線した回路部分を修理
// 成功: 20箇所修理  失敗: 8箇所放置で機能停止 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020508',
    board:  '#0d1f1a',
    trace:  '#22c55e',
    traceHi:'#86efac',
    traceLo:'#166534',
    broken: '#ef4444',
    brkHi:  '#fca5a5',
    repair: '#fde68a',
    repHi:  '#fef3c7',
    pulse:  '#4ade80',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var breaks = []; // active break points
  var repaired = 0;
  var NEEDED = 20;
  var lost = 0;
  var MAX_LOST = 8;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var spawnTimer = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];

  // Circuit paths (horizontal and vertical line segments)
  var paths = [];
  function buildPaths() {
    paths = [];
    var hLines = [H * 0.25, H * 0.38, H * 0.51, H * 0.64, H * 0.77];
    var vLines = [W * 0.15, W * 0.3, W * 0.45, W * 0.6, W * 0.75, W * 0.9];
    for (var hi = 0; hi < hLines.length; hi++) {
      paths.push({ type: 'h', y: hLines[hi], x1: 40, x2: W - 40 });
    }
    for (var vi = 0; vi < vLines.length; vi++) {
      paths.push({ type: 'v', x: vLines[vi], y1: hLines[0], y2: hLines[hLines.length - 1] });
    }
  }

  function spawnBreak() {
    if (breaks.length >= 10) return;
    var path = paths[Math.floor(Math.random() * paths.length)];
    var bx, by;
    if (path.type === 'h') {
      bx = path.x1 + Math.random() * (path.x2 - path.x1);
      by = path.y;
    } else {
      bx = path.x;
      by = path.y1 + Math.random() * (path.y2 - path.y1);
    }
    // Check not too close to existing breaks
    for (var bi = 0; bi < breaks.length; bi++) {
      var dx = breaks[bi].x - bx, dy = breaks[bi].y - by;
      if (dx * dx + dy * dy < 80 * 80) return;
    }
    breaks.push({ x: bx, y: by, life: 5 + Math.random() * 3, maxLife: 0, flash: 0 });
    breaks[breaks.length - 1].maxLife = breaks[breaks.length - 1].life;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var bi = breaks.length - 1; bi >= 0; bi--) {
      var b = breaks[bi];
      var dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy < 60 * 60) {
        repaired++;
        feedback = '修理完了！ ' + repaired + '/' + NEEDED;
        feedbackCol = C.repHi;
        feedbackTimer = 0.4;
        game.audio.play('se_success', 0.4);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5, col: C.repHi });
        }
        breaks.splice(bi, 1);
        if (repaired >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(repaired * 100 + Math.ceil(timeLeft) * 80); }, 400);
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

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnBreak();
      spawnTimer = 0.8 + Math.random() * 0.6;
    }

    for (var bi = breaks.length - 1; bi >= 0; bi--) {
      breaks[bi].life -= dt;
      breaks[bi].flash += dt * 6;
      if (breaks[bi].life <= 0) {
        lost++;
        game.audio.play('se_failure', 0.4);
        breaks.splice(bi, 1);
        if (lost >= MAX_LOST && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, H * 0.15, W, H * 0.75, C.board, 0.9);

    // Draw circuit paths
    var pulsePos = (elapsed * 0.4) % 1;
    for (var pi2 = 0; pi2 < paths.length; pi2++) {
      var path2 = paths[pi2];
      if (path2.type === 'h') {
        game.draw.line(path2.x1, path2.y, path2.x2, path2.y, C.trace, 5);
        game.draw.line(path2.x1, path2.y, path2.x2, path2.y, C.traceLo, 3);
        // Pulse dot
        var px2 = path2.x1 + (path2.x2 - path2.x1) * ((pulsePos + pi2 * 0.15) % 1);
        game.draw.circle(px2, path2.y, 5, C.pulse, 0.8);
      } else {
        game.draw.line(path2.x, path2.y1, path2.x, path2.y2, C.trace, 5);
        game.draw.line(path2.x, path2.y1, path2.x, path2.y2, C.traceLo, 3);
        var py2 = path2.y1 + (path2.y2 - path2.y1) * ((pulsePos + pi2 * 0.15) % 1);
        game.draw.circle(path2.x, py2, 5, C.pulse, 0.8);
      }
    }

    // Connection dots at intersections
    var hLines2 = [H * 0.25, H * 0.38, H * 0.51, H * 0.64, H * 0.77];
    var vLines2 = [W * 0.15, W * 0.3, W * 0.45, W * 0.6, W * 0.75, W * 0.9];
    for (var hi2 = 0; hi2 < hLines2.length; hi2++) {
      for (var vi2 = 0; vi2 < vLines2.length; vi2++) {
        game.draw.circle(vLines2[vi2], hLines2[hi2], 7, C.traceHi, 0.8);
      }
    }

    // Breaks
    for (var bi2 = 0; bi2 < breaks.length; bi2++) {
      var b2 = breaks[bi2];
      var lifeRatio = b2.life / b2.maxLife;
      var blink = Math.sin(b2.flash) > 0;
      if (blink) {
        game.draw.circle(b2.x, b2.y, 28, C.broken, 0.9 * lifeRatio);
        game.draw.circle(b2.x, b2.y, 16, C.brkHi, 0.9);
        game.draw.text('✕', b2.x, b2.y + 10, { size: 30, color: '#fff', bold: true });
      }
      // Timer ring
      var segs2 = 10;
      for (var sg2 = 0; sg2 < Math.ceil(segs2 * lifeRatio); sg2++) {
        var a1 = -Math.PI / 2 + (sg2 / segs2) * Math.PI * 2;
        var a2 = -Math.PI / 2 + ((sg2 + 0.8) / segs2) * Math.PI * 2;
        game.draw.line(b2.x + Math.cos(a1) * 36, b2.y + Math.sin(a1) * 36,
                       b2.x + Math.cos(a2) * 36, b2.y + Math.sin(a2) * 36, C.broken, 4);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.88, { size: 44, color: feedbackCol, bold: true });
    }

    // Lost dots
    for (var li2 = 0; li2 < MAX_LOST; li2++) {
      game.draw.circle(W / 2 - (MAX_LOST - 1) * 20 + li2 * 40, H * 0.93, 12, li2 < lost ? C.broken : '#04080a');
    }

    game.draw.text(repaired + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.trace : C.broken);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    buildPaths();
    spawnTimer = 0.5;
  });
})(game);
