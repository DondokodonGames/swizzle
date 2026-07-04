// 639-typing-race.js
// タイピングレース — お題の単語のかなを、格子から順番にタップして完成させる
// 操作: 光る次のかなを格子から探してタップ。順に全文字そろえると1単語クリア
// 成功: 5単語 完成  失敗: 3ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、文字レース／かなは保持） ──
  var C = { bg:'#020818', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TYPING RACE';
  var HOW_TO_PLAY = 'TAP THE HIGHLIGHTED KANA IN ORDER TO SPELL EACH WORD · GO FAST';
  var MAX_TIME = 25;
  var NEEDED     = 5;        // 修正2: 10 → 5
  var MAX_MISSES = 3;        // 修正2: 8 → 3

  var WORDS = [
    { display: 'ねこ', chars: ['ね', 'こ'] }, { display: 'いぬ', chars: ['い', 'ぬ'] },
    { display: 'さかな', chars: ['さ', 'か', 'な'] }, { display: 'はな', chars: ['は', 'な'] },
    { display: 'そら', chars: ['そ', 'ら'] }, { display: 'うみ', chars: ['う', 'み'] },
    { display: 'くも', chars: ['く', 'も'] }, { display: 'つき', chars: ['つ', 'き'] },
    { display: 'ほし', chars: ['ほ', 'し'] }, { display: 'あめ', chars: ['あ', 'め'] }
  ];
  var KANA = ['あ','い','う','え','お','か','き','く','け','こ','さ','し','す','せ','そ','た','ち','つ','て','と','な','に','ぬ','ね','の','は','ひ','ふ','へ','ほ','ま','み','む','め','も','や','ゆ','よ','ら','り','る','れ','ろ','わ','を','ん'];
  var COLS = 5, ROWS = 5, CELL_W = W / 5, CELL_H = 168, GRID_Y = snap(H * 0.52);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var displayChars, currentWord, charIdx, wordsDone, misses, timeLeft, done, flash, flashCol, correctFlash, wrongFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#070f1e');
  }

  function background() { game.draw.clear(C.bg); }

  function shuffle(arr) { for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

  function refreshGrid() {
    var target = currentWord.chars[charIdx], pool = KANA.filter(function(k) { return k !== target; });
    shuffle(pool);
    displayChars = shuffle([target].concat(pool.slice(0, COLS * ROWS - 1)));
    correctFlash = -1; wrongFlash = -1;
  }

  function newWord() { currentWord = WORDS[Math.floor(Math.random() * WORDS.length)]; charIdx = 0; refreshGrid(); }

  function initGame() { wordsDone = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; correctFlash = -1; wrongFlash = -1; newWord(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (wordsDone * 600 + Math.ceil(timeLeft) * 80) : wordsDone * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var wordY = snap(H * 0.28);
    txt(currentWord.display, W / 2, wordY, 100, C.c);
    for (var ci = 0; ci < currentWord.chars.length; ci++) {
      var cx = W / 2 + (ci - (currentWord.chars.length - 1) / 2) * 100, col = ci < charIdx ? C.b : (ci === charIdx ? C.c : '#ffffff33');
      game.draw.rect(snap(cx - 40), wordY + 60, 80, 8, col, 0.8);
      if (ci < charIdx) txt(currentWord.chars[ci], cx, wordY + 110, 44, C.b);
    }
    txt('FIND  ' + currentWord.chars[charIdx], W / 2, snap(H * 0.46), 44, C.e);
    for (var r = 0; r < ROWS; r++) for (var c2 = 0; c2 < COLS; c2++) {
      var idx = r * COLS + c2; if (idx >= displayChars.length) continue;
      var gx = c2 * CELL_W, gy = GRID_Y + r * CELL_H, isC = idx === correctFlash, isW = idx === wrongFlash;
      game.draw.rect(gx + 4, gy + 4, CELL_W - 8, CELL_H - 8, isC ? C.b : (isW ? C.a : '#0f1a2e'), isC || isW ? 0.8 : 0.6);
      game.draw.rect(gx + 4, gy + 4, CELL_W - 8, 8, C.d, 0.5);
      txt(displayChars[idx], gx + CELL_W / 2, gy + CELL_H / 2 + 22, 72, isC ? '#001018' : (isW ? '#331018' : C.g));
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor(tx / CELL_W), row = Math.floor((ty - GRID_Y) / CELL_H);
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    var idx = row * COLS + col; if (idx >= displayChars.length) return;
    if (displayChars[idx] === currentWord.chars[charIdx]) {
      correctFlash = idx; game.audio.play('se_success', 0.4); flash = 0.15; flashCol = C.b; charIdx++;
      if (charIdx >= currentWord.chars.length) { wordsDone++; if (wordsDone >= NEEDED) { finish(true); return; } setTimeout(newWord, 300); }
      else setTimeout(refreshGrid, 200);
    } else {
      wrongFlash = idx; misses++; flash = 0.25; flashCol = C.a; game.audio.play('se_failure', 0.25);
      if (misses >= MAX_MISSES) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!currentWord) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.96, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FAST FINGERS!' : 'TIME UP', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.07);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(wordsDone + ' / ' + NEEDED, W / 2, 158, 44, C.b);
    for (var mi = 0; mi < MAX_MISSES; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISSES - 1) / 2) * 56) - 10, 210, 20, 20, mi < misses ? C.a : '#070f1e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
