// 049-pendulum-catch.js
// ペンデュラムキャッチ — 振り子の先に吊るされた宝石を正確なタイミングで受け取る
// 操作: タップで受け皿を「出す」（一瞬だけ表示）
// 成功: 1個キャッチ  失敗: 4回空振り or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'PENDULUM CATCH';
  var HOW_TO_PLAY = 'TAP TO EXTEND THE CATCHER';
  var MAX_TIME = 25;
  var NEEDED = 1;            // 修正2: 8 → 1
  var MAX_MISS = 4;
  var PIVOT_X = W / 2, PIVOT_Y = H * 0.16, ROD_LEN = 900;   // 修正1: 縦に長い振り子
  var GEM_R = 48, CUP_W = 200, CUP_H = 96, CUP_Y = H * 0.82, CUP_DURATION = 0.22, GRAVITY_K = 3.8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var angle, angleVel, cupOpen, cupTimer, score, misses, timeLeft, done, feedback, feedbackOk, gemCaught;

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

  function initGame() { angle = -Math.PI * 0.4; angleVel = 1.2; cupOpen = false; cupTimer = 0; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; gemCaught = false; }

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
    if (done) return;
    cupOpen = true; cupTimer = CUP_DURATION;
    var gemX = PIVOT_X + Math.sin(angle) * ROD_LEN, gemY = PIVOT_Y + Math.cos(angle) * ROD_LEN;
    if (Math.abs(gemX - W / 2) < CUP_W / 2 + GEM_R && Math.abs(gemY - CUP_Y) < CUP_H / 2 + GEM_R + 80) {
      score++; feedbackOk = true; feedback = 0.5; gemCaught = true;
      game.audio.play('se_tap', 0.9);
      if (score >= NEEDED) finish(true);
    } else {
      misses++; feedbackOk = false; feedback = 0.4;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS) finish(false);
    }
  });

  // 世界観: 宝物庫の吊り下げ振り子。宝石が真下に来た瞬間に受け皿を出す。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(snap(W / 2 - 60), 0, 120, PIVOT_Y, C.d);   // 天井の梁
    // 受け皿ゾーンの目印
    game.draw.rect(snap(W / 2 - CUP_W / 2), snap(CUP_Y - CUP_H / 2), CUP_W, CUP_H, C.b, 0.12);
    txt('TREASURE VAULT', W / 2, H * 0.1, 36, C.b);
  }

  function drawGem(x, y) {
    var bx = snap(x), by = snap(y);
    game.draw.rect(bx - 24, by - 8, 48, 16, C.c);       // 中段
    game.draw.rect(bx - 16, by - 24, 32, 16, C.c);      // 上段
    game.draw.rect(bx - 16, by + 8, 32, 16, C.c);       // 下段
    game.draw.rect(bx - 8, by + 24, 16, 12, C.c);       // 底
    game.draw.rect(bx - 8, by - 8, 8, 8, C.g);          // 輝き
  }

  function drawPendulum() {
    var gemX = PIVOT_X + Math.sin(angle) * ROD_LEN, gemY = PIVOT_Y + Math.cos(angle) * ROD_LEN;
    game.draw.line(PIVOT_X, PIVOT_Y, gemX, gemY, C.d, 8);
    drawPixelCircle(PIVOT_X, PIVOT_Y, 28, C.g, 1);
    if (!gemCaught) drawGem(gemX, gemY);
    return { x: gemX, y: gemY };
  }

  function drawCup() {
    if (!cupOpen) return;
    var col = (feedbackOk && feedback > 0) ? C.b : C.f;
    game.draw.rect(snap(W / 2 - CUP_W / 2), snap(CUP_Y - CUP_H / 2), CUP_W, CUP_H, col);
    game.draw.rect(snap(W / 2 - CUP_W / 2) + 12, snap(CUP_Y - CUP_H / 2) + 12, CUP_W - 24, 16, C.g, 0.4);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (angle === undefined) initGame();
      background();
      angle = Math.sin(game.time.elapsed * 1.5) * 0.6;
      drawPendulum();
      txt(GAME_TITLE,  W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.23, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.9, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 48, C.g);
      }
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
      angleVel += -GRAVITY_K * Math.sin(angle) * dt; angleVel *= 0.9995; angle += angleVel * dt;
      if (Math.abs(angleVel) < 0.3) angleVel += (angle > 0 ? -0.5 : 0.5) * dt;
      if (cupTimer > 0) { cupTimer -= dt; if (cupTimer <= 0) { cupOpen = false; gemCaught = false; } }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawPendulum();
    drawCup();
    if (feedback > 0) txt(feedbackOk ? 'CATCH!' : 'MISS!', W / 2, CUP_Y - 140, 72, feedbackOk ? C.b : C.a);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1.5) * 56, 150, 40, 40, m < misses ? C.a : '#330011');
    txt('TAP AT THE BOTTOM!', W / 2, H - 100, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
