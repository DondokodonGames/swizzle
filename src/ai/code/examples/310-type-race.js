// 310-type-race.js
// 文字レース — 宙に漂う単語の文字を、左から正しい順にタップして単語を完成させるタイピング
// 操作: 光っている次の文字をタップ（順番を間違えるとミス）
// 成功: 3ワード完成  失敗: 3回順番ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ネオンタイプ） ──
  var C = { bg:'#06020e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TYPE RACE';
  var HOW_TO_PLAY = 'TAP LETTERS LEFT TO RIGHT IN ORDER';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_ERR  = 3;
  var WORDS = ['SWIZZLE', 'NEON', 'PIXEL', 'RUSH', 'COMBO', 'BLAST', 'POWER', 'ARCADE'];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var wordIdx, word, letterIdx, letters, cleared, errors, timeLeft, done, particles, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100820');
  }

  function background() { game.draw.clear(C.bg); }

  function startWord() {
    word = WORDS[wordIdx % WORDS.length]; wordIdx++; letterIdx = 0; letters = [];
    var N = word.length;
    for (var i = 0; i < N; i++) letters.push({ ch: word[i], x: snap((i / N + 0.5 / N) * W), y: snap(H * 0.34 + Math.sin(i * 1.3) * H * 0.06), state: 'idle' });
  }

  function initGame() { wordIdx = 0; cleared = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; startWord(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cleared * 500 + Math.ceil(timeLeft) * 100) : cleared * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawLetters() {
    for (var i = 0; i < letters.length; i++) {
      var l = letters[i], cur = i === letterIdx, dn = l.state === 'done', wr = l.state === 'wrong';
      var r = cur ? 56 : 46, col = dn ? C.b : wr ? C.a : cur ? C.c : C.d;
      pc(l.x, l.y, r, col, dn ? 0.4 : 0.85);
      if (cur) ring(l.x, l.y, r + 10 + 4 * (Math.floor(game.time.elapsed * 6) % 2), C.c, 0.5);
      if (dn) txt('*', l.x, l.y + 14, 40, C.b); else txt(l.ch, l.x, l.y + 16, cur ? 52 : 42, cur ? '#000' : C.g);
      txt('' + (i + 1), l.x + r * 0.6, l.y - r * 0.6, 22, C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var best = -1, bd = 90; for (var i = 0; i < letters.length; i++) { if (letters[i].state === 'done') continue; var d = Math.hypot(x - letters[i].x, y - letters[i].y); if (d < bd) { bd = d; best = i; } }
    if (best === -1) return;
    if (best === letterIdx) {
      letters[best].state = 'done'; game.audio.play('se_tap', 0.3);
      for (var k = 0; k < 5; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: letters[best].x, y: letters[best].y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, col: C.b }); }
      letterIdx++;
      if (letterIdx >= letters.length) { cleared++; flash = 0.8; game.audio.play('se_success', 0.6); if (cleared >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) startWord(); }, 600); }
    } else {
      errors++; letters[best].state = 'wrong'; game.audio.play('se_failure', 0.4);
      (function(idx) { setTimeout(function() { if (letters[idx] && letters[idx].state === 'wrong') letters[idx].state = 'idle'; }, 400); })(best);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!letters) initGame(); background(); drawLetters();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'WORD MASTER!' : 'TYPO!', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.2);
    drawLetters();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);

    // 進捗ワード表示
    var disp = ''; for (var i2 = 0; i2 < word.length; i2++) disp += (i2 < letterIdx ? word[i2] : '_') + ' ';
    txt(disp.trim(), W / 2, snap(H * 0.72), 56, C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cleared + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#100820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
