// 164-morse-code.js
// モールス信号 — 点と線の組み合わせを解読して文字を当てる暗号ゲーム
// 操作: タップで点(短押し)・線(長押し)を入力... 実装: タップ左=点 右=線
// 成功: 8文字正解  失敗: 3回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080a',
    dot:     '#06b6d4',
    dotHi:   '#67e8f9',
    dash:    '#0891b2',
    panel:   '#0c2230',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155',
    gold:    '#f59e0b'
  };

  var MORSE = {
    'A': ['•', '—'],
    'B': ['—', '•', '•', '•'],
    'C': ['—', '•', '—', '•'],
    'D': ['—', '•', '•'],
    'E': ['•'],
    'F': ['•', '•', '—', '•'],
    'G': ['—', '—', '•'],
    'H': ['•', '•', '•', '•'],
    'I': ['•', '•'],
    'J': ['•', '—', '—', '—'],
    'K': ['—', '•', '—'],
    'L': ['•', '—', '•', '•'],
    'M': ['—', '—'],
    'N': ['—', '•'],
    'O': ['—', '—', '—'],
    'P': ['•', '—', '—', '•'],
    'R': ['•', '—', '•'],
    'S': ['•', '•', '•'],
    'T': ['—'],
    'U': ['•', '•', '—'],
    'V': ['•', '•', '•', '—'],
    'W': ['•', '—', '—']
  };
  var LETTERS = Object.keys(MORSE);

  var currentLetter = '';
  var currentCode = [];
  var inputCode = [];
  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 45;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var signalT = 0; // for animated signal display
  var displayIdx = 0;
  var displayTimer = 0;
  var DISPLAY_INTERVAL = 0.5;
  var showingCode = true;

  function newRound() {
    currentLetter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    currentCode = MORSE[currentLetter];
    inputCode = [];
    showingCode = true;
    displayIdx = 0;
    displayTimer = 0.8;
    signalT = 0;
  }

  function checkAnswer() {
    if (inputCode.length !== currentCode.length) return false;
    for (var i = 0; i < currentCode.length; i++) {
      if (inputCode[i] !== currentCode[i]) return false;
    }
    return true;
  }

  game.onTap(function(tx) {
    if (done || showingCode) return;
    var isDash = tx >= W / 2;
    inputCode.push(isDash ? '—' : '•');
    game.audio.play('se_tap', 0.4);

    if (inputCode.length === currentCode.length) {
      // Check
      if (checkAnswer()) {
        score++;
        feedbackOk = true; feedback = 0.7;
        game.audio.play('se_success');
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 100 + Math.ceil(timeLeft) * 25); }, 700);
          return;
        }
        setTimeout(function() { newRound(); }, 750);
      } else {
        misses++;
        feedbackOk = false; feedback = 0.6;
        game.audio.play('se_failure');
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
        setTimeout(function() { newRound(); }, 700);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;
    signalT += dt;

    if (showingCode) {
      displayTimer -= dt;
      if (displayTimer <= 0) {
        displayIdx++;
        if (displayIdx >= currentCode.length) {
          showingCode = false;
        } else {
          displayTimer = DISPLAY_INTERVAL;
          game.audio.play('se_tap', currentCode[displayIdx] === '•' ? 0.3 : 0.5);
        }
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Signal display panel
    var panelY = H * 0.25;
    game.draw.rect(80, panelY - 80, W - 160, 160, C.panel, 0.9);
    game.draw.rect(80, panelY - 80, W - 160, 8, C.dotHi, 0.3);

    // Show morse signal being played
    var codeLen = currentCode.length;
    var symbolW = 80;
    var totalW = codeLen * symbolW + (codeLen - 1) * 20;
    var startX = W / 2 - totalW / 2;
    for (var ci = 0; ci < codeLen; ci++) {
      var symX = startX + ci * (symbolW + 20) + symbolW / 2;
      var isActive = showingCode && ci === displayIdx;
      var wasShown = !showingCode || ci < displayIdx;
      var alpha = wasShown ? 0.85 : (isActive ? 0.95 : 0.2);
      var sym = currentCode[ci];
      if (sym === '•') {
        game.draw.circle(symX, panelY, isActive ? 32 : 24, C.dotHi, alpha);
      } else {
        game.draw.rect(symX - 48, panelY - 16, 96, 32, C.dotHi, alpha);
      }
    }

    // Letter answer (shown after success/fail)
    if (feedback > 0 && !feedbackOk) {
      game.draw.text(currentLetter, W / 2, panelY - 140, { size: 72, color: C.wrong, bold: true });
    }

    // Input buttons
    var btnY = H * 0.55;
    var btnH = 200;
    // Dot button (left)
    game.draw.rect(60, btnY, W / 2 - 80, btnH, C.panel, 0.8);
    game.draw.rect(60, btnY, W / 2 - 80, 8, C.dotHi, 0.5);
    game.draw.circle(W / 4, btnY + btnH / 2, 40, C.dotHi, 0.9);
    game.draw.text('点 (•)', W / 4, btnY + btnH / 2 + 70, { size: 40, color: C.dotHi });

    // Dash button (right)
    game.draw.rect(W / 2 + 20, btnY, W / 2 - 80, btnH, C.panel, 0.8);
    game.draw.rect(W / 2 + 20, btnY, W / 2 - 80, 8, C.dotHi, 0.5);
    game.draw.rect(W * 0.63, btnY + btnH / 2 - 16, 200, 32, C.dotHi, 0.9);
    game.draw.text('線 (—)', W * 0.75, btnY + btnH / 2 + 70, { size: 40, color: C.dotHi });

    // Player input so far
    var inputY = H * 0.74;
    game.draw.text('入力済み:', W / 2, inputY, { size: 36, color: C.ui });
    var inTotalW = inputCode.length * 80;
    var inStartX = W / 2 - inTotalW / 2;
    for (var ii = 0; ii < inputCode.length; ii++) {
      var inX = inStartX + ii * 80 + 40;
      if (inputCode[ii] === '•') {
        game.draw.circle(inX, inputY + 60, 24, C.correct, 0.85);
      } else {
        game.draw.rect(inX - 40, inputY + 48, 80, 24, C.correct, 0.85);
      }
    }
    // Remaining slots
    for (var ri = inputCode.length; ri < currentCode.length; ri++) {
      var rX = inStartX + ri * 80 + 40;
      game.draw.circle(rX, inputY + 60, 8, C.ui, 0.4);
    }

    if (showingCode) {
      game.draw.text('信号を読め！', W / 2, H * 0.87, { size: 46, color: C.dotHi, bold: true });
    } else {
      game.draw.text('左=点  右=線', W / 2, H * 0.87, { size: 42, color: C.ui });
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.14);
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 + (mi - 1) * 52, 218, 18, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.dot : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    setTimeout(function() { newRound(); }, 500);
  });
})(game);
