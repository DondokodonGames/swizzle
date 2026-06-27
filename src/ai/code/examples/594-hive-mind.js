// 594-hive-mind.js
// ハイブマインド — 蜂の巣を守れ！侵入者を六角形の壁で封じ込める
// 操作: タップで六角セルに壁を設置、侵入者の進路を塞ぐ
// 成功: 20匹撃退  失敗: 10匹突破 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050300',
    hex:     '#1a1200',
    hexBorder:'#332200',
    wall:    '#ffaa00',
    wallHi:  '#ffdd88',
    hive:    '#ffcc00',
    hiveHi:  '#ffee88',
    bug:     '#224400',
    bugHi:   '#448800',
    dead:    '#88cc00',
    breach:  '#ef4444',
    text:    '#f1f5f9',
    ui:      '#2a1800'
  };

  var HEX_R = 60; // outer radius
  var HEX_ROWS = 7;
  var HEX_COLS = 6;
  var hexes = [];
  var bugs = [];
  var wallCells = {};
  var deflected = 0;
  var NEEDED = 20;
  var breached = 0;
  var MAX_BREACH = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.dead;
  var nextBug = 2.0;
  var HIVE_COL = 2, HIVE_ROW = 3; // center cell = hive core

  var OX = W / 2 - HEX_COLS * HEX_R * 0.9;
  var OY = H * 0.18;

  function hexCenter(row, col) {
    var x = OX + col * HEX_R * 1.75 + (row % 2) * HEX_R * 0.875;
    var y = OY + row * HEX_R * 1.52;
    return { x: x, y: y };
  }

  function hexKey(r, c) { return r + ',' + c; }

  function drawHex(cx, cy, r, col, alpha) {
    for (var i = 0; i < 6; i++) {
      var a1 = i / 6 * Math.PI * 2 - Math.PI / 6;
      var a2 = (i + 1) / 6 * Math.PI * 2 - Math.PI / 6;
      var x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
      var x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
      game.draw.line(x1, y1, x2, y2, col, alpha > 0.5 ? 4 : 2);
    }
  }

  function hexNeighbors(r, c) {
    var offsets = r % 2 === 0
      ? [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]]
      : [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];
    var result = [];
    for (var i = 0; i < offsets.length; i++) {
      var nr = r + offsets[i][0], nc = c + offsets[i][1];
      if (nr >= 0 && nr < HEX_ROWS && nc >= 0 && nc < HEX_COLS) {
        result.push({ r: nr, c: nc });
      }
    }
    return result;
  }

  function spawnBug() {
    // Start from a random edge cell
    var edgeCells = [];
    for (var r = 0; r < HEX_ROWS; r++) {
      for (var c = 0; c < HEX_COLS; c++) {
        if (r === 0 || r === HEX_ROWS - 1 || c === 0 || c === HEX_COLS - 1) {
          edgeCells.push({ r: r, c: c });
        }
      }
    }
    var startCell = edgeCells[Math.floor(Math.random() * edgeCells.length)];
    var pos = hexCenter(startCell.r, startCell.c);
    bugs.push({
      r: startCell.r, c: startCell.c,
      x: pos.x, y: pos.y,
      targetR: HIVE_ROW, targetC: HIVE_COL,
      moveTimer: 0, moveDelay: 0.6,
      state: 'alive'
    });
  }

  function bugMove(bug) {
    if (bug.r === HIVE_ROW && bug.c === HIVE_COL) {
      // Reached hive
      bug.state = 'breached';
      breached++;
      flashCol = C.breach;
      flashAnim = 0.4;
      game.audio.play('se_failure', 0.5);
      if (breached >= MAX_BREACH && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
      return;
    }

    var neighbors = hexNeighbors(bug.r, bug.c);
    // Move toward hive, avoid walls
    var best = null, bestDist = 1e9;
    for (var ni = 0; ni < neighbors.length; ni++) {
      var n = neighbors[ni];
      var key = hexKey(n.r, n.c);
      if (wallCells[key]) continue;
      var dr = n.r - HIVE_ROW, dc = n.c - HIVE_COL;
      var dist = dr * dr + dc * dc;
      if (dist < bestDist) { bestDist = dist; best = n; }
    }
    if (best) {
      bug.r = best.r; bug.c = best.c;
      var pos = hexCenter(bug.r, bug.c);
      bug.x = pos.x; bug.y = pos.y;
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find which hex was tapped
    for (var r = 0; r < HEX_ROWS; r++) {
      for (var c = 0; c < HEX_COLS; c++) {
        if (r === HIVE_ROW && c === HIVE_COL) continue;
        var pos = hexCenter(r, c);
        var dx = tx - pos.x, dy = ty - pos.y;
        if (dx * dx + dy * dy < HEX_R * HEX_R * 0.7) {
          var key = hexKey(r, c);
          // Check if bug is on this cell
          var bugHere = false;
          for (var bi = bugs.length - 1; bi >= 0; bi--) {
            if (bugs[bi].r === r && bugs[bi].c === c && bugs[bi].state === 'alive') {
              // Kill bug!
              bugs[bi].state = 'dead';
              deflected++;
              flashCol = C.dead;
              flashAnim = 0.2;
              game.audio.play('se_success', 0.6);
              for (var pi = 0; pi < 6; pi++) {
                var ang = Math.random() * Math.PI * 2;
                particles.push({ x: pos.x, y: pos.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.4, col: C.dead });
              }
              bugHere = true;
              if (deflected >= NEEDED && !done) {
                done = true;
                game.audio.play('se_success', 0.9);
                setTimeout(function() { game.end.success(deflected * 300 + Math.ceil(timeLeft) * 100); }, 700);
              }
              break;
            }
          }
          if (!bugHere) {
            // Toggle wall
            if (wallCells[key]) {
              delete wallCells[key];
              game.audio.play('se_tap', 0.1);
            } else {
              wallCells[key] = true;
              game.audio.play('se_tap', 0.2);
            }
          }
          return;
        }
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

    // Spawn bugs
    nextBug -= dt;
    if (nextBug <= 0 && !done) {
      spawnBug();
      nextBug = Math.max(0.8, 2.0 - elapsed * 0.02);
    }

    // Move bugs
    for (var bi = bugs.length - 1; bi >= 0; bi--) {
      var bug = bugs[bi];
      if (bug.state !== 'alive') {
        bug.moveTimer += dt * 3;
        if (bug.moveTimer > 1) bugs.splice(bi, 1);
        continue;
      }
      bug.moveTimer += dt;
      if (bug.moveTimer >= bug.moveDelay) {
        bug.moveTimer = 0;
        bugMove(bug);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Hex grid
    for (var r = 0; r < HEX_ROWS; r++) {
      for (var c = 0; c < HEX_COLS; c++) {
        var pos = hexCenter(r, c);
        var key2 = hexKey(r, c);
        var isHive = (r === HIVE_ROW && c === HIVE_COL);
        var isWall = wallCells[key2];

        if (isHive) {
          game.draw.circle(pos.x, pos.y, HEX_R * 0.7, C.hive, 0.3 + Math.sin(elapsed * 3) * 0.1);
          drawHex(pos.x, pos.y, HEX_R * 0.95, C.hiveHi, 1.0);
          game.draw.text('巣', pos.x, pos.y + 16, { size: 44, color: C.hiveHi, bold: true });
        } else if (isWall) {
          game.draw.circle(pos.x, pos.y, HEX_R * 0.55, C.wall, 0.7);
          drawHex(pos.x, pos.y, HEX_R * 0.95, C.wallHi, 0.8);
        } else {
          drawHex(pos.x, pos.y, HEX_R * 0.95, C.hexBorder, 0.5);
        }
      }
    }

    // Bugs
    for (var bi2 = 0; bi2 < bugs.length; bi2++) {
      var bug2 = bugs[bi2];
      var bugAlpha = bug2.state === 'dead' ? bug2.moveTimer * 0.5 : 0.9;
      game.draw.circle(bug2.x, bug2.y, 24, C.bugHi, bugAlpha * 0.5);
      game.draw.circle(bug2.x, bug2.y, 18, C.bug, bugAlpha);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Breach dots
    for (var bi3 = 0; bi3 < MAX_BREACH; bi3++) {
      game.draw.circle(W / 2 - (MAX_BREACH - 1) * 38 + bi3 * 76, H * 0.955, 16, bi3 < breached ? C.breach : C.ui, 0.9);
    }

    game.draw.text(deflected + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.wall : C.breach);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
  });
})(game);
