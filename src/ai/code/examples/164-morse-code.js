// 164-morse-code.js
// モールス信号 — 点と線の組み合わせを解読して文字を当てる暗号ゲーム
// 操作: タップ左=点(•) 右=線(—)
// 成功: 1文字正解  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、無線室） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MORSE CODE';
  var HOW_TO_PLAY = 'READ THE SIGNAL · LEFT=• RIGHT=—';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 3;
  var TOP    = 220;

  // 短い符号の文字だけ使用（易化）
  var MORSE = { 'E': ['•'], 'T': ['—'], 'A': ['•', '—'], 'N': ['—', '•'], 'I': ['•', '•'], 'M': ['—', '—'] };
  var LETTERS = Object.keys(MORSE);
  var DISPLAY_INTERVAL = 0.55;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var letter, code, input, score, misses, timeLeft, done, feedback, feedbackOk, displayIdx, displayTimer, showing;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawSignalPanel() {
    var py = H * 0.28;
    game.draw.rect(80, py - 90, W - 160, 180, '#0a0018', 0.9);
    game.draw.rect(80, py - 90, W - 160, 8, C.e);
    var n = code.length, sw = 96, total = n * sw + (n - 1) * 24, sx = W / 2 - total / 2;
    for (var i = 0; i < n; i++) {
      var x = sx + i * (sw + 24) + sw / 2;
      var active = showing && i === displayIdx, shown = !showing || i < displayIdx;
      var alpha = shown ? 0.9 : (active ? 1 : 0.2);
      if (code[i] === '•') pc(x, py, active ? 32 : 24, C.c, alpha);
      else game.draw.rect(snap(x) - 48, snap(py) - 16, 96, 32, C.c, alpha);
    }
  }

  function drawButtons() {
    var by = H * 0.56, bh = 220;
    game.draw.rect(60, by, W / 2 - 80, bh, C.d, 0.7);
    game.draw.rect(60, by, W / 2 - 80, 8, C.e);
    pc(W / 4, by + bh / 2, 44, C.b, 1);
    txt('DOT', W / 4, by + bh / 2 + 80, 40, C.b);
    game.draw.rect(W / 2 + 20, by, W / 2 - 80, bh, C.d, 0.7);
    game.draw.rect(W / 2 + 20, by, W / 2 - 80, 8, C.e);
    game.draw.rect(snap(W * 0.75) - 90, snap(by + bh / 2) - 16, 180, 32, C.f, 1);
    txt('DASH', W * 0.75, by + bh / 2 + 80, 40, C.f);
  }

  function newRound() {
    letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    code = MORSE[letter]; input = [];
    showing = true; displayIdx = 0; displayTimer = 0.8;
  }

  function checkAnswer() {
    if (input.length !== code.length) return false;
    for (var i = 0; i < code.length; i++) if (input[i] !== code[i]) return false;
    return true;
  }

  function initGame() {
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0;
    newRound();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || showing) return;
    input.push(x >= W / 2 ? '—' : '•');
    game.audio.play('se_tap', 0.4);
    if (input.length === code.length) {
      if (checkAnswer()) {
        score++; feedbackOk = true; feedback = 0.7;
        game.audio.play('se_success');
        if (score >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (state === S.PLAYING && !done) newRound(); }, 700);
      } else {
        misses++; feedbackOk = false; feedback = 0.6;
        game.audio.play('se_failure');
        if (misses >= MAX_MISS) { finish(false); return; }
        setTimeout(function() { if (state === S.PLAYING && !done) newRound(); }, 700);
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawSignalPanel();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DECODED!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (showing) {
        displayTimer -= dt;
        if (displayTimer <= 0) {
          displayIdx++;
          if (displayIdx >= code.length) showing = false;
          else { displayTimer = DISPLAY_INTERVAL; game.audio.play('se_tap', code[displayIdx] === '•' ? 0.3 : 0.5); }
        }
      }
    }
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    drawSignalPanel();
    drawButtons();
    // 入力済み
    var iy = H * 0.80, itot = code.length * 88, isx = W / 2 - itot / 2;
    for (var ii = 0; ii < code.length; ii++) {
      var ix = isx + ii * 88 + 44;
      if (ii < input.length) { if (input[ii] === '•') pc(ix, iy, 24, C.b, 0.9); else game.draw.rect(snap(ix) - 40, snap(iy) - 12, 80, 24, C.b, 0.9); }
      else game.draw.rect(snap(ix) - 6, snap(iy) - 6, 12, 12, C.d, 0.5);
    }
    if (feedback > 0 && !feedbackOk) txt(letter, W / 2, H * 0.16, 72, C.a);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.14);
    txt(showing ? 'READ THE SIGNAL!' : 'INPUT THE CODE', W / 2, H * 0.72, 40, showing ? C.c : C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 200, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
