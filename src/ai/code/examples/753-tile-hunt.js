// 753-tile-hunt.js
// タイルハント — 4×4の盤面で一瞬光るタイルを、消える前に素早くタップする
// 操作: 光っているタイルをタップ。別のタイルを押す、または見逃すとミス
// 成功: 12回 発見  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、タイル盤） ──
  var C = { bg:'#07060f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var TILE = '#1a1730', TILE_HI = '#7700ff', LIT = '#a855f7', LIT_HI = '#ede9fe';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TILE HUNT';
  var HOW_TO_PLAY = 'TAP THE GLOWING TILE BEFORE IT GOES DARK · WRONG TILE OR TOO SLOW IS A MISS';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var COLS = 4, ROWS = 4, MARGIN = 80, TILE_GAP = 12, WAIT_DUR = 0.2;
  var TILE_W = (W - MARGIN * 2 - TILE_GAP * (COLS - 1)) / COLS, TILE_H = TILE_W, GRID_Y = snap(H * 0.28);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var litIdx, litTimer, litDur, waitTimer, answered, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0e0c1c');
  }

  function background() { game.draw.clear(C.bg); }

  function getTileRect(idx) { var col = idx % COLS, row = Math.floor(idx / COLS); return { x: MARGIN + col * (TILE_W + TILE_GAP), y: GRID_Y + row * (TILE_H + TILE_GAP), w: TILE_W, h: TILE_H }; }

  function showNext() { litIdx = Math.floor(Math.random() * COLS * ROWS); litDur = Math.max(0.4, 0.75 - score * 0.02); litTimer = litDur; answered = false; }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; showNext(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var i = 0; i < COLS * ROWS; i++) {
      var r = getTileRect(i), isLit = i === litIdx, litFrac = isLit ? (litTimer / litDur) : 0;
      game.draw.rect(r.x, r.y, r.w, r.h, isLit ? TILE_HI : TILE, 0.9);
      if (isLit) { game.draw.rect(r.x, r.y, r.w, r.h, LIT, litFrac * 0.35); game.draw.rect(r.x, r.y, r.w, 6, LIT_HI, litFrac * 0.5); game.draw.rect(r.x, r.y + r.h - 6, r.w * litFrac, 6, LIT_HI, 0.85); }
    }
    if (litIdx >= 0) txt('TAP THE LIT TILE', W / 2, snap(H * 0.87), 42, LIT);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || litIdx < 0 || answered || waitTimer > 0) return;
    var tapped = -1;
    for (var i = 0; i < COLS * ROWS; i++) { var r = getTileRect(i); if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) { tapped = i; break; } }
    if (tapped < 0) return;
    answered = true;
    if (tapped === litIdx) {
      score++; flash = 0.2; flashCol = C.b; resultText = 'FOUND!'; resultTimer = 0.32; game.audio.play('se_tap', 0.1);
      var r2 = getTileRect(litIdx);
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: r2.x + r2.w / 2, y: r2.y + r2.h / 2, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.35, col: LIT_HI }); }
      litIdx = -1; waitTimer = WAIT_DUR;
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.25; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.38; game.audio.play('se_failure', 0.25);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (litIdx === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.93, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYES!' : 'TOO SLOW', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) showNext(); }
      else if (litIdx >= 0 && !answered) { litTimer -= dt; if (litTimer <= 0) { errors++; flash = 0.22; flashCol = C.a; resultText = 'TOO SLOW!'; resultTimer = 0.35; game.audio.play('se_failure', 0.2); litIdx = -1; if (errors >= MAX_ERR) { finish(false); return; } waitTimer = WAIT_DUR; } }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.8; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.91), 50, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0e0c1c');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
