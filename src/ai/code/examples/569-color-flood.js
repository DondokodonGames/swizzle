// 569-color-flood.js
// カラーフラッド — 左上から色を広げて盤面を塗りつぶすパズル
// 操作: タップで次の色を選ぶ（隣接する同色が連結して広がる）
// 成功: 25手以内に全塗  失敗: 超過

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a14',
    text:   '#f1f5f9',
    ui:     '#374151',
    win:    '#22c55e',
    lose:   '#ef4444'
  };

  var COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'];
  var GRID = 8;
  var CELL = Math.floor(W * 0.85 / GRID);
  var OX = (W - GRID * CELL) / 2;
  var OY = H * 0.22;
  var MAX_MOVES = 25;

  var grid = [];
  var moves = 0;
  var done = false;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.win;
  var animQueue = []; // cells to animate as flood fills
  var animTimer = 0;

  function randomGrid() {
    grid = [];
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        grid.push(Math.floor(Math.random() * COLORS.length));
      }
    }
  }

  function idx(r, c) { return r * GRID + c; }

  function getFloodRegion() {
    // BFS from (0,0) collecting all same-color cells connected
    var startColor = grid[0];
    var visited = [];
    for (var i = 0; i < grid.length; i++) visited.push(false);
    var queue = [0];
    visited[0] = true;
    var region = [0];
    while (queue.length > 0) {
      var cur = queue.shift();
      var cr = Math.floor(cur / GRID), cc = cur % GRID;
      var neighbors = [];
      if (cr > 0) neighbors.push(idx(cr - 1, cc));
      if (cr < GRID - 1) neighbors.push(idx(cr + 1, cc));
      if (cc > 0) neighbors.push(idx(cr, cc - 1));
      if (cc < GRID - 1) neighbors.push(idx(cr, cc + 1));
      for (var ni = 0; ni < neighbors.length; ni++) {
        var nb = neighbors[ni];
        if (!visited[nb] && grid[nb] === startColor) {
          visited[nb] = true;
          queue.push(nb);
          region.push(nb);
        }
      }
    }
    return region;
  }

  function floodFill(newColor) {
    if (done) return;
    var currentColor = grid[0];
    if (newColor === currentColor) return;

    // Get current flood region
    var region = getFloodRegion();
    // Set region to new color
    for (var i = 0; i < region.length; i++) {
      grid[region[i]] = newColor;
    }

    // Now expand: BFS again to include newly connected same-color cells
    var expand = true;
    while (expand) {
      expand = false;
      var newRegion = getFloodRegion();
      if (newRegion.length > region.length) {
        region = newRegion;
        expand = true;
      }
    }

    moves++;
    game.audio.play('se_tap', 0.3);

    // Check win
    var allSame = true;
    for (var gi = 0; gi < grid.length; gi++) {
      if (grid[gi] !== grid[0]) { allSame = false; break; }
    }

    if (allSame) {
      flashCol = C.win;
      flashAnim = 0.5;
      done = true;
      game.audio.play('se_success', 0.9);
      var bonus = Math.max(0, MAX_MOVES - moves);
      for (var pi = 0; pi < 16; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: H / 2, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.6, col: COLORS[newColor] });
      }
      setTimeout(function() { game.end.success(bonus * 1000 + (MAX_MOVES - moves + 1) * 200); }, 700);
    } else if (moves >= MAX_MOVES) {
      flashCol = C.lose;
      flashAnim = 0.4;
      done = true;
      game.audio.play('se_failure', 0.6);
      setTimeout(function() { game.end.failure(); }, 700);
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Color picker area
    var numColors = COLORS.length;
    var btnW = W * 0.8 / numColors;
    var btnX = W * 0.1;
    var btnY = OY + GRID * CELL + 60;
    if (ty >= btnY && ty <= btnY + 120) {
      var ci = Math.floor((tx - btnX) / btnW);
      if (ci >= 0 && ci < numColors) {
        floodFill(ci);
      }
    }
    // Also allow tapping grid cells
    var gc = Math.floor((tx - OX) / CELL);
    var gr = Math.floor((ty - OY) / CELL);
    if (gc >= 0 && gc < GRID && gr >= 0 && gr < GRID) {
      floodFill(grid[idx(gr, gc)]);
    }
  });

  game.onUpdate(function(dt) {
    if (done) {
      elapsed += dt;
    } else {
      elapsed += dt;
    }
    if (flashAnim > 0) flashAnim -= dt * 2.5;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    var floodRegion = getFloodRegion();
    var inFlood = {};
    for (var fi = 0; fi < floodRegion.length; fi++) inFlood[floodRegion[fi]] = true;

    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var i = idx(r, c);
        var gx = OX + c * CELL;
        var gy = OY + r * CELL;
        var col = COLORS[grid[i]];
        var alpha = inFlood[i] ? 0.95 : 0.75;
        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, col, alpha);
        if (inFlood[i]) {
          // Highlight flood region
          game.draw.rect(gx + 2, gy + 2, CELL - 4, 6, '#ffffff', 0.3);
        }
      }
    }

    // Color buttons
    var numColors = COLORS.length;
    var btnW = W * 0.8 / numColors;
    var btnX = W * 0.1;
    var btnY = OY + GRID * CELL + 60;
    for (var ci = 0; ci < numColors; ci++) {
      var bx = btnX + ci * btnW;
      var isCurrentColor = (grid[0] === ci);
      game.draw.rect(bx + 6, btnY, btnW - 12, 110, COLORS[ci], isCurrentColor ? 0.4 : 0.85);
      if (isCurrentColor) {
        game.draw.rect(bx + 6, btnY, btnW - 12, 8, '#ffffff', 0.6);
        game.draw.text('✓', bx + btnW / 2, btnY + 70, { size: 36, color: '#fff', bold: true });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Move counter
    var movesLeft = MAX_MOVES - moves;
    var moveCol = movesLeft <= 5 ? C.lose : (movesLeft <= 10 ? '#f59e0b' : C.text);
    game.draw.text('残り手数: ' + movesLeft, W / 2, 148, { size: 56, color: moveCol, bold: true });
    game.draw.text('手数: ' + moves + ' / ' + MAX_MOVES, W / 2, 210, { size: 36, color: C.ui });

    // No timer bar — this is a move-limited puzzle
    game.draw.rect(0, 0, W, 72, C.bg);
    var ratio = Math.max(0, movesLeft / MAX_MOVES);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.4 ? C.win : C.lose);
    game.draw.text(movesLeft + '手', W / 2, 36, { size: 44, color: moveCol, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    randomGrid();
  });
})(game);
