// 319-shadow-match.js
// シャドウマッチ — 影のシルエットを見て正しい形の元を当てる
// 操作: 左右スワイプで選択肢を切り替え、タップで決定
// 成功: 15問正解  失敗: 5問不正解 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0c0c1a',
    shadow: '#1a1a3d',
    shadowHi:'#2d2d6b',
    correct:'#22c55e',
    correctHi:'#86efac',
    wrong:  '#ef4444',
    wrongHi:'#fca5a5',
    select: '#3b82f6',
    selectHi:'#93c5fd',
    ui:     '#475569',
    text:   '#f1f5f9',
    shape1: '#f59e0b',
    shape2: '#a78bfa',
    shape3: '#34d399',
    shape4: '#f87171'
  };

  // Shape types: 0=triangle, 1=square, 2=star, 3=circle, 4=diamond, 5=cross
  var SHAPE_NAMES = ['三角形', '四角形', '星形', '円形', 'ひし形', '十字形'];
  var SHAPE_COLORS = [C.shape1, C.shape2, C.shape3, C.shape4, '#60a5fa', '#fb923c'];

  function drawShape(ctx_or_game, type, x, y, size, col, alpha) {
    // We use game.draw primitives
    if (type === 0) { // triangle
      game.draw.line(x, y - size, x - size * 0.9, y + size * 0.6, col, 8);
      game.draw.line(x - size * 0.9, y + size * 0.6, x + size * 0.9, y + size * 0.6, col, 8);
      game.draw.line(x + size * 0.9, y + size * 0.6, x, y - size, col, 8);
      // fill approximation with circle
      game.draw.circle(x, y + size * 0.1, size * 0.7, col, (alpha || 0.9) * 0.9);
    } else if (type === 1) { // square
      game.draw.rect(x - size, y - size, size * 2, size * 2, col, alpha || 0.9);
    } else if (type === 2) { // star (5 circles)
      game.draw.circle(x, y, size, col, (alpha || 0.9) * 0.7);
      for (var i = 0; i < 5; i++) {
        var a = -Math.PI / 2 + i * Math.PI * 2 / 5;
        game.draw.circle(x + Math.cos(a) * size * 0.85, y + Math.sin(a) * size * 0.85, size * 0.45, col, alpha || 0.9);
      }
    } else if (type === 3) { // circle
      game.draw.circle(x, y, size, col, alpha || 0.9);
    } else if (type === 4) { // diamond
      game.draw.line(x, y - size, x - size * 0.7, y, col, 8);
      game.draw.line(x - size * 0.7, y, x, y + size, col, 8);
      game.draw.line(x, y + size, x + size * 0.7, y, col, 8);
      game.draw.line(x + size * 0.7, y, x, y - size, col, 8);
      game.draw.circle(x, y, size * 0.5, col, (alpha || 0.9) * 0.9);
    } else { // cross
      game.draw.rect(x - size * 0.3, y - size, size * 0.6, size * 2, col, alpha || 0.9);
      game.draw.rect(x - size, y - size * 0.3, size * 2, size * 0.6, col, alpha || 0.9);
    }
  }

  var correctAnswer = 0;
  var choices = [];
  var selected = 0;
  var numChoices = 3;
  var correct = 0;
  var NEEDED = 15;
  var wrong = 0;
  var MAX_WRONG = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var resultAnim = 0;
  var resultText = '';
  var resultCol = C.correct;
  var phase = 'question'; // question, result

  function newQuestion() {
    correctAnswer = Math.floor(Math.random() * 6);
    choices = [correctAnswer];
    while (choices.length < numChoices) {
      var c = Math.floor(Math.random() * 6);
      if (choices.indexOf(c) === -1) choices.push(c);
    }
    // Shuffle
    for (var i = choices.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = choices[i]; choices[i] = choices[j]; choices[j] = tmp;
    }
    selected = 0;
    phase = 'question';
  }

  game.onSwipe(function(dir) {
    if (done || phase !== 'question') return;
    if (dir === 'right') selected = (selected + 1) % numChoices;
    if (dir === 'left') selected = (selected - 1 + numChoices) % numChoices;
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function() {
    if (done || phase !== 'question') return;
    phase = 'result';
    if (choices[selected] === correctAnswer) {
      correct++;
      resultText = '正解！';
      resultCol = C.correctHi;
      resultAnim = 0.8;
      game.audio.play('se_success', 0.6);
      if (correct >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(correct * 200 + Math.ceil(timeLeft) * 80); }, 500);
        return;
      }
    } else {
      wrong++;
      resultText = '不正解…';
      resultCol = C.wrongHi;
      resultAnim = 0.8;
      game.audio.play('se_failure', 0.5);
      if (wrong >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }
    setTimeout(function() { if (!done) newQuestion(); }, 700);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (resultAnim > 0) resultAnim -= dt * 1.5;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Shadow display area
    game.draw.rect(W * 0.1, H * 0.18, W * 0.8, W * 0.8, C.shadow, 0.8);
    // Draw shadow (correct shape, dark colored)
    drawShape(null, correctAnswer, W / 2, H * 0.18 + W * 0.4, 120, C.shadowHi, 0.5);

    game.draw.text('この影の元は？', W / 2, H * 0.18 - 30, { size: 40, color: C.ui });

    // Choices
    var cw = W * 0.28, ch = W * 0.28;
    for (var i = 0; i < numChoices; i++) {
      var cx = W * 0.12 + i * (cw + W * 0.06) + cw / 2;
      var cy = H * 0.72;
      var isSelected = i === selected;
      game.draw.rect(cx - cw / 2 - 8, cy - ch / 2 - 8, cw + 16, ch + 16, isSelected ? C.select : C.ui, isSelected ? 0.4 : 0.15);
      drawShape(null, choices[i], cx, cy, 70, SHAPE_COLORS[choices[i]], 0.9);
    }

    // Selection arrow
    var selCx = W * 0.12 + selected * (cw + W * 0.06) + cw / 2;
    game.draw.text('▼', selCx, H * 0.67, { size: 36, color: C.selectHi, bold: true });

    // Result flash
    if (resultAnim > 0) {
      game.draw.rect(0, 0, W, H, resultCol === C.correctHi ? C.correct : C.wrong, resultAnim * 0.15);
      game.draw.text(resultText, W / 2, H * 0.82, { size: 64, color: resultCol, bold: true });
    } else if (phase === 'question') {
      game.draw.text('← スワイプで選択  タップで決定 →', W / 2, H * 0.82, { size: 34, color: C.ui });
    }

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 28 + wi * 56, H * 0.91, 16, wi < wrong ? C.wrong : '#0c0c1a');
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.select : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    newQuestion();
  });
})(game);
