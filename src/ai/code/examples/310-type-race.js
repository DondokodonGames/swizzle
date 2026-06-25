// 310-type-race.js
// 文字レース — 降ってくる文字列を正しい順番でタップして完成させる
// 操作: 落ちてくる文字を左から順番にタップ
// 成功: 10ワードクリア  失敗: 3回順番ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#06020e',
    letter: '#818cf8',
    letterHi:'#c7d2fe',
    current:'#f59e0b',
    currentHi:'#fde68a',
    done2:   '#22c55e',
    doneHi: '#86efac',
    wrong:  '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var WORDS = ['SWIZZLE','GAME','PLAY','SPEED','COMBO','FLASH','POWER','LEVEL','SCORE','MAGIC','BLAST','SWIFT','NEON','PIXEL','RUSH'];
  var wordIdx = 0;
  var currentWord = '';
  var currentLetterIdx = 0;

  var letters = []; // {char, x, y, vy, targetX, col, hiCol, done, wrongFlash}
  var wordsCleared = 0;
  var NEEDED = 10;
  var errors = 0;
  var MAX_ERR = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var wordDoneFlash = 0;
  var spawnTimer = 0;

  function startWord() {
    currentWord = WORDS[wordIdx % WORDS.length];
    wordIdx++;
    currentLetterIdx = 0;
    letters = [];
    var N = currentWord.length;
    for (var i = 0; i < N; i++) {
      letters.push({
        char: currentWord[i],
        x: (i / N + 0.5 / N) * W,
        y: H * 0.25 + Math.random() * H * 0.1,
        targetX: (i / N + 0.5 / N) * W,
        vy: 80 + Math.random() * 40,
        col: C.letter,
        hiCol: C.letterHi,
        state: 'idle', // idle, falling, done, wrong
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find tapped letter
    var bestDist = 90;
    var bestIdx = -1;
    for (var li = 0; li < letters.length; li++) {
      var ltr = letters[li];
      if (ltr.state === 'done' || ltr.state === 'wrong') continue;
      var dx = tx - ltr.x, dy = ty - ltr.y;
      if (Math.hypot(dx, dy) < bestDist) {
        bestDist = Math.hypot(dx, dy);
        bestIdx = li;
      }
    }
    if (bestIdx === -1) return;

    if (bestIdx === currentLetterIdx) {
      // Correct letter
      letters[bestIdx].state = 'done';
      game.audio.play('se_tap', 0.3);
      for (var pi = 0; pi < 5; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: letters[bestIdx].x, y: letters[bestIdx].y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5, col: C.doneHi });
      }
      currentLetterIdx++;
      if (currentLetterIdx >= letters.length) {
        // Word complete!
        wordsCleared++;
        wordDoneFlash = 0.8;
        game.audio.play('se_success', 0.6);
        if (wordsCleared >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(wordsCleared * 300 + Math.ceil(timeLeft) * 100); }, 500);
          return;
        }
        setTimeout(function() { if (!done) startWord(); }, 600);
      }
    } else {
      // Wrong letter
      errors++;
      letters[bestIdx].state = 'wrong';
      game.audio.play('se_failure', 0.4);
      setTimeout(function() {
        if (letters[bestIdx]) letters[bestIdx].state = 'idle';
      }, 400);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (wordDoneFlash > 0) wordDoneFlash -= dt;

    // Letters float and wobble
    for (var li = 0; li < letters.length; li++) {
      var ltr = letters[li];
      ltr.wobble += dt * 2;
      ltr.y += Math.sin(ltr.wobble * 0.5) * 30 * dt;
      // Keep in zone
      if (ltr.y > H * 0.6) ltr.y = H * 0.6;
      if (ltr.y < H * 0.15) ltr.y = H * 0.15;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Word progress display at bottom
    var wordDisplay = '';
    for (var i2 = 0; i2 < currentWord.length; i2++) {
      wordDisplay += (i2 < currentLetterIdx ? currentWord[i2] : '_') + ' ';
    }
    game.draw.text(wordDisplay.trim(), W / 2, H * 0.78, { size: 60, color: C.doneHi, bold: true });
    game.draw.text(currentWord, W / 2, H * 0.84, { size: 44, color: C.ui });

    // Flash on word complete
    if (wordDoneFlash > 0) {
      game.draw.rect(0, 0, W, H, C.doneHi, wordDoneFlash * 0.2);
    }

    // Letters
    for (var li2 = 0; li2 < letters.length; li2++) {
      var ltr2 = letters[li2];
      var isCurrent = li2 === currentLetterIdx;
      var isDone = ltr2.state === 'done';
      var isWrong = ltr2.state === 'wrong';

      var r = isCurrent ? 56 : 44;
      var col = isDone ? C.doneHi : (isWrong ? C.wrong : (isCurrent ? C.current : C.letter));
      var hiCol = isDone ? C.doneHi : (isCurrent ? C.currentHi : C.letterHi);

      game.draw.circle(ltr2.x, ltr2.y, r + 8, col, 0.15);
      game.draw.circle(ltr2.x, ltr2.y, r, col, isDone ? 0.4 : 0.85);
      if (!isDone) {
        game.draw.text(ltr2.char, ltr2.x, ltr2.y + 14, { size: isCurrent ? 52 : 40, color: isCurrent ? C.currentHi : '#fff', bold: true });
      } else {
        game.draw.text('✓', ltr2.x, ltr2.y + 14, { size: 40, color: C.doneHi, bold: true });
      }

      // Current highlight glow
      if (isCurrent) {
        var glow = 5 * Math.sin(elapsed * 6);
        game.draw.circle(ltr2.x, ltr2.y, r + glow + 15, C.current, 0.15);
      }

      // Number indicator
      game.draw.text((li2 + 1) + '', ltr2.x + r * 0.6, ltr2.y - r * 0.6, { size: 24, color: C.ui });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text('左から順にタップ！', W / 2, H * 0.9, { size: 38, color: C.ui });
    game.draw.text(wordsCleared + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 28 + ei * 56, H * 0.94, 16, ei < errors ? C.wrong : '#06020e');
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.letter : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    startWord();
  });
})(game);
