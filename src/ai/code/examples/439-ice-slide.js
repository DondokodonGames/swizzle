// 439-ice-slide.js
// 氷上スライド — 氷の上を滑るペンギンをゴールへ誘導
// 操作: スワイプでペンギンの進む方向を決める（滑って壁まで止まらない）
// 成功: 10面クリア  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020c18',
    ice:    '#bfdbfe',
    iceHi:  '#eff6ff',
    iceSh:  '#93c5fd',
    wall:   '#1e40af',
    wallHi: '#3b82f6',
    penguin:'#1e293b',
    penguinHi:'#94a3b8',
    belly:  '#f1f5f9',
    beak:   '#f97316',
    eye:    '#fff',
    goal:   '#22c55e',
    goalHi: '#bbf7d0',
    trail:  '#60a5fa',
    text:   '#f1f5f9',
    ui:     '#475569',
    wrong:  '#ef4444'
  };

  var GRID = 7;
  var CELL = 130;
  var OX = (W - GRID * CELL) / 2;
  var OY = (H - GRID * CELL) / 2 - 20;

  var levels = [
    { peng:[1,1], goal:[5,5], walls:[[3,1],[3,2],[3,3],[1,4]] },
    { peng:[0,3], goal:[6,3], walls:[[2,3],[2,2],[4,3],[4,4]] },
    { peng:[0,0], goal:[6,6], walls:[[2,0],[2,2],[4,2],[4,4],[6,4]] },
    { peng:[3,0], goal:[3,6], walls:[[1,2],[5,2],[1,4],[5,4],[3,3]] },
    { peng:[0,6], goal:[6,0], walls:[[2,4],[4,4],[2,2],[4,2],[3,3]] },
    { peng:[0,0], goal:[6,3], walls:[[2,1],[2,3],[4,2],[4,5],[1,5]] },
    { peng:[6,6], goal:[0,0], walls:[[4,4],[4,2],[2,4],[2,2],[3,3]] },
    { peng:[0,3], goal:[6,3], walls:[[1,1],[1,5],[3,3],[5,1],[5,5]] },
    { peng:[3,6], goal:[3,0], walls:[[1,4],[5,4],[2,2],[4,2],[3,4]] },
    { peng:[0,0], goal:[6,6], walls:[[1,2],[2,4],[3,1],[4,3],[5,5]] }
  ];

  var currentLevel = 0;
  var pengX = 0, pengY = 0;
  var goalX = 0, goalY = 0;
  var walls = [];
  var moving = false;
  var moveVX = 0, moveVY = 0;
  var solved = 0;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var trail = [];

  function loadLevel(idx) {
    var lv = levels[idx % levels.length];
    pengX = lv.peng[0];
    pengY = lv.peng[1];
    goalX = lv.goal[0];
    goalY = lv.goal[1];
    walls = lv.walls.map(function(w) { return { x: w[0], y: w[1] }; });
    moving = false;
    trail = [];
  }

  function isWall(x, y) {
    if (x < 0 || x >= GRID || y < 0 || y >= GRID) return true;
    for (var i = 0; i < walls.length; i++) {
      if (walls[i].x === x && walls[i].y === y) return true;
    }
    return false;
  }

  function slide(dx, dy) {
    if (moving) return;
    var nx = pengX + dx;
    var ny = pengY + dy;
    if (isWall(nx, ny)) return;
    moveVX = dx;
    moveVY = dy;
    moving = true;
  }

  game.onSwipe(function(dir) {
    if (done || moving) return;
    if (dir === 'up') slide(0, -1);
    else if (dir === 'down') slide(0, 1);
    else if (dir === 'left') slide(-1, 0);
    else if (dir === 'right') slide(1, 0);
    game.audio.play('se_tap', 0.3);
  });

  game.onTap(function(tx, ty) {
    if (done || moving) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var dx = col - pengX;
    var dy = row - pengY;
    if (Math.abs(dx) > Math.abs(dy)) slide(dx > 0 ? 1 : -1, 0);
    else if (dy !== 0) slide(0, dy > 0 ? 1 : -1);
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

    if (flashAnim > 0) flashAnim -= dt * 2;

    if (moving) {
      var nx = pengX + moveVX;
      var ny = pengY + moveVY;
      if (isWall(nx, ny)) {
        moving = false;
        moveVX = 0; moveVY = 0;
        // Check goal
        if (pengX === goalX && pengY === goalY) {
          solved++;
          flashAnim = 0.8;
          game.audio.play('se_success', 0.7);
          if (solved >= 10 && !done) {
            done = true;
            setTimeout(function() { game.end.success(solved * 500 + Math.ceil(timeLeft) * 80); }, 700);
            return;
          }
          currentLevel++;
          setTimeout(function() { loadLevel(currentLevel); }, 900);
        }
      } else {
        trail.push({ x: pengX, y: pengY });
        if (trail.length > 8) trail.shift();
        pengX = nx;
        pengY = ny;
      }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid cells
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cx2 = OX + c * CELL;
        var cy2 = OY + r * CELL;
        if (isWall(c, r) && !(c < 0 || c >= GRID || r < 0 || r >= GRID)) {
          game.draw.rect(cx2 + 2, cy2 + 2, CELL - 4, CELL - 4, C.wall, 0.9);
          game.draw.rect(cx2 + 2, cy2 + 2, CELL - 4, 8, C.wallHi, 0.4);
        } else {
          game.draw.rect(cx2 + 2, cy2 + 2, CELL - 4, CELL - 4, C.ice, 0.15);
          // Ice sheen
          if ((c + r) % 2 === 0) game.draw.rect(cx2 + 2, cy2 + 2, CELL - 4, CELL - 4, C.iceHi, 0.05);
        }
      }
    }

    // Trail
    for (var ti = 0; ti < trail.length; ti++) {
      var tx2 = OX + trail[ti].x * CELL + CELL/2;
      var ty2 = OY + trail[ti].y * CELL + CELL/2;
      game.draw.circle(tx2, ty2, 20 * (ti/trail.length), C.trail, (ti/trail.length) * 0.4);
    }

    // Goal
    var gx = OX + goalX * CELL + CELL/2;
    var gy = OY + goalY * CELL + CELL/2;
    game.draw.circle(gx, gy, CELL*0.42, C.goalHi, 0.2);
    game.draw.circle(gx, gy, CELL*0.32, C.goal, 0.7);
    game.draw.circle(gx, gy, CELL*0.16, C.goalHi, 0.8);
    game.draw.text('★', gx, gy + 16, { size: 48, color: C.goalHi, bold: true });

    // Penguin
    var px = OX + pengX * CELL + CELL/2;
    var py = OY + pengY * CELL + CELL/2;
    // Body
    game.draw.circle(px, py, 40, C.penguin, 0.9);
    // Belly
    game.draw.circle(px, py + 6, 26, C.belly, 0.8);
    // Eyes
    game.draw.circle(px - 12, py - 16, 8, C.eye, 0.9);
    game.draw.circle(px + 12, py - 16, 8, C.eye, 0.9);
    game.draw.circle(px - 10, py - 16, 4, C.penguin, 1);
    game.draw.circle(px + 14, py - 16, 4, C.penguin, 1);
    // Beak
    game.draw.circle(px, py - 4, 10, C.beak, 0.9);
    // Flippers
    game.draw.circle(px - 44, py, 16, C.penguinHi, 0.8);
    game.draw.circle(px + 44, py, 16, C.penguinHi, 0.8);

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.goal, flashAnim * 0.1);

    // Level indicator
    game.draw.text('レベル ' + (currentLevel + 1) + ' / 10', W/2, H*0.88, { size: 44, color: C.text });

    game.draw.text(solved + ' / 10', W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ice : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: C.penguin, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    loadLevel(0);
  });
})(game);
