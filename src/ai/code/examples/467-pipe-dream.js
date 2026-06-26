// 467-pipe-dream.js
// パイプドリーム — 流れてくる水が溢れる前にパイプを繋ぐ
// 操作: タップでパイプピースを置く（ランダムに与えられるピースを配置）
// 成功: 30マス水を流す  失敗: 水が溢れる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030810',
    board:  '#0a1528',
    cell:   '#0d1e38',
    cellHi: '#162a50',
    pipe:   '#475569',
    pipeHi: '#64748b',
    water:  '#06b6d4',
    waterHi:'#22d3ee',
    waterGlo:'#cffafe',
    source: '#f97316',
    wrong:  '#ef4444',
    correct:'#22c55e',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var GRID = 7;
  var CELL = 120;
  var OX = (W - GRID * CELL) / 2;
  var OY = (H - GRID * CELL) / 2 - 60;

  // Pipe types: 0=empty, 1=H, 2=V, 3=corner-TR, 4=corner-TL, 5=corner-BL, 6=corner-BR
  // Connections per type
  var PIPE_CONN = [
    [],                         // 0: empty
    ['left','right'],           // 1: H
    ['up','down'],              // 2: V
    ['up','right'],             // 3: corner TR
    ['up','left'],              // 4: corner TL
    ['down','left'],            // 5: corner BL
    ['down','right']            // 6: corner BR
  ];
  var PIPE_SHAPES = [1,2,3,4,5,6];

  var grid = [];
  var waterCells = [];
  var waterTimer = 0;
  var WATER_SPEED = 0.6;
  var sourceX = 0;
  var sourceY = 3;
  var nextPiece = 0;
  var queue = [];
  var flowed = 0;
  var NEEDED = 30;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var particles = [];

  function initGrid() {
    grid = [];
    for (var r = 0; r < GRID; r++) {
      grid.push([]);
      for (var c = 0; c < GRID; c++) {
        grid[r].push(0);
      }
    }
    // Place source
    sourceX = 0;
    sourceY = Math.floor(GRID / 2);
    grid[sourceY][sourceX] = 1;  // H pipe at source
    waterCells = [{ x: sourceX, y: sourceY, from: 'left' }];
    waterTimer = 0;
    queue = [];
    for (var qi = 0; qi < 3; qi++) {
      queue.push(PIPE_SHAPES[Math.floor(Math.random() * PIPE_SHAPES.length)]);
    }
    nextPiece = queue.shift();
    flowed = 0;
  }

  function canConnect(type, dir) {
    return PIPE_CONN[type].indexOf(dir) >= 0;
  }

  function oppositeDir(dir) {
    if (dir === 'left') return 'right';
    if (dir === 'right') return 'left';
    if (dir === 'up') return 'down';
    if (dir === 'down') return 'up';
    return '';
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    if (col === sourceX && row === sourceY) return;

    grid[row][col] = nextPiece;
    nextPiece = queue.shift() || PIPE_SHAPES[Math.floor(Math.random() * PIPE_SHAPES.length)];
    queue.push(PIPE_SHAPES[Math.floor(Math.random() * PIPE_SHAPES.length)]);
    game.audio.play('se_tap', 0.3);
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

    // Advance water
    waterTimer += dt;
    if (waterTimer >= WATER_SPEED) {
      waterTimer -= WATER_SPEED;
      var front = waterCells[waterCells.length - 1];
      var dirs = PIPE_CONN[grid[front.y][front.x]] || [];
      var moved = false;
      for (var di = 0; di < dirs.length; di++) {
        var dir = dirs[di];
        if (dir === front.from) continue;  // don't go back
        var nx = front.x + (dir === 'right' ? 1 : dir === 'left' ? -1 : 0);
        var ny = front.y + (dir === 'down' ? 1 : dir === 'up' ? -1 : 0);
        if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
          // Fell off edge
          if (nx >= GRID) {
            // Finished!
            flowed++;
            game.audio.play('se_tap', 0.3);
            flashAnim = 0.3;
            if (flowed >= NEEDED && !done) {
              done = true;
              game.audio.play('se_success', 0.8);
              setTimeout(function() { game.end.success(flowed * 100 + Math.ceil(timeLeft) * 80); }, 700);
            } else {
              initGrid();
            }
          } else {
            done = true;
            game.audio.play('se_failure', 0.6);
            setTimeout(function() { game.end.failure(); }, 500);
          }
          return;
        }
        var opp = oppositeDir(dir);
        if (canConnect(grid[ny][nx], opp)) {
          waterCells.push({ x: nx, y: ny, from: opp });
          flowed++;
          moved = true;

          for (var pi = 0; pi < 3; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: OX + nx*CELL+CELL/2, y: OY + ny*CELL+CELL/2, vx: Math.cos(ang)*60, vy: Math.sin(ang)*60, life: 0.3, col: C.waterGlo });
          }
          if (flowed >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.8);
            setTimeout(function() { game.end.success(flowed * 100 + Math.ceil(timeLeft) * 80); }, 700);
            return;
          }
          break;
        } else {
          // No valid pipe! Water overflows
          done = true;
          game.audio.play('se_failure', 0.6);
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
      }
      if (!moved && dirs.length > 0) {
        // Dead end
        done = true;
        game.audio.play('se_failure', 0.6);
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(OX - 8, OY - 8, GRID*CELL+16, GRID*CELL+16, C.board, 0.8);

    // Grid cells
    for (var r2 = 0; r2 < GRID; r2++) {
      for (var c2 = 0; c2 < GRID; c2++) {
        var cx = OX + c2*CELL + CELL/2;
        var cy = OY + r2*CELL + CELL/2;
        game.draw.rect(OX + c2*CELL+3, OY + r2*CELL+3, CELL-6, CELL-6, C.cell, 0.7);

        var pType = grid[r2][c2];
        if (pType === 0) continue;

        // Check if water filled
        var isWater = waterCells.some(function(wc) { return wc.x === c2 && wc.y === r2; });
        var pCol = isWater ? C.water : C.pipe;
        var pAlpha = isWater ? 0.9 : 0.6;

        var conn2 = PIPE_CONN[pType];
        if (conn2.indexOf('left') >= 0) game.draw.rect(cx - CELL/2, cy - 10, CELL/2, 20, pCol, pAlpha);
        if (conn2.indexOf('right') >= 0) game.draw.rect(cx, cy - 10, CELL/2, 20, pCol, pAlpha);
        if (conn2.indexOf('up') >= 0) game.draw.rect(cx - 10, cy - CELL/2, 20, CELL/2, pCol, pAlpha);
        if (conn2.indexOf('down') >= 0) game.draw.rect(cx - 10, cy, 20, CELL/2, pCol, pAlpha);
        game.draw.circle(cx, cy, 16, pCol, pAlpha);
        if (isWater) game.draw.circle(cx, cy, 9, C.waterHi, 0.8);
      }
    }

    // Source marker
    var scx = OX + sourceX*CELL + CELL/2;
    var scy = OY + sourceY*CELL + CELL/2;
    game.draw.circle(scx, scy, 24, C.source, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.water, flashAnim * 0.1);

    // Next piece preview
    var pxPreview = W - 120;
    var pyPreview = H * 0.72;
    game.draw.rect(pxPreview - 50, pyPreview - 50, 100, 100, C.cellHi, 0.6);
    var nc = PIPE_CONN[nextPiece] || [];
    var ncol = C.pipeHi;
    if (nc.indexOf('left') >= 0) game.draw.rect(pxPreview - 50, pyPreview - 10, 50, 20, ncol, 0.8);
    if (nc.indexOf('right') >= 0) game.draw.rect(pxPreview, pyPreview - 10, 50, 20, ncol, 0.8);
    if (nc.indexOf('up') >= 0) game.draw.rect(pxPreview - 10, pyPreview - 50, 20, 50, ncol, 0.8);
    if (nc.indexOf('down') >= 0) game.draw.rect(pxPreview - 10, pyPreview, 20, 50, ncol, 0.8);
    game.draw.text('次', pxPreview, pyPreview + 80, { size: 32, color: C.ui });

    game.draw.text('流れ: ' + flowed + '/' + NEEDED, W/2, H*0.87, { size: 40, color: C.water, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.water : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    initGrid();
  });
})(game);
