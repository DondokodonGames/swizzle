// 692-pin-pad.js
// PINパッド — 3×3グリッドで光ったマスを正確に再現せよ
// 操作: タップで記憶したパターンを入力
// 成功: 15問正解  失敗: 5回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var GRID = 3;
  var CELL = 240;
  var GAP = 16;
  var GRID_W = GRID * CELL + (GRID - 1) * GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = H * 0.35;

  var C = {
    bg:      '#040210',
    cellOff: '#0d0a24',
    cellOn:  '#6d28d9',
    cellHi:  '#a78bfa',
    cellDim: '#1e1b4b',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#070415'
  };

  function cx(c) { return GRID_X + c * (CELL + GAP); }
  function cy(r) { return GRID_Y + r * (CELL + GAP); }

  var pattern = [];
  var seqLen = 4;
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_DUR = 0.5;
  var phase = 'show'; // 'show' | 'input' | 'wait'
  var inputSeq = [];
  var litCell = -1;

  var correct = 0;
  var NEEDED = 15;
  var errors = 0;
  var MAX_ERR = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var tapFlashCell = -1;
  var tapFlashTimer = 0;

  function newPattern() {
    seqLen = Math.min(4 + Math.floor(correct / 3), 8);
    pattern = [];
    var last = -1;
    for (var i = 0; i < seqLen; i++) {
      var c;
      do { c = Math.floor(Math.random() * 9); } while (c === last);
      pattern.push(c);
      last = c;
    }
    showIdx = 0;
    showTimer = 0.5;
    litCell = -1;
    inputSeq = [];
    phase = 'show';
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'input') return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP));
    var row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var localX = (tx - GRID_X) - col * (CELL + GAP);
    var localY = (ty - GRID_Y) - row * (CELL + GAP);
    if (localX > CELL || localY > CELL) return;

    var cell = row * GRID + col;
    tapFlashCell = cell;
    tapFlashTimer = 0.22;
    inputSeq.push(cell);
    game.audio.play('se_tap', 0.1);

    // Check correctness
    var idx = inputSeq.length - 1;
    if (inputSeq[idx] !== pattern[idx]) {
      // Wrong
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = '間違い！';
      resultTimer = 0.6;
      game.audio.play('se_failure', 0.4);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        phase = 'wait';
        setTimeout(newPattern, 800);
      }
    } else if (inputSeq.length >= pattern.length) {
      // Correct!
      correct++;
      flashCol = C.correct;
      flashAnim = 0.35;
      resultText = '正解！';
      resultTimer = 0.6;
      game.audio.play('se_success', 0.65);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: GRID_Y + GRID_W / 2, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.cellHi });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correct * 400 + Math.ceil(timeLeft) * 60); }, 700);
      } else {
        phase = 'wait';
        setTimeout(newPattern, 700);
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

    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        if (showIdx < pattern.length) {
          litCell = pattern[showIdx];
          showIdx++;
          showTimer = SHOW_DUR;
        } else {
          litCell = -1;
          phase = 'input';
        }
      } else if (showTimer < 0.12 && showIdx > 0) {
        litCell = -1;
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Phase label
    var phaseStr = phase === 'show' ? '記憶せよ' : (phase === 'input' ? '入力！' : '...');
    var phaseCol = phase === 'input' ? C.correct : '#ffffff55';
    game.draw.text(phaseStr, W / 2, GRID_Y - 90, { size: 48, color: phaseCol, bold: true });

    // Sequence progress
    for (var si = 0; si < pattern.length; si++) {
      var dotCol2 = '#1e293b';
      if (phase === 'show' && si < showIdx) dotCol2 = C.cellHi;
      else if (phase === 'input' && si < inputSeq.length) dotCol2 = inputSeq[si] === pattern[si] ? C.correct : C.wrong;
      var dX = W / 2 - (pattern.length - 1) * 30 + si * 60;
      game.draw.circle(dX, GRID_Y - 140, 16, dotCol2, 0.9);
    }

    // Grid
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cell2 = r * GRID + c;
        var isLit = cell2 === litCell;
        var isTapFlash = cell2 === tapFlashCell && tapFlashTimer > 0;
        var isInputDone = phase === 'input' && inputSeq.indexOf(cell2) >= 0;

        var cX = cx(c);
        var cY2 = cy(r);
        var bCol = isLit ? C.cellOn : (isTapFlash ? C.cellHi : (isInputDone ? C.cellDim : C.cellOff));
        var bAlpha = isLit ? 1.0 : (isTapFlash ? 0.9 : 0.85);

        game.draw.rect(cX + 4, cY2 + 4, CELL, CELL, '#000', 0.25);
        game.draw.rect(cX, cY2, CELL, CELL, bCol, bAlpha);
        if (isLit) {
          game.draw.rect(cX - 5, cY2 - 5, CELL + 10, CELL + 10, C.cellHi, 0.2);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 64, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 60 + ei * 120, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newPattern();
  });
})(game);
