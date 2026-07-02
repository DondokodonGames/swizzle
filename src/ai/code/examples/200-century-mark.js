// 200-century-mark.js
// センチュリーマーク — 落ちてくる球をパドルでリズムよく打ち上げ続けるリフティング
// 操作: タップした位置にパドルを出して球を打ち上げる
// 成功: 20回打ち上げる  失敗: 球が落ちる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、深宇宙リフティング） ──
  var C = { bg:'#08040c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CENTURY MARK';
  var HOW_TO_PLAY = 'TAP UNDER THE BALL TO BOUNCE IT UP';
  var MAX_TIME = 20;
  var NEEDED   = 20;             // 修正2: 200 → 20（ceil(200/10)）
  var TOP    = 220, FLOOR = H - 180;
  var BALL_R = 40, GRAVITY = 1600, PADDLE_W = 320, PADDLE_H = 32, PADDLE_Y = snap(H * 0.82);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ballX, ballY, ballVX, ballVY, count, timeLeft, done, padX, padFlash, sparks;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0a2e');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var si = 0; si < 20; si++) {
      var sx = snap((si * 137 + game.time.elapsed * 12) % W), sy = snap((si * 211) % (H - TOP) + TOP);
      game.draw.rect(sx, sy, 4, 4, C.g, 0.2 + 0.1 * (Math.floor(game.time.elapsed * 4 + si) % 2));
    }
    game.draw.rect(0, FLOOR, W, 8, C.d, 0.6);
  }

  function drawBall(x, y) {
    pc(x, y, BALL_R, C.c, 0.95);
    pc(x - 12, y - 12, 10, C.g, 0.7);
    ringDots(x, y, BALL_R, C.f, 0.5);
  }

  function ringDots(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.5) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function drawPaddle(x, flash) {
    var px = snap(x - PADDLE_W / 2);
    game.draw.rect(px, PADDLE_Y, PADDLE_W, PADDLE_H, flash > 0 ? C.b : C.d, 0.9);
    game.draw.rect(px, PADDLE_Y, PADDLE_W, 8, C.g, flash > 0 ? 0.8 : 0.4);
    game.draw.rect(px, PADDLE_Y, 12, PADDLE_H, C.b); game.draw.rect(px + PADDLE_W - 12, PADDLE_Y, 12, PADDLE_H, C.b);
  }

  function initGame() {
    ballX = snap(W / 2); ballY = snap(H * 0.45); ballVX = game.random(-120, 120); ballVY = -400;
    count = 0; timeLeft = MAX_TIME; done = false; padX = W / 2; padFlash = 0; sparks = [];
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (count * 300 + Math.ceil(timeLeft) * 40) : count * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    padX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x));
    padFlash = 0.2;
    // 球がパドル圏内なら打ち上げ
    if (ballVY > 0 && ballY > PADDLE_Y - 120 && ballY < PADDLE_Y + 60 && Math.abs(ballX - padX) < PADDLE_W / 2 + BALL_R) {
      var hit = (ballX - padX) / (PADDLE_W / 2);
      ballVX = hit * 420 + ballVX * 0.2;
      ballVY = -900 - count * 8;
      count++;
      game.audio.play('se_tap', Math.min(1, 0.4 + count * 0.02));
      for (var si = 0; si < 6; si++) { var ang = -Math.random() * Math.PI; sparks.push({ x: ballX, y: PADDLE_Y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4 }); }
      if (count % 5 === 0) game.audio.play('se_success', 0.4);
      if (count >= NEEDED) { finish(true); return; }
    } else game.audio.play('se_failure', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawBall(W / 2, H * 0.42 + Math.floor(game.time.elapsed * 4) % 2 * 12);
      drawPaddle(W / 2, 1);
      txt(GAME_TITLE, W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.98, 40, '#665577');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CENTURY!' : 'DROPPED', W / 2, H * 0.35, 84, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (padFlash > 0) padFlash -= dt;
      ballVY += GRAVITY * dt;
      ballX += ballVX * dt; ballY += ballVY * dt;
      if (ballX - BALL_R < 0) { ballX = BALL_R; ballVX = Math.abs(ballVX); }
      if (ballX + BALL_R > W) { ballX = W - BALL_R; ballVX = -Math.abs(ballVX); }
      if (ballY - BALL_R < TOP) { ballY = TOP + BALL_R; ballVY = Math.abs(ballVY); }
      if (ballY > FLOOR + 30) { finish(false); return; }
      for (var si = sparks.length - 1; si >= 0; si--) { var s = sparks[si]; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 800 * dt; s.life -= dt; if (s.life <= 0) sparks.splice(si, 1); }
    }

    // ---- 描画 ----
    background();
    // ドロップガイド
    if (ballVY > 0 && ballY > H * 0.6) ringDots(ballX, PADDLE_Y - 10, 44, C.e, 0.3 + 0.2 * (Math.floor(game.time.elapsed * 8) % 2));
    for (var si2 = 0; si2 < sparks.length; si2++) game.draw.rect(snap(sparks[si2].x) - 5, snap(sparks[si2].y) - 5, 10, 10, C.f, sparks[si2].life * 2.5);
    drawPaddle(padX, padFlash);
    drawBall(ballX, ballY);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(count + ' / ' + NEEDED, W / 2, 168, 52, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
