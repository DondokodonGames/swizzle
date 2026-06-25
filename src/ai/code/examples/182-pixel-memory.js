// 182-pixel-memory.js
// ピクセル記憶 — 4×4グリッドが一瞬光る、消えた後に同じ場所をタップする記憶ゲーム
// 操作: タップでグリッドを選択
// 成功: 8ラウンド全部正解  失敗: 3回ミス

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#08050f',
    grid:   '#0f0a1a',
    lit:    '#a855f7',
    litHi:  '#d8b4fe',
    sel:    '#22c55e',
    selHi:  '#86efac',
    wrong:  '#ef4444',
    ui:     '#334155'
  };

  var COLS = 4;
  var ROWS = 4;
  var CELL = 200;
  var GAP = 12;
  var GW = COLS * CELL + (COLS - 1) * GAP;
  var GH = ROWS * CELL + (ROWS - 1) * GAP;
  var GX = (W - GW) / 2;
  var GY = H * 0.25;

  var round = 0;
  var NEEDED = 8;
  var misses = 0;
  var MAX_MISSES = 3;
  var done = false;

  var phase = 'show'; // 'show' | 'input'
  var showTimer = 0;
  var SHOW_TIME = 1.2;
  var litCells = [];
  var selected = [];
  var feedback = 0;
  var feedbackOk = false;
  var timeLeft = 40;
  var elapsed = 0;

  function newRound() {
    round++;
    var count = Math.min(2 + Math.floor(round / 2), 6);
    litCells = [];
    var used = {};
    while (litCells.length < count) {
      var idx = Math.floor(Math.random() * 16);
      if (!used[idx]) { used[idx] = true; litCells.push(idx); }
    }
    selected = [];
    phase = 'show';
    showTimer = SHOW_TIME;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'input') return;
    var col = Math.floor((tx - GX) / (CELL + GAP));
    var row = Math.floor((ty - GY) / (CELL + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    var idx = row * COLS + col;
    if (selected.indexOf(idx) >= 0) return;
    selected.push(idx);
    if (litCells.indexOf(idx) >= 0) {
      feedbackOk = true; feedback = 0.3;
      game.audio.play('se_tap', 0.4);
      if (selected.length === litCells.length) {
        game.audio.play('se_success', 0.8);
        if (round >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(round * 120 + Math.ceil(timeLeft) * 30); }, 400);
        } else {
          setTimeout(newRound, 600);
        }
      }
    } else {
      misses++;
      feedbackOk = false; feedback = 0.5;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISSES && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      } else {
        setTimeout(newRound, 800);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) phase = 'input';
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid cells
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var idx = r * COLS + c;
        var cx = GX + c * (CELL + GAP);
        var cy = GY + r * (CELL + GAP);
        var isLit = litCells.indexOf(idx) >= 0;
        var isSel = selected.indexOf(idx) >= 0;

        game.draw.rect(cx, cy, CELL, CELL, C.grid, 0.9);

        if (phase === 'show' && isLit) {
          game.draw.rect(cx, cy, CELL, CELL, C.lit, 0.9);
          game.draw.rect(cx + 8, cy + 8, CELL - 16, 24, C.litHi, 0.4);
        } else if (phase === 'input' && isSel) {
          var ok = litCells.indexOf(idx) >= 0;
          game.draw.rect(cx, cy, CELL, CELL, ok ? C.sel : C.wrong, 0.8);
          game.draw.rect(cx + 8, cy + 8, CELL - 16, 24, ok ? C.selHi : '#fca5a5', 0.4);
        }

        // Border
        game.draw.rect(cx, cy, CELL, 4, '#1a1028', 0.5);
        game.draw.rect(cx, cy + CELL - 4, CELL, 4, C.litHi, 0.15);
      }
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.sel : C.wrong, feedback * 0.1);
    }

    var phaseText = phase === 'show' ? '覚えて！' : 'タップ！';
    game.draw.text(phaseText, W / 2, GY - 60, { size: 52, color: phase === 'show' ? C.litHi : C.selHi, bold: true });
    game.draw.text('ラウンド ' + round + ' / ' + NEEDED, W / 2, GY - 110, { size: 36, color: C.ui });

    if (phase === 'input') {
      game.draw.text(selected.length + ' / ' + litCells.length, W / 2, GY + GH + 60, { size: 48, color: '#f1f5f9', bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISSES; mi++) {
      game.draw.circle(W / 2 + (mi - 1) * 56, GY + GH + 120, 20, mi < misses ? C.wrong : '#1a1028');
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.lit : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    newRound();
  });
})(game);
