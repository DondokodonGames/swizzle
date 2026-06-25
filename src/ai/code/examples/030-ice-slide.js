// 030-ice-slide.js
// 氷上スライド — 止まれない氷の上でゴールを目指す爽快なパズル
// 操作: スワイプで方向指定（壁にぶつかるまで滑り続ける）
// 成功: ゴールに到達  失敗: 穴に落ちる or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04111e',
    ice:     '#0ea5e9',
    iceHi:   '#bae6fd',
    wall:    '#1e3a5f',
    wallHi:  '#2563eb',
    hole:    '#020810',
    player:  '#fbbf24',
    playerHi:'#fef3c7',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    trail:   '#7dd3fc',
    ui:      '#475569'
  };

  var COLS = 7;
  var ROWS = 9;
  var CELL = 128;
  var GAP = 6;
  var GRID_W = COLS * (CELL + GAP) - GAP;
  var GRID_H = ROWS * (CELL + GAP) - GAP;
  var GRID_X = (W - GRID_W) / 2;
  var GRID_Y = 200;

  // 0=ice, 1=wall, 2=hole
  // Level layout (COLS×ROWS, row by row)
  var LEVEL = [
    1,1,1,1,1,1,1,
    1,0,0,0,0,2,1,
    1,0,1,0,1,0,1,
    1,0,0,0,0,0,1,
    1,2,1,0,0,0,1,
    1,0,0,0,1,0,1,
    1,0,0,2,0,0,1,
    1,0,0,0,0,0,1,
    1,1,1,1,1,1,1
  ];

  var GOAL_COL = 5;
  var GOAL_ROW = 7;
  var START_COL = 1;
  var START_ROW = 1;

  var playerCol = START_COL;
  var playerRow = START_ROW;
  var playerX = 0, playerY = 0; // pixel position for smooth animation
  var sliding = false;
  var slideVx = 0, slideVy = 0;
  var slideTargetCol = START_COL, slideTargetRow = START_ROW;
  var SLIDE_SPEED = 1200; // px/sec

  var trail = [];
  var timeLeft = 20;
  var done = false;
  var won = false;

  function cellIdx(c, r) { return r * COLS + c; }

  function cellCenter(c, r) {
    return {
      x: GRID_X + c * (CELL + GAP) + CELL / 2,
      y: GRID_Y + r * (CELL + GAP) + CELL / 2
    };
  }

  function isIce(c, r) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
    return LEVEL[cellIdx(c, r)] === 0;
  }

  function startSlide(dc, dr) {
    if (sliding || done) return;
    // Find where player slides to
    var tc = playerCol + dc;
    var tr = playerRow + dr;
    while (isIce(tc, tr) || LEVEL[cellIdx(tc, tr)] === 2) {
      // Check if this is a hole — they stop on holes too (or fall in)
      if (LEVEL[cellIdx(tc, tr)] === 2) { break; }
      var nc = tc + dc, nr = tr + dr;
      if (!isIce(nc, nr)) break;
      tc = nc; tr = nr;
    }
    if (tc === playerCol && tr === playerRow) return; // can't move

    slideTargetCol = tc;
    slideTargetRow = tr;
    var start = cellCenter(playerCol, playerRow);
    var end = cellCenter(tc, tr);
    slideVx = (end.x - start.x) / Math.max(0.001, Math.abs(end.x - start.x) + Math.abs(end.y - start.y)) * SLIDE_SPEED;
    slideVy = (end.y - start.y) / Math.max(0.001, Math.abs(end.x - start.x) + Math.abs(end.y - start.y)) * SLIDE_SPEED;
    sliding = true;
    trail.push({ x: playerX, y: playerY });
    game.audio.play('se_tap', 0.5);
  }

  game.onSwipe(function(dir) {
    if (done || sliding) return;
    if (dir === 'right') startSlide(1, 0);
    if (dir === 'left')  startSlide(-1, 0);
    if (dir === 'down')  startSlide(0, 1);
    if (dir === 'up')    startSlide(0, -1);
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

    // Initialize pixel position
    if (playerX === 0 && playerY === 0) {
      var startPos = cellCenter(playerCol, playerRow);
      playerX = startPos.x;
      playerY = startPos.y;
    }

    // Sliding animation
    if (sliding && !done) {
      playerX += slideVx * dt;
      playerY += slideVy * dt;

      var targetPos = cellCenter(slideTargetCol, slideTargetRow);
      var dx = targetPos.x - playerX;
      var dy = targetPos.y - playerY;
      // Check if we overshot
      var dot = dx * slideVx + dy * slideVy;
      if (dot <= 0 || (Math.abs(dx) < 4 && Math.abs(dy) < 4)) {
        playerX = targetPos.x;
        playerY = targetPos.y;
        playerCol = slideTargetCol;
        playerRow = slideTargetRow;
        sliding = false;

        var cellType = LEVEL[cellIdx(playerCol, playerRow)];
        if (cellType === 2) {
          // Hole!
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
        } else if (playerCol === GOAL_COL && playerRow === GOAL_ROW) {
          // Goal!
          done = true;
          won = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(300 + Math.ceil(timeLeft) * 10);
          }, 400);
        }
      }
    }

    if (trail.length > 12) trail.shift();

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var ci = cellIdx(c, r);
        var cx2 = GRID_X + c * (CELL + GAP);
        var cy2 = GRID_Y + r * (CELL + GAP);
        var type = LEVEL[ci];
        if (type === 1) {
          // Wall
          game.draw.rect(cx2, cy2, CELL, CELL, C.wall);
          game.draw.rect(cx2 + 8, cy2 + 8, CELL - 16, CELL / 3, C.wallHi, 0.3);
        } else if (type === 2) {
          // Hole
          game.draw.rect(cx2, cy2, CELL, CELL, C.hole);
          game.draw.circle(cx2 + CELL/2, cy2 + CELL/2, CELL * 0.35, '#000');
        } else {
          // Ice
          game.draw.rect(cx2, cy2, CELL, CELL, C.ice, 0.5);
          game.draw.rect(cx2 + 8, cy2 + 4, CELL / 2, 8, C.iceHi, 0.4);
        }
        // Goal
        if (c === GOAL_COL && r === GOAL_ROW) {
          var gp = 0.6 + 0.4 * Math.sin(game.time.elapsed * 4);
          game.draw.rect(cx2, cy2, CELL, CELL, C.goal, gp * 0.6);
          game.draw.text('G', cx2 + CELL/2, cy2 + CELL/2, { size: 64, color: C.goalHi, bold: true });
        }
      }
    }

    // Trail
    for (var t = 0; t < trail.length; t++) {
      var ta = (1 - t / trail.length) * 0.4;
      game.draw.circle(trail[t].x, trail[t].y, 20 * (1 - t/trail.length), C.trail, ta);
    }

    // Player
    game.draw.circle(playerX, playerY, CELL * 0.35 + 8, C.playerHi, 0.25);
    game.draw.circle(playerX, playerY, CELL * 0.35, C.player);
    game.draw.circle(playerX - 12, playerY - 12, CELL * 0.12, '#fff', 0.6);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#04111e');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ice : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('スワイプで滑れ！', W / 2, H - 220, { size: 52, color: C.ui });
    game.draw.text('穴に落ちないように', W / 2, H - 155, { size: 40, color: '#0c4a6e' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    var sp = cellCenter(START_COL, START_ROW);
    playerX = sp.x;
    playerY = sp.y;
  });
})(game);
