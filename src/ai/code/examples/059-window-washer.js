// 059-window-washer.js
// ウィンドウウォッシャー — 汚れた窓をスワイプで拭いてピカピカにする清掃ゲーム
// 操作: スワイプで汚れを拭く
// 成功: 90%以上クリーン  失敗: 25秒で制限

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0c1420',
    window:   '#1e3a5f',
    glass:    '#1a4a6e',
    dirt:     '#3d2a1a',
    dirtHi:   '#6b4226',
    clean:    '#0ea5e9',
    cleanHi:  '#7dd3fc',
    frame:    '#92400e',
    frameHi:  '#d97706',
    ui:       '#475569'
  };

  var COLS = 10;
  var ROWS = 14;
  var CELL = 84;
  var WIN_X = (W - COLS * CELL) / 2;
  var WIN_Y = H * 0.17;

  // Grid: 0=dirty, 1=clean
  var grid = [];
  var totalDirty = 0;
  var cleanCount = 0;
  var timeLeft = 25;
  var done = false;
  var WIN_THRESHOLD = 0.90;

  // Swipe wash: track swipe to clean cells along path
  var isWiping = false;
  var lastWipeCell = -1;

  function initGrid() {
    grid = [];
    totalDirty = 0;
    cleanCount = 0;
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        var dirty = Math.random() < 0.85;
        row.push(dirty ? 0 : 1);
        if (dirty) totalDirty++;
        else cleanCount++;
      }
      grid.push(row);
    }
  }

  function posToCell(x, y) {
    var c = Math.floor((x - WIN_X) / CELL);
    var r = Math.floor((y - WIN_Y) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
    return r * COLS + c;
  }

  function wipeCell(idx) {
    if (idx < 0 || idx === lastWipeCell) return;
    var r = Math.floor(idx / COLS);
    var c = idx % COLS;
    if (grid[r][c] === 0) {
      grid[r][c] = 1;
      cleanCount++;
      game.audio.play('se_tap', 0.2);
    }
    lastWipeCell = idx;
  }

  game.onSwipe(function(dir) {
    // Swipe is handled via onUpdate tracking — this is supplementary
  });

  game.onHold(function(x, y, dur) {
    if (done) return;
    var idx = posToCell(x, y);
    wipeCell(idx);
  });

  game.onTap(function(x, y) {
    if (done) return;
    var idx = posToCell(x, y);
    wipeCell(idx);
    lastWipeCell = -1; // reset so same cell can be re-wiped after tap
  });

  var lastPos = null;

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        var ratio2 = cleanCount / (COLS * ROWS);
        if (ratio2 >= WIN_THRESHOLD) {
          game.audio.play('se_success');
          game.end.success(Math.floor(ratio2 * 200));
        } else {
          game.audio.play('se_failure');
          game.end.failure();
        }
        return;
      }
    }

    var ratio = cleanCount / (COLS * ROWS);
    if (ratio >= WIN_THRESHOLD && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.floor(ratio * 200) + Math.ceil(timeLeft) * 5); }, 300);
      return;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Window frame
    var frameX = WIN_X - 24;
    var frameY = WIN_Y - 24;
    var frameW = COLS * CELL + 48;
    var frameH = ROWS * CELL + 48;
    game.draw.rect(frameX, frameY, frameW, frameH, C.frame);
    game.draw.rect(frameX + 8, frameY + 8, frameW - 16, 16, C.frameHi, 0.4);
    // Cross bars
    game.draw.rect(frameX, WIN_Y + ROWS * CELL / 2 - 8, frameW, 16, C.frame);
    game.draw.rect(WIN_X + COLS * CELL / 2 - 8, frameY, 16, frameH, C.frame);

    // Grid cells
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = WIN_X + c * CELL;
        var gy = WIN_Y + r * CELL;
        if (grid[r][c] === 0) {
          // Dirty
          game.draw.rect(gx, gy, CELL, CELL, C.dirt);
          // Dirt texture spots
          if ((r + c) % 3 === 0) {
            game.draw.circle(gx + CELL * 0.6, gy + CELL * 0.4, 12, C.dirtHi, 0.6);
          }
        } else {
          // Clean
          game.draw.rect(gx, gy, CELL, CELL, C.glass);
          // Glass sheen
          if ((r + c) % 4 === 0) {
            game.draw.rect(gx + 8, gy + 8, 16, CELL * 0.4, '#fff', 0.08);
          }
        }
      }
    }

    // Squeegee at last wiped position
    if (lastWipeCell >= 0) {
      var lr = Math.floor(lastWipeCell / COLS);
      var lc = lastWipeCell % COLS;
      var lx = WIN_X + lc * CELL + CELL / 2;
      var ly = WIN_Y + lr * CELL + CELL / 2;
      game.draw.circle(lx, ly, 40, C.clean, 0.4);
      game.draw.circle(lx, ly, 28, C.cleanHi, 0.6);
    }

    // Cleanliness bar
    game.draw.rect(WIN_X, WIN_Y + ROWS * CELL + 40, COLS * CELL, 40, '#0a1428');
    game.draw.rect(WIN_X, WIN_Y + ROWS * CELL + 40, COLS * CELL * ratio, 40, ratio >= WIN_THRESHOLD ? C.clean : C.cleanHi);
    game.draw.text(Math.floor(ratio * 100) + '%', W / 2, WIN_Y + ROWS * CELL + 110, { size: 48, color: C.cleanHi, bold: true });

    // Threshold marker
    var threshX = WIN_X + COLS * CELL * WIN_THRESHOLD;
    game.draw.line(threshX, WIN_Y + ROWS * CELL + 32, threshX, WIN_Y + ROWS * CELL + 56, '#22c55e', 4);

    // Timer bar
    var tRatio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#0c1420');
    game.draw.rect(0, 0, W * tRatio, 72, tRatio > 0.3 ? C.window : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('スワイプで拭いて90%クリアへ！', W / 2, H - 200, { size: 44, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initGrid();
  });
})(game);
