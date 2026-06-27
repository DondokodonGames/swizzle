// 703-reaction-chain.js
// 連鎖反応 — 光ったセルを次々タップしてチェーンをつなげ
// 操作: タップで光ったセルをタッチ
// 成功: 30チェーン  失敗: チェーンが途切れる5回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030410',
    cellOff: '#0a0c24',
    cellOn:  '#f59e0b',
    cellHi:  '#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#05060f'
  };

  var COLS = 5;
  var ROWS = 7;
  var CELL = 170;
  var GAP = 12;
  var GRID_W = COLS * CELL + (COLS - 1) * GAP;
  var GRID_H = ROWS * CELL + (ROWS - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = (H - GRID_H) / 2 + 60;

  var activeCell = -1;
  var activeLit = 0;
  var WINDOW = 0.7; // time to tap before cell goes dark
  var chainLen = 0;
  var NEEDED = 30;
  var breaks = 0;
  var MAX_BREAK = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var cells = []; // flash state per cell
  var tapFlash = -1;
  var tapFlashTimer = 0;
  var comboText = '';
  var comboTimer = 0;

  for (var ci = 0; ci < COLS * ROWS; ci++) cells.push(0);

  function cellCX(idx) {
    var col = idx % COLS;
    return GRID_X + col * (CELL + GAP) + CELL / 2;
  }
  function cellCY(idx) {
    var row = Math.floor(idx / COLS);
    return GRID_Y + row * (CELL + GAP) + CELL / 2;
  }

  function lightNext() {
    // Pick a cell adjacent to active, or random if no active
    var candidates = [];
    if (activeCell >= 0) {
      var col = activeCell % COLS;
      var row = Math.floor(activeCell / COLS);
      if (col > 0) candidates.push(activeCell - 1);
      if (col < COLS - 1) candidates.push(activeCell + 1);
      if (row > 0) candidates.push(activeCell - COLS);
      if (row < ROWS - 1) candidates.push(activeCell + COLS);
    }
    if (candidates.length === 0) {
      for (var i = 0; i < COLS * ROWS; i++) candidates.push(i);
    }
    // Exclude currently active
    candidates = candidates.filter(function(c) { return c !== activeCell; });
    activeCell = candidates[Math.floor(Math.random() * candidates.length)];
    activeLit = WINDOW;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP));
    var row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    var localX = (tx - GRID_X) - col * (CELL + GAP);
    var localY = (ty - GRID_Y) - row * (CELL + GAP);
    if (localX > CELL || localY > CELL) return;

    var tappedCell = row * COLS + col;
    tapFlash = tappedCell;
    tapFlashTimer = 0.2;

    if (tappedCell === activeCell && activeLit > 0) {
      // Correct!
      chainLen++;
      flashCol = C.correct;
      flashAnim = 0.2;
      game.audio.play('se_tap', 0.1 + Math.min(0.2, chainLen * 0.005));
      cells[activeCell] = 0.5;
      for (var p = 0; p < 4; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: cellCX(activeCell), y: cellCY(activeCell), vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.35, col: C.cellHi });
      }
      activeLit = 0;
      activeCell = -1;

      if (chainLen >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(chainLen * 200 + Math.ceil(timeLeft) * 100); }, 700);
      } else {
        lightNext();
      }
    } else {
      // Wrong tap
      breaks++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = 'ミス！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (breaks >= MAX_BREAK && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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
    if (tapFlashTimer > 0) tapFlashTimer -= dt * 5;
    if (comboTimer > 0) comboTimer -= dt;

    for (var ci2 = 0; ci2 < cells.length; ci2++) {
      if (cells[ci2] > 0) cells[ci2] -= dt * 3;
    }

    if (!done && activeCell >= 0) {
      activeLit -= dt;
      if (activeLit <= 0) {
        // Time out = chain broken
        breaks++;
        game.audio.play('se_failure', 0.25);
        flashCol = C.wrong;
        flashAnim = 0.3;
        resultText = '遅い！';
        resultTimer = 0.5;
        activeLit = 0;
        activeCell = -1;
        if (breaks >= MAX_BREAK && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        } else {
          lightNext();
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var row2 = 0; row2 < ROWS; row2++) {
      for (var col2 = 0; col2 < COLS; col2++) {
        var idx = row2 * COLS + col2;
        var cx = GRID_X + col2 * (CELL + GAP);
        var cy = GRID_Y + row2 * (CELL + GAP);
        var isActive = idx === activeCell && activeLit > 0;
        var isTap = idx === tapFlash && tapFlashTimer > 0;
        var recentHit = cells[idx] > 0;

        var bgCol, bgAlpha;
        if (isActive) {
          var urgency = activeLit / WINDOW;
          bgCol = urgency > 0.4 ? C.cellOn : C.wrong;
          bgAlpha = 0.8 + 0.2 * Math.sin(elapsed * 15);
        } else if (isTap) {
          bgCol = C.cellHi;
          bgAlpha = 0.7;
        } else if (recentHit) {
          bgCol = C.correct;
          bgAlpha = cells[idx] * 0.6;
        } else {
          bgCol = C.cellOff;
          bgAlpha = 0.85;
        }

        game.draw.rect(cx + 3, cy + 3, CELL, CELL, '#000', 0.2);
        game.draw.rect(cx, cy, CELL, CELL, bgCol, bgAlpha);
        if (isActive) {
          // Countdown bar at bottom of cell
          var barW = (activeLit / WINDOW) * CELL;
          game.draw.rect(cx, cy + CELL - 10, barW, 10, C.cellHi, 0.8);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 56, color: flashCol, bold: true });
    }

    // Break indicators
    for (var bi = 0; bi < MAX_BREAK; bi++) {
      game.draw.circle(W / 2 - (MAX_BREAK - 1) * 52 + bi * 104, H * 0.955, 20, bi < breaks ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(chainLen + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    lightNext();
  });
})(game);
