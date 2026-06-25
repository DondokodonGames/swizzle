// 012-flash-recall.js
// 一瞬の記憶 — チカッと光った場所を覚えて再現する挑戦
// 操作: 光ったマスをタップして再現
// 成功: 3ラウンド完璧に  失敗: 1つ間違える or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040816',
    grid:    '#0f1f3a',
    cell:    '#0a1428',
    cellEdge:'#1e3a5f',
    flash:   '#38bdf8',
    flashHi: '#e0f2fe',
    success: '#22c55e',
    error:   '#ef4444',
    recall:  '#7c3aed',
    recallHi:'#a78bfa',
    ui:      '#475569'
  };

  var COLS = 4;
  var ROWS = 4;
  var CELL_SIZE = 200;
  var GAP = 12;
  var GRID_W = COLS * CELL_SIZE + (COLS - 1) * GAP;
  var GRID_H = ROWS * CELL_SIZE + (ROWS - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = (H - GRID_H) / 2 - 60;

  var FLASH_COUNT = 3; // cells to memorize
  var round = 0;
  var needed = 3;
  var timeLeft = 20;
  var done = false;

  var phase = 'flash'; // 'flash' | 'recall' | 'feedback'
  var flashTimer = 0;
  var FLASH_DURATION = 1.2;
  var HIDE_DURATION = 0.4;
  var feedbackTimer = 0;
  var feedbackOk = false;

  var targetCells = [];   // which cells to remember
  var tappedCells = [];   // player's picks so far
  var wrongCell = -1;

  function chooseRound() {
    // pick FLASH_COUNT unique random cells
    targetCells = [];
    var pool = [];
    for (var i = 0; i < COLS * ROWS; i++) pool.push(i);
    for (var j = 0; j < FLASH_COUNT; j++) {
      var idx = Math.floor(Math.random() * pool.length);
      targetCells.push(pool[idx]);
      pool.splice(idx, 1);
    }
    tappedCells = [];
    wrongCell = -1;
    phase = 'flash';
    flashTimer = FLASH_DURATION;
  }

  function cellRect(idx) {
    var col = idx % COLS;
    var row = Math.floor(idx / COLS);
    return {
      x: GRID_X + col * (CELL_SIZE + GAP),
      y: GRID_Y + row * (CELL_SIZE + GAP)
    };
  }

  function cellAtPos(tx, ty) {
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = cellRect(i);
      if (tx >= r.x && tx < r.x + CELL_SIZE && ty >= r.y && ty < r.y + CELL_SIZE) {
        return i;
      }
    }
    return -1;
  }

  game.onTap(function(x, y) {
    if (done || phase !== 'recall') return;
    var idx = cellAtPos(x, y);
    if (idx === -1) return;
    if (tappedCells.indexOf(idx) !== -1) return; // already tapped

    tappedCells.push(idx);
    game.audio.play('se_tap', 0.7);

    // check if correct
    var expected = targetCells[tappedCells.length - 1];
    if (idx !== expected) {
      // wrong order or wrong cell
      wrongCell = idx;
      feedbackOk = false;
      feedbackTimer = 0.8;
      phase = 'feedback';
      game.audio.play('se_failure', 0.7);
      done = true;
      setTimeout(function() { game.end.failure(); }, 900);
      return;
    }

    if (tappedCells.length >= FLASH_COUNT) {
      // round complete
      round++;
      feedbackOk = true;
      feedbackTimer = 0.7;
      phase = 'feedback';
      game.audio.play('se_success', 0.8);
      if (round >= needed) {
        done = true;
        setTimeout(function() {
          game.end.success(round * 30 + Math.ceil(timeLeft) * 5);
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

    if (phase === 'flash') {
      flashTimer -= dt;
      if (flashTimer < -HIDE_DURATION) {
        phase = 'recall';
      }
    } else if (phase === 'feedback') {
      feedbackTimer -= dt;
      if (feedbackTimer <= 0 && !done) {
        chooseRound();
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#0a1020');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#0284c7' : C.error);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // round indicators
    for (var r = 0; r < needed; r++) {
      var rx = W / 2 + (r - (needed - 1) / 2) * 80;
      game.draw.circle(rx, 128, 26, r < round ? C.success : '#0a1428');
      if (r < round) game.draw.circle(rx, 128, 16, '#ffffff80');
    }

    // phase label
    var phaseText = phase === 'flash' && flashTimer > 0 ? '覚えろ！' :
                    phase === 'flash' ? '...' :
                    phase === 'recall' ? 'どこだ？' : '';
    if (phaseText) {
      game.draw.text(phaseText, W / 2, 208, { size: 56, color: C.flash, bold: phase === 'flash' && flashTimer > 0 });
    }

    // grid cells
    var isFlashing = phase === 'flash' && flashTimer > 0;
    for (var i = 0; i < COLS * ROWS; i++) {
      var cr = cellRect(i);
      var isTarget = targetCells.indexOf(i) !== -1;
      var isTapped = tappedCells.indexOf(i) !== -1;
      var isWrong = i === wrongCell;

      // base cell
      game.draw.rect(cr.x - 4, cr.y - 4, CELL_SIZE + 8, CELL_SIZE + 8, C.cellEdge);
      game.draw.rect(cr.x, cr.y, CELL_SIZE, CELL_SIZE, C.cell);

      // flashing highlight
      if (isFlashing && isTarget) {
        var fa = Math.min(1, flashTimer / 0.3); // fade in/out
        game.draw.rect(cr.x, cr.y, CELL_SIZE, CELL_SIZE, C.flash, fa * 0.9);
        game.draw.rect(cr.x + 12, cr.y + 12, CELL_SIZE - 24, CELL_SIZE - 24, C.flashHi, fa * 0.6);
      }

      // recall tapped
      if (phase === 'recall' || phase === 'feedback') {
        if (isTapped) {
          game.draw.rect(cr.x, cr.y, CELL_SIZE, CELL_SIZE, isWrong ? C.error : C.recall, 0.9);
          game.draw.rect(cr.x + 12, cr.y + 12, CELL_SIZE - 24, CELL_SIZE - 24, isWrong ? '#fca5a5' : C.recallHi, 0.5);
        }
      }

      // feedback: reveal correct cells
      if (phase === 'feedback' && !feedbackOk) {
        if (isTarget) {
          game.draw.rect(cr.x, cr.y, CELL_SIZE, CELL_SIZE, C.flash, 0.5);
        }
      }
    }

    // tap order hints (small numbers on tapped cells)
    for (var t = 0; t < tappedCells.length; t++) {
      var tcr = cellRect(tappedCells[t]);
      game.draw.text('' + (t + 1), tcr.x + CELL_SIZE / 2, tcr.y + CELL_SIZE / 2,
        { size: 72, color: '#fff', bold: true });
    }

    // progress within round
    if (phase === 'recall') {
      game.draw.text(tappedCells.length + ' / ' + FLASH_COUNT, W / 2, GRID_Y + GRID_H + 80,
        { size: 52, color: C.recallHi, bold: true });
    }

    // guide
    game.draw.text(
      phase === 'recall' ? '順番どおりにタップ！' : '光ったマスを覚えろ！',
      W / 2, H - 180, { size: 48, color: C.ui }
    );
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    chooseRound();
  });
})(game);
