// 173-light-switch.js
// 電球パターン — 光っているパターンを覚えて、消えたあとに同じ状態を再現する記憶力
// 操作: タップでマスのON/OFFを切り替え、確定タップ
// 成功: 6問正解  失敗: 3回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04060a',
    off:    '#0f1928',
    offHi:  '#1e2d40',
    on:     '#fef08a',
    onHi:   '#fbbf24',
    onGlow: '#f59e0b',
    submit: '#22c55e',
    wrong:  '#ef4444',
    ui:     '#334155'
  };

  var GRID_COLS = 4;
  var GRID_ROWS = 4;
  var CELL_SIZE = 200;
  var CELL_PAD = 12;
  var GRID_X = (W - GRID_COLS * CELL_SIZE) / 2;
  var GRID_Y = H * 0.25;
  var SUBMIT_BTN_Y = H * 0.82;

  var targetPattern = [];
  var playerPattern = [];
  var phase = 'show'; // 'show' | 'input' | 'result'
  var showTimer = 0;
  var SHOW_TIME = 1.8;
  var resultTimer = 0;

  var score = 0;
  var needed = 6;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 45;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;

  function newRound() {
    targetPattern = [];
    playerPattern = [];
    // Generate random lit pattern (40-60% lit)
    var litCount = 6 + Math.floor(Math.random() * 5);
    for (var i = 0; i < GRID_COLS * GRID_ROWS; i++) {
      playerPattern.push(false);
      targetPattern.push(false);
    }
    for (var li = 0; li < litCount; li++) {
      var idx;
      do { idx = Math.floor(Math.random() * GRID_COLS * GRID_ROWS); } while (targetPattern[idx]);
      targetPattern[idx] = true;
    }
    phase = 'show';
    showTimer = SHOW_TIME;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'show') return;
    if (phase === 'result') return;

    // Submit button
    if (ty > SUBMIT_BTN_Y - 60 && ty < SUBMIT_BTN_Y + 60 && tx > W / 2 - 200 && tx < W / 2 + 200) {
      // Check answer
      var correct = true;
      for (var i = 0; i < targetPattern.length; i++) {
        if (targetPattern[i] !== playerPattern[i]) { correct = false; break; }
      }
      if (correct) {
        score++;
        feedbackOk = true; feedback = 0.6;
        game.audio.play('se_success');
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 100 + Math.ceil(timeLeft) * 30); }, 600);
          return;
        }
      } else {
        misses++;
        feedbackOk = false; feedback = 0.6;
        game.audio.play('se_failure');
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
      }
      phase = 'result';
      resultTimer = 0.8;
      return;
    }

    // Grid tap
    var col = Math.floor((tx - GRID_X) / CELL_SIZE);
    var row = Math.floor((ty - GRID_Y) / CELL_SIZE);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      var idx2 = row * GRID_COLS + col;
      playerPattern[idx2] = !playerPattern[idx2];
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) phase = 'input';
    }

    if (phase === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0) newRound();
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Title
    if (phase === 'show') {
      game.draw.text('覚えて！', W / 2, GRID_Y - 60, { size: 52, color: C.onHi, bold: true });
    } else if (phase === 'input') {
      game.draw.text('再現して！', W / 2, GRID_Y - 60, { size: 52, color: C.submit, bold: true });
    } else {
      var revealCol = feedbackOk ? C.submit : C.wrong;
      game.draw.text(feedbackOk ? '正解！' : '違う...', W / 2, GRID_Y - 60, { size: 56, color: revealCol, bold: true });
    }

    // Grid
    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        var idx3 = r * GRID_COLS + c;
        var cx2 = GRID_X + c * CELL_SIZE + CELL_PAD;
        var cy2 = GRID_Y + r * CELL_SIZE + CELL_PAD;
        var cw = CELL_SIZE - CELL_PAD * 2;
        var ch = CELL_SIZE - CELL_PAD * 2;

        var showOn, correctOn;
        if (phase === 'show') {
          showOn = targetPattern[idx3];
        } else if (phase === 'input') {
          showOn = playerPattern[idx3];
        } else {
          // Result: show both
          correctOn = targetPattern[idx3];
          showOn = playerPattern[idx3];
        }

        if (phase === 'result') {
          // Show target vs player
          var isRight = targetPattern[idx3] === playerPattern[idx3];
          var cellCol = isRight ? C.submit : C.wrong;
          game.draw.rect(cx2, cy2, cw, ch, isRight ? C.off : C.wrong, isRight ? 0.7 : 0.3);
          if (targetPattern[idx3]) {
            game.draw.circle(cx2 + cw / 2, cy2 + ch / 2, cw * 0.35, C.onGlow, 0.8);
          }
        } else {
          if (showOn) {
            game.draw.rect(cx2 - 4, cy2 - 4, cw + 8, ch + 8, C.onGlow, 0.2);
            game.draw.rect(cx2, cy2, cw, ch, C.on, 0.95);
            game.draw.circle(cx2 + cw / 2, cy2 + ch / 2, cw * 0.2, '#fff', 0.5);
          } else {
            game.draw.rect(cx2, cy2, cw, ch, C.off, 0.85);
            game.draw.rect(cx2, cy2, cw, 8, C.offHi, 0.4);
          }
        }
      }
    }

    // Submit button (input phase only)
    if (phase === 'input') {
      game.draw.rect(W / 2 - 200, SUBMIT_BTN_Y - 60, 400, 120, C.submit, 0.85);
      game.draw.rect(W / 2 - 200, SUBMIT_BTN_Y - 60, 400, 12, '#86efac', 0.6);
      game.draw.text('確定！', W / 2, SUBMIT_BTN_Y, { size: 56, color: '#fff', bold: true });
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.submit : C.wrong, feedback * 0.14);
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 + (mi - 1) * 52, 218, 18, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.onHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.2); newRound(); });
})(game);
