// 503-pixel-paint.js
// ピクセルペイント — 左のお手本ドット絵を見て、右のグリッドをなぞって同じ絵を塗る
// 操作: 右半分のマスをタップで塗り替え or スワイプでなぞって塗る（90%一致で完成）
// 成功: 2枚 完成  失敗: 30秒 タイムアップ

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ドット絵工房） ──
  var C = { bg:'#080808', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIXEL PAINT';
  var HOW_TO_PLAY = 'PAINT THE RIGHT GRID TO MATCH THE MODEL (90%)';
  var MAX_TIME = 30;
  var NEEDED   = 2;          // 修正2: 3 → 2
  var GRID = 6, CELL = 132;
  var TOX = 30, POX = W / 2 + 30, OY = snap(H * 0.28);

  var patterns = [
    [0,1,1,1,1,0, 1,1,1,1,1,1, 1,1,1,1,1,1, 0,1,1,1,1,0, 0,0,1,1,0,0, 0,0,0,0,0,0],
    [0,0,1,1,0,0, 0,1,1,1,1,0, 1,1,1,1,1,1, 0,1,1,1,1,0, 1,1,0,0,1,1, 0,0,0,0,0,0],
    [0,0,1,1,0,0, 0,1,1,1,1,0, 1,1,1,1,1,1, 1,1,0,0,1,1, 1,1,0,0,1,1, 0,0,0,0,0,0],
    [0,0,1,1,0,0, 0,1,1,1,1,0, 1,1,1,1,1,1, 0,0,1,1,0,0, 0,0,1,1,0,0, 0,0,0,0,0,0]
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetGrid, playerGrid, rounds, timeLeft, done, particles, lastCell, matchPct, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1a1a');
  }

  function background() { game.draw.clear(C.bg); }

  function loadPattern() {
    var pat = patterns[rounds % patterns.length]; targetGrid = []; playerGrid = [];
    for (var r = 0; r < GRID; r++) { targetGrid.push([]); playerGrid.push([]); for (var c = 0; c < GRID; c++) { targetGrid[r].push(pat[r * GRID + c]); playerGrid[r].push(0); } }
    lastCell = null; matchPct = 0;
  }

  function calcMatch() { var total = 0, m = 0; for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) { total++; if (playerGrid[r][c] === targetGrid[r][c]) m++; } return m / total; }

  function initGame() { rounds = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; loadPattern(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rounds * 900 + Math.ceil(timeLeft) * 100) : Math.floor(matchPct * 300);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function paintAt(tx, ty, val) {
    var col = Math.floor((tx - POX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var key = row + ',' + col; if (lastCell === key) return; lastCell = key;
    playerGrid[row][col] = val; matchPct = calcMatch();
    if (matchPct >= 0.9) {
      rounds++; flash = 0.5; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + GRID * CELL / 2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); }
      if (rounds >= NEEDED) { finish(true); return; }
      setTimeout(function() { if (!done) loadPattern(); }, 600);
    }
  }

  function drawGrids() {
    txt('MODEL', TOX + GRID * CELL / 2, OY - 30, 32, C.e);
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) { var lx = TOX + c * CELL, ly = OY + r * CELL; game.draw.rect(lx + 2, ly + 2, CELL - 4, CELL - 4, '#101010', 0.9); if (targetGrid[r][c]) game.draw.rect(lx + 4, ly + 4, CELL - 8, CELL - 8, C.e, 0.85); }
    game.draw.rect(W / 2 - 2, OY - 40, 4, GRID * CELL + 60, C.d, 0.5);
    txt('PAINT ' + Math.floor(matchPct * 100) + '%', POX + GRID * CELL / 2, OY - 30, 32, matchPct >= 0.9 ? C.b : C.c);
    for (var r2 = 0; r2 < GRID; r2++) for (var c2 = 0; c2 < GRID; c2++) { var rx = POX + c2 * CELL, ry = OY + r2 * CELL, has = playerGrid[r2][c2]; game.draw.rect(rx + 2, ry + 2, CELL - 4, CELL - 4, '#101010', 0.9); if (has) game.draw.rect(rx + 4, ry + 4, CELL - 8, CELL - 8, has === targetGrid[r2][c2] ? C.b : C.a, 0.8); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || tx < W / 2) return;
    var col = Math.floor((tx - POX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    lastCell = null; playerGrid[row][col] = playerGrid[row][col] ? 0 : 1; matchPct = calcMatch();
    if (matchPct >= 0.9) { rounds++; flash = 0.5; game.audio.play('se_success', 0.8); if (rounds >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) loadPattern(); }, 600); }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || x1 < W / 2) return;
    lastCell = null; for (var s = 0; s <= 25; s++) paintAt(x1 + (x2 - x1) * s / 25, y1 + (y2 - y1) * s / 25, 1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targetGrid) initGame(); background(); drawGrids();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTERPIECE!' : 'TIME UP', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGrids();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rounds + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
