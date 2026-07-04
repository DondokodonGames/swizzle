// 636-pixel-paint.js
// ピクセルペイント — お手本のドット絵を、格子をタップで塗って時間内に再現する
// 操作: セルをタップで塗る/消す（左右スワイプで色替え）→ CHECKボタンで一致率判定
// 成功: 80%以上 一致  失敗: 30秒 or 3回チェックで50%未満

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ドット絵工房／絵の具色は保持） ──
  var C = { bg:'#0c0c10', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PALETTE = ['#ff2079', '#ff6600', '#ffe600', '#00ff9f', '#00cfff', '#7700ff', '#ff66cc', '#ffffff'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIXEL PAINT';
  var HOW_TO_PLAY = 'TAP CELLS TO PAINT · SWIPE TO CHANGE COLOR · HIT CHECK TO MATCH THE TARGET';
  var MAX_TIME = 30;
  var COLS = 10, ROWS = 10, CELL_W = Math.floor(W / COLS), CELL_H = Math.floor(snap(H * 0.46) / ROWS), GRID_Y = snap(H * 0.22);
  var MAX_CHECKS = 3;

  var PATTERNS = [
    [[0,0,1,1,0,0,1,1,0,0],[0,1,1,1,1,1,1,1,1,0],[1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,1,1,0],[0,0,1,1,1,1,1,1,0,0],[0,0,0,1,1,1,1,0,0,0],[0,0,0,0,1,1,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]],
    [[0,0,0,0,1,1,0,0,0,0],[0,0,0,1,1,1,1,0,0,0],[1,1,1,1,1,1,1,1,1,1],[0,1,1,1,1,1,1,1,1,0],[0,0,1,1,1,1,1,1,0,0],[0,1,1,0,1,1,0,1,1,0],[1,1,0,0,1,1,0,0,1,1],[1,0,0,0,0,0,0,0,0,1],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]],
    [[0,0,0,0,1,1,0,0,0,0],[0,0,0,1,1,1,1,0,0,0],[0,0,1,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,1,0],[0,0,0,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,0,0,0],[0,0,0,0,0,0,0,0,0,0]]
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var colorIdx, playerGrid, targetGrid, checks, matchPercent, timeLeft, done, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#0a0a18');
  }

  function background() { game.draw.clear(C.bg); }

  function loadPattern() {
    var pi = Math.floor(Math.random() * PATTERNS.length), tc = Math.floor(Math.random() * PALETTE.length) + 1;
    playerGrid = []; targetGrid = [];
    for (var r = 0; r < ROWS; r++) { playerGrid.push([]); targetGrid.push([]); for (var c = 0; c < COLS; c++) { targetGrid[r].push(PATTERNS[pi][r][c] ? tc : 0); playerGrid[r].push(0); } }
  }

  function initGame() { colorIdx = 0; checks = 0; matchPercent = 0; timeLeft = MAX_TIME; done = false; resultText = ''; resultTimer = 0; loadPattern(); }

  function calcMatch() { var total = 0, matched = 0; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { total++; var tv = targetGrid[r][c] > 0 ? 1 : 0, pv = playerGrid[r][c] > 0 ? 1 : 0; if (tv === pv) matched++; } return matched / total; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.floor(matchPercent * 1000) + Math.ceil(timeLeft) * 60) : Math.floor(matchPercent * 500);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    // target preview (top-right)
    var PW = 180, PH = Math.floor(PW * ROWS / COLS), PX = W - PW - 24, PY = snap(H * 0.10);
    game.draw.rect(PX - 4, PY - 4, PW + 8, PH + 8, '#222', 0.8);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (targetGrid[r][c] > 0) game.draw.rect(PX + c * (PW / COLS), PY + r * (PH / ROWS), Math.ceil(PW / COLS), Math.ceil(PH / ROWS), PALETTE[targetGrid[r][c] - 1], 0.9);
    txt('TARGET', PX + PW / 2, PY - 12, 24, C.c);
    // player grid
    for (var r2 = 0; r2 < ROWS; r2++) for (var c2 = 0; c2 < COLS; c2++) {
      var gx = c2 * CELL_W, gy = GRID_Y + r2 * CELL_H;
      game.draw.rect(gx + 1, gy + 1, CELL_W - 2, CELL_H - 2, '#1a1a2e', 0.5);
      if (playerGrid[r2][c2] > 0) game.draw.rect(gx + 2, gy + 2, CELL_W - 4, CELL_H - 4, PALETTE[playerGrid[r2][c2] - 1], 0.95);
    }
    // palette
    var palY = GRID_Y + ROWS * CELL_H + 24;
    for (var pi = 0; pi < PALETTE.length; pi++) { var px = pi * (W / PALETTE.length) + (W / PALETTE.length) / 2; pc(px, palY + 28, pi === colorIdx ? 32 : 24, PALETTE[pi], 0.9); if (pi === colorIdx) pc(px, palY + 28, 38, C.g, 0.25); }
    // check button
    var btnY = palY + 90;
    game.draw.rect(W / 2 - 170, btnY, 340, 72, C.c, 0.8);
    txt('CHECK (' + (MAX_CHECKS - checks) + ')', W / 2, btnY + 46, 34, '#000000');
    if (resultTimer > 0) txt(resultText, W / 2, snap(btnY + 130), 40, C.a);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor(tx / CELL_W), row = Math.floor((ty - GRID_Y) / CELL_H);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS && ty >= GRID_Y) {
      playerGrid[row][col] = playerGrid[row][col] > 0 ? 0 : colorIdx + 1; game.audio.play('se_tap', 0.08); return;
    }
    var palY = GRID_Y + ROWS * CELL_H + 24, btnY = palY + 90;
    if (ty >= btnY && ty <= btnY + 72 && tx >= W / 2 - 170 && tx <= W / 2 + 170) {
      matchPercent = calcMatch(); checks++;
      if (matchPercent >= 0.8) { finish(true); return; }
      resultText = Math.floor(matchPercent * 100) + '%  TRY AGAIN'; resultTimer = 1.5; game.audio.play('se_failure', 0.3);
      if (checks >= MAX_CHECKS && matchPercent < 0.5) { finish(false); return; }
    }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'right') colorIdx = (colorIdx + 1) % PALETTE.length; if (dir === 'left') colorIdx = (colorIdx - 1 + PALETTE.length) % PALETTE.length; game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!playerGrid) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.055, 70, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.09, 18, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄', W / 2, H * 0.965, 44, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTERPIECE!' : 'SMUDGED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
