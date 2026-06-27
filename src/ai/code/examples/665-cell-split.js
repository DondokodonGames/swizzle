// 665-cell-split.js
// 細胞分裂 — 大きくなる前にタップで分裂させろ
// 操作: タップで細胞を分裂
// 成功: 40回分裂  失敗: 3個が限界サイズ超過 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020a06',
    cell:    '#22c55e',
    cellHi:  '#86efac',
    cellGl:  '#bbf7d0',
    danger:  '#ef4444',
    dangerHi:'#fca5a5',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050e07'
  };

  var MAX_R = 130;
  var DANGER_R = 110;
  var SPLIT_INTO = 2;
  var cells = [];
  var nextId = 0;

  var splits = 0;
  var NEEDED = 40;
  var overloads = 0;
  var MAX_OVER = 3;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function addCell(x, y, r) {
    cells.push({
      id: nextId++,
      x: x,
      y: y,
      r: r || 28,
      growRate: 18 + Math.random() * 14,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      overloaded: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hitIdx = -1;
    var hitDist = Infinity;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      var dx = tx - c.x, dy = ty - c.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < c.r + 20 && dist < hitDist) {
        hitDist = dist;
        hitIdx = i;
      }
    }
    if (hitIdx < 0) return;

    var c2 = cells[hitIdx];
    var r2 = c2.r * 0.65;
    var angle = Math.random() * Math.PI * 2;
    addCell(c2.x + Math.cos(angle) * r2, c2.y + Math.sin(angle) * r2, r2);
    addCell(c2.x - Math.cos(angle) * r2, c2.y - Math.sin(angle) * r2, r2);
    cells.splice(hitIdx, 1);

    splits++;
    flashCol = C.correct;
    flashAnim = 0.25;
    resultText = '分裂！';
    resultTimer = 0.4;
    game.audio.play('se_success', 0.5);

    for (var p = 0; p < 5; p++) {
      var pa = Math.random() * Math.PI * 2;
      particles.push({ x: c2.x, y: c2.y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.35, col: C.cellHi });
    }

    if (splits >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(splits * 250 + Math.ceil(timeLeft) * 80); }, 700);
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

    var newOverloads = 0;
    for (var i = cells.length - 1; i >= 0; i--) {
      var c = cells[i];
      c.r += c.growRate * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;

      // Bounce off walls
      if (c.x - c.r < 0) { c.x = c.r; c.vx = Math.abs(c.vx); }
      if (c.x + c.r > W) { c.x = W - c.r; c.vx = -Math.abs(c.vx); }
      if (c.y - c.r < 80) { c.y = 80 + c.r; c.vy = Math.abs(c.vy); }
      if (c.y + c.r > H * 0.92) { c.y = H * 0.92 - c.r; c.vy = -Math.abs(c.vy); }

      if (c.r >= MAX_R && !c.overloaded) {
        c.overloaded = true;
        overloads++;
        flashCol = C.wrong;
        flashAnim = 0.4;
        resultText = '大きすぎ！';
        resultTimer = 0.55;
        game.audio.play('se_failure', 0.4);
        cells.splice(i, 1);
        if (overloads >= MAX_OVER && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    // Always have at least 1 cell
    if (cells.length === 0 && !done) {
      addCell(W / 2, H / 2, 30);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid (microscope look)
    for (var gx = 0; gx < W; gx += 80) {
      game.draw.line(gx, 0, gx, H, '#0d2010', 0.6);
    }
    for (var gy = 0; gy < H; gy += 80) {
      game.draw.line(0, gy, W, gy, '#0d2010', 0.6);
    }

    // Cells
    for (var ci = 0; ci < cells.length; ci++) {
      var cell = cells[ci];
      var danger = cell.r >= DANGER_R;
      var col = danger ? C.danger : C.cell;
      var colHi = danger ? C.dangerHi : C.cellHi;
      var pulse = 1 + Math.sin(elapsed * 3 + ci) * 0.04;
      var r = cell.r * pulse;

      game.draw.circle(cell.x + 5, cell.y + 5, r, '#000', 0.25);
      game.draw.circle(cell.x, cell.y, r, col, 0.75);
      game.draw.circle(cell.x, cell.y, r * 0.7, col, 0.15);
      game.draw.circle(cell.x - r * 0.3, cell.y - r * 0.3, r * 0.18, colHi, 0.5);

      // Nucleus
      game.draw.circle(cell.x, cell.y, r * 0.28, colHi, 0.4);

      if (danger) {
        var warn = (Math.sin(elapsed * 8) + 1) * 0.5;
        game.draw.circle(cell.x, cell.y, r + 12, C.danger, warn * 0.3);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 7 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.77, { size: 64, color: flashCol, bold: true });
    }

    // Overload indicators
    for (var oi = 0; oi < MAX_OVER; oi++) {
      game.draw.circle(W / 2 - (MAX_OVER - 1) * 80 + oi * 160, H * 0.955, 28, oi < overloads ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(splits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.cell : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    addCell(W * 0.35, H * 0.45, 36);
    addCell(W * 0.65, H * 0.55, 28);
  });
})(game);
