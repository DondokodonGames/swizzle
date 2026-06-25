// 184-color-flood.js
// カラーフラッド — 左上から色を広げて全マスを同色に染める、少ない手数が勝ち
// 操作: タップで色を選択して広げる
// 成功: 20手以内に全マスを染める  失敗: 20手使い切る

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var COLS = 8;
  var ROWS = 8;
  var CELL = 112;
  var GAP = 4;
  var GW = COLS * CELL + (COLS - 1) * GAP;
  var GH = ROWS * CELL + (ROWS - 1) * GAP;
  var GX = (W - GW) / 2;
  var GY = H * 0.22;

  var COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];
  var COLOR_NAMES = ['赤', '橙', '緑', '青', '紫'];
  var C = {
    bg:  '#06080c',
    ui:  '#334155',
    panel: '#0f1420'
  };

  var grid = [];
  var moves = 0;
  var MAX_MOVES = 20;
  var done = false;
  var floodColor = 0;
  var elapsed = 0;
  var particles = [];

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        grid.push(Math.floor(Math.random() * COLORS.length));
      }
    }
    floodColor = grid[0];
  }

  function flood(newColor) {
    if (newColor === floodColor) return;
    var oldColor = floodColor;
    floodColor = newColor;
    // BFS from (0,0) replacing oldColor with newColor
    var visited = new Array(COLS * ROWS).fill(false);
    var q = [0];
    visited[0] = true;
    grid[0] = newColor;
    while (q.length > 0) {
      var idx = q.shift();
      var r = Math.floor(idx / COLS);
      var c = idx % COLS;
      var neighbors = [];
      if (r > 0) neighbors.push((r - 1) * COLS + c);
      if (r < ROWS - 1) neighbors.push((r + 1) * COLS + c);
      if (c > 0) neighbors.push(r * COLS + (c - 1));
      if (c < COLS - 1) neighbors.push(r * COLS + (c + 1));
      for (var ni = 0; ni < neighbors.length; ni++) {
        var nidx = neighbors[ni];
        if (!visited[nidx] && grid[nidx] === oldColor) {
          visited[nidx] = true;
          grid[nidx] = newColor;
          q.push(nidx);
        }
      }
    }
  }

  function checkWin() {
    for (var i = 0; i < grid.length; i++) {
      if (grid[i] !== floodColor) return false;
    }
    return true;
  }

  var BTN_Y = GY + GH + 80;
  var BTN_W = 140;
  var BTN_H = 100;
  var BTN_GAP = 28;
  var BTN_TOTAL_W = COLORS.length * BTN_W + (COLORS.length - 1) * BTN_GAP;
  var BTN_X = (W - BTN_TOTAL_W) / 2;

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var ci = 0; ci < COLORS.length; ci++) {
      var bx = BTN_X + ci * (BTN_W + BTN_GAP);
      if (tx >= bx && tx <= bx + BTN_W && ty >= BTN_Y && ty <= BTN_Y + BTN_H) {
        if (ci === floodColor) return;
        moves++;
        flood(ci);
        game.audio.play('se_tap', 0.4);
        if (checkWin()) {
          done = true;
          game.audio.play('se_success');
          var bonusScore = (MAX_MOVES - moves + 1) * 150 + 500;
          setTimeout(function() { game.end.success(bonusScore); }, 400);
        } else if (moves >= MAX_MOVES) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    elapsed += dt;
    if (feedback > 0) feedback -= dt;

    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx * dt; particles[pi].y += particles[pi].vy * dt;
      particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var idx = r * COLS + c;
        var cx = GX + c * (CELL + GAP);
        var cy = GY + r * (CELL + GAP);
        game.draw.rect(cx, cy, CELL, CELL, COLORS[grid[idx]], 0.9);
        // Highlight top-left flooded region subtly
        if (grid[idx] === floodColor && (r + c) % 2 === 0) {
          game.draw.rect(cx + 8, cy + 8, CELL - 16, 16, '#ffffff', 0.1);
        }
      }
    }

    // Color buttons
    for (var ci2 = 0; ci2 < COLORS.length; ci2++) {
      var bx2 = BTN_X + ci2 * (BTN_W + BTN_GAP);
      var isActive = ci2 === floodColor;
      game.draw.rect(bx2 - 4, BTN_Y - 4, BTN_W + 8, BTN_H + 8, isActive ? '#fff' : '#1a1f2e', 0.9);
      game.draw.rect(bx2, BTN_Y, BTN_W, BTN_H, COLORS[ci2], 0.9);
      if (isActive) {
        game.draw.rect(bx2, BTN_Y, BTN_W, BTN_H, '#fff', 0.2);
        game.draw.text('▲', bx2 + BTN_W / 2, BTN_Y - 24, { size: 32, color: '#fff' });
      }
    }

    var movesLeft = MAX_MOVES - moves;
    var movesColor = movesLeft <= 5 ? '#ef4444' : '#f1f5f9';
    game.draw.text('残り ' + movesLeft + ' 手', W / 2, BTN_Y + BTN_H + 60, { size: 52, color: movesColor, bold: true });
    game.draw.text('全マスを同じ色に！', W / 2, H * 0.93, { size: 38, color: C.ui });

    game.draw.rect(0, 0, W, 72, C.bg);
    var ratio = movesLeft / MAX_MOVES;
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#22c55e' : '#ef4444');
    game.draw.text(moves + ' / ' + MAX_MOVES, W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  var feedback = 0;

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initGrid();
  });
})(game);
