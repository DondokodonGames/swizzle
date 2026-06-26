// 479-crystal-growth.js
// 結晶成長 — タップした方向に結晶を伸ばして宝石を取り込む
// 操作: スワイプで結晶を成長させる方向を指定
// 成功: 15個の宝石を取り込む  失敗: 10ターン以内に取り込めず or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#010614',
    crystal:'#7c3aed',
    crystalHi:'#a78bfa',
    crystalGlo:'#4c1d95',
    gem0:   '#ef4444',
    gem1:   '#f59e0b',
    gem2:   '#22c55e',
    gem3:   '#06b6d4',
    gem4:   '#ec4899',
    blocked:'#374151',
    text:   '#f1f5f9',
    ui:     '#4b5563',
    wrong:  '#ef4444'
  };

  var CELL = 110;
  var COLS = 9;
  var ROWS = 14;
  var OX = (W - COLS * CELL) / 2;
  var OY = H * 0.08;

  var GEM_COLORS = [C.gem0, C.gem1, C.gem2, C.gem3, C.gem4];

  // Grid: 0=empty, 1=crystal, 2=gem, 3=blocked
  var grid = [];
  var gems = []; // {col, row, col2}
  var crystalCells = []; // {col, row}

  var collected = 0;
  var NEEDED = 15;
  var moves = 0;
  var MAX_MOVES = 30;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var lastDir = '';

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push([]);
      for (var c = 0; c < COLS; c++) {
        grid[r].push(0);
      }
    }

    // Place crystal seed at center
    var seedC = Math.floor(COLS / 2);
    var seedR = Math.floor(ROWS / 2);
    grid[seedR][seedC] = 1;
    crystalCells = [{ col: seedC, row: seedR }];

    // Place some blocked cells
    for (var bi = 0; bi < 12; bi++) {
      var bc = Math.floor(Math.random() * COLS);
      var br = Math.floor(Math.random() * ROWS);
      if (grid[br][bc] === 0) {
        grid[br][bc] = 3;
      }
    }

    // Place gems
    gems = [];
    for (var gi = 0; gi < 20; gi++) {
      var gc = Math.floor(Math.random() * COLS);
      var gr = Math.floor(Math.random() * ROWS);
      if (grid[gr][gc] === 0) {
        var gemCol = GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)];
        grid[gr][gc] = 2;
        gems.push({ col: gc, row: gr, col2: gemCol });
      }
    }
  }

  function grow(dir) {
    if (done) return;
    moves++;
    lastDir = dir;

    var dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    var dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;

    var newCells = [];
    var collectedThis = 0;

    for (var ci = 0; ci < crystalCells.length; ci++) {
      var cell = crystalCells[ci];
      var nc = cell.col + dc;
      var nr = cell.row + dr;
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
      if (grid[nr][nc] === 0 || grid[nr][nc] === 2) {
        if (grid[nr][nc] === 2) {
          // Collect gem
          for (var gi2 = gems.length - 1; gi2 >= 0; gi2--) {
            if (gems[gi2].col === nc && gems[gi2].row === nr) {
              var gx = OX + nc * CELL + CELL / 2;
              var gy = OY + nr * CELL + CELL / 2;
              for (var pi = 0; pi < 8; pi++) {
                var ang = Math.random() * Math.PI * 2;
                particles.push({ x: gx, y: gy, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.6, col: gems[gi2].col2 });
              }
              gems.splice(gi2, 1);
              collectedThis++;
              break;
            }
          }
        }
        if (grid[nr][nc] !== 1) {
          grid[nr][nc] = 1;
          newCells.push({ col: nc, row: nr });
        }
      }
    }

    collected += collectedThis;
    crystalCells = crystalCells.concat(newCells);

    if (collectedThis > 0) {
      game.audio.play('se_tap', 0.5 + collectedThis * 0.1);
      flashAnim = 0.4;
    } else {
      game.audio.play('se_tap', 0.2);
    }

    if (collected >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(collected * 300 + Math.ceil(timeLeft) * 80); }, 700);
      return;
    }

    if (moves >= MAX_MOVES && !done) {
      done = true;
      game.audio.play('se_failure', 0.6);
      setTimeout(function() { game.end.failure(); }, 500);
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    grow(dir);
  });

  game.onTap(function(tx, ty) {
    // No-op (swipe is main input)
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

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid cells
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var cx2 = OX + c2 * CELL + CELL / 2;
        var cy2 = OY + r2 * CELL + CELL / 2;
        var val = grid[r2][c2];

        if (val === 1) {
          // Crystal
          var glow = Math.sin(elapsed * 3 + c2 + r2) * 0.1 + 0.7;
          game.draw.rect(OX + c2 * CELL + 4, OY + r2 * CELL + 4, CELL - 8, CELL - 8, C.crystalGlo, 0.5);
          game.draw.rect(OX + c2 * CELL + 10, OY + r2 * CELL + 10, CELL - 20, CELL - 20, C.crystal, glow);
          game.draw.rect(OX + c2 * CELL + 18, OY + r2 * CELL + 18, CELL - 36, CELL - 36, C.crystalHi, 0.3);
        } else if (val === 2) {
          // Gem
          var gemObj = null;
          for (var gi3 = 0; gi3 < gems.length; gi3++) {
            if (gems[gi3].col === c2 && gems[gi3].row === r2) { gemObj = gems[gi3]; break; }
          }
          if (gemObj) {
            var pulse = Math.sin(elapsed * 4 + c2 * 0.7 + r2 * 1.3) * 8;
            game.draw.circle(cx2, cy2, 28 + pulse, gemObj.col2, 0.2);
            game.draw.circle(cx2, cy2, 22, gemObj.col2, 0.9);
            game.draw.circle(cx2 - 6, cy2 - 6, 8, '#fff', 0.4);
          }
        } else if (val === 3) {
          // Blocked
          game.draw.rect(OX + c2 * CELL + 8, OY + r2 * CELL + 8, CELL - 16, CELL - 16, C.blocked, 0.7);
        } else {
          // Empty
          game.draw.rect(OX + c2 * CELL + 2, OY + r2 * CELL + 2, CELL - 4, CELL - 4, '#0a0c1a', 0.5);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.crystalHi, flashAnim * 0.1);

    // UI
    game.draw.text(collected + ' / ' + NEEDED, W / 2, H * 0.86, { size: 56, color: C.crystalHi, bold: true });
    game.draw.text('残' + (MAX_MOVES - moves) + '手', W * 0.75, H * 0.86, { size: 44, color: moves > MAX_MOVES * 0.7 ? C.wrong : C.ui });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.crystal : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    initGrid();
  });
})(game);
