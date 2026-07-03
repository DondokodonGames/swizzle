// 516-grid-light.js
// グリッドライト — 順番に点灯するセルを記憶し、消えた後に同じセルをタップして再現する
// 操作: 光ったセルを覚え、RECALLフェーズで同じセルをタップ（間違えるとミス）
// 成功: 3ラウンド クリア  失敗: 3ミス or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、記憶パネル） ──
  var C = { bg:'#000508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRID LIGHT';
  var HOW_TO_PLAY = 'MEMORIZE THE LIT CELLS · THEN TAP THEM ALL BACK';
  var MAX_TIME = 25;
  var NEEDED   = 3;          // 修正2: 12 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var GRID = 4, CELL = 240, SHOW_EACH = 0.6;
  var OX = snap((W - GRID * CELL) / 2), OY = snap(H * 0.28);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sequence, seqLen, iphase, showIdx, showTimer, litCells, correctCells, rounds, misses, timeLeft, done, particles, flash, flashCol, delayTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#020e12');
  }

  function background() { game.draw.clear(C.bg); }

  function genSequence() {
    sequence = []; var used = {};
    for (var i = 0; i < seqLen; i++) { var cell, at = 0; do { cell = Math.floor(Math.random() * GRID * GRID); at++; } while (used[cell] && at < 30); used[cell] = true; sequence.push(cell); }
    showIdx = 0; showTimer = SHOW_EACH; iphase = 'show'; litCells = {}; correctCells = {};
    for (var si = 0; si < sequence.length; si++) correctCells[sequence[si]] = true;
  }

  function initGame() { seqLen = 3; rounds = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; delayTimer = 0; genSequence(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (rounds * 800 + Math.ceil(timeLeft) * 100) : rounds * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGrid() {
    game.draw.rect(OX - 12, OY - 12, GRID * CELL + 24, GRID * CELL + 24, '#020e12', 0.9);
    for (var r = 0; r < GRID; r++) for (var c = 0; c < GRID; c++) {
      var cell = r * GRID + c, cx = OX + c * CELL, cy = OY + r * CELL, lit = iphase === 'show' ? sequence[showIdx] === cell : !!litCells[cell];
      game.draw.rect(cx + 8, cy + 8, CELL - 16, CELL - 16, lit ? C.e : '#04161c', 0.9);
      if (lit) { game.draw.rect(cx + 8, cy + 8, CELL - 16, CELL - 16, C.g, 0.15); game.draw.rect(cx + 8, cy + 8, CELL - 16, 10, C.g, 0.4); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'recall') return;
    var col = Math.floor((tx - OX) / CELL), row = Math.floor((ty - OY) / CELL);
    if (col < 0 || col >= GRID || row < 0 || row >= GRID) return;
    var cell = row * GRID + col; if (litCells[cell]) return;
    litCells[cell] = true; game.audio.play('se_tap', 0.3);
    if (correctCells[cell]) {
      for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: OX + col * CELL + CELL / 2, y: OY + row * CELL + CELL / 2, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, life: 0.35, col: C.e }); }
      var found = 0; for (var ci in litCells) if (correctCells[ci]) found++;
      if (found >= sequence.length) { rounds++; flash = 0.5; flashCol = C.b; game.audio.play('se_success', 0.8); if (rounds >= NEEDED) { finish(true); return; } if (seqLen < 6) seqLen++; iphase = 'wait'; delayTimer = 0.7; }
    } else { misses++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!sequence) initGame(); background(); drawGrid();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PHOTOGRAPHIC!' : 'BLANKED OUT', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
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
      if (delayTimer > 0) { delayTimer -= dt; if (delayTimer <= 0) genSequence(); }
      if (iphase === 'show') { showTimer -= dt; if (showTimer <= 0) { showIdx++; if (showIdx >= sequence.length) iphase = 'recall'; else { showTimer = SHOW_EACH; game.audio.play('se_tap', 0.25); } } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGrid();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    txt(iphase === 'show' ? 'MEMORIZE  ' + (showIdx + 1) + '/' + sequence.length : iphase === 'recall' ? 'RECALL  ' + seqLen : '', W / 2, snap(OY + GRID * CELL + 60), 48, C.c);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(rounds + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#020e12');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
