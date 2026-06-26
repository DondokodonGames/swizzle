// 535-chain-link.js
// チェーンリンク — 同じ色のチェーン球をスワイプでつないで消す
// 操作: 同じ色の球を連続タップ/スワイプでつなぐ（3個以上で消滅）
// 成功: 80個消去  失敗: フィールドが詰まる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050308',
    panel:   '#080510',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
  var COLS = 6, ROWS = 9;
  var CELL = 148;
  var OX = (W - COLS * CELL) / 2;
  var OY = H * 0.1;

  var grid = [];
  var chain = [];
  var chainColor = -1;
  var cleared = 0;
  var NEEDED = 80;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var isChaining = false;
  var chainAnim = 0;

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < COLS; c++) {
        grid[r][c] = Math.floor(Math.random() * COLORS.length);
      }
    }
  }

  function cellAt(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { col: col, row: row };
  }

  function isInChain(col, row) {
    for (var i = 0; i < chain.length; i++) if (chain[i].col === col && chain[i].row === row) return true;
    return false;
  }

  function touchCell(col, row) {
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if (grid[row][col] === -1) return; // empty

    var color = grid[row][col];
    if (!isChaining) {
      isChaining = true;
      chainColor = color;
      chain = [{ col: col, row: row }];
      game.audio.play('se_tap', 0.2);
      return;
    }

    if (color !== chainColor) return;
    if (isInChain(col, row)) return;

    // Must be adjacent to last chain cell
    var last = chain[chain.length - 1];
    var dCol = Math.abs(col - last.col), dRow = Math.abs(row - last.row);
    if (dCol + dRow !== 1) return;

    chain.push({ col: col, row: row });
    game.audio.play('se_tap', 0.15);
  }

  function commitChain() {
    if (chain.length >= 3) {
      cleared += chain.length;
      flashCol = C.correct;
      flashAnim = 0.3;
      game.audio.play('se_success', 0.6);

      for (var ci = 0; ci < chain.length; ci++) {
        var cc = chain[ci];
        var cx = OX + cc.col * CELL + CELL / 2;
        var cy = OY + cc.row * CELL + CELL / 2;
        for (var pi = 0; pi < 4; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 140, vy: Math.sin(ang) * 140, life: 0.4, col: COLORS[chainColor] });
        }
        grid[cc.row][cc.col] = -1;
      }

      // Drop cells down (gravity)
      for (var col = 0; col < COLS; col++) {
        var writeRow = ROWS - 1;
        for (var row = ROWS - 1; row >= 0; row--) {
          if (grid[row][col] !== -1) {
            grid[writeRow][col] = grid[row][col];
            if (writeRow !== row) grid[row][col] = -1;
            writeRow--;
          }
        }
        // Fill top with new cells
        for (var r = writeRow; r >= 0; r--) {
          grid[r][col] = Math.floor(Math.random() * COLORS.length);
        }
      }

      if (cleared >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(cleared * 100 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else if (chain.length > 0) {
      game.audio.play('se_failure', 0.2);
    }

    chain = [];
    chainColor = -1;
    isChaining = false;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
      if (!isChaining) {
        touchCell(col, row);
      } else {
        touchCell(col, row);
        commitChain();
      }
    } else {
      commitChain();
    }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Start or extend chain based on swipe path
    var col1 = Math.floor((x1 - OX) / CELL);
    var row1 = Math.floor((y1 - OY) / CELL);
    var col2 = Math.floor((x2 - OX) / CELL);
    var row2 = Math.floor((y2 - OY) / CELL);
    touchCell(col1, row1);
    touchCell(col2, row2);
    if (chain.length >= 3) commitChain();
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
    if (chainAnim > 0) chainAnim -= dt * 4;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(OX - 8, OY - 8, COLS * CELL + 16, ROWS * CELL + 16, C.panel, 0.9);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var col2 = grid[r][c];
        if (col2 === -1) continue;
        var cx = OX + c * CELL + CELL / 2;
        var cy = OY + r * CELL + CELL / 2;
        var inChain = isInChain(c, r);
        var chainIdx = -1;
        for (var ci2 = 0; ci2 < chain.length; ci2++) if (chain[ci2].col === c && chain[ci2].row === r) chainIdx = ci2;

        game.draw.circle(cx, cy, CELL * 0.38 + (inChain ? 8 : 0), COLORS[col2], 0.9);
        game.draw.circle(cx - CELL * 0.1, cy - CELL * 0.1, CELL * 0.12, '#fff', inChain ? 0.5 : 0.2);

        if (inChain) {
          game.draw.circle(cx, cy, CELL * 0.44, COLORS[col2], 0.3);
          game.draw.text((chainIdx + 1) + '', cx, cy + 16, { size: 40, color: '#fff', bold: true });
        }
      }
    }

    // Chain lines
    for (var ci3 = 1; ci3 < chain.length; ci3++) {
      var p1 = chain[ci3 - 1], p2 = chain[ci3];
      var lx1 = OX + p1.col * CELL + CELL / 2, ly1 = OY + p1.row * CELL + CELL / 2;
      var lx2 = OX + p2.col * CELL + CELL / 2, ly2 = OY + p2.row * CELL + CELL / 2;
      game.draw.line(lx1, ly1, lx2, ly2, COLORS[chainColor], 12);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Status
    if (chain.length > 0) {
      var chainMsg = chain.length >= 3 ? 'タップで消す！ ' + chain.length + '個' : chain.length + '個 (3個以上でOK)';
      game.draw.text(chainMsg, W / 2, OY + ROWS * CELL + 60, { size: 40, color: chain.length >= 3 ? C.correct : C.ui });
    }

    game.draw.text(cleared + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#3b82f6' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initGrid();
  });
})(game);
