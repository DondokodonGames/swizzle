// 143-light-beam.js
// 光線パズル — 鏡を回転させてレーザーを的に当てる空間認識パズル
// 操作: タップで鏡を回転（/ と \ を切替）
// 成功: 1面クリア  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、光学ラボ） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LIGHT BEAM';
  var HOW_TO_PLAY = 'TAP MIRRORS TO AIM THE BEAM AT ★';
  var MAX_TIME = 20;             // 修正2: 60 → 20
  var NEEDED   = 1;              // 修正2: 3 → 1
  var COLS = 7, ROWS = 9, CELL = 136;
  var OX = snap((W - COLS * CELL) / 2), OY = snap(240);

  var LEVELS = [
    { grid: [[0,0,0,0,0,0,0],[0,1,0,0,0,1,0],[4,0,0,0,0,0,0],[0,0,0,1,0,0,0],[0,0,0,0,0,0,5],[0,0,0,0,0,0,0],[0,1,0,0,0,1,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]], mirrors: [{ r:2,c:3,type:2 },{ r:4,c:3,type:3 }] },
    { grid: [[0,0,0,0,0,0,0],[4,0,0,0,0,0,0],[0,0,1,0,1,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,1,0,0,0,1,0],[0,0,0,0,0,0,5],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]], mirrors: [{ r:1,c:4,type:3 },{ r:6,c:4,type:2 }] },
    { grid: [[0,0,4,0,0,0,0],[0,0,0,0,0,0,0],[0,1,0,0,0,1,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,1,0,0,0,1,0],[0,0,0,5,0,0,0],[0,0,0,0,0,0,0]], mirrors: [{ r:2,c:2,type:3 },{ r:2,c:4,type:2 },{ r:7,c:2,type:2 }] }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var level, grid, mirrors, beamPath, targetHit, hitTimer, score, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pl(x1, y1, x2, y2, color, w) {
    var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
    for (var i = 0; i <= steps; i++) {
      var t = i / steps;
      game.draw.rect(snap(x1 + (x2 - x1) * t) - w / 2, snap(y1 + (y2 - y1) * t) - w / 2, w, w, color, 0.9);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function loadLevel(lv) {
    var L = LEVELS[lv % LEVELS.length];
    grid = L.grid.map(function(row) { return row.slice(); });
    mirrors = L.mirrors.map(function(m) { return { r: m.r, c: m.c, type: m.type }; });
    for (var i = 0; i < mirrors.length; i++) grid[mirrors[i].r][mirrors[i].c] = mirrors[i].type;
    computeBeam();
  }

  function computeBeam() {
    beamPath = []; targetHit = false;
    var sr = -1, sc = -1, dx = 1, dy = 0;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] === 4) { sr = r; sc = c; }
    if (sr < 0) return;
    var r2 = sr, c2 = sc;
    beamPath.push({ r: r2, c: c2 });
    for (var step = 0; step < 100; step++) {
      r2 += dy; c2 += dx;
      if (r2 < 0 || r2 >= ROWS || c2 < 0 || c2 >= COLS) break;
      var cell = grid[r2][c2];
      beamPath.push({ r: r2, c: c2 });
      if (cell === 5) { targetHit = true; break; }
      if (cell === 1) break;
      if (cell === 2) { var t = dx; dx = -dy; dy = -t; }
      else if (cell === 3) { var t2 = dx; dx = dy; dy = t2; }
    }
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(OX - 16, OY - 16, COLS * CELL + 32, ROWS * CELL + 32, C.d, 0.4);
    game.draw.rect(OX - 16, OY - 16, COLS * CELL + 32, 8, C.a);
  }

  function drawGrid() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var x = OX + c * CELL, y = OY + r * CELL, cell = grid[r][c];
      game.draw.rect(x + 2, y + 2, CELL - 4, CELL - 4, '#0a0018', 0.7);
      var mx = x + CELL / 2, my = y + CELL / 2;
      if (cell === 1) { game.draw.rect(x + 12, y + 12, CELL - 24, CELL - 24, C.d, 0.9); game.draw.rect(x + 12, y + 12, CELL - 24, 8, C.g, 0.4); }
      else if (cell === 4) { pl(mx, my, mx, my, C.f, 40); txt('▶', mx, my, 40, C.g); }
      else if (cell === 5) {
        var on = Math.floor(game.time.elapsed * 8) % 2 === 0;
        for (var a = 0; a < Math.PI * 2; a += 0.4) game.draw.rect(snap(mx + Math.cos(a) * 40) - 6, snap(my + Math.sin(a) * 40) - 6, 12, 12, on ? C.b : C.d);
        txt('★', mx, my - 8, 44, C.c);
      } else if (cell === 2 || cell === 3) {
        if (cell === 2) pl(x + 24, y + CELL - 24, x + CELL - 24, y + 24, C.c, 16);
        else pl(x + 24, y + 24, x + CELL - 24, y + CELL - 24, C.c, 16);
        txt('/', mx, my - CELL / 2 + 12, 26, C.e);
      }
    }
  }

  function drawBeam() {
    var col = targetHit ? C.b : C.c;
    for (var i = 0; i < beamPath.length - 1; i++) {
      var b1 = beamPath[i], b2 = beamPath[i + 1];
      pl(OX + b1.c * CELL + CELL / 2, OY + b1.r * CELL + CELL / 2, OX + b2.c * CELL + CELL / 2, OY + b2.r * CELL + CELL / 2, col, 10);
    }
  }

  function initGame() {
    level = 0; score = 0; timeLeft = MAX_TIME; done = false; hitTimer = 0;
    loadLevel(0);
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 30) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - OX) / CELL), r = Math.floor((y - OY) / CELL);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    for (var i = 0; i < mirrors.length; i++) {
      if (mirrors[i].r === r && mirrors[i].c === c) {
        mirrors[i].type = mirrors[i].type === 2 ? 3 : 2;
        grid[r][c] = mirrors[i].type;
        game.audio.play('se_tap', 0.5);
        computeBeam();
        if (targetHit) {
          hitTimer = 0.6; score++;
          game.audio.play('se_success');
          if (score >= NEEDED) { finish(true); return; }
          level++;
          setTimeout(function() { if (state === S.PLAYING && !done) loadLevel(level); }, 700);
        }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGrid(); drawBeam();
      txt(GAME_TITLE, W / 2, H * 0.08, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.90, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄  TAP TO START', W / 2, H * 0.95, 44, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BEAM LOCKED!' : 'TIME OUT', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }
    if (hitTimer > 0) hitTimer -= dt;

    background(); drawGrid(); drawBeam();
    if (hitTimer > 0) game.draw.rect(0, 0, W, H, C.b, hitTimer * 0.25);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    txt('TAP MIRRORS', W / 2, H - 120, 40, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
