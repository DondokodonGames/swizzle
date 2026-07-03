// 545-pulse-catch.js
// パルスキャッチ — 中心から拡大するリングが、白いターゲット円と重なる瞬間にタップで止める
// 操作: 広がるリングがターゲットサイズに来た瞬間タップ（誤差小=PERFECT / 大きく外すとMISS）
// 成功: 6回 キャッチ  失敗: 3回 外し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、レーダー） ──
  var C = { bg:'#050014', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PULSE CATCH';
  var HOW_TO_PLAY = 'TAP WHEN THE EXPANDING RING MATCHES THE TARGET CIRCLE';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var TR_MIN = 90, TR_MAX = 240, RS_MIN = 220, RS_MAX = 560, TOL_P = 20, TOL_G = 42;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targetR, ringR, ringSpeed, phase, waitTimer, cx, cy, caught, misses, timeLeft, done, resultText, resultTimer, resultCol, particles, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function ring(cx, cy, r, color, alpha, w) { w = w || 8; var n = Math.max(8, Math.ceil(r / 6)); for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; game.draw.rect(snap(cx + Math.cos(a) * r) - w / 2, snap(cy + Math.sin(a) * r) - w / 2, w, w, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#0a0820');
  }

  function background() { game.draw.clear(C.bg); }

  function nextRound() { targetR = TR_MIN + Math.random() * (TR_MAX - TR_MIN); cx = W * 0.25 + Math.random() * W * 0.5; cy = H * 0.32 + Math.random() * H * 0.28; ringR = 0; ringSpeed = Math.min(RS_MAX * 1.4, RS_MIN + Math.random() * (RS_MAX - RS_MIN) + caught * 8); phase = 'expanding'; }

  function initGame() { caught = 0; misses = 0; timeLeft = MAX_TIME; done = false; resultText = ''; resultTimer = 0; resultCol = C.b; particles = []; flash = 0; nextRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 700 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    ring(cx, cy, targetR, C.g, 0.5, 8);
    ring(cx, cy, targetR + TOL_G, C.b, 0.12, 6);
    game.draw.rect(snap(cx) - 6, snap(cy) - 6, 12, 12, C.g, 0.6);
    if (phase === 'expanding' && ringR > 0) {
      var diff = Math.abs(ringR - targetR), col = diff <= TOL_P ? C.b : diff <= TOL_G ? C.c : C.f;
      ring(cx, cy, ringR, col, 0.95, 10);
      if (diff <= TOL_P) ring(cx, cy, ringR + 16 + Math.sin(game.time.elapsed * 12) * 4, col, 0.25, 6);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || phase !== 'expanding') return;
    var diff = Math.abs(ringR - targetR);
    if (diff <= TOL_P) { caught++; resultText = 'PERFECT!'; resultCol = C.b; resultTimer = 0.7; flash = 0.3; game.audio.play('se_success', 0.9); for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cy, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: C.b }); } }
    else if (diff <= TOL_G) { caught++; resultText = 'GOOD!'; resultCol = C.c; resultTimer = 0.6; flash = 0.15; game.audio.play('se_success', 0.6); for (var pi2 = 0; pi2 < 8; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cy, vx: Math.cos(a2) * 160, vy: Math.sin(a2) * 160, life: 0.4, col: C.c }); } }
    else { misses++; resultText = 'MISS'; resultCol = C.a; resultTimer = 0.5; flash = 0.2; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }
    if (caught >= NEEDED) { finish(true); return; }
    phase = 'wait'; waitTimer = 0.4;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (targetR === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.13, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.175, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN SYNC!' : 'DESYNC', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (resultTimer > 0) resultTimer -= dt;
      if (phase === 'expanding') {
        ringR += ringSpeed * dt;
        if (ringR > targetR + TOL_G * 2) { misses++; resultText = 'MISS'; resultCol = C.a; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } phase = 'wait'; waitTimer = 0.3; }
      } else if (phase === 'wait') { waitTimer -= dt; if (waitTimer <= 0) nextRound(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, resultCol, flash * 0.1);

    if (resultTimer > 0) txt(resultText, W / 2, snap(cy + targetR + 100), 64, resultCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a0820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
