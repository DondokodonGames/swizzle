// 201-pinball-classic.js
// クラシックピンボール — バンパーに球を当てて得点を稼ぐピンボール台
// 操作: 左半分タップで左フリッパー、右半分タップで右フリッパー
// 成功: 100点獲得  失敗: ボール3個失う or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ピンボール台） ──
  var C = { bg:'#040408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PINBALL CLASSIC';
  var HOW_TO_PLAY = 'TAP ◄ LEFT · RIGHT ► FLIPPER';
  var MAX_TIME = 20;
  var NEEDED   = 100;            // 修正2: 500 → 100
  var TOP    = 220;
  var BALL_R = 22, GRAVITY = 1000, WALL = 48;
  var FLIP_Y = snap(H * 0.86), FLIP_W = 260, FLIP_H = 24;
  var FLIP_L_X = snap(W * 0.14), FLIP_R_X = snap(W * 0.86 - FLIP_W);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bx, by, bvx, bvy, balls, score, timeLeft, done, leftDown, rightDown, feedback, feedbackCol;
  var bumpers, bumperFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#101018');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, TOP, WALL, H - TOP, C.d, 0.5);
    game.draw.rect(W - WALL, TOP, WALL, H - TOP, C.d, 0.5);
    game.draw.rect(0, TOP, W, 8, C.e, 0.5);
  }

  function initBumpers() {
    bumpers = [
      { x: snap(W * 0.3), y: snap(H * 0.36), r: 56, score: 30, col: C.f },
      { x: snap(W * 0.7), y: snap(H * 0.36), r: 56, score: 30, col: C.f },
      { x: snap(W / 2), y: snap(H * 0.28), r: 52, score: 50, col: C.a },
      { x: snap(W * 0.22), y: snap(H * 0.52), r: 44, score: 20, col: C.e },
      { x: snap(W * 0.78), y: snap(H * 0.52), r: 44, score: 20, col: C.e }
    ];
    bumperFlash = [0, 0, 0, 0, 0];
  }

  function drawBumper(bmp, flash) {
    pc(bmp.x, bmp.y, bmp.r, flash > 0 ? C.g : bmp.col, 0.9);
    for (var a = 0; a < Math.PI * 2; a += 0.4) game.draw.rect(snap(bmp.x + Math.cos(a) * bmp.r) - 4, snap(bmp.y + Math.sin(a) * bmp.r) - 4, 8, 8, C.g, flash > 0 ? 0.8 : 0.4);
    txt(bmp.score + '', bmp.x, bmp.y + 12, 34, '#000000');
  }

  function drawFlipper(fx) {
    game.draw.rect(fx, FLIP_Y, FLIP_W, FLIP_H, C.b, 0.9);
    game.draw.rect(fx, FLIP_Y, FLIP_W, 8, C.g, 0.5);
    game.draw.rect(fx, FLIP_Y, 12, FLIP_H, C.c); game.draw.rect(fx + FLIP_W - 12, FLIP_Y, 12, FLIP_H, C.c);
  }

  function drawBall(x, y) { pc(x, y, BALL_R, C.g, 0.95); pc(x - 6, y - 6, 6, C.e, 0.8); }

  function resetBall() { bx = snap(W / 2); by = snap(H * 0.4); bvx = game.random(-150, 150); bvy = -300; }

  function initGame() {
    initBumpers(); resetBall(); balls = 3; score = 0; timeLeft = MAX_TIME; done = false;
    leftDown = false; rightDown = false; feedback = 0; feedbackCol = C.b;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score + Math.ceil(timeLeft) * 30) : score;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (x < W / 2) { leftDown = true; setTimeout(function() { leftDown = false; }, 180); }
    else { rightDown = true; setTimeout(function() { rightDown = false; }, 180); }
    game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      for (var i = 0; i < 5; i++) drawBumper(bumpers[i], Math.floor(game.time.elapsed * 4 + i) % 2);
      drawFlipper(FLIP_L_X); drawFlipper(FLIP_R_X); drawBall(W / 2, H * 0.68);
      txt(GAME_TITLE, W / 2, H * 0.15, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.72, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JACKPOT!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
      for (var bf = 0; bf < bumperFlash.length; bf++) if (bumperFlash[bf] > 0) bumperFlash[bf] -= dt;

      bvy += GRAVITY * dt;
      bx += bvx * dt; by += bvy * dt;
      if (bx - BALL_R < WALL) { bx = WALL + BALL_R; bvx = Math.abs(bvx) * 0.9; }
      if (bx + BALL_R > W - WALL) { bx = W - WALL - BALL_R; bvx = -Math.abs(bvx) * 0.9; }
      if (by - BALL_R < TOP) { by = TOP + BALL_R; bvy = Math.abs(bvy) * 0.85; }

      for (var bi = 0; bi < bumpers.length; bi++) {
        var bmp = bumpers[bi], dx = bx - bmp.x, dy = by - bmp.y, dist = Math.hypot(dx, dy) || 1;
        if (dist < BALL_R + bmp.r) {
          var nx = dx / dist, ny = dy / dist;
          bx = bmp.x + nx * (BALL_R + bmp.r + 2); by = bmp.y + ny * (BALL_R + bmp.r + 2);
          var dot = bvx * nx + bvy * ny;
          bvx = (bvx - 2 * dot * nx) * 1.05; bvy = (bvy - 2 * dot * ny) * 1.05;
          score += bmp.score; bumperFlash[bi] = 0.3; feedbackCol = bmp.col; feedback = 0.2;
          game.audio.play('se_tap', 0.5);
          if (score >= NEEDED) { finish(true); return; }
        }
      }

      // フリッパー判定
      if (by > FLIP_Y - 40 && by < FLIP_Y + 50 && bvy > 0) {
        if (bx > FLIP_L_X - 20 && bx < FLIP_L_X + FLIP_W + 40) {
          bvy = -Math.abs(bvy) * (leftDown ? 1.05 : 0.7); if (leftDown) bvx += 320; by = FLIP_Y - BALL_R; feedbackCol = C.b; feedback = 0.15; game.audio.play('se_tap', 0.4);
        } else if (bx > FLIP_R_X - 40 && bx < FLIP_R_X + FLIP_W + 20) {
          bvy = -Math.abs(bvy) * (rightDown ? 1.05 : 0.7); if (rightDown) bvx -= 320; by = FLIP_Y - BALL_R; feedbackCol = C.b; feedback = 0.15; game.audio.play('se_tap', 0.4);
        }
      }

      if (by > H + 40) {
        balls--;
        if (balls <= 0) { finish(false); return; }
        else { resetBall(); game.audio.play('se_failure', 0.3); }
      }
    }

    // ---- 描画 ----
    background();
    for (var bi3 = 0; bi3 < bumpers.length; bi3++) drawBumper(bumpers[bi3], bumperFlash[bi3]);
    drawFlipper(FLIP_L_X); drawFlipper(FLIP_R_X);
    drawBall(bx, by);
    if (feedback > 0) game.draw.rect(0, TOP, W, H - TOP, feedbackCol, feedback * 0.12);

    for (var li = 0; li < 3; li++) game.draw.rect(snap(W / 2 - 60 + li * 60) - 12, H - 120, 24, 24, li < balls ? C.g : '#1a1a2e');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 52, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
