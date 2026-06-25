// 231-ice-crack.js
// アイスクラック — 割れていく氷の上を素早く渡りきるスリル
// 操作: タップで移動先を指定（氷の上のみ）
// 成功: 右端まで渡る  失敗: 氷が割れて落ちる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#02080f',
    ice:    '#7dd3fc',
    iceHi:  '#bae6fd',
    iceDim: '#1e3a5f',
    crack:  '#0ea5e9',
    water:  '#0c1a3a',
    waterHi:'#1e40af',
    player: '#f59e0b',
    plrHi:  '#fde68a',
    goal:   '#22c55e',
    ui:     '#475569'
  };

  var COLS = 8;
  var ROWS = 10;
  var CELL = Math.floor((W - 40) / COLS);
  var OX = 20;
  var OY = H * 0.1;

  // Grid: health 0=water, 1-3=ice (cracks on tap near)
  var grid = [];
  var playerCol = 0;
  var playerRow = Math.floor(ROWS / 2);
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var crackEffects = [];
  var splashes = [];

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < COLS; c++) {
        // Rightmost column is goal
        if (c === COLS - 1) { grid[r][c] = 3; continue; }
        // Random ice health 1-3, some water holes
        grid[r][c] = Math.random() < 0.15 ? 0 : 1 + Math.floor(Math.random() * 3);
      }
    }
    // Ensure start cell is solid
    grid[playerRow][0] = 3;
    // Ensure a path exists (simple: set a few cells to 3 along middle)
    for (var c2 = 0; c2 < COLS; c2++) {
      var mid = Math.floor(ROWS / 2);
      if (grid[mid][c2] === 0) grid[mid][c2] = 1;
    }
  }

  function crackAround(col, row) {
    // Weaken nearby ice
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        var nr = row + dr, nc = col + dc;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (grid[nr][nc] > 0) {
          grid[nr][nc]--;
          if (grid[nr][nc] === 0) {
            // Ice broke
            splashes.push({ x: OX + nc * CELL + CELL / 2, y: OY + nr * CELL + CELL / 2, life: 0.6 });
          }
        }
      }
    }
    crackEffects.push({ col: col, row: row, life: 0.4 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var tc = Math.floor((tx - OX) / CELL);
    var tr = Math.floor((ty - OY) / CELL);
    if (tc < 0 || tc >= COLS || tr < 0 || tr >= ROWS) return;

    // Must be adjacent to player
    var dc = Math.abs(tc - playerCol), dr = Math.abs(tr - playerRow);
    if (dc + dr !== 1) return; // only cardinal adjacent
    if (dc > 1 || dr > 1) return;

    if (grid[tr][tc] === 0) return; // water — can't step there

    // Move player
    playerCol = tc;
    playerRow = tr;
    game.audio.play('se_tap', 0.4);

    // Crack ice around stepped cell
    crackAround(playerCol, playerRow);

    // Check if current cell is now water (broke under player)
    if (grid[playerRow][playerCol] === 0 && !done) {
      done = true;
      game.audio.play('se_failure');
      splashes.push({ x: OX + playerCol * CELL + CELL / 2, y: OY + playerRow * CELL + CELL / 2, life: 0.8, big: true });
      setTimeout(function() { game.end.failure(); }, 600);
      return;
    }

    // Check goal
    if (playerCol === COLS - 1 && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 150 + 500); }, 400);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Random ice degrades over time
    if (Math.random() < dt * 0.5) {
      var rc = Math.floor(Math.random() * COLS);
      var rr = Math.floor(Math.random() * ROWS);
      if (grid[rr][rc] > 0 && !(rr === playerRow && rc === playerCol)) {
        grid[rr][rc]--;
      }
    }

    for (var ci = crackEffects.length - 1; ci >= 0; ci--) {
      crackEffects[ci].life -= dt;
      if (crackEffects[ci].life <= 0) crackEffects.splice(ci, 1);
    }
    for (var si = splashes.length - 1; si >= 0; si--) {
      splashes[si].life -= dt;
      if (splashes[si].life <= 0) splashes.splice(si, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, OY, W, ROWS * CELL, C.water, 0.8);

    // Water ripple
    for (var a = 0; a < 5; a++) {
      var wx = (elapsed * 60 + a * W / 4) % W;
      game.draw.line(wx, OY + ROWS * CELL / 2, wx + W / 8, OY + ROWS * CELL / 2 + 10, C.waterHi, 3);
    }

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = OX + c * CELL;
        var gy = OY + r * CELL;
        var health = grid[r][c];
        if (health === 0) continue; // water

        var iceAlpha = health / 3;
        var col = c === COLS - 1 ? C.goal : C.ice;
        var hi = c === COLS - 1 ? '#86efac' : C.iceHi;

        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, col, iceAlpha * 0.7 + 0.15);
        game.draw.rect(gx + 2, gy + 2, CELL - 4, 6, hi, iceAlpha * 0.4);

        // Cracks based on health
        if (health === 1) {
          game.draw.line(gx + 10, gy + 10, gx + CELL - 10, gy + CELL - 10, C.crack, 3);
          game.draw.line(gx + CELL / 2, gy + 5, gx + 10, gy + CELL - 5, C.crack, 2);
        } else if (health === 2) {
          game.draw.line(gx + CELL / 2, gy + 5, gx + CELL / 2, gy + CELL - 5, C.crack, 2);
        }

        // Goal indicator
        if (c === COLS - 1) {
          game.draw.text('→', gx + CELL / 2, gy + CELL / 2, { size: 44, color: '#22c55e', bold: true });
        }
      }
    }

    // Crack effects
    for (var ce = 0; ce < crackEffects.length; ce++) {
      var fx = OX + crackEffects[ce].col * CELL + CELL / 2;
      var fy = OY + crackEffects[ce].row * CELL + CELL / 2;
      game.draw.circle(fx, fy, CELL * crackEffects[ce].life * 2, '#fff', crackEffects[ce].life * 0.4);
    }

    // Splashes
    for (var sp = 0; sp < splashes.length; sp++) {
      var s = splashes[sp];
      var r = s.big ? 60 : 30;
      game.draw.circle(s.x, s.y, r * (1 - s.life) * 2, C.waterHi, s.life * 0.6);
    }

    // Player
    var gx2 = OX + playerCol * CELL;
    var gy2 = OY + playerRow * CELL;
    var px2 = gx2 + CELL / 2;
    var py2 = gy2 + CELL / 2;
    game.draw.circle(px2, py2, CELL / 2 - 4 + 8, C.plrHi, 0.3);
    game.draw.circle(px2, py2, CELL / 2 - 6, C.player, 0.9);
    game.draw.circle(px2 - 6, py2 - 6, 8, '#fff', 0.5);

    // Adjacent cell highlights
    var adjCells = [[0,1],[0,-1],[1,0],[-1,0]];
    for (var ai = 0; ai < adjCells.length; ai++) {
      var nc2 = playerCol + adjCells[ai][0];
      var nr2 = playerRow + adjCells[ai][1];
      if (nc2 < 0 || nc2 >= COLS || nr2 < 0 || nr2 >= ROWS) continue;
      if (grid[nr2][nc2] > 0) {
        game.draw.rect(OX + nc2 * CELL + 2, OY + nr2 * CELL + 2, CELL - 4, CELL - 4, '#fff', 0.1 + 0.08 * Math.abs(Math.sin(elapsed * 4)));
      }
    }

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ice : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('→ タップで移動', W / 2, H * 0.93, { size: 38, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initGrid();
  });
})(game);
