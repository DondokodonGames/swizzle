// 320-bouncing-words.js
// バウンシングワーズ — 跳ね回る文字を集めて単語を完成させる
// 操作: タップして文字をキャッチ（アルファベット順に並べる）
// 成功: 8単語完成  失敗: 6回ミス or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f0a1e',
    letter: '#818cf8',
    letterHi:'#c7d2fe',
    correct:'#22c55e',
    correctHi:'#86efac',
    wrong:  '#ef4444',
    wrongHi:'#fca5a5',
    gold:   '#fbbf24',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var WORDS = ['CAT', 'DOG', 'SUN', 'MAP', 'CUP', 'RUN', 'FLY', 'ART', 'BOX', 'ZEN'];

  var currentWord = '';
  var collected = [];
  var letters = [];
  var wordsComplete = 0;
  var NEEDED = 8;
  var mistakes = 0;
  var MAX_MISTAKES = 6;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var wordFlash = 0;
  var wordFlashCol = C.correct;
  var wordIdx = 0;

  function spawnLetter(ch, isReal) {
    var speed = 180 + Math.random() * 120;
    var angle = Math.random() * Math.PI * 2;
    letters.push({
      ch: ch,
      x: 160 + Math.random() * (W - 320),
      y: H * 0.35 + Math.random() * H * 0.35,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 52,
      isReal: isReal
    });
  }

  function newWord() {
    currentWord = WORDS[wordIdx % WORDS.length];
    wordIdx++;
    collected = [];
    letters = [];
    // Spawn real letters + decoys
    for (var i = 0; i < currentWord.length; i++) {
      spawnLetter(currentWord[i], true);
    }
    // Add 2-3 decoy letters
    var alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var d = 0; d < 3; d++) {
      var decoy = alphabet[Math.floor(Math.random() * 26)];
      if (currentWord.indexOf(decoy) === -1) {
        spawnLetter(decoy, false);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    // Find tapped letter
    for (var li = letters.length - 1; li >= 0; li--) {
      var l = letters[li];
      if (Math.hypot(tx - l.x, ty - l.y) < l.r + 10) {
        // Check if this letter belongs in the word
        var nextNeeded = currentWord[collected.length];
        if (l.ch === nextNeeded) {
          collected.push(l.ch);
          letters.splice(li, 1);
          game.audio.play('se_tap', 0.3 + collected.length * 0.05);
          for (var pi = 0; pi < 4; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: l.x, y: l.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.letterHi });
          }
          if (collected.length === currentWord.length) {
            wordsComplete++;
            wordFlash = 1.0;
            wordFlashCol = C.correctHi;
            game.audio.play('se_success', 0.7);
            if (wordsComplete >= NEEDED && !done) {
              done = true;
              setTimeout(function() { game.end.success(wordsComplete * 300 + Math.ceil(timeLeft) * 100); }, 600);
              return;
            }
            setTimeout(function() { if (!done) newWord(); }, 700);
          }
        } else {
          // Wrong letter
          mistakes++;
          wordFlash = 0.5;
          wordFlashCol = C.wrongHi;
          game.audio.play('se_failure', 0.3);
          // Knock away
          letters[li].vx = (Math.random() - 0.5) * 400;
          letters[li].vy = -200 - Math.random() * 200;
          if (mistakes >= MAX_MISTAKES && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (wordFlash > 0) wordFlash -= dt * 2;

    // Update bouncing letters
    for (var li = 0; li < letters.length; li++) {
      var l = letters[li];
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      // Bounce off walls
      if (l.x < l.r) { l.x = l.r; l.vx = Math.abs(l.vx); }
      if (l.x > W - l.r) { l.x = W - l.r; l.vx = -Math.abs(l.vx); }
      if (l.y < H * 0.3) { l.y = H * 0.3; l.vy = Math.abs(l.vy); }
      if (l.y > H * 0.78) { l.y = H * 0.78; l.vy = -Math.abs(l.vy); }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Word display area - show blanks and collected letters
    var letterW = 80;
    var totalW = currentWord.length * (letterW + 16);
    var startX = W / 2 - totalW / 2;
    for (var ci = 0; ci < currentWord.length; ci++) {
      var lx = startX + ci * (letterW + 16);
      var isDone = ci < collected.length;
      game.draw.rect(lx, H * 0.2, letterW, 80, isDone ? C.correct : '#1e1b4b', 0.9);
      if (isDone) {
        game.draw.text(collected[ci], lx + letterW / 2, H * 0.2 + 54, { size: 52, color: '#fff', bold: true });
      }
    }

    // Bouncing letters
    for (var li2 = 0; li2 < letters.length; li2++) {
      var l2 = letters[li2];
      var col = l2.isReal ? C.letter : C.ui;
      game.draw.circle(l2.x, l2.y, l2.r + 6, col, 0.2);
      game.draw.circle(l2.x, l2.y, l2.r, col, 0.9);
      game.draw.text(l2.ch, l2.x, l2.y + 18, { size: 56, color: C.letterHi, bold: true });
    }

    // Next letter hint
    if (collected.length < currentWord.length) {
      game.draw.text('次: ' + currentWord[collected.length], W / 2, H * 0.83, { size: 48, color: C.gold, bold: true });
    }

    // Word flash
    if (wordFlash > 0) {
      if (wordFlashCol === C.correctHi) {
        game.draw.text('完成！', W / 2, H * 0.87, { size: 72, color: C.correctHi, bold: true });
      } else {
        game.draw.text('ちがう！', W / 2, H * 0.87, { size: 60, color: C.wrongHi, bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Error dots
    for (var mi = 0; mi < MAX_MISTAKES; mi++) {
      game.draw.circle(W / 2 - (MAX_MISTAKES - 1) * 24 + mi * 48, H * 0.92, 14, mi < mistakes ? C.wrong : '#0f0a1e');
    }

    game.draw.text(wordsComplete + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.letter : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    newWord();
  });
})(game);
