// 642-ice-slide.js
// アイスライド — 氷の上を滑るコインをゴールに誘導しろ
// 操作: スワイプで方向を変える（氷なので慣性あり）
// 成功: 15ゴール  失敗: 10回落下 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010a18',
    ice:     '#1e40af',
    iceHi:   '#93c5fd',
    iceShad: '#0f172a',
    coin:    '#fbbf24',
    coinHi:  '#fef08a',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    hole:    '#000000',
    text:    '#f1f5f9',
    ui:      '#050d1a',
    wall:    '#334155'
  };

  var TILE = 160;
  var COLS = 6, ROWS = 8;
  var BOARD_X = (W - COLS * TILE) / 2;
  var BOARD_Y = H * 0.15;

  // Tile types: 0=hole, 1=ice, 2=goal
  var board = [];
  var coinX = 0, coinY = 0;   // grid pos
  var coinPX = 0, coinPY = 0; // pixel pos
  var coinVX = 0, coinVY = 0;
  var moving = false;

  var scored = 0;
  var NEEDED = 15;
  var fell = 0;
  var MAX_FELL = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];

  function genBoard() {
    board = [];
    for (var r = 0; r < ROWS; r++) {
      var row = [];
      for (var c = 0; c < COLS; c++) {
        row.push(1); // all ice by default
      }
      board.push(row);
    }
    // Place holes randomly (not at start or goal)
    var holeCount = 4 + Math.floor(elapsed / 5);
    for (var h = 0; h < holeCount; h++) {
      var hr = 1 + Math.floor(Math.random() * (ROWS - 2));
      var hc = Math.floor(Math.random() * COLS);
      board[hr][hc] = 0;
    }
    // Goal at random position in top half
    var gr = Math.floor(Math.random() * 3);
    var gc = Math.floor(Math.random() * COLS);
    board[gr][gc] = 2;
    // Place coin at bottom
    coinY = ROWS - 1;
    coinX = Math.floor(Math.random() * COLS);
    board[coinY][coinX] = 1;
    coinPX = BOARD_X + coinX * TILE + TILE / 2;
    coinPY = BOARD_Y + coinY * TILE + TILE / 2;
    coinVX = 0; coinVY = 0;
    moving = false;
  }

  function getCell(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1; // out of bounds
    return board[r][c];
  }

  game.onSwipe(function(dir) {
    if (done || moving) return;
    var dx = 0, dy = 0;
    if (dir === 'up') dy = -1;
    else if (dir === 'down') dy = 1;
    else if (dir === 'left') dx = -1;
    else if (dir === 'right') dx = 1;
    if (dx === 0 && dy === 0) return;

    coinVX = dx * 600;
    coinVY = dy * 600;
    moving = true;
    game.audio.play('se_tap', 0.12);
  });

  game.onTap(function(tx, ty) {
    if (done || moving) return;
    // Determine direction from tap position relative to coin pixel pos
    var dx = tx - coinPX, dy = ty - coinPY;
    var absDx = Math.abs(dx), absDy = Math.abs(dy);
    var dir = 'none';
    if (absDx > absDy) dir = dx > 0 ? 'right' : 'left';
    else dir = dy > 0 ? 'down' : 'up';
    var dvx = 0, dvy = 0;
    if (dir === 'right') dvx = 600;
    else if (dir === 'left') dvx = -600;
    else if (dir === 'down') dvy = 600;
    else if (dir === 'up') dvy = -600;
    coinVX = dvx; coinVY = dvy;
    moving = true;
    game.audio.play('se_tap', 0.12);
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

    if (moving) {
      coinPX += coinVX * dt;
      coinPY += coinVY * dt;

      // Snap to grid
      var newGridX = Math.round((coinPX - BOARD_X - TILE / 2) / TILE);
      var newGridY = Math.round((coinPY - BOARD_Y - TILE / 2) / TILE);

      // Check what cell we're in
      var cellType = getCell(newGridX, newGridY);

      if (cellType === -1) {
        // Out of bounds = fell off
        fell++;
        game.audio.play('se_failure', 0.3);
        for (var p = 0; p < 5; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: coinPX, y: coinPY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.coinHi });
        }
        if (fell >= MAX_FELL && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        } else {
          genBoard();
        }
        return;
      }

      if (cellType === 0) {
        // Hole — fell in
        fell++;
        game.audio.play('se_failure', 0.3);
        if (fell >= MAX_FELL && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        } else {
          genBoard();
        }
        return;
      }

      if (cellType === 2) {
        // Goal!
        scored++;
        game.audio.play('se_success', 0.6);
        for (var p2 = 0; p2 < 8; p2++) {
          var pa2 = Math.random() * Math.PI * 2;
          particles.push({ x: coinPX, y: coinPY, vx: Math.cos(pa2) * 300, vy: Math.sin(pa2) * 300, life: 0.5, col: C.goalHi });
        }
        if (scored >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(scored * 400 + Math.ceil(timeLeft) * 80); }, 700);
        } else {
          genBoard();
        }
        return;
      }

      // On ice — continue sliding but check if near center of a cell to allow new input
      coinX = newGridX;
      coinY = newGridY;

      // Friction: nearly none on ice
      coinVX *= (1 - dt * 0.5);
      coinVY *= (1 - dt * 0.5);

      var speed = Math.sqrt(coinVX * coinVX + coinVY * coinVY);
      if (speed < 30) {
        // Snap to grid center
        coinPX = BOARD_X + coinX * TILE + TILE / 2;
        coinPY = BOARD_Y + coinY * TILE + TILE / 2;
        coinVX = 0; coinVY = 0;
        moving = false;
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

    // Board tiles
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var tx2 = BOARD_X + c * TILE;
        var ty2 = BOARD_Y + r * TILE;
        var cell = board[r][c];
        if (cell === 0) {
          game.draw.rect(tx2 + 4, ty2 + 4, TILE - 8, TILE - 8, C.hole, 0.9);
        } else if (cell === 1) {
          game.draw.rect(tx2 + 2, ty2 + 2, TILE - 4, TILE - 4, C.iceShad, 0.8);
          game.draw.rect(tx2 + 2, ty2 + 2, TILE - 4, TILE - 4, C.ice, 0.7);
          game.draw.rect(tx2 + 2, ty2 + 2, TILE - 4, 8, C.iceHi, 0.3);
        } else if (cell === 2) {
          game.draw.rect(tx2 + 2, ty2 + 2, TILE - 4, TILE - 4, C.goal, 0.3);
          game.draw.rect(tx2 + 2, ty2 + 2, TILE - 4, 8, C.goalHi, 0.4);
          game.draw.text('★', tx2 + TILE / 2, ty2 + TILE / 2 + 16, { size: 72, color: C.goalHi });
        }
      }
    }

    // Coin
    game.draw.circle(coinPX + 5, coinPY + 5, 40, '#000', 0.3);
    game.draw.circle(coinPX, coinPY, 40, C.coin, 0.9);
    game.draw.circle(coinPX - 12, coinPY - 12, 16, C.coinHi, 0.6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 12 * p3.life, p3.col, p3.life);
    }

    // Arrow hints
    if (!moving) {
      game.draw.text('↑↓←→ スワイプ', W / 2, BOARD_Y - 30, { size: 36, color: '#ffffff55' });
    }

    // Fall dots
    for (var fi = 0; fi < MAX_FELL; fi++) {
      game.draw.circle(W / 2 - (MAX_FELL - 1) * 40 + fi * 80, H * 0.955, 16, fi < fell ? C.hole : C.ui, 0.9);
    }

    game.draw.text(scored + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.iceHi : C.hole);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    genBoard();
  });
})(game);
