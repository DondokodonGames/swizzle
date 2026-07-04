// 661-color-memory.js
// カラーメモリー — 光った色の順番を覚え、同じ順にボタンをタップして再現する
// 操作: 提示フェーズで点滅順を記憶 → 再現フェーズで同じ順に色ボタンをタップ
// 成功: 5ラウンド クリア  失敗: 3回 ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、記憶盤／ボタン色は保持） ──
  var C = { bg:'#03040a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = ['#ff2079', '#00cfff', '#ffe600', '#00ff41'];
  var LABELS = ['RED', 'CYAN', 'YELLOW', 'GREEN'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR MEMORY';
  var HOW_TO_PLAY = 'WATCH THE FLASH ORDER · THEN TAP THE COLOR BUTTONS IN THE SAME ORDER';
  var MAX_TIME = 25;
  var NEEDED_ROUNDS = 5;     // 修正2: 10 → 5
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var NUM = 4, BTN_SIZE = 210, BTN_GAP = 24, SHOW_DUR = 0.55, PAUSE_DUR = 0.5;
  var BTN_TOTAL = NUM * BTN_SIZE + (NUM - 1) * BTN_GAP, BTN_START_X = snap((W - BTN_TOTAL) / 2), BTN_Y = snap(H * 0.72);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, round, seqPhase, showIdx, showTimer, recallIdx, flashIdx, flashTimer, correct, misses, timeLeft, done, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#06070f');
  }

  function background() { game.draw.clear(C.bg); }

  function startRound() {
    var seqLen = Math.min(3 + round, 7); sequence = [];
    for (var i = 0; i < seqLen; i++) sequence.push(Math.floor(Math.random() * NUM));
    seqPhase = 'show'; showIdx = 0; showTimer = SHOW_DUR; recallIdx = 0; flashIdx = sequence[0]; game.audio.play('se_tap', 0.15);
  }

  function initGame() { round = 0; correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; flashIdx = -1; flashTimer = 0; seqPhase = 'idle'; sequence = []; setTimeout(startRound, 500); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (round * 600 + Math.ceil(timeLeft) * 80) : round * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var label = seqPhase === 'show' ? 'WATCH' : (seqPhase === 'recall' ? 'YOUR TURN' : '');
    if (label) txt(label, W / 2, snap(H * 0.34), 60, seqPhase === 'recall' ? C.d : C.g);
    if (seqPhase === 'recall') for (var si = 0; si < sequence.length; si++) { var sx = W / 2 - sequence.length * 28 + si * 56; pc(sx, snap(H * 0.44), 18, si < recallIdx ? COLORS[sequence[si]] : '#ffffff22', 0.9); }
    if (seqPhase === 'show' && flashIdx >= 0) { pc(W / 2, snap(H * 0.50), 130, COLORS[flashIdx], 0.5); txt(LABELS[flashIdx], W / 2, snap(H * 0.50) + 20, 60, C.g); }
    for (var bi = 0; bi < NUM; bi++) {
      var bx = BTN_START_X + bi * (BTN_SIZE + BTN_GAP), isF = flashIdx === bi && (seqPhase === 'show' || flashTimer > 0), sz = isF ? BTN_SIZE + 12 : BTN_SIZE, ox = isF ? -6 : 0;
      game.draw.rect(bx + ox, BTN_Y, sz, sz, COLORS[bi], isF ? 0.95 : 0.55);
      txt(LABELS[bi], bx + ox + BTN_SIZE / 2, BTN_Y + BTN_SIZE / 2 + 12, 34, C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || seqPhase !== 'recall') return;
    var hitIdx = -1;
    for (var i = 0; i < NUM; i++) { var bx = BTN_START_X + i * (BTN_SIZE + BTN_GAP); if (tx >= bx && tx <= bx + BTN_SIZE && ty >= BTN_Y && ty <= BTN_Y + BTN_SIZE) { hitIdx = i; break; } }
    if (hitIdx < 0) return;
    flashIdx = hitIdx; flashTimer = 0.2;
    if (hitIdx === sequence[recallIdx]) {
      recallIdx++; game.audio.play('se_tap', 0.15);
      if (recallIdx >= sequence.length) {
        correct++; round++; flash = 0.3; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.6; game.audio.play('se_success', 0.6); seqPhase = 'idle';
        if (round >= NEEDED_ROUNDS) { finish(true); return; } setTimeout(startRound, 900);
      }
    } else {
      misses++; flash = 0.35; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); seqPhase = 'idle';
      if (misses >= MAX_MISS) { finish(false); return; } setTimeout(startRound, 900);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.35, 20, C.b);
      for (var bi = 0; bi < NUM; bi++) { var bx = BTN_START_X + bi * (BTN_SIZE + BTN_GAP); game.draw.rect(bx, BTN_Y, BTN_SIZE, BTN_SIZE, COLORS[bi], 0.55); txt(LABELS[bi], bx + BTN_SIZE / 2, BTN_Y + BTN_SIZE / 2 + 12, 34, C.g); }
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) { txt('► 100円 投入 ◄', W / 2, H * 0.52, 56, C.a); txt('TAP TO START', W / 2, H * 0.56, 42, C.g); }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MEMORY MASTER!' : 'FORGOT!', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (flashTimer > 0) flashTimer -= dt;
      if (seqPhase === 'show') {
        showTimer -= dt;
        if (showTimer <= 0) { showIdx++; if (showIdx >= sequence.length) { seqPhase = 'pause'; showTimer = PAUSE_DUR; flashIdx = -1; } else { showTimer = SHOW_DUR; flashIdx = sequence[showIdx]; game.audio.play('se_tap', 0.1); } }
      } else if (seqPhase === 'pause') { showTimer -= dt; if (showTimer <= 0) { seqPhase = 'recall'; flashIdx = -1; } }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.62), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(round + ' / ' + NEEDED_ROUNDS, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#06070f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
  });
})(game);
