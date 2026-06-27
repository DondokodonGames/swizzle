// 687-echo-tap.js
// エコータップ — 表示された数字ちょうどの回数だけタップせよ
// 操作: タップで回数をカウント（超えたらアウト）
// 成功: 20問正解  失敗: 6回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050214',
    target:  '#a78bfa',
    targetBg:'#1e1b4b',
    tapped:  '#22c55e',
    over:    '#ef4444',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080510'
  };

  var targetNum = 0;
  var tapCount = 0;
  var committed = false;
  var commitTimer = 0;
  var COMMIT_DELAY = 0.7; // auto-commit after pause

  var correct = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 6;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  var tapDots = []; // visual tap indicators

  function newQuestion() {
    targetNum = 3 + Math.floor(Math.random() * 6); // 3-8
    tapCount = 0;
    committed = false;
    commitTimer = 0;
    tapDots = [];
  }

  function evaluate() {
    if (committed) return;
    committed = true;
    if (tapCount === targetNum) {
      correct++;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = tapCount + '回 正解！';
      resultTimer = 0.55;
      game.audio.play('se_success', 0.65);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H / 2, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.tapped });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correct * 350 + Math.ceil(timeLeft) * 60); }, 700);
      } else {
        setTimeout(newQuestion, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = tapCount + '回 → ' + targetNum + '回が正解！';
      resultTimer = 0.7;
      game.audio.play('se_failure', 0.4);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        setTimeout(newQuestion, 800);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || committed) return;
    tapCount++;
    commitTimer = COMMIT_DELAY;
    game.audio.play('se_tap', 0.1);

    // Add tap dot
    tapDots.push({ x: tx, y: ty, life: 0.6 });

    // Auto-fail if over target
    if (tapCount > targetNum) {
      evaluate();
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

    // Auto-commit after pause
    if (!committed && tapCount > 0) {
      commitTimer -= dt;
      if (commitTimer <= 0) {
        evaluate();
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }
    for (var td = tapDots.length - 1; td >= 0; td--) {
      tapDots[td].life -= dt * 2;
      if (tapDots[td].life <= 0) tapDots.splice(td, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Big target number
    var targetSize = 220 + 20 * Math.sin(elapsed * 3);
    game.draw.circle(W / 2 + 5, H * 0.38 + 5, 230, '#000', 0.3);
    game.draw.circle(W / 2, H * 0.38, 230, C.targetBg, 0.9);
    game.draw.circle(W / 2, H * 0.38, 215, C.target, 0.12);
    game.draw.text('' + targetNum, W / 2, H * 0.38 + 60, { size: 200, color: C.target, bold: true });

    // "回タップせよ" label
    game.draw.text('回タップ', W / 2, H * 0.38 + 220, { size: 42, color: '#ffffff55' });

    // Tap counter row
    var dotSpacing = 90;
    var dotY = H * 0.65;
    var totalDots = targetNum;
    var startX = W / 2 - (totalDots - 1) * dotSpacing / 2;
    for (var i = 0; i < totalDots; i++) {
      var dx2 = startX + i * dotSpacing;
      var isTapped = i < tapCount;
      var isOver = tapCount > targetNum && i < tapCount;
      var dotCol = isOver ? C.over : (isTapped ? C.tapped : '#1e293b');
      game.draw.circle(dx2 + 3, dotY + 3, 36, '#000', 0.25);
      game.draw.circle(dx2, dotY, 36, dotCol, 0.9);
      if (isTapped) {
        game.draw.text('✓', dx2, dotY + 14, { size: 36, color: '#fff', bold: true });
      }
    }

    // Current count display
    var countCol = tapCount > targetNum ? C.over : (tapCount === targetNum ? C.correct : C.text);
    game.draw.text(tapCount + '', W / 2, H * 0.76, { size: 80, color: countCol, bold: true });

    // Commit timer bar
    if (!committed && tapCount > 0) {
      var barW = W * 0.6;
      var barRatio = commitTimer / COMMIT_DELAY;
      game.draw.rect(W * 0.2, H * 0.8, barW, 14, '#1e293b', 0.7);
      game.draw.rect(W * 0.2, H * 0.8, barW * barRatio, 14, C.target, 0.8);
    }

    // Tap dots
    for (var td2 = 0; td2 < tapDots.length; td2++) {
      var dot = tapDots[td2];
      game.draw.circle(dot.x, dot.y, 30 * dot.life, C.tapped, dot.life * 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 50, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 60 + ei * 120, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newQuestion();
  });
})(game);
