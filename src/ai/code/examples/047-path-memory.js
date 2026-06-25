// 047-path-memory.js
// パスメモリー — 光ったルートを記憶して同じ経路をスワイプで再現
// 操作: 表示されたスワイプシーケンスを再現する
// 成功: 4ラウンドクリア  失敗: 1ミスで即失敗 or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080c10',
    path:    '#1e3a5f',
    pathHi:  '#3b82f6',
    arrow:   '#60a5fa',
    arrowHi: '#bfdbfe',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  var DIRS = ['up', 'down', 'left', 'right'];
  var ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };
  var DIR_COLORS = { up: '#818cf8', down: '#fb923c', left: '#34d399', right: '#f472b6' };

  var round = 0;
  var needed = 4;
  var timeLeft = 25;
  var done = false;

  var sequence = [];
  var playerSeq = [];
  var phase = 'show';    // 'show' | 'input' | 'feedback'
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_STEP_TIME = 0.55;
  var SHOW_GAP = 0.15;
  var isShowOn = false;
  var feedbackOk = false;
  var feedbackTimer = 0;

  // Arrow positions for the display
  var ARROW_Y = H * 0.45;
  var ARROW_GAP = 160;

  function buildSequence() {
    // Round 1: 3, Round 2: 4, Round 3: 5, Round 4: 6
    var len = 3 + round;
    var seq = [];
    for (var i = 0; i < len; i++) {
      seq.push(DIRS[Math.floor(Math.random() * 4)]);
    }
    return seq;
  }

  function startRound() {
    sequence = buildSequence();
    playerSeq = [];
    showIdx = 0;
    showTimer = 0.4; // lead-in
    isShowOn = false;
    phase = 'show';
  }

  game.onSwipe(function(dir) {
    if (done || phase !== 'input') return;

    var expected = sequence[playerSeq.length];
    playerSeq.push(dir);
    game.audio.play('se_tap', 0.6);

    if (dir !== expected) {
      feedbackOk = false;
      feedbackTimer = 0.8;
      phase = 'feedback';
      game.audio.play('se_failure', 0.7);
      done = true;
      setTimeout(function() { game.end.failure(); }, 900);
      return;
    }

    if (playerSeq.length >= sequence.length) {
      round++;
      feedbackOk = true;
      feedbackTimer = 0.7;
      phase = 'feedback';
      game.audio.play('se_success', 0.8);
      if (round >= needed) {
        done = true;
        setTimeout(function() {
          game.end.success(round * 40 + Math.ceil(timeLeft) * 5);
        }, 800);
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
        if (isShowOn) {
          isShowOn = false;
          showTimer = SHOW_GAP;
          showIdx++;
          if (showIdx >= sequence.length) {
            // All shown — switch to input after brief pause
            setTimeout(function() { phase = 'input'; }, 300);
          }
        } else {
          isShowOn = true;
          showTimer = SHOW_STEP_TIME;
          game.audio.play('se_tap', 0.5);
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
    game.draw.rect(0, 0, W, 72, '#080c10');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#1d4ed8' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Round pips
    for (var r = 0; r < needed; r++) {
      var rx = W / 2 + (r - (needed-1)/2) * 80;
      game.draw.circle(rx, 128, 26, r < round ? C.correct : '#1a2030');
      if (r < round) game.draw.circle(rx, 128, 14, '#86efac', 0.5);
    }

    // Sequence display
    var visibleLen = phase === 'input' ? playerSeq.length : (isShowOn ? showIdx + 1 : showIdx);
    var seqLen = sequence.length;
    var startX = W / 2 - (seqLen - 1) / 2 * ARROW_GAP;

    for (var s = 0; s < seqLen; s++) {
      var ax = startX + s * ARROW_GAP;
      var ay = ARROW_Y;
      var dir2 = sequence[s];
      var dirColor = DIR_COLORS[dir2];

      if (phase === 'show') {
        if (s < showIdx) {
          // Already shown, dimmed
          game.draw.circle(ax, ay, 54, '#0a1428');
          game.draw.text(ARROWS[dir2], ax, ay, { size: 56, color: '#1e3a5f' });
        } else if (s === showIdx && isShowOn) {
          // Currently showing
          game.draw.circle(ax, ay, 64, dirColor, 0.3);
          game.draw.circle(ax, ay, 54, dirColor);
          game.draw.text(ARROWS[dir2], ax, ay, { size: 72, color: '#fff', bold: true });
        } else {
          game.draw.circle(ax, ay, 54, '#0a1428');
        }
      } else if (phase === 'input') {
        if (s < playerSeq.length) {
          // Player has entered this one
          var isMatch = playerSeq[s] === sequence[s];
          game.draw.circle(ax, ay, 54, isMatch ? C.correct : C.wrong);
          game.draw.text(ARROWS[playerSeq[s]], ax, ay, { size: 72, color: '#fff', bold: true });
        } else if (s === playerSeq.length) {
          // Current to enter (pulsing)
          var pulse = 0.3 + 0.3 * Math.sin(game.time.elapsed * 8);
          game.draw.circle(ax, ay, 60, C.arrowHi, pulse);
          game.draw.circle(ax, ay, 54, C.path);
        } else {
          game.draw.circle(ax, ay, 54, '#0a1428');
        }
      } else {
        // Feedback
        game.draw.circle(ax, ay, 54, feedbackOk ? C.correct : C.wrong, 0.4);
        game.draw.text(ARROWS[dir2], ax, ay, { size: 56, color: feedbackOk ? C.correct : C.wrong });
      }
    }

    // Phase label
    if (phase === 'show') {
      game.draw.text(showIdx < seqLen ? '覚えろ！' : '...', W / 2, ARROW_Y - 120, {
        size: 60, color: C.arrowHi, bold: true
      });
    } else if (phase === 'input') {
      game.draw.text(playerSeq.length + ' / ' + seqLen, W / 2, ARROW_Y - 120, {
        size: 52, color: '#a5b4fc', bold: true
      });
      game.draw.text('再現しろ！', W / 2, ARROW_Y + 140, { size: 56, color: C.arrowHi, bold: true });
    } else if (phase === 'feedback') {
      if (feedbackOk) {
        game.draw.text('完璧！', W / 2, ARROW_Y + 140, { size: 88, color: C.correct, bold: true });
      } else {
        game.draw.text('ミス！', W / 2, ARROW_Y + 140, { size: 88, color: C.wrong, bold: true });
      }
    }

    // Guide
    game.draw.text(phase === 'input' ? 'スワイプで再現！' : '光る矢印を覚えろ！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    startRound();
  });
})(game);
