// 286-color-flood.js
// カラーフラッド — 左上から色を選んで塗り広げ、限られた手数で盤面を全て同色に染める
// 操作: 下部の色ボタンをタップして洪水を広げる
// 成功: 全マス同色に  失敗: 8手使い切る or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、塗り広げ） ──
  var C = { bg:'#030208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PALETTE = [C.a, C.e, C.b, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COLOR FLOOD';
  var HOW_TO_PLAY = 'PICK COLORS TO FLOOD · MATCH THE WHOLE BOARD';
  var MAX_TIME = 15;
  var MAX_MOVES = 8;         // 修正2: 20 → 8
  var GN = 6, TOP = 300;
  var CELL = snap((W - 80) / GN), OX = snap((W - GN * CELL) / 2), OY = TOP;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, current, moves, timeLeft, done, anim;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0a20');
  }

  function background() { game.draw.clear(C.bg); }

  function initGrid() { grid = []; for (var r = 0; r < GN; r++) { grid[r] = []; for (var c = 0; c < GN; c++) grid[r][c] = Math.floor(Math.random() * PALETTE.length); } current = grid[0][0]; }

  function flood(newCol) {
    if (newCol === current) return;
    var target = current, q = [{ r: 0, c: 0 }], vis = {}; vis['0,0'] = 1;
    var region = [];
    while (q.length) { var cur = q.shift(); if (grid[cur.r][cur.c] !== target) continue; region.push(cur); var d = [[0, 1], [0, -1], [1, 0], [-1, 0]]; for (var i = 0; i < 4; i++) { var nr = cur.r + d[i][0], nc = cur.c + d[i][1], k = nr + ',' + nc; if (nr >= 0 && nr < GN && nc >= 0 && nc < GN && !vis[k] && grid[nr][nc] === target) { vis[k] = 1; q.push({ r: nr, c: nc }); } } }
    for (var j = 0; j < region.length; j++) grid[region[j].r][region[j].c] = newCol;
    current = newCol; anim = 0.3;
  }

  function checkWin() { var v = grid[0][0]; for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) if (grid[r][c] !== v) return false; return true; }

  function initGame() { initGrid(); moves = 0; timeLeft = MAX_TIME; done = false; anim = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? ((MAX_MOVES - moves + 1) * 300 + Math.ceil(timeLeft) * 60) : moves * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) { game.draw.rect(OX + c * CELL + 3, OY + r * CELL + 3, CELL - 6, CELL - 6, PALETTE[grid[r][c]], 0.9); game.draw.rect(OX + c * CELL + 3, OY + r * CELL + 3, CELL - 6, 6, C.g, 0.15); }
    var bw = snap((W - 80) / PALETTE.length);
    for (var pi = 0; pi < PALETTE.length; pi++) { var bx = 40 + pi * bw, cur = pi === current; game.draw.rect(bx + 4, snap(H * 0.78), bw - 8, 100, PALETTE[pi], cur ? 1 : 0.5); if (cur) game.draw.rect(bx + 4, snap(H * 0.78) - 10, bw - 8, 10, C.g, 0.6); }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var bw = snap((W - 80) / PALETTE.length);
    if (y >= H * 0.78 && y <= H * 0.78 + 100) { var idx = Math.floor((x - 40) / bw); if (idx >= 0 && idx < PALETTE.length && idx !== current) { moves++; flood(idx); game.audio.play('se_tap', 0.3); if (checkWin()) { finish(true); return; } if (moves >= MAX_MOVES) { finish(false); return; } } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.98, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL ONE COLOR!' : 'OUT OF MOVES', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } if (anim > 0) anim -= dt; }

    background(); drawBoard();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('MOVES ' + (MAX_MOVES - moves), W / 2, 168, 46, (MAX_MOVES - moves) <= 2 ? C.a : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
