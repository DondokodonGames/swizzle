// 591-stack-overflow.js
// スタックオーバーフロー — せり上がるブロックの列を、上端の同色連続をタップで消し天井到達を防ぐ
// 操作: 列をタップするとその列の一番上の色と同じ連続ブロックがまとめて消える。連続消しでコンボ
// 成功: 15ブロック 消去  失敗: 天井に到達 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、積層回路） ──
  var C = { bg:'#08050f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = [C.a, C.e, C.b, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STACK OVERFLOW';
  var HOW_TO_PLAY = 'TAP A COLUMN TO CLEAR ITS TOP MATCHING RUN · CHAIN FOR COMBOS';
  var MAX_TIME = 20;
  var NEEDED   = 15;         // 修正2: 50 → 15
  var COLS = 5, COL_W = W / 5, BLOCK_H = 80, CEILING_Y = 280, FLOOR_Y = H - 200;
  var MAX_BLOCKS = Math.floor((FLOOR_Y - CEILING_Y) / BLOCK_H);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var columns, cleared, timeLeft, done, particles, flash, flashCol, comboCount, comboTimer, comboText, addTimer, addRate;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1a2e');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var c = 0; c < COLS; c++) if (c % 2 === 0) game.draw.rect(c * COL_W, CEILING_Y, COL_W, FLOOR_Y - CEILING_Y, '#1a1a2e', 0.15);
    for (var c2 = 1; c2 < COLS; c2++) game.draw.rect(c2 * COL_W - 1, CEILING_Y, 2, FLOOR_Y - CEILING_Y, '#1a1a2e', 0.9);
    game.draw.rect(0, CEILING_Y - 16, W, 16, C.a, 0.9); game.draw.rect(0, FLOOR_Y, W, 8, '#1a1a2e', 0.6);
  }

  function initColumns() { columns = []; for (var i = 0; i < COLS; i++) columns.push([]); for (var row = 0; row < 4; row++) for (var c = 0; c < COLS; c++) columns[c].push(Math.floor(Math.random() * COLORS.length)); }

  function initGame() { cleared = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; comboCount = 0; comboTimer = 0; comboText = ''; addTimer = 0; addRate = 2.6; initColumns(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cleared * 200 + Math.ceil(timeLeft) * 100) : cleared * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addRow() { for (var c = 0; c < COLS; c++) if (columns[c].length >= MAX_BLOCKS) { flash = 0.6; finish(false); return; } for (var c2 = 0; c2 < COLS; c2++) columns[c2].push(Math.floor(Math.random() * COLORS.length)); }

  function clearColumn(col) {
    if (columns[col].length === 0) return 0;
    var top = columns[col][columns[col].length - 1], matching = 0;
    for (var bi = columns[col].length - 1; bi >= 0; bi--) { if (columns[col][bi] === top) matching++; else break; }
    var blockY = FLOOR_Y - columns[col].length * BLOCK_H; columns[col].splice(columns[col].length - matching);
    for (var pi = 0; pi < matching * 4; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: (col + 0.5) * COL_W, y: blockY + BLOCK_H / 2, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 100, life: 0.5, col: COLORS[top] }); }
    cleared += matching; return matching;
  }

  function drawScene() {
    for (var c = 0; c < COLS; c++) for (var bi = 0; bi < columns[c].length; bi++) { var by = FLOOR_Y - (bi + 1) * BLOCK_H, col = columns[c][bi], isTop = bi === columns[c].length - 1; game.draw.rect(c * COL_W + 4, by + 4, COL_W - 8, BLOCK_H - 8, COLORS[col], 0.9); if (isTop) game.draw.rect(c * COL_W + 4, by + 4, COL_W - 8, 8, C.g, 0.3); }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var col = Math.max(0, Math.min(COLS - 1, Math.floor(tx / COL_W)));
    if (columns[col].length === 0) { game.audio.play('se_tap', 0.1); comboCount = 0; return; }
    if (clearColumn(col) > 0) {
      comboCount++; comboTimer = 1.0; game.audio.play('se_success', Math.min(0.9, 0.4 + comboCount * 0.1));
      if (comboCount >= 3) { comboText = comboCount + 'x COMBO!'; flash = 0.3; flashCol = C.c; game.audio.play('se_success', 0.8); }
      if (cleared >= NEEDED) { finish(true); return; }
    } else { comboCount = 0; game.audio.play('se_tap', 0.15); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!columns) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.16, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 52, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 40, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEARED!' : 'OVERFLOW', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) comboCount = 0; }
      addTimer += dt; if (addTimer >= addRate) { addTimer = 0; addRow(); if (done) return; addRate = Math.max(1.4, 2.6 - (MAX_TIME - timeLeft) * 0.03); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (comboTimer > 0 && comboCount >= 3) txt(comboText, W / 2, snap(H * 0.80), 56, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cleared + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
