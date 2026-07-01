// 118-basket-shot.js
// バスケシュート — 風を読んでアーチを描くシュートをバスケットに決める爽快感
// 操作: スワイプ上で投射、スワイプ左右で位置調整
// 成功: 1本シュートを決める  失敗: 6本外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ストリートコート） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BASKET SHOT';
  var HOW_TO_PLAY = 'SWIPE UP TO SHOOT · SWIPE ◄► TO MOVE';
  var MAX_TIME = 15;              // 修正2: 40 → 15
  var NEEDED   = 1;               // 修正2: 8 → 1
  var MAX_MISS = 6;               // 修正2: 12 → 6
  var TOP    = 220;
  var BOTTOM = H - 180;

  var HOOP_X = snapC(W / 2);
  var HOOP_Y = snapC(TOP + 120);
  var HOOP_R_OUTER = 88;
  var HOOP_R_INNER = 68;
  var BALL_R = 40;
  var GRAVITY = 1200;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ballX, ballY, ballVX, ballVY, launched, wind;
  var score, misses, timeLeft, done, feedback, feedbackOk, trail, hoopFlash;

  // ── ピクセル描画ヘルパー ──
  function snapC(v) { return Math.round(v / 8) * 8; }
  var snap = snapC;

  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) {
          game.draw.rect(cx + px, cy + py, step, step, color, alpha);
        }
      }
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) {
      game.draw.rect(0, sy, W, 2, '#000000', 0.18);
    }
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) {
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
    }
  }

  function background() {
    game.draw.clear(C.bg);
    // コートの遠近ライン
    for (var i = 1; i <= 6; i++) {
      var yy = snap(BOTTOM - i * ((BOTTOM - TOP) / 7));
      game.draw.rect(0, yy, W, 2, C.d, 0.35);
    }
    // フロア
    game.draw.rect(0, BOTTOM - 8, W, H - BOTTOM + 8, C.d, 0.4);
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawHoop(flash) {
    // バックボード
    game.draw.rect(HOOP_X - 96, HOOP_Y - 160, 192, 112, C.g, 0.25);
    game.draw.rect(HOOP_X - 96, HOOP_Y - 160, 192, 8, C.e);
    game.draw.rect(HOOP_X - 40, HOOP_Y - 120, 80, 48, C.e, 0.6); // ターゲット枠
    // ポール
    game.draw.rect(HOOP_X - 8, HOOP_Y - 48, 16, 40, C.d);
    // リング
    if (flash > 0) drawPixelCircle(HOOP_X, HOOP_Y, HOOP_R_OUTER + 8, C.b, flash);
    drawPixelCircle(HOOP_X, HOOP_Y, HOOP_R_OUTER, C.f, 0.9);
    drawPixelCircle(HOOP_X, HOOP_Y, HOOP_R_INNER, C.bg, 1);
    // ネット（縦ブロック）
    for (var n = -2; n <= 2; n++) {
      game.draw.rect(HOOP_X + n * 24 - 4, HOOP_Y, 8, 56, C.g, 0.5);
    }
  }

  function drawBall(cx, cy) {
    drawPixelCircle(cx, cy, BALL_R, C.f, 1);
    drawPixelCircle(cx - 12, cy - 12, 10, C.c, 0.9);   // ハイライト
    // シーム（縦横の線でボールらしさ）
    game.draw.rect(snap(cx) - BALL_R, snap(cy) - 4, BALL_R * 2, 8, '#000000', 0.7);
    game.draw.rect(snap(cx) - 4, snap(cy) - BALL_R, 8, BALL_R * 2, '#000000', 0.7);
  }

  // ── 初期化 ──
  function initGame() {
    score = 0;
    misses = 0;
    timeLeft = MAX_TIME;
    done = false;
    feedback = 0;
    hoopFlash = 0;
    resetBall();
  }

  function resetBall() {
    ballX = snap(W / 2 + game.random(-100, 100));
    ballY = snap(BOTTOM - 120);
    ballVX = 0; ballVY = 0;
    launched = false;
    trail = [];
    wind = game.random(-140, 140);   // 修正2: 風を弱めて易化
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 20) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore);
      else         game.end.failure();
    }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) {
      game.audio.play('se_tap', 1.0);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || launched) return;
    if (dir === 'up') {
      var dx = HOOP_X - ballX;
      var dy = HOOP_Y - ballY;
      var t = 0.75;
      ballVX = dx / t;
      ballVY = (dy - 0.5 * GRAVITY * t * t) / t;
      launched = true;
      game.audio.play('se_tap', 0.7);
    } else if (dir === 'left') {
      ballX = snap(Math.max(BALL_R + 40, ballX - 96));
    } else if (dir === 'right') {
      ballX = snap(Math.min(W - BALL_R - 40, ballX + 96));
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawHoop(0);
      // デモ: 弧を描くボール
      var ph = (game.time.elapsed % 2) / 2;
      var dbx = snap(W * 0.3 + (HOOP_X - W * 0.3) * ph);
      var dby = snap(BOTTOM - 120 - Math.sin(ph * Math.PI) * (BOTTOM - HOOP_Y));
      drawBall(dbx, dby);
      txt(GAME_TITLE,  W / 2, H * 0.42, 88, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.50, 34, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 66, C.a);
        txt('TAP TO START', W / 2, H * 0.85, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      drawHoop(0);
      txt(resultSuccess ? 'SWISH!' : 'MISSED', W / 2, H * 0.55, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.66, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.76, 52, C.c);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
    }

    if (launched && !done) {
      ballVY += GRAVITY * dt;
      ballVX += wind * dt;
      ballX += ballVX * dt;
      ballY += ballVY * dt;

      trail.push({ x: ballX, y: ballY, age: 0 });
      for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
      trail = trail.filter(function(t) { return t.age < 0.3; });

      // リング通過判定（下降中）
      if (ballVY > 0 && ballY >= HOOP_Y - 12 && ballY <= HOOP_Y + 24) {
        if (Math.abs(ballX - HOOP_X) < HOOP_R_INNER - BALL_R * 0.5) {
          score++;
          feedbackOk = true;
          feedback = 0.6;
          hoopFlash = 0.5;
          game.audio.play('se_success');
          launched = false;
          if (score >= NEEDED) { finish(true); return; }
          resetBall();
          return;
        }
      }
      // ミス（場外/落下）
      if (ballY > H + 100 || ballX < -100 || ballX > W + 100) {
        misses++;
        feedbackOk = false;
        feedback = 0.5;
        game.audio.play('se_failure', 0.5);
        launched = false;
        if (misses >= MAX_MISS) { finish(false); return; }
        resetBall();
      }
    }

    if (feedback > 0) feedback -= dt;
    if (hoopFlash > 0) hoopFlash -= dt;

    // ---- 描画 ----
    background();

    // 風インジケータ
    var windStr = Math.round(Math.abs(wind) / 20);
    txt('WIND ' + (wind > 0 ? '►' : '◄') + windStr, W / 2, H - 130, 40, C.e);

    drawHoop(hoopFlash);

    // トレイル
    for (var tri = 0; tri < trail.length; tri++) {
      var tr = trail[tri];
      var tf = 1 - tr.age / 0.3;
      drawPixelCircle(tr.x, tr.y, BALL_R * tf * 0.5, C.f, tf * 0.4);
    }

    if (!launched || ballY < H) drawBall(ballX, ballY);

    // 照準ガイド
    if (!launched) {
      var gdx = HOOP_X - ballX;
      game.draw.line(ballX, ballY, ballX + gdx * 0.3, ballY - (BOTTOM - HOOP_Y) * 0.4, C.g, 2);
    }

    if (feedback > 0) {
      txt(feedbackOk ? 'NICE SHOT!' : 'MISS', W / 2, H * 0.5, 64, feedbackOk ? C.b : C.a);
    }

    // ミスドット
    for (var mi = 0; mi < MAX_MISS; mi++) {
      var mx = snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, snap(H - 80), 24, 24, mi < misses ? C.a : '#2a0a3a');
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 52, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
