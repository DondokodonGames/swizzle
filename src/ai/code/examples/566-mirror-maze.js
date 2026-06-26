// 566-mirror-maze.js
// ミラーメイズ — 鏡に反射したレーザーの先を読んでゴールを当てる
// 操作: タップでゴールセルを選ぶ
// 成功: 10問正解  失敗: 6問不正解 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060c',
    cell:    '#0a1020',
    mirror:  '#88bbff',
    mirrorHi:'#ccddff',
    laser:   '#ff6600',
    laserHi: '#ffaa44',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    wrong:   '#ef4444',
    correct: '#22c55e',
    text:    '#f1f5f9',
    ui:      '#334455',
    border:  '#223344'
  };

  var GRID = 5;
  var CELL = 160;
  var OX = (W - GRID * CELL) / 2;
  var OY = H * 0.2;

  var mirrors = []; // {r, c, dir} dir: '/' or '\'
  var laserStart = { r: 0, c: 0, dir: 'right' }; // entry direction
  var laserPath = [];
  var goalCell = { r: 0, c: 0 };
  var selectedCell = -1;
  var correctCount = 0;
  var NEEDED = 10;
  var wrongCount = 0;
  var MAX_WRONG = 6;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0;
  var showPath = false; // reveal after answer

  function traceLaser() {
    var path = [];
    var r = laserStart.r;
    var c = laserStart.c;
    var dr = 0, dc = 0;
    if (laserStart.dir === 'right') { dr = 0; dc = 1; }
    else if (laserStart.dir === 'down') { dr = 1; dc = 0; }
    else if (laserStart.dir === 'left') { dr = 0; dc = -1; }
    else { dr = -1; dc = 0; }

    var steps = 0;
    while (steps < GRID * GRID * 4) {
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) break;
      path.push({ r: r, c: c });
      // Check for mirror
      var mir = null;
      for (var mi = 0; mi < mirrors.length; mi++) {
        if (mirrors[mi].r === r && mirrors[mi].c === c) {
          mir = mirrors[mi];
          break;
        }
      }
      if (mir) {
        if (mir.dir === '/') {
          var tmp = dr; dr = -dc; dc = -tmp;
        } else { // '\'
          var tmp2 = dr; dr = dc; dc = tmp2;
        }
      }
      r += dr;
      c += dc;
      steps++;
    }
    return { path: path, exitR: r, exitC: c };
  }

  function generatePuzzle() {
    // Place random mirrors
    mirrors = [];
    var cells = [];
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        cells.push({ r: r, c: c });
      }
    }
    // Shuffle and pick some
    for (var i = cells.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = cells[i]; cells[i] = cells[j]; cells[j] = tmp;
    }
    var numMirrors = 3 + Math.floor(Math.random() * 4);
    for (var mi = 0; mi < numMirrors; mi++) {
      mirrors.push({ r: cells[mi].r, c: cells[mi].c, dir: Math.random() < 0.5 ? '/' : '\\' });
    }

    // Set laser entry
    var side = Math.floor(Math.random() * 4);
    if (side === 0) { laserStart = { r: 0, c: Math.floor(Math.random() * GRID), dir: 'down', entryR: -1, entryC: Math.floor(Math.random() * GRID) }; laserStart.entryC = laserStart.c; laserStart.entryR = -1; }
    else if (side === 1) { laserStart = { r: Math.floor(Math.random() * GRID), c: GRID - 1, dir: 'left', entryR: laserStart.r || Math.floor(Math.random() * GRID), entryC: GRID }; laserStart.entryR = laserStart.r; }
    else if (side === 2) { laserStart = { r: GRID - 1, c: Math.floor(Math.random() * GRID), dir: 'up' }; laserStart.entryR = GRID; laserStart.entryC = laserStart.c; }
    else { laserStart = { r: Math.floor(Math.random() * GRID), c: 0, dir: 'right' }; laserStart.entryR = laserStart.r; laserStart.entryC = -1; }

    var result = traceLaser();
    laserPath = result.path;

    // Goal is the LAST cell in the path
    if (laserPath.length > 0) {
      var last = laserPath[laserPath.length - 1];
      goalCell = { r: last.r, c: last.c };
    }

    selectedCell = -1;
    showPath = false;
  }

  function cellIndex(r, c) { return r * GRID + c; }

  game.onTap(function(tx, ty) {
    if (done || resultTimer > 0) return;
    var c = Math.floor((tx - OX) / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (c < 0 || c >= GRID || r < 0 || r >= GRID) return;

    selectedCell = cellIndex(r, c);
    var correct = (r === goalCell.r && c === goalCell.c);
    showPath = true;
    if (correct) {
      correctCount++;
      flashCol = C.correct;
      flashAnim = 0.4;
      resultTimer = 1.0;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        var gx = OX + goalCell.c * CELL + CELL / 2;
        var gy = OY + goalCell.r * CELL + CELL / 2;
        particles.push({ x: gx, y: gy, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.goalHi });
      }
      if (correctCount >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(correctCount * 600 + Math.ceil(timeLeft) * 80); }, 700);
      } else {
        setTimeout(function() { if (!done) generatePuzzle(); }, 1100);
      }
    } else {
      wrongCount++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultTimer = 1.0;
      game.audio.play('se_failure', 0.4);
      if (wrongCount >= MAX_WRONG && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 700);
      } else {
        setTimeout(function() { if (!done) generatePuzzle(); }, 1100);
      }
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid cells
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cx = OX + c * CELL;
        var cy = OY + r * CELL;
        game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, C.cell, 0.9);
        game.draw.line(cx, cy, cx + CELL, cy, C.border, 2);
        game.draw.line(cx, cy, cx, cy + CELL, C.border, 2);
      }
    }

    // Laser path (only shown after answering)
    if (showPath) {
      for (var lp = 0; lp < laserPath.length; lp++) {
        var lc = laserPath[lp].c, lr = laserPath[lp].r;
        var lcx = OX + lc * CELL + CELL / 2;
        var lcy = OY + lr * CELL + CELL / 2;
        game.draw.rect(OX + lc * CELL + 8, OY + lr * CELL + 8, CELL - 16, CELL - 16, C.laser, 0.15 + (lp / laserPath.length) * 0.2);
        if (lp > 0) {
          var prev = laserPath[lp - 1];
          game.draw.line(OX + prev.c * CELL + CELL / 2, OY + prev.r * CELL + CELL / 2, lcx, lcy, C.laser, 6);
        }
      }
    }

    // Entry arrow
    var ex = OX + laserStart.entryC * CELL + CELL / 2;
    var ey = OY + laserStart.entryR * CELL + CELL / 2;
    game.draw.circle(ex, ey, 30, C.laserHi, 0.3 + Math.sin(elapsed * 4) * 0.1);
    game.draw.text('▶', ex, ey + 14, { size: 36, color: C.laserHi });

    // Mirrors
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m = mirrors[mi];
      var mcx = OX + m.c * CELL;
      var mcy = OY + m.r * CELL;
      var mx1, my1, mx2, my2;
      if (m.dir === '/') {
        mx1 = mcx + 24; my1 = mcy + CELL - 24;
        mx2 = mcx + CELL - 24; my2 = mcy + 24;
      } else {
        mx1 = mcx + 24; my1 = mcy + 24;
        mx2 = mcx + CELL - 24; my2 = mcy + CELL - 24;
      }
      game.draw.line(mx1, my1, mx2, my2, C.mirrorHi, 8);
      game.draw.line(mx1 + 4, my1 - 4, mx2 + 4, my2 - 4, C.mirror, 3);
    }

    // Selected cell
    if (selectedCell >= 0 && resultTimer > 0) {
      var sc = selectedCell % GRID, sr = Math.floor(selectedCell / GRID);
      var scx = OX + sc * CELL, scy = OY + sr * CELL;
      var isCorrect = (sr === goalCell.r && sc === goalCell.c);
      game.draw.rect(scx + 2, scy + 2, CELL - 4, CELL - 4, isCorrect ? C.correct : C.wrong, 0.4);
    }

    // Goal marker (only after reveal)
    if (showPath) {
      var gcx = OX + goalCell.c * CELL + CELL / 2;
      var gcy = OY + goalCell.r * CELL + CELL / 2;
      game.draw.circle(gcx, gcy, 40, C.goal, 0.5);
      game.draw.text('●', gcx, gcy + 14, { size: 44, color: C.goalHi });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Instruction
    if (!showPath) {
      game.draw.text('レーザーの出口は?', W / 2, OY - 60, { size: 40, color: C.laserHi });
    }

    // Fail dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 50 + wi * 100, H * 0.955, 20, wi < wrongCount ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correctCount + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.mirror : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    generatePuzzle();
  });
})(game);
