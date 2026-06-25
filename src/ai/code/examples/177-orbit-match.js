// 177-orbit-match.js
// 軌道合わせ — 異なる速度で周回する2つの点が揃った瞬間にタップする観察力ゲーム
// 操作: タップで両方の点が重なった瞬間を捉える
// 成功: 8回揃える  失敗: 5回ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040610',
    orbit1:  '#1e3a5f',
    orbit2:  '#1a1040',
    dot1:    '#3b82f6',
    dot1Hi:  '#93c5fd',
    dot2:    '#a855f7',
    dot2Hi:  '#d8b4fe',
    match:   '#22c55e',
    matchHi: '#86efac',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var CX = W / 2;
  var CY = H * 0.48;
  var R1 = 240; // outer orbit
  var R2 = 140; // inner orbit
  var DOT_R = 28;

  var a1 = 0; // angle of dot 1
  var a2 = 0; // angle of dot 2
  // Different speeds for interesting timing
  var SPEED1 = 0.9;  // rad/sec
  var SPEED2 = 1.45; // rad/sec (irrational ratio)

  var MATCH_TOLERANCE = 0.15; // radians

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];
  var lockTimer = 0; // brief lock after hit to prevent double tap

  game.onTap(function() {
    if (done || lockTimer > 0) return;
    // Check if dots are aligned
    var diff = Math.abs(a1 - a2) % (Math.PI * 2);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    var aligned = diff < MATCH_TOLERANCE;

    if (aligned) {
      score++;
      feedbackOk = true; feedback = 0.5;
      lockTimer = 0.4;
      game.audio.play('se_success', 0.9);
      var mx = CX + Math.cos(a1) * (R1 + R2) / 2;
      var my = CY + Math.sin(a1) * (R1 + R2) / 2;
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: mx, y: my, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5 });
      }
      if (score >= needed && !done) {
        done = true;
        setTimeout(function() { game.end.success(score * 90 + Math.ceil(timeLeft) * 25); }, 500);
      }
    } else {
      misses++;
      feedbackOk = false; feedback = 0.4;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;
    if (lockTimer > 0) lockTimer -= dt;

    // Advance angles
    a1 += SPEED1 * dt;
    a2 += SPEED2 * dt;

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 300 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // Check alignment for visual hint
    var diff2 = Math.abs(a1 - a2) % (Math.PI * 2);
    if (diff2 > Math.PI) diff2 = Math.PI * 2 - diff2;
    var closeness = Math.max(0, 1 - diff2 / (MATCH_TOLERANCE * 3));

    var d1x = CX + Math.cos(a1) * R1;
    var d1y = CY + Math.sin(a1) * R1;
    var d2x = CX + Math.cos(a2) * R2;
    var d2y = CY + Math.sin(a2) * R2;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Orbits
    for (var oa = 0; oa < 60; oa++) {
      var oang = (oa / 60) * Math.PI * 2;
      game.draw.circle(CX + Math.cos(oang) * R1, CY + Math.sin(oang) * R1, 4, C.orbit1, 0.4);
      game.draw.circle(CX + Math.cos(oang) * R2, CY + Math.sin(oang) * R2, 4, C.orbit2, 0.4);
    }

    // Center
    game.draw.circle(CX, CY, 30, '#0f0c20', 0.9);
    game.draw.circle(CX, CY, 16, '#1e1b40', 0.8);

    // Alignment glow when close
    if (closeness > 0.3) {
      game.draw.circle(CX, CY, 300, C.matchHi, closeness * 0.08);
    }

    // Line between dots when close
    if (closeness > 0.1) {
      game.draw.line(d1x, d1y, d2x, d2y, C.match, 3 * closeness);
    }

    // Dot 1 (outer, blue)
    game.draw.circle(d1x, d1y, DOT_R + 10, C.dot1Hi, 0.2 + closeness * 0.3);
    game.draw.circle(d1x, d1y, DOT_R, C.dot1, 0.9);
    game.draw.circle(d1x - DOT_R * 0.3, d1y - DOT_R * 0.3, DOT_R * 0.25, '#fff', 0.5);

    // Dot 2 (inner, purple)
    game.draw.circle(d2x, d2y, DOT_R + 10, C.dot2Hi, 0.2 + closeness * 0.3);
    game.draw.circle(d2x, d2y, DOT_R, C.dot2, 0.9);
    game.draw.circle(d2x - DOT_R * 0.3, d2y - DOT_R * 0.3, DOT_R * 0.25, '#fff', 0.5);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, C.match, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.match : C.wrong, feedback * 0.14);
    }

    // Closeness meter
    if (closeness > 0.3) {
      game.draw.text('タップ！', W / 2, H * 0.87, { size: 64, color: C.matchHi, bold: true });
    } else {
      game.draw.text('2つが重なったら！', W / 2, H * 0.87, { size: 42, color: C.ui });
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 + (mi - 2) * 52, 218, 18, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.dot1 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    a1 = Math.random() * Math.PI * 2;
    a2 = a1 + Math.PI; // start opposite
  });
})(game);
