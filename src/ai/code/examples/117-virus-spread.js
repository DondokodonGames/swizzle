// 117-virus-spread.js
// ウイルス拡散 — じわじわ広がる感染をワクチンでブロックする緊張のリアルタイム戦略
// 操作: タップでワクチン設置（接触した感染セルを無効化）
// 成功: 60%以上のセルを守る  失敗: 75%感染されたら終了 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#020608',
    healthy:  '#1e3a5f',
    infected: '#ef4444',
    vaccine:  '#22c55e',
    vaccineHi:'#86efac',
    ui:       '#334155',
    correct:  '#22c55e',
    wrong:    '#ef4444'
  };

  var COLS = 14, ROWS = 20;
  var CELL = Math.floor(Math.min((W - 80) / COLS, (H * 0.72) / ROWS));
  var GRID_W = COLS * CELL;
  var GRID_H = ROWS * CELL;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = H * 0.15;

  // Cell states: 0=healthy, 1=infected, 2=vaccinated, 3=dead(infected+adjacent vaccinated)
  var grid = [];
  var TOTAL_CELLS = COLS * ROWS;

  function initGrid() {
    grid = [];
    for (var i = 0; i < TOTAL_CELLS; i++) grid.push(0);
    // Start infection at 3 random cells
    for (var s = 0; s < 3; s++) {
      var idx;
      do { idx = Math.floor(Math.random() * TOTAL_CELLS); } while (grid[idx] !== 0);
      grid[idx] = 1;
    }
  }

  var SPREAD_INTERVAL = 0.55;
  var spreadTimer = SPREAD_INTERVAL;
  var timeLeft = 30;
  var done = false;
  var vaccines = 20;

  function cellIdx(col, row) { return row * COLS + col; }

  function spreadInfection() {
    var newInfected = [];
    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        if (grid[cellIdx(col, row)] !== 1) continue;
        var neighbors = [
          [col-1,row],[col+1,row],[col,row-1],[col,row+1]
        ];
        for (var ni = 0; ni < neighbors.length; ni++) {
          var nc = neighbors[ni][0], nr = neighbors[ni][1];
          if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) {
            if (grid[cellIdx(nc, nr)] === 0) {
              newInfected.push(cellIdx(nc, nr));
            }
          }
        }
      }
    }
    for (var ii = 0; ii < newInfected.length; ii++) {
      grid[newInfected[ii]] = 1;
    }
  }

  function countCells() {
    var infected = 0, vaccinated = 0, healthy = 0;
    for (var i = 0; i < grid.length; i++) {
      if (grid[i] === 1) infected++;
      else if (grid[i] === 2) vaccinated++;
      else if (grid[i] === 0) healthy++;
    }
    return { infected: infected, vaccinated: vaccinated, healthy: healthy };
  }

  game.onTap(function(tx, ty) {
    if (done || vaccines <= 0) return;
    var col = Math.floor((tx - GRID_X) / CELL);
    var row = Math.floor((ty - GRID_Y) / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    var idx = cellIdx(col, row);
    if (grid[idx] === 0 || grid[idx] === 1) {
      grid[idx] = 2;
      vaccines--;
      game.audio.play('se_tap', 0.5);
      // Cure adjacent infected
      var neighbors = [[col-1,row],[col+1,row],[col,row-1],[col,row+1]];
      for (var ni = 0; ni < neighbors.length; ni++) {
        var nc = neighbors[ni][0], nr = neighbors[ni][1];
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) {
          if (grid[cellIdx(nc, nr)] === 1) grid[cellIdx(nc, nr)] = 0;
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      spreadTimer -= dt;
      if (spreadTimer <= 0) {
        spreadTimer = SPREAD_INTERVAL;
        spreadInfection();
      }

      // Check win/lose conditions
      var counts = countCells();
      var infectedPct = counts.infected / TOTAL_CELLS;
      var healthySafePct = (counts.healthy + counts.vaccinated) / TOTAL_CELLS;

      if (infectedPct >= 0.75) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
      if (timeLeft <= 0) {
        done = true;
        if (healthySafePct >= 0.60) {
          game.audio.play('se_success');
          game.end.success(Math.round(healthySafePct * 600) + Math.ceil(timeLeft) * 5);
        } else {
          game.audio.play('se_failure');
          game.end.failure();
        }
        return;
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var row = 0; row < ROWS; row++) {
      for (var col = 0; col < COLS; col++) {
        var idx = cellIdx(col, row);
        var cx = GRID_X + col * CELL;
        var cy = GRID_Y + row * CELL;
        var state = grid[idx];
        var color;
        if (state === 0) color = C.healthy;
        else if (state === 1) {
          var pulse = 0.7 + 0.3 * Math.abs(Math.sin(timeLeft * 4 + col + row));
          color = C.infected;
          game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, C.infected, pulse);
          continue;
        }
        else color = C.vaccine;
        game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, color, 0.8);
      }
    }

    // Vaccine icon for vaccinated cells (small cross)
    for (var row2 = 0; row2 < ROWS; row2++) {
      for (var col2 = 0; col2 < COLS; col2++) {
        if (grid[cellIdx(col2, row2)] === 2) {
          var cx2 = GRID_X + col2 * CELL + CELL / 2;
          var cy2 = GRID_Y + row2 * CELL + CELL / 2;
          game.draw.text('+', cx2, cy2, { size: CELL, color: C.vaccineHi, bold: true });
        }
      }
    }

    // Stats
    var counts2 = countCells();
    var infPct = Math.round(counts2.infected / TOTAL_CELLS * 100);
    game.draw.text('感染: ' + infPct + '%', W * 0.3, 148, { size: 44, color: C.wrong, bold: true });
    game.draw.text('💉 ' + vaccines, W * 0.72, 148, { size: 44, color: C.vaccine, bold: true });

    // Infection progress bar
    game.draw.rect(GRID_X, H * 0.9, GRID_W * (counts2.infected / TOTAL_CELLS), 20, C.wrong, 0.8);
    game.draw.rect(GRID_X, H * 0.9, GRID_W, 20, '#0f1520', 0);
    game.draw.rect(GRID_X, H * 0.9, 4, 20, '#fff', 0.3);
    game.draw.rect(GRID_X + GRID_W * 0.75, H * 0.9, 4, 20, C.wrong, 0.8);

    game.draw.text('タップでワクチン設置', W / 2, H * 0.93, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.vaccine : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    initGrid();
  });
})(game);
