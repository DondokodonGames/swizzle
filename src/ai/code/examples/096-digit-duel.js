// 096-digit-duel.js
// 数字対決 — 2つの数が現れた瞬間に大きい方をタップする電光石火の判断力
// 操作: 左右どちらか大きい数をタップ
// 成功: 15問正解  失敗: 5回ミス or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080c',
    numL:    '#3b82f6',
    numR:    '#f97316',
    bigger:  '#22c55e',
    smaller: '#1e293b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  var numLeft = 0;
  var numRight = 0;
  var phase = 'wait'; // 'show' | 'wait' | 'feedback'
  var showTimer = 0;
  var SHOW_TIME = 1.5;
  var responded = false;
  var feedbackOk = false;
  var feedback = 0;
  var flashSide = 0; // -1=left, 1=right

  var score = 0;
  var needed = 15;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 25;
  var done = false;

  function nextRound() {
    // Generate two different numbers
    var a = Math.floor(Math.random() * 99) + 1;
    var b = Math.floor(Math.random() * 99) + 1;
    while (b === a) b = Math.floor(Math.random() * 99) + 1;
    // Sometimes make them very close for extra tension
    if (Math.random() > 0.6) {
      b = a + (Math.random() > 0.5 ? 1 : -1) * (1 + Math.floor(Math.random() * 5));
      b = Math.max(1, Math.min(99, b));
    }
    numLeft = a;
    numRight = b;
    phase = 'show';
    showTimer = SHOW_TIME;
    responded = false;
  }

  function onTapSide(side) {
    // side: -1 = left, 1 = right
    if (done || responded || phase !== 'show') return;
    responded = true;
    flashSide = side;
    var bigger = numLeft > numRight ? -1 : 1;
    if (side === bigger) {
      score++;
      feedbackOk = true;
      feedback = 0.4;
      game.audio.play('se_tap', 1.0);
      if (score >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(score * 25 + Math.ceil(timeLeft) * 8); }, 400);
        return;
      }
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.4;
      game.audio.play('se_failure', 0.7);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }
    phase = 'wait';
    setTimeout(nextRound, 500);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    onTapSide(tx < W / 2 ? -1 : 1);
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

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0 && !responded) {
        // Time's up for this round — miss
        responded = true;
        misses++;
        feedbackOk = false;
        feedback = 0.4;
        flashSide = numLeft > numRight ? -1 : 1; // reveal correct
        game.audio.play('se_failure', 0.5);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        } else {
          phase = 'wait';
          setTimeout(nextRound, 600);
        }
      }
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Divider
    game.draw.rect(W / 2 - 4, 0, 8, H, '#0a1428');

    if (phase === 'show' || (feedback > 0 && responded)) {
      // Determine which is bigger
      var leftBig = numLeft > numRight;
      var rightBig = numRight > numLeft;

      // Left number
      var leftAlpha = responded ? (feedbackOk && flashSide === -1 ? 1 : (feedbackOk ? 0.3 : (flashSide === -1 ? 0.4 : 1))) : 1;
      var leftSize = 180 + (leftBig ? 20 : 0);
      var leftColor = responded ? (leftBig ? C.bigger : C.smaller) : C.numL;
      game.draw.text(numLeft + '', W * 0.25, H * 0.45, { size: leftSize, color: leftColor, bold: true });

      // Right number
      var rightAlpha = responded ? (feedbackOk && flashSide === 1 ? 1 : (feedbackOk ? 0.3 : (flashSide === 1 ? 0.4 : 1))) : 1;
      var rightSize = 180 + (rightBig ? 20 : 0);
      var rightColor = responded ? (rightBig ? C.bigger : C.smaller) : C.numR;
      game.draw.text(numRight + '', W * 0.75, H * 0.45, { size: rightSize, color: rightColor, bold: true });

      // "VS" indicator
      if (!responded) {
        game.draw.text('VS', W / 2, H * 0.45, { size: 48, color: '#334155', bold: true });
      }

      // Time bar under numbers
      if (!responded && phase === 'show') {
        var tr = Math.max(0, showTimer / SHOW_TIME);
        var timerBarW = W * 0.8;
        game.draw.rect(W / 2 - timerBarW / 2, H * 0.62, timerBarW, 16, '#0a1428');
        game.draw.rect(W / 2 - timerBarW / 2, H * 0.62, timerBarW * tr, 16, tr > 0.4 ? '#3b82f6' : '#ef4444');
      }
    } else if (phase === 'wait') {
      game.draw.text('?', W * 0.25, H * 0.45, { size: 180, color: '#0a1428', bold: true });
      game.draw.text('?', W * 0.75, H * 0.45, { size: 180, color: '#0a1428', bold: true });
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '正解！' : '不正解！', W / 2, H * 0.28, {
        size: 72, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Guide
    game.draw.text('大きい方をタップ！', W / 2, H * 0.72, { size: 48, color: C.ui });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#04080c');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#3b82f6' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score + misses
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 60;
      game.draw.circle(sx, 128, 18, s < score ? C.correct : '#0a1428');
    }
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 56;
      game.draw.circle(mx, 192, 18, m < misses ? C.wrong : '#0a1428');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    setTimeout(nextRound, 400);
  });
})(game);
