// 458-laser-mirror.js
// レーザーミラー — ミラーを回転させてレーザーを受信機に当てる
// 操作: タップでミラーを45度回転させる
// 成功: 6面クリア  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030810',
    grid:   '#0a1828',
    laser:  '#ef4444',
    laserHi:'#fca5a5',
    mirror: '#64748b',
    mirrorHi:'#94a3b8',
    receiver:'#22c55e',
    receiverHi:'#bbf7d0',
    receiverOff:'#374151',
    wall:   '#1e40af',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    glow:   '#fbbf24'
  };

  var GRID = 7;
  var CELL = 120;
  var OX = (W - GRID * CELL) / 2;
  var OY = (H - GRID * CELL) / 2 - 40;

  // Level designs
  var levels = [
    {
      source: { x: 0, y: 3, dir: 'right' },
      receiver: { x: 6, y: 3 },
      mirrors: [{ x: 2, y: 3, angle: 45 }, { x: 4, y: 1, angle: 135 }],
      walls: []
    },
    {
      source: { x: 0, y: 1, dir: 'right' },
      receiver: { x: 6, y: 5 },
      mirrors: [{ x: 3, y: 1, angle: 45 }, { x: 3, y: 5, angle: 135 }, { x: 6, y: 1, angle: 45 }],
      walls: [{ x: 1, y: 3 }, { x: 5, y: 3 }]
    },
    {
      source: { x: 3, y: 0, dir: 'down' },
      receiver: { x: 3, y: 6 },
      mirrors: [{ x: 1, y: 2, angle: 45 }, { x: 5, y: 4, angle: 135 }, { x: 3, y: 3, angle: 135 }],
      walls: []
    },
    {
      source: { x: 0, y: 0, dir: 'right' },
      receiver: { x: 6, y: 6 },
      mirrors: [{ x: 2, y: 0, angle: 45 }, { x: 2, y: 4, angle: 135 }, { x: 6, y: 4, angle: 45 }],
      walls: [{ x: 4, y: 2 }]
    },
    {
      source: { x: 0, y: 3, dir: 'right' },
      receiver: { x: 6, y: 3 },
      mirrors: [{ x: 2, y: 3, angle: 135 }, { x: 2, y: 1, angle: 45 }, { x: 4, y: 1, angle: 135 }, { x: 4, y: 5, angle: 45 }],
      walls: []
    },
    {
      source: { x: 0, y: 0, dir: 'right' },
      receiver: { x: 0, y: 6 },
      mirrors: [{ x: 3, y: 0, angle: 45 }, { x: 6, y: 3, angle: 45 }, { x: 3, y: 6, angle: 45 }, { x: 0, y: 3, angle: 45 }],
      walls: [{ x: 3, y: 3 }]
    }
  ];

  var currentLevel = 0;
  var mirrors = [];
  var source = null;
  var receiver = null;
  var walls = [];
  var laserPath = [];
  var solved = 0;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var hitTimer = 0;
  var particles = [];

  function loadLevel(idx) {
    var lv = levels[idx % levels.length];
    source = Object.assign({}, lv.source);
    receiver = Object.assign({}, lv.receiver);
    mirrors = lv.mirrors.map(function(m) { return Object.assign({}, m); });
    walls = (lv.walls || []).map(function(w) { return Object.assign({}, w); });
    computeLaser();
  }

  function computeLaser() {
    laserPath = [];
    var x = source.x;
    var y = source.y;
    var dx = source.dir === 'right' ? 1 : source.dir === 'left' ? -1 : 0;
    var dy = source.dir === 'down' ? 1 : source.dir === 'up' ? -1 : 0;

    var maxSteps = 50;
    laserPath.push({ x: x, y: y });

    while (maxSteps-- > 0) {
      var nx = x + dx;
      var ny = y + dy;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) break;

      // Wall
      var isWall = walls.some(function(w) { return w.x === nx && w.y === ny; });
      if (isWall) break;

      // Mirror
      var mirror = null;
      for (var mi = 0; mi < mirrors.length; mi++) {
        if (mirrors[mi].x === nx && mirrors[mi].y === ny) { mirror = mirrors[mi]; break; }
      }

      if (mirror) {
        laserPath.push({ x: nx, y: ny });
        // Reflect
        var a = mirror.angle;
        if (a === 45) {
          // / mirror: dx<->dy swap with sign flip
          if (dx === 1 && dy === 0) { dx = 0; dy = -1; }
          else if (dx === -1 && dy === 0) { dx = 0; dy = 1; }
          else if (dx === 0 && dy === 1) { dx = -1; dy = 0; }
          else if (dx === 0 && dy === -1) { dx = 1; dy = 0; }
        } else {
          // \ mirror (135): swap with same sign
          if (dx === 1 && dy === 0) { dx = 0; dy = 1; }
          else if (dx === -1 && dy === 0) { dx = 0; dy = -1; }
          else if (dx === 0 && dy === 1) { dx = 1; dy = 0; }
          else if (dx === 0 && dy === -1) { dx = -1; dy = 0; }
        }
        x = nx; y = ny;
      } else {
        x = nx; y = ny;
        laserPath.push({ x: x, y: y });
        if (x === receiver.x && y === receiver.y) {
          hitTimer = 1.0;
          break;
        }
      }
    }
  }

  function isHitting() {
    var last = laserPath[laserPath.length - 1];
    return last && last.x === receiver.x && last.y === receiver.y;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;

    // Rotate mirror at this cell
    for (var mi = 0; mi < mirrors.length; mi++) {
      if (mirrors[mi].x === col && mirrors[mi].y === row) {
        mirrors[mi].angle = mirrors[mi].angle === 45 ? 135 : 45;
        game.audio.play('se_tap', 0.4);
        computeLaser();
        if (isHitting()) {
          solved++;
          game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            var rx = OX + receiver.x * CELL + CELL/2;
            var ry = OY + receiver.y * CELL + CELL/2;
            particles.push({ x: rx, y: ry, vx: Math.cos(ang)*150, vy: Math.sin(ang)*150, life: 0.6, col: C.receiverHi });
          }
          if (solved >= 6 && !done) {
            done = true;
            setTimeout(function() { game.end.success(solved * 600 + Math.ceil(timeLeft) * 80); }, 700);
            return;
          }
          currentLevel++;
          setTimeout(function() { loadLevel(currentLevel); }, 1000);
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

    if (hitTimer > 0) hitTimer -= dt;

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var ri = 0; ri < GRID; ri++) {
      for (var ci = 0; ci < GRID; ci++) {
        game.draw.rect(OX + ci * CELL + 3, OY + ri * CELL + 3, CELL - 6, CELL - 6, C.grid, 0.5);
      }
    }

    // Walls
    for (var wi = 0; wi < walls.length; wi++) {
      var w = walls[wi];
      game.draw.rect(OX + w.x * CELL + 4, OY + w.y * CELL + 4, CELL - 8, CELL - 8, C.wall, 0.9);
    }

    // Source
    var sx = OX + source.x * CELL + CELL/2;
    var sy = OY + source.y * CELL + CELL/2;
    game.draw.circle(sx, sy, 28, C.laser, 0.9);
    game.draw.circle(sx, sy, 16, '#fff', 0.6);

    // Receiver
    var rx = OX + receiver.x * CELL + CELL/2;
    var ry = OY + receiver.y * CELL + CELL/2;
    var rCol = isHitting() ? C.receiver : C.receiverOff;
    game.draw.circle(rx, ry, 32, rCol, 0.9);
    game.draw.circle(rx, ry, 18, isHitting() ? C.receiverHi : C.ui, 0.7);

    // Mirrors
    for (var mi2 = 0; mi2 < mirrors.length; mi2++) {
      var m2 = mirrors[mi2];
      var mx = OX + m2.x * CELL + CELL/2;
      var my = OY + m2.y * CELL + CELL/2;
      game.draw.rect(mx - 40, my - 40, 80, 80, C.mirrorHi, 0.1);
      if (m2.angle === 45) {
        // / shape
        game.draw.line(mx - 36, my + 36, mx + 36, my - 36, C.mirrorHi, 8);
      } else {
        // \ shape
        game.draw.line(mx - 36, my - 36, mx + 36, my + 36, C.mirrorHi, 8);
      }
    }

    // Laser beam
    for (var li = 0; li < laserPath.length - 1; li++) {
      var p1 = laserPath[li];
      var p2 = laserPath[li + 1];
      var lx1 = OX + p1.x * CELL + CELL/2;
      var ly1 = OY + p1.y * CELL + CELL/2;
      var lx2 = OX + p2.x * CELL + CELL/2;
      var ly2 = OY + p2.y * CELL + CELL/2;
      game.draw.line(lx1, ly1, lx2, ly2, C.laserHi, 6);
      game.draw.line(lx1, ly1, lx2, ly2, C.laser, 3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 10 * p3.life, p3.col, p3.life * 0.8);
    }

    game.draw.text('Level ' + (currentLevel + 1) + ' / 6', W/2, H * 0.88, { size: 42, color: C.text });
    game.draw.text(solved + ' / 6', W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.laser : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    loadLevel(0);
  });
})(game);
