// 602-river-flow.js
// リバーフロー — 川の流れを調整して水を正しいゴールへ導く
// 操作: タップで水路の方向を切り替える
// 成功: 5回正しくゴールへ誘導  失敗: 5回外れのゴールへ or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#021008',
    ground:  '#0a1a0a',
    water:   '#2288cc',
    waterHi: '#55aaee',
    channel: '#1a3a1a',
    channelHi:'#2a5a2a',
    gate:    '#885522',
    gateHi:  '#cc8844',
    goalGood:'#22c55e',
    goalBad: '#ef4444',
    goalHi:  '#ffffff',
    text:    '#f1f5f9',
    ui:      '#0a2a0a'
  };

  var COLS = 5;
  var COL_W = W / COLS;
  var ROWS = 8;
  var ROW_H = (H * 0.72) / ROWS;
  var GRID_OY = H * 0.16;

  // Gates: at each row-column junction, 0=left, 1=right
  var gates = []; // [row][col] direction: 0=left 1=right
  var waterCol = 0; // current column of water (0-indexed)
  var waterRow = 0;
  var waterY = GRID_OY;
  var waterSpeed = 200;
  var waterActive = false;
  var waterDropped = false;
  var targetGoal = -1; // which column is the correct goal
  var goals = []; // [col] = 'good' or 'bad'
  var successes = 0;
  var NEEDED = 5;
  var fails = 0;
  var MAX_FAIL = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.goalGood;
  var ripples = [];
  var waitTimer = 0;
  var waitFor = 0;

  function initPuzzle() {
    gates = [];
    for (var r = 0; r < ROWS; r++) {
      gates.push([]);
      for (var c = 0; c < COLS; c++) {
        gates[r].push(Math.random() < 0.5 ? 0 : 1);
      }
    }
    // Random target goal column
    targetGoal = Math.floor(Math.random() * COLS);
    goals = [];
    for (var i = 0; i < COLS; i++) {
      goals.push(i === targetGoal ? 'good' : 'bad');
    }

    waterCol = Math.floor(COLS / 2);
    waterRow = 0;
    waterY = GRID_OY;
    waterActive = false;
    waterDropped = false;
    waitTimer = 0;
  }

  function startDrop() {
    waterActive = true;
    waterDropped = true;
  }

  function simulatePath() {
    var col = waterCol;
    for (var r = 0; r < ROWS; r++) {
      var dir = gates[r][col];
      if (dir === 0) col = Math.max(0, col - 1);
      else col = Math.min(COLS - 1, col + 1);
    }
    return col;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (waterActive) return;

    if (ty < GRID_OY) {
      // Start drop
      startDrop();
      game.audio.play('se_tap', 0.3);
      return;
    }

    // Toggle gate
    var col = Math.floor(tx / COL_W);
    var row = Math.floor((ty - GRID_OY) / ROW_H);
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      gates[row][col] = gates[row][col] === 0 ? 1 : 0;
      game.audio.play('se_tap', 0.2);
      // Ripple effect
      ripples.push({ x: col * COL_W + COL_W / 2, y: GRID_OY + row * ROW_H + ROW_H / 2, r: 0, alpha: 0.5 });
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

    // Wait timer after result
    if (waitFor > 0) {
      waitFor -= dt;
      if (waitFor <= 0) initPuzzle();
      return;
    }

    // Water flow
    if (waterActive) {
      waterY += waterSpeed * dt;
      var targetRowY = GRID_OY + waterRow * ROW_H + ROW_H;

      if (waterY >= targetRowY && waterRow < ROWS) {
        // Apply gate
        var dir = gates[waterRow][waterCol];
        if (dir === 0) waterCol = Math.max(0, waterCol - 1);
        else waterCol = Math.min(COLS - 1, waterCol + 1);
        waterRow++;
        // Particle splash
        var wx = waterCol * COL_W + COL_W / 2;
        var wy = GRID_OY + waterRow * ROW_H;
        particles.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 80, vy: -50, life: 0.3, col: C.waterHi });
        particles.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 80, vy: -80, life: 0.25, col: C.water });
      }

      if (waterRow >= ROWS) {
        // Reached goal
        waterActive = false;
        var outcome = goals[waterCol];
        if (outcome === 'good') {
          successes++;
          flashCol = C.goalGood;
          flashAnim = 0.4;
          game.audio.play('se_success', 0.8);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: waterCol * COL_W + COL_W / 2, y: GRID_OY + ROWS * ROW_H, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150 - 100, life: 0.5, col: C.goalGood });
          }
          if (successes >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(successes * 600 + Math.ceil(timeLeft) * 100); }, 800);
          } else {
            waitFor = 1.2;
          }
        } else {
          fails++;
          flashCol = C.goalBad;
          flashAnim = 0.35;
          game.audio.play('se_failure', 0.4);
          if (fails >= MAX_FAIL && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            waitFor = 1.2;
          }
        }
      }
    }

    // Update ripples
    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      ripples[ri].r += 80 * dt;
      ripples[ri].alpha -= dt * 2.5;
      if (ripples[ri].alpha <= 0) ripples.splice(ri, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var gx = c * COL_W, gy = GRID_OY + r * ROW_H;
        game.draw.rect(gx + 3, gy + 3, COL_W - 6, ROW_H - 6, C.channel, 0.8);

        // Gate arrow
        var dir2 = gates[r][c];
        var mx = gx + COL_W / 2, my = gy + ROW_H / 2;
        var arrowX = dir2 === 0 ? -COL_W * 0.2 : COL_W * 0.2;
        game.draw.line(mx, my, mx + arrowX, my + ROW_H * 0.25, C.gateHi, 5);
        game.draw.circle(mx + arrowX, my + ROW_H * 0.25, 8, C.gate, 0.9);
      }
    }

    // Column dividers
    for (var dc = 1; dc < COLS; dc++) {
      game.draw.line(dc * COL_W, GRID_OY, dc * COL_W, GRID_OY + ROWS * ROW_H, C.ui, 2);
    }

    // Goal row
    var goalY = GRID_OY + ROWS * ROW_H;
    for (var gc = 0; gc < COLS; gc++) {
      var gx2 = gc * COL_W;
      var gcol = goals[gc] === 'good' ? C.goalGood : C.goalBad;
      game.draw.rect(gx2 + 3, goalY, COL_W - 6, 50, gcol, 0.8);
      game.draw.text(goals[gc] === 'good' ? '★' : '✕', gx2 + COL_W / 2, goalY + 36, { size: 36, color: C.goalHi });
    }

    // Water droplet
    if (waterActive || waterDropped) {
      var wy2 = Math.min(waterY, GRID_OY + waterRow * ROW_H);
      var wx2 = waterCol * COL_W + COL_W / 2;
      game.draw.circle(wx2, wy2, 18, C.waterHi, 0.9);
      game.draw.circle(wx2, wy2, 30, C.water, 0.3);
    }

    // Start button
    if (!waterActive && !waterDropped) {
      var startY = GRID_OY - 60;
      var startX = waterCol * COL_W + COL_W / 2;
      game.draw.circle(startX, startY, 30, C.waterHi, 0.8 + Math.sin(elapsed * 4) * 0.1);
      game.draw.text('↓', startX, startY + 14, { size: 36, color: '#ffffff', bold: true });
      game.draw.text('タップで流す', W / 2, H * 0.1, { size: 36, color: C.channelHi });
    }

    // Ripples
    for (var ri2 = 0; ri2 < ripples.length; ri2++) {
      var rip = ripples[ri2];
      game.draw.circle(rip.x, rip.y, rip.r, C.waterHi, rip.alpha * 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Fail dots
    for (var fi = 0; fi < MAX_FAIL; fi++) {
      game.draw.circle(W / 2 - (MAX_FAIL - 1) * 60 + fi * 120, H * 0.955, 22, fi < fails ? C.goalBad : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.water : C.goalBad);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    initPuzzle();
  });
})(game);
