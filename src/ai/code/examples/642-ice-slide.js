// 642-ice-slide.js
// アイスライド — 氷上を滑るコインをスワイプで転がし、穴を避けてゴールの星へ導く
// 操作: 上下左右スワイプ（またはタップ方向）でコインを滑らせる。氷なので滑り続ける
// 成功: 5ゴール 到達  失敗: 3回 落下 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷原） ──
  var C = { bg:'#010a18', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE SLIDE';
  var HOW_TO_PLAY = 'SWIPE TO SLIDE THE COIN ACROSS THE ICE · DODGE THE HOLES · REACH THE STAR';
  var MAX_TIME = 25;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var MAX_FELL = 3;          // 修正2: 10 → 3
  var TILE = 160, COLS = 6, ROWS = 8, BOARD_X = snap((W - COLS * TILE) / 2), BOARD_Y = snap(H * 0.16);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var board, coinX, coinY, coinPX, coinPY, coinVX, coinVY, moving, scored, fell, timeLeft, done, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color, alpha) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2 - Math.PI / 2; game.draw.rect(cx + Math.cos(a) * r - 4, cy + Math.sin(a) * r - 4, 8, 8, color, alpha); var a2 = a + Math.PI / 5; game.draw.rect(cx + Math.cos(a2) * r * 0.45 - 4, cy + Math.sin(a2) * r * 0.45 - 4, 8, 8, color, alpha); } pc(cx, cy, r * 0.4, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#050d1a');
  }

  function background() { game.draw.clear(C.bg); }

  function genBoard() {
    board = [];
    for (var r = 0; r < ROWS; r++) { var row = []; for (var c = 0; c < COLS; c++) row.push(1); board.push(row); }
    var holeCount = 4 + Math.floor((MAX_TIME - timeLeft) / 6);
    for (var h = 0; h < holeCount; h++) { var hr = 1 + Math.floor(Math.random() * (ROWS - 2)), hc = Math.floor(Math.random() * COLS); board[hr][hc] = 0; }
    var gr = Math.floor(Math.random() * 3), gc = Math.floor(Math.random() * COLS); board[gr][gc] = 2;
    coinY = ROWS - 1; coinX = Math.floor(Math.random() * COLS); board[coinY][coinX] = 1;
    coinPX = BOARD_X + coinX * TILE + TILE / 2; coinPY = BOARD_Y + coinY * TILE + TILE / 2; coinVX = 0; coinVY = 0; moving = false;
  }

  function initGame() { scored = 0; fell = 0; timeLeft = MAX_TIME; done = false; particles = []; genBoard(); }

  function getCell(c, r) { if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1; return board[r][c]; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (scored * 700 + Math.ceil(timeLeft) * 100) : scored * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function slide(dx, dy) { if (dx === 0 && dy === 0) return; coinVX = dx * 600; coinVY = dy * 600; moving = true; game.audio.play('se_tap', 0.12); }

  function drawScene() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var tx2 = BOARD_X + c * TILE, ty2 = BOARD_Y + r * TILE, cell = board[r][c];
      if (cell === 0) game.draw.rect(tx2 + 4, ty2 + 4, TILE - 8, TILE - 8, '#000000', 0.9);
      else if (cell === 1) { game.draw.rect(tx2 + 2, ty2 + 2, TILE - 4, TILE - 4, C.d, 0.6); game.draw.rect(tx2 + 2, ty2 + 2, TILE - 4, 8, C.e, 0.3); }
      else if (cell === 2) { game.draw.rect(tx2 + 2, ty2 + 2, TILE - 4, TILE - 4, C.b, 0.2); star(tx2 + TILE / 2, ty2 + TILE / 2, 48, C.c, 0.95); }
    }
    pc(coinPX, coinPY, 40, C.c, 0.95); pc(coinPX - 12, coinPY - 12, 16, C.g, 0.6);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done || moving) return;
    if (dir === 'up') slide(0, -1); else if (dir === 'down') slide(0, 1); else if (dir === 'left') slide(-1, 0); else if (dir === 'right') slide(1, 0);
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || moving) return;
    var dx = tx - coinPX, dy = ty - coinPY;
    if (Math.abs(dx) > Math.abs(dy)) slide(dx > 0 ? 1 : -1, 0); else slide(0, dy > 0 ? 1 : -1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!board) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.12, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ICE MASTER!' : 'FELL IN', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (moving) {
        coinPX += coinVX * dt; coinPY += coinVY * dt;
        var ngx = Math.round((coinPX - BOARD_X - TILE / 2) / TILE), ngy = Math.round((coinPY - BOARD_Y - TILE / 2) / TILE), ct = getCell(ngx, ngy);
        if (ct === -1 || ct === 0) {
          fell++; game.audio.play('se_failure', 0.3);
          for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: coinPX, y: coinPY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.c }); }
          if (fell >= MAX_FELL) { finish(false); return; } genBoard(); return;
        }
        if (ct === 2) {
          scored++; game.audio.play('se_success', 0.6);
          for (var p2 = 0; p2 < 8; p2++) { var pa2 = Math.random() * Math.PI * 2; particles.push({ x: coinPX, y: coinPY, vx: Math.cos(pa2) * 300, vy: Math.sin(pa2) * 300, life: 0.5, col: C.b }); }
          if (scored >= NEEDED) { finish(true); return; } genBoard(); return;
        }
        coinX = ngx; coinY = ngy; coinVX *= (1 - dt * 0.5); coinVY *= (1 - dt * 0.5);
        if (Math.sqrt(coinVX * coinVX + coinVY * coinVY) < 30) { coinPX = BOARD_X + coinX * TILE + TILE / 2; coinPY = BOARD_Y + coinY * TILE + TILE / 2; coinVX = 0; coinVY = 0; moving = false; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p3 = particles[pp]; p3.x += p3.vx * dt; p3.y += p3.vy * dt; p3.life -= dt * 2; if (p3.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(scored + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FELL; fi++) game.draw.rect(snap(W - 120 - fi * 56) - 10, 168, 20, 20, fi < fell ? C.a : '#050d1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
