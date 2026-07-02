// 225-pixel-paint.js
// ピクセルペイント — お手本のドット絵を見て、光る枠を素早く塗り再現する速描きパズル
// 操作: タップでマスを塗る（お手本外のマスはミス）
// 成功: お手本を塗り切る  失敗: 5マス塗り間違える or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ドット絵工房） ──
  var C = { bg:'#0a0a0f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PAINT = [C.a, C.b, C.e, C.c, C.d, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PIXEL PAINT';
  var HOW_TO_PLAY = 'COPY THE TEMPLATE · TAP THE LIT CELLS';
  var MAX_TIME = 15;
  var MAX_WRONG = 5;          // 修正2: 10 → 5
  var GN = 7, CELL = snap(W * 0.8 / GN), OX = snap((W - GN * CELL) / 2), OY = snap(H * 0.34);
  var TEMPLATES = [
    [0,1,1,0,1,1,0, 1,1,1,1,1,1,1, 1,1,1,1,1,1,1, 0,1,1,1,1,1,0, 0,0,1,1,1,0,0, 0,0,0,1,0,0,0, 0,0,0,0,0,0,0],
    [0,0,1,1,1,0,0, 0,1,1,1,1,1,0, 1,1,1,1,1,1,1, 0,1,1,1,1,1,0, 1,1,0,1,0,1,1, 1,0,0,1,0,0,1, 0,0,0,0,0,0,0],
    [0,0,0,1,0,0,0, 0,0,1,1,1,0,0, 0,1,1,1,1,1,0, 1,1,1,1,1,1,1, 0,0,0,1,0,0,0, 0,0,0,1,0,0,0, 0,0,0,1,0,0,0]
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var template, paintCol, grid, wrongs, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1a2a');
  }

  function background() { game.draw.clear(C.bg); }

  function isComplete() { for (var i = 0; i < GN * GN; i++) if (template[i] === 1 && grid[i] !== 1) return false; return true; }

  function drawPreview() {
    var pc2 = 30, px = snap(W / 2 - GN * pc2 / 2), py = snap(H * 0.12);
    txt('TEMPLATE', W / 2, py - 20, 30, C.b);
    for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) game.draw.rect(px + c * pc2 + 1, py + r * pc2 + 1, pc2 - 2, pc2 - 2, template[r * GN + c] === 1 ? paintCol : '#1e293b', template[r * GN + c] === 1 ? 0.9 : 0.3);
  }

  function drawGrid() {
    for (var r = 0; r < GN; r++) for (var c = 0; c < GN; c++) {
      var idx = r * GN + c, gx = OX + c * CELL, gy = OY + r * CELL;
      game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, '#1e293b', 0.35);
      // 未塗りのお手本マスは薄く光らせてガイド
      if (template[idx] === 1 && grid[idx] === 0) game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, paintCol, 0.15 + 0.1 * (Math.floor(game.time.elapsed * 4) % 2));
      if (grid[idx] === 1) { game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, paintCol, 0.9); game.draw.rect(gx + 2, gy + 2, CELL - 4, 6, C.g, 0.2); }
      else if (grid[idx] === 2) { game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.a, 0.7); txt('X', gx + CELL / 2, gy + CELL / 2 + 12, 40, C.g); }
    }
  }

  function pickTemplate() { template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]; paintCol = PAINT[Math.floor(Math.random() * PAINT.length)]; }

  function initGame() { pickTemplate(); grid = []; for (var i = 0; i < GN * GN; i++) grid.push(0); wrongs = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 100) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((x - OX) / CELL), row = Math.floor((y - OY) / CELL);
    if (col < 0 || col >= GN || row < 0 || row >= GN) return;
    var idx = row * GN + col; if (grid[idx] === 1) return;
    if (template[idx] === 1) { grid[idx] = 1; feedbackOk = true; feedback = 0.15; game.audio.play('se_tap', 0.3); if (isComplete()) { finish(true); return; } }
    else { wrongs++; grid[idx] = 2; feedbackOk = false; feedback = 0.3; game.audio.play('se_failure', 0.3); (function(i){ setTimeout(function() { if (grid) grid[i] = 0; }, 400); })(idx); if (wrongs >= MAX_WRONG) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!template) initGame(); background(); drawPreview(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.24, 76, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTERPIECE!' : 'SMUDGED', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } if (feedback > 0) feedback -= dt; }

    background(); drawPreview(); drawGrid();
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.1);

    var filled = 0, total = 0; for (var i = 0; i < GN * GN; i++) if (template[i] === 1) { total++; if (grid[i] === 1) filled++; }
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2 - 200, 96, 44, C.g);
    txt(filled + ' / ' + total, W / 2 + 200, 96, 44, C.b);
    for (var mm = 0; mm < MAX_WRONG; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_WRONG - 1) / 2) * 52) - 10, H - 110, 20, 20, mm < wrongs ? C.a : '#1a1a2e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
