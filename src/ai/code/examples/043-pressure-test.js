// 043-pressure-test.js
// プレッシャーテスト — 連打を見せてから同じ回数ちょうど押す計数力
// 操作: 示された回数と同じ回数タップしてENTER（スワイプ上）
// 成功: 5回正確に一致  失敗: 3回ミス or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0a18',
    panel:   '#12102a',
    dot:     '#6366f1',
    dotHi:   '#a5b4fc',
    dotGone: '#1e1c3a',
    good:    '#22c55e',
    bad:     '#ef4444',
    ui:      '#475569'
  };

  var MAX_SHOW = 9;
  var MIN_SHOW = 3;
  var targetCount = 0;
  var playerCount = 0;

  var phase = 'show';    // 'show' | 'input' | 'feedback'
  var showTimer = 0;
  var SHOW_DOT_TIME = 0.25;  // each dot flashes for this long
  var showDotIdx = 0;        // which dot is currently flashing
  var showedDots = [];       // indices of dots shown

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 25;
  var done = false;
  var feedbackTimer = 0;
  var feedbackOk = false;

  // Grid of dots display
  var DOT_COLS = 3;
  var DOT_ROWS = 3;
  var DOT_R = 60;
  var DOT_GAP = 50;
  var GRID_W2 = DOT_COLS * (DOT_R * 2 + DOT_GAP) - DOT_GAP;
  var GRID_H2 = DOT_ROWS * (DOT_R * 2 + DOT_GAP) - DOT_GAP;
  var GRID_X2 = (W - GRID_W2) / 2;
  var GRID_Y2 = H * 0.3;

  function dotPos(idx) {
    var c = idx % DOT_COLS;
    var r = Math.floor(idx / DOT_COLS);
    return {
      x: GRID_X2 + c * (DOT_R * 2 + DOT_GAP) + DOT_R,
      y: GRID_Y2 + r * (DOT_R * 2 + DOT_GAP) + DOT_R
    };
  }

  function startRound() {
    targetCount = MIN_SHOW + Math.floor(Math.random() * (MAX_SHOW - MIN_SHOW + 1));
    playerCount = 0;
    showDotIdx = 0;
    showedDots = [];
    // Shuffle order
    var allDots = [];
    for (var i = 0; i < DOT_COLS * DOT_ROWS; i++) allDots.push(i);
    for (var j = DOT_COLS * DOT_ROWS - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = allDots[j]; allDots[j] = allDots[k]; allDots[k] = tmp;
    }
    showedDots = allDots.slice(0, targetCount);
    showTimer = SHOW_DOT_TIME;
    phase = 'show';
  }

  game.onTap(function(x, y) {
    if (done || phase !== 'input') return;
    playerCount++;
    game.audio.play('se_tap', 0.5);
  });

  game.onSwipe(function(dir) {
    if (done || phase !== 'input') return;
    if (dir === 'up') {
      // Confirm answer
      feedbackOk = (playerCount === targetCount);
      feedbackTimer = 0.7;
      phase = 'feedback';

      if (feedbackOk) {
        score++;
        game.audio.play('se_tap', 1.0);
        if (score >= needed) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(score * 25 + Math.ceil(timeLeft) * 4);
          }, 800);
        }
      } else {
        misses++;
        game.audio.play('se_failure', 0.6);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 800);
        }
      }
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

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        showDotIdx++;
        if (showDotIdx >= targetCount) {
          // Show phase over
          setTimeout(function() { phase = 'input'; }, 400);
        } else {
          showTimer = SHOW_DOT_TIME + (showDotIdx === targetCount - 1 ? 0.2 : 0);
          game.audio.play('se_tap', 0.35);
        }
      }
    } else if (phase === 'feedback') {
      feedbackTimer -= dt;
      if (feedbackTimer <= 0 && !done) startRound();
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#0c0a18');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#4f46e5' : C.bad);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score pips
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed-1)/2) * 80;
      game.draw.circle(sx, 128, 26, s < score ? C.good : C.panel);
      if (s < score) game.draw.circle(sx, 128, 14, '#86efac', 0.5);
    }
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses-1)/2) * 60;
      game.draw.circle(mx, 200, 18, m < misses ? C.bad : C.panel);
    }

    // Dots grid
    for (var d = 0; d < DOT_COLS * DOT_ROWS; d++) {
      var dp = dotPos(d);
      var isDotShown = showedDots.indexOf(d) !== -1;
      var showIdx = showedDots.indexOf(d);

      if (phase === 'show') {
        // Show dots one by one
        if (showIdx < showDotIdx) {
          // Already shown
          game.draw.circle(dp.x, dp.y, DOT_R, C.dotGone);
          game.draw.circle(dp.x, dp.y, 20, C.dot, 0.3);
        } else if (showIdx === showDotIdx) {
          // Currently showing
          var flash = 0.7 + 0.3 * Math.sin(game.time.elapsed * 30);
          game.draw.circle(dp.x, dp.y, DOT_R + 12, C.dotHi, flash * 0.4);
          game.draw.circle(dp.x, dp.y, DOT_R, C.dotHi, flash);
        } else {
          game.draw.circle(dp.x, dp.y, DOT_R, C.dotGone);
        }
      } else {
        // Input phase: hide which were shown
        game.draw.circle(dp.x, dp.y, DOT_R, C.dotGone);
      }
    }

    // Phase display
    if (phase === 'show') {
      game.draw.text('覚えろ！', W / 2, GRID_Y2 - 60, { size: 60, color: C.dotHi, bold: true });
    } else if (phase === 'input') {
      game.draw.text('↑で確定', W / 2, GRID_Y2 + GRID_H2 + 60, { size: 48, color: C.ui });
      // Player count display
      game.draw.text(playerCount + '', W / 2, H * 0.45, { size: 200, color: C.dot, bold: true });
      game.draw.text('タップ回数', W / 2, H * 0.65, { size: 48, color: C.ui });
    } else if (phase === 'feedback') {
      var prog = 1 - feedbackTimer / 0.7;
      if (feedbackOk) {
        game.draw.text('正解！ ' + targetCount + '回', W / 2, H * 0.5 - prog * 40, { size: 88, color: C.good, bold: true });
      } else {
        game.draw.text('目標: ' + targetCount + '  入力: ' + playerCount, W / 2, H * 0.5, { size: 60, color: C.bad, bold: true });
      }
    }

    // Guide
    if (phase === 'input') {
      game.draw.text('光った数だけタップ！', W / 2, H - 200, { size: 52, color: C.ui });
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    startRound();
  });
})(game);
