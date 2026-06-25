// 132-equation-rush.js
// 計算ラッシュ — 流れる数式の答えが正しいか素早く判断するスピード暗算の脳トレ
// 操作: タップ左=正しい、タップ右=間違い
// 成功: 20問連続判断  失敗: 5回ミス or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060c',
    left:    '#22c55e',
    leftHi:  '#86efac',
    right:   '#ef4444',
    rightHi: '#fca5a5',
    eq:      '#f1f5f9',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  function genEquation() {
    var ops = ['+', '-', '×'];
    var op = ops[Math.floor(Math.random() * ops.length)];
    var a, b, answer, shown;
    if (op === '+') {
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      answer = a + b;
    } else if (op === '-') {
      a = Math.floor(Math.random() * 20) + 10;
      b = Math.floor(Math.random() * a);
      answer = a - b;
    } else {
      a = Math.floor(Math.random() * 9) + 2;
      b = Math.floor(Math.random() * 9) + 2;
      answer = a * b;
    }
    // 50% chance of wrong answer
    var isCorrect = Math.random() > 0.45;
    if (!isCorrect) {
      shown = answer + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
      if (shown === answer) shown = answer + 2;
    } else {
      shown = answer;
    }
    return { text: a + ' ' + op + ' ' + b + ' = ' + shown, isCorrect: isCorrect };
  }

  var current = genEquation();
  var nextEq = genEquation();

  var score = 0;
  var needed = 20;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 35;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var eqY = H * 0.48;
  var eqAlpha = 1;

  game.onTap(function(tx, ty) {
    if (done || feedback > 0) return;
    var isLeftSide = tx < W / 2;
    // Left = correct, Right = wrong
    var playerSaysCorrect = isLeftSide;
    var actualCorrect = current.isCorrect;
    if (playerSaysCorrect === actualCorrect) {
      score++;
      feedbackOk = true;
      feedback = 0.28;
      game.audio.play('se_tap', 0.7);
      if (score >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(score*25 + Math.ceil(timeLeft)*12); }, 400);
        return;
      }
      current = nextEq;
      nextEq = genEquation();
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.28;
      game.audio.play('se_failure', 0.6);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
      current = nextEq;
      nextEq = genEquation();
    }
  });

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
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Left side (correct)
    var leftAlpha = feedback > 0 && feedbackOk ? 0.3 : (feedback > 0 && !feedbackOk ? 0.05 : 0.08);
    game.draw.rect(0, 0, W/2, H, C.left, leftAlpha);
    game.draw.text('◯', W/4, H*0.82, { size: 100, color: C.left, bold: true });
    game.draw.text('あってる', W/4, H*0.92, { size: 44, color: C.left });

    // Right side (wrong)
    var rightAlpha = feedback > 0 && !feedbackOk ? 0.3 : (feedback > 0 && feedbackOk ? 0.05 : 0.08);
    game.draw.rect(W/2, 0, W/2, H, C.right, rightAlpha);
    game.draw.text('×', W*3/4, H*0.82, { size: 100, color: C.right, bold: true });
    game.draw.text('ちがう', W*3/4, H*0.92, { size: 44, color: C.right });

    // Divider
    game.draw.line(W/2, 80, W/2, H*0.76, C.ui, 2);

    // Equation
    var eqScale = feedback > 0 ? (1 + (0.28 - feedback) * 0.5) : 1;
    var eqColor = feedback > 0 ? (feedbackOk ? C.correct : C.wrong) : C.eq;
    game.draw.text(current.text, W/2, eqY, { size: 68 * eqScale, color: eqColor, bold: true });

    // Preview of next
    game.draw.text(nextEq.text, W/2, eqY + 120, { size: 36, color: C.ui });

    // Feedback overlay
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '正解!' : '不正解!', W/2, H*0.28, {
        size: 80, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Score + misses
    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W/2+(mi-2)*52, 220, 18, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft/35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? '#f59e0b' : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
