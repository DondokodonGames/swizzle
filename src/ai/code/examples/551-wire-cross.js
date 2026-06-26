// 551-wire-cross.js
// ワイヤークロス — 交差する電線をタップで切り替えてショートを防ぐ
// 操作: タップで交差点を切り替え（通す/遮断）
// 成功: 15回ショート防止  失敗: 8回ショート or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#010a06',
    grid:    '#021408',
    wire0:   '#ff3322',
    wire1:   '#ffaa00',
    wire2:   '#00aaff',
    wireOff: '#334433',
    cross:   '#88ff44',
    crossOff:'#224422',
    short:   '#ff0000',
    safe:    '#22ff44',
    panel:   '#0a1a0a',
    text:    '#a0ff80',
    ui:      '#224422',
    glow:    '#88ff4422'
  };

  var GRID_COLS = 5;
  var GRID_ROWS = 6;
  var CELL = 180;
  var OX = (W - GRID_COLS * CELL) / 2;
  var OY = H * 0.2;

  var WIRE_COLORS = [C.wire0, C.wire1, C.wire2];
  var crosses = []; // {col, row, enabled} — at intersections
  var wires = []; // {color, path: [{col, row}]}
  var shorted = 0;
  var prevented = 0;
  var NEEDED = 15;
  var MAX_SHORT = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var events = []; // incoming short events
  var nextEvent = 1.5;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.safe;

  function initGrid() {
    // 3 horizontal wires and 3 vertical wires
    wires = [];
    for (var i = 0; i < 3; i++) {
      // Horizontal
      wires.push({ colorIdx: i, dir: 'h', pos: 1 + i * 1.5 });
      // Vertical
      wires.push({ colorIdx: i, dir: 'v', pos: 1 + i * 1.5 });
    }
    // Intersection crosses
    crosses = [];
    for (var ci = 0; ci < 4; ci++) {
      for (var ri = 0; ri < 4; ri++) {
        crosses.push({ col: ci + 0.5, row: ri + 0.5, enabled: Math.random() < 0.5 });
      }
    }
  }

  // A short event: two wires of same horizontal/vertical position approach an intersection
  var shortEvents = [];

  function spawnEvent() {
    // Pick random cross position
    var ci = Math.floor(Math.random() * 4);
    var ri = Math.floor(Math.random() * 4);
    var needsEnabled = Math.random() < 0.5; // need enabled or disabled to prevent
    shortEvents.push({
      col: ci + 0.5,
      row: ri + 0.5,
      needsEnabled: needsEnabled, // true = need cross enabled to prevent short
      timer: 2.5 - Math.min(prevented * 0.05, 1.0),
      maxTimer: 2.5 - Math.min(prevented * 0.05, 1.0),
      triggered: false
    });
  }

  function findCross(col, row) {
    for (var i = 0; i < crosses.length; i++) {
      if (Math.abs(crosses[i].col - col) < 0.1 && Math.abs(crosses[i].row - row) < 0.1) return crosses[i];
    }
    return null;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find tapped cross
    for (var i = 0; i < crosses.length; i++) {
      var cx = OX + crosses[i].col * CELL;
      var cy = OY + crosses[i].row * CELL;
      if (Math.abs(tx - cx) < 60 && Math.abs(ty - cy) < 60) {
        crosses[i].enabled = !crosses[i].enabled;
        game.audio.play('se_tap', 0.3);
        // Check if this resolved any pending event
        for (var ei = shortEvents.length - 1; ei >= 0; ei--) {
          var ev = shortEvents[ei];
          if (Math.abs(ev.col - crosses[i].col) < 0.1 && Math.abs(ev.row - crosses[i].row) < 0.1) {
            var cross = findCross(ev.col, ev.row);
            if (cross && cross.enabled === ev.needsEnabled) {
              // Prevented!
              prevented++;
              shortEvents.splice(ei, 1);
              flashCol = C.safe;
              flashAnim = 0.25;
              game.audio.play('se_success', 0.7);
              for (var pi = 0; pi < 8; pi++) {
                var ang = Math.random() * Math.PI * 2;
                particles.push({ x: cx, y: cy, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.cross });
              }
              if (prevented >= NEEDED && !done) {
                done = true;
                game.audio.play('se_success', 0.9);
                setTimeout(function() { game.end.success(prevented * 400 + Math.ceil(timeLeft) * 100); }, 700);
              }
            }
          }
        }
        return;
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
    if (flashAnim > 0) flashAnim -= dt * 4;

    // Spawn events
    nextEvent -= dt;
    if (nextEvent <= 0 && !done) {
      spawnEvent();
      nextEvent = Math.max(0.8, 1.5 - prevented * 0.03);
    }

    // Update events
    for (var ei = shortEvents.length - 1; ei >= 0; ei--) {
      var ev = shortEvents[ei];
      ev.timer -= dt;
      if (ev.timer <= 0 && !ev.triggered) {
        // Check if prevented
        var cross = findCross(ev.col, ev.row);
        if (!cross || cross.enabled !== ev.needsEnabled) {
          // SHORTED
          shorted++;
          flashCol = C.short;
          flashAnim = 0.5;
          game.audio.play('se_failure', 0.6);
          var sx = OX + ev.col * CELL;
          var sy = OY + ev.row * CELL;
          for (var pi2 = 0; pi2 < 12; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: sx, y: sy, vx: Math.cos(ang2) * 250, vy: Math.sin(ang2) * 250, life: 0.5, col: C.short });
          }
          if (shorted >= MAX_SHORT && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        } else {
          // Auto-prevented
          prevented++;
          if (prevented >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(prevented * 400 + Math.ceil(timeLeft) * 100); }, 700);
          }
        }
        ev.triggered = true;
        shortEvents.splice(ei, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(OX - 20, OY - 20, GRID_COLS * CELL + 40, GRID_ROWS * CELL + 40, C.panel, 0.7);

    // Grid
    for (var gi = 0; gi <= GRID_COLS; gi++) {
      game.draw.line(OX + gi * CELL, OY, OX + gi * CELL, OY + GRID_ROWS * CELL, C.grid, 2);
    }
    for (var gj = 0; gj <= GRID_ROWS; gj++) {
      game.draw.line(OX, OY + gj * CELL, OX + GRID_COLS * CELL, OY + gj * CELL, C.grid, 2);
    }

    // Wires (horizontal and vertical lines through the grid)
    var hPositions = [0.8, 2.3, 3.8];
    var vPositions = [0.8, 2.3, 3.8];
    for (var wi = 0; wi < 3; wi++) {
      var col3 = WIRE_COLORS[wi];
      var hy = OY + hPositions[wi] * CELL;
      game.draw.line(OX, hy, OX + GRID_COLS * CELL, hy, col3, 6);
      var vx = OX + vPositions[wi] * CELL;
      game.draw.line(vx, OY, vx, OY + GRID_ROWS * CELL, col3, 6);
    }

    // Crosses
    for (var ci2 = 0; ci2 < crosses.length; ci2++) {
      var cr = crosses[ci2];
      var cxp = OX + cr.col * CELL;
      var cyp = OY + cr.row * CELL;
      game.draw.circle(cxp, cyp, 36, cr.enabled ? C.cross : C.crossOff, 0.9);
      game.draw.circle(cxp, cyp, 28, cr.enabled ? '#001a00' : '#000800', 0.9);
      game.draw.text(cr.enabled ? '●' : '○', cxp, cyp + 12, { size: 32, color: cr.enabled ? C.cross : C.ui });
    }

    // Short events
    for (var ei2 = 0; ei2 < shortEvents.length; ei2++) {
      var ev2 = shortEvents[ei2];
      var evx = OX + ev2.col * CELL;
      var evy = OY + ev2.row * CELL;
      var frac = ev2.timer / ev2.maxTimer;
      var urgency = 1 - frac;
      var pulse = 1 + Math.sin(elapsed * (8 + urgency * 8)) * 0.2;
      var ecol = ev2.needsEnabled ? C.cross : C.wireOff;
      game.draw.circle(evx, evy, 60 * pulse, urgency > 0.6 ? C.short : ecol, urgency * 0.4);
      game.draw.circle(evx, evy, 50 * pulse, urgency > 0.6 ? C.short : ecol, 0.7);
      // Timer ring
      for (var ri2 = 0; ri2 < 8; ri2++) {
        if (ri2 / 8 > frac) continue;
        var rang = ri2 / 8 * Math.PI * 2;
        game.draw.circle(evx + Math.cos(rang) * 56, evy + Math.sin(rang) * 56, 8, ecol, 0.8);
      }
      game.draw.text(ev2.needsEnabled ? '接続!' : '切断!', evx, evy - 80, { size: 32, color: urgency > 0.6 ? C.short : ecol });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Short dots
    for (var si = 0; si < MAX_SHORT; si++) {
      game.draw.circle(W / 2 - (MAX_SHORT - 1) * 44 + si * 88, H * 0.955, 18, si < shorted ? C.short : C.ui, 0.9);
    }

    game.draw.text(prevented + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.cross : C.short);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    initGrid();
  });
})(game);
