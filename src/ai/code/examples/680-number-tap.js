// 680-number-tap.js
// 数字タッチ — 散らばった数字を1から順番に素早くタップせよ
// 操作: タップで数字を昇順に押す
// 成功: 1から25まで完走  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040312',
    cell:    '#0e0c2a',
    next:    '#a78bfa',
    nextBg:  '#4c1d95',
    done:    '#1e1b4b',
    doneTxt: '#312e81',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060412'
  };

  var GRID_COLS = 5;
  var GRID_ROWS = 5;
  var TOTAL = 25;
  var CELL = 180;
  var GAP = 10;
  var GRID_W = GRID_COLS * CELL + (GRID_COLS - 1) * GAP;
  var GRID_H = GRID_ROWS * CELL + (GRID_ROWS - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = (H - GRID_H) / 2 + 80;

  var positions = [];  // positions[i] = {row, col} for number (i+1)
  var cellDone = [];   // cellDone[i] = true if number (i+1) is tapped
  var nextNum = 1;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var particles = [];

  function cellX(col) { return GRID_X + col * (CELL + GAP); }
  function cellY(row) { return GRID_Y + row * (CELL + GAP); }

  function setup() {
    var cells = [];
    for (var r = 0; r < GRID_ROWS; r++) {
      for (var c = 0; c < GRID_COLS; c++) {
        cells.push({ row: r, col: c });
      }
    }
    for (var i = cells.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = cells[i]; cells[i] = cells[j]; cells[j] = tmp;
    }
    positions = cells;
    cellDone = [];
    for (var k = 0; k < TOTAL; k++) cellDone.push(false);
    nextNum = 1;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP));
    var row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;
    // Check in-cell (not in gap)
    var localX = (tx - GRID_X) - col * (CELL + GAP);
    var localY = (ty - GRID_Y) - row * (CELL + GAP);
    if (localX > CELL || localY > CELL) return;

    // Find number at this cell
    var tappedNum = -1;
    for (var i = 0; i < TOTAL; i++) {
      if (positions[i].row === row && positions[i].col === col) {
        tappedNum = i + 1;
        break;
      }
    }
    if (tappedNum < 0) return;

    if (tappedNum === nextNum) {
      cellDone[tappedNum - 1] = true;
      var pos = positions[tappedNum - 1];
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({
          x: cellX(pos.col) + CELL / 2,
          y: cellY(pos.row) + CELL / 2,
          vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160,
          life: 0.4, col: C.next
        });
      }
      game.audio.play('se_tap', 0.1);
      nextNum++;
      if (nextNum > TOTAL) {
        done = true;
        game.audio.play('se_success', 0.9);
        var score = Math.floor(timeLeft * 80) + 2000;
        setTimeout(function() { game.end.success(score); }, 600);
      }
    } else {
      // Wrong tap
      flashAnim = 0.18;
      game.audio.play('se_failure', 0.12);
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
    if (flashAnim > 0) flashAnim -= dt * 5;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var ni = 0; ni < TOTAL; ni++) {
      var pos = positions[ni];
      var cx = cellX(pos.col);
      var cy = cellY(pos.row);
      var num = ni + 1;
      var isDone = cellDone[ni];
      var isNext = num === nextNum;

      if (isDone) {
        game.draw.rect(cx, cy, CELL, CELL, C.done, 0.85);
        game.draw.text('' + num, cx + CELL / 2, cy + CELL / 2 + 14, { size: 44, color: C.doneTxt, bold: true });
      } else if (isNext) {
        var pulse = 0.75 + 0.25 * Math.sin(elapsed * 7);
        game.draw.rect(cx + 4, cy + 4, CELL, CELL, '#000', 0.3);
        game.draw.rect(cx, cy, CELL, CELL, C.nextBg, pulse);
        game.draw.rect(cx - 5, cy - 5, CELL + 10, CELL + 10, C.next, 0.18);
        game.draw.rect(cx, cy, CELL, 8, '#ffffff22', 0.7);
        game.draw.text('' + num, cx + CELL / 2, cy + CELL / 2 + 16, { size: 64, color: '#fff', bold: true });
      } else {
        game.draw.rect(cx + 3, cy + 3, CELL, CELL, '#000', 0.28);
        game.draw.rect(cx, cy, CELL, CELL, C.cell, 0.85);
        game.draw.rect(cx, cy, CELL, 6, '#ffffff12', 0.8);
        game.draw.text('' + num, cx + CELL / 2, cy + CELL / 2 + 14, { size: 52, color: C.text, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.wrong, flashAnim * 0.06);

    // Header
    var headerY = GRID_Y - 90;
    game.draw.text('次: ' + nextNum, W * 0.3, headerY, { size: 44, color: C.next, bold: true });
    game.draw.text((nextNum - 1) + ' / ' + TOTAL, W * 0.75, headerY, { size: 38, color: '#ffffff55' });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    setup();
  });
})(game);
