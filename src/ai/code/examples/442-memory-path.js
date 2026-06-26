// 442-memory-path.js
// 記憶の道 — 点滅したマスの順番を覚えてたどる
// 操作: タップで正しいマスの順にたどる
// 成功: 7ステップのパスを3回完成  失敗: 3回ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#04080a',
    grid:   '#0d1a1f',
    gridHi: '#162530',
    active: '#22d3ee',
    activeHi:'#cffafe',
    correct:'#22c55e',
    wrong:  '#ef4444',
    path:   '#0891b2',
    text:   '#f1f5f9',
    ui:     '#475569',
    flash:  '#fbbf24'
  };

  var GRID = 5;
  var CELL = 180;
  var GAP = 12;
  var OX = (W - (GRID * CELL + (GRID-1)*GAP)) / 2;
  var OY = (H - (GRID * CELL + (GRID-1)*GAP)) / 2 - 40;

  var PATH_LEN = 7;
  var path = [];
  var playerPath = [];
  var phase = 'show';  // show, input
  var showIdx = 0;
  var showTimer = 0;
  var SHOW_INTERVAL = 0.5;
  var SHOW_FLASH = 0.35;
  var cellFlash = {};  // { idx: timer }

  var solved = 0;
  var NEEDED = 3;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];

  function generatePath() {
    path = [];
    playerPath = [];
    phase = 'show';
    showIdx = 0;
    showTimer = 0.6;  // initial delay
    cellFlash = {};

    var usedCells = {};
    var cx2 = Math.floor(Math.random() * GRID);
    var cy2 = Math.floor(Math.random() * GRID);
    path.push(cy2 * GRID + cx2);
    usedCells[cy2 * GRID + cx2] = true;

    for (var s = 1; s < PATH_LEN; s++) {
      var tries = 0;
      var found = false;
      while (!found && tries < 20) {
        var dirs = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
        var dir = dirs[Math.floor(Math.random() * dirs.length)];
        var nx = cx2 + dir[0];
        var ny = cy2 + dir[1];
        var nidx = ny * GRID + nx;
        if (nx >= 0 && nx < GRID && ny >= 0 && ny < GRID && !usedCells[nidx]) {
          cx2 = nx; cy2 = ny;
          path.push(nidx);
          usedCells[nidx] = true;
          found = true;
        }
        tries++;
      }
      if (!found) break;
    }
  }

  game.onTap(function(tx, ty) {
    if (done || phase !== 'input') return;
    var col = Math.floor((tx - OX) / (CELL + GAP));
    var row = Math.floor((ty - OY) / (CELL + GAP));
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var idx = row * GRID + col;

    var expected = path[playerPath.length];
    if (idx === expected) {
      playerPath.push(idx);
      cellFlash[idx] = 0.4;
      game.audio.play('se_tap', 0.4);

      if (playerPath.length >= path.length) {
        solved++;
        flashCol = C.correct;
        flashAnim = 0.8;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: W/2, y: H/2, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200-100, life: 0.7, col: C.active });
        }
        if (solved >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(solved * 800 + Math.ceil(timeLeft) * 80); }, 700);
          return;
        }
        setTimeout(function() { generatePath(); }, 1100);
      }
    } else {
      misses++;
      cellFlash[idx] = 0.5;
      flashCol = C.wrong;
      flashAnim = 0.6;
      game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
      // Reset input
      playerPath = [];
      setTimeout(function() { generatePath(); }, 900);
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

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Show path sequence
    if (phase === 'show') {
      showTimer -= dt;
      if (showTimer <= 0) {
        if (showIdx < path.length) {
          cellFlash[path[showIdx]] = SHOW_FLASH;
          game.audio.play('se_tap', 0.2);
          showIdx++;
          showTimer = SHOW_INTERVAL;
        } else {
          // Done showing — wait then switch to input
          showTimer = 0.4;
          if (showIdx >= path.length + 1) {
            phase = 'input';
            cellFlash = {};
          }
          showIdx++;
        }
      }
    }

    // Decay cell flashes
    var keys = Object.keys(cellFlash);
    for (var ki = 0; ki < keys.length; ki++) {
      cellFlash[keys[ki]] -= dt * 4;
      if (cellFlash[keys[ki]] <= 0) delete cellFlash[keys[ki]];
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var ri = 0; ri < GRID; ri++) {
      for (var ci2 = 0; ci2 < GRID; ci2++) {
        var idx2 = ri * GRID + ci2;
        var cx3 = OX + ci2 * (CELL + GAP);
        var cy3 = OY + ri * (CELL + GAP);
        var isInPlayerPath = playerPath.indexOf(idx2) >= 0;
        var flash2 = cellFlash[idx2] || 0;
        var cellBg = isInPlayerPath ? C.path : C.grid;
        game.draw.rect(cx3, cy3, CELL, CELL, cellBg, 0.7 + flash2 * 0.3);
        if (flash2 > 0) {
          game.draw.rect(cx3, cy3, CELL, CELL, C.active, flash2 * 0.6);
          game.draw.circle(cx3 + CELL/2, cy3 + CELL/2, CELL*0.35, C.activeHi, flash2 * 0.4);
        }
        // Step number if in player path
        if (isInPlayerPath) {
          var stepNum = playerPath.indexOf(idx2) + 1;
          game.draw.text(stepNum + '', cx3 + CELL/2, cy3 + CELL/2 + 18, { size: 72, color: C.activeHi, bold: true });
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Phase label
    var phaseLabel = phase === 'show' ? '覚えて！' : '入力して！';
    var phaseClr = phase === 'show' ? C.flash : C.active;
    game.draw.text(phaseLabel, W/2, H*0.88, { size: 52, color: phaseClr, bold: true });

    if (phase === 'input') {
      game.draw.text(playerPath.length + ' / ' + path.length, W/2, H*0.92, { size: 36, color: C.ui });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(solved + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.active : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    generatePath();
  });
})(game);
