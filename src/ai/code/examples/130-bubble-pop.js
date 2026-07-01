// 130-bubble-pop.js
// バブルポップ — 大きな固まりを選んで連鎖消去する爽快な消しゲーム
// 操作: タップで泡を割る（隣接する同色の泡を連鎖消去）
// 成功: 40%の泡を消す  失敗: 10タップ使い切る or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BUBBLE_COLORS = [C.a, C.b, C.c, C.e, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE POP';
  var HOW_TO_PLAY = 'TAP BIG CLUSTERS OF SAME COLOR';
  var MAX_TIME = 15;             // 修正2: 30 → 15
  var CLEAR_TARGET = 0.40;       // 修正2: 0.80 → 0.40
  var MAX_TAPS = 10;
  var TOP    = 220;
  var BOTTOM = H - 180;

  var COLS = 8, ROWS = 10;
  var CELL = 112;                // 8の倍数
  var GRID_W = COLS * CELL;
  var GRID_X = snap((W - GRID_W) / 2);
  var GRID_Y = snap(TOP + 60);
  var TOTAL = COLS * ROWS;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, tapsLeft, popped, timeLeft, done, popFlash, floaters;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function drawPixelCircle(cx, cy, r, color, alpha) {
    var step = 8;
    cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) {
      for (var px = -r; px <= r; px += step) {
        if (px * px + py * py <= r * r) {
          game.draw.rect(cx + px, cy + py, step, step, color, alpha);
        }
      }
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }

  function scanlines() {
    for (var sy = 0; sy < H; sy += 8) {
      game.draw.rect(0, sy, W, 2, '#000000', 0.18);
    }
  }

  function timeBar() {
    var blocks = 12;
    var lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) {
      game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
    }
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(GRID_X - 16, GRID_Y - 16, GRID_W + 32, ROWS * CELL + 32, C.d, 0.4);
    game.draw.rect(GRID_X - 16, GRID_Y - 16, GRID_W + 32, 8, C.a);
  }

  function initGrid() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push([]);
      for (var c = 0; c < COLS; c++) grid[r].push(Math.floor(Math.random() * BUBBLE_COLORS.length));
    }
  }

  function floodFill(sr, sc) {
    var target = grid[sr][sc];
    if (target < 0) return [];
    var seen = [];
    for (var r = 0; r < ROWS; r++) seen.push(new Array(COLS).fill(false));
    var queue = [{ r: sr, c: sc }], group = [];
    seen[sr][sc] = true;
    while (queue.length) {
      var cur = queue.shift();
      group.push(cur);
      var nb = [{ r: cur.r - 1, c: cur.c }, { r: cur.r + 1, c: cur.c }, { r: cur.r, c: cur.c - 1 }, { r: cur.r, c: cur.c + 1 }];
      for (var i = 0; i < nb.length; i++) {
        var n = nb[i];
        if (n.r >= 0 && n.r < ROWS && n.c >= 0 && n.c < COLS && !seen[n.r][n.c] && grid[n.r][n.c] === target) {
          seen[n.r][n.c] = true;
          queue.push(n);
        }
      }
    }
    return group;
  }

  function remaining() {
    var n = 0;
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] >= 0) n++;
    return n;
  }

  // ── 初期化 ──
  function initGame() {
    initGrid();
    tapsLeft = MAX_TAPS;
    popped = 0;
    timeLeft = MAX_TIME;
    done = false;
    popFlash = 0;
    floaters = [];
  }

  // ── 終了処理 ──
  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (popped * 30 + tapsLeft * 60 + Math.ceil(timeLeft) * 20) : popped * 20;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() {
      if (success) game.end.success(finalScore);
      else         game.end.failure();
    }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) {
      game.audio.play('se_tap', 1.0);
      state = S.PLAYING;
      initGame();
      return;
    }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    // PLAYING
    if (done || tapsLeft <= 0) return;
    var col = Math.floor((x - GRID_X) / CELL);
    var row = Math.floor((y - GRID_Y) / CELL);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS || grid[row][col] < 0) return;

    var group = floodFill(row, col);
    var color = BUBBLE_COLORS[grid[row][col]];
    if (group.length < 2) {
      grid[row][col] = -1;
      popped++; tapsLeft--;
      game.audio.play('se_tap', 0.4);
    } else {
      for (var gi = 0; gi < group.length; gi++) grid[group[gi].r][group[gi].c] = -1;
      popped += group.length; tapsLeft--;
      popFlash = 0.3;
      game.audio.play('se_success');
      floaters.push({
        x: snap(GRID_X + col * CELL + CELL / 2),
        y: snap(GRID_Y + row * CELL + CELL / 2),
        text: '+' + group.length, life: 0.7, color: color
      });
    }

    var clearedPct = 1 - remaining() / TOTAL;
    if (clearedPct >= CLEAR_TARGET) { finish(true); return; }
    if (tapsLeft <= 0) { finish(clearedPct >= CLEAR_TARGET); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      // デモ: 泡グリッド
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var col = BUBBLE_COLORS[(r + c + Math.floor(game.time.elapsed)) % BUBBLE_COLORS.length];
          drawPixelCircle(GRID_X + c * CELL + CELL / 2, GRID_Y + r * CELL + CELL / 2, 40, col, 0.85);
        }
      }
      txt(GAME_TITLE,  W / 2, H * 0.06, 84, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 50, C.g);
      }
      txt(HOW_TO_PLAY, W / 2, H * 0.95, 32, C.b);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEARED!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) {
        txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      }
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish((1 - remaining() / TOTAL) >= CLEAR_TARGET); return; }
    }
    if (popFlash > 0) popFlash -= dt;
    for (var fi = 0; fi < floaters.length; fi++) { floaters[fi].y -= 80 * dt; floaters[fi].life -= dt; }
    floaters = floaters.filter(function(f) { return f.life > 0; });

    // ---- 描画 ----
    background();
    if (popFlash > 0) game.draw.rect(0, 0, W, H, C.g, popFlash * 0.15);

    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var ci = grid[r2][c2];
        if (ci < 0) continue;
        var bx = GRID_X + c2 * CELL + CELL / 2;
        var by = GRID_Y + r2 * CELL + CELL / 2;
        drawPixelCircle(bx, by, 40, BUBBLE_COLORS[ci], 0.9);
        game.draw.rect(snap(bx) - 20, snap(by) - 20, 12, 12, C.g, 0.6); // ハイライト
      }
    }

    for (var fi2 = 0; fi2 < floaters.length; fi2++) {
      txt(floaters[fi2].text, floaters[fi2].x, floaters[fi2].y, 56, floaters[fi2].color);
    }

    // 消去率メーター（下部）
    var pct = Math.round((1 - remaining() / TOTAL) * 100);
    var barW = GRID_W;
    game.draw.rect(GRID_X, BOTTOM - 40, barW, 24, '#2a0a3a');
    game.draw.rect(GRID_X, BOTTOM - 40, snap(barW * (1 - remaining() / TOTAL)), 24, C.b, 0.9);
    game.draw.rect(GRID_X + snap(barW * CLEAR_TARGET) - 4, BOTTOM - 48, 8, 48, C.c);
    txt('CLEAR ' + pct + '%', W / 2, BOTTOM - 80, 44, C.c);

    // 残タップ
    for (var ti = 0; ti < MAX_TAPS; ti++) {
      var tx2 = snap(W / 2 + (ti - (MAX_TAPS - 1) / 2) * 52);
      game.draw.rect(tx2 - 10, 168, 20, 20, ti < tapsLeft ? C.c : '#2a0a3a');
    }

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
