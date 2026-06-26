// 380-ink-blot.js
// インクブロット — 広がるインクが境界線からはみ出す前に止める
// 操作: タップで広がりを止める
// 成功: 10回ぴったり止める  失敗: 3回はみ出す or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#f8fafc',
    paper:  '#f1f5f9',
    paperBorder:'#cbd5e1',
    ink:    '#0f172a',
    inkHi:  '#1e293b',
    inkSafe:'#3b82f6',
    inkDanger:'#ef4444',
    target: '#22c55e',
    targetHi:'#86efac',
    over:   '#dc2626',
    text:   '#0f172a',
    ui:     '#64748b'
  };

  var blobs = [];
  var stopped = 0;
  var NEEDED = 10;
  var overflowed = 0;
  var MAX_OVER = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];

  var PAPER_X = 80;
  var PAPER_Y = 180;
  var PAPER_W = W - 160;
  var PAPER_H = H - 400;

  function spawnBlob() {
    var x = PAPER_X + 80 + Math.random() * (PAPER_W - 160);
    var y = PAPER_Y + 80 + Math.random() * (PAPER_H - 160);
    var maxR = Math.min(x - PAPER_X, PAPER_X + PAPER_W - x, y - PAPER_Y, PAPER_Y + PAPER_H - y) * 0.9;
    blobs.push({
      x: x, y: y,
      r: 0,
      maxR: maxR,
      growSpeed: 60 + Math.random() * 60,
      stopped: false,
      overflowed: false,
      alpha: 1
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Stop the nearest growing blob
    var best = -1, bestDist = 200;
    for (var i = 0; i < blobs.length; i++) {
      if (blobs[i].stopped || blobs[i].overflowed) continue;
      var d = Math.hypot(tx - blobs[i].x, ty - blobs[i].y);
      if (d < blobs[i].r + 40 && d < bestDist) {
        bestDist = d; best = i;
      }
    }
    if (best >= 0) {
      var b = blobs[best];
      b.stopped = true;
      stopped++;
      // Particle splash
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: b.x, y: b.y, vx: Math.cos(ang)*120, vy: Math.sin(ang)*120, life:0.5, col: C.ink });
      }
      game.audio.play('se_success', 0.4);
      if (stopped >= NEEDED && !done) {
        done = true;
        game.end.success(stopped * 400 + Math.ceil(timeLeft) * 80);
      }
    } else {
      // Missed
      game.audio.play('se_failure', 0.2);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Spawn blobs
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnBlob();
      spawnTimer = 1.5 + Math.random() * 1.5;
    }

    // Update blobs
    for (var i = 0; i < blobs.length; i++) {
      var b = blobs[i];
      if (b.stopped) {
        b.alpha -= dt * 0.3;
        continue;
      }
      if (b.overflowed) {
        b.alpha -= dt * 0.8;
        continue;
      }
      b.r += b.growSpeed * dt;
      if (b.r >= b.maxR) {
        b.overflowed = true;
        overflowed++;
        game.audio.play('se_failure', 0.5);
        for (var pi2 = 0; pi2 < 10; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(ang2)*150, vy: Math.sin(ang2)*150, life:0.6, col: C.over });
        }
        if (overflowed >= MAX_OVER && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }
    // Remove faded
    for (var i2 = blobs.length - 1; i2 >= 0; i2--) {
      if (blobs[i2].alpha <= 0) blobs.splice(i2, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Paper
    game.draw.rect(PAPER_X - 8, PAPER_Y - 8, PAPER_W + 16, PAPER_H + 16, C.paperBorder, 0.8);
    game.draw.rect(PAPER_X, PAPER_Y, PAPER_W, PAPER_H, C.paper, 0.95);

    // Paper lines
    for (var li = 0; li < 20; li++) {
      var ly = PAPER_Y + 40 + li * 44;
      if (ly < PAPER_Y + PAPER_H - 20) {
        game.draw.line(PAPER_X + 30, ly, PAPER_X + PAPER_W - 30, ly, '#e2e8f0', 2);
      }
    }

    // Blobs
    for (var bi = 0; bi < blobs.length; bi++) {
      var b2 = blobs[bi];
      if (b2.alpha <= 0) continue;
      var col = b2.overflowed ? C.inkDanger : (b2.stopped ? C.inkSafe : C.ink);
      game.draw.circle(b2.x, b2.y, b2.r, col, b2.alpha * 0.85);
      if (!b2.stopped && !b2.overflowed) {
        // Danger ring at 80% max radius
        var dangerR = b2.maxR * 0.75;
        if (b2.r > dangerR * 0.6) {
          game.draw.circle(b2.x, b2.y, dangerR, C.inkDanger, Math.min(0.5, (b2.r - dangerR * 0.6) / dangerR * 0.4) * b2.alpha);
        }
        // Target ring
        game.draw.circle(b2.x, b2.y, b2.maxR, C.paperBorder, 0.6);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Status
    game.draw.text('止めた: ' + stopped + ' / ' + NEEDED, W / 2, 148, { size: 52, color: C.ink, bold: true });
    for (var oi = 0; oi < MAX_OVER; oi++) {
      game.draw.circle(W / 2 - (MAX_OVER-1)*40 + oi*80, H * 0.93, 18, oi < overflowed ? C.over : C.paperBorder, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.inkSafe : C.over);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: C.text, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnTimer = 0.8;
  });
})(game);
