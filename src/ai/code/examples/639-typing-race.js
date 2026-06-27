// 639-typing-race.js
// タイピングレース — 流れる文字を素早くタップして単語を完成させろ
// 操作: タップで文字を選ぶ
// 成功: 10単語完成  失敗: 8ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020818',
    key:     '#0f1a2e',
    keyHi:   '#1e3a5f',
    keyGlow: '#3b82f6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    target:  '#fbbf24',
    text:    '#f1f5f9',
    ui:      '#070f1e',
    complete:'#22c55e'
  };

  // Japanese kana typing game — tap the correct kana character
  var words = [
    { display: 'ねこ', chars: ['ね','こ'] },
    { display: 'いぬ', chars: ['い','ぬ'] },
    { display: 'さかな', chars: ['さ','か','な'] },
    { display: 'はな', chars: ['は','な'] },
    { display: 'そら', chars: ['そ','ら'] },
    { display: 'うみ', chars: ['う','み'] },
    { display: 'たいよう', chars: ['た','い','よ','う'] },
    { display: 'くも', chars: ['く','も'] },
    { display: 'かぜ', chars: ['か','ぜ'] },
    { display: 'つき', chars: ['つ','き'] },
    { display: 'ほし', chars: ['ほ','し'] },
    { display: 'あめ', chars: ['あ','め'] }
  ];

  var kana = ['あ','い','う','え','お','か','き','く','け','こ','さ','し','す','せ','そ',
               'た','ち','つ','て','と','な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ',
               'ま','み','む','め','も','や','ゆ','よ','ら','り','る','れ','ろ','わ','を','ん',
               'ぜ','ぞ','ば','び','ぶ','べ','ぼ','が','ぎ','ぐ','げ','ご'];

  var COLS = 5, ROWS = 5;
  var CELL_W = W / COLS;
  var CELL_H = 160;
  var GRID_Y = H * 0.55;

  var displayChars = []; // current shown kana grid
  var currentWord = null;
  var charIdx = 0;
  var wordsDone = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISSES = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var flashAnim = 0, flashCol = C.correct;
  var correctFlash = -1;
  var wrongFlash = -1;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function newWord() {
    currentWord = words[Math.floor(Math.random() * words.length)];
    charIdx = 0;
    refreshGrid();
  }

  function refreshGrid() {
    var target = currentWord.chars[charIdx];
    var pool = kana.filter(function(k) { return k !== target; });
    shuffle(pool);
    var choices = [target].concat(pool.slice(0, COLS * ROWS - 1));
    shuffle(choices);
    displayChars = choices;
    correctFlash = -1;
    wrongFlash = -1;
  }

  game.onTap(function(tx, ty) {
    if (done || !currentWord) return;
    var col = Math.floor(tx / CELL_W);
    var row = Math.floor((ty - GRID_Y) / CELL_H);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    var idx = row * COLS + col;
    if (idx >= displayChars.length) return;

    var tapped = displayChars[idx];
    var expected = currentWord.chars[charIdx];

    if (tapped === expected) {
      correctFlash = idx;
      game.audio.play('se_success', 0.4);
      flashCol = C.correct;
      flashAnim = 0.15;
      charIdx++;
      if (charIdx >= currentWord.chars.length) {
        wordsDone++;
        if (wordsDone >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(wordsDone * 400 + Math.ceil(timeLeft) * 80); }, 700);
          return;
        }
        setTimeout(newWord, 300);
      } else {
        setTimeout(refreshGrid, 200);
      }
    } else {
      wrongFlash = idx;
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.25;
      game.audio.play('se_failure', 0.25);
      if (misses >= MAX_MISSES && !done) {
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
    if (flashAnim > 0) flashAnim -= dt * 4;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Word display area
    if (currentWord) {
      var wordY = H * 0.3;
      game.draw.text(currentWord.display, W / 2, wordY, { size: 100, color: C.target, bold: true });

      // Progress underline
      for (var ci = 0; ci < currentWord.chars.length; ci++) {
        var cx = W / 2 + (ci - (currentWord.chars.length - 1) / 2) * 100;
        var color = ci < charIdx ? C.correct : (ci === charIdx ? C.target : '#ffffff33');
        game.draw.rect(cx - 40, wordY + 60, 80, 8, color, 0.8);
        if (ci < charIdx) {
          game.draw.text(currentWord.chars[ci], cx, wordY + 100, { size: 44, color: C.correct });
        } else if (ci === charIdx) {
          game.draw.text('_', cx, wordY + 100, { size: 44, color: C.target });
        }
      }

      // Hint: next char
      game.draw.text('「 ' + currentWord.chars[charIdx] + ' 」を探せ', W / 2, H * 0.48, { size: 44, color: C.keyGlow });
    }

    // Kana grid
    for (var r = 0; r < ROWS; r++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var idx2 = r * COLS + c2;
        if (idx2 >= displayChars.length) continue;
        var gx = c2 * CELL_W, gy = GRID_Y + r * CELL_H;
        var isCorrect = idx2 === correctFlash;
        var isWrong = idx2 === wrongFlash;
        var bgCol = isCorrect ? C.correct : (isWrong ? C.wrong : C.key);
        var alpha = isCorrect || isWrong ? 0.8 : 0.6;

        game.draw.rect(gx + 4, gy + 4, CELL_W - 8, CELL_H - 8, bgCol, alpha);
        game.draw.rect(gx + 4, gy + 4, CELL_W - 8, 8, C.keyHi, 0.5);
        game.draw.text(displayChars[idx2], gx + CELL_W / 2, gy + CELL_H / 2 + 18, { size: 72, color: isCorrect ? '#fff' : (isWrong ? '#ffaaaa' : C.text), bold: true });
      }
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.07);

    // Miss dots
    for (var mi = 0; mi < MAX_MISSES; mi++) {
      game.draw.circle(W / 2 - (MAX_MISSES - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(wordsDone + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.keyGlow : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newWord();
  });
})(game);
