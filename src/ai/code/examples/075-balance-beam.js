// 075-balance-beam.js
// バランスビーム — 傾くシーソーの上でボールを中心に保ち続けるバランスゲーム
// 操作: 左右タップで傾きを押し返す
// 成功: 5秒バランスを保つ  失敗: ボールが端から落ちる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'BALANCE BEAM';
  var HOW_TO_PLAY = 'TAP L/R TO KEEP BALL CENTERED';
  var MAX_TIME = 5;            // 修正2: 生存系 20s → 5s
  var BEAM_W = 700, BEAM_H = 32;
  var PIVOT_X = W / 2, PIVOT_Y = H * 0.55;             // 修正1: 縦画面中央やや下

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var angle, angVel, ballPos, ballVel, tapPulse, timeLeft, done, dangerFlash;
  var DAMP = 0.97;

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

  function initGame() { angle = 0.08; angVel = 0; ballPos = 0; ballVel = 0; tapPulse = 0; timeLeft = MAX_TIME; done = false; dangerFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 60) : Math.floor((1 - Math.abs(ballPos)) * 300);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var pushDir = x < W / 2 ? -1 : 1;
    angVel += pushDir * 0.35; tapPulse = 0.2; game.audio.play('se_tap', 0.4);
  });

  // 世界観: シーソー実験台。ゆらぐ天秤の上のボールを左右タップで中央に保つ。
  function background() {
    game.draw.clear('#0a0018');
    if (dangerFlash > 0) game.draw.rect(0, 0, W, H, C.a, dangerFlash * 0.3);
    // 支柱
    game.draw.rect(snap(PIVOT_X) - 40, snap(PIVOT_Y) + 40, 80, H - PIVOT_Y - 220, '#221040');
    game.draw.rect(snap(PIVOT_X) - 120, snap(H - 200), 240, 40, '#221040');
    txt('BALANCE LAB', W / 2, 250, 34, C.b);
  }

  function drawBeam() {
    var cos_a = Math.cos(angle), sin_a = Math.sin(angle), halfW = BEAM_W / 2;
    var lx = PIVOT_X - cos_a * halfW, ly = PIVOT_Y - sin_a * halfW;
    var rx = PIVOT_X + cos_a * halfW, ry = PIVOT_Y + sin_a * halfW;
    // ビーム本体（ドット風の太線）
    game.draw.line(lx, ly, rx, ry, '#003322', BEAM_H + 8);
    game.draw.line(lx, ly, rx, ry, C.b, BEAM_H);
    game.draw.line(lx + cos_a * 24, ly + sin_a * 24 - 8, rx - cos_a * 24, ry - sin_a * 24 - 8, C.g, 6);
    // セーフゾーン
    var sL = PIVOT_X - cos_a * halfW * 0.7, sR = PIVOT_X + cos_a * halfW * 0.7;
    var sY1 = PIVOT_Y - sin_a * halfW * 0.7, sY2 = PIVOT_Y + sin_a * halfW * 0.7;
    game.draw.line(sL, sY1 - BEAM_H, sR, sY2 - BEAM_H, C.d, 6);
    // 支点
    game.draw.rect(snap(PIVOT_X) - 24, snap(PIVOT_Y) - 8, 48, 56, C.d);
    drawPixelCircle(PIVOT_X, PIVOT_Y, 20, C.g, 0.8);
    // ボール
    var ballX = PIVOT_X + cos_a * (ballPos * halfW), ballY = PIVOT_Y + sin_a * (ballPos * halfW) - BEAM_H - 32;
    var danger = Math.abs(ballPos) > 0.7;
    if (tapPulse > 0) drawPixelCircle(ballX, ballY, 48, C.g, tapPulse / 0.2 * 0.4);
    drawPixelCircle(ballX, ballY, 34, danger ? C.a : C.f, 1);
    game.draw.rect(snap(ballX) - 16, snap(ballY) - 16, 12, 12, C.g, 0.7);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (angle === undefined) initGame();
      background();
      angle = 0.18 * Math.sin(game.time.elapsed * 1.5); ballPos = 0.5 * Math.sin(game.time.elapsed * 1.5);
      drawBeam();
      txt(GAME_TITLE,  W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 32, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 68, C.a);
        txt('TAP TO START', W / 2, H * 0.84, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.89, 40, '#888888');
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
      if (timeLeft <= 0) { finish(true); return; }
      var natural = Math.sin(game.time.elapsed * 0.7) * 0.1 + Math.sin(game.time.elapsed * 1.3) * 0.06;
      angVel += natural * dt; angVel *= DAMP; angle += angVel * dt;
      if (angle >  Math.PI * 0.36) { angle =  Math.PI * 0.36; angVel = -Math.abs(angVel) * 0.3; }
      if (angle < -Math.PI * 0.36) { angle = -Math.PI * 0.36; angVel =  Math.abs(angVel) * 0.3; }
      ballVel += Math.sin(angle) * 900 * dt; ballVel *= 0.985; ballPos += ballVel * dt / (BEAM_W / 2);
      if (Math.abs(ballPos) > 0.9) { dangerFlash = 0.5; finish(false); return; }
      if (Math.abs(ballPos) > 0.7) dangerFlash = 0.1;
      if (dangerFlash > 0) dangerFlash -= dt;
      if (tapPulse > 0) tapPulse -= dt;
    }

    // ---- draw ----
    background();
    drawBeam();
    timeBar();
    txt('KEEP BALANCE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.c);
    txt('◄ TAP', W * 0.18, H - 90, 44, C.d);
    txt('TAP ►', W * 0.82, H - 90, 44, C.d);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
