// 688-lights-out.js
// ライツアウト — タップでタイルと隣接マスを反転させ、全マスを同じ色に揃える
// 操作: タイルをタップすると自身と上下左右が反転。盤面を全点灯か全消灯に
// 成功: 3パズル 解決  失敗: 28秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、タイル盤） ──
  var C = { bg:'#03060a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LIGHTS OUT';
  var HOW_TO_PLAY = 'TAP A TILE TO FLIP IT AND ITS NEIGHBORS · MAKE THE WHOLE BOARD MATCH';
  var MAX_TIME = 28;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var N = 5, CELL = 180, GAP = 10;
  var GRID_W = N * CELL + (N - 1) * GAP, GRID_H = N * CELL + (N - 1) * GAP;
  var GRID_X = snap((W - GRID_W) / 2), GRID_Y = snap((H - GRID_H) / 2 + 40);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, solved, moves, animFlash, timeLeft, done, particles, flash, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#05090f');
  }

  function background() { game.draw.clear(C.bg); }

  function cellX(c) { return GRID_X + c * (CELL + GAP); }
  function cellY(r) { return GRID_Y + r * (CELL + GAP); }

  function makeGrid(n) { var g = []; for (var i = 0; i < n * n; i++) g.push(0); return g; }
  function flipCell(g, r, c) { if (r < 0 || r >= N || c < 0 || c >= N) return; g[r * N + c] ^= 1; }
  function applyMove(g, r, c) { flipCell(g, r, c); flipCell(g, r - 1, c); flipCell(g, r + 1, c); flipCell(g, r, c - 1); flipCell(g, r, c + 1); }
  function isSolved(g) { var first = g[0]; for (var i = 1; i < g.length; i++) if (g[i] !== first) return false; return true; }

  function newPuzzle() {
    grid = makeGrid(N);
    var st = solved % 2 === 0 ? 0 : 1;
    for (var i = 0; i < N * N; i++) grid[i] = st;
    var numMoves = 6 + Math.floor(Math.random() * 5);
    for (var m = 0; m < numMoves; m++) applyMove(grid, Math.floor(Math.random() * N), Math.floor(Math.random() * N));
    if (isSolved(grid)) applyMove(grid, 0, 0);
    moves = 0; animFlash = [];
  }

  function initGame() { solved = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; resultText = ''; resultTimer = 0; newPuzzle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (solved * 900 + Math.ceil(timeLeft) * 100) : solved * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
      var cx = cellX(c), cy = cellY(r), isOn = grid[r * N + c] === 1, isFlash = false;
      for (var fi = 0; fi < animFlash.length; fi++) if (animFlash[fi].r === r && animFlash[fi].c === c) { isFlash = true; break; }
      var col2 = isFlash ? C.g : (isOn ? C.c : '#0f172a');
      game.draw.rect(cx, cy, CELL, CELL, col2, isOn ? 0.9 : 0.85);
      if (isOn) { game.draw.rect(cx, cy, CELL, 10, C.g, 0.4); pc(cx + CELL / 2, cy + CELL / 2, CELL * 0.22, C.g, 0.15); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - GRID_X) / (CELL + GAP)), row = Math.floor((ty - GRID_Y) / (CELL + GAP));
    if (col < 0 || col >= N || row < 0 || row >= N) return;
    if ((tx - GRID_X) - col * (CELL + GAP) > CELL || (ty - GRID_Y) - row * (CELL + GAP) > CELL) return;
    applyMove(grid, row, col); moves++; game.audio.play('se_tap', 0.1);
    animFlash = [{ r: row, c: col }, { r: row - 1, c: col }, { r: row + 1, c: col }, { r: row, c: col - 1 }, { r: row, c: col + 1 }];
    setTimeout(function() { animFlash = []; }, 150);
    if (isSolved(grid)) {
      solved++; flash = 0.4; resultText = 'SOLVED!  ' + moves + ' MOVES'; resultTimer = 0.8; game.audio.play('se_success', 0.75);
      for (var p = 0; p < 10; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(pa) * 250, vy: Math.sin(pa) * 250, life: 0.6, col: C.c }); }
      if (solved >= NEEDED) { finish(true); return; }
      setTimeout(newPuzzle, 900);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL CLEAR!' : 'TIME UP', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(GRID_Y + GRID_H + 80), 52, C.b);
    else txt('MATCH ALL TILES', W / 2, snap(GRID_Y - 70), 36, '#ffffff44');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
