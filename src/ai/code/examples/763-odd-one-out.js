// 763-odd-one-out.js
// オッドワンアウト — 4つの図形の中から、色か形が違う1つを素早く見つけてタップする
// 操作: 仲間はずれの図形をタップ。間違えるとミス
// 成功: 10問 正解  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、図形色は保持） ──
  var C = { bg:'#070510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = ['#00cfff', '#ff2fa0', '#00ff41', '#ffe600'];
  var SHAPES = ['circle', 'rect', 'triangle', 'diamond'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ODD ONE OUT';
  var HOW_TO_PLAY = 'FIND THE SHAPE THAT DIFFERS IN COLOR OR FORM · TAP IT FAST';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 35 → 10
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var GRID_COLS = 2, CELL_W = W * 0.42, CELL_H = H * 0.18, CELL_GAP_X = (W - W * 0.42 * 2) / 3, CELL_GAP_Y = H * 0.05, GRID_TOP = snap(H * 0.30);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var items, answered, waitTimer, score, errors, timeLeft, done, elapsed, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0c0a18');
  }

  function background() { game.draw.clear(C.bg); }

  function getCellPos(idx) { var col = idx % GRID_COLS, row = Math.floor(idx / GRID_COLS); return { cx: CELL_GAP_X + col * (CELL_W + CELL_GAP_X) + CELL_W / 2, cy: GRID_TOP + row * (CELL_H + CELL_GAP_Y) + CELL_H / 2 }; }

  function newRound() {
    items = []; answered = false;
    var useColorDiff = Math.random() < 0.5, majorShape = SHAPES[Math.floor(Math.random() * SHAPES.length)], majorColor = COLORS[Math.floor(Math.random() * COLORS.length)], oddIdx = Math.floor(Math.random() * 4), oddShape = majorShape, oddColor = majorColor;
    if (useColorDiff) { var oc = COLORS.filter(function(c) { return c !== majorColor; }); oddColor = oc[Math.floor(Math.random() * oc.length)]; }
    else { var os = SHAPES.filter(function(s) { return s !== majorShape; }); oddShape = os[Math.floor(Math.random() * os.length)]; }
    for (var i = 0; i < 4; i++) { var pos = getCellPos(i), isOdd = i === oddIdx; items.push({ cx: pos.cx, cy: pos.cy, w: CELL_W - 24, h: CELL_H - 16, color: isOdd ? oddColor : majorColor, shape: isOdd ? oddShape : majorShape, isOdd: isOdd }); }
  }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawShape(shape, cx, cy, w, h, color) {
    var hw = w / 2, hh = h / 2;
    if (shape === 'circle') pc(cx, cy, Math.min(hw, hh) * 0.8, color, 0.9);
    else if (shape === 'rect') game.draw.rect(snap(cx - hw * 0.8), snap(cy - hh * 0.8), snap(hw * 1.6), snap(hh * 1.6), color, 0.9);
    else if (shape === 'triangle') { var sz = Math.min(hw, hh) * 1.4; for (var t = 0; t < 8; t++) { var w2 = sz * 1.4 * (t / 8), yy = cy - sz * 0.7 + t * sz * 0.15; game.draw.rect(snap(cx - w2 / 2), snap(yy), snap(w2), snap(sz * 0.16), color, 0.9); } }
    else if (shape === 'diamond') { var ds = Math.min(hw, hh) * 0.85; for (var di = 0; di < 10; di++) { var dp = di / 10, dw = ds * Math.sin(dp * Math.PI), dy = cy - ds + di * ds * 0.2; game.draw.rect(snap(cx - dw), snap(dy), snap(dw * 2), snap(ds * 0.22), color, 0.9); } }
  }

  function drawScene() {
    txt('FIND THE ODD ONE', W / 2, snap(H * 0.24), 40, '#ffffff88');
    for (var i = 0; i < items.length; i++) { var it = items[i]; game.draw.rect(it.cx - it.w / 2, it.cy - it.h / 2, it.w, it.h, '#1e1b4b', 0.9); drawShape(it.shape, it.cx, it.cy, it.w * 0.7, it.h * 0.85, it.color); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered || waitTimer > 0) return;
    var tappedIdx = -1;
    for (var i = 0; i < items.length; i++) { var it = items[i]; if (tx > it.cx - it.w / 2 && tx < it.cx + it.w / 2 && ty > it.cy - it.h / 2 && ty < it.cy + it.h / 2) { tappedIdx = i; break; } }
    if (tappedIdx < 0) return;
    answered = true;
    if (items[tappedIdx].isOdd) { score++; flash = 0.2; flashCol = C.b; resultText = 'CORRECT!'; resultTimer = 0.35; game.audio.play('se_success', 0.55); if (score >= NEEDED) { finish(true); return; } }
    else { errors++; flash = 0.28; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.4; game.audio.play('se_failure', 0.28); if (errors >= MAX_ERR) { finish(false); return; } }
    waitTimer = 0.35;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!items) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'EAGLE EYE!' : 'FOOLED YOU', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.73), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0c0a18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
