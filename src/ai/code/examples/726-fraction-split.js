// 726-fraction-split.js
// 分割チャレンジ — バーが指定の割合になるようにタップで長さを調整せよ
// 操作: タップした位置でバーを分割（赤い部分が目標割合になるように）
// 成功: 20回成功  失敗: 8回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0510',
    barA:    '#dc2626',
    barB:    '#1e40af',
    target:  '#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#110715'
  };

  var BAR_X0 = 80;
  var BAR_W = W - 160;
  var BAR_Y = H * 0.45;
  var BAR_H = 80;
  var TOLERANCE = 0.07; // ±7%

  var targetFrac = 0.5;  // target ratio for red portion (0..1)
  var FRACTIONS = [0.25, 0.33, 0.4, 0.5, 0.6, 0.67, 0.75];
  var FRAC_LABELS = ['1/4', '1/3', '2/5', '1/2', '3/5', '2/3', '3/4'];

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var lastTapX = -1;
  var showResult = 0; // timer showing where tap landed
  var showCorrect = false;

  function pickTarget() {
    var idx = Math.floor(Math.random() * FRACTIONS.length);
    targetFrac = FRACTIONS[idx];
    return FRAC_LABELS[idx];
  }

  var targetLabel = '';

  game.onTap(function(tx, ty) {
    if (done) return;
    // Map tap x to fraction of bar
    var tapFrac = Math.max(0, Math.min(1, (tx - BAR_X0) / BAR_W));
    var diff = Math.abs(tapFrac - targetFrac);
    lastTapX = tx;
    showResult = 0.8;

    if (diff <= TOLERANCE) {
      score++;
      showCorrect = true;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = 'ピッタリ！';
      resultTimer = 0.6;
      game.audio.play('se_success', 0.55);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: BAR_X0 + targetFrac * BAR_W, y: BAR_Y + BAR_H / 2,
          vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.45, col: C.target });
      }
      targetLabel = pickTarget();
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      showCorrect = false;
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      var pct = Math.round(tapFrac * 100);
      var tgt = Math.round(targetFrac * 100);
      resultText = pct + '% (目標' + tgt + '%)';
      resultTimer = 0.7;
      game.audio.play('se_failure', 0.3);
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

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (showResult > 0) showResult -= dt * 1.5;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var targetX = BAR_X0 + targetFrac * BAR_W;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target fraction display
    game.draw.text(targetLabel, W / 2, H * 0.28, { size: 120, color: C.target, bold: true });
    game.draw.text('の位置でタップ', W / 2, H * 0.28 + 100, { size: 40, color: '#ffffff66' });

    // Bar shadow
    game.draw.rect(BAR_X0 + 4, BAR_Y + 4, BAR_W, BAR_H, '#000', 0.25);

    // Split at tap position (show result)
    if (showResult > 0 && lastTapX >= 0) {
      var tapF = (lastTapX - BAR_X0) / BAR_W;
      var clampedTap = Math.max(0, Math.min(1, tapF));
      // Red portion (left)
      game.draw.rect(BAR_X0, BAR_Y, clampedTap * BAR_W, BAR_H, C.barA, 0.9);
      // Blue portion (right)
      game.draw.rect(BAR_X0 + clampedTap * BAR_W, BAR_Y, (1 - clampedTap) * BAR_W, BAR_H, C.barB, 0.9);
      // Split line
      game.draw.line(lastTapX, BAR_Y - 10, lastTapX, BAR_Y + BAR_H + 10, showCorrect ? C.correct : C.wrong, 6);
    } else {
      // Show plain bar
      game.draw.rect(BAR_X0, BAR_Y, BAR_W / 2, BAR_H, C.barA, 0.6);
      game.draw.rect(BAR_X0 + BAR_W / 2, BAR_Y, BAR_W / 2, BAR_H, C.barB, 0.6);
    }

    // Target position marker
    game.draw.line(targetX, BAR_Y - 24, targetX, BAR_Y + BAR_H + 24, C.target, 4);
    game.draw.circle(targetX, BAR_Y - 24, 12, C.target, 0.9);
    game.draw.circle(targetX, BAR_Y + BAR_H + 24, 12, C.target, 0.9);

    // Tolerance zone
    var tolX0 = BAR_X0 + (targetFrac - TOLERANCE) * BAR_W;
    var tolX1 = BAR_X0 + (targetFrac + TOLERANCE) * BAR_W;
    game.draw.rect(tolX0, BAR_Y, tolX1 - tolX0, BAR_H, C.correct, 0.1);

    // Bar border
    game.draw.rect(BAR_X0, BAR_Y, 4, BAR_H, '#fff', 0.3);
    game.draw.rect(BAR_X0 + BAR_W - 4, BAR_Y, 4, BAR_H, '#fff', 0.3);

    // Left/right labels
    game.draw.text('赤', BAR_X0 + 30, BAR_Y + BAR_H + 50, { size: 36, color: C.barA + 'cc', bold: true });
    game.draw.text('青', BAR_X0 + BAR_W - 30, BAR_Y + BAR_H + 50, { size: 36, color: C.barB + 'cc', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.72, { size: 48, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    targetLabel = pickTarget();
  });
})(game);
