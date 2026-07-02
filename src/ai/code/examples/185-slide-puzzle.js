// 185-slide-puzzle.js
// スライドパズル — 数字タイルを動かして1-8を順番に並べるシンプルな知的快感
// 操作: タップで空きスペースに向けてタイルをスライド
// 成功: 正しい順番に並べる  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、電光掲示板） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SLIDE PUZZLE';
  var HOW_TO_PLAY = 'TAP A TILE NEXT TO THE GAP TO SLIDE';
  var MAX_TIME = 20;             // 修正2: 60 → 20
  var SIZE = 3, CELL = 280, GAP = 12;
  var GW = SIZE * CELL + (SIZE - 1) * GAP, GX = snap((W - GW) / 2), GY = snap(400);
  var SHUFFLE = 6;               // 修正2: ほぐし少なめで易化

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiles, emptyPos, moves, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a3a');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(GX - 16, GY - 16, GW + 32, GW + 32, C.d, 0.4);
    game.draw.rect(GX - 16, GY - 16, GW + 32, 8, C.a);
  }

  function drawTiles() {
    for (var r = 0; r < SIZE; r++) for (var c = 0; c < SIZE; c++) {
      var idx = r * SIZE + c, cx = GX + c * (CELL + GAP), cy = GY + r * (CELL + GAP), val = tiles[idx];
      if (val === 0) { game.draw.rect(cx, cy, CELL, CELL, '#0a0018', 0.6); continue; }
      var ok = val === idx + 1;
      game.draw.rect(cx, cy, CELL, CELL, ok ? C.b : C.e, 0.9);
      game.draw.rect(cx, cy, CELL, 10, C.g, 0.3);
      game.draw.rect(cx, cy + CELL - 8, CELL, 8, '#000000', 0.25);
      txt(val + '', cx + CELL / 2, cy + CELL / 2 - 8, 100, C.bg);
    }
  }

  function initPuzzle() {
    tiles = [];
    for (var i = 0; i < SIZE * SIZE - 1; i++) tiles.push(i + 1);
    tiles.push(0); emptyPos = SIZE * SIZE - 1;
    for (var s = 0; s < SHUFFLE; s++) {
      var er = Math.floor(emptyPos / SIZE), ec = emptyPos % SIZE, nb = [];
      if (er > 0) nb.push(emptyPos - SIZE); if (er < SIZE - 1) nb.push(emptyPos + SIZE);
      if (ec > 0) nb.push(emptyPos - 1); if (ec < SIZE - 1) nb.push(emptyPos + 1);
      var pick = nb[Math.floor(Math.random() * nb.length)];
      tiles[emptyPos] = tiles[pick]; tiles[pick] = 0; emptyPos = pick;
    }
  }

  function isSolved() { for (var i = 0; i < SIZE * SIZE - 1; i++) if (tiles[i] !== i + 1) return false; return tiles[SIZE * SIZE - 1] === 0; }

  function initGame() { initPuzzle(); if (isSolved()) initPuzzle(); moves = 0; timeLeft = MAX_TIME; done = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(timeLeft) * 40 + Math.max(0, 40 - moves) * 20 + 400) : moves * 20;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((x - GX) / (CELL + GAP)), row = Math.floor((y - GY) / (CELL + GAP));
    if (col < 0 || col >= SIZE || row < 0 || row >= SIZE) return;
    var idx = row * SIZE + col;
    if (tiles[idx] === 0) return;
    var er = Math.floor(emptyPos / SIZE), ec = emptyPos % SIZE;
    if ((Math.abs(er - row) === 1 && ec === col) || (er === row && Math.abs(ec - col) === 1)) {
      tiles[emptyPos] = tiles[idx]; tiles[idx] = 0; emptyPos = idx; moves++;
      game.audio.play('se_tap', 0.35);
      if (isSolved()) { finish(true); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0]; drawTiles();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.82, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SOLVED!' : 'TIME OUT', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }

    background(); drawTiles();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('MOVES ' + moves, W / 2, 168, 44, C.b);
    txt('MAKE 1-2-3 / 4-5-6 / 7-8-_', W / 2, GY + GW + 60, 34, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
