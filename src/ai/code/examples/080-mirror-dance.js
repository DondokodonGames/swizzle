// 080-mirror-dance.js
// ミラーダンス — 左側のダンサーの動きを右側に鏡写しでコピーする瞬発力
// 操作: スワイプで方向を入力（左ダンサーの動きをミラーして再現）
// 成功: 10回連続正解  失敗: 3回ミス or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0418',
    left:    '#f97316',
    right:   '#3b82f6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569',
    mirror:  '#1e293b'
  };

  // Dancer pose defined by arm and leg directions
  var MOVES = [
    { dir: 'up',    symbol: '↑', leftArm: [0, -1], rightArm: [0, 1] },
    { dir: 'down',  symbol: '↓', leftArm: [0, 1],  rightArm: [0, -1] },
    { dir: 'left',  symbol: '←', leftArm: [-1, 0], rightArm: [1, 0] },
    { dir: 'right', symbol: '→', leftArm: [1, 0],  rightArm: [-1, 0] }
  ];

  var currentMove = null;
  var phase = 'show'; // 'show' | 'input' | 'feedback'
  var showTimer = 0;
  var SHOW_TIME = 1.2;
  var feedbackTimer = 0;
  var feedbackOk = false;

  var score = 0;
  var needed = 10;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 30;
  var done = false;

  // Mirror of direction: left↔right, up/down stay same
  function mirrorDir(dir) {
    if (dir === 'left') return 'right';
    if (dir === 'right') return 'left';
    return dir;
  }

  function nextMove() {
    currentMove = MOVES[Math.floor(Math.random() * MOVES.length)];
    phase = 'show';
    showTimer = SHOW_TIME;
  }

  function onCorrect() {
    score++;
    feedbackOk = true;
    feedbackTimer = 0.4;
    game.audio.play('se_tap', 0.8);
    if (score >= needed && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(score * 25 + Math.ceil(timeLeft) * 6); }, 400);
    }
  }

  function onWrong() {
    misses++;
    feedbackOk = false;
    feedbackTimer = 0.4;
    game.audio.play('se_failure', 0.6);
    if (misses >= maxMisses && !done) {
      done = true;
      setTimeout(function() { game.end.failure(); }, 400);
    }
  }

  game.onSwipe(function(dir) {
    if (done || phase !== 'input') return;
    phase = 'feedback';
    var expected = mirrorDir(currentMove.dir);
    if (dir === expected) onCorrect();
    else onWrong();
    setTimeout(nextMove, 500);
  });

  function drawDancer(cx, cy, move, mirrored, color) {
    var mx = mirrored ? -1 : 1;
    var headR = 52;
    // Head
    game.draw.circle(cx, cy - 160, headR, color);
    game.draw.circle(cx, cy - 160, headR - 12, '#fff', 0.15);
    // Body
    game.draw.line(cx, cy - 108, cx, cy + 40, color, 12);
    // Arms based on move direction
    var armDir = mirrored ? [move.leftArm[0] * -1, move.leftArm[1]] : move.leftArm;
    var armL = [cx - 80 * mx, cy - 60 + armDir[1] * 80];
    var armR = [cx + 80 * mx, cy - 60 - armDir[1] * 80];
    game.draw.line(cx, cy - 80, armL[0], armL[1], color, 10);
    game.draw.line(cx, cy - 80, armR[0], armR[1], color, 10);
    // Legs: opposite to arm direction
    var legSpread = mirrored ? -1 : 1;
    game.draw.line(cx, cy + 40, cx - 60 * legSpread, cy + 160, color, 10);
    game.draw.line(cx, cy + 40, cx + 60 * legSpread, cy + 160, color, 10);
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
      if (showTimer <= 0) {
        phase = 'input';
      }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Mirror line
    game.draw.rect(W / 2 - 4, H * 0.18, 8, H * 0.62, C.mirror);
    game.draw.text('MIRROR', W / 2, H * 0.15, { size: 36, color: '#334155' });

    if (currentMove) {
      var leftCX = W * 0.28;
      var rightCX = W * 0.72;
      var dancerY = H * 0.48;

      // Left dancer (the cue)
      var leftColor = phase === 'show' ? C.left : (phase === 'input' ? C.left : (feedbackOk ? C.correct : C.wrong));
      drawDancer(leftCX, dancerY, currentMove, false, leftColor);

      // Right dancer (player side) — shown in input phase
      if (phase === 'input' || phase === 'feedback') {
        drawDancer(rightCX, dancerY, currentMove, true, C.right);
      } else {
        // Show silhouette during 'show' phase
        game.draw.circle(rightCX, dancerY - 160, 52, '#0f172a');
        game.draw.line(rightCX, dancerY - 108, rightCX, dancerY + 40, '#0f172a', 12);
      }

      // Direction arrow hint on left dancer
      if (phase === 'show') {
        game.draw.text(currentMove.symbol, leftCX, H * 0.72, { size: 88, color: C.left, bold: true });
      }

      // Input prompt
      if (phase === 'input') {
        game.draw.text('スワイプして！', W / 2, H * 0.72, { size: 52, color: '#94a3b8' });
        var expected = mirrorDir(currentMove.dir);
        var expMove = MOVES.find(function(m) { return m.dir === expected; });
        if (expMove) {
          game.draw.text(expMove.symbol + '?', rightCX, H * 0.72, { size: 88, color: C.right, bold: true });
        }
      }

      if (phase === 'feedback' && feedbackTimer > 0) {
        game.draw.text(feedbackOk ? '完璧！' : 'ズレた！', W / 2, H * 0.28, {
          size: 80, color: feedbackOk ? C.correct : C.wrong, bold: true
        });
      }
    }

    // Labels
    game.draw.text('コピーして', W * 0.28, H * 0.82, { size: 36, color: '#64748b' });
    game.draw.text('ミラーで！', W * 0.72, H * 0.82, { size: 36, color: '#64748b' });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#0a0418');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#7c3aed' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score + misses
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 68;
      game.draw.circle(sx, 128, 22, s < score ? C.correct : '#0f172a');
    }
    for (var m = 0; m < maxMisses; m++) {
      var mx2 = W / 2 + (m - (maxMisses - 1) / 2) * 60;
      game.draw.circle(mx2, 192, 18, m < misses ? C.wrong : '#0f172a');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    setTimeout(nextMove, 500);
  });
})(game);
