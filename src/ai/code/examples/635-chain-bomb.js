// 635-chain-bomb.js
// チェーンボム — 爆弾が連鎖するよう配置し、最大の爆発を起こせ
// 操作: タップで爆弾を配置、スワイプで起爆
// 成功: チェーン10以上の爆発  失敗: 5回失敗 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0500',
    bomb:    '#1f2937',
    bombHi:  '#374151',
    fuse:    '#fbbf24',
    explode: '#f97316',
    explodeHi:'#fed7aa',
    chain:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#1c0a00',
    safe:    '#22c55e',
    grid:    '#1a1000'
  };

  var COLS = 7, ROWS = 10;
  var CELL_W = W / COLS;
  var CELL_H = (H * 0.78) / ROWS;
  var GRID_Y = H * 0.14;
  var CHAIN_R = CELL_W * 1.8; // explosion chain radius

  var grid = []; // null or {type: 'bomb', exploding: false, explodeTimer: 0}
  for (var r = 0; r < ROWS; r++) {
    grid.push([]);
    for (var c = 0; c < COLS; c++) {
      grid[r].push(null);
    }
  }

  // Pre-place some fixed bombs on the field
  function placedBombs() {
    var count = 0;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c]) count++;
    return count;
  }

  var playerBombs = 5; // bombs player can place
  var phase = 'place'; // 'place' or 'exploding'
  var explosions = []; // {x,y,r,life,chain}
  var chainCount = 0;
  var maxChain = 0;
  var attempts = 0;
  var NEEDED_CHAIN = 10;
  var MAX_ATTEMPTS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var explodeQueue = []; // [{r,c,delay}]
  var explodeTimer = 0;

  function resetRound() {
    // Clear grid
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) grid[r][c] = null;
    explosions = [];
    explodeQueue = [];
    chainCount = 0;
    phase = 'place';
    playerBombs = 5;

    // Place 20 fixed bombs randomly
    var placed = 0;
    while (placed < 20) {
      var r2 = Math.floor(Math.random() * ROWS);
      var c2 = Math.floor(Math.random() * COLS);
      if (!grid[r2][c2]) {
        grid[r2][c2] = { type: 'bomb', exploding: false, explodeTimer: 0 };
        placed++;
      }
    }
  }

  function triggerExplosion(row, col, chainDepth) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
    if (!grid[row][col] || grid[row][col].exploding) return;
    grid[row][col].exploding = true;
    chainCount++;
    if (chainCount > maxChain) maxChain = chainCount;

    var cx = col * CELL_W + CELL_W / 2;
    var cy = GRID_Y + row * CELL_H + CELL_H / 2;
    explosions.push({ x: cx, y: cy, r: 0, maxR: CHAIN_R, life: 1, chainDepth: chainDepth });

    // Queue adjacent bombs for chain explosion with delay
    var delay = 0.12;
    [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(function(d) {
      var nr = row + d[0], nc = col + d[1];
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc] && !grid[nr][nc].exploding) {
        var nCx = nc * CELL_W + CELL_W / 2;
        var nCy = GRID_Y + nr * CELL_H + CELL_H / 2;
        var dx = nCx - cx, dy2 = nCy - cy;
        var dist = Math.sqrt(dx * dx + dy2 * dy2);
        if (dist <= CHAIN_R) {
          explodeQueue.push({ r: nr, c: nc, delay: delay, chainDepth: chainDepth + 1 });
          delay += 0.06;
        }
      }
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'place') {
      if (ty < GRID_Y || ty > GRID_Y + ROWS * CELL_H) return;
      var col = Math.floor(tx / CELL_W);
      var row = Math.floor((ty - GRID_Y) / CELL_H);
      if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;
      if (grid[row][col]) {
        // Remove bomb
        grid[row][col] = null;
        playerBombs++;
      } else if (playerBombs > 0) {
        // Place bomb
        grid[row][col] = { type: 'bomb', exploding: false, explodeTimer: 0 };
        playerBombs--;
        game.audio.play('se_tap', 0.15);
      }
    }
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (phase === 'place' && dir === 'up') {
      // Detonate!
      phase = 'exploding';
      chainCount = 0;
      // Find first player-placed bomb or just pick first bomb
      var fired = false;
      outer: for (var r = ROWS - 1; r >= 0; r--) {
        for (var c = 0; c < COLS; c++) {
          if (grid[r][c] && !grid[r][c].exploding) {
            triggerExplosion(r, c, 0);
            fired = true;
            break outer;
          }
        }
      }
      if (!fired) {
        phase = 'place';
      }
      game.audio.play('se_success', 0.3);
    }
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

    // Process explosion queue
    if (phase === 'exploding') {
      explodeTimer += dt;
      for (var qi = explodeQueue.length - 1; qi >= 0; qi--) {
        var q = explodeQueue[qi];
        q.delay -= dt;
        if (q.delay <= 0) {
          triggerExplosion(q.r, q.c, q.chainDepth);
          explodeQueue.splice(qi, 1);
        }
      }

      // Update explosions
      for (var ei = explosions.length - 1; ei >= 0; ei--) {
        var ex = explosions[ei];
        ex.r += ex.maxR * dt * 4;
        ex.life -= dt * 2;
        if (ex.life <= 0) explosions.splice(ei, 1);
      }

      // Check if all done
      if (explodeQueue.length === 0 && explosions.length === 0) {
        // Result
        if (chainCount >= NEEDED_CHAIN) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(chainCount * 150 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          attempts++;
          game.audio.play('se_failure', 0.3);
          if (attempts >= MAX_ATTEMPTS) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else {
            setTimeout(resetRound, 800);
          }
        }
      }
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var gx = c2 * CELL_W, gy = GRID_Y + r2 * CELL_H;
        game.draw.rect(gx + 2, gy + 2, CELL_W - 4, CELL_H - 4, C.grid, 0.4);
        var cell = grid[r2][c2];
        if (cell && !cell.exploding) {
          var bx = gx + CELL_W / 2, by = gy + CELL_H / 2;
          game.draw.circle(bx + 3, by + 3, CELL_W * 0.3, '#000', 0.3);
          game.draw.circle(bx, by, CELL_W * 0.3, C.bomb, 0.95);
          game.draw.circle(bx - 4, by - 4, CELL_W * 0.1, C.bombHi, 0.5);
          // Fuse
          game.draw.line(bx, by - CELL_H * 0.3, bx + 8, by - CELL_H * 0.42, C.fuse, 3);
        }
      }
    }

    // Explosions
    for (var ei2 = 0; ei2 < explosions.length; ei2++) {
      var ex2 = explosions[ei2];
      game.draw.circle(ex2.x, ex2.y, ex2.r, C.explode, ex2.life * 0.5);
      game.draw.circle(ex2.x, ex2.y, ex2.r * 0.5, C.explodeHi, ex2.life * 0.7);
    }

    // UI
    if (phase === 'place') {
      game.draw.text('爆弾: ' + playerBombs + '  タップで配置', W / 2, H * 0.88, { size: 36, color: C.fuse });
      game.draw.text('↑スワイプで起爆', W / 2, H * 0.93, { size: 36, color: C.explode, bold: true });
    } else {
      game.draw.text('チェーン: ' + chainCount, W / 2, H * 0.88, { size: 52, color: C.chain, bold: true });
      game.draw.text('目標: ' + NEEDED_CHAIN + '以上', W / 2, H * 0.93, { size: 36, color: C.explodeHi });
    }

    // Attempts dots
    for (var ai = 0; ai < MAX_ATTEMPTS; ai++) {
      game.draw.circle(W / 2 - (MAX_ATTEMPTS - 1) * 44 + ai * 88, H * 0.965, 18, ai < attempts ? C.chain : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.fuse : C.chain);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    resetRound();
  });
})(game);
