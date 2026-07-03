// 464-word-chain.js
// しりとり連鎖 — 表示された単語の「最後の文字」を3択から選び、しりとりを繋ぐ
// 操作: 3つのボタンから正しい末尾の文字（かな）をタップ
// 成功: 5回 正解  失敗: 3ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、クイズ筐体） ──
  var C = { bg:'#080420', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var OPT_COLS = [C.d, C.e, C.b];

  // かなは遊びの中身なので保持、UIの文言は英語
  var ROUNDS = [
    { word: 'りんご', choices: ['ご', 'り', 'ん'] },
    { word: 'ごりら', choices: ['ら', 'ご', 'り'] },
    { word: 'らいおん', choices: ['ん', 'ら', 'い'] },
    { word: 'とまと', choices: ['と', 'ま', 'ら'] },
    { word: 'てれび', choices: ['び', 'て', 'れ'] },
    { word: 'くすり', choices: ['り', 'く', 'す'] },
    { word: 'すいか', choices: ['か', 'す', 'い'] },
    { word: 'かえる', choices: ['る', 'か', 'え'] },
    { word: 'きのこ', choices: ['こ', 'き', 'の'] },
    { word: 'こあら', choices: ['ら', 'こ', 'あ'] },
    { word: 'ねこ', choices: ['こ', 'ね', 'に'] },
    { word: 'りぼん', choices: ['ん', 'り', 'ぼ'] }
  ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WORD CHAIN';
  var HOW_TO_PLAY = 'PICK THE LAST KANA OF THE WORD';
  var MAX_TIME = 20;
  var NEEDED   = 5;          // 修正2: 20 → 5
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var OPT_Y = snap(H * 0.66), OPT_W = snap(W * 0.27), OPT_H = 160;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var roundIdx, currentWord, currentChoices, correctIdx, correct, misses, timeLeft, done, flash, flashCol, particles, resultText, resultCol, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#140828');
  }

  function background() { game.draw.clear(C.bg); }

  function getOX(i) { return snap(W * 0.07 + i * (OPT_W + W * 0.045)); }

  function setupRound() {
    var r = ROUNDS[roundIdx % ROUNDS.length]; currentWord = r.word;
    var order = [0, 1, 2];
    for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    currentChoices = order.map(function(k) { return r.choices[k]; });
    correctIdx = order.indexOf(0);
  }

  function initGame() { roundIdx = 0; correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; particles = []; resultText = ''; resultTimer = 0; setupRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 400 + Math.ceil(timeLeft) * 100) : correct * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    game.draw.rect(80, H * 0.24, W - 160, 200, '#1a1040', 0.9); game.draw.rect(80, H * 0.24, W - 160, 8, C.d, 0.7);
    txt(currentWord, W / 2, H * 0.24 + 130, 90, C.g);
    txt('WHICH IS THE LAST KANA?', W / 2, H * 0.54, 38, C.c);
    for (var i = 0; i < 3; i++) { var ox = getOX(i); game.draw.rect(ox, OPT_Y, OPT_W, OPT_H, OPT_COLS[i], 0.2); game.draw.rect(ox, OPT_Y, OPT_W, 6, OPT_COLS[i], 0.8); game.draw.rect(ox, OPT_Y + OPT_H - 6, OPT_W, 6, OPT_COLS[i], 0.5); txt(currentChoices[i], ox + OPT_W / 2, OPT_Y + OPT_H * 0.62, 76, OPT_COLS[i]); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < 3; i++) {
      var ox = getOX(i);
      if (tx >= ox && tx <= ox + OPT_W && ty >= OPT_Y && ty <= OPT_Y + OPT_H) {
        if (i === correctIdx) {
          correct++; resultText = 'CORRECT'; resultCol = C.b; flash = 0.5; flashCol = C.b; game.audio.play('se_tap', 0.5);
          for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ox + OPT_W / 2, y: OPT_Y + OPT_H / 2, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5, col: OPT_COLS[i] }); }
          if (correct >= NEEDED) { finish(true); return; }
          roundIdx++; setupRound();
        } else {
          misses++; resultText = 'WRONG'; resultCol = C.a; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4);
          if (misses >= MAX_MISS) { finish(false); return; }
        }
        resultTimer = 0.6; return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!currentWord) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.18, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CHAIN MASTER!' : 'CHAIN BROKEN', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 52, resultCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#140828');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
