// 494-mirror-match.js
// ミラーマッチ — 左側の図形パターンをスワイプで鏡像コピーせよ
// 操作: 右半分のグリッドをスワイプで塗って左側の鏡像を再現
// 成功: 8パターン完成  失敗: 120秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0010',
    panel:   '#120018',
    cellOn:  '#a855f7',
    cellOnHi:'#d8b4fe',
    cellOff: '#1a0025',
    mirror:  '#7c3aed',
    mirrorHi:'#c4b5fd',
    correct: '#22c55e',
    wrong:   '#ef4444',
    divider: '#6d28d9',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var GRID = 5;
  var CELL = 160;
  var OX_LEFT  = 40;
  var OX_RIGHT = W / 2 + 40;
  var OY = H * 0.28;

  var target = [];   // GRID×GRID: left (mirrored reference)
  var player = [];   // GRID×GRID: right (player paints)
  var rounds = 0;
  var NEEDED = 8;
  var done = false;
  var timeLeft = 120;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var lastSweepCell = null;

  function randPattern() {
    target = [];
    player = [];
    for (var r = 0; r < GRID; r++) {
      target.push([]);
      player.push([]);
      for (var c = 0; c < GRID; c++) {
        target[r].push(Math.random() < 0.45 ? 1 : 0);
        player[r].push(0);
      }
    }
  }

  function isComplete() {
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        // Mirror: left col c maps to right col (GRID-1-c)
        if (player[r][GRID - 1 - c] !== target[r][c]) return false;
      }
    }
    return true;
  }

  function paintCell(tx, ty, val) {
    var col = Math.floor((tx - OX_RIGHT) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var key = row + ',' + col;
    if (lastSweepCell === key) return;
    lastSweepCell = key;
    player[row][col] = val === undefined ? (player[row][col] ? 0 : 1) : val;
    game.audio.play('se_tap', 0.15);
    if (isComplete()) {
      rounds++;
      flashCol = C.correct;
      flashAnim = 0.5;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: OY + GRID * CELL / 2, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.6, col: C.cellOnHi });
      }
      if (rounds >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(rounds * 500 + Math.ceil(timeLeft) * 80); }, 800);
      } else {
        setTimeout(function() { if (!done) { randPattern(); lastSweepCell = null; } }, 700);
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) return; // Can't click left side
    lastSweepCell = null;
    paintCell(tx, ty);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (x1 < W / 2) return;
    // Paint cells along swipe path
    lastSweepCell = null;
    var steps = 20;
    for (var s = 0; s <= steps; s++) {
      var fx = x1 + (x2 - x1) * s / steps;
      var fy = y1 + (y2 - y1) * s / steps;
      paintCell(fx, fy, 1);
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

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Panels
    game.draw.rect(OX_LEFT - 8, OY - 8, GRID * CELL + 16, GRID * CELL + 16, C.panel, 0.9);
    game.draw.rect(OX_RIGHT - 8, OY - 8, GRID * CELL + 16, GRID * CELL + 16, C.panel, 0.9);

    // Left grid (target, mirrored display = target as-is)
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var lx = OX_LEFT + c * CELL;
        var ly = OY + r * CELL;
        if (target[r][c]) {
          game.draw.rect(lx + 6, ly + 6, CELL - 12, CELL - 12, C.mirror, 0.9);
          game.draw.rect(lx + 6, ly + 6, CELL - 12, 10, C.mirrorHi, 0.4);
        } else {
          game.draw.rect(lx + 6, ly + 6, CELL - 12, CELL - 12, C.cellOff, 0.9);
        }
      }
    }

    // Right grid (player)
    for (var r2 = 0; r2 < GRID; r2++) {
      for (var c2 = 0; c2 < GRID; c2++) {
        var rx = OX_RIGHT + c2 * CELL;
        var ry = OY + r2 * CELL;
        // Check if this cell matches what's needed
        var needed = target[r2][GRID - 1 - c2];
        var has = player[r2][c2];
        var matches = (has === needed);
        if (has) {
          var fillCol = matches ? C.cellOn : C.wrong;
          game.draw.rect(rx + 6, ry + 6, CELL - 12, CELL - 12, fillCol, 0.9);
          game.draw.rect(rx + 6, ry + 6, CELL - 12, 10, C.cellOnHi, 0.3);
        } else {
          game.draw.rect(rx + 6, ry + 6, CELL - 12, CELL - 12, C.cellOff, 0.9);
        }
      }
    }

    // Divider
    game.draw.rect(W / 2 - 3, OY - 20, 6, GRID * CELL + 40, C.divider, 0.9);
    game.draw.text('↔', W / 2, OY - 50, { size: 40, color: C.divider });

    // Labels
    game.draw.text('見本', OX_LEFT + GRID * CELL / 2, OY - 60, { size: 36, color: C.mirrorHi });
    game.draw.text('コピー', OX_RIGHT + GRID * CELL / 2, OY - 60, { size: 36, color: C.cellOnHi });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.15);

    game.draw.text(rounds + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 120);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.mirror : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    randPattern();
  });
})(game);
