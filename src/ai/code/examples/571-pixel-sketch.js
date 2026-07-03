// 571-pixel-sketch.js
// ピクセルスケッチ — 薄く示されたお題の形に沿って、スワイプ/タップでドットを置いて絵を完成させる
// 操作: 下のパレットで色を選び、盤面をスワイプ/タップで塗る。お題マスの80%を塗れば完成
// 成功: 一致率 80% 達成  失敗: 30秒経過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ドット絵工房） ──
  var C = { bg:'#0f0f1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var DRAW = ['#ff2079', '#00cfff', '#00ff9f', '#ffe600', '#7700ff'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIXEL SKETCH';
  var HOW_TO_PLAY = 'PICK A COLOR · PAINT THE FADED SHAPE · FILL 80% OF ITS CELLS';
  var MAX_TIME = 30;
  var COLS = 10, ROWS = 12, CELL = 88;
  var OX = snap((W - COLS * CELL) / 2), OY = snap(H * 0.15);
  var BTN_Y = snap(H * 0.15) + ROWS * 88 + 30, BTN_H = 90;

  var TEMPLATES = [
    [0,0,1,1,0,0,1,1,0,0, 0,1,1,1,1,1,1,1,1,0, 0,1,1,1,1,1,1,1,1,0, 0,1,1,1,1,1,1,1,1,0, 0,0,1,1,1,1,1,1,0,0, 0,0,0,1,1,1,1,0,0,0, 0,0,0,0,1,1,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,0, 0,0,0,1,1,1,1,0,0,0, 1,1,1,1,1,1,1,1,1,1, 0,1,1,1,1,1,1,1,1,0, 0,0,1,1,1,1,1,1,0,0, 0,1,1,0,1,1,0,1,1,0, 1,1,0,0,1,1,0,0,1,1, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,0,0,0,0, 0,0,0,1,1,1,1,0,0,0, 0,0,1,1,1,1,1,1,0,0, 0,1,1,0,1,1,0,1,1,0, 0,0,0,0,1,1,0,0,0,0, 0,0,0,0,1,1,0,0,0,0, 0,0,0,0,1,1,0,0,0,0, 0,0,0,0,1,1,0,0,0,0, 0,0,0,0,1,1,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0,0,0]
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, user, currentColor, accuracy, timeLeft, done, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#1a1a2e');
  }

  function background() { game.draw.clear(C.bg); }

  function loadTemplate(idx) { target = TEMPLATES[idx % TEMPLATES.length].slice(0, COLS * ROWS); user = []; for (var i = 0; i < COLS * ROWS; i++) user.push(-1); accuracy = 0; }

  function calcAccuracy() { var tc = 0, cc = 0; for (var i = 0; i < target.length; i++) if (target[i] === 1) { tc++; if (user[i] >= 0) cc++; } return tc > 0 ? cc / tc : 0; }

  function initGame() { currentColor = 0; timeLeft = MAX_TIME; done = false; flash = 0; loadTemplate(Math.floor(Math.random() * TEMPLATES.length)); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(accuracy * 2000) + Math.ceil(timeLeft) * 100) : Math.round(accuracy * 1000);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function paint(tx, ty) {
    var c = Math.floor((tx - OX) / CELL), r = Math.floor((ty - OY) / CELL); if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    user[r * COLS + c] = currentColor; accuracy = calcAccuracy();
    if (accuracy >= 0.8 && !done) { flash = 0.5; finish(true); }
  }

  function drawScene() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var i = r * COLS + c, gx = OX + c * CELL, gy = OY + r * CELL;
      game.draw.rect(gx + 1, gy + 1, CELL - 2, CELL - 2, '#1a1a2e', 0.9);
      if (target[i] === 1) game.draw.rect(gx + 1, gy + 1, CELL - 2, CELL - 2, C.d, 0.35);
      if (user[i] >= 0) { var ok = target[i] === 1; game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, DRAW[user[i]], ok ? 0.9 : 0.5); if (!ok) game.draw.line(gx + 6, gy + 6, gx + CELL - 6, gy + CELL - 6, C.g, 2); }
    }
    var bw = W * 0.84 / DRAW.length, bx0 = snap(W * 0.08);
    for (var ci = 0; ci < DRAW.length; ci++) { var bx = bx0 + ci * bw, sel = ci === currentColor; game.draw.rect(bx + 6, BTN_Y, bw - 12, BTN_H, DRAW[ci], sel ? 0.95 : 0.6); if (sel) { game.draw.rect(bx + 6, BTN_Y, bw - 12, 8, C.g, 0.8); game.draw.rect(bx + 6, BTN_Y + BTN_H - 8, bw - 12, 8, C.g, 0.8); } }
    var aw = W * 0.7, ax = (W - aw) / 2, ay = BTN_Y + 120;
    game.draw.rect(ax, ay, aw, 24, '#374151', 0.4); game.draw.rect(ax, ay, aw * accuracy, 24, accuracy >= 0.8 ? C.b : DRAW[currentColor], 0.9);
    txt(Math.round(accuracy * 100) + '%  (80% TO FINISH)', W / 2, ay + 62, 38, accuracy >= 0.8 ? C.b : C.g);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var bw = W * 0.84 / DRAW.length, bx0 = snap(W * 0.08);
    if (ty >= BTN_Y && ty <= BTN_Y + BTN_H) { var ci = Math.floor((tx - bx0) / bw); if (ci >= 0 && ci < DRAW.length) { currentColor = ci; game.audio.play('se_tap', 0.2); } return; }
    paint(tx, ty); game.audio.play('se_tap', 0.1);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (CELL * 0.5)));
    for (var s = 0; s <= steps; s++) paint(x1 + (x2 - x1) * s / steps, y1 + (y2 - y1) * s / steps);
    game.audio.play('se_tap', 0.08);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!target) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.075, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.11, 18, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.965, 48, C.a);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTERPIECE!' : 'TIME UP', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
