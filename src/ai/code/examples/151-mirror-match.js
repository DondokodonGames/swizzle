// 151-mirror-match.js
// 鏡文字 — 左右反転した図形を見て正しい向きのものを選ぶ空間認識ゲーム
// 操作: タップで左右どちらかを選択
// 成功: 2問正解  失敗: 4回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、鏡の間） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR MATCH';
  var HOW_TO_PLAY = 'PICK THE ONE MATCHING THE TOP';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 2;              // 修正2: 15 → 2
  var MAX_MISS = 4;
  var TOP    = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pl(x1, y1, x2, y2, color, w) {
    var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
    for (var i = 0; i <= steps; i++) { var t = i / steps; game.draw.rect(snap(x1 + (x2 - x1) * t) - w / 2, snap(y1 + (y2 - y1) * t) - w / 2, w, w, color, 1); }
  }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
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

  // ── 図形（ピクセル線で描画、mirrorで左右反転） ──
  var SHAPES = [
    function(cx, cy, s, m) { m = m ? -1 : 1; pl(cx, cy - s * 0.5, cx, cy + s * 0.3, C.c, 12); pl(cx, cy + s * 0.3, cx + m * s * 0.3, cy + s * 0.3, C.c, 12); pc(cx + m * s * 0.3, cy + s * 0.18, s * 0.14, C.c, 1); }, // J
    function(cx, cy, s, m) { m = m ? -1 : 1; pl(cx - m * s * 0.4, cy, cx + m * s * 0.4, cy, C.c, 12); pl(cx + m * s * 0.1, cy - s * 0.25, cx + m * s * 0.4, cy, C.c, 12); pl(cx + m * s * 0.1, cy + s * 0.25, cx + m * s * 0.4, cy, C.c, 12); }, // arrow
    function(cx, cy, s, m) { m = m ? -1 : 1; pl(cx - m * s * 0.15, cy - s * 0.4, cx - m * s * 0.15, cy + s * 0.4, C.c, 12); pl(cx - m * s * 0.15, cy + s * 0.4, cx + m * s * 0.35, cy + s * 0.4, C.c, 12); }, // L
    function(cx, cy, s, m) { m = m ? -1 : 1; pl(cx - m * s * 0.15, cy - s * 0.4, cx - m * s * 0.15, cy + s * 0.4, C.c, 12); pl(cx - m * s * 0.15, cy - s * 0.4, cx + m * s * 0.3, cy - s * 0.4, C.c, 12); pl(cx - m * s * 0.15, cy, cx + m * s * 0.2, cy, C.c, 12); }, // F
    function(cx, cy, s, m) { m = m ? -1 : 1; pl(cx - m * s * 0.35, cy - s * 0.3, cx + m * s * 0.1, cy, C.c, 12); pl(cx + m * s * 0.1, cy, cx - m * s * 0.35, cy + s * 0.3, C.c, 12); pl(cx - m * s * 0.35, cy + s * 0.3, cx + m * s * 0.35, cy + s * 0.3, C.c, 12); } // zigzag
  ];

  // ── ゲーム変数 ──
  var shapeFn, correctSide, score, misses, timeLeft, done, feedback, feedbackOk, feedbackSide;

  function newRound() {
    shapeFn = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    correctSide = Math.random() < 0.5 ? 0 : 1;
    feedback = 0;
  }

  function initGame() {
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackSide = -1;
    newRound();
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
    var correct = (pickedLeft && correctSide === 0) || (!pickedLeft && correctSide === 1);
    feedbackSide = pickedLeft ? 0 : 1;
    if (correct) {
      score++; feedbackOk = true; feedback = 0.6;
      game.audio.play('se_success');
      if (score >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (state === S.PLAYING && !done) newRound(); }, 650);
    } else {
      misses++; feedbackOk = false; feedback = 0.6;
      game.audio.play('se_failure');
      if (misses >= MAX_MISS) { finish(false); return; }
      setTimeout(function() { if (state === S.PLAYING && !done) newRound(); }, 650);
    }
  });

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, TOP, W, H - TOP - 180, C.d, 0.12);
  }

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      SHAPES[Math.floor(game.time.elapsed) % SHAPES.length](W / 2, H * 0.4, 160, false);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.60, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.80, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.86, 50, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#886699');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYE!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }
    if (feedback > 0) feedback -= dt;

    background();
    // お手本（上）
    var ty = H * 0.30;
    game.draw.rect(W / 2 - 160, ty - 120, 320, 240, '#0a0018', 0.8);
    game.draw.rect(W / 2 - 160, ty - 120, 320, 8, C.e);
    txt('MATCH THIS', W / 2, ty - 150, 40, C.e);
    shapeFn(W / 2, ty, 120, false);

    // 選択肢（下）
    var cy = H * 0.62;
    var leftMirror = correctSide === 1, rightMirror = correctSide === 0;
    var lCol = feedback > 0 && feedbackSide === 0 ? (feedbackOk ? C.b : C.a) : C.d;
    var rCol = feedback > 0 && feedbackSide === 1 ? (feedbackOk ? C.b : C.a) : C.d;
    game.draw.rect(48, cy - 120, W / 2 - 72, 240, lCol, 0.6);
    game.draw.rect(48, cy - 120, W / 2 - 72, 8, C.e);
    shapeFn(W / 4, cy, 96, leftMirror);
    game.draw.rect(W / 2 + 24, cy - 120, W / 2 - 72, 240, rCol, 0.6);
    game.draw.rect(W / 2 + 24, cy - 120, W / 2 - 72, 8, C.e);
    shapeFn(W * 3 / 4, cy, 96, rightMirror);

    txt('◄ LEFT', W * 0.25, H - 130, 40, C.c);
    txt('RIGHT ►', W * 0.75, H - 130, 40, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
