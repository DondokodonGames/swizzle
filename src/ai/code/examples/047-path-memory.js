// 047-path-memory.js
// パスメモリー — 光ったルートを記憶して同じ経路をスワイプで再現
// 操作: 表示されたスワイプシーケンスを再現する
// 成功: 1ラウンドクリア  失敗: 1ミスで即失敗 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'PATH MEMORY';
  var HOW_TO_PLAY = 'REPEAT THE ROUTE BY SWIPING';
  var MAX_TIME = 25;
  var NEEDED = 1;            // 修正2: 4 → 1
  var SEQ_BASE = 2;         // 修正2: 基本長 3 → 2
  var DIRS = ['up', 'down', 'left', 'right'];
  var ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };
  var ARROW_Y = H * 0.5, ARROW_GAP = 200;
  var SHOW_STEP_TIME = 0.55, SHOW_GAP = 0.15;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var round, sequence, playerSeq, phase, showIdx, showTimer, isShowOn, feedbackOk, feedbackTimer, timeLeft, done;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function buildSequence() { var len = SEQ_BASE + round, s = []; for (var i = 0; i < len; i++) s.push(DIRS[Math.floor(Math.random() * 4)]); return s; }
  function startRound() { sequence = buildSequence(); playerSeq = []; showIdx = 0; showTimer = 0.4; isShowOn = false; phase = 'show'; }
  function initGame() { round = 0; timeLeft = MAX_TIME; done = false; feedbackOk = false; feedbackTimer = 0; startRound(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (round * 400 + Math.ceil(timeLeft) * 40) : round * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || phase !== 'input') return;
    var expected = sequence[playerSeq.length];
    playerSeq.push(dir); game.audio.play('se_tap', 0.6);
    if (dir !== expected) { feedbackOk = false; feedbackTimer = 0.8; phase = 'feedback'; finish(false); return; }
    if (playerSeq.length >= sequence.length) { round++; feedbackOk = true; feedbackTimer = 0.7; phase = 'feedback'; if (round >= NEEDED) finish(true); }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  // 世界観: 神経回路のルート再現。光ったノードの順路を辿る。
  function background() {
    game.draw.clear('#0a0018');
    for (var gy = 200; gy < H - 200; gy += 96) game.draw.rect(0, gy, W, 2, C.d, 0.2);
    txt('NEURAL ROUTE', W / 2, H * 0.12, 36, C.b);
  }

  function drawSeq() {
    var seqLen = sequence.length, startX = W / 2 - (seqLen - 1) / 2 * ARROW_GAP;
    for (var s = 0; s < seqLen; s++) {
      var ax = startX + s * ARROW_GAP, dir = sequence[s];
      if (phase === 'show') {
        if (s < showIdx) { drawPixelCircle(ax, ARROW_Y, 64, '#1a0a2a', 1); txt(ARROWS[dir], ax, ARROW_Y, 56, C.d); }
        else if (s === showIdx && isShowOn) { drawPixelCircle(ax, ARROW_Y, 64, C.e, 1); txt(ARROWS[dir], ax, ARROW_Y, 72, C.g); }
        else drawPixelCircle(ax, ARROW_Y, 64, '#1a0a2a', 1);
      } else if (phase === 'input') {
        if (s < playerSeq.length) { var ok = playerSeq[s] === sequence[s]; drawPixelCircle(ax, ARROW_Y, 64, ok ? C.b : C.a, 1); txt(ARROWS[playerSeq[s]], ax, ARROW_Y, 72, C.g); }
        else if (s === playerSeq.length && Math.floor(game.time.elapsed * 6) % 2 === 0) drawPixelCircle(ax, ARROW_Y, 64, C.c, 0.6);
        else drawPixelCircle(ax, ARROW_Y, 64, '#1a0a2a', 1);
      } else { drawPixelCircle(ax, ARROW_Y, 64, feedbackOk ? C.b : C.a, 0.5); txt(ARROWS[dir], ax, ARROW_Y, 56, feedbackOk ? C.b : C.a); }
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) initGame();
      background();
      txt(ARROWS[DIRS[Math.floor(game.time.elapsed) % 4]], W / 2, ARROW_Y, 200, C.e);
      txt(GAME_TITLE,  W / 2, H * 0.2, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.85, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 42, '#888888');
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
          if (isShowOn) { isShowOn = false; showTimer = SHOW_GAP; showIdx++; if (showIdx >= sequence.length) phase = 'input'; }
          else { isShowOn = true; showTimer = SHOW_STEP_TIME; game.audio.play('se_tap', 0.5); }
        }
      } else if (phase === 'feedback') { feedbackTimer -= dt; if (feedbackTimer <= 0 && !done) startRound(); }
    }

    // ---- draw ----
    background();
    drawSeq();
    var label = phase === 'show' ? 'WATCH!' : (phase === 'input' ? (playerSeq.length + ' / ' + sequence.length) : (feedbackOk ? 'PERFECT!' : 'MISS!'));
    txt(label, W / 2, ARROW_Y - 140, 56, C.c);
    timeBar();
    txt('SCORE ' + String(round * 100).padStart(6, '0'), W / 2, 96, 44, C.g);
    txt(phase === 'input' ? 'SWIPE THE ROUTE!' : '...', W / 2, H - 100, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
