// 221-neon-snake.js
// ネオンスネーク — スワイプで方向転換しながら光の点を食べて伸びるネオン蛇
// 操作: スワイプで方向転換
// 成功: 20個食べる  失敗: 壁か自分に当たる or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#020408',
    snake: '#22c55e',
    snkHi: '#86efac',
    food:  '#f59e0b',
    foodHi:'#fde68a',
    wall:  '#1e3a5f',
    ui:    '#475569',
    glow:  '#dcfce7'
  };

  var CELL = 80;
  var COLS = Math.floor(W / CELL);
  var ROWS = Math.floor((H * 0.85) / CELL);
  var OX = Math.floor((W - COLS * CELL) / 2);
  var OY = Math.floor(H * 0.1);

  var snake = [];
  var dir = { x: 1, y: 0 };
  var nextDir = { x: 1, y: 0 };
  var food = { col: 0, row: 0 };
  var score = 0;
  var NEEDED = 20;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var moveTimer = 0;
  var MOVE_INTERVAL = 0.18;
  var trail = [];

  function placeFood() {
    var occupied = {};
    for (var si = 0; si < snake.length; si++) {
      occupied[snake[si].col + ',' + snake[si].row] = true;
    }
    var attempts = 0;
    do {
      food.col = Math.floor(Math.random() * COLS);
      food.row = Math.floor(Math.random() * ROWS);
      attempts++;
    } while (occupied[food.col + ',' + food.row] && attempts < 200);
  }

  function cellToPixel(col, row) {
    return { x: OX + col * CELL + CELL / 2, y: OY + row * CELL + CELL / 2 };
  }

  function initSnake() {
    snake = [
      { col: Math.floor(COLS / 2), row: Math.floor(ROWS / 2) },
      { col: Math.floor(COLS / 2) - 1, row: Math.floor(ROWS / 2) },
      { col: Math.floor(COLS / 2) - 2, row: Math.floor(ROWS / 2) }
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    placeFood();
  }

  game.onSwipe(function(swipeDir) {
    if (done) return;
    if (swipeDir === 'up' && dir.y !== 1) nextDir = { x: 0, y: -1 };
    else if (swipeDir === 'down' && dir.y !== -1) nextDir = { x: 0, y: 1 };
    else if (swipeDir === 'left' && dir.x !== 1) nextDir = { x: -1, y: 0 };
    else if (swipeDir === 'right' && dir.x !== -1) nextDir = { x: 1, y: 0 };
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    moveTimer -= dt;
    if (moveTimer <= 0) {
      moveTimer = MOVE_INTERVAL * Math.max(0.5, 1 - score * 0.02);
      dir = nextDir;

      var head = snake[0];
      var newHead = { col: head.col + dir.x, row: head.row + dir.y };

      // Wall collision
      if (newHead.col < 0 || newHead.col >= COLS || newHead.row < 0 || newHead.row >= ROWS) {
        if (!done) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
        }
        return;
      }

      // Self collision
      for (var si = 0; si < snake.length - 1; si++) {
        if (snake[si].col === newHead.col && snake[si].row === newHead.row) {
          if (!done) {
            done = true;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 400);
          }
          return;
        }
      }

      // Add new head
      var headPx = cellToPixel(newHead.col, newHead.row);
      trail.push({ x: headPx.x, y: headPx.y, life: MOVE_INTERVAL * 3 });
      snake.unshift(newHead);

      // Eat food?
      if (newHead.col === food.col && newHead.row === food.row) {
        score++;
        game.audio.play('se_success', 0.5);
        placeFood();
        if (score >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 100 + Math.ceil(timeLeft) * 30); }, 400);
        }
      } else {
        snake.pop(); // remove tail
      }
    }

    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        game.draw.rect(OX + c * CELL + 2, OY + r * CELL + 2, CELL - 4, CELL - 4, C.wall, 0.12);
      }
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, (CELL / 2 - 4) * t.life / (MOVE_INTERVAL * 3), C.snkHi, t.life * 0.15);
    }

    // Food
    var foodPx = cellToPixel(food.col, food.row);
    var pulse = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 4));
    game.draw.circle(foodPx.x, foodPx.y, CELL / 2 - 4 + 8 * pulse, C.foodHi, pulse * 0.3);
    game.draw.circle(foodPx.x, foodPx.y, CELL / 2 - 4, C.food, 0.9);
    game.draw.circle(foodPx.x - 6, foodPx.y - 6, 6, '#fff', 0.4);

    // Snake
    for (var si2 = snake.length - 1; si2 >= 0; si2--) {
      var seg = snake[si2];
      var spx = cellToPixel(seg.col, seg.row);
      var isHead = si2 === 0;
      var alpha = isHead ? 0.95 : (0.85 - si2 * 0.01);

      if (isHead) {
        game.draw.circle(spx.x, spx.y, CELL / 2 - 2 + 6, C.snkHi, 0.3);
        game.draw.circle(spx.x, spx.y, CELL / 2 - 2, C.snake, alpha);
        game.draw.circle(spx.x - 6, spx.y - 6, 6, '#fff', 0.5);
        game.draw.circle(spx.x + 6, spx.y - 6, 6, '#fff', 0.5);
      } else {
        game.draw.rect(spx.x - CELL / 2 + 4, spx.y - CELL / 2 + 4, CELL - 8, CELL - 8, C.snake, alpha);
      }
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    game.draw.text('スワイプで方向転換', W / 2, H * 0.93, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.snake : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initSnake();
  });
})(game);
