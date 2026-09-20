// GH-DS-0030-brick-break.js
// ブリックブレイク — 板で玉を打ち返してブロックを崩す。玉は板の当たった位置で角度が変わる
// 操作: 指で板を左右にドラッグ。板の端に当てると玉が鋭く跳ねる
// 終わり: 全部崩せば成功。玉を落とせば失敗
// @mechanic: drag_follow
// @theme: block_break
// 世界観: 積まれたブロックに玉をぶつけて崩す。板の端で当てるほど玉は鋭く跳ね返る。落とせば終わり
// 残るもの: 正誤(CLEAR/GAME OVER) + 崩した数
// スタイル: PIXEL HD

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // PIXEL HD: 多色 + 光。パララックス、ライティング、細かいアニメ
  var C = {
    bg1: '#1a1030', bg2: '#0c0818', paddle: '#e8e8f0', ball: '#ffd400',
    good: '#4dff8a', bad: '#ff4d5e', gold: '#ffd400', white: '#f0f0ff', ink: '#0a0812',
  };
  var BRICK_COLS = ['#ff5a6a', '#ff9a3a', '#ffd400', '#4dcf8a'];

  var GAME_TITLE = 'BRICK BREAK';
  var COLS = 5, ROWS = 3;
  var PADDLE_Y = H * 0.80, PADDLE_W = 200, PADDLE_H = 24;
  var BALL_R = 14;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var ok = false, broken = 0, total = COLS * ROWS;

  var paddleX, ballX, ballY, vx, vy, bricks, done, endWait, finished;
  var ready, hitStop, shake;

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 2, y + 3, { size: sz, color: C.ink, bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  var BX0 = W * 0.5 - COLS * 90, BY0 = H * 0.20, BW = 160, BH = 60, BGAP = 20;

  function arenaBg() {
    game.draw.gradient(0, H, [[0, C.bg1], [1, C.bg2]]);
    for (var i = 0; i < 20; i++) { var gx = (i * 137 + 19) % W, gy = (i * 271 + 53) % H; game.draw.circle(gx, gy, 2, '#ffffff', 0.15); }
  }

  function brickPos(r, c) { return { x: BX0 + c * (BW + BGAP) + BW / 2 + 40, y: BY0 + r * (BH + BGAP) }; }

  function drawBricks() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (!bricks[r][c]) continue;
        var p = brickPos(r, c);
        game.draw.rect(p.x - BW / 2, p.y - BH / 2, BW, BH, BRICK_COLS[r % BRICK_COLS.length]);
        game.draw.rect(p.x - BW / 2, p.y - BH / 2, BW, 8, '#ffffff', 0.3);
      }
    }
  }

  var STAR_SPRITE = ['..#..', '..#..', '#####', '..#..', '..#..'];

  function drawPaddleBall() {
    game.draw.rect(paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H, C.paddle);
    game.draw.circle(paddleX, PADDLE_Y + PADDLE_H / 2, 60, C.paddle, 0.12);
    game.draw.sprite(STAR_SPRITE, { '#': C.ball }, ballX, ballY, 6, { anchor: 'center' });
    game.draw.circle(ballX, ballY, BALL_R + 10, C.ball, 0.18);
  }

  function initGame() {
    paddleX = W / 2;
    ballX = W / 2; ballY = PADDLE_Y - 40; vx = 220; vy = -520;
    bricks = [];
    for (var r = 0; r < ROWS; r++) { bricks.push([]); for (var c = 0; c < COLS; c++) bricks[r].push(true); }
    broken = 0; done = false; endWait = 0; finished = false;
    ready = 0.8; hitStop = 0; shake = 0;
  }

  function finish() {
    if (done) return;
    done = true;
    game.audio.stopBgm();
    if (ok) game.audio.play('se_success', 0.5); else game.audio.play('se_failure', 0.4);
    endWait = 1.3;
  }

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_coin'); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; initGame(); return; }
  });
  game.onPress(function(x) { if (state === S.PLAYING) { paddleX = x; game.audio.play('se_tap', 0.06); } });
  game.onMove(function(x) {
    if (state !== S.PLAYING) return;
    paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, x));
    if (Math.random() < 0.02) game.audio.play('se_tap', 0.02);
  });

  function stepBall(dt) {
    ballX += vx * dt; ballY += vy * dt;
    if (ballX < BALL_R) { ballX = BALL_R; vx = Math.abs(vx); }
    if (ballX > W - BALL_R) { ballX = W - BALL_R; vx = -Math.abs(vx); }
    if (ballY < BALL_R + H * 0.10) { ballY = BALL_R + H * 0.10; vy = Math.abs(vy); }
    // ブロック衝突
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (!bricks[r][c]) continue;
        var p = brickPos(r, c);
        if (Math.abs(ballX - p.x) < BW / 2 + BALL_R && Math.abs(ballY - p.y) < BH / 2 + BALL_R) {
          bricks[r][c] = false; broken++;
          vy = -vy;
          game.feedback.good(p.x, p.y, { text: null, color: C.good });
          game.fx.burst(p.x, p.y, { color: BRICK_COLS[r % BRICK_COLS.length], count: 10, speed: 280 });
          game.audio.play('se_good', 0.25);
          if (broken >= total) { ok = true; finished = true; game.fx.burst(W / 2, H / 2, { color: C.gold, count: 20, speed: 400 }); finish(); }
          else if (broken % 5 === 0) game.fx.popup(broken + ' / ' + total, W / 2, H * 0.62, { color: C.gold, size: 44 });
          return;
        }
      }
    }
    // パドル衝突
    if (ballY + BALL_R > PADDLE_Y && ballY - BALL_R < PADDLE_Y + PADDLE_H && ballX > paddleX - PADDLE_W / 2 && ballX < paddleX + PADDLE_W / 2 && vy > 0) {
      var hit = (ballX - paddleX) / (PADDLE_W / 2);
      vx = hit * 480;
      vy = -Math.abs(vy);
      ballY = PADDLE_Y - BALL_R;
      game.audio.play('se_tap', 0.15);
    }
    if (ballY - BALL_R > H) {
      ok = false; finished = true;
      game.feedback.bad(ballX, PADDLE_Y, { text: 'MISS' });
      shake = 0.2;
      finish();
    }
  }

  // ── ATTRACT ゴースト実演: 板を左右に動かして玉を返す ──
  var demo = { t: 0, gx: W / 2, gy: PADDLE_Y + 60, press: true };
  function stepDemo(dt) {
    demo.t += dt;
    if (ballY === undefined || ballY > H) { ballX = W / 2; ballY = PADDLE_Y - 40; vx = 220; vy = -520; }
    paddleX += (ballX - paddleX) * Math.min(1, dt * 3);
    demo.gx = paddleX;
    stepBall(dt);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (bricks === undefined) initGame();
      arenaBg();
      stepDemo(dt);
      drawBricks();
      drawPaddleBall();
      game.draw.hand(demo.gx, demo.gy, { press: demo.press, scale: 16 });
      txt(GAME_TITLE, W / 2, H * 0.08, 50, C.white);
      txt('BEST ' + (game.best > 0 ? 'CLEAR' : '-'), W / 2, H * 0.12, 24, C.gold);
      if (Math.floor(game.time.elapsed * 1.8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 44, C.gold);
        txt('TAP TO START', W / 2, H * 0.98, 32, C.white);
      } else {
        txt('INSERT COIN', W / 2, H * 0.98, 28, C.white);
      }
      return;
    }

    if (state === S.RESULT) {
      arenaBg();
      drawBricks();
      drawPaddleBall();
      txt(ok ? 'CLEAR' : 'GAME OVER', W / 2, H * 0.08, 54, ok ? C.good : C.bad);
      txt(broken + ' / ' + total, W / 2, H * 0.60, 40, C.gold);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.98, 30, C.white);
      return;
    }

    // ── PLAYING ──
    if (done) {
      endWait -= dt;
      if (endWait <= 0) {
        state = S.RESULT;
        if (ok) game.end.success({ broken: broken });
        else game.end.failure({ broken: broken });
      }
    } else if (hitStop > 0) {
      hitStop -= dt;
    } else if (ready > 0) {
      ready -= dt;
      if (ready <= 0) game.audio.play('se_tap');
    } else if (!finished) {
      stepBall(dt);
    }
    if (shake > 0) shake -= dt;

    arenaBg();
    drawBricks();
    drawPaddleBall();

    txt(broken + ' / ' + total, W / 2, H * 0.06, 32, C.white);
    if (ready > 0) txt(ready > 0.35 ? 'READY?' : 'GO!', W / 2, H * 0.60, 62, C.gold);
  });

  game.onStart(function() {
    game.audio.bgm('bgm_tense', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
