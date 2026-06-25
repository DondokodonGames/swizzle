// 051-shadow-match.js
// シャドウマッチ — 影だけ見えるシルエットが何かを当てる瞬発力テスト
// 操作: タップで「丸」「三角」「四角」を選択→スワイプ上で確定
// 成功: 7問正解  失敗: 3問不正解 or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060810',
    shadow:  '#0f1520',
    silh:    '#1e293b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    select:  '#3b82f6',
    selectHi:'#93c5fd',
    ui:      '#475569'
  };

  // Shape types: 0=circle, 1=triangle, 2=square
  var SHAPES = ['circle', 'triangle', 'square'];
  var SHAPE_LABELS = ['丸', '三角', '四角'];

  var currentShape = 0;
  var selectedAnswer = -1;
  var phase = 'show';  // 'show' | 'answer' | 'feedback'
  var showTimer = 0;
  var SHOW_TIME = 0.9;
  var feedbackTimer = 0;

  var score = 0;
  var needed = 7;
  var wrongs = 0;
  var maxWrongs = 3;
  var timeLeft = 20;
  var done = false;

  var revealRatio = 0;  // 0 = fully shadowed, 1 = revealed

  function newRound() {
    currentShape = Math.floor(Math.random() * 3);
    selectedAnswer = -1;
    phase = 'show';
    showTimer = SHOW_TIME;
    revealRatio = 0;
  }

  game.onTap(function(x, y) {
    if (done || phase !== 'answer') return;
    // Determine which option tapped (3 buttons at bottom)
    var btnY = H * 0.75;
    var btnH = 160;
    if (y < btnY || y > btnY + btnH) return;

    for (var i = 0; i < 3; i++) {
      var bx = W / 2 + (i - 1) * 280;
      if (Math.abs(x - bx) < 120) {
        selectedAnswer = i;
        game.audio.play('se_tap', 0.5);
        break;
      }
    }
  });

  game.onSwipe(function(dir) {
    if (done || phase !== 'answer') return;
    if (dir === 'up' && selectedAnswer >= 0) {
      // Confirm
      var correct = selectedAnswer === currentShape;
      if (correct) {
        score++;
        game.audio.play('se_tap', 0.8);
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score * 20 + Math.ceil(timeLeft) * 8); }, 400);
          return;
        }
      } else {
        wrongs++;
        game.audio.play('se_failure', 0.6);
        if (wrongs >= maxWrongs && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
      }
      phase = 'feedback';
      feedbackTimer = 0.6;
    }
  });

  function drawShape(shape, cx, cy, size, color, alpha) {
    if (shape === 0) { // circle
      game.draw.circle(cx, cy, size, color, alpha);
    } else if (shape === 1) { // triangle
      // Draw as filled area using rects (approximation with lines)
      for (var row = 0; row < size; row++) {
        var rowW = (row / size) * size * 2;
        game.draw.rect(cx - rowW / 2, cy - size + row * (size * 2 / size), rowW, size * 2 / size + 2, color, alpha);
      }
    } else { // square
      game.draw.rect(cx - size, cy - size, size * 2, size * 2, color, alpha);
    }
  }

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (phase === 'show') {
      showTimer -= dt;
      revealRatio = Math.min(1, (SHOW_TIME - showTimer) / SHOW_TIME);
      if (showTimer <= 0) {
        phase = 'answer';
        revealRatio = 0; // hide again
      }
    } else if (phase === 'feedback') {
      feedbackTimer -= dt;
      if (feedbackTimer <= 0 && !done) newRound();
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Shape display area
    var shapeCX = W / 2;
    var shapeCY = H * 0.38;
    var shapeSize = 180;

    // Shadow (always visible)
    drawShape(currentShape, shapeCX, shapeCY, shapeSize, C.silh, 1.0);

    // Reveal overlay (briefly shows the shape lit up)
    if (revealRatio > 0 && phase === 'show') {
      var flash = Math.sin(revealRatio * Math.PI);
      drawShape(currentShape, shapeCX, shapeCY, shapeSize, '#818cf8', flash * 0.8);
      drawShape(currentShape, shapeCX, shapeCY, shapeSize * 0.4, '#fff', flash * 0.4);
    }

    // Feedback overlay
    if (phase === 'feedback') {
      var wasCorrect = selectedAnswer === currentShape;
      var fc = wasCorrect ? C.correct : C.wrong;
      drawShape(currentShape, shapeCX, shapeCY, shapeSize, fc, 0.5);
    }

    // Answer buttons
    if (phase === 'answer' || phase === 'feedback') {
      for (var i = 0; i < 3; i++) {
        var bx = W / 2 + (i - 1) * 280;
        var by = H * 0.75;
        var isSelected = selectedAnswer === i;
        var isCorrect = phase === 'feedback' && i === currentShape;
        var isWrong = phase === 'feedback' && i === selectedAnswer && selectedAnswer !== currentShape;

        var btnColor = isCorrect ? C.correct : (isWrong ? C.wrong : (isSelected ? C.select : '#1e293b'));
        game.draw.rect(bx - 100, by, 200, 160, btnColor, 1.0);
        game.draw.rect(bx - 88, by + 12, 176, 24, '#fff', 0.1);
        // Shape preview
        var previewSize = 44;
        drawShape(i, bx, by + 80, previewSize, isSelected ? '#fff' : C.selectHi, isSelected ? 1.0 : 0.5);
        game.draw.text(SHAPE_LABELS[i], bx, by + 148, { size: 40, color: isSelected ? '#fff' : '#64748b', bold: isSelected });
      }

      if (selectedAnswer >= 0 && phase === 'answer') {
        game.draw.text('↑スワイプで確定！', W / 2, H * 0.75 - 80, { size: 44, color: C.selectHi, bold: true });
      }
    }

    // Phase text
    if (phase === 'show') {
      game.draw.text('何の形？', W / 2, H * 0.18, { size: 72, color: '#818cf8', bold: true });
    } else if (phase === 'answer') {
      game.draw.text('どれだった？', W / 2, H * 0.18, { size: 60, color: '#94a3b8', bold: true });
    } else if (phase === 'feedback') {
      var wasOk = selectedAnswer === currentShape;
      game.draw.text(wasOk ? '正解！' : '不正解', W / 2, H * 0.18, {
        size: 72, color: wasOk ? C.correct : C.wrong, bold: true
      });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#060810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.select : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score pips
    for (var s = 0; s < needed; s++) {
      var px = W / 2 + (s - (needed - 1) / 2) * 80;
      game.draw.circle(px, 128, 24, s < score ? C.correct : '#0f1520');
    }

    // Miss pips
    for (var ww = 0; ww < maxWrongs; ww++) {
      var wx = W / 2 + (ww - 1) * 60;
      game.draw.circle(wx, 196, 18, ww < wrongs ? C.wrong : '#0f1520');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    newRound();
  });
})(game);
