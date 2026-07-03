// 580-morse-tap.js
// モールスタップ — 表示された文字のモールス符号（・とー）を、左右タップ/スワイプで順に入力する
// 操作: 画面左タップ/下スワイプ=・(dot) / 右タップ/上スワイプ=ー(dash) 符号の長さ分そろえる
// 成功: 3文字 正解  失敗: 3文字 ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、通信端末） ──
  var C = { bg:'#000a02', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var MORSE = { 'A': '.-', 'E': '.', 'I': '..', 'M': '--', 'N': '-.', 'O': '---', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-' };
  var LETTERS = ['E', 'T', 'A', 'I', 'N', 'M', 'S', 'O', 'U', 'R'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MORSE TAP';
  var HOW_TO_PLAY = 'TAP LEFT / SWIPE DOWN = DOT · TAP RIGHT / SWIPE UP = DASH';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 8 → 3
  var MAX_WRONG = 3;         // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var letter, morse, userInput, correctCount, wrongCount, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, lastInput;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); }

  function nextLetter() { letter = LETTERS[Math.floor(Math.random() * LETTERS.length)]; morse = MORSE[letter]; userInput = ''; lastInput = game.time.elapsed; }

  function initGame() { correctCount = 0; wrongCount = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; nextLetter(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correctCount * 1000 + Math.ceil(timeLeft) * 100) : correctCount * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function checkInput() {
    if (userInput === morse) {
      correctCount++; flash = 0.4; flashCol = C.b; resultText = 'OK!'; resultTimer = 0.8; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: C.b }); }
      if (correctCount >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) nextLetter(); }, 800);
    } else { wrongCount++; flash = 0.35; flashCol = C.a; resultText = 'NG'; resultTimer = 0.7; game.audio.play('se_failure', 0.4); if (wrongCount >= MAX_WRONG) { finish(false); return; } setTimeout(function() { if (!done) nextLetter(); }, 800); }
    userInput = '';
  }

  function addSym(sym) { userInput += sym; lastInput = game.time.elapsed; game.audio.play('se_tap', sym === '-' ? 0.3 : 0.2); if (userInput.length >= morse.length) checkInput(); }

  function drawScene() {
    txt(letter, W / 2, snap(H * 0.20), 120, C.b);
    var morseY = snap(H * 0.30);
    for (var mi = 0; mi < morse.length; mi++) { var mx = W / 2 + (mi - morse.length / 2 + 0.5) * 88; if (morse[mi] === '.') pc(mx, morseY, 22, C.e, 0.8); else game.draw.rect(mx - 40, morseY - 14, 80, 28, C.c, 0.8); }
    var inputY = snap(H * 0.46); txt('INPUT', W / 2 - 200, inputY + 14, 34, C.d, 'center');
    for (var ii = 0; ii < userInput.length; ii++) { var ix = W / 2 - (userInput.length - 1) * 44 + ii * 88; if (userInput[ii] === '.') pc(ix, inputY, 24, C.e, 0.9); else game.draw.rect(ix - 40, inputY - 14, 80, 28, C.c, 0.9); }
    // ボタン
    var btnY = snap(H * 0.72);
    game.draw.rect(60, btnY - 90, W / 2 - 120, 180, '#001a06', 0.8); game.draw.rect(60, btnY - 90, W / 2 - 120, 8, C.e, 0.5); pc(W / 4, btnY, 34, C.e, 0.7); txt('DOT', W / 4, btnY + 70, 40, C.e);
    game.draw.rect(W / 2 + 60, btnY - 90, W / 2 - 120, 180, '#1a1400', 0.8); game.draw.rect(W / 2 + 60, btnY - 90, W / 2 - 120, 8, C.c, 0.5); game.draw.rect(W * 0.75 - 44, btnY - 14, 88, 28, C.c, 0.8); txt('DASH', W * 0.75, btnY + 70, 40, C.c);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || resultTimer > 0) return;
    addSym(tx < W / 2 ? '.' : '-');
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || resultTimer > 0) return;
    addSym(dir === 'up' ? '-' : '.');
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!letter) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.075, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.11, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MESSAGE SENT!' : 'SIGNAL LOST', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      if (userInput.length > 0 && resultTimer <= 0 && game.time.elapsed - lastInput > 1.5) checkInput();
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.40), 90, resultText === 'NG' ? C.a : C.b);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correctCount + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WRONG; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WRONG - 1) / 2) * 56) - 10, 224, 20, 20, wi < wrongCount ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
