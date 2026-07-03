// 496-chef-order.js
// シェフオーダー — 順番に光る具材を記憶し、消えた後に同じ順でボタンをタップして注文を仕上げる
// 操作: 提示された順番どおりに具材ボタンをタップ（記憶ゲーム）
// 成功: 3オーダー 達成  失敗: 3ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、深夜食堂） ──
  var C = { bg:'#0a0500', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var ITEMS = [ { col: C.a, name: 'TOM' }, { col: C.b, name: 'LET' }, { col: C.c, name: 'CHZ' }, { col: C.d, name: 'ONI' }, { col: C.e, name: 'CUC' }, { col: C.f, name: 'CAR' } ];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHEF ORDER';
  var HOW_TO_PLAY = 'WATCH THE ORDER · THEN TAP THE INGREDIENTS IN SEQUENCE';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 12 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var COLS = 3, BTN_W = 300, BTN_H = 220, GAP = 24;
  var BOX = snap((W - (COLS * BTN_W + (COLS - 1) * GAP)) / 2), BOY = snap(H * 0.60);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, seqLen, playerIdx, iphase, showIdx, showTimer, orders, misses, timeLeft, done, particles, flash, flashCol, hlBtn, hlTimer, resultText, resultTimer;
  var SHOW_EACH = 0.65;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a0e00');
  }

  function background() { game.draw.clear(C.bg); }

  function genSequence() { sequence = []; for (var i = 0; i < seqLen; i++) sequence.push(Math.floor(Math.random() * ITEMS.length)); showIdx = 0; showTimer = SHOW_EACH; playerIdx = 0; iphase = 'show'; }

  function initGame() { seqLen = 3; orders = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; hlBtn = -1; hlTimer = 0; resultText = ''; resultTimer = 0; genSequence(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (orders * 700 + Math.ceil(timeLeft) * 100) : orders * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function btnAt(tx, ty) { for (var i = 0; i < ITEMS.length; i++) { var bx = BOX + (i % COLS) * (BTN_W + GAP), by = BOY + Math.floor(i / COLS) * (BTN_H + GAP); if (tx >= bx && tx <= bx + BTN_W && ty >= by && ty <= by + BTN_H) return i; } return -1; }

  function drawButtons() {
    for (var i = 0; i < ITEMS.length; i++) { var bx = BOX + (i % COLS) * (BTN_W + GAP), by = BOY + Math.floor(i / COLS) * (BTN_H + GAP), hl = i === hlBtn; game.draw.rect(bx + 4, by + 4, BTN_W - 8, BTN_H - 8, ITEMS[i].col, hl ? 0.95 : 0.6); game.draw.rect(bx + 4, by + 4, BTN_W - 8, 12, C.g, 0.2); txt(ITEMS[i].name, bx + BTN_W / 2, by + BTN_H / 2 + 20, 56, C.bg); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'input') return;
    var idx = btnAt(tx, ty); if (idx < 0) return; hlBtn = idx; hlTimer = 0.2; game.audio.play('se_tap', 0.4);
    if (idx === sequence[playerIdx]) {
      playerIdx++;
      if (playerIdx >= sequence.length) {
        orders++; flash = 0.4; flashCol = C.b; resultText = 'YES!'; resultTimer = 0.8; game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.4, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); }
        if (orders >= NEEDED) { finish(true); return; }
        if (seqLen < 6) seqLen++; iphase = 'wait'; setTimeout(function() { if (!done) genSequence(); }, 600);
      }
    } else { misses++; flash = 0.5; flashCol = C.a; resultText = 'NO!'; resultTimer = 0.8; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } iphase = 'wait'; setTimeout(function() { if (!done) genSequence(); }, 700); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) initGame(); background(); drawButtons();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.18, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ORDERS UP!' : 'SENT BACK', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (hlTimer > 0) { hlTimer -= dt; if (hlTimer <= 0) hlBtn = -1; }
      if (iphase === 'show') { showTimer -= dt; if (showTimer <= 0) { showIdx++; if (showIdx >= sequence.length) iphase = 'input'; else { showTimer = SHOW_EACH; game.audio.play('se_tap', 0.3); } } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    game.draw.rect(60, H * 0.24, W - 120, H * 0.28, '#1a0e00', 0.9);
    if (iphase === 'show') {
      var it = ITEMS[sequence[showIdx]]; pc(W / 2, H * 0.36, 110, it.col, 0.85); pc(W / 2 - 30, H * 0.36 - 30, 30, C.g, 0.3); txt(it.name, W / 2, H * 0.36 + 24, 56, C.bg);
      for (var di = 0; di < sequence.length; di++) game.draw.rect(snap(W / 2 - (sequence.length - 1) * 34 + di * 68) - 12, snap(H * 0.48) - 12, 24, 24, di <= showIdx ? ITEMS[sequence[di]].col : '#374151', di <= showIdx ? 0.9 : 0.5);
      txt('WATCH', W / 2, H * 0.28, 52, C.c);
    } else {
      txt('ORDER!', W / 2, H * 0.28, 52, C.c);
      for (var si = 0; si < sequence.length; si++) game.draw.rect(snap(W / 2 - (sequence.length - 1) * 34 + si * 68) - 12, snap(H * 0.38) - 12, 24, 24, si < playerIdx ? ITEMS[sequence[si]].col : '#374151', si < playerIdx ? 0.9 : 0.4);
    }
    drawButtons();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.54), 64, flashCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(orders + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a0e00');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
