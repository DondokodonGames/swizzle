// 088-ink-spread.js
// インクスプレッド — 左上から色を塗り広げ、盤面を1色に染める塗り工房
// 操作: 下の色パレットをタップして左上領域の色を変える
// 成功: 全マスを1色に（手数以内）  失敗: 手数オーバー or 40秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'INK SPREAD';
  var HOW_TO_PLAY = 'PAINT THE WHOLE BOARD ONE COLOR';
  var MAX_TIME = 40;
  var INK = [C.a, C.e, C.b, C.c];                     // 修正2: 5色 → 4色（易化）
  var COLS = 4, ROWS = 5, CELL = 200;                 // 修正2: 7x9 → 4x5（易化）
  var GRID_X = (W - COLS * CELL) / 2, GRID_Y = H * 0.26;
  var MAX_MOVES = 15;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var grid, playerColor, moves, timeLeft, done;
  var PICK_Y = H * 0.82, PICK_R = 60, PICK_GAP = 200, PICK_X0 = W / 2 - (INK.length - 1) / 2 * PICK_GAP;

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

  function initGame() {
    grid = [];
    for (var r = 0; r < ROWS; r++) { grid.push([]); for (var c = 0; c < COLS; c++) grid[r].push(Math.floor(Math.random() * INK.length)); }
    playerColor = grid[0][0]; moves = 0; timeLeft = MAX_TIME; done = false;
  }

  function flood(newColor) {
    if (newColor === playerColor) return;
    var old = playerColor; playerColor = newColor;
    var queue = [[0, 0]], visited = { '0,0': true };
    while (queue.length) {
      var cur = queue.shift(), r = cur[0], cc = cur[1];
      if (grid[r][cc] !== old) continue;
      grid[r][cc] = newColor;
      var nb = [[r - 1, cc], [r + 1, cc], [r, cc - 1], [r, cc + 1]];
      for (var n = 0; n < nb.length; n++) { var nr = nb[n][0], nc = nb[n][1]; if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !visited[nr + ',' + nc] && grid[nr][nc] === old) { visited[nr + ',' + nc] = true; queue.push([nr, nc]); } }
    }
    moves++;
  }
  function isComplete() { var t = grid[0][0]; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (grid[r][c] !== t) return false; return true; }
  function countOwned() {
    var t = grid[0][0], visited = {}, queue = [[0, 0]], count = 0;
    while (queue.length) { var cur = queue.shift(), r = cur[0], c = cur[1], k = r + ',' + c; if (visited[k]) continue; visited[k] = true; if (grid[r][c] !== t) continue; count++; var nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]; for (var n = 0; n < nb.length; n++) { var nr = nb[n][0], nc = nb[n][1]; if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) queue.push([nr, nc]); } }
    return count;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.max(0, MAX_MOVES - moves) * 40 + Math.ceil(timeLeft) * 20) : countOwned() * 20;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < INK.length; i++) {
      var px = PICK_X0 + i * PICK_GAP, dx = tx - px, dy = ty - PICK_Y;
      if (Math.sqrt(dx * dx + dy * dy) < PICK_R + 24) {
        flood(i); game.audio.play('se_tap', 0.6);
        if (isComplete()) { finish(true); return; }
        if (moves >= MAX_MOVES) { finish(false); return; }
        return;
      }
    }
  });

  // 世界観: インク工房。左上のタンクから色を流し込み盤面全体を染め上げる。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(snap(GRID_X) - 16, snap(GRID_Y) - 16, COLS * CELL + 32, ROWS * CELL + 32, '#12002a');
    txt('INK WORKSHOP', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var gx = GRID_X + c * CELL, gy = GRID_Y + r * CELL;
      game.draw.rect(snap(gx) + 4, snap(gy) + 4, CELL - 8, CELL - 8, INK[grid[r][c]]);
      if (r === 0 && c === 0) game.draw.rect(snap(gx) + 4, snap(gy) + 4, CELL - 8, CELL - 8, C.g, 0.15);
    }
    for (var i = 0; i < INK.length; i++) {
      var px = PICK_X0 + i * PICK_GAP, sel = i === playerColor;
      drawPixelCircle(px, PICK_Y, sel ? PICK_R + 8 : PICK_R, INK[i], 1);
      if (sel) txt('V', px, PICK_Y, 40, C.g);
    }
    // 進捗
    var pct = countOwned() / (COLS * ROWS), bw = 600;
    game.draw.rect(snap(W / 2 - bw / 2), snap(H * 0.2), bw, 24, '#12002a');
    game.draw.rect(snap(W / 2 - bw / 2), snap(H * 0.2), snap(bw * pct), 24, INK[playerColor]);
    txt(Math.round(pct * 100) + '%', W / 2, H * 0.2 - 36, 40, C.c);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.1, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.15, 28, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.9, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
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
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    var left = MAX_MOVES - moves;
    txt('MOVES LEFT ' + left, W / 2, 96, 44, left > 5 ? C.c : C.a);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
