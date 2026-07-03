// 528-snake-rush.js
// スネークラッシュ — 加速する蛇をスワイプで操り、リンゴを食べて伸ばす。壁と自分に激突厳禁
// 操作: スワイプで進行方向転換（画面4分割タップでも可）
// 成功: リンゴ 8個 収集  失敗: 壁/自分に衝突 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、モノクロ蛇腹） ──
  var C = { bg:'#000a00', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SNAKE RUSH';
  var HOW_TO_PLAY = 'SWIPE TO TURN · EAT APPLES · AVOID WALLS & YOURSELF';
  var MAX_TIME = 20;
  var NEEDED   = 8;          // 修正2: 15 → 8
  var CELL = 96;
  var COLS = Math.floor((W - 80) / CELL);
  var ROWS = Math.floor((H * 0.74 - 300) / CELL);
  var OX = snap((W - COLS * CELL) / 2), OY = snap(H * 0.26);
  var MOVE_INTERVAL = 0.19;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var snake, dir, nextDir, apple, collected, timeLeft, done, moveTimer, particles, flash, growQueue;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(OX - 6, OY - 6, COLS * CELL + 12, ROWS * CELL + 12, C.d, 0.5);
    game.draw.rect(OX, OY, COLS * CELL, ROWS * CELL, '#001a00', 0.9);
    for (var r = 0; r <= ROWS; r++) game.draw.rect(OX, OY + r * CELL, COLS * CELL, 2, '#003300', 0.6);
    for (var c = 0; c <= COLS; c++) game.draw.rect(OX + c * CELL, OY, 2, ROWS * CELL, '#003300', 0.6);
  }

  function placeApple() {
    var occ = {}; for (var i = 0; i < snake.length; i++) occ[snake[i].x + ',' + snake[i].y] = true;
    var a = 0; do { apple.x = Math.floor(Math.random() * COLS); apple.y = Math.floor(Math.random() * ROWS); a++; } while (occ[apple.x + ',' + apple.y] && a < 60);
  }

  function initGame() {
    snake = []; var sx = Math.floor(COLS / 2), sy = Math.floor(ROWS / 2);
    for (var i = 3; i >= 0; i--) snake.push({ x: sx - i, y: sy });
    dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 }; apple = { x: 0, y: 0 };
    collected = 0; timeLeft = MAX_TIME; done = false; moveTimer = 0; particles = []; flash = 0; growQueue = 0; placeApple();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (collected * 600 + snake.length * 20 + Math.ceil(timeLeft) * 100) : collected * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var si = 0; si < snake.length; si++) {
      var s = snake[si], sx = OX + s.x * CELL + CELL / 2, sy = OY + s.y * CELL + CELL / 2, isHead = si === snake.length - 1;
      game.draw.rect(OX + s.x * CELL + 6, OY + s.y * CELL + 6, CELL - 12, CELL - 12, isHead ? C.g : C.b, isHead ? 0.95 : 0.55 + 0.35 * (si / snake.length));
      if (isHead) { game.draw.rect(sx - 18, sy - 10, 10, 10, C.a, 0.9); game.draw.rect(sx + 8, sy - 10, 10, 10, C.a, 0.9); }
    }
    var apx = OX + apple.x * CELL + CELL / 2, apy = OY + apple.y * CELL + CELL / 2;
    pc(apx, apy, CELL * 0.36, C.a, 0.95); pc(apx - 6, apy - 6, CELL * 0.12, C.g, 0.6);
    game.draw.rect(snap(apx) - 3, snap(apy) - CELL * 0.42, 6, 14, C.d, 0.9);
  }

  // ── 入力 ──
  game.onSwipe(function(swipeDir) {
    if (state !== S.PLAYING || done) return;
    if (swipeDir === 'up'    && dir.y !== 1)  nextDir = { x: 0, y: -1 };
    if (swipeDir === 'down'  && dir.y !== -1) nextDir = { x: 0, y: 1 };
    if (swipeDir === 'left'  && dir.x !== 1)  nextDir = { x: -1, y: 0 };
    if (swipeDir === 'right' && dir.x !== -1) nextDir = { x: 1, y: 0 };
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var dx = tx - W / 2, dy = ty - H / 2;
    if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 }; else if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 }; }
    else { if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 }; else if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 }; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!snake) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 20, C.d);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FULL LENGTH!' : 'CRASHED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      moveTimer -= dt;
      var interval = Math.max(0.09, MOVE_INTERVAL - collected * 0.008);
      if (moveTimer <= 0) {
        moveTimer = interval; dir = { x: nextDir.x, y: nextDir.y };
        var head = snake[snake.length - 1], nh = { x: head.x + dir.x, y: head.y + dir.y };
        if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS) { flash = 0.6; finish(false); return; }
        for (var i = 0; i < snake.length - 1; i++) if (snake[i].x === nh.x && snake[i].y === nh.y) { flash = 0.6; finish(false); return; }
        snake.push(nh);
        if (nh.x === apple.x && nh.y === apple.y) {
          collected++; growQueue += 3; game.audio.play('se_success', 0.6);
          var ax = OX + apple.x * CELL + CELL / 2, ay = OY + apple.y * CELL + CELL / 2;
          for (var pi = 0; pi < 8; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: ax, y: ay, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: C.a }); }
          placeApple();
          if (collected >= NEEDED) { finish(true); return; }
        }
        if (growQueue > 0) growQueue--; else snake.shift();
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
