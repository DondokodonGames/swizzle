// 241-dodge-spike.js
// ドッジスパイク — 床から生える棘を素早く認識して踏まずに渡る瞬発力
// 操作: タップで安全なマスに飛び移る
// 成功: 30マス渡る  失敗: 棘を踏む or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04060a',
    floor:  '#1e293b',
    flrHi:  '#334155',
    safe:   '#22c55e',
    safeHi: '#86efac',
    spike:  '#ef4444',
    spkHi:  '#fca5a5',
    player: '#f59e0b',
    plrHi:  '#fde68a',
    ui:     '#475569'
  };

  var COLS = 4;
  var CELL = Math.floor(W / COLS);
  var ROW_H = 160;
  var VISIBLE_ROWS = Math.ceil(H / ROW_H) + 2;

  var playerCol = 1;
  var playerRow = 0; // player's row position
  var playerPY = H * 0.75; // y pixel of player
  var scrollOffset = 0; // how many pixels scrolled
  var scrollSpeed = 120;
  var distance = 0;
  var NEEDED = 30;

  var rows = []; // each row: [0=safe, 1=spike, ...] for each column
  var nextRowDist = 0;

  var done = false;
  var timeLeft = 25;
  var elapsed = 0;
  var jumpAnim = 0; // 0–1
  var jumpFrom = playerCol;
  var jumping = false;
  var bounceY = 0; // vertical bounce offset

  function generateRow() {
    var spikes = Math.floor(Math.random() * (COLS - 1)); // at most 3 spikes, always at least 1 safe
    var row = [0, 0, 0, 0];
    var positions = [0, 1, 2, 3];
    // Shuffle positions and place spikes
    for (var i = positions.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = positions[i]; positions[i] = positions[j]; positions[j] = tmp;
    }
    for (var k = 0; k < spikes; k++) {
      row[positions[k]] = 1;
    }
    return row;
  }

  function initRows() {
    rows = [];
    for (var i = 0; i < VISIBLE_ROWS + 4; i++) {
      if (i < 3) rows.push([0, 0, 0, 0]); // safe start
      else rows.push(generateRow());
    }
  }

  game.onTap(function(tx, ty) {
    if (done || jumping) return;
    var col = Math.floor(tx / CELL);
    if (col === playerCol) return; // same column
    if (col < 0 || col >= COLS) return;

    // Check target row (row in front, i.e., the next visible row ahead)
    var nextRowIdx = 1; // the row just ahead of player
    if (rows[nextRowIdx] && rows[nextRowIdx][col] === 1) {
      // Spike!
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
      return;
    }

    jumpFrom = playerCol;
    playerCol = col;
    jumping = true;
    jumpAnim = 0;
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (jumping) {
      jumpAnim += dt * 5;
      if (jumpAnim >= 1) {
        jumpAnim = 1;
        jumping = false;
      }
      bounceY = -Math.sin(jumpAnim * Math.PI) * 40;
    } else {
      bounceY = 0;
    }

    // Scroll
    scrollOffset += scrollSpeed * dt;
    distance += scrollSpeed * dt / 40;

    if (distance >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.ceil(distance) * 50 + Math.ceil(timeLeft) * 60); }, 400);
    }

    // Add new rows as we scroll
    var rowsNeeded = Math.ceil(scrollOffset / ROW_H) + VISIBLE_ROWS + 2;
    while (rows.length < rowsNeeded) {
      rows.push(generateRow());
    }

    // Check if player stepped on spike (auto-advance check)
    var baseRowOffset = Math.floor(scrollOffset / ROW_H);
    var currentRowIdx = baseRowOffset + 1; // player is on this row
    if (currentRowIdx < rows.length && rows[currentRowIdx][playerCol] === 1 && !done) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Draw rows
    var rowOffset = scrollOffset % ROW_H;
    for (var ri = -1; ri < VISIBLE_ROWS + 1; ri++) {
      var rowIdx = Math.floor(scrollOffset / ROW_H) + ri;
      var ry = H * 0.85 - ri * ROW_H + rowOffset;

      if (rowIdx < 0 || rowIdx >= rows.length) continue;
      var row = rows[rowIdx];
      var isPlayerRow = (rowIdx === Math.floor(scrollOffset / ROW_H) + 1);

      for (var ci = 0; ci < COLS; ci++) {
        var gx = ci * CELL;
        var isSpike = row[ci] === 1;

        game.draw.rect(gx + 3, ry, CELL - 6, ROW_H - 4, isSpike ? '#1a0a0a' : C.floor, 0.8);
        game.draw.rect(gx + 3, ry, CELL - 6, 8, isSpike ? C.spkHi : C.flrHi, 0.4);

        if (isSpike) {
          // Draw spike
          var sx = gx + CELL / 2, sy = ry + ROW_H / 2;
          game.draw.line(sx, sy + 30, sx, sy - 30, C.spike, 8);
          game.draw.line(sx - 20, sy + 30, sx, sy - 30, C.spike, 5);
          game.draw.line(sx + 20, sy + 30, sx, sy - 30, C.spike, 5);
          game.draw.circle(sx, sy - 30, 8, C.spkHi, 0.8);
        } else if (isPlayerRow && ci === playerCol) {
          // Player here
        } else if (!isSpike) {
          game.draw.rect(gx + CELL / 2 - 20, ry + ROW_H - 10, 40, 6, C.safeHi, 0.3);
        }
      }
    }

    // Player (fixed position)
    var px = playerCol * CELL + CELL / 2;
    if (jumping) {
      var lerpX = (jumpFrom * CELL + CELL / 2) + (px - (jumpFrom * CELL + CELL / 2)) * jumpAnim;
      px = lerpX;
    }
    var py = H * 0.68 + bounceY;
    game.draw.circle(px, py, 30 + 8, C.plrHi, 0.3);
    game.draw.circle(px, py, 30, C.player, 0.9);
    game.draw.circle(px - 8, py - 8, 10, '#fff', 0.4);

    // Distance bar
    var distRatio = Math.min(1, distance / NEEDED);
    game.draw.rect(0, H * 0.91, W, 16, C.ui, 0.3);
    game.draw.rect(0, H * 0.91, W * distRatio, 16, C.safe, 0.85);
    game.draw.text(Math.floor(distance) + ' / ' + Math.floor(NEEDED) + ' マス', W / 2, H * 0.95, { size: 44, color: '#f1f5f9', bold: true });
    game.draw.text('安全なマスをタップ！', W / 2, H * 0.98, { size: 32, color: C.ui });

    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.safe : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initRows();
  });
})(game);
