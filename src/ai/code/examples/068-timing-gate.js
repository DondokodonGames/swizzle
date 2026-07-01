// 068-timing-gate.js
// タイミングゲート — 左右に往復するゲートが全開になった瞬間にボールを通す
// 操作: タップでボールをリリース
// 成功: 1回ゲートを通過  失敗: 4回ゲートに当たる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'TIMING GATE';
  var HOW_TO_PLAY = 'TAP TO RELEASE WHEN OPEN';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 8 → 1
  var MAX_HIT = 4;
  var GATE_Y = H * 0.42, GATE_H = 56, GATE_SPEED = 2.8, MIN_GAP = 120;
  var MAX_HALF = (W - MIN_GAP) / 2;
  var BALL_R = 44, BALL_START_X = W / 2, BALL_START_Y = H * 0.78, BALL_UP = -1200;   // 修正1: 発射は下、ゲートは上

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var gatePhase, ball, passed, score, hits, timeLeft, done, feedback, feedbackOk;

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

  function gateExtent() { return (Math.cos(gatePhase) + 1) / 2 * MAX_HALF; }
  function initGame() { gatePhase = Math.PI; ball = null; passed = false; score = 0; hits = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; }

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
    if (done || ball) return;
    ball = { x: BALL_START_X, y: BALL_START_Y, vy: BALL_UP }; passed = false; game.audio.play('se_tap', 0.6);
  });

  // 世界観: セキュリティゲート。開いた瞬間にボールを打ち上げて通す。
  function background() {
    game.draw.clear('#0a0018');
    txt('GATE', W / 2, H * 0.1, 36, C.b);
  }

  function drawGate() {
    var ext = gateExtent(), leftX = W / 2 - ext, rightX = W / 2 + ext, openR = 1 - ext / MAX_HALF;
    var col = openR > 0.65 ? C.b : (openR > 0.35 ? C.e : C.a);
    game.draw.rect(0, snap(GATE_Y - GATE_H / 2), snap(leftX), GATE_H, C.d);
    game.draw.rect(snap(leftX) - 12, snap(GATE_Y - GATE_H / 2) - 8, 12, GATE_H + 16, col);
    game.draw.rect(snap(rightX), snap(GATE_Y - GATE_H / 2), W - snap(rightX), GATE_H, C.d);
    game.draw.rect(snap(rightX), snap(GATE_Y - GATE_H / 2) - 8, 12, GATE_H + 16, col);
    if (openR > 0.5) game.draw.rect(snap(leftX), snap(GATE_Y - GATE_H / 2) - 20, snap(rightX - leftX), GATE_H + 40, col, openR * 0.2);
    txt('GAP ' + Math.floor(rightX - leftX), W / 2, GATE_Y + GATE_H / 2 + 50, 36, col);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (gatePhase === undefined) initGame();
      background();
      gatePhase += GATE_SPEED * dt;
      drawGate();
      drawPixelCircle(BALL_START_X, BALL_START_Y, BALL_R, C.c, 1);
      txt(GAME_TITLE,  W / 2, H * 0.18, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 40, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 52, C.g);
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
      gatePhase += GATE_SPEED * dt; if (gatePhase > Math.PI * 2) gatePhase -= Math.PI * 2;
      if (ball) {
        ball.vy += 1600 * dt; ball.y += ball.vy * dt;
        if (!passed && ball.y + BALL_R >= GATE_Y - GATE_H / 2 && ball.y - BALL_R <= GATE_Y + GATE_H / 2 && ball.vy < 0) {
          var ext = gateExtent(), leftX = W / 2 - ext, rightX = W / 2 + ext;
          if (ball.x - BALL_R < leftX || ball.x + BALL_R > rightX) { hits++; feedbackOk = false; feedback = 0.5; ball = null; game.audio.play('se_failure', 0.7); if (hits >= MAX_HIT) { finish(false); return; } }
        }
        if (ball && !passed && ball.y < GATE_Y - GATE_H / 2 - BALL_R && ball.vy < 0) { passed = true; score++; feedbackOk = true; feedback = 0.5; game.audio.play('se_tap', 1.0); if (score >= NEEDED) { finish(true); return; } }
        if (ball && ball.y > H + 80) ball = null;
      }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawGate();
    if (ball) drawPixelCircle(ball.x, ball.y, BALL_R, C.c, 1);
    else if (Math.floor(game.time.elapsed * 5) % 2 === 0) drawPixelCircle(BALL_START_X, BALL_START_Y, BALL_R, C.c, 0.7);
    if (feedback > 0) txt(feedbackOk ? 'PASS!' : 'HIT!', W / 2, GATE_Y - 100, 80, feedbackOk ? C.b : C.a);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    for (var h = 0; h < MAX_HIT; h++) game.draw.rect(W / 2 + (h - 1.5) * 56, 150, 40, 40, h < hits ? C.a : '#330011');
    if (!ball) txt('TAP TO RELEASE!', W / 2, H - 90, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
