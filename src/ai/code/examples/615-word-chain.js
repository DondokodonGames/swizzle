// 615-word-chain.js
// ワードチェーン — 隣接するマスを繋いでスコア文字を集めろ
// 操作: スワイプで連続マスを選択、タップで確定
// 成功: 300ポイント  失敗: 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#060610',
    cell:     '#0f1535',
    cellHi:   '#1a2555',
    selected: '#3b82f6',
    selectedHi:'#93c5fd',
    path:     '#6366f1',
    locked:   '#22c55e',
    lockedHi: '#86efac',
    text:     '#f1f5f9',
    ui:       '#0a0f2a',
    miss:     '#ef4444',
    letter:   '#e2e8f0'
  };

  var COLS = 5;
  var ROWS = 6;
  var CELL_SIZE = 170;
  var PAD = 10;
  var GRID_W = COLS * (CELL_SIZE + PAD) - PAD;
  var GRID_OX = (W - GRID_W) / 2;
  var GRID_OY = H * 0.2;

  // High value letters
  var LETTERS = 'AEIOURSTLNBCDFGHJKMPQVWXYZ';
  var VALUES = { A:1,E:1,I:1,O:1,U:1,R:1,S:1,T:1,L:1,N:1,B:3,C:3,D:2,F:4,G:2,H:4,J:8,K:5,M:3,P:3,Q:10,V:4,W:4,X:8,Y:4,Z:10 };

  var grid = [];
  var selected = [];
  var score = 0;
  var NEEDED = 300;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.locked;
  var resultText = '';
  var resultTimer = 0;
  var lastSwipeIdx = -1;

  function randomLetter() {
    // Weight common letters more
    var pool = 'EEEEAAAIIIOOOUURRRSSSTTTTLLLNNNDDDGGBBCMPFHVWY';
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var letter = randomLetter();
        grid.push({
          r: r, c: c,
          letter: letter,
          value: VALUES[letter] || 1,
          sel: false,
          locked: false,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  function cellAt(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return grid[r * COLS + c];
  }

  function cellXY(r, c) {
    return {
      x: GRID_OX + c * (CELL_SIZE + PAD) + CELL_SIZE / 2,
      y: GRID_OY + r * (CELL_SIZE + PAD) + CELL_SIZE / 2
    };
  }

  function hitCell(tx, ty) {
    for (var i = 0; i < grid.length; i++) {
      var cell = grid[i];
      var pos = cellXY(cell.r, cell.c);
      var dx = tx - pos.x, dy = ty - pos.y;
      if (Math.abs(dx) < CELL_SIZE / 2 + 10 && Math.abs(dy) < CELL_SIZE / 2 + 10) return i;
    }
    return -1;
  }

  function isAdjacent(a, b) {
    return Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1 && !(a.r === b.r && a.c === b.c);
  }

  function confirmWord() {
    if (selected.length < 2) {
      // Deselect
      for (var i = 0; i < grid.length; i++) grid[i].sel = false;
      selected = [];
      return;
    }
    var pts = 0;
    for (var i = 0; i < selected.length; i++) {
      pts += grid[selected[i]].value;
    }
    pts *= selected.length; // length multiplier
    score += pts;
    flashCol = C.locked;
    flashAnim = 0.25;
    resultText = '+' + pts + '!';
    resultTimer = 0.6;
    game.audio.play('se_success', 0.5 + Math.min(pts * 0.02, 0.4));

    // Lock and replace selected cells
    for (var j = 0; j < selected.length; j++) {
      var idx = selected[j];
      var letter = randomLetter();
      grid[idx].letter = letter;
      grid[idx].value = VALUES[letter] || 1;
      grid[idx].sel = false;
      grid[idx].locked = false;
      // Particle burst
      var pos = cellXY(grid[idx].r, grid[idx].c);
      for (var p = 0; p < 4; p++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: pos.x, y: pos.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.4, col: C.lockedHi });
      }
    }
    selected = [];
    lastSwipeIdx = -1;

    if (score >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(score + Math.ceil(timeLeft) * 50); }, 700);
    }
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Find cell under swipe start/end
    var startIdx = hitCell(x1, y1);
    var endIdx = hitCell(x2, y2);
    if (startIdx < 0 && endIdx < 0) return;

    var idx = endIdx >= 0 ? endIdx : startIdx;
    if (idx < 0) return;
    if (grid[idx].locked) return;

    // If starting new chain
    if (selected.length === 0) {
      if (startIdx >= 0) {
        grid[startIdx].sel = true;
        selected = [startIdx];
        lastSwipeIdx = startIdx;
      }
    }

    // Extend chain to endIdx
    if (endIdx >= 0 && endIdx !== lastSwipeIdx && !grid[endIdx].sel) {
      var last = grid[selected[selected.length - 1]];
      var next = grid[endIdx];
      if (isAdjacent(last, next)) {
        grid[endIdx].sel = true;
        selected.push(endIdx);
        lastSwipeIdx = endIdx;
        game.audio.play('se_tap', 0.1);
      }
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (selected.length > 0) {
      confirmWord();
      return;
    }
    var idx = hitCell(tx, ty);
    if (idx >= 0 && !grid[idx].locked) {
      grid[idx].sel = true;
      selected = [idx];
      lastSwipeIdx = idx;
      game.audio.play('se_tap', 0.15);
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
    if (resultTimer > 0) resultTimer -= dt;

    for (var gi = 0; gi < grid.length; gi++) grid[gi].phase += dt * 1.5;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Path lines between selected
    for (var si = 0; si < selected.length - 1; si++) {
      var a = cellXY(grid[selected[si]].r, grid[selected[si]].c);
      var b2 = cellXY(grid[selected[si + 1]].r, grid[selected[si + 1]].c);
      game.draw.line(a.x, a.y, b2.x, b2.y, C.path, 8);
    }

    // Cells
    for (var gi2 = 0; gi2 < grid.length; gi2++) {
      var cell = grid[gi2];
      var pos = cellXY(cell.r, cell.c);
      var cx = pos.x - CELL_SIZE / 2;
      var cy = pos.y - CELL_SIZE / 2;
      var pulse = 1 + Math.sin(cell.phase) * 0.02;

      var bg = cell.sel ? C.selected : C.cell;
      var alpha = cell.sel ? 0.9 : 0.8;
      game.draw.rect(cx, cy, CELL_SIZE, CELL_SIZE, bg, alpha);
      game.draw.rect(cx, cy, CELL_SIZE, 6, cell.sel ? C.selectedHi : C.cellHi, 0.6);

      // Letter
      var letterCol = cell.sel ? '#fff' : C.letter;
      game.draw.text(cell.letter, pos.x, pos.y - 10, { size: 72, color: letterCol, bold: true });
      // Value
      game.draw.text(cell.value + '', pos.x + CELL_SIZE * 0.3, pos.y + CELL_SIZE * 0.25, { size: 32, color: cell.sel ? C.selectedHi : C.ui });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.1, { size: 64, color: C.lockedHi, bold: true });
    }

    // Selection info
    if (selected.length > 0) {
      var previewPts = 0;
      for (var si2 = 0; si2 < selected.length; si2++) previewPts += grid[selected[si2]].value;
      previewPts *= selected.length;
      game.draw.text('確定: タップ  ' + selected.length + '文字 × ' + (selected.length) + ' = +' + previewPts, W / 2, H * 0.88, { size: 34, color: C.selectedHi });
    } else {
      game.draw.text('スワイプで連結 タップで確定', W / 2, H * 0.88, { size: 34, color: C.ui });
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.selected : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    initGrid();
  });
})(game);
