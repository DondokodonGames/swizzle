// 020-echo-tap.js
// エコータップ — 響いたリズムを完璧に返す音楽の快感
// 操作: 光ったリズムパターンをタップで再現
// 成功: 1パターン完璧に  失敗: 間違い or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PAD_COLORS = [C.e, C.a, C.b, C.f];

  var GAME_TITLE  = 'ECHO TAP';
  var HOW_TO_PLAY = 'REPEAT THE LIGHT PATTERN';
  var MAX_TIME = 25;
  var NEEDED = 1;             // 修正2: 3ラウンド → 1
  var SEQ_BASE = 2;          // 修正2: 基本列長 3 → 2
  var PAD_SIZE = 440, PAD_GAP = 24;
  var PADS_X = (W - (PAD_SIZE * 2 + PAD_GAP)) / 2;
  var PADS_Y = (H - (PAD_SIZE * 2 + PAD_GAP)) / 2;   // 修正1: 縦中央に配置
  var PADS = [
    { x: PADS_X, y: PADS_Y }, { x: PADS_X + PAD_SIZE + PAD_GAP, y: PADS_Y },
    { x: PADS_X, y: PADS_Y + PAD_SIZE + PAD_GAP }, { x: PADS_X + PAD_SIZE + PAD_GAP, y: PADS_Y + PAD_SIZE + PAD_GAP }
  ];
  var SHOW_ON = 0.5, SHOW_OFF = 0.25;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var round, timeLeft, done, phase, sequence, playerSeq, showIdx, showTimer, activePad, feedbackTimer, feedbackOk;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function buildSequence() {
    var len = SEQ_BASE + round, seq = [];
    for (var i = 0; i < len; i++) seq.push(Math.floor(Math.random() * 4));
    return seq;
  }
  function startRound() { sequence = buildSequence(); playerSeq = []; showIdx = 0; showTimer = 0.6; activePad = -1; phase = 'show'; }
  function initGame() { round = 0; timeLeft = MAX_TIME; done = false; feedbackTimer = 0; feedbackOk = false; startRound(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (round * 400 + Math.ceil(timeLeft) * 40) : round * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || phase !== 'input') return;
    var tapped = -1;
    for (var i = 0; i < 4; i++) {
      var p = PADS[i];
      if (x >= p.x && x < p.x + PAD_SIZE && y >= p.y && y < p.y + PAD_SIZE) { tapped = i; break; }
    }
    if (tapped === -1) return;
    var expected = sequence[playerSeq.length];
    playerSeq.push(tapped); activePad = tapped;
    if (tapped !== expected) { feedbackOk = false; feedbackTimer = 0.8; phase = 'feedback'; finish(false); return; }
    game.audio.play('se_tap', 0.7 + tapped * 0.07);
    if (playerSeq.length >= sequence.length) {
      round++; feedbackOk = true; feedbackTimer = 0.7; phase = 'feedback';
      if (round >= NEEDED) finish(true);
    }
  });

  function background() { game.draw.clear(C.bg); }

  function drawPads() {
    for (var p = 0; p < 4; p++) {
      var pad = PADS[p], isActive = p === activePad;
      game.draw.rect(pad.x, pad.y, PAD_SIZE, PAD_SIZE, isActive ? PAD_COLORS[p] : '#0a0018');
      game.draw.rect(pad.x, pad.y, PAD_SIZE, PAD_SIZE, PAD_COLORS[p], isActive ? 0 : 0.0);
      game.draw.rect(pad.x, pad.y, PAD_SIZE, 8, PAD_COLORS[p], 0.6);
      game.draw.rect(pad.x, pad.y, 8, PAD_SIZE, PAD_COLORS[p], 0.6);
      if (isActive) game.draw.rect(pad.x + 16, pad.y + 16, PAD_SIZE - 32, PAD_SIZE / 3, C.g, 0.3);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      activePad = Math.floor(game.time.elapsed * 2) % 4; sequence = []; playerSeq = [];
      drawPads();
      txt(GAME_TITLE,  W / 2, H * 0.1, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.95, 42, '#888888');
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
      if (phase === 'show') {
        showTimer -= dt;
        if (showTimer <= 0) {
          if (activePad >= 0) {
            activePad = -1;
            if (showIdx >= sequence.length) phase = 'input';
            else { showTimer = SHOW_OFF; }
          } else if (showIdx < sequence.length) {
            activePad = sequence[showIdx]; showIdx++; showTimer = SHOW_ON; game.audio.play('se_tap', 0.6);
          } else phase = 'input';
        }
      } else if (phase === 'feedback') {
        feedbackTimer -= dt;
        if (feedbackTimer <= 0 && !done) startRound();
      }
    }

    // ---- draw ----
    background();
    drawPads();
    if (phase === 'feedback') {
      if (feedbackOk) txt('PERFECT!', W / 2, PADS_Y - 80, 88, C.b);
      else txt('WRONG!', W / 2, PADS_Y - 80, 80, C.a);
    }
    timeBar();
    txt('SCORE ' + String(round * 100).padStart(6, '0'), W / 2, 96, 44, C.g);
    var label = phase === 'show' ? 'WATCH!' : (phase === 'input' ? (playerSeq.length + ' / ' + sequence.length) : '...');
    txt(label, W / 2, H - 100, 56, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
