// 154-pendulum-time.js
// 振り子タイミング — 揺れる振り子が的に重なる瞬間を狙って止める快感
// 操作: タップで振り子を止める
// 成功: 1回命中  失敗: 3回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、時計塔） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PENDULUM TIME';
  var HOW_TO_PLAY = 'TAP TO STOP ON THE ★ ZONE';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 3;
  var PIVOT_X = snap(W / 2), PIVOT_Y = snap(H * 0.20), ROD_LEN = 520;
  var GRAVITY_COEFF = 3.0, FREEZE_TIME = 0.5, TARGET_W = 0.26;   // 修正2: 判定広め

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var angle, angleVel, running, targetAngle, targetWidth, score, misses, timeLeft, done;
  var feedback, feedbackOk, frozenTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
  }

  function pl(x1, y1, x2, y2, color, w) {
    var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
    for (var i = 0; i <= steps; i++) { var t = i / steps; game.draw.rect(snap(x1 + (x2 - x1) * t) - w / 2, snap(y1 + (y2 - y1) * t) - w / 2, w, w, color, 1); }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function newTarget() {
    targetAngle = (Math.random() - 0.5) * 1.2;
    targetWidth = TARGET_W;
    angle = (Math.random() > 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.3);
    angleVel = 0; running = true;
  }

  function initGame() {
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; frozenTimer = 0;
    newTarget();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 30) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    // 振り子アークガイド
    for (var a = -1.1; a <= 1.1; a += 0.06) game.draw.rect(snap(PIVOT_X + Math.sin(a) * ROD_LEN) - 3, snap(PIVOT_Y + Math.cos(a) * ROD_LEN) - 3, 6, 6, C.d, 0.3);
    // ターゲットゾーン
    for (var a2 = targetAngle - targetWidth; a2 <= targetAngle + targetWidth; a2 += 0.02) game.draw.rect(snap(PIVOT_X + Math.sin(a2) * ROD_LEN) - 5, snap(PIVOT_Y + Math.cos(a2) * ROD_LEN) - 5, 10, 10, C.b, 0.5);
    var tzX = PIVOT_X + Math.sin(targetAngle) * ROD_LEN, tzY = PIVOT_Y + Math.cos(targetAngle) * ROD_LEN;
    pc(tzX, tzY, 24, C.b, 0.8); txt('★', tzX, tzY - 8, 36, C.c);
    // ロッド＋ボブ
    var bobX = PIVOT_X + Math.sin(angle) * ROD_LEN, bobY = PIVOT_Y + Math.cos(angle) * ROD_LEN;
    pl(PIVOT_X, PIVOT_Y, bobX, bobY, C.g, 8);
    pc(PIVOT_X, PIVOT_Y, 22, C.d, 1); pc(PIVOT_X, PIVOT_Y, 10, C.g, 0.8);
    var inZone = Math.abs(angle - targetAngle) < targetWidth;
    pc(bobX, bobY, 44, inZone ? C.b : C.f, 1);
    pc(bobX - 12, bobY - 14, 10, C.g, 0.7);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || frozenTimer > 0) return;
    running = false;
    if (Math.abs(angle - targetAngle) < targetWidth) {
      score++; feedbackOk = true; feedback = 0.5; frozenTimer = FREEZE_TIME;
      game.audio.play('se_success', 0.8);
      if (score >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (state === S.PLAYING && !done) newTarget(); }, FREEZE_TIME * 1000);
    } else {
      misses++; feedbackOk = false; feedback = 0.5; frozenTimer = 0.3; running = true;
      game.audio.play('se_failure', 0.6);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      angle = Math.sin(game.time.elapsed * 2) * 0.9; targetAngle = 0; targetWidth = TARGET_W;
      drawScene();
      txt(GAME_TITLE, W / 2, H * 0.06, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (frozenTimer > 0) frozenTimer -= dt;
      if (running) {
        angleVel += -GRAVITY_COEFF * Math.sin(angle) * dt;
        angleVel *= Math.pow(0.999, dt * 60);
        angle += angleVel * dt;
      }
    }
    if (feedback > 0) feedback -= dt;

    background();
    drawScene();
    if (feedback > 0) { game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.15); txt(feedbackOk ? 'HIT!' : 'MISS', W / 2, H * 0.5, 72, feedbackOk ? C.b : C.a); }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    txt('TAP TO STOP', W / 2, H - 120, 44, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
