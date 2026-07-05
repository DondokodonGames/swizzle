// 773-tile-memory.js
// タイルメモリー — 光ったタイルを覚えて、消えた後に正確に再現せよ
// 操作: 記憶フェーズは見るだけ、再現フェーズで覚えたタイルをタップ
// 成功: 10ラウンド 完璧  失敗: 3回 ミス or 26秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#08050f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var TILE = '#161230', LIT = '#7700ff', LIT_HI = '#c9b8ff', MARKED = '#ff6600', MARKED_HI = '#ffd8a0';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE MEMORY';
  var HOW_TO_PLAY = 'MEMORIZE THE LIT TILES · THEN TAP THEM ALL AFTER THEY VANISH';
  var MAX_TIME = 26;
  var NEEDED   = 10;         // 修正2: 20 → 10
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var COLS = 3, ROWS = 3, MARGIN = snap(W * 0.1), TILE_GAP = 16;
  var TILE_W = snap((W - MARGIN * 2 - TILE_GAP * (COLS - 1)) / COLS), TILE_H = TILE_W, GRID_Y = snap(H * 0.32);
  var WAIT_DUR = 0.45;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var memPhase, showTimer, showDur, waitTimer, litSet, markedSet, tileCount, score, errors, done, timeLeft, elapsed, flash, flashCol, resultText, resultTimer, particles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#100c1c');
  }

  function background() { game.draw.clear(C.bg); }

  function getTileRect(idx) { var col = idx % COLS, row = Math.floor(idx / COLS); return { x: MARGIN + col * (TILE_W + TILE_GAP), y: GRID_Y + row * (TILE_H + TILE_GAP), w: TILE_W, h: TILE_H }; }

  function newRound() {
    litSet = []; markedSet = []; tileCount = Math.min(6, 2 + Math.floor(score / 3));
    while (litSet.length < tileCount) { var ti = Math.floor(Math.random() * COLS * ROWS); if (litSet.indexOf(ti) < 0) litSet.push(ti); }
    showDur = Math.max(0.8, 1.5 - score * 0.04); showTimer = showDur; memPhase = 'show';
  }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; particles = []; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function submitAnswer() {
    var correct = litSet.length === markedSet.length;
    if (correct) for (var i = 0; i < litSet.length; i++) if (markedSet.indexOf(litSet[i]) < 0) { correct = false; break; }
    if (correct) {
      score++; flash = 0.22; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.4; game.audio.play('se_success', 0.65);
      for (var i2 = 0; i2 < litSet.length; i2++) { var r2 = getTileRect(litSet[i2]); for (var p = 0; p < 3; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: r2.x + r2.w / 2, y: r2.y + r2.h / 2, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.35, col: LIT_HI }); } }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.45; game.audio.play('se_failure', 0.28);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
    memPhase = 'wait'; waitTimer = WAIT_DUR;
  }

  function drawScene() {
    if (memPhase === 'show') { txt('MEMORIZE', W / 2, snap(H * 0.24), 56, LIT); var showFrac = showTimer / showDur; game.draw.rect(W / 2 - 240, snap(H * 0.28), 480, 12, '#161230', 0.8); game.draw.rect(W / 2 - 240, snap(H * 0.28), 480 * showFrac, 12, LIT, 0.85); }
    else if (memPhase === 'recall') txt('RECALL  ' + markedSet.length + ' / ' + litSet.length, W / 2, snap(H * 0.25), 46, MARKED);
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = getTileRect(i), isLit = litSet.indexOf(i) >= 0, isMarked = markedSet.indexOf(i) >= 0, showLit = memPhase === 'show' && isLit;
      game.draw.rect(r.x, r.y, r.w, r.h, showLit ? LIT : (isMarked ? '#2c1a08' : TILE), 0.9);
      if (showLit) { game.draw.rect(r.x, r.y, r.w, r.h, LIT, 0.5); pc(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.3, LIT_HI, 0.5); game.draw.rect(r.x, r.y, r.w, 8, LIT_HI, 0.4); }
      else if (isMarked) { game.draw.rect(r.x, r.y, r.w, r.h, MARKED, 0.35); pc(r.x + r.w / 2, r.y + r.h / 2, r.w * 0.28, MARKED_HI, 0.5); }
      if (memPhase === 'wait' && resultTimer > 0 && flashCol === C.a && isLit) game.draw.rect(r.x, r.y, r.w, r.h, C.b, 0.3);
    }
    if (memPhase === 'recall') txt('TAP ' + litSet.length + ' TILES YOU SAW', W / 2, snap(H * 0.82), 34, C.g);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || memPhase !== 'recall') return;
    var tappedIdx = -1;
    for (var i = 0; i < COLS * ROWS; i++) { var r = getTileRect(i); if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) { tappedIdx = i; break; } }
    if (tappedIdx < 0) return;
    var mi = markedSet.indexOf(tappedIdx);
    if (mi >= 0) { markedSet.splice(mi, 1); game.audio.play('se_tap', 0.06); }
    else if (markedSet.length < litSet.length) { markedSet.push(tappedIdx); game.audio.play('se_tap', 0.09); if (markedSet.length === litSet.length) submitAnswer(); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!litSet) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TOTAL RECALL!' : 'MEMORY FADED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (memPhase === 'show') { showTimer -= dt; if (showTimer <= 0) memPhase = 'recall'; }
      else if (memPhase === 'wait') { waitTimer -= dt; if (waitTimer <= 0) newRound(); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.8; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p2 = particles[pp2]; game.draw.rect(snap(p2.x) - 5, snap(p2.y) - 5, 10, 10, p2.col, p2.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#100c1c');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
