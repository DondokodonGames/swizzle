// 428-mirror-maze.js
// 鏡の迷路 — 光線を反射させてターゲットに当てる
// 操作: タップで鏡の向きを切り替え(45°/-45°)
// 成功: 5面クリア  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030810',
    wall:   '#1e293b',
    wallHi: '#334155',
    mirror: '#7dd3fc',
    mirrorHi:'#e0f2fe',
    beam:   '#fbbf24',
    beamHi: '#fff',
    source: '#f97316',
    sourceHi:'#fed7aa',
    target: '#22c55e',
    targetHi:'#bbf7d0',
    targetHit:'#86efac',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var GRID = 6;
  var CELL = 155;
  var OX = (W - GRID * CELL) / 2;
  var OY = (H - GRID * CELL) / 2 - 40;

  var levels = [
    // Each level: { source: {col,row,dir}, target: {col,row}, mirrors: [{col,row,angle}] }
    { source:{col:0,row:2,dir:'right'}, target:{col:5,row:2}, mirrors:[{col:2,row:2,a:1},{col:4,row:0,a:-1}] },
    { source:{col:0,row:0,dir:'right'}, target:{col:5,row:5}, mirrors:[{col:2,row:0,a:-1},{col:2,row:4,a:1},{col:4,row:4,a:-1}] },
    { source:{col:3,row:0,dir:'down'}, target:{col:0,row:5}, mirrors:[{col:3,row:3,a:1},{col:1,row:3,a:1}] },
    { source:{col:0,row:5,dir:'right'}, target:{col:5,row:0}, mirrors:[{col:2,row:5,a:-1},{col:2,row:2,a:-1},{col:5,row:2,a:1}] },
    { source:{col:0,row:3,dir:'right'}, target:{col:3,row:0}, mirrors:[{col:1,row:3,a:-1},{col:1,row:1,a:1},{col:3,row:1,a:-1}] }
  ];

  var currentLevel = 0;
  var mirrors = [];
  var solved = 0;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var beam = [];  // ray segments
  var hitTarget = false;

  function loadLevel(idx) {
    var lv = levels[idx % levels.length];
    mirrors = lv.mirrors.map(function(m) { return { col: m.col, row: m.row, a: m.a }; });
    traceBeam();
  }

  function traceBeam() {
    var lv = levels[currentLevel % levels.length];
    var src = lv.source;
    beam = [];
    hitTarget = false;

    var x = src.col;
    var y = src.row;
    var dirs = { right:[1,0], left:[-1,0], up:[0,-1], down:[0,1] };
    var dx = dirs[src.dir][0];
    var dy = dirs[src.dir][1];

    var px = OX + x * CELL + CELL/2;
    var py = OY + y * CELL + CELL/2;

    for (var step = 0; step < 30; step++) {
      var nx = x + dx;
      var ny = y + dy;

      // Out of bounds
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
        beam.push({ x1: px, y1: py, x2: OX + nx * CELL + CELL/2, y2: OY + ny * CELL + CELL/2 });
        break;
      }

      var npx = OX + nx * CELL + CELL/2;
      var npy = OY + ny * CELL + CELL/2;

      // Check for mirror
      var mirrorHit = null;
      for (var mi = 0; mi < mirrors.length; mi++) {
        if (mirrors[mi].col === nx && mirrors[mi].row === ny) { mirrorHit = mirrors[mi]; break; }
      }

      beam.push({ x1: px, y1: py, x2: npx, y2: npy });

      if (mirrorHit) {
        // Reflect
        if (mirrorHit.a === 1) {  // /  mirror
          var tmp = dx; dx = -dy; dy = -tmp;
        } else {                   // \  mirror
          var tmp2 = dx; dx = dy; dy = tmp2;
        }
      }

      // Check target
      if (nx === lv.target.col && ny === lv.target.row) {
        hitTarget = true;
        break;
      }

      x = nx; y = ny;
      px = npx; py = npy;
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var col = Math.floor((tx - OX) / CELL);
    var row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;

    for (var mi = 0; mi < mirrors.length; mi++) {
      if (mirrors[mi].col === col && mirrors[mi].row === row) {
        mirrors[mi].a *= -1;  // toggle between / and \
        game.audio.play('se_tap', 0.3);
        traceBeam();
        if (hitTarget) {
          solved++;
          flashAnim = 0.8;
          game.audio.play('se_success', 0.7);
          if (solved >= 5 && !done) {
            done = true;
            setTimeout(function() { game.end.success(solved * 800 + Math.ceil(timeLeft) * 80); }, 700);
            return;
          }
          currentLevel++;
          setTimeout(function() { loadLevel(currentLevel); }, 900);
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

    if (flashAnim > 0) flashAnim -= dt * 2;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    var lv = levels[currentLevel % levels.length];

    // Grid
    for (var r = 0; r < GRID; r++) {
      for (var c = 0; c < GRID; c++) {
        var cx = OX + c * CELL;
        var cy = OY + r * CELL;
        game.draw.rect(cx + 2, cy + 2, CELL - 4, CELL - 4, C.wall, 0.4);
      }
    }

    // Beam
    for (var bi = 0; bi < beam.length; bi++) {
      var b = beam[bi];
      game.draw.line(b.x1, b.y1, b.x2, b.y2, C.beamHi, 3);
      game.draw.line(b.x1, b.y1, b.x2, b.y2, C.beam, 6);
    }

    // Source
    var sx = OX + lv.source.col * CELL + CELL/2;
    var sy = OY + lv.source.row * CELL + CELL/2;
    game.draw.circle(sx, sy, 32, C.sourceHi, 0.3);
    game.draw.circle(sx, sy, 24, C.source, 0.9);
    game.draw.circle(sx, sy, 14, C.sourceHi, 0.8);

    // Target
    var tx2 = OX + lv.target.col * CELL + CELL/2;
    var ty2 = OY + lv.target.row * CELL + CELL/2;
    var tCol = hitTarget ? C.targetHit : C.target;
    game.draw.circle(tx2, ty2, 34, tCol, 0.2);
    game.draw.circle(tx2, ty2, 26, tCol, hitTarget ? 0.9 : 0.5);
    game.draw.circle(tx2, ty2, 14, C.targetHi, hitTarget ? 0.9 : 0.3);

    // Mirrors
    for (var mi = 0; mi < mirrors.length; mi++) {
      var m = mirrors[mi];
      var mx = OX + m.col * CELL + CELL/2;
      var my = OY + m.row * CELL + CELL/2;
      var mLen = CELL * 0.45;
      if (m.a === 1) {  // / mirror
        game.draw.line(mx - mLen, my + mLen, mx + mLen, my - mLen, C.mirror, 6);
        game.draw.line(mx - mLen, my + mLen, mx + mLen, my - mLen, C.mirrorHi, 2);
      } else {           // \ mirror
        game.draw.line(mx - mLen, my - mLen, mx + mLen, my + mLen, C.mirror, 6);
        game.draw.line(mx - mLen, my - mLen, mx + mLen, my + mLen, C.mirrorHi, 2);
      }
      game.draw.text('tap', mx, my + 12, { size: 24, color: C.ui });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.1);

    // Progress
    for (var si = 0; si < 5; si++) {
      game.draw.circle(W/2 - 4*44 + si*88, H*0.88, 22, si < solved ? C.correct : C.ui, 0.9);
    }

    game.draw.text(solved + ' / 5', W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.beam : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    loadLevel(0);
  });
})(game);
