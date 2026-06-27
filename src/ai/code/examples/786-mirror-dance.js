// 786-mirror-dance.js
// ミラーダンス — 鏡に映る動きを見て、反転した正しい方向にタップせよ
// 操作: タップ左/右 — 鏡の反転を考慮した方向を選ぶ
// 成功: 30問正解  失敗: 8回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#03030a',
    mirror:  '#0f1a2e',
    mirrorHi:'#1e3a5f',
    figure:  '#38bdf8',
    figureR: '#f472b6',
    arrow:   '#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060612'
  };

  // Phase: 'show' (show the mirrored movement) or 'answer'
  var phase = 'show';
  var mirrorDir = 'left'; // actual direction in mirror
  var realDir = 'right';  // what player should tap (opposite)
  var showTimer = 0;
  var SHOW_DUR = 0.9;
  var figureX = 0; // -1 to 1, animation position
  var waitTimer = 0;
  var WAIT_DUR = 0.38;
  var answered = false;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function newRound() {
    // Randomize direction (left or right in mirror)
    mirrorDir = Math.random() < 0.5 ? 'left' : 'right';
    realDir = mirrorDir === 'left' ? 'right' : 'left';
    showTimer = 0;
    figureX = mirrorDir === 'left' ? 0 : 0;
    phase = 'show';
    answered = false;
    SHOW_DUR = Math.max(0.5, 0.9 - score * 0.012);
  }

  function drawFigure(cx, cy, r, col, flipped) {
    // Simple stick figure
    game.draw.circle(cx, cy - r * 0.7, r * 0.22, col, 0.9); // head
    game.draw.line(cx, cy - r * 0.48, cx, cy + r * 0.2, col, 8); // body
    // Arms
    var armX = flipped ? -1 : 1;
    game.draw.line(cx, cy - r * 0.2, cx + armX * r * 0.4, cy, col, 7); // raised arm
    game.draw.line(cx, cy - r * 0.2, cx - armX * r * 0.4, cy + r * 0.25, col, 7); // lower arm
    // Legs
    game.draw.line(cx, cy + r * 0.2, cx + armX * r * 0.3, cy + r * 0.7, col, 8);
    game.draw.line(cx, cy + r * 0.2, cx - armX * r * 0.3, cy + r * 0.7, col, 8);
  }

  game.onTap(function(tx, ty) {
    if (done || answered || waitTimer > 0 || phase !== 'answer') return;
    answered = true;
    var tappedLeft = tx < W / 2;
    var correct = (tappedLeft && realDir === 'left') || (!tappedLeft && realDir === 'right');
    if (correct) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.22;
      resultText = '正解！';
      resultTimer = 0.4;
      game.audio.play('se_success', 0.6);
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 140, life: 0.35, col: C.correct });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 360 + Math.ceil(timeLeft) * 120); }, 700);
        return;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '逆！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    waitTimer = WAIT_DUR;
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) newRound();
    } else if (phase === 'show') {
      showTimer += dt;
      // Animate figure moving in mirror
      var t = showTimer / SHOW_DUR;
      figureX = mirrorDir === 'left' ? t : -t;
      if (showTimer >= SHOW_DUR) {
        phase = 'answer';
        figureX = mirrorDir === 'left' ? 1 : -1;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Mirror frame
    var mirrorX = W * 0.15;
    var mirrorY = H * 0.18;
    var mirrorW = W * 0.7;
    var mirrorH = H * 0.45;
    game.draw.rect(mirrorX - 12, mirrorY - 12, mirrorW + 24, mirrorH + 24, '#2d3748', 0.9);
    game.draw.rect(mirrorX, mirrorY, mirrorW, mirrorH, C.mirror, 0.9);
    game.draw.rect(mirrorX, mirrorY, mirrorW, 4, C.mirrorHi, 0.5);

    // Mirror label
    game.draw.text('鏡の中', W / 2, mirrorY + 30, { size: 32, color: C.mirrorHi + 'aa' });

    // Figure in mirror (reversed movement)
    var figCX = W / 2 + figureX * mirrorW * 0.3;
    var figCY = mirrorY + mirrorH * 0.55;
    drawFigure(figCX, figCY, 90, C.figureR, mirrorDir === 'left');

    // Movement arrow in mirror
    if (phase === 'show') {
      var arrowX2 = mirrorDir === 'left' ? figCX - 60 : figCX + 60;
      var arrowText = mirrorDir === 'left' ? '←' : '→';
      game.draw.text(arrowText, arrowX2, figCY - 60, { size: 56, color: C.arrow, bold: true });
    }

    // Mirror reflection line
    game.draw.line(mirrorX, mirrorY + mirrorH, mirrorX + mirrorW, mirrorY + mirrorH, C.mirrorHi, 3);

    // Player side (below mirror)
    var playerY = H * 0.72;
    // Draw your figure (normal, not reflected)
    drawFigure(W / 2, playerY, 80, C.figure, false);
    game.draw.text('あなた', W / 2, playerY + 80, { size: 32, color: C.figure + 'aa' });

    // Tap prompts
    if (phase === 'answer' && !answered) {
      game.draw.text('← タップ', W * 0.22, H * 0.88, { size: 44, color: C.text, bold: true });
      game.draw.text('タップ →', W * 0.78, H * 0.88, { size: 44, color: C.text, bold: true });
      game.draw.line(W / 2, H * 0.85, W / 2, H * 0.93, C.ui, 2);
    } else if (phase === 'show') {
      game.draw.text('鏡をよく見て...', W / 2, H * 0.88, { size: 40, color: C.text + '55' });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.15, { size: 52, color: flashCol, bold: true });
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
    newRound();
  });
})(game);
