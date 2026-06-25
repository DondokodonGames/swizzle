// 123-word-scramble.js
// 文字ならべ — バラバラになった文字を正しい順番にスワイプで並べ替えるパズル
// 操作: スワイプ左右で文字を移動、タップで確定
// 成功: 6問解く  失敗: 3回間違える or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04080c',
    tile:    '#0f1e2e',
    tileHi:  '#1e3a5a',
    tileSelected:'#1d4ed8',
    text:    '#e2e8f0',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  var WORDS = [
    { word: 'ねこ', hint: '動物' },
    { word: 'いぬ', hint: '動物' },
    { word: 'さくら', hint: '花' },
    { word: 'そら', hint: '自然' },
    { word: 'あさひ', hint: '時刻' },
    { word: 'つき', hint: '天体' },
    { word: 'かわ', hint: '自然' },
    { word: 'やま', hint: '地形' }
  ];

  var currentWord = [];
  var shuffled = [];
  var selectedIdx = 0;
  var wordIdx = 0;
  var score = 0;
  var needed = 6;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 50;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;

  function loadWord() {
    var w = WORDS[wordIdx % WORDS.length];
    currentWord = w.word.split('');
    // Shuffle
    shuffled = currentWord.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    // Make sure it's actually shuffled
    if (shuffled.join('') === currentWord.join('') && shuffled.length > 1) {
      var t2 = shuffled[0]; shuffled[0] = shuffled[1]; shuffled[1] = t2;
    }
    selectedIdx = 0;
  }

  function checkAnswer() {
    return shuffled.join('') === currentWord.join('');
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left' && selectedIdx > 0) {
      var tmp = shuffled[selectedIdx]; shuffled[selectedIdx] = shuffled[selectedIdx-1]; shuffled[selectedIdx-1] = tmp;
      selectedIdx--;
      game.audio.play('se_tap', 0.3);
    } else if (dir === 'right' && selectedIdx < shuffled.length - 1) {
      var tmp2 = shuffled[selectedIdx]; shuffled[selectedIdx] = shuffled[selectedIdx+1]; shuffled[selectedIdx+1] = tmp2;
      selectedIdx++;
      game.audio.play('se_tap', 0.3);
    } else if (dir === 'up') {
      selectedIdx = Math.max(0, selectedIdx - 1);
      game.audio.play('se_tap', 0.2);
    } else if (dir === 'down') {
      selectedIdx = Math.min(shuffled.length - 1, selectedIdx + 1);
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onTap(function() {
    if (done) return;
    if (checkAnswer()) {
      score++;
      feedbackOk = true;
      feedback = 0.5;
      game.audio.play('se_success');
      if (score >= needed && !done) {
        done = true;
        setTimeout(function() { game.end.success(score * 80 + Math.ceil(timeLeft) * 10); }, 600);
        return;
      }
      wordIdx++;
      setTimeout(function() { loadWord(); }, 600);
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.4;
      game.audio.play('se_failure');
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
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

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Hint
    var w = WORDS[wordIdx % WORDS.length];
    game.draw.text('ヒント: ' + w.hint, W / 2, H * 0.3, { size: 48, color: C.ui });

    // Answer target (show blanks)
    var tileW = 160;
    var tileH = 160;
    var gap = 20;
    var totalW = currentWord.length * tileW + (currentWord.length - 1) * gap;
    var startX = (W - totalW) / 2;
    var ansY = H * 0.42;
    for (var ai = 0; ai < currentWord.length; ai++) {
      var ax = startX + ai * (tileW + gap);
      game.draw.rect(ax, ansY, tileW, tileH, '#060e18');
      game.draw.rect(ax, ansY + tileH - 6, tileW, 6, C.tileHi);
    }

    // Shuffled tiles
    var shuffY = H * 0.6;
    var shW = shuffled.length * tileW + (shuffled.length - 1) * gap;
    var shX = (W - shW) / 2;
    for (var si = 0; si < shuffled.length; si++) {
      var tx = shX + si * (tileW + gap);
      var isSelected = si === selectedIdx;
      var ty = isSelected ? shuffY - 16 : shuffY;
      game.draw.rect(tx, ty, tileW, tileH, isSelected ? C.tileSelected : C.tile);
      game.draw.rect(tx, ty, tileW, 6, isSelected ? '#60a5fa' : C.tileHi);
      game.draw.text(shuffled[si], tx + tileW / 2, ty + tileH / 2, {
        size: 88, color: C.text, bold: true
      });
      if (isSelected) {
        game.draw.rect(tx - 4, ty - 4, tileW + 8, tileH + 8, '#60a5fa', 0);
        game.draw.rect(tx, ty, tileW, 4, '#93c5fd', 0.5);
      }
    }

    // Feedback
    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.2);
      game.draw.text(feedbackOk ? '正解！' : '不正解…', W / 2, H * 0.2, {
        size: 80, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
    }

    // Score + misses
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mii = 0; mii < maxMisses; mii++) {
      game.draw.circle(W/2 + (mii-1)*56, 216, 18, mii < misses ? C.wrong : '#0a1020');
    }

    game.draw.text('↔並び替え　タップで確定', W / 2, H * 0.88, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#6366f1' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    loadWord();
  });
})(game);
