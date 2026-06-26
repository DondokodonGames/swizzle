// 528-snake-rush.js
// スネークラッシュ — 加速するスネーク、スワイプで方向転換してリンゴを集める
// 操作: スワイプで蛇の進行方向を変える
// 成功: 15個収集  失敗: 壁/自分に衝突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#020a02',
    grid:     '#050f05',
    snake:    '#22c55e',
    snakeHi:  '#86efac',
    snakeHead:'#4ade80',
    apple:    '#ef4444',
    appleHi:  '#fca5a5',
    text:     '#f1f5f9',
    ui:       '#374151',
    wall:     '#0a1a0a'
  };

  var CELL = 80;
  var COLS = Math.floor((W - 80) / CELL);
  var ROWS = Math.floor((H * 0.82 - 160) / CELL);
  var OX = Math.floor((W - COLS * CELL) / 2);
  var OY = 160;

  var snake = [];
  var dir = { x: 1, y: 0 };
  var nextDir = { x: 1, y: 0 };
  var apple = { x: 0, y: 0 };
  var collected = 0;
  var NEEDED = 15;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var moveTimer = 0;
  var MOVE_INTERVAL = 0.18;
  var particles = [];
  var flashAnim = 0;
  var growQueue = 0;

  function placeApple() {
    var snakeSet = {};
    for (var i = 0; i < snake.length; i++) snakeSet[snake[i].x + ',' + snake[i].y] = true;
    var attempts = 0;
    do {
      apple.x = Math.floor(Math.random() * COLS);
      apple.y = Math.floor(Math.random() * ROWS);
      attempts++;
    } while (snakeSet[apple.x + ',' + apple.y] && attempts < 50);
  }

  function initSnake() {
    snake = [];
    var sx = Math.floor(COLS / 2), sy = Math.floor(ROWS / 2);
    for (var i = 3; i >= 0; i--) snake.push({ x: sx - i, y: sy });
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    placeApple();
  }

  game.onSwipe(function(swipeDir) {
    if (done) return;
    if (swipeDir === 'up'    && dir.y !== 1)  nextDir = { x: 0, y: -1 };
    if (swipeDir === 'down'  && dir.y !== -1) nextDir = { x: 0, y: 1 };
    if (swipeDir === 'left'  && dir.x !== 1)  nextDir = { x: -1, y: 0 };
    if (swipeDir === 'right' && dir.x !== -1) nextDir = { x: 1, y: 0 };
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // 4-quadrant tap as alternative control
    var cx = W / 2, cy = H / 2;
    var dx = tx - cx, dy = ty - cy;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 };
      else if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
    } else {
      if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 };
      else if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;

    // Move snake
    moveTimer -= dt;
    var interval = Math.max(0.08, MOVE_INTERVAL - collected * 0.006);
    if (moveTimer <= 0 && !done) {
      moveTimer = interval;
      dir = { x: nextDir.x, y: nextDir.y };

      var head = snake[snake.length - 1];
      var newHead = { x: head.x + dir.x, y: head.y + dir.y };

      // Wall collision
      if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
        done = true;
        game.audio.play('se_failure', 0.7);
        flashAnim = 0.8;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }

      // Self collision
      for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
          done = true;
          game.audio.play('se_failure', 0.7);
          flashAnim = 0.8;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
      }

      snake.push(newHead);

      // Apple?
      if (newHead.x === apple.x && newHead.y === apple.y) {
        collected++;
        growQueue += 3;
        game.audio.play('se_success', 0.6);
        var ax = OX + apple.x * CELL + CELL / 2;
        var ay = OY + apple.y * CELL + CELL / 2;
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: ax, y: ay, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: C.appleHi });
        }
        placeApple();
        if (collected >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(collected * 400 + snake.length * 20 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }

      // Remove tail (unless growing)
      if (growQueue > 0) {
        growQueue--;
      } else {
        snake.shift();
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid background
    game.draw.rect(OX, OY, COLS * CELL, ROWS * CELL, C.grid, 0.9);
    for (var r = 0; r <= ROWS; r++) game.draw.line(OX, OY + r * CELL, OX + COLS * CELL, OY + r * CELL, C.wall, 1);
    for (var c = 0; c <= COLS; c++) game.draw.line(OX + c * CELL, OY, OX + c * CELL, OY + ROWS * CELL, C.wall, 1);

    // Snake
    for (var si = 0; si < snake.length; si++) {
      var s = snake[si];
      var sx = OX + s.x * CELL + 4;
      var sy = OY + s.y * CELL + 4;
      var isHead = si === snake.length - 1;
      var col = isHead ? C.snakeHead : C.snake;
      var alpha = isHead ? 0.95 : 0.7 + 0.25 * (si / snake.length);
      game.draw.rect(sx, sy, CELL - 8, CELL - 8, col, alpha);
      if (isHead) {
        game.draw.rect(sx, sy, CELL - 8, 8, C.snakeHi, 0.4);
      }
    }

    // Apple
    var apx = OX + apple.x * CELL + CELL / 2;
    var apy = OY + apple.y * CELL + CELL / 2;
    game.draw.circle(apx, apy, CELL * 0.38, C.apple, 0.9);
    game.draw.circle(apx - 4, apy - 4, CELL * 0.12, C.appleHi, 0.6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.apple, flashAnim * 0.2);

    game.draw.text(collected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.snake : C.apple);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initSnake();
  });
})(game);
