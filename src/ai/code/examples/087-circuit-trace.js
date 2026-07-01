// 087-circuit-trace.js
// 回路トレース — 電流が流れる正しい経路をスワイプでなぞって電力を届ける
// 操作: 表示された順に方向をスワイプ
// 成功: 1回電力を届ける  失敗: 3回失敗 or 35秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'CIRCUIT TRACE';
  var HOW_TO_PLAY = 'SWIPE THE ROUTE IN ORDER';
  var MAX_TIME = 35;
  var NEEDED = 1;           // 修正2: 8 → 1
  var MAX_MISS = 3;         // 修正2: 4 → 3
  var STEP = 180, START_X = W * 0.22, START_Y = H * 0.5;

  var PUZZLES = [
    ['right', 'down', 'right'],
    ['up', 'right', 'down'],
    ['right', 'up', 'right'],
    ['down', 'right', 'up']
  ];
  var DIR_VECS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var puzzleIdx, puzzle, path, progress, score, misses, timeLeft, done, feedback, feedbackOk, showSol;

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
  var ARROWS = { up: '^', down: 'v', left: '<', right: '>' };

  function loadPuzzle() { if (state !== S.PLAYING || done) return; puzzle = PUZZLES[puzzleIdx % PUZZLES.length]; puzzleIdx++; path = [{ x: START_X, y: START_Y }]; progress = 0; }
  function endPos() { var x = START_X, y = START_Y; for (var i = 0; i < puzzle.length; i++) { var dv = DIR_VECS[puzzle[i]]; x += dv[0] * STEP; y += dv[1] * STEP; } return { x: x, y: y }; }

  function initGame() { puzzleIdx = Math.floor(Math.random() * PUZZLES.length); score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; showSol = 0; loadPuzzle(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || feedback > 0) return;
    var cur = path[path.length - 1], dv = DIR_VECS[dir];
    if (dir === puzzle[progress]) {
      path.push({ x: cur.x + dv[0] * STEP, y: cur.y + dv[1] * STEP }); progress++; game.audio.play('se_tap', 0.6);
      if (progress >= puzzle.length) { score++; feedbackOk = true; feedback = 0.5; game.audio.play('se_success'); if (score >= NEEDED) { finish(true); return; } setTimeout(loadPuzzle, 600); }
    } else {
      misses++; feedbackOk = false; feedback = 0.6; showSol = 0.6; game.audio.play('se_failure', 0.7);
      if (misses >= MAX_MISS) { finish(false); return; }
      setTimeout(loadPuzzle, 700);
    }
  });

  // 世界観: 電力回路盤。始点から星印の端子まで正しい経路で電流を導く。
  function background() {
    game.draw.clear('#000011');
    for (var gx = 0; gx < W; gx += STEP) game.draw.rect(snap(gx), 0, 2, H, C.f, 0.06);
    for (var gy = 300; gy < H - 200; gy += STEP) game.draw.rect(0, snap(gy), W, 2, C.f, 0.06);
    txt('POWER GRID', W / 2, 250, 34, C.f);
  }

  function drawScene() {
    var px = START_X, py = START_Y;
    for (var i = 0; i < puzzle.length; i++) {
      var dv = DIR_VECS[puzzle[i]], nx = px + dv[0] * STEP, ny = py + dv[1] * STEP;
      if (i < progress) { game.draw.line(px, py, nx, ny, C.b, 12); drawPixelCircle(px, py, 14, C.b, 1); }
      else if (showSol > 0) { game.draw.line(px, py, nx, ny, C.a, 8); game.draw.line(px, py, nx, ny, C.c, 3, showSol / 0.6); }
      else { game.draw.line(px, py, nx, ny, '#113355', 8); drawPixelCircle(px, py, 10, '#224466', 1); }
      px = nx; py = ny;
    }
    // 始点
    drawPixelCircle(START_X, START_Y, 28, C.b, 1); txt('IN', START_X, START_Y, 26, C.c);
    // 端子
    var g = endPos(); drawPixelCircle(g.x, g.y, 32, C.d, 0.5 + 0.3 * (Math.floor(game.time.elapsed * 6) % 2)); drawPixelCircle(g.x, g.y, 24, C.d, 1); txt('*', g.x, g.y, 40, C.c);
    // 現在位置
    var pos = path[path.length - 1]; drawPixelCircle(pos.x, pos.y, 22, C.g, 1);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (puzzleIdx === undefined) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 66, C.g);
        txt('TAP TO START', W / 2, H * 0.87, 48, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
      if (showSol > 0) showSol -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    if (feedback > 0) txt(feedbackOk ? 'POWER!' : 'WRONG ROUTE!', W / 2, H * 0.26, 68, feedbackOk ? C.f : C.e);
    else {
      var rem = puzzle.slice(progress).map(function(d) { return ARROWS[d]; }).join(' ');
      if (rem) txt('ROUTE  ' + rem, W / 2, H * 0.86, 48, C.b);
    }
    timeBar();
    txt('STEP ' + progress + ' / ' + puzzle.length, W / 2, 96, 44, C.c);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, 150, 40, 40, m < misses ? C.e : '#000833');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
