// 173-light-switch.js
// 電球パターン — 光ったパターンを覚えて、消えたあとに同じ状態を再現する記憶力
// 操作: タップでマスをON/OFF、確定ボタンで判定
// 成功: 1問正解  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、配電盤） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LIGHT SWITCH';
  var HOW_TO_PLAY = 'MEMORIZE THE LIT PATTERN · REPRODUCE IT';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED   = 1;              // 修正2: 6 → 1
  var MAX_MISS = 3;
  var COLS = 4, ROWS = 4, CELL = 200, PAD = 12;
  var GX = snap((W - COLS * CELL) / 2), GY = snap(300), SUBMIT_Y = snap(H * 0.82);
  var SHOW_TIME = 1.8;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, player, phase, showTimer, resultTimer, score, misses, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

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

  function drawCell(cx, cy, cw, ch, on, hint) {
    if (on) { game.draw.rect(cx - 4, cy - 4, cw + 8, ch + 8, C.c, 0.25); game.draw.rect(cx, cy, cw, ch, C.c, 0.95); game.draw.rect(cx + cw / 2 - 8, cy + ch / 2 - 8, 16, 16, C.g, 0.6); }
    else { game.draw.rect(cx, cy, cw, ch, C.d, 0.5); game.draw.rect(cx, cy, cw, 8, C.a, 0.5); }
    if (hint) { game.draw.rect(cx + cw / 2 - 6, cy + ch / 2 - 6, 12, 12, C.b, 1); }
  }

  function newRound() {
    target = []; player = [];
    for (var i = 0; i < COLS * ROWS; i++) { target.push(false); player.push(false); }
    var litCount = 3 + Math.floor(Math.random() * 2);   // 修正2: 少なめで易化
    for (var l = 0; l < litCount; l++) { var idx; do { idx = Math.floor(Math.random() * COLS * ROWS); } while (target[idx]); target[idx] = true; }
    phase = 'show'; showTimer = SHOW_TIME;
  }

  function initGame() {
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; resultTimer = 0;
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
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'input') return;
    if (y > SUBMIT_Y - 60 && y < SUBMIT_Y + 60 && x > W / 2 - 200 && x < W / 2 + 200) {
      var correct = true;
      for (var i = 0; i < target.length; i++) if (target[i] !== player[i]) { correct = false; break; }
      if (correct) { score++; feedbackOk = true; feedback = 0.6; game.audio.play('se_success'); if (score >= NEEDED) { finish(true); return; } }
      else { misses++; feedbackOk = false; feedback = 0.6; game.audio.play('se_failure'); if (misses >= MAX_MISS) { finish(false); return; } }
      phase = 'result'; resultTimer = 0.9;
      return;
    }
    var col = Math.floor((x - GX) / CELL), row = Math.floor((y - GY) / CELL);
    if (col >= 0 && col < COLS && row >= 0 && row < ROWS) { player[row * COLS + col] = !player[row * COLS + col]; game.audio.play('se_tap', 0.3); }
  });

  // ── 更新 & 描画 ──
  function drawGrid(showMode) {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var idx = r * COLS + c, cx = GX + c * CELL + PAD, cy = GY + r * CELL + PAD, cw = CELL - PAD * 2, ch = CELL - PAD * 2;
      if (phase === 'result') drawCell(cx, cy, cw, ch, player[idx], target[idx]);
      else drawCell(cx, cy, cw, ch, showMode === 'target' ? target[idx] : player[idx], false);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      phase = 'show';
      target = target || []; for (var i = 0; i < 16; i++) target[i] = ((i + Math.floor(game.time.elapsed)) % 5 === 0);
      drawGrid('target');
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.80, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.87, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MATCHED!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'show') { showTimer -= dt; if (showTimer <= 0) phase = 'input'; }
      else if (phase === 'result') { resultTimer -= dt; if (resultTimer <= 0) newRound(); }
    }
    if (feedback > 0) feedback -= dt;

    background();
    txt(phase === 'show' ? 'MEMORIZE!' : (phase === 'input' ? 'REPRODUCE!' : (feedbackOk ? 'CORRECT!' : 'WRONG')), W / 2, GY - 50, 52, phase === 'show' ? C.c : (phase === 'input' ? C.b : (feedbackOk ? C.b : C.a)));
    drawGrid(phase === 'show' ? 'target' : 'player');
    if (phase === 'input') { game.draw.rect(W / 2 - 200, SUBMIT_Y - 60, 400, 120, C.b, 0.85); game.draw.rect(W / 2 - 200, SUBMIT_Y - 60, 400, 12, C.g, 0.6); txt('SUBMIT', W / 2, SUBMIT_Y - 8, 52, C.bg); }
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.14);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
