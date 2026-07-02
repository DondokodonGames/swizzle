// 276-escape-maze.js
// エスケープメイズ — 追手が迷路を最短で追ってくる前に、スワイプで移動してゴールへ逃げ切る
// 操作: スワイプで上下左右に移動
// 成功: ゴール到達  失敗: 追手に捕まる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、追跡迷路） ──
  var C = { bg:'#04020a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#312e81', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ESCAPE MAZE';
  var HOW_TO_PLAY = 'SWIPE TO MOVE · REACH G BEFORE THE CHASER';
  var MAX_TIME = 15;
  var COLS = 7, ROWS = 9, TOP = 260;
  var CW = Math.floor((W - 80) / COLS), CH = Math.floor((H * 0.5) / ROWS), OX = snap((W - COLS * CW) / 2), OY = TOP;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var maze, player, chaser, goal, chaserTimer, chaserInterval, timeLeft, done;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function genMaze() {
    maze = []; for (var r = 0; r < ROWS; r++) { maze[r] = []; for (var c = 0; c < COLS; c++) maze[r][c] = 1; }
    var stack = [{ r: 1, c: 1 }]; maze[1][1] = 0;
    while (stack.length) {
      var cur = stack[stack.length - 1], dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]], moved = false;
      for (var i = dirs.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = dirs[i]; dirs[i] = dirs[j]; dirs[j] = t; }
      for (var d = 0; d < dirs.length; d++) { var nr = cur.r + dirs[d][0], nc = cur.c + dirs[d][1]; if (nr > 0 && nr < ROWS && nc > 0 && nc < COLS && maze[nr][nc] === 1) { maze[cur.r + dirs[d][0] / 2][cur.c + dirs[d][1] / 2] = 0; maze[nr][nc] = 0; stack.push({ r: nr, c: nc }); moved = true; break; } }
      if (!moved) stack.pop();
    }
    maze[1][1] = 0; maze[ROWS - 2][COLS - 2] = 0; goal = { c: COLS - 2, r: 1 }; maze[goal.r][goal.c] = 0;
  }

  function bfsNext(from, to) {
    var vis = []; for (var r = 0; r < ROWS; r++) { vis[r] = []; for (var c = 0; c < COLS; c++) vis[r][c] = false; }
    var q = [{ c: from.c, r: from.r, first: null }]; vis[from.r][from.c] = true;
    while (q.length) { var cur = q.shift(); if (cur.c === to.c && cur.r === to.r) return cur.first; var dd = [[0, 1], [0, -1], [1, 0], [-1, 0]]; for (var d = 0; d < dd.length; d++) { var nc = cur.c + dd[d][0], nr = cur.r + dd[d][1]; if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && maze[nr][nc] === 0 && !vis[nr][nc]) { vis[nr][nc] = true; q.push({ c: nc, r: nr, first: cur.first || { c: nc, r: nr } }); } } }
    return null;
  }

  function initGame() { genMaze(); player = { c: 1, r: 1 }; chaser = { c: COLS - 2, r: ROWS - 2 }; chaserTimer = 0; chaserInterval = 0.6; timeLeft = MAX_TIME; done = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 120) : Math.ceil(MAX_TIME - timeLeft) * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawMaze() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var x = OX + c * CW, y = OY + r * CH; if (maze[r][c] === 1) { game.draw.rect(x, y, CW, CH, C.d, 0.9); game.draw.rect(x, y, CW, 4, C.g, 0.2); } }
    var gx = OX + goal.c * CW + CW / 2, gy = OY + goal.r * CH + CH / 2; pc(gx, gy, Math.min(CW, CH) * 0.4, C.c, 0.9); txt('G', gx, gy + 10, 28, '#000');
    var px = OX + player.c * CW + CW / 2, py = OY + player.r * CH + CH / 2; pc(px, py, Math.min(CW, CH) * 0.4, C.b, 0.95);
    var ex = OX + chaser.c * CW + CW / 2, ey = OY + chaser.r * CH + CH / 2; pc(ex, ey, Math.min(CW, CH) * 0.4, C.a, 0.95); game.draw.rect(snap(ex) - 10, snap(ey) - 4, 6, 6, C.g); game.draw.rect(snap(ex) + 4, snap(ey) - 4, 6, 6, C.g);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var dc = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, dr = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
    var nc = player.c + dc, nr = player.r + dr;
    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && maze[nr][nc] === 0) { player.c = nc; player.r = nr; game.audio.play('se_tap', 0.2); if (player.c === goal.c && player.r === goal.r) { finish(true); return; } if (player.c === chaser.c && player.r === chaser.r) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!maze) initGame(); background(); drawMaze();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#443366');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'CAUGHT', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      chaserTimer -= dt;
      if (chaserTimer <= 0) { chaserTimer = chaserInterval; var next = bfsNext(chaser, player); if (next) { chaser.c = next.c; chaser.r = next.r; } chaserInterval = Math.max(0.35, 0.6 - (MAX_TIME - timeLeft) * 0.02); if (chaser.c === player.c && chaser.r === player.r) { finish(false); return; } }
    }

    // ---- 描画 ----
    background(); drawMaze();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('SWIPE TO ESCAPE', W / 2, H - 120, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
