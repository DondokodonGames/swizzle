// 033-number-sort.js
// ナンバーソート — 散らばった数字を素早く昇順でタップする頭の体操
// 操作: 数字を1→2→3…と順番にタップ
// 成功: 1〜15を全部正順でタップ  失敗: 間違えた瞬間 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0c18',
    cell:   '#0f1530',
    cellHi: '#1e2d5e',
    numCol: '#60a5fa',
    done:   '#22c55e',
    wrong:  '#ef4444',
    next:   '#fbbf24',
    ui:     '#475569'
  };

  var TOTAL = 15;
  var COLS = 5;
  var ROWS = 3;
  var CELL_W = 180;
  var CELL_H = 200;
  var GAP = 12;
  var GRID_W = COLS * (CELL_W + GAP) - GAP;
  var GRID_H = ROWS * (CELL_H + GAP) - GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = H * 0.28;

  var positions = []; // { col, row } for each number 1..15
  var state = [];     // 0=waiting, 1=tapped(correct), -1=wrong
  var nextToTap = 1;
  var timeLeft = 30;
  var done = false;
  var wrongFlash = 0;

  function shuffle() {
    // Place numbers 1..15 in random grid positions
    var cells = [];
    for (var i = 0; i < TOTAL; i++) cells.push(i);
    // Fisher-Yates
    for (var j = TOTAL - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = cells[j]; cells[j] = cells[k]; cells[k] = tmp;
    }
    positions = cells.map(function(ci) {
      return { col: ci % COLS, row: Math.floor(ci / COLS) };
    });
    state = new Array(TOTAL).fill(0);
    nextToTap = 1;
  }

  function cellBounds(num) {
    // num is 1-indexed
    var pos = positions[num - 1];
    return {
      x: GRID_X + pos.col * (CELL_W + GAP),
      y: GRID_Y + pos.row * (CELL_H + GAP),
      w: CELL_W,
      h: CELL_H
    };
  }

  game.onTap(function(x, y) {
    if (done) return;

    // Which cell was tapped?
    for (var n = 1; n <= TOTAL; n++) {
      if (state[n - 1] === 1) continue; // already tapped
      var b = cellBounds(n);
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
        if (n === nextToTap) {
          state[n - 1] = 1;
          nextToTap++;
          game.audio.play('se_tap', 0.6 + (n / TOTAL) * 0.4);
          if (nextToTap > TOTAL) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() {
              game.end.success(Math.ceil(timeLeft) * 10 + 200);
            }, 400);
          }
        } else {
          // Wrong order
          wrongFlash = 0.4;
          state[n - 1] = -1;
          game.audio.play('se_failure', 0.6);
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
        return;
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
    if (wrongFlash > 0) wrongFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#080a14');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#2563eb' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Progress
    game.draw.text((nextToTap - 1) + ' / ' + TOTAL, W / 2, 128, {
      size: 56, color: C.done, bold: true
    });

    // "Next" indicator
    if (!done) {
      game.draw.text('次: ' + nextToTap, W / 2, 200, { size: 52, color: C.next, bold: true });
    }

    // Wrong flash
    if (wrongFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, wrongFlash / 0.4 * 0.2);
    }

    // Numbers grid
    for (var n = 1; n <= TOTAL; n++) {
      var b = cellBounds(n);
      var s = state[n - 1];
      var isNext = n === nextToTap;

      var bgColor = s === 1 ? C.done : (s === -1 ? C.wrong : (isNext ? C.next : C.cell));
      var bgAlpha = s === 1 ? 0.5 : (isNext ? 0.25 : 1.0);

      // Shadow
      game.draw.rect(b.x + 6, b.y + 8, b.w, b.h, '#000', 0.3);
      // Edge
      game.draw.rect(b.x - 4, b.y - 4, b.w + 8, b.h + 8, isNext ? C.next : '#1e2a4a', isNext ? 0.8 : 0.4);
      // Cell
      game.draw.rect(b.x, b.y, b.w, b.h, bgColor, bgAlpha);
      // Shine
      if (s === 0 || s === 1) {
        game.draw.rect(b.x + 12, b.y + 8, b.w - 24, b.h * 0.25, '#fff', 0.12);
      }

      // Number
      var numColor = s === 1 ? '#fff' : (s === -1 ? '#fca5a5' : (isNext ? '#fff' : C.numCol));
      var numAlpha = s === 1 ? 0.5 : 1.0;
      game.draw.text('' + n, b.x + b.w / 2, b.y + b.h / 2, {
        size: 88, color: numColor, bold: true
      });

      // Check mark for done
      if (s === 1) {
        game.draw.text('✓', b.x + b.w - 40, b.y + 40, { size: 44, color: '#86efac', bold: true });
      }

      // Pulse for next
      if (isNext && !done) {
        var pulse = 0.4 + 0.3 * Math.sin(game.time.elapsed * 8);
        game.draw.rect(b.x - 8, b.y - 8, b.w + 16, b.h + 16, C.next, pulse * 0.3);
      }
    }

    // Guide
    game.draw.text('1から順番にタップ！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    shuffle();
  });
})(game);
