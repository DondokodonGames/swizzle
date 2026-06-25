// 288-neon-snake.js
// ネオンスネーク — ネオンカラーの蛇を操って光る果実を集める
// 操作: スワイプで進む方向を変える
// 成功: 20個のフルーツを食べる  失敗: 壁または自分に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020108',
    head:   '#22c55e',
    headHi: '#86efac',
    body:   '#166534',
    bodyHi: '#15803d',
    fruit:  '#f59e0b',
    frtHi:  '#fde68a',
    wall:   '#1e1b4b',
    wallHi: '#312e81',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var CELL = 60;
  var COLS = Math.floor(W / CELL);
  var ROWS = Math.floor(H * 0.78 / CELL);
  var OX = Math.floor((W - COLS * CELL) / 2);
  var OY = H * 0.14;

  var snake = [];
  var dir = { dx: 1, dy: 0 };
  var nextDir = { dx: 1, dy: 0 };
  var fruits = [];
  var eaten = 0;
  var NEEDED = 20;
  var done = false;
  var timeLeft = 60; // not the real constraint — collisions end it
  var elapsed = 0;
  var moveTimer = 0;
  var MOVE_INTERVAL = 0.18;
  var particles = [];
  var bodyColors = [];

  var FRUIT_COLORS = [C.fruit, '#ef4444', '#a855f7', '#3b82f6'];

  function initSnake() {
    snake = [];
    for (var i = 4; i >= 0; i--) {
      snake.push({ x: i, y: Math.floor(ROWS / 2) });
    }
    bodyColors = [];
    for (var j = 0; j < snake.length; j++) {
      bodyColors.push(0);
    }
  }

  function spawnFruit() {
    var attempts = 0;
    while (attempts < 50) {
      var fx = Math.floor(Math.random() * COLS);
      var fy = Math.floor(Math.random() * ROWS);
      var onSnake = false;
      for (var si = 0; si < snake.length; si++) {
        if (snake[si].x === fx && snake[si].y === fy) { onSnake = true; break; }
      }
      var onFruit = false;
      for (var fi = 0; fi < fruits.length; fi++) {
        if (fruits[fi].x === fx && fruits[fi].y === fy) { onFruit = true; break; }
      }
      if (!onSnake && !onFruit) {
        fruits.push({ x: fx, y: fy, col: FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)], pulse: Math.random() * Math.PI * 2 });
        return;
      }
      attempts++;
    }
  }

  game.onSwipe(function(dir2, x1, y1, x2, y2) {
    if (done) return;
    if (dir2 === 'left' && dir.dx !== 1) nextDir = { dx: -1, dy: 0 };
    else if (dir2 === 'right' && dir.dx !== -1) nextDir = { dx: 1, dy: 0 };
    else if (dir2 === 'up' && dir.dy !== 1) nextDir = { dx: 0, dy: -1 };
    else if (dir2 === 'down' && dir.dy !== -1) nextDir = { dx: 0, dy: 1 };
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      // No time-based failure here — but add a very long one as fallback
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    for (var fi2 = 0; fi2 < fruits.length; fi2++) {
      fruits[fi2].pulse += dt * 4;
    }

    moveTimer -= dt;
    if (moveTimer <= 0 && !done) {
      moveTimer = Math.max(0.1, MOVE_INTERVAL - eaten * 0.003);
      dir = nextDir;

      var head = snake[0];
      var nx = head.x + dir.dx;
      var ny = head.y + dir.dy;

      // Wall collision
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }

      // Self collision
      for (var si2 = 0; si2 < snake.length; si2++) {
        if (snake[si2].x === nx && snake[si2].y === ny) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }

      // Check fruit
      var ateIdx = -1;
      for (var fi3 = 0; fi3 < fruits.length; fi3++) {
        if (fruits[fi3].x === nx && fruits[fi3].y === ny) { ateIdx = fi3; break; }
      }

      snake.unshift({ x: nx, y: ny });
      bodyColors.unshift(ateIdx >= 0 ? 1 : 0);

      if (ateIdx >= 0) {
        eaten++;
        var fx2 = OX + fruits[ateIdx].x * CELL + CELL / 2;
        var fy2 = OY + fruits[ateIdx].y * CELL + CELL / 2;
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: fx2, y: fy2, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: fruits[ateIdx].col });
        }
        fruits.splice(ateIdx, 1);
        game.audio.play('se_success', 0.4);
        if (eaten >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(eaten * 100 + Math.ceil(timeLeft) * 60); }, 400);
          return;
        }
        spawnFruit();
      } else {
        snake.pop();
        bodyColors.pop();
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

    // Grid lines
    for (var ri = 0; ri <= ROWS; ri++) {
      game.draw.line(OX, OY + ri * CELL, OX + COLS * CELL, OY + ri * CELL, '#0a0818', 1);
    }
    for (var ci2 = 0; ci2 <= COLS; ci2++) {
      game.draw.line(OX + ci2 * CELL, OY, OX + ci2 * CELL, OY + ROWS * CELL, '#0a0818', 1);
    }

    // Wall border
    game.draw.rect(OX - 6, OY - 6, COLS * CELL + 12, 6, C.wall, 0.9);
    game.draw.rect(OX - 6, OY + ROWS * CELL, COLS * CELL + 12, 6, C.wall, 0.9);
    game.draw.rect(OX - 6, OY - 6, 6, ROWS * CELL + 12, C.wall, 0.9);
    game.draw.rect(OX + COLS * CELL, OY - 6, 6, ROWS * CELL + 12, C.wall, 0.9);

    // Fruits
    for (var fi4 = 0; fi4 < fruits.length; fi4++) {
      var fr = fruits[fi4];
      var fx3 = OX + fr.x * CELL + CELL / 2;
      var fy3 = OY + fr.y * CELL + CELL / 2;
      var r3 = CELL * 0.35 + 4 * Math.sin(fr.pulse);
      game.draw.circle(fx3, fy3, r3 + 6, fr.col, 0.2);
      game.draw.circle(fx3, fy3, r3, fr.col, 0.9);
      game.draw.circle(fx3 - r3 * 0.3, fy3 - r3 * 0.3, r3 * 0.25, C.frtHi, 0.6);
    }

    // Snake body
    for (var si3 = snake.length - 1; si3 >= 0; si3--) {
      var seg = snake[si3];
      var sx = OX + seg.x * CELL;
      var sy = OY + seg.y * CELL;
      var isHead = si3 === 0;
      var col2 = isHead ? C.head : C.body;
      var hiCol2 = isHead ? C.headHi : C.bodyHi;
      var margin = isHead ? 4 : 6;
      game.draw.rect(sx + margin, sy + margin, CELL - margin * 2, CELL - margin * 2, col2, 0.9);
      game.draw.rect(sx + margin, sy + margin, CELL - margin * 2, 6, hiCol2, 0.4);
      if (isHead) {
        // Eye
        game.draw.circle(sx + CELL * 0.7, sy + CELL * 0.35, 7, '#fff', 0.9);
        game.draw.circle(sx + CELL * 0.7 + dir.dx * 3, sy + CELL * 0.35 + dir.dy * 3, 4, C.bg, 0.9);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text(eaten + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('スワイプで方向転換', W / 2, H * 0.93, { size: 36, color: C.ui });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.head : C.fruit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initSnake();
    for (var i = 0; i < 3; i++) spawnFruit();
  });
})(game);
