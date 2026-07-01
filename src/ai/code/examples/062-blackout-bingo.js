// 062-blackout-bingo.js
// ブラックアウトビンゴ — 呼ばれた番号を全て埋めて3×3ビンゴを完成させる
// 操作: 呼ばれた番号の場所をタップ
// 成功: 全9マス埋める(ブラックアウト)  失敗: 3回誤タップ or 40秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'BLACKOUT BINGO';
  var HOW_TO_PLAY = 'TAP THE CALLED NUMBER';
  var MAX_TIME = 40;
  var GRID = 3, CELL = 280, POOL_MAX = 30;   // 修正2: 5x5/25 → 3x3/9
  var GRID_X = (W - GRID * CELL) / 2, GRID_Y = (H - GRID * CELL) / 2 + 60;
  var MAX_MISS = 3, CALL_INTERVAL = 2.2;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var numbers, marked, calledNums, currentCalled, callTimer, misses, timeLeft, done, feedback, feedbackOk, wrongCell;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initBingo() {
    var pool = []; for (var i = 1; i <= POOL_MAX; i++) pool.push(i);
    for (var s = pool.length - 1; s > 0; s--) { var r = Math.floor(Math.random() * (s + 1)); var t = pool[s]; pool[s] = pool[r]; pool[r] = t; }
    numbers = pool.slice(0, GRID * GRID); marked = new Array(GRID * GRID).fill(false); calledNums = numbers.slice();
    for (var s2 = calledNums.length - 1; s2 > 0; s2--) { var r2 = Math.floor(Math.random() * (s2 + 1)); var t2 = calledNums[s2]; calledNums[s2] = calledNums[r2]; calledNums[r2] = t2; }
    currentCalled = -1; callTimer = 1.0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false; wrongCell = -1;
  }
  function callNext() { if (calledNums.length === 0) return; currentCalled = calledNums.shift(); game.audio.play('se_tap', 0.3); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 30) : marked.filter(function(m) { return m; }).length * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initBingo(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done || currentCalled < 0) return;
    var col = Math.floor((x - GRID_X) / CELL), row = Math.floor((y - GRID_Y) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var idx = row * GRID + col; if (marked[idx]) return;
    if (numbers[idx] === currentCalled) {
      marked[idx] = true; feedback = 0.5; feedbackOk = true; game.audio.play('se_tap', 0.8); currentCalled = -1; callTimer = 0.5;
      if (marked.every(function(m) { return m; })) finish(true);
    } else { misses++; feedback = 0.4; feedbackOk = false; wrongCell = idx; game.audio.play('se_failure', 0.6); if (misses >= MAX_MISS) finish(false); }
  });

  // 世界観: ビンゴ大会の会場。呼ばれた数字をカードから探して埋める。
  function background() {
    game.draw.clear('#0a0018');
    var fx = GRID_X - 40, fy = GRID_Y - 40, fw = GRID * CELL + 80, fh = GRID * CELL + 80;
    game.draw.rect(fx, fy, fw, fh, '#12102a');
    game.draw.rect(fx + 12, fy + 12, fw - 24, fh - 24, '#05000f');
    txt('BINGO HALL', W / 2, GRID_Y - 80, 34, C.b);
  }

  function drawCard() {
    for (var row = 0; row < GRID; row++) for (var col = 0; col < GRID; col++) {
      var idx = row * GRID + col, gx = GRID_X + col * CELL, gy = GRID_Y + row * CELL;
      var isW = idx === wrongCell && feedback > 0;
      game.draw.rect(gx + 6, gy + 6, CELL - 12, CELL - 12, marked[idx] ? '#003322' : (isW ? '#330011' : '#1a0a2a'));
      if (numbers[idx] === currentCalled) game.draw.rect(gx + 6, gy + 6, CELL - 12, CELL - 12, C.e, 0.3);
      txt(numbers[idx] + '', gx + CELL / 2, gy + CELL / 2, 96, marked[idx] ? C.b : C.g);
      if (marked[idx]) drawPixelCircle(gx + CELL / 2, gy + CELL / 2, CELL * 0.42, C.f, 0.25);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!numbers) initBingo();
      background();
      drawCard();
      txt(GAME_TITLE,  W / 2, H * 0.1, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.9, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (currentCalled < 0) { callTimer -= dt; if (callTimer <= 0) { callNext(); callTimer = CALL_INTERVAL; } }
      if (feedback > 0) feedback -= dt;
    }

    // ---- draw ----
    background();
    // 呼び出し番号の表示
    if (currentCalled >= 0) { drawPixelCircle(W / 2, 200, 80, C.e, 1); txt(currentCalled + '', W / 2, 200, 80, C.g); }
    else txt('NEXT...', W / 2, 200, 56, '#555577');
    drawCard();
    if (feedback > 0) txt(feedbackOk ? 'MARK!' : 'WRONG!', W / 2, GRID_Y + GRID * CELL + 60, 64, feedbackOk ? C.b : C.a);
    timeBar();
    txt(marked.filter(function(m) { return m; }).length + ' / ' + (GRID * GRID), W / 2, 96, 44, C.b);
    for (var m = 0; m < MAX_MISS; m++) game.draw.rect(W / 2 + (m - 1) * 64 - 20, H - 90, 40, 40, m < misses ? C.a : '#330011');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initBingo();
  });
})(game);
