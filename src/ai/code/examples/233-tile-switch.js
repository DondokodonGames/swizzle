// 233-tile-switch.js
// タイルスイッチ — 走り出した列車の前で線路の向きをタップで切り替え、ゴールまで導く操車パズル
// 操作: タップで線路を縦↔横に切り替える
// 成功: 列車をゴールへ  失敗: 脱線 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、操車場） ──
  var C = { bg:'#0a0a0f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE SWITCH';
  var HOW_TO_PLAY = 'TAP RAILS TO STEER THE TRAIN TO GOAL';
  var MAX_TIME = 15;
  var COLS = 5, ROWS = 7;     // 修正2: 7x9 → 5x7
  var CELL = snap((W - 40) / COLS), OX = 20, OY = snap(H * 0.28);
  var TRAIN_SPEED = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiles, tx, ty, tdir, tpx, tpy, ttx, tty, timeLeft, done, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

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

  function initLevel() {
    tiles = [];
    for (var r = 0; r < ROWS; r++) { tiles[r] = []; for (var c = 0; c < COLS; c++) tiles[r][c] = (r === 0 || r === ROWS - 1 || c === 0) ? 'WALL' : (Math.random() < 0.5 ? 'H' : 'V'); }
    var gr = Math.floor(ROWS / 2);
    tiles[gr][COLS - 1] = 'GOAL';
    tx = 0; ty = gr; tdir = 'right'; tiles[gr][1] = 'H';
    tpx = OX + tx * CELL + CELL / 2; tpy = OY + ty * CELL + CELL / 2; setTarget();
  }

  function setTarget() {
    var dx = tdir === 'right' ? 1 : tdir === 'left' ? -1 : 0, dy = tdir === 'down' ? 1 : tdir === 'up' ? -1 : 0;
    ttx = OX + (tx + dx) * CELL + CELL / 2; tty = OY + (ty + dy) * CELL + CELL / 2;
  }

  function initGame() { initLevel(); timeLeft = MAX_TIME; done = false; flash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 120) : tx * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTiles() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var gx = OX + c * CELL, gy = OY + r * CELL, t = tiles[r][c];
      if (t === 'WALL') game.draw.rect(gx, gy, CELL, CELL, '#0f0f18', 0.8);
      else if (t === 'GOAL') { pc(gx + CELL / 2, gy + CELL / 2, CELL * 0.36, C.b, 0.5 + 0.3 * (Math.floor(game.time.elapsed * 6) % 2)); txt('OUT', gx + CELL / 2, gy + CELL / 2 + 10, 30, '#000'); }
      else {
        game.draw.rect(gx + 2, gy + 2, CELL - 4, CELL - 4, C.d, 0.35);
        if (t === 'H') for (var xx = gx + 8; xx < gx + CELL - 8; xx += 16) game.draw.rect(xx, gy + CELL / 2 - 4, 8, 8, C.e, 0.8);
        else for (var yy = gy + 8; yy < gy + CELL - 8; yy += 16) game.draw.rect(gx + CELL / 2 - 4, yy, 8, 8, C.e, 0.8);
      }
    }
  }

  function drawTrain() { pc(tpx, tpy, CELL * 0.3, C.a, 0.95); game.draw.rect(snap(tpx) - 6, snap(tpy) - 6, 12, 12, C.g); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var c = Math.floor((x - OX) / CELL), r = Math.floor((y - OY) / CELL);
    if (c < 1 || c >= COLS || r < 1 || r >= ROWS - 1) return;
    if (tiles[r][c] !== 'H' && tiles[r][c] !== 'V') return;
    tiles[r][c] = tiles[r][c] === 'H' ? 'V' : 'H'; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tiles) initGame(); background(); drawTiles(); drawTrain();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ARRIVED!' : 'DERAILED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt;
      var dx = ttx - tpx, dy = tty - tpy, dist = Math.hypot(dx, dy);
      if (dist < TRAIN_SPEED * dt) {
        var ndx = tdir === 'right' ? 1 : tdir === 'left' ? -1 : 0, ndy = tdir === 'down' ? 1 : tdir === 'up' ? -1 : 0;
        tx += ndx; ty += ndy; tpx = OX + tx * CELL + CELL / 2; tpy = OY + ty * CELL + CELL / 2;
        var tile = (ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS) ? tiles[ty][tx] : 'WALL';
        if (tile === 'GOAL') { finish(true); return; }
        if (tile === 'WALL' || !tile) { finish(false); return; }
        if (tile === 'H' && (tdir === 'up' || tdir === 'down')) { finish(false); return; }
        if (tile === 'V' && (tdir === 'left' || tdir === 'right')) { finish(false); return; }
        setTarget(); flash = 0.3; game.audio.play('se_tap', 0.2);
      } else { tpx += dx / dist * TRAIN_SPEED * dt; tpy += dy / dist * TRAIN_SPEED * dt; }
    }

    // ---- 描画 ----
    background(); drawTiles(); drawTrain();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('TAP RAILS TO STEER', W / 2, H - 100, 40, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
