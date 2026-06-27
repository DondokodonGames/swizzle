// 654-color-flood.js
// カラーフラッド — 全マスを同じ色で染め上げろ
// 操作: タップで色を選び隣接マスを塗りつぶす
// 成功: 30手以内に全マスを単色に  失敗: 手数超過 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0c0a',
    text:    '#f1f5f9',
    ui:      '#0d100d',
    select:  '#ffffff',
    wrong:   '#ef4444',
    correct: '#22c55e'
  };

  var PALETTE = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6'];
  var ROWS = 8, COLS = 8;
  var CELL = Math.floor(Math.min(W, H * 0.55) / COLS);
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = H * 0.2;

  var grid = [];
  var currentColor = 0; // top-left flood color

  var moves = 0;
  var MAX_MOVES = 30;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0, flashCol = C.correct;

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        row.push(Math.floor(Math.random() * PALETTE.length));
      }
      grid.push(row);
    }
    currentColor = grid[0][0];
  }

  function floodFill(targetColor, newColor) {
    if (targetColor === newColor) return;
    var stack = [{r: 0, c: 0}];
    var visited = [];
    for (var r = 0; r < ROWS; r++) visited.push(new Array(COLS).fill(false));

    while (stack.length > 0) {
      var cell = stack.pop();
      var cr = cell.r, cc = cell.c;
      if (cr < 0 || cr >= ROWS || cc < 0 || cc >= COLS) continue;
      if (visited[cr][cc]) continue;
      if (grid[cr][cc] !== targetColor) continue;
      visited[cr][cc] = true;
      grid[cr][cc] = newColor;
      stack.push({r: cr-1, c: cc}, {r: cr+1, c: cc}, {r: cr, c: cc-1}, {r: cr, c: cc+1});
    }
  }

  function checkWin() {
    var col0 = grid[0][0];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c] !== col0) return false;
      }
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check palette
    var palY = GRID_Y + ROWS * CELL + 40;
    var palW = PALETTE.length * 100;
    var palX = W / 2 - palW / 2;
    if (ty >= palY && ty <= palY + 80) {
      var idx = Math.floor((tx - palX) / 100);
      if (idx >= 0 && idx < PALETTE.length) {
        var chosen = idx;
        if (chosen === currentColor) return;
        var oldColor = currentColor;
        currentColor = chosen;
        floodFill(oldColor, chosen);
        moves++;
        game.audio.play('se_tap', 0.12);

        if (checkWin()) {
          done = true;
          flashCol = C.correct;
          flashAnim = 0.4;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success((MAX_MOVES - moves + 1) * 300 + Math.ceil(timeLeft) * 100); }, 700);
        } else if (moves >= MAX_MOVES) {
          done = true;
          flashCol = C.wrong;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.5);
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
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
    if (flashAnim > 0) flashAnim -= dt * 3;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = GRID_X + c * CELL;
        var gy = GRID_Y + r * CELL;
        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, PALETTE[grid[r][c]], 0.9);
      }
    }

    // Palette
    var palY2 = GRID_Y + ROWS * CELL + 40;
    var palW2 = PALETTE.length * 100;
    var palX2 = W / 2 - palW2 / 2;
    for (var pi = 0; pi < PALETTE.length; pi++) {
      var px = palX2 + pi * 100 + 50;
      var isSelected = pi === currentColor;
      game.draw.circle(px, palY2 + 40, isSelected ? 40 : 32, PALETTE[pi], 0.9);
      if (isSelected) {
        game.draw.circle(px, palY2 + 40, 48, '#fff', 0.25);
        game.draw.text('▲', px, palY2 + 90, { size: 28, color: '#fff' });
      }
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Move count
    var moveRatio = Math.max(0, 1 - moves / MAX_MOVES);
    game.draw.rect(W / 2 - 200, H * 0.88, 400, 20, C.ui, 0.7);
    game.draw.rect(W / 2 - 200, H * 0.88, 400 * moveRatio, 20, moveRatio > 0.3 ? C.correct : C.wrong, 0.8);
    game.draw.text('残手数: ' + (MAX_MOVES - moves), W / 2, H * 0.88 + 40, { size: 36, color: C.text });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('カラーフラッド', W / 2, 80, { size: 32, color: '#ffffff55' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    initGrid();
  });
})(game);
