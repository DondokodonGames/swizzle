// 107-pixel-paint.js
// ピクセルペイント — お手本の色でマスを塗ってドット絵を完成させる塗り絵
// 操作: 下の色を選び、マスをタップして塗る
// 成功: お手本通りに塗り上げる  失敗: 5回間違える or 50秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'PIXEL PAINT';
  var HOW_TO_PLAY = 'PICK A COLOR, PAINT THE PIXELS';
  var MAX_TIME = 50;
  var MAX_MISS = 5;         // 修正2: 10 → 5
  var INK = [C.a, C.e, C.c, C.b];                      // 4色パレット
  // お手本ドット絵（ハート, 5x5） 0=空, 1=赤, 2=黄
  var TARGET = [
    [0, 1, 0, 1, 0],
    [1, 1, 2, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 1, 0, 0]
  ];
  var COLOR_MAP = { 1: C.a, 2: C.c };                  // 目標色
  var COLS = 5, ROWS = 5, CELL = 160;
  var GRID_X = (W - COLS * CELL) / 2, GRID_Y = H * 0.26;
  var PICK_Y = H * 0.82, PICK_GAP = 200, PICK_R = 56, PICK_X0 = W / 2 - (INK.length - 1) / 2 * PICK_GAP;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var grid, selected, misses, painted, totalPaintable, timeLeft, done, feedback, feedbackOk;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() {
    grid = []; totalPaintable = 0;
    for (var r = 0; r < ROWS; r++) { grid.push([]); for (var c = 0; c < COLS; c++) { grid[r].push(-1); if (TARGET[r][c] !== 0) totalPaintable++; } }
    selected = 0; misses = 0; painted = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false;
  }
  function correctCount() { var n = 0; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { if (TARGET[r][c] === 0) continue; if (grid[r][c] >= 0 && INK[grid[r][c]] === COLOR_MAP[TARGET[r][c]]) n++; } return n; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 20) : correctCount() * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < INK.length; i++) { var px = PICK_X0 + i * PICK_GAP; if (Math.sqrt((tx - px) * (tx - px) + (ty - PICK_Y) * (ty - PICK_Y)) < PICK_R + 20) { selected = i; game.audio.play('se_tap', 0.3); return; } }
    var col = Math.floor((tx - GRID_X) / CELL), row = Math.floor((ty - GRID_Y) / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if (TARGET[row][col] === 0 || grid[row][col] >= 0) return;
    grid[row][col] = selected; painted++;
    if (INK[selected] === COLOR_MAP[TARGET[row][col]]) { feedbackOk = true; feedback = 0.2; game.audio.play('se_tap', 0.8); }
    else { misses++; feedbackOk = false; feedback = 0.25; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } }
    if (painted >= totalPaintable) { finish(correctCount() / totalPaintable >= 0.9); }
  });

  // 世界観: ドット絵工房。お手本の配色を見てマスを塗りキャラを完成させる。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(snap(GRID_X) - 16, snap(GRID_Y) - 16, COLS * CELL + 32, ROWS * CELL + 32, '#12002a');
    txt('PIXEL STUDIO', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var gx = GRID_X + c * CELL, gy = GRID_Y + r * CELL, tgt = TARGET[r][c];
      if (tgt === 0) { game.draw.rect(snap(gx) + 4, snap(gy) + 4, CELL - 8, CELL - 8, '#0a0018'); }
      else if (grid[r][c] >= 0) { game.draw.rect(snap(gx) + 4, snap(gy) + 4, CELL - 8, CELL - 8, INK[grid[r][c]]); if (INK[grid[r][c]] !== COLOR_MAP[tgt]) game.draw.line(gx + 8, gy + 8, gx + CELL - 8, gy + CELL - 8, C.e, 5); }
      else { game.draw.rect(snap(gx) + 4, snap(gy) + 4, CELL - 8, CELL - 8, '#1a1030'); game.draw.rect(snap(gx) + 4, snap(gy) + 4, CELL - 8, CELL - 8, COLOR_MAP[tgt], 0.12); }
    }
    for (var i = 0; i < INK.length; i++) { var px = PICK_X0 + i * PICK_GAP, sel = i === selected; drawPixelCircle(px, PICK_Y, sel ? PICK_R + 8 : PICK_R, INK[i], 1); if (sel) txt('V', px, PICK_Y, 40, C.g); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.1, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.15, 28, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.97, 44, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTERPIECE!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(correctCount() / totalPaintable >= 0.9); return; }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackOk ? 'NICE!' : 'WRONG COLOR!', W / 2, H * 0.12, 56, feedbackOk ? C.b : C.a);
    timeBar();
    txt('PAINT ' + painted + ' / ' + totalPaintable, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 2) * 56 - 18, 150, 36, 36, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
