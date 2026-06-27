// 747-planet-align.js
// 惑星直列 — 3つの惑星が一直線に並んだ瞬間タップせよ
// 操作: タップ — 全惑星が同一ライン上に並んだとき成功
// 成功: 20回直列  失敗: 8回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#01020e',
    star:    '#fde68a',
    p1:      '#ef4444',
    p2:      '#3b82f6',
    p3:      '#22c55e',
    sun:     '#fbbf24',
    sunHi:   '#fef3c7',
    align:   '#f97316',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030310'
  };

  var CX = W / 2;
  var CY = H * 0.44;

  var planets = [
    { r: 130, speed: 1.1, angle: 0, size: 22, col: C.p1 },
    { r: 220, speed: 0.65, angle: Math.PI * 0.7, size: 28, col: C.p2 },
    { r: 320, speed: 0.38, angle: Math.PI * 1.4, size: 34, col: C.p3 }
  ];

  var bgStars = [];
  for (var bsi = 0; bsi < 60; bsi++) {
    bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.5 + 0.5 });
  }

  var ALIGN_TOL = 0.18; // radians

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var alignPulse = 0;
  var lastTapCooldown = 0;

  function getAlignScore() {
    var a1 = planets[0].angle % (Math.PI * 2);
    var a2 = planets[1].angle % (Math.PI * 2);
    var a3 = planets[2].angle % (Math.PI * 2);
    // Normalize to -PI..PI relative to p1
    var d12 = ((a2 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    var d13 = ((a3 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    // Aligned = d12 and d13 both near 0 or both near PI
    var same = Math.abs(d12) < ALIGN_TOL && Math.abs(d13) < ALIGN_TOL;
    var opp12 = ((a2 - a1 + Math.PI * 4) % (Math.PI * 2));
    var opp13 = ((a3 - a1 + Math.PI * 4) % (Math.PI * 2));
    var anyLine = same ||
      (Math.abs(opp12 - Math.PI) < ALIGN_TOL && Math.abs(opp13 - Math.PI) < ALIGN_TOL) ||
      (Math.abs(d12) < ALIGN_TOL && Math.abs(opp13 - Math.PI) < ALIGN_TOL) ||
      (Math.abs(opp12 - Math.PI) < ALIGN_TOL && Math.abs(d13) < ALIGN_TOL);
    return anyLine;
  }

  game.onTap(function(tx, ty) {
    if (done || lastTapCooldown > 0) return;
    var aligned = getAlignScore();
    if (aligned) {
      score++;
      alignPulse = 0.5;
      flashCol = C.correct;
      flashAnim = 0.28;
      resultText = '直列！';
      resultTimer = 0.45;
      lastTapCooldown = 0.5;
      game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.4, col: C.align });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 450 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.28;
      resultText = 'まだ揃ってない！';
      resultTimer = 0.42;
      lastTapCooldown = 0.3;
      game.audio.play('se_failure', 0.25);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
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

    for (var pi = 0; pi < planets.length; pi++) {
      planets[pi].angle += planets[pi].speed * dt * (1 + score * 0.015);
    }

    if (alignPulse > 0) alignPulse -= dt * 2;
    if (lastTapCooldown > 0) lastTapCooldown -= dt;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var aligned = getAlignScore();

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    for (var bsi2 = 0; bsi2 < bgStars.length; bsi2++) {
      game.draw.circle(bgStars[bsi2].x, bgStars[bsi2].y, bgStars[bsi2].r, C.star, 0.3);
    }

    // Orbit rings
    for (var pi2 = 0; pi2 < planets.length; pi2++) {
      for (var ri = 0; ri < 36; ri++) {
        var ra = ri * Math.PI * 2 / 36;
        game.draw.circle(CX + Math.cos(ra) * planets[pi2].r, CY + Math.sin(ra) * planets[pi2].r, 2, planets[pi2].col, 0.15);
      }
    }

    // Alignment beam
    if (aligned) {
      var glow = 0.6 + 0.3 * Math.sin(elapsed * 12);
      game.draw.line(CX - 420, CY, CX + 420, CY, C.align, 3);
      game.draw.rect(0, CY - 20, W, 40, C.align, glow * 0.06);
    }

    // Sun
    var sunPulse = 1 + 0.05 * Math.sin(elapsed * 3);
    game.draw.circle(CX + 5, CY + 5, 52, '#000', 0.3);
    game.draw.circle(CX, CY, 52 * sunPulse, C.sun, 0.9);
    game.draw.circle(CX - 15, CY - 15, 20, C.sunHi, 0.35);

    // Planets
    for (var pi3 = 0; pi3 < planets.length; pi3++) {
      var pl = planets[pi3];
      var px = CX + Math.cos(pl.angle) * pl.r;
      var py = CY + Math.sin(pl.angle) * pl.r;
      game.draw.circle(px + 3, py + 3, pl.size, '#000', 0.3);
      game.draw.circle(px, py, pl.size, pl.col, 0.9);
      game.draw.circle(px - pl.size * 0.3, py - pl.size * 0.3, pl.size * 0.28, '#fff', 0.3);
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life);
    }

    if (aligned && !done) {
      game.draw.text('直列！今タップ！', W / 2, H * 0.84, { size: 52, color: C.align, bold: true });
    } else {
      game.draw.text('全惑星が一列に並んだら', W / 2, H * 0.84, { size: 36, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
  });
})(game);
