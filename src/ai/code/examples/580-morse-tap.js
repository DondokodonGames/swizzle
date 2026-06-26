// 580-morse-tap.js
// モールスタップ — 画面に表示されるモールス信号をタップで入力する
// 操作: 短タップ=dot、長タップ=dash（1秒以上）
// 成功: 8文字正解  失敗: 5文字ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020810',
    dot:     '#3b82f6',
    dotHi:   '#93c5fd',
    dash:    '#f59e0b',
    dashHi:  '#fcd34d',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#334455',
    signal:  '#00ddff',
    glow:    '#00ddff22'
  };

  var MORSE = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.',
    'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
    'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---',
    'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
    'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--',
    'Z': '--..'
  };

  var EASY_LETTERS = ['E', 'T', 'A', 'I', 'N', 'M', 'S', 'O', 'U', 'R'];

  var currentLetter = 'E';
  var currentMorse = '.';
  var userInput = '';
  var inputSymbols = []; // visual symbols entered
  var holding = false;
  var holdStart = 0;
  var holdIndicator = 0; // 0-1
  var DASH_THRESHOLD = 0.6;
  var consecutiveTimeout = 1.5; // time without input to submit
  var lastInputTime = -999;
  var correctCount = 0;
  var NEEDED = 8;
  var wrongCount = 0;
  var MAX_WRONG = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0;
  var resultText = '';

  function nextLetter() {
    var pool = EASY_LETTERS;
    currentLetter = pool[Math.floor(Math.random() * pool.length)];
    currentMorse = MORSE[currentLetter];
    userInput = '';
    inputSymbols = [];
    lastInputTime = elapsed;
  }

  function checkInput() {
    if (userInput === currentMorse) {
      correctCount++;
      flashCol = C.correct;
      flashAnim = 0.4;
      resultText = '正解!';
      resultTimer = 0.8;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5, col: C.correct });
      }
      if (correctCount >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correctCount * 500 + Math.ceil(timeLeft) * 80); }, 800);
      } else {
        setTimeout(function() { if (!done) nextLetter(); }, 900);
      }
    } else {
      wrongCount++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = '×';
      resultTimer = 0.7;
      game.audio.play('se_failure', 0.4);
      if (wrongCount >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        setTimeout(function() { if (!done) nextLetter(); }, 900);
      }
    }
    userInput = '';
    inputSymbols = [];
  }

  game.onTap(function(tx, ty) {
    // Handled via hold detection in onUpdate
  });

  // Use hold detection pattern via press/release
  var pressTime = -1;
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || resultTimer > 0) return;
    // Swipe up = dash, swipe down = dot (quick alternative)
    var sym = dir === 'up' ? '-' : '.';
    userInput += sym;
    inputSymbols.push({ sym: sym, t: 0.8 });
    lastInputTime = elapsed;
    game.audio.play('se_tap', sym === '-' ? 0.3 : 0.2);
    if (userInput.length >= currentMorse.length) {
      checkInput();
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

    // Check input timeout
    if (userInput.length > 0 && resultTimer <= 0) {
      var timeSince = elapsed - lastInputTime;
      if (timeSince > consecutiveTimeout) {
        checkInput();
      }
    }

    // Update symbol animations
    for (var si = inputSymbols.length - 1; si >= 0; si--) {
      inputSymbols[si].t -= dt * 1.5;
      if (inputSymbols[si].t <= 0) inputSymbols.splice(si, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // CRT scanline effect
    for (var li = 0; li < H; li += 6) {
      game.draw.line(0, li, W, li, '#000033', 0.15);
    }

    // Morse display for current letter
    var morseY = H * 0.28;
    game.draw.text(currentLetter, W / 2, H * 0.18, { size: 120, color: C.signal, bold: true });

    var morseX = W / 2 - currentMorse.length * 30;
    for (var mi = 0; mi < currentMorse.length; mi++) {
      var sym = currentMorse[mi];
      var mx = W / 2 + (mi - currentMorse.length / 2 + 0.5) * 80;
      if (sym === '.') {
        game.draw.circle(mx, morseY, 22, C.dot, 0.8);
        game.draw.circle(mx, morseY, 26, C.dotHi, 0.2);
      } else {
        game.draw.rect(mx - 40, morseY - 14, 80, 28, C.dash, 0.8);
        game.draw.rect(mx - 40, morseY - 14, 80, 8, C.dashHi, 0.3);
      }
    }

    // User input display
    var inputY = H * 0.5;
    game.draw.text('入力:', W / 2 - 160, inputY + 14, { size: 36, color: C.ui });
    for (var ii = 0; ii < userInput.length; ii++) {
      var isym = userInput[ii];
      var ix = W / 2 - (userInput.length - 1) * 44 + ii * 88;
      if (isym === '.') {
        game.draw.circle(ix, inputY, 26, C.dotHi, 0.9);
      } else {
        game.draw.rect(ix - 40, inputY - 14, 80, 28, C.dashHi, 0.9);
      }
    }

    // Controls hint
    game.draw.text('上スワイプ = ー', W / 2, H * 0.63, { size: 36, color: C.ui });
    game.draw.text('下スワイプ = ・', W / 2, H * 0.69, { size: 36, color: C.ui });

    // Tap buttons
    var btnY = H * 0.77;
    game.draw.circle(W / 2 - 140, btnY, 68, C.dotHi, 0.15 + Math.sin(elapsed * 4) * 0.05);
    game.draw.circle(W / 2 - 140, btnY, 56, C.dot, 0.6);
    game.draw.text('・', W / 2 - 140, btnY + 18, { size: 50, color: '#fff', bold: true });

    game.draw.rect(W / 2 + 60, btnY - 30, 160, 60, C.dash, 0.6);
    game.draw.rect(W / 2 + 60, btnY - 30, 160, 16, C.dashHi, 0.3);
    game.draw.text('ー', W / 2 + 140, btnY + 12, { size: 44, color: '#fff', bold: true });

    // Result
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.42, { size: 90, color: flashCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 50 + wi * 100, H * 0.955, 20, wi < wrongCount ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correctCount + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.signal : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    nextLetter();
  });
})(game);
