// 524-signal-intercept.js
// シグナルインターセプト — 流れ落ちるコード列の中から、指定パターンだけを素早くタップで抜き取る
// 操作: 上部に表示された TARGET パターンと一致するセルをタップ（違うセルを押すとミス）
// 成功: 6個 傍受  失敗: 3ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、傍受端末） ──
  var C = { bg:'#000a00', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CHARS = '01ABCDEFabcdef';
  var PATTERNS = ['A1B2', 'FF00', 'DEAD', 'CAFE', 'BABE', 'C0DE'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SIGNAL INTERCEPT';
  var HOW_TO_PLAY = 'TAP ONLY THE CELLS MATCHING THE TARGET PATTERN';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var COLS = 6, ROW_H = 84, COL_W = W / 6, VIS = Math.ceil(H / 84) + 2, SCROLL = 130;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var target, columns, scrollY, found, missed, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); }

  function randTok() { var s = ''; for (var i = 0; i < 4; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)]; return s; }

  function newCell() { var t = Math.random() < 0.09; return { text: t ? target : randTok(), isTarget: t, hit: false }; }

  function initColumns() { columns = []; for (var c = 0; c < COLS; c++) { columns[c] = []; for (var r = 0; r < VIS + 10; r++) columns[c].push(newCell()); } scrollY = 0; }

  function initGame() { target = PATTERNS[Math.floor(Math.random() * PATTERNS.length)]; found = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; initColumns(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (found * 500 + Math.ceil(timeLeft) * 100) : found * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawColumns() {
    for (var c = 0; c < COLS; c++) { game.draw.rect(c * COL_W, 280, 2, H, '#003300', 0.5); for (var r = 0; r < columns[c].length; r++) { var cell = columns[c][r], cy = r * ROW_H - scrollY + ROW_H / 2 + 280; if (cy < 260 || cy > H + ROW_H) continue; if (cell.isTarget && !cell.hit) { game.draw.rect(c * COL_W + 4, cy - ROW_H / 2 + 4, COL_W - 8, ROW_H - 8, '#2a1400', 0.8); txt(cell.text, c * COL_W + COL_W / 2, cy + 14, 38, C.f); } else txt(cell.text, c * COL_W + COL_W / 2, cy + 14, 38, cell.hit ? '#225522' : C.d); } }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ty < 280) return;
    var col = Math.floor(tx / COL_W), row = Math.floor((ty - 280 + scrollY) / ROW_H);
    if (col < 0 || col >= COLS || row < 0 || row >= columns[col].length) return;
    var cell = columns[col][row]; if (cell.hit) return; cell.hit = true;
    if (cell.isTarget) {
      found++; flash = 0.3; flashCol = C.b; game.audio.play('se_success', 0.6);
      var cx = col * COL_W + COL_W / 2, cy = row * ROW_H + ROW_H / 2 - scrollY + 280;
      for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cy, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: C.c }); }
      if (found >= NEEDED) { finish(true); return; }
    } else { missed++; flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.3); if (missed >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!columns) initGame(); background(); drawColumns();
      game.draw.rect(0, 250, W, 100, C.bg, 0.9);
      txt(GAME_TITLE, W / 2, H * 0.5, 68, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.56, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.64, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.70, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DECODED!' : 'SIGNAL LOST', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      scrollY += SCROLL * dt;
      while (scrollY >= ROW_H) { for (var c = 0; c < COLS; c++) { var gone = columns[c].shift(); if (gone.isTarget && !gone.hit) { missed++; if (missed >= MAX_MISS) { finish(false); return; } } columns[c].push(newCell()); } scrollY -= ROW_H; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawColumns();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    game.draw.rect(0, 250, W, 30, C.bg, 0.8);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    game.draw.rect(0, 0, W, 260, C.bg, 0.85);
    txt('TARGET ' + target, W / 2, 264, 40, C.f);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(found + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 220, 20, 20, mi < missed ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
