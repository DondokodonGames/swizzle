// 123-word-scramble.js
// 文字ならべ — バラバラになった文字を正しい順番にスワイプで並べ替えるパズル
// 操作: スワイプ左右で選択文字を移動、タップで確定
// 成功: 1問解く  失敗: 3回間違える or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、端末パズル） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WORD SCRAMBLE';
  var HOW_TO_PLAY = 'SWIPE ◄► TO SORT · TAP TO SUBMIT';
  var MAX_TIME = 20;             // 修正2: 50 → 20
  var NEEDED   = 1;              // 修正2: 6 → 1
  var MAX_MISS = 3;
  var TOP    = 220;
  var BOTTOM = H - 180;

  var WORDS = [
    { word: 'ねこ', hint: 'ANIMAL' },
    { word: 'いぬ', hint: 'ANIMAL' },
    { word: 'さくら', hint: 'FLOWER' },
    { word: 'そら', hint: 'SKY' },
    { word: 'つき', hint: 'MOON' },
    { word: 'やま', hint: 'MOUNTAIN' }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var currentWord, shuffled, selectedIdx, wordIdx, score, misses;
  var timeLeft, done, flash, flashOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) {
      game.draw.rect(0, sy, W, 2, '#000000', 0.18);
    }
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) {
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
    }
  }

  function background() {
    game.draw.clear(C.bg);
    for (var gy = TOP; gy < BOTTOM; gy += 96) game.draw.rect(0, gy, W, 2, C.d, 0.2);
  }

  // ── タイルスプライト（多矩形の筐体＋文字） ──
  function drawTile(x, y, w, h, ch, sel, filled) {
    var body = sel ? C.e : (filled ? C.d : '#2a0a3a');
    game.draw.rect(x, y, w, h, body);
    game.draw.rect(x, y, w, 8, sel ? C.g : C.a);          // 上ハイライト
    game.draw.rect(x, y + h - 8, w, 8, '#000000', 0.5);   // 下影
    game.draw.rect(x + 8, y + 8, 8, h - 16, C.g, sel ? 0.4 : 0.15); // 左リベット
    if (ch) txt(ch, x + w / 2, y + h / 2 - 8, 88, C.g);
  }

  function loadWord() {
    var w = WORDS[wordIdx % WORDS.length];
    currentWord = w.word.split('');
    shuffled = currentWord.slice();
    for (var i = shuffled.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
    }
    if (shuffled.join('') === currentWord.join('') && shuffled.length > 1) {
      var t2 = shuffled[0]; shuffled[0] = shuffled[1]; shuffled[1] = t2;
    }
    selectedIdx = 0;
  }

  function checkAnswer() {
    return shuffled.join('') === currentWord.join('');
  }

  // ── 初期化 ──
  function initGame() {
    wordIdx = 0;
    score = 0;
    misses = 0;
    timeLeft = MAX_TIME;
    done = false;
    flash = 0;
    loadWord();
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 20) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore);
      else         game.end.failure();
    }, 1800);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left' && selectedIdx > 0) {
      var t = shuffled[selectedIdx]; shuffled[selectedIdx] = shuffled[selectedIdx - 1]; shuffled[selectedIdx - 1] = t;
      selectedIdx--;
      game.audio.play('se_tap', 0.3);
    } else if (dir === 'right' && selectedIdx < shuffled.length - 1) {
      var t2 = shuffled[selectedIdx]; shuffled[selectedIdx] = shuffled[selectedIdx + 1]; shuffled[selectedIdx + 1] = t2;
      selectedIdx++;
      game.audio.play('se_tap', 0.3);
    }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) {
      game.audio.play('se_tap', 1.0);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    // PLAYING
    if (done) return;
    if (checkAnswer()) {
      score++;
      flash = 0.5; flashOk = true;
      game.audio.play('se_success');
      if (score >= NEEDED) { finish(true); return; }
      wordIdx++;
      setTimeout(function() { if (state === S.PLAYING && !done) loadWord(); }, 550);
    } else {
      misses++;
      flash = 0.4; flashOk = false;
      game.audio.play('se_failure');
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      // デモ: タイルが並ぶイメージ
      var demo = ['S', 'W', 'I', 'Z'];
      for (var d = 0; d < demo.length; d++) {
        drawTile(snap(W / 2 - demo.length * 90 + d * 180), snap(H * 0.5), 160, 160, demo[d], d === Math.floor(game.time.elapsed) % demo.length, false);
      }
      txt(GAME_TITLE,  W / 2, H * 0.18, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SOLVED!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
    }
    if (flash > 0) flash -= dt;

    // ---- 描画 ----
    background();
    var w = WORDS[wordIdx % WORDS.length];
    txt('HINT: ' + w.hint, W / 2, H * 0.30, 48, C.c);

    var tileW = 160, tileH = 160, gap = 24;
    // 解答スロット（空欄）
    var totalW = currentWord.length * tileW + (currentWord.length - 1) * gap;
    var startX = snap((W - totalW) / 2);
    var ansY = snap(H * 0.44);
    for (var ai = 0; ai < currentWord.length; ai++) {
      var ax = snap(startX + ai * (tileW + gap));
      game.draw.rect(ax, ansY, tileW, tileH, C.bg);
      game.draw.rect(ax, ansY, tileW, tileH, C.d, 0.4);
      game.draw.rect(ax, ansY + tileH - 8, tileW, 8, C.a);
    }

    // シャッフルタイル（下部三分の一）
    var shW = shuffled.length * tileW + (shuffled.length - 1) * gap;
    var shX = snap((W - shW) / 2);
    var shuffY = snap(H * 0.66);
    for (var si = 0; si < shuffled.length; si++) {
      var sel = si === selectedIdx;
      var tx = snap(shX + si * (tileW + gap));
      drawTile(tx, sel ? shuffY - 16 : shuffY, tileW, tileH, shuffled[si], sel, true);
    }

    if (flash > 0) game.draw.rect(0, 0, W, H, flashOk ? C.b : C.a, flash * 0.2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, H - 150, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mxx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mxx - 12, H - 96, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
