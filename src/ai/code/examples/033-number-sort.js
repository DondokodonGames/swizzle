// 033-number-sort.js
// ナンバーソート — 散らばった数字を素早く昇順でタップする頭の体操
// 操作: 数字を1→2→3…と順番にタップ
// 成功: 1〜3を全部正順でタップ  失敗: 間違えた瞬間 or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'NUMBER SORT';
  var HOW_TO_PLAY = 'TAP 1-2-3 IN ORDER';
  var MAX_TIME = 30;
  var TOTAL = 3;            // 修正2: 15 → 3
  var COLS = 3, ROWS = 1, CELL_W = 280, CELL_H = 320, GAP = 24;
  var GRID_W = COLS * (CELL_W + GAP) - GAP, GRID_H = ROWS * (CELL_H + GAP) - GAP;
  var GRID_X = (W - GRID_W) / 2, GRID_Y = (H - GRID_H) / 2;   // 修正1: 縦中央

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var positions, tileState, nextToTap, timeLeft, done, wrongFlash;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function shuffle() {
    var cells = []; for (var i = 0; i < TOTAL; i++) cells.push(i);
    for (var j = TOTAL - 1; j > 0; j--) { var k = Math.floor(Math.random() * (j + 1)); var t = cells[j]; cells[j] = cells[k]; cells[k] = t; }
    positions = cells.map(function(ci) { return { col: ci % COLS, row: Math.floor(ci / COLS) }; });
    tileState = new Array(TOTAL).fill(0); nextToTap = 1;
  }
  function initGame() { timeLeft = MAX_TIME; done = false; wrongFlash = 0; shuffle(); }

  function cellBounds(num) {
    var pos = positions[num - 1];
    return { x: GRID_X + pos.col * (CELL_W + GAP), y: GRID_Y + pos.row * (CELL_H + GAP), w: CELL_W, h: CELL_H };
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (Math.ceil(timeLeft) * 40 + 300) : (nextToTap - 1) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var n = 1; n <= TOTAL; n++) {
      if (tileState[n - 1] === 1) continue;
      var b = cellBounds(n);
      if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
        if (n === nextToTap) {
          tileState[n - 1] = 1; nextToTap++;
          game.audio.play('se_tap', 0.6 + (n / TOTAL) * 0.4);
          if (nextToTap > TOTAL) finish(true);
        } else {
          wrongFlash = 0.4; tileState[n - 1] = -1;
          game.audio.play('se_failure', 0.6);
          finish(false);
        }
        return;
      }
    }
  });

  // 世界観: 管制室のキーパッド。1→2→3 と順に押して認証する。
  function background() {
    game.draw.clear('#001018');
    var fx = GRID_X - 40, fy = GRID_Y - 120, fw = GRID_W + 80, fh = GRID_H + 200;
    game.draw.rect(fx, fy, fw, fh, '#0a1a28');           // 機器パネル
    game.draw.rect(fx + 12, fy + 12, fw - 24, fh - 24, '#000810');
    // 認証ステータス液晶
    game.draw.rect(snap(W / 2 - 200), snap(fy + 36), 400, 64, '#000000');
    txt('AUTH SEQUENCE', W / 2, fy + 68, 36, C.b);
    // 四隅ネジ
    game.draw.rect(fx + 24, fy + 24, 16, 16, C.d); game.draw.rect(fx + fw - 40, fy + 24, 16, 16, C.d);
    game.draw.rect(fx + 24, fy + fh - 40, 16, 16, C.d); game.draw.rect(fx + fw - 40, fy + fh - 40, 16, 16, C.d);
  }

  function drawTiles() {
    for (var n = 1; n <= TOTAL; n++) {
      var b = cellBounds(n), s = tileState[n - 1], isNext = n === nextToTap;
      var col = s === 1 ? C.f : (s === -1 ? C.e : (isNext ? C.d : C.a));
      game.draw.rect(b.x, b.y, b.w, b.h, col, s === 1 ? 0.5 : 1);
      game.draw.rect(b.x, b.y, b.w, 10, C.g, 0.4);
      txt('' + n, b.x + b.w / 2, b.y + b.h / 2, 120, s === 1 ? C.g : C.c);
      if (isNext && Math.floor(game.time.elapsed * 8) % 2 === 0) game.draw.rect(b.x - 8, b.y - 8, b.w + 16, b.h + 16, C.d, 0.3);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!positions) initGame();
      background();
      drawTiles();
      txt(GAME_TITLE,  W / 2, H * 0.2, 84, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 42, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.8, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (wrongFlash > 0) wrongFlash -= dt;
    }

    // ---- draw ----
    background();
    drawTiles();
    if (wrongFlash > 0) game.draw.rect(0, 0, W, H, C.e, wrongFlash / 0.4 * 0.2);
    timeBar();
    txt('NEXT ' + Math.min(nextToTap, TOTAL), W / 2, 96, 48, C.d);
    txt((nextToTap - 1) + ' / ' + TOTAL, W / 2, H - 120, 56, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
