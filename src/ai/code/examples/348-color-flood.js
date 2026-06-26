// 348-color-flood.js
// カラーフラッド — 角から色を広げて全マスを同じ色に染める
// 操作: タップで色を選択して角から広げる
// 成功: 20手以内に全マス染め上げる  失敗: 20手使い切る

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0a12',
    ui:     '#475569',
    text:   '#f1f5f9',
    success:'#22c55e',
    successHi:'#86efac',
    fail:   '#ef4444'
  };

  var GRID = 8;
  var CELL = 120;
  var OX = (W - GRID * CELL) / 2;
  var OY = 280;

  var COLORS = ['#ef4444','#22c55e','#3b82f6','#f59e0b','#a855f7','#ec4899'];
  var grid = [];
  var moves = 0;
  var MAX_MOVES = 20;
  var done = false;
  var elapsed = 0;
  var particles = [];
  var floodAnim = 0;

  function initGrid() {
    grid = [];
    for (var r = 0; r < GRID; r++) {
      grid.push([]);
      for (var c = 0; c < GRID; c++) {
        grid[r].push(Math.floor(Math.random() * COLORS.length));
      }
    }
  }

  function flood(newColor) {
    var startColor = grid[0][0];
    if (newColor === startColor) return;
    var stack = [[0, 0]];
    var visited = [];
    for (var r = 0; r < GRID; r++) {
      visited.push([]);
      for (var c = 0; c < GRID; c++) visited[r].push(false);
    }
    while (stack.length > 0) {
      var cell = stack.pop();
      var cr = cell[0], cc = cell[1];
      if (cr < 0 || cr >= GRID || cc < 0 || cc >= GRID) continue;
      if (visited[cr][cc]) continue;
      if (grid[cr][cc] !== startColor) continue;
      visited[cr][cc] = true;
      grid[cr][cc] = newColor;
      stack.push([cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]);
    }
    moves++;
    floodAnim = 0.5;
    game.audio.play('se_tap', 0.3);
  }

  function allSame() {
    var col = grid[0][0];
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        if (grid[r][c] !== col) return false;
      }
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    // Color palette at bottom
    var palY = H * 0.87;
    for (var ci = 0; ci < COLORS.length; ci++) {
      var px = W * 0.1 + ci * W * 0.14;
      if (Math.hypot(tx - px, ty - palY) < 52) {
        flood(ci);
        if (allSame()) {
          done = true;
          var bonus = (MAX_MOVES - moves + 1) * 300;
          game.audio.play('se_success', 0.8);
          for (var pi = 0; pi < 15; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: W/2, y: H*0.5, vx: Math.cos(ang)*250, vy: Math.sin(ang)*250, life:0.8, col: COLORS[grid[0][0]] });
          }
          setTimeout(function() { game.end.success(bonus); }, 600);
          return;
        }
        if (moves >= MAX_MOVES && !done) {
          done = true;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    elapsed += dt;
    if (floodAnim > 0) floodAnim -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r2 = 0; r2 < GRID; r2++) {
      for (var c2 = 0; c2 < GRID; c2++) {
        var gx = OX + c2 * CELL;
        var gy = OY + r2 * CELL;
        var col = COLORS[grid[r2][c2]];
        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, col, 0.9);
        // Corner marker
        if (r2 === 0 && c2 === 0) {
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, '#fff', 0.15);
          game.draw.text('★', gx + CELL/2, gy + CELL/2 + 12, { size: 36, color: '#fff', bold: true });
        }
      }
    }

    // Flood animation flash
    if (floodAnim > 0) {
      game.draw.rect(OX, OY, GRID * CELL, GRID * CELL, '#fff', floodAnim * 0.15);
    }

    // Color palette
    var palY2 = H * 0.87;
    for (var ci2 = 0; ci2 < COLORS.length; ci2++) {
      var px2 = W * 0.1 + ci2 * W * 0.14;
      var isCurrent = grid[0][0] === ci2;
      game.draw.circle(px2, palY2, isCurrent ? 52 : 42, COLORS[ci2], isCurrent ? 0.9 : 0.7);
      if (isCurrent) {
        game.draw.circle(px2, palY2, 58, COLORS[ci2], 0.3);
        game.draw.text('◀', px2, palY2 - 80, { size: 32, color: COLORS[ci2] });
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    // Moves remaining
    var movesLeft = MAX_MOVES - moves;
    var moveColor = movesLeft > 8 ? C.successHi : (movesLeft > 4 ? '#f59e0b' : C.fail);
    game.draw.text('残り ' + movesLeft + ' 手', W / 2, H * 0.81, { size: 48, color: moveColor, bold: true });

    // Progress bar (moves)
    var ratio = Math.max(0, movesLeft / MAX_MOVES);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.successHi : C.fail);
    game.draw.text(moves + ' / ' + MAX_MOVES + ' 手', W / 2, 36, { size: 40, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    initGrid();
  });
})(game);
