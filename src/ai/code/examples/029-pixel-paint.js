// 029-pixel-paint.js
// ピクセルペイント — お題のシルエットを素早くなぞり塗る爽快感
// 操作: スワイプで色を塗り広げる（上下左右に一マスずつ）
// 成功: 目標の30%以上を塗る  失敗: 20秒 or 間違いセル5個

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'PIXEL PAINT';
  var HOW_TO_PLAY = 'SWIPE TO PAINT THE SHAPE';
  var MAX_TIME = 20;
  var WIN_PCT = 0.3;        // 修正2: 80% → 30%
  var MAX_WRONG = 5;
  var COLS = 8, ROWS = 10, CELL = 116, GAP = 6;
  var GRID_W = COLS * (CELL + GAP) - GAP, GRID_H = ROWS * (CELL + GAP) - GAP;
  var GRID_X = (W - GRID_W) / 2, GRID_Y = (H - GRID_H) / 2;   // 修正1: 縦中央

  var TARGET_SHAPES = [
    [0,1,1,0,0,1,1,0, 1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1, 1,1,1,1,1,1,1,1, 0,1,1,1,1,1,1,0, 0,0,1,1,1,1,0,0, 0,0,0,1,1,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0],
    [0,0,0,1,1,0,0,0, 0,0,1,1,1,1,0,0, 1,1,1,1,1,1,1,1, 0,1,1,1,1,1,1,0, 0,0,1,1,1,1,0,0, 0,1,1,0,0,1,1,0, 1,1,0,0,0,0,1,1, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0, 0,0,0,0,0,0,0,0]
  ];

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var targetShape, totalTarget, painted, curCol, curRow, paintedCorrect, paintedWrong, timeLeft, done;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function cellIdx(c, r) { return r * COLS + c; }

  function initGame() {
    targetShape = TARGET_SHAPES[Math.floor(Math.random() * TARGET_SHAPES.length)];
    totalTarget = 0; for (var i = 0; i < targetShape.length; i++) if (targetShape[i]) totalTarget++;
    painted = new Array(COLS * ROWS).fill(0);
    curCol = 0; curRow = 2; paintedCorrect = 0; paintedWrong = 0; timeLeft = MAX_TIME; done = false;
    paint(curCol, curRow);
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (Math.floor(paintedCorrect / totalTarget * 100) * 5 + Math.ceil(timeLeft) * 40) : paintedCorrect * 30;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function paint(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    var i = cellIdx(c, r); if (painted[i] !== 0) return;
    if (targetShape[i] === 1) {
      painted[i] = 1; paintedCorrect++;
      if (paintedCorrect >= Math.max(1, Math.ceil(totalTarget * WIN_PCT))) finish(true);
    } else {
      painted[i] = -1; paintedWrong++;
      game.audio.play('se_failure', 0.3);
      if (paintedWrong >= MAX_WRONG) finish(false);
    }
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'right') curCol = Math.min(COLS - 1, curCol + 1);
    if (dir === 'left')  curCol = Math.max(0, curCol - 1);
    if (dir === 'down')  curRow = Math.min(ROWS - 1, curRow + 1);
    if (dir === 'up')    curRow = Math.max(0, curRow - 1);
    paint(curCol, curRow);
    game.audio.play('se_tap', 0.4);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  // 世界観: ドット絵職人のキャンバス。お題のシルエットをなぞって描き上げる。
  function background() {
    game.draw.clear('#0a0a14');
    // イーゼルの木枠
    var fx = GRID_X - 36, fy = GRID_Y - 36, fw = GRID_W + 72, fh = GRID_H + 72;
    game.draw.rect(fx, fy, fw, fh, '#4a2a14');
    game.draw.rect(fx + 14, fy + 14, fw - 28, fh - 28, '#101018');
    // パレット（下部の絵の具）
    var paints = [C.a, C.b, C.c, C.d, C.e, C.f];
    for (var p = 0; p < paints.length; p++)
      game.draw.rect(snap(W / 2 - 180 + p * 64), GRID_Y + GRID_H + 40, 48, 48, paints[p]);
    txt('PIXEL CANVAS', W / 2, fy - 8, 36, C.c);
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var ci = cellIdx(c, r), cx = GRID_X + c * (CELL + GAP), cy = GRID_Y + r * (CELL + GAP);
      game.draw.rect(cx, cy, CELL, CELL, targetShape[ci] === 1 ? C.d : '#0a0018');
      if (painted[ci] === 1) game.draw.rect(cx, cy, CELL, CELL, C.b);
      else if (painted[ci] === -1) game.draw.rect(cx, cy, CELL, CELL, C.a);
      if (c === curCol && r === curRow && Math.floor(game.time.elapsed * 10) % 2 === 0)
        game.draw.rect(cx, cy, CELL, CELL, C.g, 0.4);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!painted) initGame();
      background();
      drawGrid();
      txt(GAME_TITLE,  W / 2, H * 0.1, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
    }

    // ---- draw ----
    background();
    drawGrid();
    timeBar();
    var pct = Math.floor(paintedCorrect / totalTarget * 100);
    txt('PAINT ' + pct + '%', W / 2, 96, 48, C.b);
    for (var ww = 0; ww < MAX_WRONG; ww++)
      game.draw.rect(W / 2 + (ww - 2) * 56 - 18, 150, 36, 36, ww < paintedWrong ? C.a : '#330011');
    txt('SWIPE TO PAINT!', W / 2, H - 100, 48, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
