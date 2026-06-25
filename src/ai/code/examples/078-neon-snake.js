// 078-neon-snake.js
// ネオンスネーク — 自分の尾を避けながら光る餌を集めるネオン蛇
// 操作: スワイプで方向転換
// 成功: 12個の餌を食べる  失敗: 壁か自分の尾に当たる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030508',
    snake:  '#22c55e',
    snakeHi:'#86efac',
    food:   '#f97316',
    foodHi: '#fed7aa',
    wall:   '#1e3a5f',
    wallHi: '#2563eb',
    ui:     '#475569'
  };

  var COLS = 16;
  var ROWS = 20;
  var CELL = 56;
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = H * 0.18;

  var snake = [];  // array of {c, r} head at index 0
  var direction = 'right';
  var nextDirection = 'right';
  var food = null;
  var score = 0;
  var needed = 12;
  var timeLeft = 30;
  var done = false;
  var moveTimer = 0;
  var MOVE_INTERVAL = 0.18;
  var deathFlash = 0;

  function randomFood() {
    var occupied = {};
    for (var i = 0; i < snake.length; i++) {
      occupied[snake[i].c + ',' + snake[i].r] = true;
    }
    var candidates = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (!occupied[c + ',' + r]) candidates.push({c:c, r:r});
      }
    }
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function initSnake() {
    snake = [
      {c: 4, r: Math.floor(ROWS / 2)},
      {c: 3, r: Math.floor(ROWS / 2)},
      {c: 2, r: Math.floor(ROWS / 2)}
    ];
    direction = 'right';
    nextDirection = 'right';
    food = randomFood();
    moveTimer = MOVE_INTERVAL;
  }

  var DIR_VEC = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]};
  var OPPOSITE = {up:'down', down:'up', left:'right', right:'left'};

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir !== OPPOSITE[direction]) {
      nextDirection = dir;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    moveTimer -= dt;
    if (moveTimer <= 0) {
      moveTimer = Math.max(0.12, MOVE_INTERVAL - score * 0.005);
      direction = nextDirection;
      var dv = DIR_VEC[direction];
      var head = snake[0];
      var newHead = { c: head.c + dv[0], r: head.r + dv[1] };

      // Wall collision
      if (newHead.c < 0 || newHead.c >= COLS || newHead.r < 0 || newHead.r >= ROWS) {
        if (!done) {
          done = true;
          deathFlash = 0.5;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
      }

      // Self collision
      for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].c === newHead.c && snake[i].r === newHead.r) {
          if (!done) {
            done = true;
            deathFlash = 0.5;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 600);
            return;
          }
        }
      }

      snake.unshift(newHead);

      // Food
      if (food && newHead.c === food.c && newHead.r === food.r) {
        score++;
        game.audio.play('se_tap', 0.8);
        food = randomFood();
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score * 20 + Math.ceil(timeLeft) * 5); }, 400);
          return;
        }
        // Keep tail (snake grows)
      } else {
        snake.pop(); // remove tail
      }
    }

    if (deathFlash > 0) deathFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid border
    game.draw.rect(GRID_X - 8, GRID_Y - 8, COLS * CELL + 16, ROWS * CELL + 16, C.wall);
    game.draw.rect(GRID_X, GRID_Y, COLS * CELL, ROWS * CELL, '#040810');

    // Snake
    for (var j = 0; j < snake.length; j++) {
      var seg = snake[j];
      var gx = GRID_X + seg.c * CELL;
      var gy = GRID_Y + seg.r * CELL;
      var ratio2 = 1 - j / snake.length;
      var segAlpha = 0.4 + ratio2 * 0.6;
      game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, C.snake, segAlpha);
      if (j === 0) {
        // Head glow
        game.draw.rect(gx, gy, CELL, CELL, C.snakeHi, 0.3);
        game.draw.rect(gx + 12, gy + 12, CELL - 24, 8, '#fff', 0.4);
      }
    }

    // Food
    if (food) {
      var fx = GRID_X + food.c * CELL + CELL / 2;
      var fy = GRID_Y + food.r * CELL + CELL / 2;
      var fPulse = 0.4 + 0.3 * Math.sin(game.time.elapsed * 8);
      game.draw.circle(fx, fy, CELL * 0.5, C.foodHi, fPulse * 0.3);
      game.draw.circle(fx, fy, CELL * 0.35, C.food);
      game.draw.circle(fx - 6, fy - 6, CELL * 0.12, '#fff', 0.5);
    }

    // Death flash
    if (deathFlash > 0) {
      game.draw.rect(0, 0, W, H, '#ef4444', deathFlash * 0.4);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#030508');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.snake : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    game.draw.text(score + ' / ' + needed, W / 2, 140, { size: 56, color: C.snakeHi, bold: true });

    // Guide
    game.draw.text('スワイプで方向転換！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    initSnake();
  });
})(game);
