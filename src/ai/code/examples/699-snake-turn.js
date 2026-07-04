// 699-snake-turn.js
// ターンスネーク — 左右タップで向きを変えながら餌を集める
// 操作: 画面左半分タップで左折、右半分タップで右折。壁と自分の体を避ける
// 成功: 10個 の餌を食べる  失敗: 壁/自分に衝突 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、蛇） ──
  var C = { bg:'#030d06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SNAKE = '#00ff41', SNAKE_HI = '#86efac', SNAKE_DK = '#15803d', FOOD = '#ffe600', FOOD_HI = '#fef3c7';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TURN SNAKE';
  var HOW_TO_PLAY = 'TAP LEFT TO TURN LEFT · TAP RIGHT TO TURN RIGHT · EAT THE FOOD';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var CELL = 60, ROWS = 22, MOVE_RATE = 0.16;
  var COLS = Math.floor(W / CELL), GRID_X = snap((W - COLS * CELL) / 2), GRID_Y = 300, GRID_H = ROWS * CELL;
  var DIRS = [{ dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 0, dr: -1 }];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var snake, dir, nextDir, food, moveTimer, score, timeLeft, done, elapsed, particles, flash, deathFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#050f07');
  }

  function background() { game.draw.clear(C.bg); }

  function cellX(c) { return GRID_X + c * CELL; }
  function cellY(r) { return GRID_Y + r * CELL; }

  function isSnakeAt(c, r) { for (var i = 0; i < snake.length; i++) if (snake[i].col === c && snake[i].row === r) return true; return false; }

  function placeFood() { var tries = 0, fc, fr; do { fc = Math.floor(Math.random() * COLS); fr = Math.floor(Math.random() * ROWS); tries++; } while (tries < 200 && isSnakeAt(fc, fr)); food.col = fc; food.row = fr; }

  function initGame() {
    var startCol = Math.floor(COLS / 2), startRow = Math.floor(ROWS / 2);
    snake = [{ col: startCol, row: startRow }, { col: startCol - 1, row: startRow }, { col: startCol - 2, row: startRow }];
    dir = 0; nextDir = 0; food = { col: 0, row: 0 }; moveTimer = 0; score = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; deathFlash = 0; placeFood();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(GRID_X - 4, GRID_Y - 4, COLS * CELL + 8, ROWS * CELL + 8, '#0a1a0c', 0.9);
    game.draw.rect(GRID_X, GRID_Y, COLS * CELL, ROWS * CELL, C.bg, 1.0);
    var fPulse = 0.8 + 0.2 * Math.sin(elapsed * 4), fX = cellX(food.col) + CELL / 2, fY = cellY(food.row) + CELL / 2;
    game.draw.rect(snap(fX - CELL * 0.34 * fPulse), snap(fY - CELL * 0.34 * fPulse), snap(CELL * 0.68 * fPulse), snap(CELL * 0.68 * fPulse), FOOD, 0.95);
    for (var si = snake.length - 1; si >= 0; si--) {
      var seg = snake[si], sx = cellX(seg.col), sy = cellY(seg.row), isHead = si === 0;
      var sCol = isHead ? SNAKE_HI : (si % 2 === 0 ? SNAKE : SNAKE_DK), sAlpha = deathFlash > 0 ? (Math.sin(elapsed * 20) * 0.5 + 0.5) : 0.9;
      game.draw.rect(sx + 2, sy + 2, CELL - 4, CELL - 4, sCol, sAlpha);
      if (isHead) { var eyeOff = dir === 0 ? 1 : (dir === 2 ? -1 : 0), eyeY = dir === 1 ? sy + CELL * 0.65 : (dir === 3 ? sy + CELL * 0.3 : sy + CELL / 2); game.draw.rect(sx + CELL / 2 + eyeOff * 12 - 12, eyeY - 5, 8, 10, '#000', 0.9); game.draw.rect(sx + CELL / 2 + eyeOff * 12 + 4, eyeY - 5, 8, 10, '#000', 0.9); }
    }
    txt('< L', W * 0.17, GRID_Y + GRID_H + 74, 36, '#00ff4144');
    txt('R >', W * 0.83, GRID_Y + GRID_H + 74, 36, '#00ff4144');
    game.draw.line(W / 2, GRID_Y + GRID_H + 44, W / 2, GRID_Y + GRID_H + 104, '#ffffff10', 2);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (tx < W / 2) nextDir = (dir + 3) % 4; else nextDir = (dir + 1) % 4;
    game.audio.play('se_tap', 0.06);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!snake) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FULL BELLY!' : 'CRASHED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (deathFlash > 0) deathFlash -= dt * 3;
      moveTimer += dt; var rate = Math.max(0.1, MOVE_RATE - score * 0.004);
      if (moveTimer >= rate) {
        moveTimer = 0; dir = nextDir;
        var head = snake[0], d = DIRS[dir], newCol = head.col + d.dc, newRow = head.row + d.dr;
        if (newCol < 0 || newCol >= COLS || newRow < 0 || newRow >= ROWS) { deathFlash = 0.5; finish(false); return; }
        for (var i = 0; i < snake.length - 1; i++) if (snake[i].col === newCol && snake[i].row === newRow) { deathFlash = 0.5; finish(false); return; }
        snake.unshift({ col: newCol, row: newRow });
        if (newCol === food.col && newRow === food.row) {
          score++; game.audio.play('se_tap', 0.18); flash = 0.3;
          var fx = cellX(food.col) + CELL / 2, fy = cellY(food.row) + CELL / 2;
          for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: fx, y: fy, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.4, col: FOOD }); }
          placeFood();
          if (score >= NEEDED) { finish(true); return; }
        } else snake.pop();
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.06);
    if (deathFlash > 0) game.draw.rect(0, 0, W, H, C.a, deathFlash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
