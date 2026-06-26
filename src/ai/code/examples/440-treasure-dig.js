// 440-treasure-dig.js
// 宝掘り — 限られた回数で宝を掘り当てる
// 操作: タップでマス目を掘る（熱感知器が近さを教える）
// 成功: 4つの宝を全て発見  失敗: 掘削回数オーバー or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0600',
    soil:   '#3d1f00',
    soilHi: '#5c2d00',
    soilDark:'#1a0b00',
    dug:    '#0f0700',
    treasure:'#fbbf24',
    treasureHi:'#fef08a',
    chest:  '#d97706',
    chestHi:'#fbbf24',
    hot:    '#ef4444',
    warm:   '#f97316',
    cool:   '#3b82f6',
    cold:   '#1d4ed8',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var GRID = 8;
  var CELL = 120;
  var OX = (W - GRID * CELL) / 2;
  var OY = (H - GRID * CELL) / 2 - 60;

  var cells = [];  // { dug, treasure, hint }
  var treasures = [];  // { x, y }
  var NUM_TREASURES = 4;
  var MAX_DIGS = 20;
  var digs = 0;
  var found = 0;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];

  function init() {
    cells = [];
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        cells.push({ dug: false, treasure: false, dist: 999 });
      }
    }
    // Place treasures
    treasures = [];
    while (treasures.length < NUM_TREASURES) {
      var tx = Math.floor(Math.random() * GRID);
      var ty = Math.floor(Math.random() * GRID);
      var dup = false;
      for (var i = 0; i < treasures.length; i++) {
        if (treasures[i].x === tx && treasures[i].y === ty) { dup = true; break; }
      }
      if (!dup) {
        treasures.push({ x: tx, y: ty, found: false });
        cells[ty * GRID + tx].treasure = true;
      }
    }
    // Calculate distances
    for (var ri = 0; ri < GRID; ri++) {
      for (var ci = 0; ci < GRID; ci++) {
        var minDist = 999;
        for (var ti = 0; ti < treasures.length; ti++) {
          if (treasures[ti].found) continue;
          var dx = ci - treasures[ti].x;
          var dy = ri - treasures[ti].y;
          var d = Math.sqrt(dx*dx + dy*dy);
          if (d < minDist) minDist = d;
        }
        cells[ri * GRID + ci].dist = minDist;
      }
    }
  }

  function getHintColor(dist) {
    if (dist < 1.5) return C.hot;
    if (dist < 2.5) return C.warm;
    if (dist < 4) return C.correct;
    if (dist < 5.5) return C.cool;
    return C.cold;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var idx = row * GRID + col;
    var cell = cells[idx];
    if (cell.dug) return;

    cell.dug = true;
    digs++;
    game.audio.play('se_tap', 0.3);

    if (cell.treasure) {
      found++;
      cell.treasureFound = true;
      flashCol = C.correct;
      flashAnim = 0.8;
      game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        var cx2 = OX + col * CELL + CELL/2;
        var cy2 = OY + row * CELL + CELL/2;
        particles.push({ x: cx2, y: cy2, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180-100, life: 0.7, col: C.treasureHi });
      }
      // Mark this treasure found and recalculate distances
      for (var ti2 = 0; ti2 < treasures.length; ti2++) {
        if (treasures[ti2].x === col && treasures[ti2].y === row) {
          treasures[ti2].found = true;
          break;
        }
      }
      // Recalculate distances
      for (var ri2 = 0; ri2 < GRID; ri2++) {
        for (var ci2 = 0; ci2 < GRID; ci2++) {
          var minDist = 999;
          for (var ti3 = 0; ti3 < treasures.length; ti3++) {
            if (treasures[ti3].found) continue;
            var dx2 = ci2 - treasures[ti3].x;
            var dy2 = ri2 - treasures[ti3].y;
            var d = Math.sqrt(dx2*dx2 + dy2*dy2);
            if (d < minDist) minDist = d;
          }
          cells[ri2 * GRID + ci2].dist = minDist;
        }
      }
      if (found >= NUM_TREASURES && !done) {
        done = true;
        setTimeout(function() { game.end.success(found * 600 + (MAX_DIGS - digs) * 100 + Math.ceil(timeLeft) * 80); }, 700);
        return;
      }
    } else {
      flashCol = C.soilHi;
      flashAnim = 0.2;
    }

    if (digs >= MAX_DIGS && !done) {
      done = true;
      game.audio.play('se_failure', 0.6);
      setTimeout(function() { game.end.failure(); }, 500);
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

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Soil background
    game.draw.rect(OX - 10, OY - 10, GRID*CELL + 20, GRID*CELL + 20, C.soilDark, 0.8);

    // Grid cells
    for (var ri3 = 0; ri3 < GRID; ri3++) {
      for (var ci3 = 0; ci3 < GRID; ci3++) {
        var cell2 = cells[ri3 * GRID + ci3];
        var cx3 = OX + ci3 * CELL;
        var cy3 = OY + ri3 * CELL;

        if (cell2.dug) {
          game.draw.rect(cx3 + 2, cy3 + 2, CELL - 4, CELL - 4, C.dug, 0.95);
          if (cell2.treasureFound) {
            game.draw.circle(cx3 + CELL/2, cy3 + CELL/2, CELL*0.35, C.chestHi, 0.3);
            game.draw.circle(cx3 + CELL/2, cy3 + CELL/2, CELL*0.28, C.treasure, 0.9);
            game.draw.circle(cx3 + CELL/2 - 10, cy3 + CELL/2 - 10, CELL*0.1, '#fff', 0.5);
          } else {
            // Show hint color
            var hCol = getHintColor(cell2.dist);
            game.draw.circle(cx3 + CELL/2, cy3 + CELL/2, CELL * 0.3, hCol, 0.7);
            game.draw.circle(cx3 + CELL/2, cy3 + CELL/2, CELL * 0.15, hCol, 0.5);
          }
        } else {
          game.draw.rect(cx3 + 2, cy3 + 2, CELL - 4, CELL - 4, C.soil, 0.85);
          // Texture dots
          game.draw.circle(cx3 + 24, cy3 + 24, 4, C.soilDark, 0.5);
          game.draw.circle(cx3 + CELL - 28, cy3 + 32, 3, C.soilHi, 0.3);
          game.draw.circle(cx3 + 36, cy3 + CELL - 28, 3, C.soilDark, 0.4);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Info
    var digsLeft = MAX_DIGS - digs;
    var digCol = digsLeft <= 5 ? C.wrong : C.text;
    game.draw.text('掘削残り: ' + digsLeft, W/2, H*0.88, { size: 44, color: digCol, bold: digsLeft <= 5 });

    // Legend
    game.draw.circle(W*0.12, H*0.91, 12, C.hot, 0.8);
    game.draw.text('熱い', W*0.12 + 50, H*0.912, { size: 28, color: C.hot });
    game.draw.circle(W*0.45, H*0.91, 12, C.cool, 0.8);
    game.draw.text('冷たい', W*0.45 + 60, H*0.912, { size: 28, color: C.cool });

    game.draw.text(found + ' / ' + NUM_TREASURES, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.treasure : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    init();
  });
})(game);
