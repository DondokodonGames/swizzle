// 043-pressure-test.js
// プレッシャーテスト — 連打を見せてから同じ回数ちょうど押す計数力
// 操作: 示された回数と同じ回数タップしてENTER（スワイプ上）
// 成功: 1回正確に一致  失敗: 3回ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'PRESSURE TEST';
  var HOW_TO_PLAY = 'TAP THE COUNT, SWIPE UP TO ENTER';
  var MAX_TIME = 25;
  var NEEDED = 1;            // 修正2: 5 → 1
  var MAX_MISS = 3;
  var MAX_SHOW = 6, MIN_SHOW = 3;    // 修正2: 提示数を軽く
  var SHOW_DOT_TIME = 0.28;
  var DOT_COLS = 3, DOT_ROWS = 3, DOT_R = 80, DOT_GAP = 56;
  var GRID_W = DOT_COLS * (DOT_R * 2 + DOT_GAP) - DOT_GAP, GRID_H = DOT_ROWS * (DOT_R * 2 + DOT_GAP) - DOT_GAP;
  var GRID_X = (W - GRID_W) / 2, GRID_Y = (H - GRID_H) / 2 - 120;   // 修正1: 縦中央寄り

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var targetCount, playerCount, phase, showTimer, showDotIdx, showedDots, score, misses, timeLeft, done, feedbackTimer, feedbackOk;

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

  function dotPos(idx) {
    var c = idx % DOT_COLS, r = Math.floor(idx / DOT_COLS);
    return { x: GRID_X + c * (DOT_R * 2 + DOT_GAP) + DOT_R, y: GRID_Y + r * (DOT_R * 2 + DOT_GAP) + DOT_R };
  }

  function startRound() {
    targetCount = MIN_SHOW + Math.floor(Math.random() * (MAX_SHOW - MIN_SHOW + 1));
    playerCount = 0; showDotIdx = 0;
    var all = []; for (var i = 0; i < DOT_COLS * DOT_ROWS; i++) all.push(i);
    for (var j = all.length - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = all[j]; all[j] = all[k]; all[k] = t; }
    showedDots = all.slice(0, targetCount);
    showTimer = SHOW_DOT_TIME; phase = 'show';
  }
  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedbackTimer = 0; feedbackOk = false; startRound(); }

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
    if (done || phase !== 'input') return;
    playerCount++; game.audio.play('se_tap', 0.5);
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || phase !== 'input' || dir !== 'up') return;
    feedbackOk = (playerCount === targetCount); feedbackTimer = 0.7; phase = 'feedback';
    if (feedbackOk) { score++; game.audio.play('se_tap', 1.0); if (score >= NEEDED) finish(true); }
    else { misses++; game.audio.play('se_failure', 0.6); if (misses >= MAX_MISS) finish(false); }
  });

  // 世界観: 計測ラボの反応テスト装置。光った回数だけ正確に押す。
  function background() {
    game.draw.clear('#0a0018');
    var fx = GRID_X - 48, fy = GRID_Y - 96, fw = GRID_W + 96, fh = GRID_H + 320;
    game.draw.rect(fx, fy, fw, fh, '#12102a');       // 装置パネル
    game.draw.rect(fx + 12, fy + 12, fw - 24, fh - 24, '#05000f');
    game.draw.rect(fx + 24, fy + 24, 16, 16, C.d); game.draw.rect(fx + fw - 40, fy + 24, 16, 16, C.d);
    txt('REACTION TEST', W / 2, fy + 48, 36, C.b);
  }

  function drawDots() {
    for (var d = 0; d < DOT_COLS * DOT_ROWS; d++) {
      var dp = dotPos(d), si = showedDots ? showedDots.indexOf(d) : -1;
      if (phase === 'show' && si >= 0) {
        if (si < showDotIdx) drawPixelCircle(dp.x, dp.y, DOT_R, C.d, 0.4);
        else if (si === showDotIdx) drawPixelCircle(dp.x, dp.y, DOT_R, C.c, 1);
        else drawPixelCircle(dp.x, dp.y, DOT_R, '#1a0a2a', 1);
      } else drawPixelCircle(dp.x, dp.y, DOT_R, '#1a0a2a', 1);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!showedDots) initGame();
      background();
      drawDots();
      txt(GAME_TITLE,  W / 2, H * 0.12, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 34, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 42, '#888888');
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
          showDotIdx++;
          if (showDotIdx >= targetCount) { phase = 'wait'; showTimer = 0.4; }
          else { showTimer = SHOW_DOT_TIME; game.audio.play('se_tap', 0.35); }
        }
      } else if (phase === 'wait') { showTimer -= dt; if (showTimer <= 0) phase = 'input'; }
      else if (phase === 'feedback') { feedbackTimer -= dt; if (feedbackTimer <= 0 && !done) startRound(); }
    }

    // ---- draw ----
    background();
    drawDots();
    if (phase === 'show') txt('WATCH!', W / 2, GRID_Y - 40, 56, C.c);
    else if (phase === 'input') {
      txt(playerCount + '', W / 2, GRID_Y + GRID_H + 120, 160, C.e);
      txt('SWIPE UP TO ENTER', W / 2, GRID_Y + GRID_H + 240, 44, C.b);
    } else if (phase === 'feedback') {
      if (feedbackOk) txt('MATCH! ' + targetCount, W / 2, H * 0.5, 88, C.b);
      else txt('WANT ' + targetCount + ' GOT ' + playerCount, W / 2, H * 0.5, 56, C.a);
    }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
