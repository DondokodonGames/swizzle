// 311-escape-room.js
// 脱出パズル — 3つの謎を解いて部屋から脱出する暗号解読ゲーム
// 操作: 正しい数字の組み合わせをタップで選ぶ
// 成功: 3つの謎を全部解く  失敗: 5回間違い or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0805',
    room:    '#1c1410',
    roomHi:  '#2d1f15',
    panel:   '#2d1f15',
    panelHi: '#3d2a1c',
    digit:   '#f59e0b',
    digitHi: '#fde68a',
    digitSel:'#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    lock:    '#475569',
    lockHi:  '#64748b',
    clue:    '#60a5fa',
    clueHi:  '#93c5fd',
    ui:      '#94a3b8',
    text:    '#f1f5f9'
  };

  // Puzzle definitions
  var PUZZLES = [
    { clue: '赤×青=?  赤=3, 青=4', answer: [1, 2], digits: 2, hint: '掛け算' },
    { clue: '1+2+3+4+5=?', answer: [1, 5], digits: 2, hint: '合計' },
    { clue: '7-3=? 答えを入れろ', answer: [4], digits: 1, hint: '引き算' },
    { clue: '3²=?', answer: [9], digits: 1, hint: '二乗' },
    { clue: '猫は何本足? 答えは一桁', answer: [4], digits: 1, hint: '足の数' },
    { clue: '月は何個? 地球を回る月', answer: [1], digits: 1, hint: '知識' },
    { clue: '2×2×2=?', answer: [8], digits: 1, hint: 'キューブ' },
    { clue: '10-7+2=?', answer: [5], digits: 1, hint: '計算' }
  ];

  var puzzleOrder = [];
  var currentPuzzleIdx = 0;
  var solved = 0;
  var NEEDED = 3;
  var errors = 0;
  var MAX_ERR = 5;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];

  var selectedDigits = []; // digits being entered
  var flashCorrect = 0;
  var flashWrong = 0;
  var shakeAnim = 0;

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function initPuzzles() {
    puzzleOrder = shuffle(PUZZLES.slice(0, 8)).slice(0, 5);
  }

  function currentPuzzle() {
    return puzzleOrder[currentPuzzleIdx];
  }

  function checkAnswer() {
    var puzzle = currentPuzzle();
    var correct = true;
    if (selectedDigits.length !== puzzle.answer.length) correct = false;
    else {
      for (var i = 0; i < puzzle.answer.length; i++) {
        if (selectedDigits[i] !== puzzle.answer[i]) { correct = false; break; }
      }
    }
    if (correct) {
      flashCorrect = 1.0;
      solved++;
      game.audio.play('se_success', 0.6);
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.55, vx: Math.cos(ang) * 280, vy: Math.sin(ang) * 280, life: 0.8, col: C.correct });
      }
      if (solved >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(solved * 600 + Math.ceil(timeLeft) * 100); }, 600);
        return;
      }
      currentPuzzleIdx = (currentPuzzleIdx + 1) % puzzleOrder.length;
      selectedDigits = [];
    } else {
      errors++;
      flashWrong = 0.6;
      shakeAnim = 0.3;
      game.audio.play('se_failure', 0.5);
      selectedDigits = [];
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  }

  // Digit buttons: 0-9 in 2 rows
  var BTN_W = 160, BTN_H = 100;
  var BTN_ROWS = [
    [1,2,3,4,5],
    [6,7,8,9,0]
  ];

  game.onTap(function(tx, ty) {
    if (done) return;
    var puzzle = currentPuzzle();

    // Check digit buttons
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 5; col++) {
        var bx = W * 0.05 + col * (BTN_W + 16);
        var by = H * 0.75 + row * (BTN_H + 20);
        if (tx >= bx && tx <= bx + BTN_W && ty >= by && ty <= by + BTN_H) {
          var digit = BTN_ROWS[row][col];
          selectedDigits.push(digit);
          game.audio.play('se_tap', 0.2);
          if (selectedDigits.length >= puzzle.digits) {
            checkAnswer();
          }
          return;
        }
      }
    }

    // Clear button
    var clrX = W * 0.7, clrY = H * 0.68;
    if (tx >= clrX - 60 && tx <= clrX + 60 && ty >= clrY - 30 && ty <= clrY + 30) {
      selectedDigits = [];
      game.audio.play('se_tap', 0.1);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashCorrect > 0) flashCorrect -= dt * 1.5;
    if (flashWrong > 0) flashWrong -= dt * 2;
    if (shakeAnim > 0) shakeAnim -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    var shakeX = shakeAnim > 0 ? Math.sin(shakeAnim * 40) * 12 : 0;
    game.draw.rect(0, 0, W, H, C.bg);

    // Room background
    game.draw.rect(W * 0.05, H * 0.12, W * 0.9, H * 0.64, C.room, 0.9);
    game.draw.rect(W * 0.05, H * 0.12, W * 0.9, 16, C.roomHi, 0.6);

    // Flash overlays
    if (flashCorrect > 0) game.draw.rect(0, 0, W, H, C.correct, flashCorrect * 0.25);
    if (flashWrong > 0) game.draw.rect(shakeX, 0, W, H, C.wrong, flashWrong * 0.3);

    // Clue panel
    var puzzle2 = currentPuzzle();
    game.draw.rect(W * 0.1 + shakeX, H * 0.2, W * 0.8, H * 0.24, C.panel, 0.9);
    game.draw.rect(W * 0.1 + shakeX, H * 0.2, W * 0.8, 10, C.clue, 0.6);
    game.draw.text(puzzle2.clue, W / 2 + shakeX, H * 0.31, { size: 42, color: C.clueHi, bold: true });
    game.draw.text('ヒント: ' + puzzle2.hint, W / 2 + shakeX, H * 0.41, { size: 32, color: C.ui });

    // Solved indicator
    game.draw.text('謎 ' + (currentPuzzleIdx + 1) + ' / ' + puzzleOrder.length, W * 0.15, H * 0.2, { size: 30, color: C.clue });

    // Answer display
    game.draw.rect(W * 0.25 + shakeX, H * 0.5, W * 0.5, 70, C.panelHi, 0.9);
    var displayStr = '';
    for (var di = 0; di < puzzle2.digits; di++) {
      displayStr += (di < selectedDigits.length ? selectedDigits[di] : '_') + ' ';
    }
    game.draw.text(displayStr.trim(), W / 2 + shakeX, H * 0.54, { size: 56, color: C.digitHi, bold: true });

    // Clear button
    game.draw.rect(W * 0.7 - 60, H * 0.68 - 30, 120, 60, C.lock, 0.8);
    game.draw.text('クリア', W * 0.7, H * 0.68 + 10, { size: 34, color: C.text, bold: true });

    // Digit buttons
    for (var row2 = 0; row2 < 2; row2++) {
      for (var col2 = 0; col2 < 5; col2++) {
        var bx2 = W * 0.05 + col2 * (BTN_W + 16);
        var by2 = H * 0.75 + row2 * (BTN_H + 20);
        var digit2 = BTN_ROWS[row2][col2];
        game.draw.rect(bx2, by2, BTN_W, BTN_H, C.panel, 0.9);
        game.draw.rect(bx2, by2, BTN_W, 10, C.lockHi, 0.5);
        game.draw.text(digit2 + '', bx2 + BTN_W / 2, by2 + BTN_H * 0.65, { size: 52, color: C.digit, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Progress
    game.draw.text(solved + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    // Error dots
    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 20 + ei * 40, H * 0.97, 12, ei < errors ? C.wrong : '#0a0805');
    }

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.clue : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    initPuzzles();
  });
})(game);
