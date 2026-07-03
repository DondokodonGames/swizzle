// 538-tile-slide.js
// タイルスライド — 8パズル（3x3スライドパズル）を、空白の隣タイルをずらして揃える
// 操作: 空白マスに隣接するタイルをタップして滑り込ませる
// 成功: パズル 1面 完成  失敗: 80手超過 or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、スライド盤） ──
  var C = { bg:'#030510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE SLIDE';
  var HOW_TO_PLAY = 'TAP A TILE NEXT TO THE GAP TO SLIDE IT · ORDER 1-8';
  var MAX_TIME  = 30;
  var NEEDED    = 1;         // 修正2: 2 → 1
  var SIZE = 3;              // 修正2: 4x4 → 3x3
  var MAX_MOVES = 80;        // 修正2: 200 → 80
  var CELL = 300, GAP = 12;
  var OX = snap((W - SIZE * (CELL + GAP)) / 2), OY = snap(H * 0.22);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var board, moves, solved, timeLeft, done, particles, flash, tileAnims;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1530');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(OX - 12, OY - 12, SIZE * (CELL + GAP) + 24, SIZE * (CELL + GAP) + 24, '#0a1530', 0.9); }

  function initBoard() {
    board = []; for (var i = 0; i < SIZE * SIZE - 1; i++) board.push(i + 1); board.push(0);
    for (var si = board.length - 1; si > 0; si--) { var sj = Math.floor(Math.random() * (si + 1)); var tmp = board[si]; board[si] = board[sj]; board[sj] = tmp; }
    var inv = 0; for (var ii = 0; ii < board.length; ii++) for (var jj = ii + 1; jj < board.length; jj++) if (board[ii] > 0 && board[jj] > 0 && board[ii] > board[jj]) inv++;
    if (inv % 2 !== 0) { var a = board[0] === 0 ? 1 : 0, b = board[1] === 0 ? 2 : 1; var t = board[a]; board[a] = board[b]; board[b] = t; }
    // 既に揃っている場合は軽くシャッフル
    if (isSolved()) { var t2 = board[0]; board[0] = board[1]; board[1] = board[3]; board[3] = t2; }
    tileAnims = {}; moves = 0;
  }

  function isSolved() { for (var i = 0; i < SIZE * SIZE - 1; i++) if (board[i] !== i + 1) return false; return board[SIZE * SIZE - 1] === 0; }

  function findEmpty() { var idx = board.indexOf(0); return { col: idx % SIZE, row: Math.floor(idx / SIZE) }; }

  function initGame() { solved = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; initBoard(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (1000 + Math.max(0, MAX_MOVES - moves) * 100 + Math.ceil(timeLeft) * 100) : (MAX_MOVES - moves > 0 ? 0 : 0) + moves * 10;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBoard() {
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) {
      var idx = r * SIZE + c, val = board[idx], tx2 = OX + c * (CELL + GAP), ty2 = OY + r * (CELL + GAP);
      var anim = tileAnims[idx];
      if (anim && anim.t > 0) { var frac = Math.max(0, anim.t) / 0.15; tx2 -= anim.dx * CELL * frac; ty2 -= anim.dy * CELL * frac; }
      if (val === 0) { game.draw.rect(tx2, ty2, CELL, CELL, '#050a14', 0.8); continue; }
      var inPlace = (val - 1 === idx), bg = inPlace ? '#0d3d5a' : '#1e3a5f';
      game.draw.rect(tx2 + 4, ty2 + 4, CELL - 8, CELL - 8, bg, 0.95);
      game.draw.rect(tx2 + 4, ty2 + 4, CELL - 8, 12, inPlace ? C.b : C.e, inPlace ? 0.6 : 0.3);
      txt(val + '', tx2 + CELL / 2, ty2 + CELL / 2 + 22, 84, inPlace ? C.b : C.e);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((tx - OX) / (CELL + GAP)), row = Math.floor((ty - OY) / (CELL + GAP));
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;
    var e = findEmpty();
    if (Math.abs(col - e.col) + Math.abs(row - e.row) !== 1) return;
    var ti = row * SIZE + col, ei = e.row * SIZE + e.col, tmp = board[ti]; board[ti] = board[ei]; board[ei] = tmp; moves++; game.audio.play('se_tap', 0.2);
    tileAnims[ei] = { dx: col - e.col, dy: row - e.row, t: 0.15 };
    if (isSolved()) { flash = 0.6; for (var pi = 0; pi < 16; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: OY + SIZE * (CELL + GAP) / 2, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 0.5, col: C.b }); } finish(true); return; }
    if (moves >= MAX_MOVES) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!board) initGame(); background(); drawBoard();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SOLVED!' : 'GAVE UP', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
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
      for (var k in tileAnims) { tileAnims[k].t -= dt * 8; if (tileAnims[k].t <= 0) delete tileAnims[k]; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBoard();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.12);

    var moveCol = moves / MAX_MOVES > 0.8 ? C.a : moves / MAX_MOVES > 0.6 ? C.f : C.e;
    txt('MOVES ' + moves + ' / ' + MAX_MOVES, W / 2, snap(OY + SIZE * (CELL + GAP) + 60), 48, moveCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(solved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
