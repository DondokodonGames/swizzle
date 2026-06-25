// 069-word-rain.js
// ワードレイン — 降ってくる文字から指定の言葉をタップして完成させる
// 操作: 正しい文字をタップ
// 成功: 3つの単語を完成させる  失敗: 3文字ミス or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    letter:  '#1e3a5f',
    letterHi:'#3b82f6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    target:  '#fbbf24',
    ui:      '#475569'
  };

  // Target words (in romaji/katakana style single characters)
  var WORDS = ['タコ', 'ネコ', 'イヌ', 'トリ', 'ウマ', 'クマ', 'ハナ', 'ソラ', 'ウミ', 'カゼ'];
  var ALL_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');

  var currentWord = '';
  var wordProgress = 0;   // how many chars of current word tapped
  var wordsCompleted = 0;
  var neededWords = 3;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 20;
  var done = false;

  var letters = []; // falling chars
  var pops = [];
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.5;

  var feedback = 0;
  var feedbackOk = false;

  function newWord() {
    currentWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    wordProgress = 0;
  }

  function spawnLetter() {
    var isTarget = Math.random() < 0.35 && wordProgress < currentWord.length;
    var char;
    if (isTarget) {
      char = currentWord[wordProgress]; // upcoming needed char
    } else {
      // Random decoy (not the target char)
      var decoys = ALL_CHARS.filter(function(c) { return c !== currentWord[wordProgress]; });
      char = decoys[Math.floor(Math.random() * decoys.length)];
    }
    letters.push({
      x: 80 + Math.random() * (W - 160),
      y: -60,
      vy: 200 + Math.random() * 120,
      char: char,
      r: 52
    });
  }

  game.onTap(function(x, y) {
    if (done) return;
    for (var i = letters.length - 1; i >= 0; i--) {
      var l = letters[i];
      var dx = x - l.x, dy = y - l.y;
      if (Math.sqrt(dx * dx + dy * dy) < l.r + 16) {
        var needed = currentWord[wordProgress];
        if (l.char === needed) {
          wordProgress++;
          pops.push({ x: l.x, y: l.y, color: C.correct, life: 0.4, char: l.char });
          letters.splice(i, 1);
          game.audio.play('se_tap', 0.7);
          if (wordProgress >= currentWord.length) {
            wordsCompleted++;
            feedbackOk = true;
            feedback = 0.6;
            game.audio.play('se_success', 0.8);
            if (wordsCompleted >= neededWords && !done) {
              done = true;
              game.audio.play('se_success');
              setTimeout(function() { game.end.success(wordsCompleted * 50 + Math.ceil(timeLeft) * 8); }, 400);
              return;
            }
            setTimeout(newWord, 500);
          }
        } else {
          misses++;
          pops.push({ x: l.x, y: l.y, color: C.wrong, life: 0.4, char: '×' });
          letters.splice(i, 1);
          feedbackOk = false;
          feedback = 0.3;
          game.audio.play('se_failure', 0.5);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        break;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0 && currentWord) {
      spawnLetter();
      spawnTimer = SPAWN_INTERVAL;
    }

    for (var i = letters.length - 1; i >= 0; i--) {
      letters[i].y += letters[i].vy * dt;
      if (letters[i].y > H + 80) letters.splice(i, 1);
    }

    for (var p = pops.length - 1; p >= 0; p--) {
      pops[p].life -= dt;
      pops[p].y = (pops[p].y || 0) - 60 * dt;
      if (pops[p].life <= 0) pops.splice(p, 1);
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Word progress display
    var wordDisplayY = H * 0.22;
    game.draw.text('単語: ' + (wordsCompleted + 1) + ' / ' + neededWords, W / 2, wordDisplayY - 80, {
      size: 44, color: '#64748b'
    });

    // Show word with boxes
    var boxW = 120, boxH = 120, boxGap = 16;
    var totalW = currentWord.length * (boxW + boxGap) - boxGap;
    var startX = W / 2 - totalW / 2;
    for (var ci = 0; ci < currentWord.length; ci++) {
      var bx = startX + ci * (boxW + boxGap);
      var isFilled = ci < wordProgress;
      var isNext = ci === wordProgress;
      game.draw.rect(bx, wordDisplayY, boxW, boxH, isFilled ? C.correct : '#0a1428');
      if (isNext) {
        var pulse = 0.3 + 0.3 * Math.sin(game.time.elapsed * 8);
        game.draw.rect(bx, wordDisplayY, boxW, boxH, C.target, pulse);
      }
      if (isFilled) {
        game.draw.text(currentWord[ci], bx + boxW / 2, wordDisplayY + boxH / 2, { size: 60, color: '#fff', bold: true });
      } else {
        game.draw.text('_', bx + boxW / 2, wordDisplayY + boxH / 2, { size: 60, color: '#1e3a5f', bold: true });
      }
    }

    // Next char indicator
    if (wordProgress < currentWord.length) {
      game.draw.text('→ ' + currentWord[wordProgress], W / 2, wordDisplayY + boxH + 64, {
        size: 56, color: C.target, bold: true
      });
    }

    // Falling letters
    for (var j = 0; j < letters.length; j++) {
      var l2 = letters[j];
      var isTarget2 = l2.char === currentWord[wordProgress];
      game.draw.circle(l2.x, l2.y, l2.r + (isTarget2 ? 10 : 0), isTarget2 ? C.letterHi : C.letter, isTarget2 ? 0.4 : 0.6);
      game.draw.circle(l2.x, l2.y, l2.r, isTarget2 ? '#1d4ed8' : '#0f1a2e');
      game.draw.text(l2.char, l2.x, l2.y, { size: 52, color: isTarget2 ? C.target : '#64748b', bold: isTarget2 });
    }

    // Pops
    for (var pp = 0; pp < pops.length; pp++) {
      var po = pops[pp];
      game.draw.text(po.char, po.x, po.y, { size: 64, color: po.color, bold: true });
    }

    // Feedback
    if (feedback > 0 && feedbackOk) {
      game.draw.text('完成！', W / 2, H * 0.68, { size: 88, color: C.correct, bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#040810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.letterHi : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Miss pips
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - 1) * 60;
      game.draw.circle(mx, 140, 18, m < misses ? C.wrong : '#0a1428');
    }

    // Guide
    game.draw.text('正しい文字をタップ！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    newWord();
    spawnTimer = 0.5;
  });
})(game);
