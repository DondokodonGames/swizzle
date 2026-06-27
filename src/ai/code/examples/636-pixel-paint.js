// 636-pixel-paint.js
// ピクセルペイント — お題の絵をドット絵で再現しろ、時間内に
// 操作: タップでセルを塗る/消す、スワイプで色を変更
// 成功: 80%一致  失敗: 時間切れ or 3回チェックで50%未満

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0c10',
    grid:    '#1a1a2e',
    cursor:  '#ffffff',
    text:    '#f1f5f9',
    ui:      '#0a0a18',
    correct: '#22c55e',
    wrong:   '#ef4444',
    match:   '#fbbf24'
  };

  var PALETTE = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#ffffff'];
  var COLS = 10, ROWS = 12;
  var CELL_W = Math.floor(W / COLS);
  var CELL_H = Math.floor((H * 0.7) / ROWS);
  var GRID_Y = H * 0.18;

  var colorIdx = 0;
  var playerGrid = [];
  var targetGrid = [];
  for (var r = 0; r < ROWS; r++) {
    playerGrid.push(new Array(COLS).fill(0));   // 0 = empty, 1-8 = color idx+1
    targetGrid.push(new Array(COLS).fill(0));
  }

  // Simple pixel art patterns (heart, star, house, etc.)
  var patterns = [
    // Heart
    [[0,0,1,1,0,0,1,1,0,0],
     [0,1,1,1,1,1,1,1,1,0],
     [1,1,1,1,1,1,1,1,1,1],
     [1,1,1,1,1,1,1,1,1,1],
     [0,1,1,1,1,1,1,1,1,0],
     [0,0,1,1,1,1,1,1,0,0],
     [0,0,0,1,1,1,1,0,0,0],
     [0,0,0,0,1,1,0,0,0,0],
     [0,0,0,0,0,0,0,0,0,0],
     [0,0,0,0,0,0,0,0,0,0],
     [0,0,0,0,0,0,0,0,0,0],
     [0,0,0,0,0,0,0,0,0,0]],
    // Star
    [[0,0,0,0,1,1,0,0,0,0],
     [0,0,0,1,1,1,1,0,0,0],
     [1,1,1,1,1,1,1,1,1,1],
     [0,1,1,1,1,1,1,1,1,0],
     [0,0,1,1,1,1,1,1,0,0],
     [0,1,1,0,1,1,0,1,1,0],
     [1,1,0,0,1,1,0,0,1,1],
     [1,0,0,0,0,0,0,0,0,1],
     [0,0,0,0,0,0,0,0,0,0],
     [0,0,0,0,0,0,0,0,0,0],
     [0,0,0,0,0,0,0,0,0,0],
     [0,0,0,0,0,0,0,0,0,0]],
    // Arrow
    [[0,0,0,0,1,1,0,0,0,0],
     [0,0,0,1,1,1,1,0,0,0],
     [0,0,1,1,1,1,1,1,0,0],
     [0,1,1,1,1,1,1,1,1,0],
     [0,0,0,1,1,1,1,0,0,0],
     [0,0,0,1,1,1,1,0,0,0],
     [0,0,0,1,1,1,1,0,0,0],
     [0,0,0,1,1,1,1,0,0,0],
     [0,0,0,1,1,1,1,0,0,0],
     [0,0,0,0,0,0,0,0,0,0],
     [0,0,0,0,0,0,0,0,0,0],
     [0,0,0,0,0,0,0,0,0,0]]
  ];

  var patternIdx = 0;
  var targetColor = 1; // color index 1 for the target cells

  function loadPattern() {
    patternIdx = Math.floor(Math.random() * patterns.length);
    targetColor = Math.floor(Math.random() * PALETTE.length) + 1;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        targetGrid[r][c] = patterns[patternIdx][r] ? (patterns[patternIdx][r][c] ? targetColor : 0) : 0;
        playerGrid[r][c] = 0;
      }
    }
  }

  function calcMatch() {
    var total = 0, matched = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        total++;
        var tv = targetGrid[r][c] > 0 ? 1 : 0;
        var pv = playerGrid[r][c] > 0 ? 1 : 0;
        if (tv === pv) matched++;
      }
    }
    return matched / total;
  }

  var checks = 0;
  var MAX_CHECKS = 3;
  var matchPercent = 0;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var resultText = '';
  var resultTimer = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check if on grid
    var col = Math.floor(tx / CELL_W);
    var row = Math.floor((ty - GRID_Y) / CELL_H);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS && ty >= GRID_Y) {
      // Toggle cell
      if (playerGrid[row][col] > 0) {
        playerGrid[row][col] = 0;
      } else {
        playerGrid[row][col] = colorIdx + 1;
      }
      game.audio.play('se_tap', 0.08);
    } else if (ty > GRID_Y + ROWS * CELL_H + 20 && ty < GRID_Y + ROWS * CELL_H + 100) {
      // Check button
      matchPercent = calcMatch();
      checks++;
      if (matchPercent >= 0.8) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.floor(matchPercent * 1000) + Math.ceil(timeLeft) * 50); }, 700);
      } else {
        resultText = Math.floor(matchPercent * 100) + '% — もう一度！';
        resultTimer = 1.5;
        game.audio.play('se_failure', 0.3);
        if (checks >= MAX_CHECKS && matchPercent < 0.5) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'right') colorIdx = (colorIdx + 1) % PALETTE.length;
    if (dir === 'left') colorIdx = (colorIdx - 1 + PALETTE.length) % PALETTE.length;
    game.audio.play('se_tap', 0.1);
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
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target preview (small, top right)
    var PW = 160, PH = Math.floor(PW * ROWS / COLS);
    var PX = W - PW - 20, PY = 88;
    game.draw.rect(PX - 4, PY - 4, PW + 8, PH + 8, '#222', 0.8);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (targetGrid[r][c] > 0) {
          var col2 = PALETTE[targetGrid[r][c] - 1];
          game.draw.rect(PX + c * (PW / COLS), PY + r * (PH / ROWS), Math.ceil(PW / COLS), Math.ceil(PH / ROWS), col2, 0.9);
        }
      }
    }
    game.draw.text('お題', PX + PW / 2, PY - 16, { size: 24, color: C.match });

    // Player grid
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var gx = c2 * CELL_W, gy = GRID_Y + r2 * CELL_H;
        game.draw.rect(gx + 1, gy + 1, CELL_W - 2, CELL_H - 2, C.grid, 0.5);
        if (playerGrid[r2][c2] > 0) {
          game.draw.rect(gx + 2, gy + 2, CELL_W - 4, CELL_H - 4, PALETTE[playerGrid[r2][c2] - 1], 0.95);
        }
      }
    }

    // Palette bar
    var palY = GRID_Y + ROWS * CELL_H + 20;
    for (var pi = 0; pi < PALETTE.length; pi++) {
      var px = pi * (W / PALETTE.length) + (W / PALETTE.length) / 2;
      game.draw.circle(px, palY + 30, pi === colorIdx ? 34 : 26, PALETTE[pi], 0.9);
      if (pi === colorIdx) {
        game.draw.circle(px, palY + 30, 40, '#fff', 0.3);
        game.draw.text('▲', px, palY + 74, { size: 28, color: '#fff' });
      }
    }

    // Check button
    var btnY = palY + 100;
    game.draw.rect(W / 2 - 160, btnY, 320, 68, C.match, 0.7);
    game.draw.text('チェック (' + (MAX_CHECKS - checks) + '回残)', W / 2, btnY + 40, { size: 32, color: '#000', bold: true });

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, btnY + 100, { size: 40, color: C.wrong, bold: true });
    }

    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.match : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('← 色変更 →', 140, 56, { size: 30, color: '#ffffff55' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    loadPattern();
  });
})(game);
