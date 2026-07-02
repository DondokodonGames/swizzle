// 186-neon-pong.js
// ネオンポン — 縦画面シングルプレイ、ボールを打ち返し続ける反射神経ゲーム
// 操作: タップでパドル移動
// 成功: 2回打ち返す  失敗: 3回取り逃す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON PONG';
  var HOW_TO_PLAY = 'TAP TO MOVE THE PADDLE · KEEP IT ALIVE';
  var MAX_TIME = 20;             // 修正2: 時間制約を追加
  var NEEDED   = 2;              // 修正2: 20 → 2
  var MAX_LIFE = 3;
  var TOP    = 220;
  var PADDLE_W = 300, PADDLE_H = 32, PADDLE_Y = snap(H * 0.86), PADDLE_SPEED = 900;
  var BALL_R = 24, BALL_SPEED = 560;   // 修正2: やや遅く

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var paddleX, targetX, bx, by, bvx, bvy, score, lives, timeLeft, done, trail, feedback, feedbackOk;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, TOP, 8, H - TOP, C.d, 0.6); game.draw.rect(W - 8, TOP, 8, H - TOP, C.d, 0.6);
    game.draw.rect(0, TOP, W, 8, C.d, 0.6);
  }

  function launchBall() {
    bx = W / 2; by = H * 0.42;
    var ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    bvx = Math.cos(ang) * BALL_SPEED; bvy = -Math.abs(Math.sin(ang) * BALL_SPEED);
  }

  function initGame() {
    paddleX = W / 2; targetX = W / 2; score = 0; lives = MAX_LIFE;
    timeLeft = MAX_TIME; done = false; trail = []; feedback = 0;
    launchBall();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 200 + lives * 200 + Math.ceil(timeLeft) * 20) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetX = x;
  });

  // ── 更新 & 描画 ──
  function drawScene() {
    for (var ti = 0; ti < trail.length; ti++) pc(trail[ti].x, trail[ti].y, BALL_R * trail[ti].life * 2, C.f, trail[ti].life * 0.4);
    pc(bx, by, BALL_R, C.c, 1); pc(bx - 8, by - 8, 6, C.g, 0.6);
    game.draw.rect(paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H, C.b, 0.95);
    game.draw.rect(paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, 8, C.g, 0.5);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      bx = W / 2 + Math.sin(game.time.elapsed) * 200; by = H * 0.5; paddleX = W / 2; trail = [];
      drawScene();
      txt(GAME_TITLE, W / 2, H * 0.18, 88, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.66, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.72, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.78, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'RALLY WIN!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var diff = targetX - paddleX, mv = PADDLE_SPEED * dt;
      paddleX = Math.abs(diff) < mv ? targetX : paddleX + (diff > 0 ? mv : -mv);
      paddleX = Math.max(PADDLE_W / 2, Math.min(W - PADDLE_W / 2, paddleX));
      bx += bvx * dt; by += bvy * dt;
      if (bx - BALL_R < 8) { bx = BALL_R + 8; bvx = Math.abs(bvx); }
      if (bx + BALL_R > W - 8) { bx = W - 8 - BALL_R; bvx = -Math.abs(bvx); }
      if (by - BALL_R < TOP + 8) { by = TOP + 8 + BALL_R; bvy = Math.abs(bvy); }
      if (by + BALL_R > PADDLE_Y && by + BALL_R < PADDLE_Y + PADDLE_H + 12 && bx > paddleX - PADDLE_W / 2 && bx < paddleX + PADDLE_W / 2 && bvy > 0) {
        bvy = -Math.abs(bvy);
        var hit = (bx - paddleX) / (PADDLE_W / 2); bvx = hit * BALL_SPEED * 0.8;
        var sp = Math.hypot(bvx, bvy); bvx = bvx / sp * BALL_SPEED; bvy = bvy / sp * BALL_SPEED;
        score++; feedbackOk = true; feedback = 0.2;
        game.audio.play('se_tap', 0.6);
        if (score >= NEEDED) { finish(true); return; }
      }
      if (by > H + 40) {
        lives--; feedbackOk = false; feedback = 0.5;
        game.audio.play('se_failure', 0.5);
        if (lives <= 0) { finish(false); return; }
        launchBall();
      }
      trail.push({ x: bx, y: by, life: 0.25 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
    }
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    drawScene();
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var li = 0; li < MAX_LIFE; li++) {
      var lx = snap(W / 2 + (li - (MAX_LIFE - 1) / 2) * 48);
      game.draw.rect(lx - 10, 208, 20, 20, li < lives ? C.c : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
