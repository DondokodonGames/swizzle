// 176-hot-tiles.js
// 熱板渡り — 熱くなるタイルから素早く離れ、安全なタイルに乗り続ける緊張感
// 操作: タップで隣の安全なタイルへ移動
// 成功: 7秒生き延びる  失敗: 熱いタイルに乗ったまま

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、溶鉱炉） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'HOT TILES';
  var HOW_TO_PLAY = 'TAP AN ADJACENT COOL TILE TO HOP';
  var NEEDED   = 7;              // 修正2: 30 → 7（サバイバル短縮）
  var COLS = 4, ROWS = 5, PAD = 10;
  var CELL_W = snap((W - 80) / COLS), CELL_H = 200, GX = snap(40), GY = snap(300);
  var HEAT_INTERVAL = 1.8, HEAT_TIME = 2.2, COOL_TIME = 2.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tiles, playerRow, playerCol, heatTimer, survived, timeLeft, done, shakeX;

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
    var lit = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function getTile(r, c) { return tiles[r * COLS + c]; }

  function heatRandom() {
    var cool = tiles.filter(function(t) { return t.heat < 0.4 && !t.heating && t.coolTimer <= 0 && !(t.row === playerRow && t.col === playerCol); });
    if (cool.length === 0) return;
    var t = cool[Math.floor(Math.random() * cool.length)];
    t.heating = true; t.heatTimer = 0;
  }

  function drawTile(t, ox) {
    var cx = GX + t.col * CELL_W + PAD + ox, cy = GY + t.row * CELL_H + PAD, cw = CELL_W - PAD * 2, ch = CELL_H - PAD * 2;
    var col = t.heat < 0.3 ? C.e : (t.heat < 0.7 ? C.c : C.a);
    game.draw.rect(cx, cy, cw, ch, col, 0.85);
    game.draw.rect(cx, cy, cw, 10, C.g, 0.3);
    if (t.heat > 0.1) game.draw.rect(cx, cy + ch - t.heat * ch, cw, t.heat * ch, col, t.heat * 0.6);
    if (t.heat > 0.6) {
      var on = Math.floor(game.time.elapsed * 8) % 2 === 0;
      // ピクセル炎
      game.draw.rect(cx + cw / 2 - 12, cy + ch / 2 - 8, 24, 24, on ? C.c : C.f);
      game.draw.rect(cx + cw / 2 - 8, cy + ch / 2 - 24, 16, 16, C.a);
    } else if (t.heat > 0.3) txt('!', cx + cw / 2, cy + ch / 2 - 8, 48, C.c);
    if (t.row === playerRow && t.col === playerCol) { pc(cx + cw / 2, cy + ch / 2 - 16, 42, C.b, 1); game.draw.rect(cx + cw / 2 - 14, cy + ch / 2 - 24, 10, 10, C.bg); game.draw.rect(cx + cw / 2 + 4, cy + ch / 2 - 24, 10, 10, C.bg); }
  }

  function initGame() {
    tiles = [];
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) tiles.push({ row: r, col: c, heat: 0, heating: false, heatTimer: 0, coolTimer: 0 });
    playerRow = ROWS - 1; playerCol = Math.floor(COLS / 2);
    heatTimer = 0.5; survived = 0; timeLeft = NEEDED; done = false; shakeX = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.round(survived) * 100) : Math.round(survived * 120);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.floor((x - GX) / CELL_W), row = Math.floor((y - GY) / CELL_H);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
    if (Math.abs(row - playerRow) + Math.abs(col - playerCol) !== 1) return;
    playerRow = row; playerCol = col;
    game.audio.play('se_tap', 0.3);
    if (getTile(row, col).heat > 0.85) { shakeX = 24; finish(false); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      tiles = tiles || [];
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var idx = r * COLS + c; tiles[idx] = tiles[idx] || { row: r, col: c, heat: 0, heating: false, coolTimer: 0 }; tiles[idx].heat = ((r + c + Math.floor(game.time.elapsed)) % 4 === 0) ? 0.9 : 0; }
      playerRow = ROWS - 1; playerCol = 1;
      for (var t = 0; t < tiles.length; t++) drawTile(tiles[t], 0);
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.90, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄  TAP TO START', W / 2, H * 0.95, 44, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'BURNED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (timeLeft <= 0) { finish(true); return; }
      heatTimer -= dt;
      var prog = survived / NEEDED;
      if (heatTimer <= 0) { heatTimer = HEAT_INTERVAL * Math.max(0.6, 1 - prog * 0.3); heatRandom(); if (prog > 0.5) heatRandom(); }
      for (var ti = 0; ti < tiles.length; ti++) {
        var t = tiles[ti];
        if (t.heating) { t.heatTimer += dt; t.heat = Math.min(1, t.heatTimer / HEAT_TIME); if (t.heat >= 1) { t.heating = false; t.coolTimer = COOL_TIME; } }
        else if (t.coolTimer > 0) { t.coolTimer -= dt; if (t.coolTimer <= 0) { t.heat = 0; t.heatTimer = 0; } }
      }
      if (getTile(playerRow, playerCol).heat > 0.85) { shakeX = 24; finish(false); return; }
    }
    if (shakeX > 0) shakeX *= 0.7;
    var ox = (Math.random() - 0.5) * shakeX * 2;

    // ---- 描画 ----
    background();
    for (var ti2 = 0; ti2 < tiles.length; ti2++) drawTile(tiles[ti2], ox);

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt('HOP TO SAFETY!', W / 2, 168, 40, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
