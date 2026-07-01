// 070-pong-solo.js
// ソロポン — 上下に反射するボールをパドルで打ち続ける集中力の壁打ち
// 操作: タップでパドルをボールに向けて移動
// 成功: 2回ラリー  失敗: ボールが下を抜ける or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'SOLO PONG';
  var HOW_TO_PLAY = 'TAP / SWIPE TO MOVE PADDLE';
  var MAX_TIME = 25;
  var NEEDED = 2;           // 修正2: 15 → 2
  var PADDLE_W = 280, PADDLE_H = 36, PADDLE_Y = H * 0.86, BALL_R = 36, WALL_TOP = 220, BASE_SPEED = 600;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var paddleX, ball, trail, rallies, timeLeft, done, hitFlash;

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

  function initGame() { paddleX = W / 2; ball = { x: W / 2, y: H * 0.45, vx: 320, vy: -480 }; trail = []; rallies = 0; timeLeft = MAX_TIME; done = false; hitFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (rallies * 200 + Math.ceil(timeLeft) * 40) : rallies * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') paddleX = Math.max(PADDLE_W / 2, paddleX - 220);
    else if (dir === 'right') paddleX = Math.min(W - PADDLE_W / 2, paddleX + 220);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x));
  });

  // 世界観: 一人壁打ちPONG。上の壁と自分のパドルでボールを打ち続ける。
  function background() {
    game.draw.clear('#000011');
    game.draw.rect(0, WALL_TOP - 16, 40, H - WALL_TOP, C.a);
    game.draw.rect(W - 40, WALL_TOP - 16, 40, H - WALL_TOP, C.a);
    game.draw.rect(40, WALL_TOP - 16, W - 80, 16, C.a);
    for (var y = WALL_TOP + 40; y < H; y += 80) game.draw.rect(W / 2 - 4, y, 8, 40, C.b, 0.2);   // センターライン
  }

  function drawScene() {
    for (var tr = 0; tr < trail.length; tr++) game.draw.rect(snap(trail[tr].x) - 10, snap(trail[tr].y) - 10, 20, 20, C.d, (1 - tr / trail.length) * 0.4);
    if (hitFlash > 0) drawPixelCircle(ball.x, ball.y, BALL_R + 16, C.g, hitFlash / 0.12 * 0.5);
    drawPixelCircle(ball.x, ball.y, BALL_R, C.d, 1);
    game.draw.rect(snap(paddleX - PADDLE_W / 2), snap(PADDLE_Y - PADDLE_H / 2), PADDLE_W, PADDLE_H, C.f);
    game.draw.rect(snap(paddleX - PADDLE_W / 2), snap(PADDLE_Y - PADDLE_H / 2), PADDLE_W, 8, C.g, 0.5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ball) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.6, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.67, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.74, 42, '#888888');
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
      ball.x += ball.vx * dt; ball.y += ball.vy * dt; trail.unshift({ x: ball.x, y: ball.y }); if (trail.length > 10) trail.pop();
      if (ball.x - BALL_R < 40) { ball.x = 40 + BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x + BALL_R > W - 40) { ball.x = W - 40 - BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BALL_R < WALL_TOP) { ball.y = WALL_TOP + BALL_R; ball.vy = Math.abs(ball.vy); ball.vx += (Math.random() - 0.5) * 80; }
      if (ball.y + BALL_R >= PADDLE_Y - PADDLE_H / 2 && ball.y - BALL_R <= PADDLE_Y + PADDLE_H / 2 && ball.vy > 0 && ball.x + BALL_R > paddleX - PADDLE_W / 2 && ball.x - BALL_R < paddleX + PADDLE_W / 2) {
        ball.y = PADDLE_Y - PADDLE_H / 2 - BALL_R;
        var hit = (ball.x - paddleX) / (PADDLE_W / 2), ang = hit * 0.9, spd = BASE_SPEED + rallies * 20;
        ball.vx = Math.sin(ang) * spd; ball.vy = -Math.cos(ang) * spd;
        rallies++; hitFlash = 0.12; game.audio.play('se_tap', 0.8);
        if (rallies >= NEEDED) { finish(true); return; }
      }
      if (ball.y > H + 40) { finish(false); return; }
      if (hitFlash > 0) hitFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('RALLY ' + rallies + ' / ' + NEEDED, W / 2, 96, 48, C.c);
    txt('KEEP THE BALL UP!', W / 2, H - 60, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
