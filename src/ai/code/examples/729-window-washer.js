// 729-window-washer.js
// ウィンドウウォッシャー — 汚れた窓に現れる文字をタップして読み取れ
// 操作: タップで汚れを拭く（光る汚れスポットをタップして文字を解読）
// 成功: 20文字解読  失敗: 8回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0a12',
    window:   '#1a2744',
    dirt:     '#2d3520',
    dirtHi:   '#4a5730',
    clean:    '#7dd3fc',
    letter:   '#fde68a',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    text:     '#f1f5f9',
    ui:       '#0d0d18'
  };

  var WIN_X = 80, WIN_Y = 220;
  var WIN_W = W - 160, WIN_H = H * 0.55;
  var COLS = 4, ROWS = 4;
  var CELL_W = WIN_W / COLS, CELL_H = WIN_H / ROWS;

  var LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ123456789';

  // Grid of dirt spots
  var grid = [];
  var targetLetter = '';
  var revealedCells = [];  // cells that have been wiped

  var score = 0;
  var NEEDED = 20;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var waitTimer = 0;

  function newPuzzle() {
    targetLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    grid = [];
    revealedCells = [];
    // Fill all cells with dirt
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        grid.push({ row: r, col: c, dirty: true, phase: Math.random() * Math.PI * 2 });
      }
    }
    // Randomize which cells are "the letter" vs blank space
    // The letter occupies ~40-60% of cells; player must wipe to see
    // We define the correct letter cell as: has the letter drawn inside
    // The hidden letter: one random cell is THE ANSWER — tapping it reveals the letter
    // All other cells show random letters or nothing when wiped
    // Actually: player must find which wiped cells spell the target letter
    // Simplified: one of the cells has a lit button "which matches the letter"
    // Let's do: wipe cells to see letters (random), find the one matching target
    waitTimer = 0;
  }

  // Generate random letter for non-answer cells
  var cellLetters = [];
  function generateCellLetters() {
    cellLetters = [];
    var answerIdx = Math.floor(Math.random() * (COLS * ROWS));
    for (var i = 0; i < COLS * ROWS; i++) {
      if (i === answerIdx) {
        cellLetters.push({ letter: targetLetter, isAnswer: true });
      } else {
        var L = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        while (L === targetLetter) L = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        cellLetters.push({ letter: L, isAnswer: false });
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0) return;
    // Find which cell was tapped
    if (tx < WIN_X || tx > WIN_X + WIN_W || ty < WIN_Y || ty > WIN_Y + WIN_H) return;
    var col = Math.floor((tx - WIN_X) / CELL_W);
    var row = Math.floor((ty - WIN_Y) / CELL_H);
    var idx = row * COLS + col;

    if (idx < 0 || idx >= grid.length) return;
    var cell = grid[idx];

    if (cell.dirty) {
      // Wipe the cell
      cell.dirty = false;
      revealedCells.push(idx);
      game.audio.play('se_tap', 0.1);

      // Check if this is the answer cell
      if (cellLetters[idx].isAnswer) {
        score++;
        flashCol = C.correct;
        flashAnim = 0.35;
        resultText = '見つけた！ ' + targetLetter;
        resultTimer = 0.7;
        game.audio.play('se_success', 0.6);
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          var cx = WIN_X + col * CELL_W + CELL_W / 2;
          var cy = WIN_Y + row * CELL_H + CELL_H / 2;
          particles.push({ x: cx, y: cy, vx: Math.cos(pa)*200, vy: Math.sin(pa)*200, life: 0.5, col: C.letter });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 80); }, 700);
        } else {
          waitTimer = 0.8;
          setTimeout(function() { newPuzzle(); generateCellLetters(); }, 800);
        }
      }
    } else {
      // Already wiped cell — check if it's the letter
      if (cellLetters[idx].isAnswer) {
        // Re-tapping the answer (already revealed) = correct identification
        score++;
        flashCol = C.correct;
        flashAnim = 0.3;
        resultText = '正解！ ' + targetLetter;
        resultTimer = 0.6;
        game.audio.play('se_success', 0.6);
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 500 + Math.ceil(timeLeft) * 80); }, 700);
        } else {
          waitTimer = 0.8;
          setTimeout(function() { newPuzzle(); generateCellLetters(); }, 800);
        }
      } else {
        // Wrong letter cell
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.3;
        resultText = 'ちがう！';
        resultTimer = 0.5;
        game.audio.play('se_failure', 0.3);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
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

    if (waitTimer > 0) waitTimer -= dt;

    for (var gi = 0; gi < grid.length; gi++) {
      grid[gi].phase += dt * (grid[gi].dirty ? 1.2 : 0.5);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target letter prompt
    game.draw.text('探せ: ', W / 2 - 100, WIN_Y - 56, { size: 44, color: '#ffffff66' });
    game.draw.text(targetLetter, W / 2 + 60, WIN_Y - 56, { size: 64, color: C.letter, bold: true });

    // Window background
    game.draw.rect(WIN_X + 4, WIN_Y + 4, WIN_W, WIN_H, '#000', 0.3);
    game.draw.rect(WIN_X, WIN_Y, WIN_W, WIN_H, C.window, 0.8);

    // Grid cells
    for (var gi2 = 0; gi2 < grid.length; gi2++) {
      var cell = grid[gi2];
      var cx = WIN_X + cell.col * CELL_W;
      var cy = WIN_Y + cell.row * CELL_H;
      var cw = CELL_W - 4, ch = CELL_H - 4;

      if (cell.dirty) {
        // Dirty cell: show smear pattern
        var dirtyAlpha = 0.7 + 0.1 * Math.sin(cell.phase * 2.5);
        game.draw.rect(cx + 2, cy + 2, cw, ch, C.dirt, dirtyAlpha);
        // Smear highlights
        game.draw.circle(cx + 10 + Math.sin(cell.phase) * 20, cy + 10, 12, C.dirtHi, 0.4);
        game.draw.circle(cx + cw - 20, cy + ch * 0.6, 8, C.dirtHi, 0.3);
      } else {
        // Clean cell: show the letter
        game.draw.rect(cx + 2, cy + 2, cw, ch, C.clean, 0.08);
        var cl2 = cellLetters[gi2];
        var lCol = cl2.isAnswer ? C.letter : '#ffffff55';
        game.draw.text(cl2.letter, cx + CELL_W / 2, cy + CELL_H / 2 + 16, { size: 60, color: lCol, bold: true });
      }

      // Cell border
      game.draw.rect(cx, cy, 2, CELL_H, '#ffffff11', 1);
      game.draw.rect(cx, cy, CELL_W, 2, '#ffffff11', 1);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.85, { size: 50, color: flashCol, bold: true });
    }

    game.draw.text('拭いて文字を探せ！', W / 2, H * 0.80, { size: 36, color: '#ffffff33' });

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newPuzzle();
    generateCellLetters();
  });
})(game);
