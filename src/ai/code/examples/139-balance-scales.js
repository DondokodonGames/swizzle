// 139-balance-scales.js
// 天秤 — 積み重なるおもりを見て重い方を素早く選ぶ直感的な重さ判定ゲーム
// 操作: タップ左/右で重い方を選択
// 成功: 2問正解  失敗: 4回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、計量所） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALANCE SCALES';
  var HOW_TO_PLAY = 'TAP THE HEAVIER SIDE';
  var MAX_TIME = 15;             // 修正2: 35 → 15
  var NEEDED   = 2;              // 修正2: 12 → 2
  var MAX_MISS = 4;
  var TOP    = 220;

  var BEAM_X = snap(W / 2), BEAM_Y = snap(H * 0.42), BEAM_L = snap(W * 0.36);
  var PAN_W = 200, ROPE_L = 120, MAX_TILT = 0.32, TILT_SPEED = 2.0;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var leftW, rightW, tilt, score, misses, timeLeft, done, feedback, feedbackOk, revealTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#001133');
  }

  function background() {
    game.draw.clear(C.bg);
    // 支柱
    game.draw.rect(BEAM_X - 12, BEAM_Y - 20, 24, snap(H * 0.36), C.a);
    game.draw.rect(BEAM_X - 40, BEAM_Y + snap(H * 0.34), 80, 24, C.a);
  }

  // ── 天秤スプライト（多矩形・皿＋おもり） ──
  function drawPan(px, py, weight, label) {
    // ロープ
    game.draw.rect(snap(px) - PAN_W / 2 + 8, snap(py) - ROPE_L, 6, ROPE_L, C.a);
    game.draw.rect(snap(px) + PAN_W / 2 - 14, snap(py) - ROPE_L, 6, ROPE_L, C.a);
    // 皿
    game.draw.rect(snap(px) - PAN_W / 2, snap(py), PAN_W, 20, C.b);
    game.draw.rect(snap(px) - PAN_W / 2, snap(py), PAN_W, 6, C.c);
    // おもり（積み上げブロック）
    for (var i = 0; i < weight; i++) {
      var row = Math.floor(i / 3), col = i % 3;
      var wx = snap(px - 40 + col * 40), wy = snap(py - 40 - row * 40);
      game.draw.rect(wx, wy, 32, 32, C.d);
      game.draw.rect(wx, wy, 32, 8, C.c);
      game.draw.rect(wx, wy + 24, 32, 8, '#000000', 0.4);
    }
    txt(label + '', px, py + 72, 72, C.g);
  }

  function drawScale() {
    var bl = BEAM_L * Math.cos(tilt), bh = BEAM_L * Math.sin(tilt);
    var lx = BEAM_X - bl, ly = BEAM_Y - bh, rx = BEAM_X + bl, ry = BEAM_Y + bh;
    // ビーム
    game.draw.line(lx, ly, rx, ry, C.d, 16);
    game.draw.line(lx, ly, rx, ry, C.c, 4);
    game.draw.rect(BEAM_X - 16, BEAM_Y - 36, 32, 32, C.b);   // 支点
    drawPan(lx, ly + ROPE_L, leftW, leftW);
    drawPan(rx, ry + ROPE_L, rightW, rightW);
  }

  function genRound() {
    leftW = Math.floor(Math.random() * 8) + 1;
    rightW = Math.floor(Math.random() * 8) + 1;
    while (rightW === leftW) rightW = Math.floor(Math.random() * 8) + 1;
    revealTimer = 0;
  }

  function initGame() {
    score = 0; misses = 0; tilt = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0; revealTimer = 0;
    genRound();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || feedback > 0) return;
    var pickedLeft = x < W / 2;
    var correct = (pickedLeft && leftW > rightW) || (!pickedLeft && rightW > leftW);
    if (correct) {
      score++; feedbackOk = true; feedback = 0.5;
      game.audio.play('se_success');
      if (score >= NEEDED) { finish(true); return; }
    } else {
      misses++; feedbackOk = false; feedback = 0.5;
      game.audio.play('se_failure');
      if (misses >= MAX_MISS) { finish(false); return; }
    }
    revealTimer = 0.6;
    setTimeout(function() { if (state === S.PLAYING && !done) genRound(); }, 600);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      tilt += (((rightW || 3) - (leftW || 5)) / 8 * MAX_TILT - tilt) * dt * TILT_SPEED;
      background();
      drawScale();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.80, 34, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.87, 62, C.d);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.c);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYE!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }
    tilt += ((rightW - leftW) / 8 * MAX_TILT - tilt) * dt * TILT_SPEED;
    if (feedback > 0) feedback -= dt;
    if (revealTimer > 0) revealTimer -= dt;

    background();
    drawScale();
    // 左右の指示
    txt('◄ LEFT', W * 0.24, H - 130, 40, C.b);
    txt('RIGHT ►', W * 0.76, H - 130, 40, C.b);
    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.f : C.e, feedback * 0.18);
      txt(feedbackOk ? 'CORRECT!' : 'WRONG', W / 2, H * 0.72, 72, feedbackOk ? C.f : C.e);
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.e : '#001133');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
