// 359-neon-snake.js
// ネオンスネーク — 光るヘビをスワイプで操り、壁と自分の体を避けながら光の果実を食べ続ける
// 操作: スワイプ（またはタップした方向）で進行方向を変える
// 成功: 5個食べる  失敗: 壁か自分に当たる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、グリッドフィールド） ──
  var C = { bg:'#020510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON SNAKE';
  var HOW_TO_PLAY = 'SWIPE TO TURN · EAT THE GLOWING FRUIT';
  var MAX_TIME = 20;
  var NEEDED   = 5;          // 修正2: 20 → 5
  var CELL = 88;
  var COLS = Math.floor(W / CELL);
  var ROWS = Math.floor(H * 0.60 / CELL);
  var OX = snap((W - COLS * CELL) / 2), OY = snap(H * 0.24), MOVE_INT = 0.20;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var snake, dir, nextDir, food, eaten, timeLeft, done, moveTimer, particles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1020');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var r = 0; r <= ROWS; r++) game.draw.rect(OX, OY + r * CELL, COLS * CELL, 2, '#0a1a2e', 0.6);
    for (var c = 0; c <= COLS; c++) game.draw.rect(OX + c * CELL, OY, 2, ROWS * CELL, '#0a1a2e', 0.6);
    game.draw.rect(OX - 8, OY - 8, COLS * CELL + 16, 8, C.d, 0.9); game.draw.rect(OX - 8, OY + ROWS * CELL, COLS * CELL + 16, 8, C.d, 0.9);
    game.draw.rect(OX - 8, OY - 8, 8, ROWS * CELL + 16, C.d, 0.9); game.draw.rect(OX + COLS * CELL, OY - 8, 8, ROWS * CELL + 16, C.d, 0.9);
  }

  function cx(gx) { return OX + gx * CELL + CELL / 2; }
  function cy(gy) { return OY + gy * CELL + CELL / 2; }

  function spawnFood() { for (var t = 0; t < 80; t++) { var fx = Math.floor(Math.random() * COLS), fy = Math.floor(Math.random() * ROWS), ok = true; for (var i = 0; i < snake.length; i++) if (snake[i].x === fx && snake[i].y === fy) { ok = false; break; } if (ok) { food = { x: fx, y: fy }; return; } } }

  function initGame() { var sx = Math.floor(COLS / 2), sy = Math.floor(ROWS / 2); snake = [{ x: sx, y: sy }, { x: sx - 1, y: sy }, { x: sx - 2, y: sy }]; dir = { dx: 1, dy: 0 }; nextDir = { dx: 1, dy: 0 }; eaten = 0; timeLeft = MAX_TIME; done = false; moveTimer = MOVE_INT; particles = []; spawnFood(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (eaten * 400 + Math.ceil(timeLeft) * 100) : eaten * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFood() { if (!food) return; pc(cx(food.x), cy(food.y), CELL * 0.34 + 4 * (Math.floor(game.time.elapsed * 8) % 2), C.f, 0.9); pc(cx(food.x) - 8, cy(food.y) - 8, 8, C.g, 0.7); }

  function drawSnake() {
    for (var i = snake.length - 1; i >= 0; i--) { var seg = snake[i], head = i === 0, x = OX + seg.x * CELL, y = OY + seg.y * CELL, m = head ? 6 : 10; game.draw.rect(x + m, y + m, CELL - m * 2, CELL - m * 2, C.e, head ? 0.95 : 0.55); game.draw.rect(x + m, y + m, CELL - m * 2, 6, C.g, 0.3); if (head) { game.draw.rect(x + CELL * 0.6, y + CELL * 0.28, 12, 12, C.g, 0.95); game.draw.rect(x + CELL * 0.6 + dir.dx * 4, y + CELL * 0.28 + dir.dy * 4, 6, 6, C.bg, 1); } }
  }

  function turn(d) { if (d === 'right' && dir.dx !== -1) nextDir = { dx: 1, dy: 0 }; else if (d === 'left' && dir.dx !== 1) nextDir = { dx: -1, dy: 0 }; else if (d === 'down' && dir.dy !== -1) nextDir = { dx: 0, dy: 1 }; else if (d === 'up' && dir.dy !== 1) nextDir = { dx: 0, dy: -1 }; }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = x - W / 2, dy = y - H / 2; if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left'); else turn(dy > 0 ? 'down' : 'up');
  });

  game.onSwipe(function(d) { if (state === S.PLAYING && !done) turn(d); });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!snake) initGame(); background(); drawFood(); drawSnake();
      txt(GAME_TITLE, W / 2, H * 0.13, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FEAST!' : 'CRASHED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
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
        moveTimer = Math.max(0.12, MOVE_INT - eaten * 0.01); dir = { dx: nextDir.dx, dy: nextDir.dy };
        var head = snake[0], nx = head.x + dir.dx, ny = head.y + dir.dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) { finish(false); return; }
        for (var i = 0; i < snake.length - 1; i++) if (snake[i].x === nx && snake[i].y === ny) { finish(false); return; }
        snake.unshift({ x: nx, y: ny });
        if (food && nx === food.x && ny === food.y) { eaten++; game.audio.play('se_success', 0.4); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cx(nx), y: cy(ny), vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.f }); } if (eaten >= NEEDED) { finish(true); return; } spawnFood(); }
        else snake.pop();
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawFood(); drawSnake();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(eaten + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
