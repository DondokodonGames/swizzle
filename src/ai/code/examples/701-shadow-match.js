// 701-shadow-match.js
// シルエット合わせ — 影と同じ形をタップして選べ
// 操作: タップで正しいシルエットを選ぶ
// 成功: 20問正解  失敗: 6回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#07050f',
    shadow:  '#000000',
    optionA: '#1e3a5f',
    optionB: '#1a1a2e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0814',
    hi:      '#818cf8'
  };

  // Shape definitions: each shape is a set of draw commands
  // Types: circle, square, triangle, diamond, star, cross, arrow, moon, heart, ring
  var SHAPES = ['circle', 'square', 'triangle', 'diamond', 'cross', 'arrow'];

  var OPTION_COUNT = 4;
  var OPTIONS_PER_ROW = 2;
  var OPT_W = 360;
  var OPT_H = 280;
  var OPT_GAP = 40;
  var OPT_X0 = (W - OPTIONS_PER_ROW * OPT_W - OPT_GAP) / 2;
  var OPT_Y0 = H * 0.52;

  var correctShape = '';
  var options = [];
  var selectedIdx = -1;
  var resultTimer = 0;
  var resultCorrect = false;

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 6;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var flashAnim = 0, flashCol = C.correct;
  var particles = [];
  var roundWait = 0;
  var picking = true;

  function drawShape(shape, cx, cy, size, col, alpha) {
    if (shape === 'circle') {
      game.draw.circle(cx, cy, size, col, alpha);
    } else if (shape === 'square') {
      game.draw.rect(cx - size, cy - size, size * 2, size * 2, col, alpha);
    } else if (shape === 'triangle') {
      // Approximate triangle with lines
      var ht = size * 1.1;
      game.draw.line(cx, cy - ht, cx - size, cy + ht * 0.6, col, size * 0.35);
      game.draw.line(cx - size, cy + ht * 0.6, cx + size, cy + ht * 0.6, col, size * 0.35);
      game.draw.line(cx + size, cy + ht * 0.6, cx, cy - ht, col, size * 0.35);
      // Fill approximation: multiple stacked circles
      for (var li = 0; li < 8; li++) {
        var ly = cy - ht + li * ht * 0.22;
        var lw = (li / 8) * size;
        game.draw.rect(cx - lw, ly - 2, lw * 2, size * 0.28, col, alpha * 0.9);
      }
    } else if (shape === 'diamond') {
      game.draw.rect(cx - size * 0.8, cy - 4, size * 1.6, 8, col, alpha);
      game.draw.rect(cx - 4, cy - size * 1.1, 8, size * 2.2, col, alpha);
      for (var di = 0; di < 10; di++) {
        var dp = di / 10;
        var dw = size * 0.8 * Math.sin(dp * Math.PI);
        var dy2 = cy - size * 1.1 + di * size * 0.22;
        game.draw.rect(cx - dw, dy2, dw * 2, size * 0.24, col, alpha * 0.85);
      }
    } else if (shape === 'cross') {
      game.draw.rect(cx - size, cy - size * 0.28, size * 2, size * 0.56, col, alpha);
      game.draw.rect(cx - size * 0.28, cy - size, size * 0.56, size * 2, col, alpha);
    } else if (shape === 'arrow') {
      // Right-pointing arrow
      game.draw.rect(cx - size * 0.8, cy - size * 0.22, size * 1.2, size * 0.44, col, alpha);
      game.draw.line(cx + size * 0.4, cy - size * 0.65, cx + size, cy, col, size * 0.35);
      game.draw.line(cx + size, cy, cx + size * 0.4, cy + size * 0.65, col, size * 0.35);
      game.draw.line(cx + size * 0.4, cy - size * 0.65, cx + size * 0.4, cy + size * 0.65, col, size * 0.35);
    }
  }

  function newRound() {
    correctShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    options = [correctShape];
    var pool = SHAPES.filter(function(s) { return s !== correctShape; });
    // Shuffle pool
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    for (var k = 0; k < OPTION_COUNT - 1; k++) options.push(pool[k]);
    // Shuffle options
    for (var m = options.length - 1; m > 0; m--) {
      var n = Math.floor(Math.random() * (m + 1));
      var tmp2 = options[m]; options[m] = options[n]; options[n] = tmp2;
    }
    selectedIdx = -1;
    resultTimer = 0;
    picking = true;
    roundWait = 0;
  }

  function optX(idx) { return OPT_X0 + (idx % OPTIONS_PER_ROW) * (OPT_W + OPT_GAP); }
  function optY(idx) { return OPT_Y0 + Math.floor(idx / OPTIONS_PER_ROW) * (OPT_H + OPT_GAP); }

  game.onTap(function(tx, ty) {
    if (done || !picking) return;
    for (var i = 0; i < options.length; i++) {
      var ox = optX(i);
      var oy = optY(i);
      if (tx >= ox && tx <= ox + OPT_W && ty >= oy && ty <= oy + OPT_H) {
        selectedIdx = i;
        picking = false;
        if (options[i] === correctShape) {
          score++;
          flashCol = C.correct;
          flashAnim = 0.3;
          resultCorrect = true;
          resultTimer = 0.5;
          game.audio.play('se_success', 0.5);
          for (var p = 0; p < 5; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: ox + OPT_W / 2, y: oy + OPT_H / 2, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.correct });
          }
          if (score >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 80); }, 700);
          } else {
            roundWait = 0.55;
          }
        } else {
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.35;
          resultCorrect = false;
          resultTimer = 0.6;
          game.audio.play('se_failure', 0.4);
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            roundWait = 0.7;
          }
        }
        break;
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (roundWait > 0) {
      roundWait -= dt;
      if (roundWait <= 0) newRound();
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Shadow silhouette (big, centered top half)
    game.draw.text('この影は？', W / 2, H * 0.1, { size: 44, color: '#ffffff44' });
    var shadowSize = 120;
    var shadowCX = W / 2;
    var shadowCY = H * 0.3;
    // Dark background circle for shadow
    game.draw.circle(shadowCX, shadowCY, shadowSize + 30, '#0a0a14', 0.8);
    drawShape(correctShape, shadowCX, shadowCY, shadowSize, C.shadow, 1.0);
    // Slight shadow glow
    drawShape(correctShape, shadowCX, shadowCY, shadowSize + 6, C.hi, 0.08);

    // Options
    for (var oi = 0; oi < options.length; oi++) {
      var ox2 = optX(oi);
      var oy2 = optY(oi);
      var isSelected = selectedIdx === oi;
      var isCorrectOpt = options[oi] === correctShape;
      var bgCol = isSelected
        ? (isCorrectOpt ? C.correct : C.wrong)
        : C.optionA;
      var bgAlpha = isSelected ? 0.5 : 0.7;
      game.draw.rect(ox2 + 3, oy2 + 3, OPT_W, OPT_H, '#000', 0.25);
      game.draw.rect(ox2, oy2, OPT_W, OPT_H, bgCol, bgAlpha);
      var shapeCol = isSelected ? (isCorrectOpt ? C.correct : C.wrong) : C.hi;
      drawShape(options[oi], ox2 + OPT_W / 2, oy2 + OPT_H / 2, 70, shapeCol, 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Error indicators
    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 52 + ei * 104, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
