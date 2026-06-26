// 556-forest-fire.js
// フォレストファイア — 燃え広がる火をタップで水をかけて消火する
// 操作: タップで消火（タップした場所が冷却される）
// 成功: 30秒間森林30%以上を守る  失敗: 森林が20%未満に

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a1a08',
    tree:    '#1a5c14',
    treeHi:  '#2a8c20',
    fire0:   '#ff2200',
    fire1:   '#ff6600',
    fire2:   '#ffaa00',
    ember:   '#ff440088',
    ash:     '#222222',
    water:   '#4488ff',
    waterHi: '#88aaff',
    sky:     '#0a1428',
    text:    '#f1f5f9',
    ui:      '#334422',
    safe:    '#22c55e'
  };

  var COLS = 12, ROWS = 16;
  var CELL = Math.floor(W / COLS);
  var OY = H * 0.1;
  var GRID_H = ROWS * CELL;

  var grid = []; // 0=empty, 1=tree, 2=burning, 3=ash, 4=wet
  var fireParticles = [];
  var treeCount = 0;
  var initialTreeCount = 0;
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var nextSpread = 0.4;
  var waterAnims = [];
  var survivalPct = 100;

  function initGrid() {
    grid = [];
    treeCount = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var isTree = Math.random() < 0.75;
        grid.push(isTree ? 1 : 0);
        if (isTree) treeCount++;
      }
    }
    initialTreeCount = treeCount;
    // Start fires at random spots
    for (var fi = 0; fi < 3; fi++) {
      var idx;
      do { idx = Math.floor(Math.random() * grid.length); } while (grid[idx] !== 1);
      grid[idx] = 2;
      treeCount--;
    }
  }

  function getIdx(c, r) { return r * COLS + c; }

  function spreadFire() {
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    var newFires = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[getIdx(c, r)] !== 2) continue;
        for (var di = 0; di < dirs.length; di++) {
          var nc = c + dirs[di][0], nr = r + dirs[di][1];
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
          var nidx = getIdx(nc, nr);
          if (grid[nidx] === 1 && Math.random() < 0.25) {
            newFires.push(nidx);
          }
        }
        // Burn out
        if (Math.random() < 0.08) {
          newFires.push(-getIdx(c, r) - 1); // negative = ash
        }
      }
    }
    for (var ni = 0; ni < newFires.length; ni++) {
      if (newFires[ni] < 0) {
        var ashIdx = -newFires[ni] - 1;
        if (grid[ashIdx] === 2) grid[ashIdx] = 3;
      } else {
        if (grid[newFires[ni]] === 1) {
          grid[newFires[ni]] = 2;
          treeCount--;
          // Fire particles
          var fr = Math.floor(newFires[ni] / COLS);
          var fc = newFires[ni] % COLS;
          fireParticles.push({ x: fc * CELL + CELL / 2, y: OY + fr * CELL + CELL / 2, t: 0.3 });
        }
      }
    }

    // Wet cells dry out slightly
    for (var wi = 0; wi < grid.length; wi++) {
      if (grid[wi] === 4 && Math.random() < 0.05) grid[wi] = 1;
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var c = Math.floor(tx / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;

    // Extinguish 3x3 area
    for (var dc = -1; dc <= 1; dc++) {
      for (var dr = -1; dr <= 1; dr++) {
        var nc = c + dc, nr = r + dr;
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
        var nidx = getIdx(nc, nr);
        if (grid[nidx] === 2) {
          grid[nidx] = 4; // wet (fire extinguished)
          treeCount++;
        } else if (grid[nidx] === 1) {
          grid[nidx] = 4; // pre-wet
        }
      }
    }
    game.audio.play('se_tap', 0.4);

    waterAnims.push({ x: tx, y: ty, t: 0.4 });
    for (var pi = 0; pi < 6; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: tx, y: ty, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160 - 60, life: 0.4, col: C.waterHi });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        survivalPct = Math.round(treeCount / initialTreeCount * 100);
        if (survivalPct >= 30) {
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(survivalPct * 100 + Math.ceil(elapsed) * 50); }, 700);
        } else {
          game.audio.play('se_failure', 0.6);
          setTimeout(function() { game.end.failure(); }, 500);
        }
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;

    nextSpread -= dt;
    if (nextSpread <= 0) {
      spreadFire();
      nextSpread = 0.35;
      survivalPct = Math.round(treeCount / initialTreeCount * 100);
      if (survivalPct < 20 && !done) {
        done = true;
        game.audio.play('se_failure', 0.6);
        flashAnim = 0.8;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }

    for (var fpi = fireParticles.length - 1; fpi >= 0; fpi--) {
      fireParticles[fpi].t -= dt * 2;
      if (fireParticles[fpi].t <= 0) fireParticles.splice(fpi, 1);
    }
    for (var wai = waterAnims.length - 1; wai >= 0; wai--) {
      waterAnims[wai].t -= dt * 2.5;
      if (waterAnims[wai].t <= 0) waterAnims.splice(wai, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.sky);
    game.draw.rect(0, OY, W, GRID_H, C.bg, 0.9);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var idx = getIdx(c, r);
        var gx = c * CELL, gy = OY + r * CELL;
        var v = grid[idx];
        if (v === 1) {
          // Tree
          game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, C.tree, 0.9);
          game.draw.circle(gx + CELL / 2, gy + CELL / 2, CELL * 0.3, C.treeHi, 0.5);
        } else if (v === 2) {
          // Fire
          game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.fire0, 0.9);
          var pulse = Math.sin(elapsed * 8 + c * 0.7 + r * 0.9);
          game.draw.rect(gx + 6, gy + 6, CELL - 12, CELL - 12, C.fire1, 0.7);
          if (pulse > 0) game.draw.circle(gx + CELL / 2, gy + CELL / 2, CELL * 0.4 * pulse, C.fire2, 0.5);
        } else if (v === 3) {
          // Ash
          game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, C.ash, 0.8);
        } else if (v === 4) {
          // Wet
          game.draw.rect(gx + 4, gy + 4, CELL - 8, CELL - 8, C.water, 0.4);
          game.draw.circle(gx + CELL / 2, gy + CELL / 2, CELL * 0.25, C.waterHi, 0.5);
        }
      }
    }

    // Water animations
    for (var wai2 = 0; wai2 < waterAnims.length; wai2++) {
      var wa = waterAnims[wai2];
      game.draw.circle(wa.x, wa.y, 100 * wa.t, C.water, wa.t * 0.3);
      game.draw.circle(wa.x, wa.y, 60 * wa.t, C.waterHi, wa.t * 0.4);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.fire0, flashAnim * 0.15);

    // Survival %
    var pct = Math.round(treeCount / initialTreeCount * 100);
    var pctCol = pct >= 50 ? C.safe : pct >= 30 ? C.fire2 : C.fire0;
    game.draw.text('森林残存: ' + pct + '%', W / 2, OY + GRID_H + 60, { size: 48, color: pctCol, bold: true });

    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.safe : C.fire0);
    game.draw.text(Math.ceil(timeLeft) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    initGrid();
  });
})(game);
