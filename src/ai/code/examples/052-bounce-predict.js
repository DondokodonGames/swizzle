// 052-bounce-predict.js
// バウンス予測 — 壁で跳ね返るボールの軌跡を予測してゴールに当てる
// 操作: タップで射出角度を決定（タップ位置でエイム）
// 成功: 1回ゴールに入れる  失敗: 4回外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'BOUNCE PREDICT';
  var HOW_TO_PLAY = 'TAP TO AIM AND FIRE';
  var MAX_TIME = 20;
  var NEEDED = 1;            // 修正2: 6 → 1
  var MAX_MISS = 4;
  var BALL_R = 32, BALL_SPEED = 950, GOAL_R = 64;
  // 修正1: プレイエリアを縦に大きく
  var PLAY_X = 80, PLAY_Y = 240, PLAY_W = W - 160, PLAY_H = H * 0.62;
  var ORIGIN_X = W / 2, ORIGIN_Y = PLAY_Y + PLAY_H - 48;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var ball, trail, goalX, goalY, score, misses, timeLeft, done, feedback, feedbackOk;

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

  function newRound() { ball = null; trail = []; goalX = PLAY_X + GOAL_R + Math.random() * (PLAY_W - GOAL_R * 2); goalY = PLAY_Y + GOAL_R + Math.random() * (PLAY_H * 0.5); }
  function initGame() { score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; newRound(); }

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
    var dx = x - ORIGIN_X, dy = y - ORIGIN_Y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var vx = dx / dist * BALL_SPEED, vy = dy / dist * BALL_SPEED;
    if (vy > -100) vy = -BALL_SPEED * 0.95;
    ball = { x: ORIGIN_X, y: ORIGIN_Y, vx: vx, vy: vy }; trail = [];
    game.audio.play('se_tap', 0.6);
  });

  // 世界観: レーザー反射室。壁で跳ね返る弾を予測してターゲットコアに当てる。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(PLAY_X - 8, PLAY_Y - 8, PLAY_W + 16, PLAY_H + 16, C.d, 0.3);
    game.draw.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H, '#05000f');
    // 壁のリベット
    for (var wx = PLAY_X; wx <= PLAY_X + PLAY_W; wx += 120) { game.draw.rect(snap(wx) - 6, PLAY_Y - 12, 12, 12, C.e); game.draw.rect(snap(wx) - 6, PLAY_Y + PLAY_H, 12, 12, C.e); }
    txt('REFLECT CHAMBER', W / 2, H * 0.1, 34, C.b);
  }

  function drawGoal() {
    drawPixelCircle(goalX, goalY, GOAL_R, C.f, 0.9);
    drawPixelCircle(goalX, goalY, GOAL_R * 0.5, C.g, 0.6);
    game.draw.rect(snap(goalX) - GOAL_R, snap(goalY) - 2, GOAL_R * 2, 4, C.c, 0.6);
    game.draw.rect(snap(goalX) - 2, snap(goalY) - GOAL_R, 4, GOAL_R * 2, C.c, 0.6);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (goalX === undefined) initGame();
      background();
      drawGoal();
      drawPixelCircle(ORIGIN_X, ORIGIN_Y, BALL_R, C.c, 0.8);
      txt(GAME_TITLE,  W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 38, C.b);
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
      if (ball) {
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        trail.unshift({ x: ball.x, y: ball.y }); if (trail.length > 16) trail.pop();
        if (ball.x - BALL_R < PLAY_X) { ball.x = PLAY_X + BALL_R; ball.vx = Math.abs(ball.vx); }
        if (ball.x + BALL_R > PLAY_X + PLAY_W) { ball.x = PLAY_X + PLAY_W - BALL_R; ball.vx = -Math.abs(ball.vx); }
        if (ball.y - BALL_R < PLAY_Y) { ball.y = PLAY_Y + BALL_R; ball.vy = Math.abs(ball.vy); }
        var gdx = ball.x - goalX, gdy = ball.y - goalY;
        if (Math.sqrt(gdx * gdx + gdy * gdy) < GOAL_R + BALL_R - 8) { score++; feedbackOk = true; feedback = 0.5; ball = null; game.audio.play('se_tap', 1.0); if (score >= NEEDED) { finish(true); return; } setTimeout(newRound, 500); }
        else if (ball && ball.y > PLAY_Y + PLAY_H + 60) { misses++; feedbackOk = false; feedback = 0.5; ball = null; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } setTimeout(newRound, 400); }
      }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawGoal();
    for (var tr = 0; tr < trail.length; tr++) { var ta = (1 - tr / trail.length) * 0.6; game.draw.rect(snap(trail[tr].x) - 8, snap(trail[tr].y) - 8, 16, 16, C.f, ta); }
    if (ball) drawPixelCircle(ball.x, ball.y, BALL_R, C.c, 1);
    else { if (Math.floor(game.time.elapsed * 5) % 2 === 0) drawPixelCircle(ORIGIN_X, ORIGIN_Y, BALL_R + 8, C.c, 0.4); drawPixelCircle(ORIGIN_X, ORIGIN_Y, BALL_R, C.c, 0.8); }
    if (feedback > 0) txt(feedbackOk ? 'IN!' : 'MISS!', W / 2, H * 0.86, 80, feedbackOk ? C.f : C.a);
    timeBar();
    txt('SCORE ' + String(score).padStart(6, '0'), W / 2, 96, 44, C.g);
    for (var m = 0; m < MAX_MISS; m++)
      game.draw.rect(W / 2 + (m - 1.5) * 56, 150, 40, 40, m < misses ? C.a : '#330011');
    if (!ball) txt('TAP TO AIM & FIRE!', W / 2, H - 70, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
