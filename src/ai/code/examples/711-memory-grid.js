// 711-memory-grid.js
// 記憶グリッド — 一瞬光った複数のマスを記憶して全部タップせよ
// 操作: タップでマスを選択
// 成功: 15問クリア  失敗: 6回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06040e',
    cellOff: '#0f0d26',
    cellOn:  '#7c3aed',
    cellHi:  '#a78bfa',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0818'
  };

  var COLS = 4;
  var ROWS = 5;
  var CELL = 220;
  var GAP = 16;
  var GRID_W = COLS * CELL + (COLS - 1) * GAP;
  var GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = 240;

  var phase = 'show'; // 'show' | 'input'
  var litCells = [];
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_DUR = 0.45;
  var inputTapped = [];
  var round = 0;
  var NEEDED = 15;
  var errors = 0;
  var MAX_ERR = 6;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var tapFlash = -1, tapFlashTimer = 0;
  var waitTimer = 0;
  var cellGlow = [];
  for (var ci = 0; ci < COLS * ROWS; ci++) cellGlow.push(0);

  function newRound() {
    round++;
    var count = 2 + Math.min(5, Math.floor((round - 1) / 2));
    litCells = [];
    while (litCells.length < count) {
      var c = Math.floor(Math.random() * COLS * ROWS);
      if (litCells.indexOf(c) < 0) litCells.push(c);
    }
    showIdx = 0;
    showTimer = 0.4;
    phase = 'show';
    inputTapped = [];
    tapFlash = -1;
    waitTimer = 0;
    for (var gi = 0; gi < cellGlow.length; gi++) cellGlow[gi] = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'input') return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP));
    var row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    var lx = (tx - GRID_X) - col * (CELL + GAP);
    var ly = (ty - GRID_Y) - row * (CELL + GAP);
    if (lx > CELL || ly > CELL) return;

    var idx = row * COLS + col;
    if (inputTapped.indexOf(idx) >= 0) return; // already tapped
    inputTapped.push(idx);
    tapFlash = idx;
    tapFlashTimer = 0.22;
    cellGlow[idx] = 0.5;

    if (litCells.indexOf(idx) >= 0) {
      game.audio.play('se_tap', 0.12);
      if (inputTapped.length === litCells.length) {
        // All found!
        flashCol = C.correct;
        flashAnim = 0.35;
        resultText = '全部正解！';
        resultTimer = 0.6;
        game.audio.play('se_success', 0.65);
        for (var p = 0; p < 6; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H / 2, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.cellHi });
        }
        if (round >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(round * 450 + Math.ceil(timeLeft) * 70); }, 700);
        } else {
          waitTimer = 0.8;
        }
      }
    } else {
      // Wrong tap
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = 'ミス！';
      resultTimer = 0.6;
      game.audio.play('se_failure', 0.35);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        // Show correct answer briefly
        phase = 'show';
        showIdx = litCells.length; // trigger instant reveal
        waitTimer = 1.0;
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (tapFlashTimer > 0) tapFlashTimer -= dt * 4;

    for (var gi = 0; gi < cellGlow.length; gi++) {
      if (cellGlow[gi] > 0) cellGlow[gi] -= dt * 3;
    }

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) newRound();
    }

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        if (showIdx < litCells.length) {
          cellGlow[litCells[showIdx]] = 1.0;
          showIdx++;
          showTimer = SHOW_DUR;
        } else {
          phase = 'input';
          for (var gi2 = 0; gi2 < cellGlow.length; gi2++) cellGlow[gi2] = 0;
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    var phaseStr = phase === 'show' ? '記憶せよ！' : ('あと ' + (litCells.length - inputTapped.length) + ' マス');
    var phaseCol = phase === 'input' ? C.correct : '#ffffff66';
    game.draw.text(phaseStr, W / 2, GRID_Y - 80, { size: 48, color: phaseCol, bold: true });

    // Grid
    for (var row2 = 0; row2 < ROWS; row2++) {
      for (var col2 = 0; col2 < COLS; col2++) {
        var idx2 = row2 * COLS + col2;
        var cx = GRID_X + col2 * (CELL + GAP);
        var cy = GRID_Y + row2 * (CELL + GAP);
        var glow = cellGlow[idx2];
        var isTap = idx2 === tapFlash && tapFlashTimer > 0;
        var isFound = phase === 'input' && inputTapped.indexOf(idx2) >= 0 && litCells.indexOf(idx2) >= 0;
        var isWrong = phase === 'input' && inputTapped.indexOf(idx2) >= 0 && litCells.indexOf(idx2) < 0;

        var bCol, bAlpha;
        if (glow > 0.5) { bCol = C.cellOn; bAlpha = 0.9; }
        else if (isTap) { bCol = C.cellHi; bAlpha = 0.85; }
        else if (isFound) { bCol = C.correct; bAlpha = 0.7; }
        else if (isWrong) { bCol = C.wrong; bAlpha = 0.7; }
        else { bCol = C.cellOff; bAlpha = 0.8; }

        game.draw.rect(cx + 3, cy + 3, CELL, CELL, '#000', 0.2);
        game.draw.rect(cx, cy, CELL, CELL, bCol, bAlpha);
        if (glow > 0.5) {
          game.draw.rect(cx - 6, cy - 6, CELL + 12, CELL + 12, C.cellHi, glow * 0.25);
        }
      }
    }

    // Progress dots for how many to find
    for (var di = 0; di < litCells.length; di++) {
      var found = inputTapped.indexOf(litCells[di]) >= 0;
      var dx = W / 2 - (litCells.length - 1) * 30 + di * 60;
      game.draw.circle(dx, GRID_Y + GRID_H + 70, 16, found ? C.correct : '#334155', 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.91, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 50 + ei * 100, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(round + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
