// 755-tap-count.js
// タップカウント — 表示された数字と同じ回数だけ素早くタップせよ
// 操作: タップ（表示数字の回数だけ）
// 成功: 25回正確にカウント  失敗: 8回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060e',
    numCol:  '#60a5fa',
    tapDot:  '#f97316',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#08101e'
  };

  var targetNum = 0;
  var tapsSoFar = 0;
  var windowTimer = 0;
  var WINDOW_DUR = 2.2;
  var waitTimer = 0;
  var WAIT_DUR = 0.45;
  var phase = 'show'; // 'show' | 'count' | 'wait'
  var showTimer = 0;
  var SHOW_DUR = 0.9;

  var score = 0;
  var NEEDED = 25;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var tapDots = []; // visual tap markers
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function nextRound() {
    targetNum = 2 + Math.floor(Math.random() * 5); // 2-6
    SHOW_DUR = Math.max(0.5, 0.9 - score * 0.01);
    WINDOW_DUR = Math.max(1.2, 2.2 - score * 0.02);
    showTimer = SHOW_DUR;
    tapsSoFar = 0;
    tapDots = [];
    phase = 'show';
  }

  function evaluateTaps() {
    if (tapsSoFar === targetNum) {
      score++;
      flashCol = C.correct;
      flashAnim = 0.25;
      resultText = targetNum + '回！正解！';
      resultTimer = 0.45;
      game.audio.play('se_success', 0.6);
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = targetNum + '回のはずが' + tapsSoFar + '回';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    if (score >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 80); }, 700);
      return;
    }
    phase = 'wait';
    waitTimer = WAIT_DUR;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'count') return;
    tapsSoFar++;
    game.audio.play('se_tap', 0.08);
    tapDots.push({ x: 120 + (tapsSoFar - 1) * 90, y: H * 0.72, life: 1.0 });
    // Early evaluation if already hit target
    if (tapsSoFar === targetNum) {
      // Wait briefly to see if they tap again
      windowTimer = Math.min(windowTimer, 0.4);
    }
    if (tapsSoFar > targetNum) {
      // Over-tapped immediately
      evaluateTaps();
      phase = 'wait';
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

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        phase = 'count';
        windowTimer = WINDOW_DUR;
      }
    } else if (phase === 'count') {
      windowTimer -= dt;
      if (windowTimer <= 0) {
        evaluateTaps();
      }
    } else if (phase === 'wait') {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) {
        nextRound();
      }
    }

    for (var di = tapDots.length - 1; di >= 0; di--) {
      tapDots[di].life -= dt * 2.5;
      if (tapDots[di].life <= 0) tapDots.splice(di, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    if (phase === 'show') {
      // Big number display
      var showFrac = showTimer / SHOW_DUR;
      game.draw.text('' + targetNum, W / 2, H * 0.40, { size: 240, color: C.numCol, bold: true });
      game.draw.text('この回数タップ', W / 2, H * 0.62, { size: 44, color: C.text + '99' });
      // Countdown bar
      game.draw.rect(W / 2 - 200, H * 0.68, 400, 12, '#1a1a2a', 0.9);
      game.draw.rect(W / 2 - 200, H * 0.68, 400 * showFrac, 12, C.numCol, 0.9);
    } else if (phase === 'count') {
      // Tap area
      game.draw.rect(0, H * 0.3, W, H * 0.45, C.numCol, 0.03);
      game.draw.text('タップ！', W / 2, H * 0.45, { size: 100, color: C.numCol, bold: true });
      // Progress
      var cntCol = tapsSoFar > targetNum ? C.wrong : (tapsSoFar === targetNum ? C.correct : C.tapDot);
      game.draw.text(tapsSoFar + ' / ' + targetNum, W / 2, H * 0.60, { size: 72, color: cntCol, bold: true });
      // Time window bar
      var wFrac = Math.max(0, windowTimer / WINDOW_DUR);
      game.draw.rect(W / 2 - 240, H * 0.70, 480, 14, '#1a1a2a', 0.8);
      game.draw.rect(W / 2 - 240, H * 0.70, 480 * wFrac, 14, wFrac > 0.3 ? C.tapDot : C.wrong, 0.85);
    } else {
      game.draw.text('・・・', W / 2, H * 0.45, { size: 80, color: C.text + '33' });
    }

    // Tap dots
    for (var di2 = 0; di2 < tapDots.length; di2++) {
      var td = tapDots[di2];
      game.draw.circle(td.x, td.y, 20 * td.life, C.tapDot, td.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 48, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    nextRound();
  });
})(game);
