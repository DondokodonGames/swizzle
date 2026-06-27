// 759-inverse-tap.js
// インバース — 矢印の「逆」方向をタップせよ。脳が混乱する瞬間を楽しめ
// 操作: 矢印の逆方向（左矢印なら右半分、右矢印なら左半分）をタップ
// 成功: 40回正解  失敗: 10回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0314',
    arrowL:  '#818cf8',
    arrowR:  '#f472b6',
    zoneL:   '#1e1b4b',
    zoneR:   '#4a0d2e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#100818'
  };

  var arrowDir = 'left'; // 'left' or 'right'
  var showTimer = 0;
  var SHOW_DUR = 1.0;
  var answered = false;
  var waitTimer = 0;
  var WAIT_DUR = 0.3;

  var score = 0;
  var NEEDED = 40;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;

  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var hintPulse = 0;

  function nextArrow() {
    arrowDir = Math.random() < 0.5 ? 'left' : 'right';
    SHOW_DUR = Math.max(0.5, 1.0 - score * 0.012);
    showTimer = SHOW_DUR;
    answered = false;
    hintPulse = 0;
  }

  function evaluate(correct) {
    if (correct) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.2;
      resultText = '逆！正解！';
      resultTimer = 0.38;
      game.audio.play('se_success', 0.55);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 350 + Math.ceil(timeLeft) * 120); }, 700);
        return;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '間違い！逆だ！';
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    answered = true;
    waitTimer = WAIT_DUR;
  }

  game.onTap(function(tx, ty) {
    if (done || answered || waitTimer > 0 || showTimer <= 0) return;
    var tappedLeft = tx < W / 2;
    // Correct = OPPOSITE of arrow
    var correct = (arrowDir === 'left' && !tappedLeft) || (arrowDir === 'right' && tappedLeft);
    evaluate(correct);
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
      if (waitTimer <= 0 && !done) nextArrow();
      return;
    }

    hintPulse += dt * 4;

    if (!answered) {
      showTimer -= dt;
      if (showTimer <= 0) {
        // Timeout counts as miss
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = '遅い！';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.22);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          answered = true;
          waitTimer = WAIT_DUR;
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Zone backgrounds (subtle)
    var timeRatio = Math.max(0, showTimer / SHOW_DUR);
    game.draw.rect(0, H * 0.25, W / 2, H * 0.5, C.zoneL, 0.5);
    game.draw.rect(W / 2, H * 0.25, W / 2, H * 0.5, C.zoneR, 0.5);

    // Zone labels
    var leftCol = C.arrowL + 'aa';
    var rightCol = C.arrowR + 'aa';
    game.draw.text('◀ 左', W / 4, H * 0.35, { size: 48, color: leftCol, bold: true });
    game.draw.text('右 ▶', W * 3 / 4, H * 0.35, { size: 48, color: rightCol, bold: true });

    // INVERSE label
    game.draw.text('← 逆をタップ！ →', W / 2, H * 0.22, { size: 38, color: C.text + 'aa' });

    // Center divider
    game.draw.rect(W / 2 - 3, H * 0.25, 6, H * 0.5, '#ffffff', 0.12);

    if (!answered) {
      // Big arrow
      var arrowCol = arrowDir === 'left' ? C.arrowL : C.arrowR;
      var pulse = 1.0 + 0.08 * Math.sin(hintPulse);
      var arrowSize = Math.floor(280 * pulse);
      var arrowText = arrowDir === 'left' ? '◀' : '▶';
      game.draw.text(arrowText, W / 2, H * 0.50, { size: arrowSize, color: arrowCol, bold: true });

      // Arrow direction label
      var dirLabel = arrowDir === 'left' ? '← 左向き' : '右向き →';
      game.draw.text(dirLabel, W / 2, H * 0.65, { size: 44, color: arrowCol + 'cc' });

      // INVERSE instruction
      var correctSide = arrowDir === 'left' ? '右をタップ！' : '左をタップ！';
      // Don't show this — it would give it away too easily
      // game.draw.text(correctSide, W / 2, H * 0.72, { size: 36, color: '#fff', bold: true });

      // Timer bar
      game.draw.rect(W / 2 - 280, H * 0.74, 560, 14, '#1a1a2a', 0.8);
      game.draw.rect(W / 2 - 280, H * 0.74, 560 * timeRatio, 14, timeRatio > 0.35 ? arrowCol : C.wrong, 0.85);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.81, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    nextArrow();
  });
})(game);
