// 396-laser-bounce.js
// レーザー反射 — 鏡を回転させてレーザーを的に当てる
// 操作: タップで鏡を45度ずつ回転
// 成功: 5回的に命中  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050210',
    grid:   '#0f0a20',
    mirror: '#7dd3fc',
    mirrorHi:'#e0f2fe',
    laser:  '#ef4444',
    laserHi:'#fca5a5',
    target: '#22c55e',
    targetHi:'#86efac',
    targetOff:'#1c3a2a',
    hit:    '#fbbf24',
    wall:   '#1e1b4b',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var CELL = 160;
  var COLS = 6;
  var ROWS = 8;
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = H * 0.15;

  // Mirror cells [col, row, angle_steps] — angle 0=\, 1=|, 2=/, 3=—
  var mirrors = [
    { col: 1, row: 2, steps: 0 },
    { col: 3, row: 3, steps: 1 },
    { col: 4, row: 1, steps: 2 },
    { col: 2, row: 5, steps: 3 },
    { col: 5, row: 4, steps: 0 }
  ];

  // Target
  var target = { col: 5, row: 6 };

  // Laser source: left side, row 2
  var srcRow = 2;
  var srcDir = { dx: 1, dy: 0 }; // moving right

  var hits = 0;
  var NEEDED = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var hitFlash = 0;

  function cellToXY(col, row) {
    return {
      x: GRID_X + (col + 0.5) * CELL,
      y: GRID_Y + (row + 0.5) * CELL
    };
  }

  // Reflect direction based on mirror angle
  // steps: 0=\, 1=|, 2=/, 3=—
  function reflectDir(dx, dy, steps) {
    var ang = steps * Math.PI / 4;
    // Mirror normal
    if (steps === 0) { // backslash: nx=cos(-45), ny=sin(-45)
      // \ reflects: (dx,dy) -> (dy,dx)
      return { dx: dy, dy: dx };
    } else if (steps === 1) { // | vertical mirror
      return { dx: -dx, dy: dy };
    } else if (steps === 2) { // / forward slash
      // / reflects: (dx,dy) -> (-dy,-dx)
      return { dx: -dy, dy: -dx };
    } else { // — horizontal mirror
      return { dx: dx, dy: -dy };
    }
  }

  function traceLaser() {
    var path = [];
    var cx = -1, cy = srcRow;
    var dx = 1, dy = 0;
    var steps = 0;
    var maxSteps = 50;
    var hitTarget = false;

    path.push({ x: GRID_X, y: GRID_Y + (cy+0.5)*CELL });

    while (steps < maxSteps) {
      cx += dx; cy += dy;
      steps++;
      if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) break;

      var px = GRID_X + (cx+0.5)*CELL;
      var py = GRID_Y + (cy+0.5)*CELL;
      path.push({ x: px, y: py });

      // Check mirror
      var mirror = null;
      for (var mi = 0; mi < mirrors.length; mi++) {
        if (mirrors[mi].col === cx && mirrors[mi].row === cy) { mirror = mirrors[mi]; break; }
      }
      if (mirror) {
        var nd = reflectDir(dx, dy, mirror.steps);
        dx = nd.dx; dy = nd.dy;
      }

      // Check target
      if (cx === target.col && cy === target.row) {
        hitTarget = true;
        break;
      }
    }
    return { path: path, hitTarget: hitTarget };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check if tapping a mirror cell
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m = mirrors[mi];
      var cx2 = GRID_X + m.col * CELL;
      var cy2 = GRID_Y + m.row * CELL;
      if (tx > cx2 && tx < cx2+CELL && ty > cy2 && ty < cy2+CELL) {
        m.steps = (m.steps + 1) % 4;
        game.audio.play('se_tap', 0.3);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (hitFlash > 0) hitFlash -= dt * 2;

    var laserTrace = traceLaser();
    if (laserTrace.hitTarget) {
      hitFlash = Math.min(1, hitFlash + dt * 4);
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var col = 0; col <= COLS; col++) {
      var gx = GRID_X + col*CELL;
      game.draw.line(gx, GRID_Y, gx, GRID_Y+ROWS*CELL, C.grid, 2);
    }
    for (var row = 0; row <= ROWS; row++) {
      var gy = GRID_Y + row*CELL;
      game.draw.line(GRID_X, gy, GRID_X+COLS*CELL, gy, C.grid, 2);
    }

    // Border walls
    game.draw.rect(GRID_X-8, GRID_Y-8, COLS*CELL+16, 8, C.wall, 0.9);
    game.draw.rect(GRID_X-8, GRID_Y+ROWS*CELL, COLS*CELL+16, 8, C.wall, 0.9);
    game.draw.rect(GRID_X-8, GRID_Y-8, 8, ROWS*CELL+16, C.wall, 0.9);
    game.draw.rect(GRID_X+COLS*CELL, GRID_Y-8, 8, ROWS*CELL+16, C.wall, 0.9);

    // Target
    var tpos = cellToXY(target.col, target.row);
    var isHit = laserTrace.hitTarget;
    game.draw.rect(tpos.x-60, tpos.y-60, 120, 120, isHit ? C.targetHi : C.targetOff, 0.3);
    game.draw.circle(tpos.x, tpos.y, 50, isHit ? C.target : C.targetOff, 0.9);
    game.draw.circle(tpos.x, tpos.y, 30, isHit ? C.targetHi : C.targetOff, 0.7);
    game.draw.circle(tpos.x, tpos.y, 14, isHit ? C.hit : C.targetOff, 0.9);

    // Mirrors
    for (var mi2 = 0; mi2 < mirrors.length; mi2++) {
      var m2 = mirrors[mi2];
      var mx = GRID_X + (m2.col+0.5)*CELL;
      var my = GRID_Y + (m2.row+0.5)*CELL;
      // Mirror background
      game.draw.rect(mx-44, my-44, 88, 88, C.mirrorHi, 0.08);
      // Mirror line based on angle
      var ang3 = m2.steps * Math.PI / 4;
      var cos3 = Math.cos(ang3), sin3 = Math.sin(ang3);
      game.draw.line(mx-cos3*50, my-sin3*50, mx+cos3*50, my+sin3*50, C.mirror, 6);
      game.draw.circle(mx, my, 10, C.mirrorHi, 0.7);
    }

    // Laser source indicator
    game.draw.circle(GRID_X - 40, GRID_Y + (srcRow+0.5)*CELL, 20, C.laser, 0.9);
    game.draw.line(GRID_X-20, GRID_Y+(srcRow+0.5)*CELL, GRID_X, GRID_Y+(srcRow+0.5)*CELL, C.laserHi, 4);

    // Draw laser path
    var path2 = laserTrace.path;
    for (var pi2 = 0; pi2 < path2.length-1; pi2++) {
      game.draw.line(path2[pi2].x, path2[pi2].y, path2[pi2+1].x, path2[pi2+1].y, C.laser, 4);
      // Glow
      game.draw.line(path2[pi2].x, path2[pi2].y, path2[pi2+1].x, path2[pi2+1].y, C.laserHi, 2);
    }

    // Hit flash
    if (isHit && hitFlash > 0) {
      game.draw.rect(0, 0, W, H, C.targetHi, hitFlash*0.06);
    }

    // Check if laser hit target this frame and award point
    if (isHit && !done && elapsed > 0.5) {
      // Score on sustained beam — check every second
      if (Math.floor(elapsed) > Math.floor(elapsed - dt)) {
        hits++;
        game.audio.play('se_success', 0.4);
        for (var pi3 = 0; pi3 < 10; pi3++) {
          var ang4 = Math.random()*Math.PI*2;
          particles.push({ x:tpos.x, y:tpos.y, vx:Math.cos(ang4)*200, vy:Math.sin(ang4)*200, life:0.6, col:C.hit });
        }
        if (hits >= NEEDED && !done) {
          done = true;
          setTimeout(function(){ game.end.success(hits*500+Math.ceil(timeLeft)*80); }, 600);
        }
      }
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8*p.life, p.col, p.life*0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.laser : C.laserHi);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
