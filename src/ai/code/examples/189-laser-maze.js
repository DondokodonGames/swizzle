// 189-laser-maze.js
// レーザー迷路 — 回転するミラーを配置してレーザーをゴールに当てる光学パズル
// 操作: タップでミラーの角度を90度回転
// 成功: レーザーがゴールに到達  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040808',
    grid:    '#0a1010',
    laser:   '#ef4444',
    laserHi: '#fca5a5',
    mirror:  '#60a5fa',
    mirrorHi:'#bfdbfe',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    wall:    '#1e3a5f',
    ui:      '#334155'
  };

  var COLS = 7;
  var ROWS = 10;
  var CELL = 140;
  var GX = (W - COLS * CELL) / 2;
  var GY = H * 0.1;

  var SOURCE = { col: 0, row: 2, dir: 'right' }; // laser emitter
  var GOAL_CELL = { col: 6, row: 7 };

  // Grid: null=empty, 'M'=mirror (45 deg or 135 deg)
  var grid = [];
  var mirrorAngles = {}; // key: col+','+row -> 45 or 135

  function key(c, r) { return c + ',' + r; }

  function initMirrors() {
    // Place 5 movable mirrors at fixed positions
    var mirrors = [
      { c: 1, r: 2 }, { c: 3, r: 2 }, { c: 5, r: 2 },
      { c: 2, r: 5 }, { c: 4, r: 7 }
    ];
    for (var i = 0; i < mirrors.length; i++) {
      var m = mirrors[i];
      mirrorAngles[key(m.c, m.r)] = 45;
    }
    // Walls
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        grid.push(null);
      }
    }
  }

  function traceLaser() {
    var path = [];
    var x = SOURCE.col, y = SOURCE.row;
    var dx = 1, dy = 0; // starting direction (right)
    var maxSteps = 200;
    while (maxSteps-- > 0) {
      path.push({ x: x, y: y });
      // Check bounds
      var nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break;

      // Check mirror
      var mk = key(nx, ny);
      if (mirrorAngles[mk] !== undefined) {
        var ang = mirrorAngles[mk];
        // 45 deg mirror: reflects right->up, up->right, left->down, down->left
        // 135 deg mirror: reflects right->down, down->right, left->up, up->left
        if (ang === 45) {
          if (dx === 1 && dy === 0) { dx = 0; dy = -1; }
          else if (dx === -1 && dy === 0) { dx = 0; dy = 1; }
          else if (dx === 0 && dy === -1) { dx = 1; dy = 0; }
          else if (dx === 0 && dy === 1) { dx = -1; dy = 0; }
        } else {
          if (dx === 1 && dy === 0) { dx = 0; dy = 1; }
          else if (dx === -1 && dy === 0) { dx = 0; dy = -1; }
          else if (dx === 0 && dy === 1) { dx = 1; dy = 0; }
          else if (dx === 0 && dy === -1) { dx = -1; dy = 0; }
        }
        path.push({ x: nx, y: ny });
        x = nx; y = ny;
      } else {
        x = nx; y = ny;
      }
    }
    return path;
  }

  function checkWin(path) {
    var last = path[path.length - 1];
    return last && last.x === GOAL_CELL.col && last.y === GOAL_CELL.row;
  }

  var done = false;
  var timeLeft = 60;
  var laserPath = [];
  var elapsed = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - GX) / CELL);
    var row = Math.floor((ty - GY) / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    var mk = key(col, row);
    if (mirrorAngles[mk] !== undefined) {
      mirrorAngles[mk] = mirrorAngles[mk] === 45 ? 135 : 45;
      game.audio.play('se_tap', 0.4);
      laserPath = traceLaser();
      if (checkWin(laserPath)) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 60 + 500); }, 400);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var cx = GX + c * CELL;
        var cy = GY + r * CELL;
        game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, C.grid, 0.8);
      }
    }

    // Laser path
    var laserBlink = 0.7 + 0.3 * Math.abs(Math.sin(elapsed * 6));
    for (var li = 0; li < laserPath.length; li++) {
      var lp = laserPath[li];
      var lx = GX + lp.x * CELL + CELL / 2;
      var ly = GY + lp.y * CELL + CELL / 2;
      game.draw.circle(lx, ly, 12, C.laserHi, laserBlink * 0.4);
      game.draw.circle(lx, ly, 6, C.laser, laserBlink);
      if (li > 0) {
        var prev = laserPath[li - 1];
        var px2 = GX + prev.x * CELL + CELL / 2;
        var py2 = GY + prev.y * CELL + CELL / 2;
        game.draw.line(px2, py2, lx, ly, C.laser, 6);
        game.draw.line(px2, py2, lx, ly, C.laserHi, 2);
      }
    }

    // Mirrors
    for (var mk2 in mirrorAngles) {
      var parts = mk2.split(',');
      var mc = parseInt(parts[0]), mr = parseInt(parts[1]);
      var mx = GX + mc * CELL + CELL / 2;
      var my = GY + mr * CELL + CELL / 2;
      var ang2 = mirrorAngles[mk2];
      // Draw mirror as diagonal line
      var half = CELL * 0.38;
      if (ang2 === 45) {
        game.draw.line(mx - half, my + half, mx + half, my - half, C.mirror, 8);
        game.draw.line(mx - half + 4, my + half - 4, mx + half - 4, my - half + 4, C.mirrorHi, 3);
      } else {
        game.draw.line(mx - half, my - half, mx + half, my + half, C.mirror, 8);
        game.draw.line(mx - half + 4, my - half + 4, mx + half - 4, my + half - 4, C.mirrorHi, 3);
      }
      game.draw.circle(mx, my, 12, C.mirrorHi, 0.5);
    }

    // Source
    var sx = GX + SOURCE.col * CELL + CELL / 2;
    var sy = GY + SOURCE.row * CELL + CELL / 2;
    game.draw.circle(sx, sy, 28, C.laserHi, 0.3);
    game.draw.circle(sx, sy, 20, C.laser, 0.9);
    game.draw.text('▶', sx, sy, { size: 28, color: '#fff', bold: true });

    // Goal
    var gx2 = GX + GOAL_CELL.col * CELL + CELL / 2;
    var gy2 = GY + GOAL_CELL.row * CELL + CELL / 2;
    var goalPulse = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 3));
    game.draw.circle(gx2, gy2, 32 + 8 * goalPulse, C.goalHi, goalPulse * 0.3);
    game.draw.circle(gx2, gy2, 28, C.goal, 0.9);
    game.draw.text('★', gx2, gy2, { size: 36, color: '#fff', bold: true });

    game.draw.text('ミラーをタップして回転', W / 2, H * 0.93, { size: 36, color: C.ui });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.goal : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initMirrors();
    laserPath = traceLaser();
  });
})(game);
