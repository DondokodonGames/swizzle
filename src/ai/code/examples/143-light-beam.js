// 143-light-beam.js
// 光線パズル — 鏡を回転させてレーザーを的に当てる空間認識パズル
// 操作: タップで鏡を90度回転
// 成功: 5面クリア  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020610',
    beam:    '#06b6d4',
    beamGlow:'#67e8f9',
    mirror:  '#f59e0b',
    mirrorHi:'#fbbf24',
    wall:    '#1e3a5f',
    wallHi:  '#2563eb',
    target:  '#22c55e',
    targetHi:'#86efac',
    hit:     '#f0fdf4',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var CELL = 140;
  var COLS = 7;
  var ROWS = 9;
  var OX = (W - COLS * CELL) / 2;
  var OY = H * 0.14;

  // Grid-based puzzle: 0=empty, 1=wall, 2=mirror/, 3=mirror\, 4=source, 5=target
  var LEVELS = [
    {
      grid: [
        [0,0,0,0,0,0,0],
        [0,1,0,0,0,1,0],
        [4,0,0,0,0,0,0],
        [0,0,0,1,0,0,0],
        [0,0,0,0,0,0,5],
        [0,0,0,0,0,0,0],
        [0,1,0,0,0,1,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0]
      ],
      mirrors: [{r:2,c:3,type:2},{r:4,c:3,type:3}]
    },
    {
      grid: [
        [0,0,0,0,0,0,0],
        [4,0,0,0,0,0,0],
        [0,0,1,0,1,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,1,0,0,0,1,0],
        [0,0,0,0,0,0,5],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0]
      ],
      mirrors: [{r:1,c:4,type:3},{r:6,c:4,type:2}]
    },
    {
      grid: [
        [0,0,4,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,1,0,0,0,1,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0],
        [0,1,0,0,0,1,0],
        [0,0,0,5,0,0,0],
        [0,0,0,0,0,0,0]
      ],
      mirrors: [{r:2,c:2,type:3},{r:2,c:4,type:2},{r:7,c:2,type:2}]
    }
  ];

  var level = 0;
  var grid = [];
  var mirrors = [];
  var beamPath = [];
  var targetHit = false;
  var hitTimer = 0;
  var score = 0;
  var needed = 3;
  var timeLeft = 60;
  var done = false;

  function loadLevel(lv) {
    var L = LEVELS[lv % LEVELS.length];
    grid = L.grid.map(function(row) { return row.slice(); });
    mirrors = L.mirrors.map(function(m) { return {r:m.r, c:m.c, type:m.type}; });
    // Place mirrors in grid
    for (var mi = 0; mi < mirrors.length; mi++) {
      grid[mirrors[mi].r][mirrors[mi].c] = mirrors[mi].type;
    }
    computeBeam();
  }

  function computeBeam() {
    beamPath = [];
    targetHit = false;
    // Find source
    var srcR = -1, srcC = -1, dx = 1, dy = 0;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c] === 4) { srcR = r; srcC = c; }
      }
    }
    if (srcR < 0) return;
    var r2 = srcR, c2 = srcC;
    beamPath.push({r: r2, c: c2});
    for (var step = 0; step < 100; step++) {
      r2 += dy; c2 += dx;
      if (r2 < 0 || r2 >= ROWS || c2 < 0 || c2 >= COLS) break;
      var cell = grid[r2][c2];
      beamPath.push({r: r2, c: c2});
      if (cell === 5) { targetHit = true; break; }
      if (cell === 1) break;
      if (cell === 2) { // mirror /
        var tmp = dx; dx = -dy; dy = -tmp;
      } else if (cell === 3) { // mirror \
        var tmp2 = dx; dx = dy; dy = tmp2;
      }
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var c = Math.floor((tx - OX) / CELL);
    var r = Math.floor((ty - OY) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    // Find mirror at this cell
    for (var mi = 0; mi < mirrors.length; mi++) {
      if (mirrors[mi].r === r && mirrors[mi].c === c) {
        mirrors[mi].type = mirrors[mi].type === 2 ? 3 : 2;
        grid[r][c] = mirrors[mi].type;
        game.audio.play('se_tap', 0.5);
        computeBeam();
        if (targetHit) {
          hitTimer = 0.6;
          game.audio.play('se_success');
          score++;
          if (score >= needed && !done) {
            done = true;
            setTimeout(function() { game.end.success(score*100 + Math.ceil(timeLeft)*20); }, 700);
            return;
          }
          setTimeout(function() { level++; loadLevel(level); }, 700);
        }
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }
    if (hitTimer > 0) hitTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Grid
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = OX + c * CELL;
        var y = OY + r * CELL;
        game.draw.rect(x+1, y+1, CELL-2, CELL-2, '#030810', 0.6);
        var cell = grid[r][c];
        if (cell === 1) {
          game.draw.rect(x+2, y+2, CELL-4, CELL-4, C.wall, 0.9);
          game.draw.rect(x+2, y+2, CELL-4, 8, C.wallHi, 0.8);
        } else if (cell === 4) {
          game.draw.circle(x+CELL/2, y+CELL/2, 32, C.beam, 0.8);
          game.draw.circle(x+CELL/2, y+CELL/2, 18, C.beamGlow, 1.0);
          game.draw.text('▶', x+CELL/2, y+CELL/2, { size: 28, color: '#fff', bold: true });
        } else if (cell === 5) {
          var pulse = 0.6 + 0.4*Math.abs(Math.sin(timeLeft*3));
          game.draw.circle(x+CELL/2, y+CELL/2, 36, C.targetHi, pulse * 0.4);
          game.draw.circle(x+CELL/2, y+CELL/2, 24, C.target, 0.9);
          game.draw.text('★', x+CELL/2, y+CELL/2, { size: 28, color: '#fff' });
        } else if (cell === 2 || cell === 3) {
          // Mirror
          var mx = x + CELL/2, my = y + CELL/2;
          var isSlash = cell === 2;
          game.draw.circle(mx, my, 30, C.mirror, 0.3);
          if (isSlash) {
            game.draw.line(x+16, y+CELL-16, x+CELL-16, y+16, C.mirror, 8);
            game.draw.line(x+20, y+CELL-20, x+CELL-20, y+20, C.mirrorHi, 3);
          } else {
            game.draw.line(x+16, y+16, x+CELL-16, y+CELL-16, C.mirror, 8);
            game.draw.line(x+20, y+20, x+CELL-20, y+CELL-20, C.mirrorHi, 3);
          }
          // Tap hint
          game.draw.text('↻', mx, my - 28, { size: 24, color: C.mirrorHi, bold: true });
        }
      }
    }

    // Beam
    var beamAlpha = targetHit ? 1.0 : 0.7;
    var beamColor = targetHit ? C.beamGlow : C.beam;
    for (var bi = 0; bi < beamPath.length - 1; bi++) {
      var b1 = beamPath[bi], b2 = beamPath[bi+1];
      var x1 = OX + b1.c * CELL + CELL/2;
      var y1 = OY + b1.r * CELL + CELL/2;
      var x2 = OX + b2.c * CELL + CELL/2;
      var y2 = OY + b2.r * CELL + CELL/2;
      game.draw.line(x1, y1, x2, y2, beamColor, 10);
      game.draw.line(x1, y1, x2, y2, '#fff', 3);
    }

    // Hit flash
    if (hitTimer > 0) {
      game.draw.rect(0, 0, W, H, C.target, hitTimer * 0.25);
    }

    // Score
    game.draw.text('面: ' + score + ' / ' + needed, W/2, 148, { size: 56, color: '#f1f5f9', bold: true });
    game.draw.text('鏡をタップで回転', W/2, H * 0.88, { size: 44, color: C.ui });

    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.beam : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    loadLevel(0);
  });
})(game);
