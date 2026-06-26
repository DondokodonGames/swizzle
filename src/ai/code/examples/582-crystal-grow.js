// 582-crystal-grow.js
// クリスタルグロウ — タップで結晶を成長させてターゲットサイズに育てる
// 操作: タップで成長速度アップ、タイミングよく止める
// 成功: 10個のクリスタルをちょうどよいサイズに  失敗: 8回外れ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020210',
    crystal: '#6633ff',
    crystalHi:'#aa88ff',
    crystalDk:'#330088',
    target:  '#22c55e',
    targetHi:'#86efac',
    over:    '#ef4444',
    under:   '#3b82f6',
    text:    '#f1f5f9',
    ui:      '#334466',
    glow:    '#6633ff33'
  };

  var CRYSTAL_COLORS = [
    ['#6633ff', '#aa88ff', '#330088'],
    ['#ff3366', '#ff88aa', '#880033'],
    ['#33aaff', '#88ddff', '#003388'],
    ['#ffaa00', '#ffd088', '#884400'],
    ['#33ff88', '#88ffcc', '#008844']
  ];

  var crystal = {
    r: 0,
    growRate: 40,
    maxR: 0,
    targetMin: 0,
    targetMax: 0,
    colorIdx: 0,
    growing: false,
    done: false
  };
  var score = 0;
  var NEEDED = 10;
  var fails = 0;
  var MAX_FAIL = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.target;
  var resultTimer = 0;
  var resultText = '';
  var autoGrowRate = 18; // slow auto-growth

  function nextCrystal() {
    crystal.r = 20;
    crystal.growing = true;
    crystal.done = false;
    var size = 80 + Math.floor(Math.random() * 6) * 30;
    crystal.targetMin = size - 20;
    crystal.targetMax = size + 20;
    crystal.maxR = size + 80;
    crystal.colorIdx = Math.floor(Math.random() * CRYSTAL_COLORS.length);
    autoGrowRate = 12 + score * 1.5;
    crystal.growRate = 40 + score * 3;
  }

  function stopGrowth() {
    if (!crystal.growing || crystal.done) return;
    crystal.growing = false;
    crystal.done = true;

    var r = crystal.r;
    var correct = r >= crystal.targetMin && r <= crystal.targetMax;
    if (correct) {
      score++;
      flashCol = C.target;
      flashAnim = 0.4;
      resultText = 'ぴったり!';
      resultTimer = 0.8;
      game.audio.play('se_success', 0.8);
      var cc = CRYSTAL_COLORS[crystal.colorIdx];
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H / 2, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.5, col: cc[1] });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 100); }, 800);
      } else {
        setTimeout(function() { if (!done) nextCrystal(); }, 1000);
      }
    } else {
      fails++;
      flashCol = r > crystal.targetMax ? C.over : C.under;
      flashAnim = 0.35;
      resultText = r > crystal.targetMax ? '大きすぎ!' : '小さすぎ!';
      resultTimer = 0.8;
      game.audio.play('se_failure', 0.4);
      if (fails >= MAX_FAIL && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        setTimeout(function() { if (!done) nextCrystal(); }, 1000);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (crystal.growing) {
      stopGrowth();
    }
    game.audio.play('se_tap', 0.25);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Auto-grow
    if (crystal.growing) {
      crystal.r += autoGrowRate * dt;
      if (crystal.r >= crystal.maxR) {
        // Too big — auto-fail
        crystal.r = crystal.maxR;
        stopGrowth();
      }
    }

    // Crystal particles
    if (crystal.growing && Math.random() < 0.3) {
      var cc = CRYSTAL_COLORS[crystal.colorIdx];
      var ang = Math.random() * Math.PI * 2;
      var r2 = crystal.r * (0.7 + Math.random() * 0.4);
      particles.push({
        x: W / 2 + Math.cos(ang) * r2,
        y: H / 2 + Math.sin(ang) * r2,
        vx: Math.cos(ang) * 40,
        vy: Math.sin(ang) * 40,
        life: 0.5,
        col: cc[0]
      });
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background glow
    var cc2 = CRYSTAL_COLORS[crystal.colorIdx];
    game.draw.circle(W / 2, H / 2, crystal.r * 1.5, cc2[0], 0.06);

    // Target zone ring
    var tMin = crystal.targetMin;
    var tMax = crystal.targetMax;
    game.draw.circle(W / 2, H / 2, tMax + 8, C.targetHi, 0.12);
    game.draw.circle(W / 2, H / 2, tMax, C.target, 0.2 + Math.sin(elapsed * 3) * 0.06);
    game.draw.circle(W / 2, H / 2, tMin, C.target, 0.2);
    game.draw.circle(W / 2, H / 2, tMin - 8, C.targetHi, 0.08);

    // Crystal body (hexagonal approximation)
    var r = crystal.r;
    var numPoints = 6;
    for (var gi = 0; gi < numPoints; gi++) {
      var a1 = gi / numPoints * Math.PI * 2;
      var a2 = (gi + 1) / numPoints * Math.PI * 2;
      var wobble = 1 + Math.sin(elapsed * 4 + gi) * 0.04;
      var r1 = r * wobble;
      var ri2 = r * 0.55 * wobble;
      // Outer facet
      game.draw.circle(W / 2 + Math.cos(a1) * r1 * 0.7, H / 2 + Math.sin(a1) * r1 * 0.7, r * 0.45, cc2[2], 0.8);
    }
    // Main crystal circle
    game.draw.circle(W / 2, H / 2, r, cc2[2], 0.85);
    game.draw.circle(W / 2, H / 2, r * 0.75, cc2[0], 0.9);
    game.draw.circle(W / 2, H / 2, r * 0.5, cc2[1], 0.6);
    game.draw.circle(W / 2 - r * 0.2, H / 2 - r * 0.2, r * 0.2, '#ffffff', 0.4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.7);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.82, { size: 60, color: flashCol, bold: true });
    } else if (crystal.growing) {
      game.draw.text('タップで止める!', W / 2, H * 0.82, { size: 44, color: C.ui });
    }

    // Size indicator
    var sizeRatio = (r - crystal.targetMin) / (crystal.targetMax - crystal.targetMin);
    var sizeColor = (r >= crystal.targetMin && r <= crystal.targetMax) ? C.target : (r < crystal.targetMin ? C.under : C.over);
    game.draw.text(Math.round(r) + ' / ' + Math.round(crystal.targetMax), W / 2, H * 0.88, { size: 36, color: sizeColor });

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 44 + fi * 88, H * 0.955, 18, fi < fails ? C.over : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? cc2[0] : C.over);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    nextCrystal();
  });
})(game);
