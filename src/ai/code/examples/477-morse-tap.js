// 477-morse-tap.js
// モールス符号 — 短タップ(・)と長押し(－)を組み合わせてモールス符号を入力
// 操作: 短タップ=ドット、ロングプレス=ダッシュ
// 成功: 10文字入力  失敗: 5ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020c08',
    panel:  '#051a0e',
    dot:    '#22c55e',
    dash:   '#4ade80',
    off:    '#14532d',
    correct:'#86efac',
    wrong:  '#ef4444',
    current:'#fbbf24',
    text:   '#f1f5f9',
    ui:     '#374151',
    glow:   '#dcfce7'
  };

  // Simple morse: letter → pattern
  var MORSE = {
    'A': '・－',
    'B': '－・・・',
    'C': '－・－・',
    'D': '－・・',
    'E': '・',
    'F': '・・－・',
    'G': '－－・',
    'H': '・・・・',
    'I': '・・',
    'J': '・－－－',
    'K': '－・－',
    'L': '・－・・',
    'M': '－－',
    'N': '－・',
    'O': '－－－',
    'P': '・－－・',
    'R': '・－・',
    'S': '・・・',
    'T': '－',
    'U': '・・－'
  };

  var LETTERS = Object.keys(MORSE);
  var sequence = [];
  var seqIdx = 0;
  var correct = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.correct;
  var resultText = '';
  var resultLife = 0;

  var holdStart = 0;
  var isHolding = false;
  var LONG_THRESHOLD = 0.4; // seconds
  var inputBuffer = '';  // current input for this letter
  var inputTimer = 0;    // time since last tap (to detect end of letter)
  var INPUT_TIMEOUT = 1.2; // seconds to finalize letter input
  var inputDots = [];    // visual dots/dashes entered

  function getNewLetter() {
    return LETTERS[Math.floor(Math.random() * LETTERS.length)];
  }

  function refillSequence() {
    for (var i = 0; i < 5; i++) {
      sequence.push(getNewLetter());
    }
  }

  function addSymbol(symbol) {
    inputBuffer += symbol;
    inputDots.push({ sym: symbol, life: 1.5 });
    inputTimer = 0;
    game.audio.play('se_tap', symbol === '・' ? 0.3 : 0.5);
  }

  function finalizeInput() {
    if (inputBuffer === '') return;
    var target = sequence[seqIdx % sequence.length];
    var targetPattern = MORSE[target];
    if (inputBuffer === targetPattern) {
      correct++;
      resultText = target + ' 正解！';
      flashCol = C.correct;
      flashAnim = 0.5;
      game.audio.play('se_success', 0.6);
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H * 0.6, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.6, col: C.dot });
      }
      seqIdx++;
      if (seqIdx >= sequence.length - 2) refillSequence();
      if (correct >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correct * 500 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      misses++;
      resultText = '×  ' + inputBuffer + ' ≠ ' + MORSE[target];
      flashCol = C.wrong;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    resultLife = 1.2;
    inputBuffer = '';
    inputDots = [];
    inputTimer = 0;
  }

  game.onTap(function(tx, ty) {
    // Short tap = dot (handled by tap end)
    if (done) return;
    if (!isHolding) {
      addSymbol('・');
    }
  });

  game.onHold(function(tx, ty, duration) {
    if (done) return;
    isHolding = false;
    addSymbol('－');
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
    if (resultLife > 0) resultLife -= dt * 1.2;

    // Check timeout to finalize
    if (inputBuffer !== '') {
      inputTimer += dt;
      if (inputTimer >= INPUT_TIMEOUT) {
        finalizeInput();
      }
    }

    // Decay input dots
    for (var id = inputDots.length - 1; id >= 0; id--) {
      inputDots[id].life -= dt * 0.5;
      if (inputDots[id].life <= 0) inputDots.splice(id, 1);
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(80, H * 0.2, W - 160, H * 0.58, C.panel, 0.9);

    // Target letter
    var target2 = sequence[seqIdx % sequence.length];
    game.draw.text(target2, W / 2, H * 0.33, { size: 200, color: C.current, bold: true });
    game.draw.text(MORSE[target2], W / 2, H * 0.5, { size: 60, color: C.ui });

    // Input display
    var inputDisplay = inputBuffer || '___';
    game.draw.text(inputDisplay, W / 2, H * 0.62, { size: 80, color: C.dash, bold: true });

    // Input timer bar
    if (inputBuffer !== '') {
      var timerRatio = 1 - inputTimer / INPUT_TIMEOUT;
      game.draw.rect(W * 0.1, H * 0.68, W * 0.8 * timerRatio, 12, C.dot, 0.7);
    }

    // Result feedback
    if (resultLife > 0) {
      game.draw.text(resultText, W / 2, H * 0.78, { size: 44, color: flashAnim > 0 ? flashCol : C.ui, bold: true });
    }

    // Instruction
    game.draw.text('短＝・  長押し＝－', W / 2, H * 0.85, { size: 36, color: C.ui });

    // Next letters preview
    for (var ni = 1; ni <= 3; ni++) {
      var nLetter = sequence[(seqIdx + ni) % sequence.length];
      game.draw.text(nLetter, W * 0.15 + ni * (W * 0.22), H * 0.15, { size: 52, color: C.off });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 50 + mi * 100, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.dot : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    refillSequence();
  });
})(game);
