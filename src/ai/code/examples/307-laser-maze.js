// 307-laser-maze.js
// レーザー迷路 — タップでミラーを回転させてレーザーをゴールに導く
// 操作: ミラーをタップするたびに45度回転
// 成功: 8つのパズルを解く  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020810',
    board:  '#060e1c',
    boardHi:'#0d1f36',
    laser:  '#ef4444',
    laserHi:'#fca5a5',
    mirror: '#60a5fa',
    mirrorHi:'#93c5fd',
    goal:   '#22c55e',
    goalHi: '#86efac',
    wall:   '#1e3a5f',
    wallHi: '#254e80',
    source: '#f59e0b',
    sourceHi:'#fde68a',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var GRID = 7;
  var CELL = Math.floor(W * 0.86 / GRID);
  var OX = Math.floor((W - CELL * GRID) / 2);
  var OY = H * 0.22;

  var solved = 0;
  var NEEDED = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var successFlash = 0;

  // Puzzle state
  var laserSource = { gx: 0, gy: 3, dir: 0 }; // dir: 0=right,1=down,2=left,3=up
  var goalPos = { gx: 6, gy: 3 };
  var mirrors = []; // {gx, gy, angle} angle: 0=/, 1=\
  var walls = [];
  var laserPath = [];

  function makePuzzle() {
    // Simple handcrafted puzzles (looped)
    var puzzles = [
      // Puzzle: source left → mirror → down → goal
      {
        source: { gx: 0, gy: 2, dir: 0 },
        goal: { gx: 3, gy: 6 },
        mirrors: [{ gx: 3, gy: 2, angle: 1 }], // \ deflects right→down
        walls: []
      },
      {
        source: { gx: 0, gy: 4, dir: 0 },
        goal: { gx: 5, gy: 0 },
        mirrors: [{ gx: 5, gy: 4, angle: 0 }], // / deflects right→up
        walls: [{ gx: 2, gy: 4 }, { gx: 3, gy: 4 }]
      },
      {
        source: { gx: 1, gy: 0, dir: 1 },
        goal: { gx: 6, gy: 3 },
        mirrors: [{ gx: 1, gy: 3, angle: 0 }],
        walls: []
      },
      {
        source: { gx: 0, gy: 1, dir: 0 },
        goal: { gx: 3, gy: 5 },
        mirrors: [{ gx: 3, gy: 1, angle: 1 }, { gx: 3, gy: 3, angle: 0 }],
        walls: []
      },
      {
        source: { gx: 6, gy: 2, dir: 2 },
        goal: { gx: 2, gy: 6 },
        mirrors: [{ gx: 2, gy: 2, angle: 1 }],
        walls: []
      },
      {
        source: { gx: 0, gy: 5, dir: 0 },
        goal: { gx: 4, gy: 0 },
        mirrors: [{ gx: 4, gy: 5, angle: 0 }, { gx: 4, gy: 2, angle: 0 }],
        walls: [{ gx: 4, gy: 4 }, { gx: 4, gy: 3 }]
      },
      {
        source: { gx: 3, gy: 0, dir: 1 },
        goal: { gx: 6, gy: 4 },
        mirrors: [{ gx: 3, gy: 4, angle: 0 }],
        walls: [{ gx: 1, gy: 4 }, { gx: 2, gy: 4 }]
      },
      {
        source: { gx: 0, gy: 3, dir: 0 },
        goal: { gx: 3, gy: 6 },
        mirrors: [{ gx: 3, gy: 3, angle: 1 }],
        walls: [{ gx: 1, gy: 3 }, { gx: 2, gy: 3 }]
      }
    ];
    var p = puzzles[solved % puzzles.length];
    laserSource = { gx: p.source.gx, gy: p.source.gy, dir: p.source.dir };
    goalPos = { gx: p.goal.gx, gy: p.goal.gy };
    mirrors = p.mirrors.map(function(m) { return { gx: m.gx, gy: m.gy, angle: m.angle }; });
    walls = p.walls ? p.walls.slice() : [];
  }

  function gridToPixel(gx, gy) {
    return { x: OX + gx * CELL + CELL / 2, y: OY + gy * CELL + CELL / 2 };
  }

  function traceLaser() {
    laserPath = [];
    var x = laserSource.gx;
    var y = laserSource.gy;
    var dirs = [[1,0],[0,1],[-1,0],[0,-1]]; // right,down,left,up
    var dx = dirs[laserSource.dir][0];
    var dy = dirs[laserSource.dir][1];
    var MAX_STEPS = 50;
    var startPx = gridToPixel(x, y);
    laserPath.push({ x: startPx.x, y: startPx.y });

    for (var step = 0; step < MAX_STEPS; step++) {
      x += dx;
      y += dy;
      if (x < 0 || x >= GRID || y < 0 || y >= GRID) {
        var px = gridToPixel(Math.max(0, Math.min(GRID-1, x)), Math.max(0, Math.min(GRID-1, y)));
        laserPath.push({ x: px.x, y: px.y });
        break;
      }
      // Check wall
      var hitWall = false;
      for (var wi = 0; wi < walls.length; wi++) {
        if (walls[wi].gx === x && walls[wi].gy === y) { hitWall = true; break; }
      }
      if (hitWall) {
        var wpx = gridToPixel(x - dx, y - dy);
        laserPath.push({ x: wpx.x, y: wpx.y });
        break;
      }
      // Check mirror
      var hitMirror = null;
      for (var mi = 0; mi < mirrors.length; mi++) {
        if (mirrors[mi].gx === x && mirrors[mi].gy === y) { hitMirror = mirrors[mi]; break; }
      }
      var mpx = gridToPixel(x, y);
      laserPath.push({ x: mpx.x, y: mpx.y });
      if (hitMirror) {
        // Reflect: angle 0=/ angle 1=\
        if (hitMirror.angle === 0) {
          // / mirror: right→up, down→left, left→down, up→right
          var temp = dx;
          dx = -dy;
          dy = -temp;
        } else {
          // \ mirror: right→down, up→left, left→up, down→right
          var temp2 = dx;
          dx = dy;
          dy = temp2;
        }
      }
      // Check goal
      if (x === goalPos.gx && y === goalPos.gy) {
        return true; // hit goal
      }
    }
    return false;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Check if tapping a mirror
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m = mirrors[mi];
      var px = gridToPixel(m.gx, m.gy);
      if (Math.abs(tx - px.x) < CELL * 0.6 && Math.abs(ty - px.y) < CELL * 0.6) {
        m.angle = 1 - m.angle; // toggle / and \
        game.audio.play('se_tap', 0.3);
        // Check if solved
        if (traceLaser()) {
          solved++;
          successFlash = 0.8;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 10; pi++) {
            var gpx = gridToPixel(goalPos.gx, goalPos.gy);
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: gpx.x, y: gpx.y, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.7, col: C.goalHi });
          }
          if (solved >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(solved * 400 + Math.ceil(timeLeft) * 80); }, 600);
            return;
          }
          setTimeout(function() { if (!done) makePuzzle(); }, 700);
        }
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

    if (successFlash > 0) successFlash -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var laserHit = traceLaser();

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Board
    game.draw.rect(OX - 8, OY - 8, GRID * CELL + 16, GRID * CELL + 16, C.wallHi, 0.4);
    game.draw.rect(OX, OY, GRID * CELL, GRID * CELL, C.board, 0.9);

    // Grid lines
    for (var gi = 0; gi <= GRID; gi++) {
      game.draw.line(OX + gi * CELL, OY, OX + gi * CELL, OY + GRID * CELL, C.boardHi, 1);
      game.draw.line(OX, OY + gi * CELL, OX + GRID * CELL, OY + gi * CELL, C.boardHi, 1);
    }

    // Walls
    for (var wi2 = 0; wi2 < walls.length; wi2++) {
      var wp2 = gridToPixel(walls[wi2].gx, walls[wi2].gy);
      game.draw.rect(wp2.x - CELL / 2, wp2.y - CELL / 2, CELL, CELL, C.wall, 0.9);
      game.draw.rect(wp2.x - CELL / 2, wp2.y - CELL / 2, CELL, 6, C.wallHi, 0.6);
    }

    // Goal
    var goalPx = gridToPixel(goalPos.gx, goalPos.gy);
    game.draw.rect(goalPx.x - CELL / 2 + 4, goalPx.y - CELL / 2 + 4, CELL - 8, CELL - 8, C.goal, laserHit ? 0.8 : 0.3);
    game.draw.circle(goalPx.x, goalPx.y, CELL * 0.25, C.goalHi, laserHit ? 0.9 : 0.4);

    // Mirrors
    for (var mi2 = 0; mi2 < mirrors.length; mi2++) {
      var m2 = mirrors[mi2];
      var mpx2 = gridToPixel(m2.gx, m2.gy);
      game.draw.rect(mpx2.x - CELL / 2 + 4, mpx2.y - CELL / 2 + 4, CELL - 8, CELL - 8, C.mirrorHi, 0.15);
      // Draw mirror line
      var mLen = CELL * 0.4;
      if (m2.angle === 0) {
        // / mirror
        game.draw.line(mpx2.x - mLen, mpx2.y + mLen, mpx2.x + mLen, mpx2.y - mLen, C.mirrorHi, 8);
        game.draw.line(mpx2.x - mLen, mpx2.y + mLen, mpx2.x + mLen, mpx2.y - mLen, C.mirror, 4);
      } else {
        // \ mirror
        game.draw.line(mpx2.x - mLen, mpx2.y - mLen, mpx2.x + mLen, mpx2.y + mLen, C.mirrorHi, 8);
        game.draw.line(mpx2.x - mLen, mpx2.y - mLen, mpx2.x + mLen, mpx2.y + mLen, C.mirror, 4);
      }
    }

    // Laser source
    var spx = gridToPixel(laserSource.gx, laserSource.gy);
    game.draw.circle(spx.x, spx.y, CELL * 0.35, C.source, 0.9);
    game.draw.circle(spx.x, spx.y, CELL * 0.2, C.sourceHi, 0.8);

    // Laser beam
    if (laserPath.length > 1) {
      for (var li = 0; li < laserPath.length - 1; li++) {
        var la = laserPath[li], lb = laserPath[li + 1];
        game.draw.line(la.x, la.y, lb.x, lb.y, C.laser, 6);
        game.draw.line(la.x, la.y, lb.x, lb.y, C.laserHi, 2);
      }
    }

    // Success flash
    if (successFlash > 0) {
      game.draw.rect(OX, OY, GRID * CELL, GRID * CELL, C.goalHi, successFlash * 0.3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text('ミラーをタップで回転', W / 2, H * 0.88, { size: 38, color: C.ui });
    game.draw.text(solved + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.laser : C.goal);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    makePuzzle();
  });
})(game);
