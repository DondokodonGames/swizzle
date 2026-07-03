// 462-stack-overflow.js
// スタックオーバーフロー — 積み上がるデータブロックを、溢れる前にスワイプで列ごと削除
// 操作: 上下スワイプ=最も高い列を削除、左右スワイプ=左端/右端の列を削除
// 成功: 30ブロック 処理  失敗: どれかの列が満杯 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、データ端末） ──
  var C = { bg:'#000d06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BLOCK_COLORS = [C.b, C.e, C.d, C.f, C.c];
  var BLOCK_LABELS = ['if', 'for', 'fn', '{}', '=>'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STACK OVERFLOW';
  var HOW_TO_PLAY = 'SWIPE UP/DN CLEARS TALLEST · LEFT/RIGHT CLEARS EDGE COLUMN';
  var MAX_TIME = 20;
  var NEEDED   = 30;         // 修正2: 100 → 30
  var COLS = 5, ROWS = 10, BLOCK_W = 180, BLOCK_H = 84;
  var OX = snap((W - COLS * BLOCK_W) / 2), STACK_TOP = 320, OVERFLOW_Y = 320 + 10 * 84;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var grid, spawnTimer, processed, timeLeft, done, flash, flashCol, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#001a0a');
  }

  function background() { game.draw.clear(C.bg); }

  function initGrid() { grid = []; for (var c = 0; c < COLS; c++) grid.push([]); }

  function addBlock(col) { var idx = Math.floor(Math.random() * BLOCK_COLORS.length); grid[col].push({ color: BLOCK_COLORS[idx], label: BLOCK_LABELS[idx] }); }

  function clearColumn(col) {
    var count = grid[col].length; if (count === 0) return 0;
    for (var ri = 0; ri < count; ri++) { var bx = OX + col * BLOCK_W + BLOCK_W / 2, by = OVERFLOW_Y - (ri + 0.5) * BLOCK_H; for (var pi = 0; pi < 3; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx, y: by, vx: Math.cos(a) * 120, vy: Math.sin(a) * 80, life: 0.4, col: grid[col][ri].color }); } }
    grid[col] = []; return count;
  }

  function initGame() { initGrid(); spawnTimer = 0; processed = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; particles = []; for (var i = 0; i < 6; i++) addBlock(Math.floor(Math.random() * COLS)); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (processed * 200 + Math.ceil(timeLeft) * 100) : processed * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawStack() {
    game.draw.rect(OX - 8, STACK_TOP - 8, COLS * BLOCK_W + 16, ROWS * BLOCK_H + 16, '#001a0a', 0.6);
    var ov = Math.floor(game.time.elapsed * 6) % 2 === 0 ? 0.5 : 0.2;
    game.draw.rect(OX - 8, STACK_TOP - 8, COLS * BLOCK_W + 16, 8, C.a, ov);
    txt('OVERFLOW', W / 2, STACK_TOP - 20, 28, C.a);
    for (var c = 0; c < COLS; c++) {
      var h = grid[c].length;
      for (var r = 0; r < h; r++) {
        var b = grid[c][r], bx = OX + c * BLOCK_W, by = OVERFLOW_Y - (r + 1) * BLOCK_H;
        game.draw.rect(bx + 4, by + 4, BLOCK_W - 8, BLOCK_H - 8, b.color, 0.85); game.draw.rect(bx + 4, by + 4, BLOCK_W - 8, 8, C.g, 0.15);
        txt(b.label, bx + BLOCK_W / 2, by + BLOCK_H * 0.62, 34, C.bg);
        if (r > ROWS - 4) game.draw.rect(bx + 4, by + 4, BLOCK_W - 8, BLOCK_H - 8, C.a, (r - (ROWS - 4)) * 0.14);
      }
      var hr = h / ROWS; txt(h + '', OX + c * BLOCK_W + BLOCK_W / 2, OVERFLOW_Y + 48, 34, hr > 0.7 ? C.a : hr > 0.4 ? C.f : C.b);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    var targetCol = -1;
    if (dir === 'up' || dir === 'down') { var maxH = 0; for (var c = 0; c < COLS; c++) if (grid[c].length > maxH) { maxH = grid[c].length; targetCol = c; } }
    else if (dir === 'left') { for (var c2 = 0; c2 < COLS; c2++) if (grid[c2].length > 0) { targetCol = c2; break; } }
    else { for (var c3 = COLS - 1; c3 >= 0; c3--) if (grid[c3].length > 0) { targetCol = c3; break; } }
    if (targetCol < 0) return;
    var count = clearColumn(targetCol);
    if (count > 0) { processed += count; flash = 0.3; flashCol = C.b; game.audio.play('se_tap', 0.4); if (processed >= NEEDED) { finish(true); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grid) initGame(); background(); drawStack();
      txt(GAME_TITLE, W / 2, H * 0.09, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.14, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STACK CLEARED!' : 'OVERFLOW!', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      spawnTimer += dt;
      var interval = Math.max(0.35, 0.7 - processed * 0.008);
      if (spawnTimer >= interval) {
        spawnTimer = 0; var col = Math.floor(Math.random() * COLS); addBlock(col);
        if (grid[col].length >= ROWS) {
          for (var pi2 = 0; pi2 < 16; pi2++) { var a2 = Math.random() * Math.PI * 2; var bx2 = OX + col * BLOCK_W + BLOCK_W / 2; particles.push({ x: bx2, y: STACK_TOP, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200, life: 0.6, col: C.a }); }
          finish(false); return;
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawStack();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt('SWIPE TO CLEAR', W / 2, OVERFLOW_Y + 110, 34, C.d);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(processed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
