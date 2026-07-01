// 051-shadow-match.js
// シャドウマッチ — 影だけ見えるシルエットが何かを当てる瞬発力テスト
// 操作: タップで「丸」「三角」「四角」を選択→スワイプ上で確定
// 成功: 1問正解  失敗: 3問不正解 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'SHADOW MATCH';
  var HOW_TO_PLAY = 'TAP A SHAPE, SWIPE UP TO LOCK';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 7 → 1
  var MAX_WRONG = 3;
  var SHAPE_LABELS = ['CIRCLE', 'TRIANGLE', 'SQUARE'];
  var SHOW_TIME = 0.9, SHAPE_CY = H * 0.4, BTN_Y = H * 0.72;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var currentShape, selectedAnswer, phase, showTimer, feedbackTimer, revealRatio, score, wrongs, timeLeft, done;

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

  function drawShape(shape, cx, cy, size, color, alpha) {
    cx = snap(cx); cy = snap(cy);
    if (shape === 0) drawPixelCircle(cx, cy, size, color, alpha);
    else if (shape === 1) { for (var row = 0; row <= size; row += 8) { var rw = (row / size) * size * 2; game.draw.rect(snap(cx - rw / 2), snap(cy - size + row), snap(rw), 8, color, alpha); } }
    else game.draw.rect(cx - size, cy - size, size * 2, size * 2, color, alpha);
  }

  function newRound() { currentShape = Math.floor(Math.random() * 3); selectedAnswer = -1; phase = 'show'; showTimer = SHOW_TIME; revealRatio = 0; }
  function initGame() { score = 0; wrongs = 0; timeLeft = MAX_TIME; done = false; feedbackTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || phase !== 'answer') return;
    if (y < BTN_Y - 100 || y > BTN_Y + 120) return;
    for (var i = 0; i < 3; i++) { if (Math.abs(x - (W / 2 + (i - 1) * 300)) < 130) { selectedAnswer = i; game.audio.play('se_tap', 0.5); break; } }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || phase !== 'answer' || dir !== 'up' || selectedAnswer < 0) return;
    if (selectedAnswer === currentShape) { score++; game.audio.play('se_tap', 0.8); if (score >= NEEDED) { finish(true); return; } }
    else { wrongs++; game.audio.play('se_failure', 0.6); if (wrongs >= MAX_WRONG) { finish(false); return; } }
    phase = 'feedback'; feedbackTimer = 0.6;
  });

  // 世界観: 影絵劇場。暗幕に映るシルエットの正体を一瞬で見抜く。
  function background() {
    game.draw.clear('#000011');
    // スポットライトの円
    drawPixelCircle(W / 2, SHAPE_CY, 280, '#0a0a22', 1);
    txt('SHADOW THEATER', W / 2, H * 0.1, 36, C.b);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (currentShape === undefined) initGame();
      background();
      drawShape(Math.floor(game.time.elapsed) % 3, W / 2, SHAPE_CY, 160, '#333366', 1);
      txt(GAME_TITLE,  W / 2, H * 0.62, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.69, 34, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.88, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (phase === 'show') { showTimer -= dt; revealRatio = Math.min(1, (SHOW_TIME - showTimer) / SHOW_TIME); if (showTimer <= 0) { phase = 'answer'; revealRatio = 0; } }
      else if (phase === 'feedback') { feedbackTimer -= dt; if (feedbackTimer <= 0 && !done) newRound(); }
    }

    // ---- draw ----
    background();
    // シルエット（影）＋ 提示中の発光
    drawShape(currentShape, W / 2, SHAPE_CY, 160, '#333366', 1);
    if (phase === 'show' && revealRatio > 0) drawShape(currentShape, W / 2, SHAPE_CY, 160, C.d, Math.sin(revealRatio * Math.PI) * 0.8);
    if (phase === 'feedback') drawShape(currentShape, W / 2, SHAPE_CY, 160, selectedAnswer === currentShape ? C.f : C.e, 0.6);

    // 回答ボタン
    if (phase === 'answer' || phase === 'feedback') {
      for (var i = 0; i < 3; i++) {
        var bx = W / 2 + (i - 1) * 300, sel = selectedAnswer === i;
        var ok = phase === 'feedback' && i === currentShape, ng = phase === 'feedback' && i === selectedAnswer && selectedAnswer !== currentShape;
        var col = ok ? C.f : (ng ? C.e : (sel ? C.a : '#1a1a3a'));
        game.draw.rect(snap(bx) - 110, snap(BTN_Y) - 20, 220, 180, col);
        drawShape(i, bx, BTN_Y + 40, 44, C.g, sel ? 1 : 0.6);
        txt(SHAPE_LABELS[i], bx, BTN_Y + 130, 30, C.g);
      }
      if (selectedAnswer >= 0 && phase === 'answer') txt('SWIPE UP!', W / 2, BTN_Y - 80, 44, C.b);
    }
    txt(phase === 'show' ? 'WHAT SHAPE?' : (phase === 'answer' ? 'WHICH ONE?' : (selectedAnswer === currentShape ? 'CORRECT!' : 'WRONG!')), W / 2, H * 0.2, 56, C.c);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_WRONG; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < wrongs ? C.e : '#330000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
