// 477-morse-tap.js
// モールス符号 — お手本の符号を見ながら、DOT/DASHボタンをタップして正しく打電する
// 操作: 画面左半分タップ=DOT(.)、右半分タップ=DASH(-)。文字数分だけ入力すると自動判定
// 成功: 4文字 送信  失敗: 3ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、電信室） ──
  var C = { bg:'#000a00', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var MORSE = { A: '.-', B: '-...', D: '-..', E: '.', G: '--.', I: '..', K: '-.-', M: '--', N: '-.', O: '---', R: '.-.', S: '...', T: '-', U: '..-' };
  var LETTERS = Object.keys(MORSE);

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MORSE TAP';
  var HOW_TO_PLAY = 'LEFT = DOT (.)   RIGHT = DASH (-)   MATCH THE CODE';
  var MAX_TIME = 20;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_MISS = 3;          // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, inputBuffer, correct, misses, timeLeft, done, particles, flash, flashCol, resultText, resultCol, resultTimer;

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

  function newLetter() { target = LETTERS[Math.floor(Math.random() * LETTERS.length)]; inputBuffer = ''; }

  function initGame() { correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; newLetter(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 700 + Math.ceil(timeLeft) * 100) : correct * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function evaluate() {
    if (inputBuffer === MORSE[target]) {
      correct++; resultText = 'SENT ' + target; resultCol = C.b; resultTimer = 0.8; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.6);
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6, col: C.b }); }
      if (correct >= NEEDED) { finish(true); return; }
      newLetter();
    } else {
      misses++; resultText = 'ERR ' + inputBuffer; resultCol = C.a; resultTimer = 0.9; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS) { finish(false); return; }
      inputBuffer = '';
    }
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    inputBuffer += (x < W / 2 ? '.' : '-'); game.audio.play('se_tap', x < W / 2 ? 0.3 : 0.5);
    if (inputBuffer.length >= MORSE[target].length) evaluate();
  });

  // ── 更新 & 描画 ──
  function drawPanel() {
    game.draw.rect(80, H * 0.20, W - 160, H * 0.42, '#001a00', 0.9);
    txt(target, W / 2, H * 0.36, 200, C.c);
    txt(MORSE[target], W / 2, H * 0.48, 70, C.d);
    txt(inputBuffer || '___', W / 2, H * 0.58, 80, C.b);
    // DOT / DASH ボタン
    game.draw.rect(80, H * 0.72, W / 2 - 120, 180, C.d, 0.2); txt('DOT .', W * 0.28, H * 0.72 + 110, 60, C.b);
    game.draw.rect(W / 2 + 40, H * 0.72, W / 2 - 120, 180, C.d, 0.2); txt('DASH -', W * 0.72, H * 0.72 + 110, 60, C.c);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!target) initGame(); background(); drawPanel();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.15, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.96, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MESSAGE SENT!' : 'LINE DOWN', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
    background(); drawPanel();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) txt(resultText, W / 2, H * 0.65, 48, resultCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
