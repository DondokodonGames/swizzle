// 241-dodge-spike.js
// ドッジスパイク — 迫り来る床の棘を見切り、安全なマスへ飛び移り続けて走破する瞬発力
// 操作: タップで安全な列へ飛ぶ
// 成功: 12マス進む  失敗: 棘を踏む or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、トラップ回廊） ──
  var C = { bg:'#04060a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DODGE SPIKE';
  var HOW_TO_PLAY = 'TAP A SAFE COLUMN TO HOP FORWARD';
  var MAX_TIME = 15;
  var NEEDED   = 12;          // 修正2: 30 → 12
  var TOP = 220, COLS = 4, CELL = snap(W / COLS), ROW_H = 180, SCROLL = 150;
  var VISIBLE = Math.ceil((H - TOP) / ROW_H) + 2, PLAYER_Y = snap(H * 0.66);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerCol, jumpFrom, jumping, jumpAnim, rows, scrollOffset, distance, timeLeft, done, bounce;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() { game.draw.clear(C.bg); }

  function genRow() {
    var spikes = Math.floor(Math.random() * (COLS - 1)), row = [0, 0, 0, 0], pos = [0, 1, 2, 3];
    for (var i = pos.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = pos[i]; pos[i] = pos[j]; pos[j] = t; }
    for (var k = 0; k < spikes; k++) row[pos[k]] = 1;
    return row;
  }

  function initGame() {
    playerCol = 1; jumpFrom = 1; jumping = false; jumpAnim = 0; scrollOffset = 0; distance = 0; timeLeft = MAX_TIME; done = false; bounce = 0;
    rows = []; for (var i = 0; i < VISIBLE + 4; i++) rows.push(i < 3 ? [0, 0, 0, 0] : genRow());
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 100) : Math.floor(distance) * 50;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawRows() {
    var off = scrollOffset % ROW_H, base = Math.floor(scrollOffset / ROW_H);
    for (var ri = -1; ri < VISIBLE + 1; ri++) {
      var idx = base + ri, ry = PLAYER_Y - ri * ROW_H + off;
      if (idx < 0 || idx >= rows.length || ry < TOP - ROW_H || ry > H) continue;
      var row = rows[idx];
      for (var ci = 0; ci < COLS; ci++) {
        var gx = ci * CELL, spike = row[ci] === 1;
        game.draw.rect(gx + 4, snap(ry), CELL - 8, ROW_H - 6, spike ? '#1a0a0a' : C.d, 0.6);
        game.draw.rect(gx + 4, snap(ry), CELL - 8, 6, spike ? C.a : C.e, 0.4);
        if (spike) { var sx = gx + CELL / 2, sy = ry + ROW_H / 2; for (var t = 0; t < 5; t++) game.draw.rect(snap(sx - 20 + t * 10) - 4, snap(sy - 24 + Math.abs(t - 2) * 16), 8, 8, C.a, 0.9); game.draw.rect(snap(sx) - 4, snap(sy - 30), 8, 8, C.g, 0.8); }
      }
    }
  }

  function drawPlayer() {
    var px = playerCol * CELL + CELL / 2;
    if (jumping) px = (jumpFrom * CELL + CELL / 2) + (px - (jumpFrom * CELL + CELL / 2)) * jumpAnim;
    pc(px, PLAYER_Y + bounce, 32, C.c, 0.95); game.draw.rect(snap(px) - 12, snap(PLAYER_Y + bounce) - 12, 10, 10, C.g, 0.5);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || jumping) return;
    var col = Math.floor(x / CELL); if (col === playerCol || col < 0 || col >= COLS) return;
    var ahead = Math.floor(scrollOffset / ROW_H) + 1;
    if (rows[ahead] && rows[ahead][col] === 1) { finish(false); return; }
    jumpFrom = playerCol; playerCol = col; jumping = true; jumpAnim = 0; game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rows) initGame(); background(); drawRows(); drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#445566');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEARED!' : 'IMPALED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (jumping) { jumpAnim += dt * 5; if (jumpAnim >= 1) { jumpAnim = 1; jumping = false; } bounce = -Math.sin(jumpAnim * Math.PI) * 40; } else bounce = 0;
      scrollOffset += SCROLL * dt; distance += SCROLL * dt / ROW_H;
      var need = Math.ceil(scrollOffset / ROW_H) + VISIBLE + 2; while (rows.length < need) rows.push(genRow());
      var cur = Math.floor(scrollOffset / ROW_H) + 1;
      if (cur < rows.length && rows[cur][playerCol] === 1) { finish(false); return; }
      if (distance >= NEEDED) { finish(true); return; }
    }

    // ---- 描画 ----
    background(); drawRows(); drawPlayer();

    game.draw.rect(0, H - 60, W * Math.min(1, distance / NEEDED), 14, C.b, 0.8);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(distance) + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
