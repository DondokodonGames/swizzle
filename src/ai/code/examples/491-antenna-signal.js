// 491-antenna-signal.js
// アンテナ信号 — 揺れ動く電波強度メーターを見て、ピーク（緑の閾値超え）でタップする
// 操作: 信号が最大付近に来た瞬間にタップ（弱い所で押すとミス）
// 成功: 5回 キャッチ  失敗: 3回 弱押し or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、電波解析室） ──
  var C = { bg:'#020a06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ANTENNA SIGNAL';
  var HOW_TO_PLAY = 'TAP WHEN THE SIGNAL PEAKS ABOVE THE GREEN LINE';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 10 → 5
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var TH_HI = 0.80, TH_MED = 0.62;
  var GX = 60, GW = W - 120, GY = H * 0.30, GH = H * 0.28;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var signal, phase, period, hits, misses, timeLeft, done, particles, resultText, resultCol, resultTimer, history;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0e');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { signal = 0; phase = Math.random() * Math.PI * 2; period = 2.5; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; resultText = ''; resultTimer = 0; history = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 700 + Math.ceil(timeLeft) * 100) : hits * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGraph() {
    game.draw.rect(GX - 10, GY - 10, GW + 20, GH + 20, '#0a1a0e', 0.9);
    pline(GX, GY + GH * (1 - TH_HI), GX + GW, GY + GH * (1 - TH_HI), C.b, 0.7, 4);
    pline(GX, GY + GH * (1 - TH_MED), GX + GW, GY + GH * (1 - TH_MED), C.d, 0.5, 2);
    txt('MAX', GX + 40, GY + GH * (1 - TH_HI) - 6, 24, C.b, 'left');
    for (var hi = 1; hi < history.length; hi++) { var x1 = GX + (hi - 1) / 100 * GW, x2 = GX + hi / 100 * GW, y1 = GY + GH * (1 - history[hi - 1]), y2 = GY + GH * (1 - history[hi]); pline(x1, y1, x2, y2, history[hi] >= TH_HI ? C.b : C.d, 0.9, 4); }
    var cy = GY + GH * (1 - signal); pc(GX + GW, cy, 16, signal >= TH_HI ? C.b : C.d, 0.9);
    // メーター
    var mH = H * 0.16, mY = H * 0.68;
    game.draw.rect(W / 2 - 200, mY, 400, mH, '#0a1a0e', 0.8);
    game.draw.rect(W / 2 - 200, mY + mH * (1 - signal), 400, mH * signal, signal >= TH_HI ? C.b : C.d, 0.85);
    game.draw.rect(W / 2 - 200, mY + mH * (1 - TH_HI), 400, 6, C.c, 0.7);
    txt(Math.floor(signal * 100) + '%', W / 2, mY + mH / 2 + 20, 72, C.g);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (signal >= TH_HI) {
      hits++; resultText = 'PEAK!'; resultCol = C.c; game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: GY + GH * (1 - signal), vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6, col: C.c }); }
      if (hits >= NEEDED) { finish(true); return; }
    } else if (signal >= TH_MED) { hits++; resultText = 'OK'; resultCol = C.b; game.audio.play('se_tap', 0.5); if (hits >= NEEDED) { finish(true); return; } }
    else { misses++; resultText = 'TOO WEAK'; resultCol = C.a; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }
    resultTimer = 0.8;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    phase += dt / period * Math.PI * 2;
    signal = Math.max(0, Math.min(1, Math.sin(phase) * 0.5 + 0.5 + Math.sin(phase * 2.3 + 1.1) * 0.2 + Math.sin(phase * 0.7 + 2.2) * 0.15));
    history.push(signal); if (history.length > 100) history.shift();

    if (state === S.ATTRACT) {
      if (signal === undefined) initGame(); background(); drawGraph();
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 42, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LOCKED ON!' : 'STATIC', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (resultTimer > 0) resultTimer -= dt;
      if (Math.random() < dt * 0.3) { period = 2.0 + Math.random() * 2.0; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGraph();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 56, resultCol); else txt('TAP!', W / 2, snap(H * 0.90), 48, C.d);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1a0e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
