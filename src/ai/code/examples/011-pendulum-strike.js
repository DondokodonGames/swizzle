// 011-pendulum-strike.js
// 振り子ストライク — ちょうど真下に来た瞬間を狙う快感
// 操作: 振り子が中央ゾーンにいる間にタップ
// 成功: 1回ヒット  失敗: 3回ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'PENDULUM STRIKE';
  var HOW_TO_PLAY = 'TAP AT THE CENTER';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 5 → ceil(5/10) = 1
  var MAX_MISS = 3;
  var PIVOT_X = W / 2, PIVOT_Y = 280, ROD_LEN = 1100; // 修正1: 縦長に振り子を伸ばす
  var GRAVITY = 3.2;
  var ZONE_HALF = 18 * Math.PI / 180;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var score, misses, timeLeft, done, angle, angVel, feedback, feedbackOk;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step)
      for (var px = -r; px <= r; px += step)
        if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
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

  function initGame() {
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false;
    angle = Math.PI / 4; angVel = 0; feedback = 0; feedbackOk = false;
  }

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
    feedback = 0.4;
    if (Math.abs(angle) <= ZONE_HALF) {
      score++; feedbackOk = true;
      game.audio.play('se_tap', 1.0);
      angVel *= 0.85;
      if (score >= NEEDED) finish(true);
    } else {
      misses++; feedbackOk = false;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS) finish(false);
    }
  });

  function background() { game.draw.clear(C.bg); }

  function drawPendulum() {
    var arcY = PIVOT_Y + ROD_LEN + 40;
    var inZone = Math.abs(angle) <= ZONE_HALF;
    // ゾーン
    game.draw.rect(PIVOT_X - 90, arcY - 24, 180, 48, C.f, inZone ? 0.6 : 0.25);
    game.draw.rect(PIVOT_X - 8, arcY - 40, 16, 80, C.f);
    // 支点
    game.draw.rect(snap(W / 2 - 40), 0, 80, PIVOT_Y, C.a);
    drawPixelCircle(PIVOT_X, PIVOT_Y, 24, C.c, 1);
    // ロッド + ボール
    var ballX = PIVOT_X + Math.sin(angle) * ROD_LEN;
    var ballY = PIVOT_Y + Math.cos(angle) * ROD_LEN;
    game.draw.line(PIVOT_X, PIVOT_Y, ballX, ballY, C.b, 8);
    drawPixelCircle(ballX, ballY, 52, C.d, 1);
    return { x: ballX, y: ballY };
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      angle = Math.sin(game.time.elapsed * 1.6) * 0.6;
      drawPendulum();
      txt(GAME_TITLE,  W / 2, H * 0.16, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 44, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.8, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.87, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.93, 42, '#888888');
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
      angVel += -GRAVITY * Math.sin(angle) * dt;
      angVel *= 0.999;
      angle += angVel * dt;
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    var ball = drawPendulum();
    if (feedback > 0) {
      if (feedbackOk) txt('HIT!', ball.x, ball.y - 100, 80, C.f);
      else txt('MISS', W / 2, PIVOT_Y + ROD_LEN - 40, 72, C.e);
    }
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 48, C.c);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.e : '#330000');
    txt(score + ' / ' + NEEDED, W / 2, H - 100, 56, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
