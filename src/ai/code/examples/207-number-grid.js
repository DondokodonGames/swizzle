// 207-number-grid.js
// 数字グリッド — 1から25まで素早く順番にタップする、数字探しの速度ゲーム
// 操作: タップで数字を順番に選択
// 成功: 25秒以内に1-25を全タップ  失敗: 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040608',
    cell:   '#0f1a28',
    cellHi: '#1e3a5f',
    active: '#22c55e',
    actHi:  '#86efac',
    done_c: '#1a3a1a',
    wrong:  '#ef4444',
    next:   '#f59e0b',
    ui:     '#334155'
  };

  var SIZE = 5;
  var CELL = 180;
  var GAP = 8;
  var GW = SIZE * CELL + (SIZE - 1) * GAP;
  var GX = (W - GW) / 2;
  var GY = H * 0.24;

  var grid = [];
  var current = 1;
  var done = false;
  var timeLeft = 25;
  var elapsed = 0;
  var flash = -1;
  var flashTimer = 0;
  var wrongFlash = 0;
  var startTime = 0;
  var completionTime = 0;

  function initGrid() {
    grid = [];
    for (var i = 1; i <= 25; i++) grid.push(i);
    // Shuffle
    for (var j = grid.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = grid[j]; grid[j] = grid[k]; grid[k] = tmp;
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - GX) / (CELL + GAP));
    var row = Math.floor((ty - GY) / (CELL + GAP));
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;
    var idx = row * SIZE + col;
    var cx = GX + col * (CELL + GAP);
    var cy = GY + row * (CELL + GAP);
    if (tx < cx || tx > cx + CELL || ty < cy || ty > cy + CELL) return;

    if (grid[idx] === current) {
      flash = idx;
      flashTimer = 0.3;
      current++;
      game.audio.play('se_tap', 0.4 + current * 0.01);
      if (current > 25) {
        done = true;
        completionTime = elapsed;
        game.audio.play('se_success');
        var timeBonus = Math.max(0, Math.ceil((25 - completionTime) * 100));
        setTimeout(function() { game.end.success(timeBonus + 500); }, 400);
      }
    } else {
      wrongFlash = 0.3;
      game.audio.play('se_failure', 0.3);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (flashTimer > 0) flashTimer -= dt;
    else flash = -1;
    if (wrongFlash > 0) wrongFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    for (var r = 0; r < SIZE; r++) {
      for (var c = 0; c < SIZE; c++) {
        var idx = r * SIZE + c;
        var val = grid[idx];
        var cx2 = GX + c * (CELL + GAP);
        var cy2 = GY + r * (CELL + GAP);
        var isCompleted = val < current;
        var isNext = val === current;
        var isFlash = flash === idx && flashTimer > 0;

        var bg2 = isCompleted ? C.done_c : (isNext ? C.active : C.cell);
        var alpha = isFlash ? 1 : (isCompleted ? 0.6 : 0.9);
        game.draw.rect(cx2, cy2, CELL, CELL, bg2, alpha);
        if (!isCompleted) {
          game.draw.rect(cx2 + 8, cy2 + 8, CELL - 16, 24, isNext ? C.actHi : C.cellHi, 0.3);
        }

        if (isNext) {
          // Pulse highlight
          var pulse = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 5));
          game.draw.rect(cx2, cy2, CELL, CELL, C.next, pulse * 0.12);
        }

        var textCol = isCompleted ? '#1a4a1a' : (isNext ? '#fff' : '#93c5fd');
        game.draw.text(val + '', cx2 + CELL / 2, cy2 + CELL / 2, { size: 72, color: textCol, bold: true });
      }
    }

    if (wrongFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, wrongFlash * 0.1);
    }

    game.draw.text('次: ' + current, W / 2, GY - 55, { size: 52, color: C.next, bold: true });
    game.draw.text('1から順番にタップ！', W / 2, H * 0.93, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.active : C.wrong);
    game.draw.text(timeLeft.toFixed(1) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initGrid();
    startTime = 0;
  });
})(game);
