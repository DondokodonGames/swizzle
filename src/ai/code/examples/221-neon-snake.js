// 221-neon-snake.js
// ネオンスネーク — スワイプで方向を変えつつ光の粒を食べて伸びる、ネオン管の蛇
// 操作: スワイプで方向転換
// 成功: 5個食べる  失敗: 壁か自分に当たる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、電子迷路） ──
  var C = { bg:'#020408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON SNAKE';
  var HOW_TO_PLAY = 'SWIPE TO TURN · EAT THE GLOWING DOTS';
  var MAX_TIME = 20;
  var NEEDED   = 5;           // 修正2: 20 → 5
  var CELL = 96, TOP = 300;
  var COLS = Math.floor(W / CELL), ROWS = Math.floor((H - TOP - 200) / CELL);
  var OX = snap((W - COLS * CELL) / 2), OY = snap(TOP);
  var MOVE_INTERVAL = 0.2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var snake, dir, nextDir, food, score, timeLeft, done, moveTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function cellPx(col, row) { return { x: OX + col * CELL + CELL / 2, y: OY + row * CELL + CELL / 2 }; }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(OX - 8, OY - 8, COLS * CELL + 16, ROWS * CELL + 16, C.d, 0.3);
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) game.draw.rect(OX + c * CELL + 2, OY + r * CELL + 2, CELL - 4, CELL - 4, C.d, 0.1);
  }

  function placeFood() {
    var occ = {}; for (var si = 0; si < snake.length; si++) occ[snake[si].col + ',' + snake[si].row] = true;
    var att = 0; do { food = { col: Math.floor(Math.random() * COLS), row: Math.floor(Math.random() * ROWS) }; att++; } while (occ[food.col + ',' + food.row] && att < 200);
  }

  function initGame() {
    var mc = Math.floor(COLS / 2), mr = Math.floor(ROWS / 2);
    snake = [{ col: mc, row: mr }, { col: mc - 1, row: mr }, { col: mc - 2, row: mr }];
    dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 }; score = 0; timeLeft = MAX_TIME; done = false; moveTimer = MOVE_INTERVAL; placeFood();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 50) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawSnake() {
    for (var si = snake.length - 1; si >= 0; si--) {
      var p = cellPx(snake[si].col, snake[si].row), head = si === 0;
      if (head) { pc(p.x, p.y, CELL / 2 - 2, C.b, 0.95); game.draw.rect(snap(p.x) - 14, snap(p.y) - 10, 8, 8, C.bg); game.draw.rect(snap(p.x) + 6, snap(p.y) - 10, 8, 8, C.bg); }
      else game.draw.rect(snap(p.x) - CELL / 2 + 6, snap(p.y) - CELL / 2 + 6, CELL - 12, CELL - 12, C.b, 0.85 - si * 0.02);
    }
  }

  function drawFood() { if (!food) return; var p = cellPx(food.col, food.row); pc(p.x, p.y, CELL / 2 - 6 + (Math.floor(game.time.elapsed * 6) % 2) * 6, C.c, 0.9); game.draw.rect(snap(p.x) - 4, snap(p.y) - 4, 8, 8, C.g, 0.7); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(sd) {
    if (state !== S.PLAYING || done) return;
    if (sd === 'up' && dir.y !== 1) nextDir = { x: 0, y: -1 };
    else if (sd === 'down' && dir.y !== -1) nextDir = { x: 0, y: 1 };
    else if (sd === 'left' && dir.x !== 1) nextDir = { x: -1, y: 0 };
    else if (sd === 'right' && dir.x !== -1) nextDir = { x: 1, y: 0 };
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!snake) initGame(); background(); drawFood(); drawSnake();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#445566');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FULL!' : 'CRASHED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      moveTimer -= dt;
      if (moveTimer <= 0) {
        moveTimer = MOVE_INTERVAL * Math.max(0.6, 1 - score * 0.03); dir = nextDir;
        var head = snake[0], nh = { col: head.col + dir.x, row: head.row + dir.y };
        if (nh.col < 0 || nh.col >= COLS || nh.row < 0 || nh.row >= ROWS) { finish(false); return; }
        for (var si = 0; si < snake.length - 1; si++) if (snake[si].col === nh.col && snake[si].row === nh.row) { finish(false); return; }
        snake.unshift(nh);
        if (nh.col === food.col && nh.row === food.row) { score++; game.audio.play('se_success', 0.5); placeFood(); if (score >= NEEDED) { finish(true); return; } }
        else snake.pop();
      }
    }

    // ---- 描画 ----
    background(); drawFood(); drawSnake();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 52, C.b);
    txt('SWIPE TO TURN', W / 2, H - 130, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
