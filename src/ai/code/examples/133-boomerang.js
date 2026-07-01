// 133-boomerang.js
// ブーメラン — 投げたブーメランが戻ってくるタイミングでキャッチする間合いゲーム
// 操作: タップで投げる、戻ってきたらもう一度タップでキャッチ
// 成功: 1回キャッチ  失敗: 5回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、荒野） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BOOMERANG';
  var HOW_TO_PLAY = 'TAP TO THROW · TAP AGAIN TO CATCH';
  var MAX_TIME = 15;             // 修正2: 35 → 15
  var NEEDED   = 1;              // 修正2: 10 → 1
  var MAX_MISS = 5;
  var TOP    = 220;
  var BOTTOM = H - 180;

  var THROWER_X = snap(W * 0.5);
  var THROWER_Y = snap(H * 0.74);  // 下部三分の一
  var CATCH_R = 72;
  var FLIGHT_TIME = 1.5;           // 修正2: 少し長めで間合いを取りやすく
  var peakX = snap(W * 0.82), peakY = snap(TOP + 120);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var phase, boomX, boomY, boomAngle, boomPhase, flightTimer;
  var score, misses, timeLeft, done, feedback, feedbackOk, trail, catchWindow;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
      }
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18);
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    // 地平線と荒野
    game.draw.rect(0, snap(H * 0.82), W, H, C.d, 0.4);
    game.draw.rect(0, snap(H * 0.82), W, 8, C.f);
  }

  function getBoomPos(t, returning) {
    var farX = W * 0.85, farY = H * 0.55;
    if (!returning) {
      return {
        x: (1 - t) * (1 - t) * THROWER_X + 2 * (1 - t) * t * peakX + t * t * farX,
        y: (1 - t) * (1 - t) * THROWER_Y + 2 * (1 - t) * t * peakY + t * t * farY
      };
    }
    var rpx = W * 0.4, rpy = H * 0.9;
    return {
      x: (1 - t) * (1 - t) * farX + 2 * (1 - t) * t * rpx + t * t * THROWER_X,
      y: (1 - t) * (1 - t) * farY + 2 * (1 - t) * t * rpy + t * t * THROWER_Y
    };
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawBoomerang(x, y, ang) {
    // 「く」の字の2本腕
    var c = Math.cos(ang), s = Math.sin(ang);
    for (var i = -3; i <= 3; i++) {
      game.draw.rect(snap(x + c * i * 8) - 4, snap(y + s * i * 8) - 4, 8, 8, C.c);
      game.draw.rect(snap(x - s * i * 8) - 4, snap(y + c * i * 8 + Math.abs(i) * 4 - 12) - 4, 8, 8, C.f);
    }
    game.draw.rect(snap(x) - 6, snap(y) - 6, 12, 12, C.g);
  }

  function drawThrower(active) {
    // 投げ手キャラ（頭・胴・腕）
    var y = THROWER_Y;
    pc(THROWER_X, y, 36, C.e, 1);                 // 頭
    game.draw.rect(THROWER_X - 12, y - 8, 8, 8, C.g);
    game.draw.rect(THROWER_X + 4, y - 8, 8, 8, C.g);
    game.draw.rect(THROWER_X - 28, y + 32, 56, 64, C.e);   // 胴
    game.draw.rect(THROWER_X - 28, y + 32, 56, 8, C.b);
    game.draw.rect(THROWER_X + 20, y + 40, 40, 12, C.e);   // 腕
    // キャッチゾーン
    var on = active && Math.floor(game.time.elapsed * 8) % 2 === 0;
    for (var a = 0; a < Math.PI * 2; a += 0.2) {
      game.draw.rect(snap(THROWER_X + Math.cos(a) * CATCH_R) - 4, snap(y + Math.sin(a) * CATCH_R) - 4, 8, 8, on ? C.b : C.d, active ? 0.9 : 0.4);
    }
  }

  function initGame() {
    phase = 'ready';
    boomX = THROWER_X; boomY = THROWER_Y; boomAngle = 0; boomPhase = 0; flightTimer = 0;
    score = 0; misses = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0;
    trail = []; catchWindow = false;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 20) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function missCatch() {
    misses++; feedbackOk = false; feedback = 0.4;
    game.audio.play('se_failure', 0.6);
    phase = 'ready'; boomX = THROWER_X; boomY = THROWER_Y;
    if (misses >= MAX_MISS) finish(false);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (phase === 'ready') {
      phase = 'flying'; flightTimer = 0; trail = []; boomPhase = 0;
      game.audio.play('se_tap', 0.7);
    } else if (phase === 'returning') {
      var d = Math.hypot(boomX - THROWER_X, boomY - THROWER_Y);
      if (d < CATCH_R + 24) {
        score++; feedbackOk = true; feedback = 0.4;
        game.audio.play('se_success');
        phase = 'ready'; boomX = THROWER_X; boomY = THROWER_Y;
        if (score >= NEEDED) finish(true);
      } else {
        missCatch();
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      boomAngle += 8 * dt;
      drawThrower(false);
      var dp = getBoomPos((game.time.elapsed % 3) / 3, false);
      drawBoomerang(dp.x, dp.y, boomAngle);
      txt(GAME_TITLE,  W / 2, H * 0.16, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.47, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.54, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CAUGHT!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }
    boomAngle += 8 * dt;

    if (!done && phase === 'flying') {
      flightTimer += dt;
      boomPhase = Math.min(1, flightTimer / FLIGHT_TIME);
      var p = getBoomPos(boomPhase, false);
      boomX = p.x; boomY = p.y;
      trail.push({ x: boomX, y: boomY, age: 0 });
      if (boomPhase >= 1) { phase = 'returning'; flightTimer = 0; boomPhase = 0; }
    } else if (!done && phase === 'returning') {
      flightTimer += dt;
      boomPhase = Math.min(1, flightTimer / FLIGHT_TIME);
      var p2 = getBoomPos(boomPhase, true);
      boomX = p2.x; boomY = p2.y;
      trail.push({ x: boomX, y: boomY, age: 0 });
      if (boomPhase >= 1) { missCatch(); }
    }

    for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
    trail = trail.filter(function(t) { return t.age < 0.3; });
    catchWindow = (phase === 'returning') && Math.hypot(boomX - THROWER_X, boomY - THROWER_Y) < CATCH_R + 40;
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    // 軌道ガイド
    for (var g = 0; g <= 12; g++) {
      var gp = getBoomPos(g / 12, false);
      game.draw.rect(snap(gp.x) - 3, snap(gp.y) - 3, 6, 6, C.d, 0.5);
      var gp2 = getBoomPos(g / 12, true);
      game.draw.rect(snap(gp2.x) - 3, snap(gp2.y) - 3, 6, 6, C.a, 0.3);
    }
    for (var tri = 0; tri < trail.length; tri++) {
      var tr = trail[tri];
      var tf = 1 - tr.age / 0.3;
      game.draw.rect(snap(tr.x) - 4, snap(tr.y) - 4, 8, 8, C.f, tf * 0.5);
    }
    drawThrower(catchWindow);
    if (phase !== 'ready') drawBoomerang(boomX, boomY, boomAngle);
    if (catchWindow && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('NOW!', THROWER_X, THROWER_Y - 110, 64, C.b);
    if (feedback > 0) txt(feedbackOk ? 'CATCH!' : 'MISS', W / 2, H * 0.5, 72, feedbackOk ? C.b : C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 216, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    txt(phase === 'ready' ? 'TAP TO THROW' : (phase === 'returning' ? 'TAP TO CATCH!' : '...'), W / 2, H - 130, 44, catchWindow ? C.b : C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
