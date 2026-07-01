// 069-word-rain.js
// ワードレイン — 降ってくる文字から指定の言葉をタップして完成させる
// 操作: 正しい文字をタップ
// 成功: 1つの単語を完成させる  失敗: 3文字ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'WORD RAIN';
  var HOW_TO_PLAY = 'TAP THE RIGHT LETTERS';
  var MAX_TIME = 20;
  var NEEDED_WORDS = 1;     // 修正2: 3単語 → 1単語
  var MAX_MISS = 3;
  var WORDS = ['タコ', 'ネコ', 'イヌ', 'トリ', 'ウマ', 'クマ', 'ハナ', 'ソラ'];
  var ALL_CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワ'.split('');
  var LETTER_R = 72, SPAWN_INTERVAL = 0.5;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var currentWord, wordProgress, wordsDone, misses, timeLeft, done, letters, pops, spawnTimer, feedback;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function newWord() { currentWord = WORDS[Math.floor(Math.random() * WORDS.length)]; wordProgress = 0; }
  function initGame() { wordsDone = 0; misses = 0; timeLeft = MAX_TIME; done = false; letters = []; pops = []; spawnTimer = 0.4; feedback = 0; newWord(); }

  function spawnLetter() {
    var isTarget = Math.random() < 0.4 && wordProgress < currentWord.length, ch;
    if (isTarget) ch = currentWord[wordProgress];
    else { var decoys = ALL_CHARS.filter(function(c) { return c !== currentWord[wordProgress]; }); ch = decoys[Math.floor(Math.random() * decoys.length)]; }
    letters.push({ x: snap(120 + Math.random() * (W - 240)), y: -80, vy: 200 + Math.random() * 120, char: ch });
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (wordsDone * 300 + Math.ceil(timeLeft) * 40) : wordsDone * 100 + wordProgress * 50;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = letters.length - 1; i >= 0; i--) {
      var l = letters[i], dx = x - l.x, dy = y - l.y;
      if (Math.sqrt(dx * dx + dy * dy) < LETTER_R + 20) {
        if (l.char === currentWord[wordProgress]) {
          wordProgress++; pops.push({ x: l.x, y: l.y, col: C.b, char: l.char, life: 0.4 }); letters.splice(i, 1); game.audio.play('se_tap', 0.7);
          if (wordProgress >= currentWord.length) { wordsDone++; feedback = 0.6; game.audio.play('se_success', 0.8); if (wordsDone >= NEEDED_WORDS) { finish(true); return; } newWord(); }
        } else { misses++; pops.push({ x: l.x, y: l.y, col: C.a, char: 'X', life: 0.4 }); letters.splice(i, 1); game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) finish(false); }
        break;
      }
    }
  });

  // 世界観: 降り注ぐ文字の雨。お題の単語の文字だけを順に拾って綴る。
  function background() { game.draw.clear('#0a0018'); for (var i = 0; i < 30; i++) { var sx = (i * 137) % W, sy = (i * 219 + game.time.elapsed * 60) % H; game.draw.rect(snap(sx), snap(sy), 8, 24, C.d, 0.15); } }

  function drawWordBoxes() {
    var wy = H * 0.24, bw = 140, gap = 20, totalW = currentWord.length * (bw + gap) - gap, startX = W / 2 - totalW / 2;
    for (var ci = 0; ci < currentWord.length; ci++) {
      var bx = startX + ci * (bw + gap), filled = ci < wordProgress, next = ci === wordProgress;
      game.draw.rect(bx, wy, bw, bw, filled ? C.b : '#1a0a2a');
      if (next && Math.floor(game.time.elapsed * 6) % 2 === 0) game.draw.rect(bx, wy, bw, bw, C.c, 0.4);
      txt(filled ? currentWord[ci] : '_', bx + bw / 2, wy + bw / 2, 72, filled ? C.g : C.d);
    }
    if (wordProgress < currentWord.length) txt('NEXT ' + currentWord[wordProgress], W / 2, wy + bw + 60, 52, C.c);
  }

  function drawLetters() {
    for (var j = 0; j < letters.length; j++) {
      var l = letters[j], tgt = l.char === currentWord[wordProgress];
      drawPixelCircle(l.x, l.y, LETTER_R, tgt ? C.e : '#333366', 1);
      txt(l.char, l.x, l.y, 56, tgt ? C.c : C.g);
    }
    for (var p = 0; p < pops.length; p++) txt(pops[p].char, pops[p].x, pops[p].y, 64, pops[p].col);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!letters) initGame();
      background();
      drawWordBoxes();
      txt(GAME_TITLE,  W / 2, H * 0.1, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.16, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0 && currentWord) { spawnLetter(); spawnTimer = SPAWN_INTERVAL; }
      for (var i = letters.length - 1; i >= 0; i--) { letters[i].y += letters[i].vy * dt; if (letters[i].y > H + 80) letters.splice(i, 1); }
      for (var p = pops.length - 1; p >= 0; p--) { pops[p].life -= dt; pops[p].y -= 60 * dt; if (pops[p].life <= 0) pops.splice(p, 1); }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawWordBoxes();
    drawLetters();
    if (feedback > 0) txt('WORD!', W / 2, H * 0.68, 88, C.b);
    timeBar();
    txt('WORD ' + (wordsDone) + ' / ' + NEEDED_WORDS, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
