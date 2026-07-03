// 557-antenna-boost.js
// アンテナブースト — 揺らぐ信号強度を見て、閾値を超えて跳ね上がった瞬間にタップでブースト
// 操作: 信号バーが上のTAP ZONEに入った瞬間タップ（平常時に押すとミス）
// 成功: ブースト 6回 成功  失敗: 3回 ミス or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、無線塔） ──
  var C = { bg:'#020810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ANTENNA BOOST';
  var HOW_TO_PLAY = 'TAP WHEN THE SIGNAL SPIKES ABOVE THE TAP ZONE LINE';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var BAR_X = 120, BAR_Y = snap(H * 0.26), BAR_W = W - 240, BAR_H = 260, THRESH = 0.65;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var signal, sigVel, boostCount, misses, timeLeft, done, particles, flash, flashCol, boostAnim, lastResult, lastTimer, lastCol, spikeTimer, spikePhase, spikeT;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#050f1a');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { signal = 0.3; sigVel = 0; boostCount = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; boostAnim = 0; lastResult = ''; lastTimer = 0; lastCol = C.b; spikeTimer = 1.5; spikePhase = 'none'; spikeT = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (boostCount * 700 + Math.ceil(timeLeft) * 100) : boostCount * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(BAR_X - 20, BAR_Y - 20, BAR_W + 40, BAR_H + 40, '#050f1a', 0.9);
    game.draw.rect(BAR_X, BAR_Y, BAR_W, BAR_H, '#001a2a', 0.9);
    var fillH = BAR_H * signal, barCol = signal > THRESH ? C.e : signal > 0.4 ? C.d : '#0066aa';
    game.draw.rect(BAR_X, BAR_Y + BAR_H - fillH, BAR_W, fillH, barCol, 0.9);
    var threshY = BAR_Y + BAR_H * (1 - THRESH);
    game.draw.rect(BAR_X, threshY - 2, BAR_W, 4, C.f, 0.9); txt('TAP ZONE', BAR_X + BAR_W - 40, threshY - 14, 24, C.f, 'right');
    if (signal > THRESH) txt('BOOST!', W / 2, BAR_Y - 40, 52, C.c);
    // アンテナ
    var antH = 200 + signal * 100;
    game.draw.rect(W / 2 - 6, snap(H * 0.82) - antH, 12, antH, '#334455', 0.9);
    game.draw.rect(W / 2 - 80, snap(H * 0.82) - antH * 0.5, 160, 6, '#334455', 0.9);
    for (var ri = 0; ri < 3; ri++) { var rr = (ri + 1) * 40 + boostAnim * 60; pc(W / 2, snap(H * 0.82) - antH, rr, signal > THRESH ? C.c : C.d, (1 - ri * 0.3) * signal * 0.5); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (signal > THRESH) {
      var q = (signal - THRESH) / (1 - THRESH); boostCount++; boostAnim = 0.5; flash = 0.3; flashCol = C.b; lastResult = q > 0.7 ? 'PERFECT!' : 'GOOD'; lastCol = q > 0.7 ? C.c : C.b; lastTimer = 0.7; game.audio.play('se_success', 0.7 + q * 0.2);
      for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: BAR_Y + BAR_H / 2, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 0.5, col: q > 0.7 ? C.c : C.e }); }
      signal = 0.2; if (boostCount >= NEEDED) { finish(true); return; }
    } else { misses++; flash = 0.3; flashCol = C.a; lastResult = 'MISS'; lastCol = C.a; lastTimer = 0.6; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (signal === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.13, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.175, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SIGNAL MAX!' : 'NO SIGNAL', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (boostAnim > 0) boostAnim -= dt * 2.5; if (lastTimer > 0) lastTimer -= dt;
      if (spikePhase === 'none') { spikeTimer -= dt; sigVel += (Math.random() - 0.5) * 1.5 * dt; sigVel *= 0.85; signal += sigVel; signal = Math.max(0.05, Math.min(0.55, signal)); signal += (0.3 - signal) * dt * 1.5; if (spikeTimer <= 0) { spikePhase = 'rising'; spikeT = 0.25; spikeTimer = 1.2 + Math.random() * 2.4; } }
      else if (spikePhase === 'rising') { spikeT -= dt; signal = 0.3 + 0.4 * (1 - spikeT / 0.25); if (spikeT <= 0) { spikePhase = 'hold'; spikeT = 0.2 + Math.random() * 0.3; signal = 0.9; } }
      else if (spikePhase === 'hold') { spikeT -= dt; signal = 0.85 + Math.random() * 0.1; if (spikeT <= 0) { spikePhase = 'falling'; spikeT = 0.3; } }
      else if (spikePhase === 'falling') { spikeT -= dt; signal = 0.3 + 0.4 * (spikeT / 0.3); if (spikeT <= 0) { spikePhase = 'none'; signal = 0.3; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (lastTimer > 0) txt(lastResult, W / 2, BAR_Y + BAR_H + 120, 56, lastCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(boostCount + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#050f1a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
