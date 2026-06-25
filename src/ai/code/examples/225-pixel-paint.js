// 225-pixel-paint.js
// ピクセルペイント — お手本のドット絵を素早く再現する速描きパズル
// 操作: タップでドットを塗る（お手本と違う色はNG）
// 成功: お手本と一致  失敗: 10か所間違える or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a0f',
    grid:   '#1e293b',
    wrong:  '#ef4444',
    correct:'#22c55e',
    ui:     '#475569'
  };

  var GRID_SIZE = 7; // 7x7 grid
  var CELL = Math.floor(W * 0.8 / GRID_SIZE);
  var OX = Math.floor((W - GRID_SIZE * CELL) / 2);
  var OY = Math.floor(H * 0.28);

  // Template patterns (pixel art icons in 7×7)
  var TEMPLATES = [
    // Heart
    [0,1,1,0,1,1,0,
     1,1,1,1,1,1,1,
     1,1,1,1,1,1,1,
     0,1,1,1,1,1,0,
     0,0,1,1,1,0,0,
     0,0,0,1,0,0,0,
     0,0,0,0,0,0,0],
    // Star
    [0,0,1,1,1,0,0,
     0,1,1,1,1,1,0,
     1,1,1,1,1,1,1,
     0,1,1,1,1,1,0,
     1,1,0,1,0,1,1,
     1,0,0,1,0,0,1,
     0,0,0,0,0,0,0],
    // Arrow up
    [0,0,0,1,0,0,0,
     0,0,1,1,1,0,0,
     0,1,1,1,1,1,0,
     1,1,1,1,1,1,1,
     0,0,0,1,0,0,0,
     0,0,0,1,0,0,0,
     0,0,0,1,0,0,0]
  ];

  var PALETTE = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'];

  var templateIdx = Math.floor(Math.random() * TEMPLATES.length);
  var template = TEMPLATES[templateIdx];
  var paintColor = PALETTE[Math.floor(Math.random() * PALETTE.length)];

  var playerGrid = new Array(GRID_SIZE * GRID_SIZE).fill(0); // 0=empty, 1=painted
  var wrongs = 0;
  var MAX_WRONG = 10;
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var feedback = 0;
  var feedbackOk = false;

  function isComplete() {
    for (var i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      if (template[i] === 1 && playerGrid[i] === 0) return false;
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) return;
    var idx = row * GRID_SIZE + col;
    if (playerGrid[idx] === 1) return; // already painted

    if (template[idx] === 1) {
      // Correct paint
      playerGrid[idx] = 1;
      feedbackOk = true; feedback = 0.15;
      game.audio.play('se_tap', 0.3);
      if (isComplete() && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 100 + 500); }, 400);
      }
    } else {
      // Wrong cell
      wrongs++;
      playerGrid[idx] = 2; // mark wrong
      feedbackOk = false; feedback = 0.3;
      game.audio.play('se_failure', 0.3);
      setTimeout(function() { playerGrid[idx] = 0; }, 500);
      if (wrongs >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
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

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Template preview (small, top)
    var previewCell = 30;
    var previewOX = W / 2 - (GRID_SIZE * previewCell) / 2;
    var previewOY = H * 0.08;
    game.draw.text('お手本', W / 2, previewOY - 24, { size: 36, color: C.ui });
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var idx2 = r * GRID_SIZE + c;
        if (template[idx2] === 1) {
          game.draw.rect(previewOX + c * previewCell + 1, previewOY + r * previewCell + 1, previewCell - 2, previewCell - 2, paintColor, 0.9);
        } else {
          game.draw.rect(previewOX + c * previewCell + 1, previewOY + r * previewCell + 1, previewCell - 2, previewCell - 2, C.grid, 0.3);
        }
      }
    }

    // Player grid
    for (var r2 = 0; r2 < GRID_SIZE; r2++) {
      for (var c2 = 0; c2 < GRID_SIZE; c2++) {
        var idx3 = r2 * GRID_SIZE + c2;
        var gx = OX + c2 * CELL;
        var gy = OY + r2 * CELL;

        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.grid, 0.35);

        if (playerGrid[idx3] === 1) {
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, paintColor, 0.9);
          game.draw.rect(gx + 2, gy + 2, CELL - 4, 6, '#fff', 0.2);
        } else if (playerGrid[idx3] === 2) {
          // Wrong flash
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.wrong, 0.7);
          game.draw.text('✕', gx + CELL / 2, gy + CELL / 2, { size: 32, color: '#fff', bold: true });
        }
      }
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? '#22c55e' : '#ef4444', feedback * 0.1);
    }

    // Wrong counter
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 22 + wi * 44, H * 0.88, 14, wi < wrongs ? C.wrong : '#1a1a2e');
    }

    // Completion progress
    var filled = 0;
    var total = 0;
    for (var i2 = 0; i2 < GRID_SIZE * GRID_SIZE; i2++) {
      if (template[i2] === 1) {
        total++;
        if (playerGrid[i2] === 1) filled++;
      }
    }
    game.draw.text(filled + ' / ' + total, W / 2, H * 0.93, { size: 48, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
  });
})(game);
