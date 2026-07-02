// 288-neon-snake.js
// ネオンスネーク — ネオンの蛇をスワイプで操って光る果実を集める、壁と自分に当たると即アウト
// 操作: スワイプで進む方向を変える
// 成功: 5個のフルーツを食べる  失敗: 壁または自分に当たる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、グリッドフィールド） ──
  var C = { bg:'#020108', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FRUIT_COLS = [C.c, C.a, C.d, C.e];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON SNAKE';
  var HOW_TO_PLAY = 'SWIPE TO TURN · EAT THE GLOWING FRUIT';
  var MAX_TIME = 20;
  var NEEDED   = 5;           // 修正2: 20 → 5
  var CELL = 88;
  var COLS = Math.floor(W / CELL);
  var ROWS = Math.floor(H * 0.62 / CELL);
  var OX = snap((W - COLS * CELL) / 2), OY = snap(H * 0.22);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var snake, dir, nextDir, fruits, eaten, timeLeft, done, moveTimer, particles;

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
    for (var r = 0; r <= ROWS; r++) game.draw.rect(OX, OY + r * CELL, COLS * CELL, 2, '#0a1a14', 0.6);
    for (var c = 0; c <= COLS; c++) game.draw.rect(OX + c * CELL, OY, 2, ROWS * CELL, '#0a1a14', 0.6);
    // 外壁
    game.draw.rect(OX - 8, OY - 8, COLS * CELL + 16, 8, C.d, 0.9);
    game.draw.rect(OX - 8, OY + ROWS * CELL, COLS * CELL + 16, 8, C.d, 0.9);
    game.draw.rect(OX - 8, OY - 8, 8, ROWS * CELL + 16, C.d, 0.9);
    game.draw.rect(OX + COLS * CELL, OY - 8, 8, ROWS * CELL + 16, C.d, 0.9);
  }

  function initSnake() { snake = []; for (var i = 3; i >= 0; i--) snake.push({ x: i, y: Math.floor(ROWS / 2) }); dir = { dx: 1, dy: 0 }; nextDir = { dx: 1, dy: 0 }; }

  function spawnFruit() {
    for (var t = 0; t < 60; t++) {
      var fx = Math.floor(Math.random() * COLS), fy = Math.floor(Math.random() * ROWS), ok = true;
      for (var si = 0; si < snake.length; si++) if (snake[si].x === fx && snake[si].y === fy) { ok = false; break; }
      for (var fi = 0; ok && fi < fruits.length; fi++) if (fruits[fi].x === fx && fruits[fi].y === fy) { ok = false; break; }
      if (ok) { fruits.push({ x: fx, y: fy, col: FRUIT_COLS[Math.floor(Math.random() * FRUIT_COLS.length)] }); return; }
    }
  }

  function initGame() { initSnake(); fruits = []; eaten = 0; timeLeft = MAX_TIME; done = false; moveTimer = 0; particles = []; spawnFruit(); spawnFruit(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (eaten * 300 + Math.ceil(timeLeft) * 80) : eaten * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function cellCX(gx) { return OX + gx * CELL + CELL / 2; }
  function cellCY(gy) { return OY + gy * CELL + CELL / 2; }

  function drawFruit(fr, pulse) {
    var r = CELL * 0.34 + 4 * (Math.floor(game.time.elapsed * 8) % 2);
    pc(cellCX(fr.x), cellCY(fr.y), r, fr.col, 0.9);
    pc(cellCX(fr.x) - 8, cellCY(fr.y) - 8, 8, C.g, 0.7);
  }

  function drawSnake() {
    for (var i = snake.length - 1; i >= 0; i--) {
      var seg = snake[i], head = i === 0, col = head ? C.b : C.b;
      var sx = OX + seg.x * CELL, sy = OY + seg.y * CELL, m = head ? 6 : 10;
      game.draw.rect(sx + m, sy + m, CELL - m * 2, CELL - m * 2, col, head ? 0.95 : 0.55);
      game.draw.rect(sx + m, sy + m, CELL - m * 2, 6, C.g, 0.3);
      if (head) { game.draw.rect(sx + CELL * 0.6, sy + CELL * 0.28, 12, 12, C.g, 0.95); game.draw.rect(sx + CELL * 0.6 + dir.dx * 4, sy + CELL * 0.28 + dir.dy * 4, 6, 6, C.bg, 1); }
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left' && dir.dx !== 1) nextDir = { dx: -1, dy: 0 };
    else if (d === 'right' && dir.dx !== -1) nextDir = { dx: 1, dy: 0 };
    else if (d === 'up' && dir.dy !== 1) nextDir = { dx: 0, dy: -1 };
    else if (d === 'down' && dir.dy !== -1) nextDir = { dx: 0, dy: 1 };
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!snake) initGame(); background(); for (var fi = 0; fi < fruits.length; fi++) drawFruit(fruits[fi]); drawSnake();
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
        moveTimer = Math.max(0.11, 0.20 - eaten * 0.01);
        dir = nextDir;
        var head = snake[0], nx = head.x + dir.dx, ny = head.y + dir.dy;
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) { finish(false); return; }
        for (var si = 0; si < snake.length; si++) if (snake[si].x === nx && snake[si].y === ny) { finish(false); return; }
        var ate = -1;
        for (var fi2 = 0; fi2 < fruits.length; fi2++) if (fruits[fi2].x === nx && fruits[fi2].y === ny) { ate = fi2; break; }
        snake.unshift({ x: nx, y: ny });
        if (ate >= 0) {
          eaten++;
          for (var pk = 0; pk < 8; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cellCX(nx), y: cellCY(ny), vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: fruits[ate].col }); }
          fruits.splice(ate, 1); game.audio.play('se_success', 0.45);
          if (eaten >= NEEDED) { finish(true); return; }
          spawnFruit();
        } else { snake.pop(); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var fi3 = 0; fi3 < fruits.length; fi3++) drawFruit(fruits[fi3]);
    drawSnake();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(eaten + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
