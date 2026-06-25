// 233-tile-switch.js
// タイルスイッチ — 迫りくる列車の前にタイルを切り替えてルートを作るパズル
// 操作: タップでタイルの向きを切り替え（縦↔横の線路）
// 成功: 列車をゴールまで誘導  失敗: 列車が脱線 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a0f',
    rail:   '#64748b',
    railHi: '#94a3b8',
    tileH:  '#1e293b',   // horizontal tile
    tileV:  '#162032',   // vertical tile
    train:  '#ef4444',
    trainHi:'#fca5a5',
    goal:   '#22c55e',
    goalHi: '#86efac',
    ui:     '#475569'
  };

  var COLS = 7;
  var ROWS = 9;
  var CELL = Math.floor((W - 40) / COLS);
  var OX = 20;
  var OY = H * 0.1;

  // Tiles: 'H'=horizontal, 'V'=vertical, 'GOAL'=destination, 'WALL'=blocked
  var tiles = [];

  // Train
  var trainX = 0; // in tile coordinates
  var trainY = 0;
  var trainDir = 'right'; // direction of travel
  var trainPX = 0, trainPY = 0; // pixel position
  var trainTargetX, trainTargetY;
  var trainSpeed = 250; // px/s
  var trainMoving = false;
  var trainTimer = 0; // timer between moves
  var MOVE_DELAY = 0.4;

  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var trainFlash = 0;

  function initLevel() {
    tiles = [];
    for (var r = 0; r < ROWS; r++) {
      tiles[r] = [];
      for (var c = 0; c < COLS; c++) {
        // Walls on border, random H/V inside
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          tiles[r][c] = 'WALL';
        } else {
          tiles[r][c] = Math.random() < 0.5 ? 'H' : 'V';
        }
      }
    }
    // Goal at right side middle
    var goalRow = Math.floor(ROWS / 2);
    tiles[goalRow][COLS - 1] = 'GOAL';

    // Train starts at left middle
    trainX = 0;
    trainY = goalRow;
    trainDir = 'right';

    // Ensure entry tile is H
    tiles[goalRow][1] = 'H';

    trainPX = OX + trainX * CELL + CELL / 2;
    trainPY = OY + trainY * CELL + CELL / 2;
    setTrainTarget();
  }

  function setTrainTarget() {
    var dx = trainDir === 'right' ? 1 : trainDir === 'left' ? -1 : 0;
    var dy = trainDir === 'down' ? 1 : trainDir === 'up' ? -1 : 0;
    trainTargetX = OX + (trainX + dx) * CELL + CELL / 2;
    trainTargetY = OY + (trainY + dy) * CELL + CELL / 2;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var c = Math.floor((tx - OX) / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (c < 1 || c >= COLS - 1 || r < 1 || r >= ROWS - 1) return;
    if (tiles[r][c] === 'WALL' || tiles[r][c] === 'GOAL') return;
    tiles[r][c] = tiles[r][c] === 'H' ? 'V' : 'H';
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    trainFlash = Math.max(0, trainFlash - dt * 3);

    // Move train toward target
    var dx = trainTargetX - trainPX;
    var dy = trainTargetY - trainPY;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < trainSpeed * dt) {
      // Reached target tile
      var ndx = trainDir === 'right' ? 1 : trainDir === 'left' ? -1 : 0;
      var ndy = trainDir === 'down' ? 1 : trainDir === 'up' ? -1 : 0;
      trainX += ndx;
      trainY += ndy;
      trainPX = OX + trainX * CELL + CELL / 2;
      trainPY = OY + trainY * CELL + CELL / 2;

      // Check current tile
      var tile = tiles[trainY] ? tiles[trainY][trainX] : 'WALL';
      if (tile === 'GOAL') {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 150 + 800); }, 400);
        return;
      }
      if (tile === 'WALL' || !tile) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }

      // Determine new direction
      if (tile === 'H') {
        // Can only go left/right; if coming from up/down, derail
        if (trainDir === 'up' || trainDir === 'down') {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
        // Keep direction
      } else if (tile === 'V') {
        // Can only go up/down; if coming from left/right, derail
        if (trainDir === 'left' || trainDir === 'right') {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }

      setTrainTarget();
      trainFlash = 0.3;
      game.audio.play('se_tap', 0.2);
    } else {
      trainPX += (dx / dist) * trainSpeed * dt;
      trainPY += (dy / dist) * trainSpeed * dt;
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Tiles
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = OX + c * CELL;
        var gy = OY + r * CELL;
        var tile = tiles[r][c];

        if (tile === 'WALL') {
          game.draw.rect(gx, gy, CELL, CELL, '#0f172a', 0.8);
        } else if (tile === 'GOAL') {
          var gPulse = 0.4 + 0.4 * Math.abs(Math.sin(elapsed * 3));
          game.draw.rect(gx, gy, CELL, CELL, C.goal, gPulse * 0.5);
          game.draw.text('★', gx + CELL / 2, gy + CELL / 2, { size: 44, color: C.goalHi, bold: true });
        } else {
          var bgCol = tile === 'H' ? C.tileH : C.tileV;
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, bgCol, 0.7);

          // Rail lines
          if (tile === 'H') {
            game.draw.line(gx, gy + CELL / 2, gx + CELL, gy + CELL / 2, C.rail, 6);
            game.draw.line(gx, gy + CELL / 2 - 12, gx + CELL, gy + CELL / 2 - 12, C.railHi, 3);
            game.draw.line(gx, gy + CELL / 2 + 12, gx + CELL, gy + CELL / 2 + 12, C.railHi, 3);
          } else {
            game.draw.line(gx + CELL / 2, gy, gx + CELL / 2, gy + CELL, C.rail, 6);
            game.draw.line(gx + CELL / 2 - 12, gy, gx + CELL / 2 - 12, gy + CELL, C.railHi, 3);
            game.draw.line(gx + CELL / 2 + 12, gy, gx + CELL / 2 + 12, gy + CELL, C.railHi, 3);
          }

          // H/V label
          game.draw.text(tile, gx + CELL / 2, gy + CELL / 2, { size: 28, color: C.ui });
        }
      }
    }

    // Train
    game.draw.circle(trainPX, trainPY, 28 + trainFlash * 10, C.trainHi, 0.3 + trainFlash * 0.3);
    game.draw.rect(trainPX - 24, trainPY - 18, 48, 36, C.train, 0.9);
    game.draw.rect(trainPX - 24, trainPY - 18, 48, 10, C.trainHi, 0.4);
    // Wheels
    game.draw.circle(trainPX - 12, trainPY + 18, 10, '#1e293b', 0.9);
    game.draw.circle(trainPX + 12, trainPY + 18, 10, '#1e293b', 0.9);

    game.draw.text('タップで線路切替', W / 2, H * 0.91, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.goal : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initLevel();
  });
})(game);
