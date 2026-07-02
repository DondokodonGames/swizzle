// 320-bouncing-words.js
// バウンシングワーズ — 跳ね回る文字の中から、単語のつづり順に正しい文字をタップして完成させる
// 操作: 次に必要な文字をタップ（順番どおりに集める）
// 成功: 3単語完成  失敗: 3回間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、フローティング文字） ──
  var C = { bg:'#0f0a1e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BOUNCING WORDS';
  var HOW_TO_PLAY = 'TAP LETTERS IN SPELLING ORDER TO BUILD THE WORD';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_MISS = 3;          // 修正2: 6 → 3
  var WORDS = ['CAT', 'SUN', 'MAP', 'RUN', 'FLY', 'BOX', 'ZEN', 'CUP'];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var word, collected, letters, wordIdx, cleared, mistakes, timeLeft, done, particles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnLetter(ch, real) { var sp = 180 + Math.random() * 120, a = Math.random() * Math.PI * 2; letters.push({ ch: ch, x: snap(180 + Math.random() * (W - 360)), y: snap(H * 0.36 + Math.random() * H * 0.34), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 56, real: real }); }

  function newWord() {
    word = WORDS[wordIdx % WORDS.length]; wordIdx++; collected = []; letters = [];
    for (var i = 0; i < word.length; i++) spawnLetter(word[i], true);
    var abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var d = 0; d < 3; d++) { var dec = abc[Math.floor(Math.random() * 26)]; if (word.indexOf(dec) === -1) spawnLetter(dec, false); }
  }

  function initGame() { wordIdx = 0; cleared = 0; mistakes = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; newWord(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cleared * 500 + Math.ceil(timeLeft) * 100) : cleared * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawLetter(l) { var col = l.real ? C.e : C.d; pc(l.x, l.y, l.r, col, 0.85); pc(l.x - l.r * 0.35, l.y - l.r * 0.35, l.r * 0.2, C.g, 0.4); txt(l.ch, l.x, l.y + 18, 56, C.g); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var li = letters.length - 1; li >= 0; li--) {
      var l = letters[li];
      if (Math.hypot(x - l.x, y - l.y) < l.r + 10) {
        if (l.ch === word[collected.length]) {
          collected.push(l.ch); letters.splice(li, 1); game.audio.play('se_tap', 0.3 + collected.length * 0.05);
          for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: l.x, y: l.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.b }); }
          if (collected.length === word.length) { cleared++; fbText = 'COMPLETE!'; fbCol = C.b; fbTimer = 0.7; game.audio.play('se_success', 0.7); if (cleared >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) newWord(); }, 600); }
        } else { mistakes++; fbText = 'WRONG!'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.3); l.vx = (Math.random() - 0.5) * 400; l.vy = -200 - Math.random() * 200; if (mistakes >= MAX_MISS) { finish(false); return; } }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!letters) initGame(); background(); for (var i = 0; i < letters.length; i++) drawLetter(letters[i]);
      txt(GAME_TITLE, W / 2, H * 0.14, 68, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'WORDSMITH!' : 'MISSPELLED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
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
      for (var li = 0; li < letters.length; li++) {
        var l = letters[li]; l.x += l.vx * dt; l.y += l.vy * dt;
        if (l.x < l.r) { l.x = l.r; l.vx = Math.abs(l.vx); } if (l.x > W - l.r) { l.x = W - l.r; l.vx = -Math.abs(l.vx); }
        if (l.y < H * 0.32) { l.y = H * 0.32; l.vy = Math.abs(l.vy); } if (l.y > H * 0.78) { l.y = H * 0.78; l.vy = -Math.abs(l.vy); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    // 進捗表示
    var lw = 90, total = word.length * (lw + 12), sx = W / 2 - total / 2;
    for (var ci = 0; ci < word.length; ci++) { var bx = sx + ci * (lw + 12), dn = ci < collected.length; game.draw.rect(bx, snap(H * 0.28), lw, 90, dn ? C.b : '#1a1030', 0.9); if (dn) txt(collected[ci], bx + lw / 2, snap(H * 0.28) + 60, 52, '#000'); }
    for (var li2 = 0; li2 < letters.length; li2++) drawLetter(letters[li2]);
    if (collected.length < word.length) txt('NEXT: ' + word[collected.length], W / 2, snap(H * 0.84), 46, C.c);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.72), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cleared + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < mistakes ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
