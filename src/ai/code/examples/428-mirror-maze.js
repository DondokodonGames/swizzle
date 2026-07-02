// 428-mirror-maze.js
// 鏡の迷路 — 盤上の鏡をタップで「／」「＼」に切り替え、光源のビームを反射させてターゲットに当てる
// 操作: 鏡をタップして向きを反転（ビームがゴールに届けばクリア）
// 成功: 2面 クリア  失敗: 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、光学迷路） ──
  var C = { bg:'#010803', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR MAZE';
  var HOW_TO_PLAY = 'TAP MIRRORS TO STEER THE BEAM INTO THE TARGET';
  var MAX_TIME = 25;
  var NEEDED   = 2;          // 修正2: 5 → 2
  var GRID = 6, CELL = snap(W * 0.15), OX = snap((W - GRID * snap(W * 0.15)) / 2), OY = snap((H - GRID * snap(W * 0.15)) / 2);

  var levels = [
    { source: { col: 0, row: 2, dir: 'right' }, target: { col: 5, row: 2 }, mirrors: [{ col: 2, row: 2, a: 1 }, { col: 4, row: 0, a: -1 }] },
    { source: { col: 0, row: 0, dir: 'right' }, target: { col: 5, row: 5 }, mirrors: [{ col: 2, row: 0, a: -1 }, { col: 2, row: 4, a: 1 }, { col: 4, row: 4, a: -1 }] },
    { source: { col: 3, row: 0, dir: 'down' }, target: { col: 0, row: 5 }, mirrors: [{ col: 3, row: 3, a: 1 }, { col: 1, row: 3, a: 1 }] }
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var currentLevel, mirrors, beam, hitTarget, solved, timeLeft, done, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0c');
  }

  function background() { game.draw.clear(C.bg); }

  function loadLevel(idx) { var lv = levels[idx % levels.length]; mirrors = lv.mirrors.map(function(m) { return { col: m.col, row: m.row, a: m.a }; }); traceBeam(); }

  function traceBeam() {
    var lv = levels[currentLevel % levels.length], src = lv.source; beam = []; hitTarget = false;
    var x = src.col, y = src.row, dirs = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] }, dx = dirs[src.dir][0], dy = dirs[src.dir][1];
    var px = OX + x * CELL + CELL / 2, py = OY + y * CELL + CELL / 2;
    for (var step = 0; step < 30; step++) {
      var nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) { beam.push({ x1: px, y1: py, x2: OX + nx * CELL + CELL / 2, y2: OY + ny * CELL + CELL / 2 }); break; }
      var npx = OX + nx * CELL + CELL / 2, npy = OY + ny * CELL + CELL / 2, mh = null;
      for (var mi = 0; mi < mirrors.length; mi++) if (mirrors[mi].col === nx && mirrors[mi].row === ny) { mh = mirrors[mi]; break; }
      beam.push({ x1: px, y1: py, x2: npx, y2: npy });
      if (mh) { if (mh.a === 1) { var t = dx; dx = -dy; dy = -t; } else { var t2 = dx; dx = dy; dy = t2; } }
      if (nx === lv.target.col && ny === lv.target.row) { hitTarget = true; break; }
      x = nx; y = ny; px = npx; py = npy;
    }
  }

  function initGame() { currentLevel = 0; solved = 0; timeLeft = MAX_TIME; done = false; flash = 0; loadLevel(0); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (solved * 900 + Math.ceil(timeLeft) * 100) : solved * 400;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    var lv = levels[currentLevel % levels.length];
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) game.draw.rect(OX + c * CELL + 2, OY + r * CELL + 2, CELL - 4, CELL - 4, '#0a1a0c', 0.5);
    for (var bi = 0; bi < beam.length; bi++) pline(beam[bi].x1, beam[bi].y1, beam[bi].x2, beam[bi].y2, C.a, 0.9, 6);
    pc(OX + lv.source.col * CELL + CELL / 2, OY + lv.source.row * CELL + CELL / 2, CELL * 0.28, C.f, 0.9);
    var tc = hitTarget ? C.b : C.d; pc(OX + lv.target.col * CELL + CELL / 2, OY + lv.target.row * CELL + CELL / 2, CELL * 0.3, tc, hitTarget ? 0.9 : 0.5);
    for (var mi = 0; mi < mirrors.length; mi++) { var m = mirrors[mi], mx = OX + m.col * CELL + CELL / 2, my = OY + m.row * CELL + CELL / 2, ml = CELL * 0.42; if (m.a === 1) pline(mx - ml, my + ml, mx + ml, my - ml, C.e, 0.95, 8); else pline(mx - ml, my - ml, mx + ml, my + ml, C.e, 0.95, 8); pc(mx, my, 6, C.g, 0.6); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - OX) / CELL), r = Math.floor((y - OY) / CELL); if (c < 0 || c >= GRID || r < 0 || r >= GRID) return;
    for (var mi = 0; mi < mirrors.length; mi++) if (mirrors[mi].col === c && mirrors[mi].row === r) { mirrors[mi].a *= -1; game.audio.play('se_tap', 0.3); traceBeam(); if (hitTarget) { solved++; flash = 0.8; game.audio.play('se_success', 0.7); if (solved >= NEEDED) { finish(true); return; } currentLevel++; setTimeout(function() { if (!done && state === S.PLAYING) loadLevel(currentLevel); }, 800); } return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!mirrors) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.15, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BEAM ON TARGET!' : 'TIME OUT', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
    }

    // ---- 描画 ----
    background(); drawBoard();
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
