// 280-word-rain.js
// ワードレイン — 降ってくる文字群から、目標単語の綴り順に文字をタップして単語を完成させる
// 操作: 目標単語の次の文字をタップ
// 成功: 3単語完成  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、文字の雨） ──
  var C = { bg:'#02040a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WORDS = ['CAT', 'DOG', 'SUN', 'RUN', 'FLY', 'WIN', 'ICE', 'SKY', 'ACE', 'BIG', 'CUP', 'EGG'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WORD RAIN';
  var HOW_TO_PLAY = 'TAP LETTERS IN ORDER TO SPELL THE WORD';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 10 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var TOP = 300, LR = 56;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var word, idx, letters, completed, mistakes, timeLeft, done, spawnTimer, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1424');
  }

  function background() { game.draw.clear(C.bg); }

  function nextWord() { word = WORDS[Math.floor(Math.random() * WORDS.length)]; idx = 0; }

  function spawnLetter() { var need = word[idx], isNeed = Math.random() < 0.45, ch = isNeed ? need : String.fromCharCode(65 + Math.floor(Math.random() * 26)); letters.push({ x: snap(game.random(90, W - 90)), y: TOP - 40, vy: 130 + Math.random() * 60, ch: ch, flash: 0 }); }

  function drawLetter(l) { var need = word && l.ch === word[idx], col = l.flash > 0 ? C.b : l.flash < 0 ? C.a : (need ? C.b : C.e); pc(l.x, l.y, LR, col, 0.9); txt(l.ch, l.x, l.y + 18, 52, '#000'); }

  function initGame() { nextWord(); letters = []; completed = 0; mistakes = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (completed * 400 + Math.ceil(timeLeft) * 60) : completed * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = letters.length - 1; i >= 0; i--) {
      var l = letters[i]; if ((x - l.x) * (x - l.x) + (y - l.y) * (y - l.y) < (LR + 12) * (LR + 12)) {
        if (l.ch === word[idx]) { idx++; l.flash = 0.4; for (var pk = 0; pk < 5; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: l.x, y: l.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4 }); } if (idx >= word.length) { completed++; fbText = word + '!'; fbCol = C.b; fbTimer = 0.7; game.audio.play('se_success', 0.6); letters = []; nextWord(); if (completed >= NEEDED) { finish(true); return; } } else game.audio.play('se_tap', 0.3); }
        else { mistakes++; l.flash = -0.4; fbText = 'MISS'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.4); if (mistakes >= MAX_MISS) { finish(false); return; } }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  function drawTarget() {
    for (var wi = 0; wi < word.length; wi++) { var cx = W / 2 - (word.length - 1) * 44 + wi * 88, hit = wi < idx, next = wi === idx; game.draw.rect(snap(cx) - 34, snap(H * 0.20), 68, 76, next ? C.c : C.d, next ? 0.3 : 0.15); txt(word[wi], cx, H * 0.20 + 54, next ? 60 : 48, hit ? C.b : (next ? C.c : C.e)); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!word) initGame(); background(); drawLetter({ x: W * 0.3, y: H * 0.5, ch: 'C', flash: 0 }); drawLetter({ x: W * 0.7, y: H * 0.55, ch: 'A', flash: 0 });
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#445566');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SPELLED!' : 'JUMBLED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      spawnTimer -= dt; if (spawnTimer <= 0 && letters.length < 8) { spawnLetter(); spawnTimer = 0.6 + Math.random() * 0.4; }
      for (var i = letters.length - 1; i >= 0; i--) { var l = letters[i]; l.y += l.vy * dt; if (l.flash > 0) l.flash -= dt * 2; if (l.flash < 0) l.flash += dt * 2; if (l.y > H + 60) letters.splice(i, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTarget();
    for (var i2 = 0; i2 < letters.length; i2++) drawLetter(letters[i2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.b, particles[pp2].life * 2.5);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.86, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(completed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 232, 20, 20, mm < mistakes ? C.a : '#0a1424');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
