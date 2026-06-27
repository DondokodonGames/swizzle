// 699-snake-turn.js
// ターンスネーク — 左右タップで向きを変えながら餌を集めろ
// 操作: 左半分タップで左折、右半分タップで右折
// 成功: 25個の餌を食べる  失敗: 壁/自分に衝突 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030d06',
    snake:   '#22c55e',
    snakeHi: '#86efac',
    snakeDk: '#15803d',
    food:    '#fbbf24',
    foodHi:  '#fef3c7',
    wall:    '#0a1a0c',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050f07'
  };

  var CELL = 60;
  var COLS = Math.floor(W / CELL);
  var ROWS = 26;
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = 220;
  var GRID_H = ROWS * CELL;

  // Snake: array of {col, row} head-first
  var snake = [];
  var dir = 0; // 0=right, 1=down, 2=left, 3=up
  var nextDir = 0;
  var DIRS = [
    { dc: 1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: -1, dr: 0 },
    { dc: 0, dr: -1 }
  ];

  var food = { col: 0, row: 0 };
  var moveTimer = 0;
  var MOVE_RATE = 0.16; // seconds per step

  var score = 0;
  var NEEDED = 25;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var deathFlash = 0;

  function cellX(c) { return GRID_X + c * CELL; }
  function cellY(r) { return GRID_Y + r * CELL; }

  function placeFood() {
    var tries = 0;
    var fc, fr;
    do {
      fc = Math.floor(Math.random() * COLS);
      fr = Math.floor(Math.random() * ROWS);
      tries++;
    } while (tries < 200 && isSnakeAt(fc, fr));
    food.col = fc;
    food.row = fr;
  }

  function isSnakeAt(c, r) {
    for (var i = 0; i < snake.length; i++) {
      if (snake[i].col === c && snake[i].row === r) return true;
    }
    return false;
  }

  function initSnake() {
    var startCol = Math.floor(COLS / 2);
    var startRow = Math.floor(ROWS / 2);
    snake = [
      { col: startCol, row: startRow },
      { col: startCol - 1, row: startRow },
      { col: startCol - 2, row: startRow }
    ];
    dir = 0;
    nextDir = 0;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Left half = turn left, right half = turn right
    if (tx < W / 2) {
      nextDir = (dir + 3) % 4; // left turn
    } else {
      nextDir = (dir + 1) % 4; // right turn
    }
    game.audio.play('se_tap', 0.06);
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
    if (deathFlash > 0) deathFlash -= dt * 3;

    moveTimer += dt;
    var rate = Math.max(0.09, MOVE_RATE - score * 0.003);
    if (moveTimer >= rate) {
      moveTimer = 0;
      dir = nextDir;

      var head = snake[0];
      var d = DIRS[dir];
      var newCol = head.col + d.dc;
      var newRow = head.row + d.dr;

      // Wall collision
      if (newCol < 0 || newCol >= COLS || newRow < 0 || newRow >= ROWS) {
        if (!done) {
          done = true;
          deathFlash = 0.5;
          game.audio.play('se_failure', 0.7);
          setTimeout(function() { game.end.failure(); }, 700);
        }
        return;
      }

      // Self collision
      for (var i = 0; i < snake.length - 1; i++) {
        if (snake[i].col === newCol && snake[i].row === newRow) {
          if (!done) {
            done = true;
            deathFlash = 0.5;
            game.audio.play('se_failure', 0.7);
            setTimeout(function() { game.end.failure(); }, 700);
          }
          return;
        }
      }

      // Move
      snake.unshift({ col: newCol, row: newRow });

      // Eat food?
      if (newCol === food.col && newRow === food.row) {
        score++;
        game.audio.play('se_tap', 0.18);
        flashAnim = 0.3;
        for (var p = 0; p < 4; p++) {
          var pa = Math.random() * Math.PI * 2;
          var fx = cellX(food.col) + CELL / 2;
          var fy = cellY(food.row) + CELL / 2;
          particles.push({ x: fx, y: fy, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.4, col: C.food });
        }
        placeFood();
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 80); }, 700);
        }
        // Don't remove tail — snake grows
      } else {
        snake.pop();
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid border
    game.draw.rect(GRID_X - 4, GRID_Y - 4, COLS * CELL + 8, ROWS * CELL + 8, C.wall, 0.9);
    game.draw.rect(GRID_X, GRID_Y, COLS * CELL, ROWS * CELL, C.bg, 1.0);

    // Food
    var fPulse = 0.8 + 0.2 * Math.sin(elapsed * 4);
    var fX = cellX(food.col) + CELL / 2;
    var fY = cellY(food.row) + CELL / 2;
    game.draw.circle(fX + 2, fY + 2, CELL * 0.38, '#000', 0.25);
    game.draw.circle(fX, fY, CELL * 0.38 * fPulse, C.food, 0.95);
    game.draw.circle(fX - CELL * 0.1, fY - CELL * 0.12, CELL * 0.1, C.foodHi, 0.6);

    // Snake
    for (var si = snake.length - 1; si >= 0; si--) {
      var seg = snake[si];
      var sx = cellX(seg.col);
      var sy = cellY(seg.row);
      var isHead = si === 0;
      var sCol = isHead ? C.snakeHi : (si % 2 === 0 ? C.snake : C.snakeDk);
      var sAlpha = deathFlash > 0 ? (Math.sin(elapsed * 20) * 0.5 + 0.5) : 0.9;
      game.draw.rect(sx + 2, sy + 2, CELL - 4, CELL - 4, sCol, sAlpha);
      if (isHead) {
        // Eyes
        var eyeOff = dir === 0 ? 1 : (dir === 2 ? -1 : 0);
        var eyeX1 = sx + CELL / 2 + eyeOff * 12 - 8;
        var eyeX2 = sx + CELL / 2 + eyeOff * 12 + 8;
        var eyeY = dir === 1 ? sy + CELL * 0.65 : (dir === 3 ? sy + CELL * 0.3 : sy + CELL / 2);
        game.draw.circle(eyeX1, eyeY, 7, '#000', 0.9);
        game.draw.circle(eyeX2, eyeY, 7, '#000', 0.9);
      }
    }

    // Left/right tap zones hint
    game.draw.text('← 左折', W * 0.17, GRID_Y + GRID_H + 70, { size: 36, color: '#ffffff22' });
    game.draw.text('右折 →', W * 0.83, GRID_Y + GRID_H + 70, { size: 36, color: '#ffffff22' });
    game.draw.line(W / 2, GRID_Y + GRID_H + 40, W / 2, GRID_Y + GRID_H + 100, '#ffffff10', 2);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.06);
    if (deathFlash > 0) game.draw.rect(0, 0, W, H, C.wrong, deathFlash * 0.12);

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    initSnake();
    placeFood();
  });
})(game);
