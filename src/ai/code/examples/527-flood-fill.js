// 527-flood-fill.js
// フラッドフィル — タップした色で広がる洪水を制御して全マスを塗る
// 操作: 下のパレットから色を選んでタップ、左上から色が広がる
// 成功: 25手以内に全マス同色  失敗: 手数超過 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:   '#05050a',
    text: '#f1f5f9',
    ui:   '#374151',
    correct: '#22c55e',
    wrong:   '#ef4444'
  };

  var PALETTE = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'];
  var GRID_SIZE = 8;
  var CELL = 112;
  var OX = (W - GRID_SIZE * CELL) / 2;
  var OY = H * 0.2;
  var MAX_MOVES = 25;

  var grid = [];
  var moves = 0;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var lastMoveAnim = 0;

  function initGrid() {
    grid = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      grid[r] = [];
      for (var c = 0; c < GRID_SIZE; c++) {
        grid[r][c] = Math.floor(Math.random() * PALETTE.length);
      }
    }
  }

  function floodFill(newColor) {
    var oldColor = grid[0][0];
    if (oldColor === newColor) return;

    var queue = [{ r: 0, c: 0 }];
    var visited = {};
    visited['0,0'] = true;

    while (queue.length > 0) {
      var cell = queue.shift();
      grid[cell.r][cell.c] = newColor;
      var neighbors = [
        { r: cell.r - 1, c: cell.c }, { r: cell.r + 1, c: cell.c },
        { r: cell.r, c: cell.c - 1 }, { r: cell.r, c: cell.c + 1 }
      ];
      for (var ni = 0; ni < neighbors.length; ni++) {
        var n = neighbors[ni];
        var key = n.r + ',' + n.c;
        if (n.r >= 0 && n.r < GRID_SIZE && n.c >= 0 && n.c < GRID_SIZE && !visited[key] && grid[n.r][n.c] === oldColor) {
          visited[key] = true;
          queue.push(n);
        }
      }
    }
  }

  function isAllSame() {
    var first = grid[0][0];
    for (var r = 0; r < GRID_SIZE; r++)
      for (var c = 0; c < GRID_SIZE; c++)
        if (grid[r][c] !== first) return false;
    return true;
  }

  var PALETTE_Y = H * 0.8;
  var PAL_SIZE = 120;
  var PAL_GAP = 20;
  var PAL_OX = (W - (PALETTE.length * (PAL_SIZE + PAL_GAP) - PAL_GAP)) / 2;

  game.onTap(function(tx, ty) {
    if (done) return;
    // Palette buttons
    for (var i = 0; i < PALETTE.length; i++) {
      var px = PAL_OX + i * (PAL_SIZE + PAL_GAP);
      if (tx >= px && tx <= px + PAL_SIZE && ty >= PALETTE_Y && ty <= PALETTE_Y + PAL_SIZE) {
        moves++;
        lastMoveAnim = 0.4;
        floodFill(i);
        game.audio.play('se_tap', 0.3);

        if (isAllSame()) {
          flashCol = C.correct;
          flashAnim = 0.6;
          game.audio.play('se_success', 0.9);
          done = true;
          var bonus = Math.max(0, MAX_MOVES - moves);
          setTimeout(function() { game.end.success(bonus * 400 + Math.ceil(timeLeft) * 100); }, 700);
        } else if (moves >= MAX_MOVES) {
          flashCol = C.wrong;
          flashAnim = 0.6;
          game.audio.play('se_failure', 0.6);
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
        return;
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
    if (lastMoveAnim > 0) lastMoveAnim -= dt * 3;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var cx = OX + c * CELL + 4;
        var cy = OY + r * CELL + 4;
        game.draw.rect(cx, cy, CELL - 8, CELL - 8, PALETTE[grid[r][c]], 0.9);
        if (r === 0 && c === 0) {
          game.draw.rect(cx, cy, CELL - 8, CELL - 8, '#fff', 0.15);
        }
      }
    }

    // Palette
    for (var i = 0; i < PALETTE.length; i++) {
      var px = PAL_OX + i * (PAL_SIZE + PAL_GAP);
      var isCurrent = (i === grid[0][0]);
      game.draw.rect(px + 4, PALETTE_Y + 4, PAL_SIZE - 8, PAL_SIZE - 8, PALETTE[i], 0.9);
      if (isCurrent) {
        game.draw.rect(px, PALETTE_Y, PAL_SIZE, PAL_SIZE, '#fff', 0.2);
        game.draw.rect(px + 4, PALETTE_Y + 4, PAL_SIZE - 8, 10, '#fff', 0.4);
      }
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Move counter
    var movesLeft = MAX_MOVES - moves;
    var moveCol = movesLeft <= 5 ? C.wrong : movesLeft <= 10 ? '#f59e0b' : C.text;
    game.draw.text('残り ' + movesLeft + '手', W / 2, OY + GRID_SIZE * CELL + 60, { size: 56, color: moveCol, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#3b82f6' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text(moves + ' / ' + MAX_MOVES + '手', W / 2, 148, { size: 52, color: C.text, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initGrid();
  });
})(game);
