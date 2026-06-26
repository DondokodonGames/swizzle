// 359-neon-snake.js
// ネオンスネーク — 自分の体にぶつからずに光の果実を食べ続ける
// 操作: スワイプで方向転換
// 成功: 20個食べる  失敗: 壁か自分に当たる or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020510',
    grid:   '#05081a',
    snakeH: '#22d3ee',
    snakeB: '#0e7490',
    snakeTail:'#164e63',
    food:   '#f97316',
    foodHi: '#fed7aa',
    wall:   '#1e3a5f',
    danger: '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var CELL = 80;
  var COLS = Math.floor(W / CELL);
  var ROWS = 18;
  var OX = (W - COLS * CELL) / 2;
  var OY = 260;
  var MOVE_INTERVAL = 0.18;

  var snake = [];
  var dir = { dx: 1, dy: 0 };
  var nextDir = { dx: 1, dy: 0 };
  var food = null;
  var eaten = 0;
  var NEEDED = 20;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var moveTimer = 0;
  var particles = [];

  function gridToWorld(gx, gy) {
    return { x: OX + gx * CELL + CELL / 2, y: OY + gy * CELL + CELL / 2 };
  }

  function spawnFood() {
    var attempts = 0;
    while (attempts++ < 100) {
      var fx = Math.floor(Math.random() * COLS);
      var fy = Math.floor(Math.random() * ROWS);
      var onSnake = false;
      for (var i = 0; i < snake.length; i++) {
        if (snake[i].x === fx && snake[i].y === fy) { onSnake = true; break; }
      }
      if (!onSnake) {
        food = { x: fx, y: fy };
        return;
      }
    }
  }

  function initGame() {
    var startX = Math.floor(COLS / 2), startY = Math.floor(ROWS / 2);
    snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY }
    ];
    dir = { dx: 1, dy: 0 };
    nextDir = { dx: 1, dy: 0 };
    spawnFood();
    moveTimer = MOVE_INTERVAL;
  }

  game.onSwipe(function(swipeDir) {
    if (done) return;
    if (swipeDir === 'right' && dir.dx !== -1) nextDir = { dx: 1, dy: 0 };
    if (swipeDir === 'left' && dir.dx !== 1) nextDir = { dx: -1, dy: 0 };
    if (swipeDir === 'down' && dir.dy !== -1) nextDir = { dx: 0, dy: 1 };
    if (swipeDir === 'up' && dir.dy !== 1) nextDir = { dx: 0, dy: -1 };
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap quadrant for direction
    var dx = tx - W / 2, dy = ty - H / 2;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && dir.dx !== -1) nextDir = { dx: 1, dy: 0 };
      if (dx < 0 && dir.dx !== 1) nextDir = { dx: -1, dy: 0 };
    } else {
      if (dy > 0 && dir.dy !== -1) nextDir = { dx: 0, dy: 1 };
      if (dy < 0 && dir.dy !== 1) nextDir = { dx: 0, dy: -1 };
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    moveTimer -= dt;
    if (moveTimer <= 0 && !done) {
      moveTimer = MOVE_INTERVAL - Math.min(0.1, eaten * 0.003);
      dir = { dx: nextDir.dx, dy: nextDir.dy };

      var head = snake[0];
      var newX = head.x + dir.dx;
      var newY = head.y + dir.dy;

      // Wall collision
      if (newX < 0 || newX >= COLS || newY < 0 || newY >= ROWS) {
        done = true;
        game.audio.play('se_failure', 0.6);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          var hw = gridToWorld(head.x, head.y);
          particles.push({ x: hw.x, y: hw.y, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life:0.6, col: C.snakeH });
        }
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }

      // Self collision
      for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].x === newX && snake[i].y === newY) {
          done = true;
          game.audio.play('se_failure', 0.6);
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }

      // Move
      snake.unshift({ x: newX, y: newY });

      // Eat food
      if (food && newX === food.x && newY === food.y) {
        eaten++;
        game.audio.play('se_success', 0.4);
        var fw = gridToWorld(food.x, food.y);
        for (var pi2 = 0; pi2 < 5; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: fw.x, y: fw.y, vx: Math.cos(ang2)*150, vy: Math.sin(ang2)*150, life:0.4, col: C.foodHi });
        }
        if (eaten >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(eaten * 200 + Math.ceil(timeLeft) * 80); }, 400);
          return;
        }
        spawnFood();
      } else {
        snake.pop();
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r <= ROWS; r++) {
      game.draw.line(OX, OY + r * CELL, OX + COLS * CELL, OY + r * CELL, C.grid, 1);
    }
    for (var c = 0; c <= COLS; c++) {
      game.draw.line(OX + c * CELL, OY, OX + c * CELL, OY + ROWS * CELL, C.grid, 1);
    }

    // Border wall
    game.draw.rect(OX - 8, OY - 8, COLS * CELL + 16, 8, C.wall, 0.8);
    game.draw.rect(OX - 8, OY + ROWS * CELL, COLS * CELL + 16, 8, C.wall, 0.8);
    game.draw.rect(OX - 8, OY - 8, 8, ROWS * CELL + 16, C.wall, 0.8);
    game.draw.rect(OX + COLS * CELL, OY - 8, 8, ROWS * CELL + 16, C.wall, 0.8);

    // Food
    if (food) {
      var fw2 = gridToWorld(food.x, food.y);
      game.draw.circle(fw2.x, fw2.y, CELL / 2 - 4, C.food, 0.9);
      game.draw.circle(fw2.x, fw2.y, CELL / 2 - 14, C.foodHi, 0.7);
      game.draw.circle(fw2.x, fw2.y, CELL / 2 - 4, C.foodHi, 0.1 + Math.sin(elapsed * 6) * 0.1);
    }

    // Snake
    for (var si = snake.length - 1; si >= 0; si--) {
      var seg = snake[si];
      var sw = gridToWorld(seg.x, seg.y);
      var ratio2 = 1 - si / snake.length;
      var segCol = si === 0 ? C.snakeH : (ratio2 > 0.5 ? C.snakeB : C.snakeTail);
      var sr = CELL / 2 - 6;
      game.draw.rect(sw.x - sr, sw.y - sr, sr * 2, sr * 2, segCol, 0.85 + ratio2 * 0.15);
      if (si === 0) {
        // Eyes
        var ex = dir.dx, ey = dir.dy;
        game.draw.circle(sw.x + ex * 10 + ey * 12, sw.y + ey * 10 - ex * 12, 8, '#fff', 0.9);
        game.draw.circle(sw.x + ex * 10 - ey * 12, sw.y + ey * 10 + ex * 12, 8, '#fff', 0.9);
        game.draw.circle(sw.x + ex * 12 + ey * 14, sw.y + ey * 12 - ex * 14, 4, '#000', 0.9);
        game.draw.circle(sw.x + ex * 12 - ey * 14, sw.y + ey * 12 + ex * 14, 4, '#000', 0.9);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text(eaten + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var tratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * tratio, 72, tratio > 0.3 ? C.snakeH : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    initGame();
  });
})(game);
