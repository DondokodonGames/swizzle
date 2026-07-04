// 757-pulse-ring.js
// パルスリング — 広がっていくリングが目標リングと重なった瞬間にタップする
// 操作: 拡大するリングが目標帯に重なった瞬間タップ。ズレ・通過はミス
// 成功: 10回 成功  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、波動） ──
  var C = { bg:'#040812', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PULSE = '#00cfff', PULSE_HI = '#e0f2fe', TARGET = '#ff6600', TARGET_HI = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PULSE RING';
  var HOW_TO_PLAY = 'A RING EXPANDS OUTWARD · TAP WHEN IT OVERLAPS THE TARGET RING';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.44), MAX_R = 340, TOL = 22, WAIT_DUR = 0.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pulseR, pulseSpeed, targetR, pulsing, waitTimer, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#080c18');
  }

  function background() { game.draw.clear(C.bg); }

  function nextPulse() { pulseR = 0; targetR = 80 + Math.random() * 200; pulseSpeed = Math.min(380, 200 + score * 12); pulsing = true; }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; nextPulse(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var inZone = Math.abs(pulseR - targetR) < TOL && pulsing;
    ring(CX, CY, targetR, inZone ? TARGET_HI : TARGET, inZone ? 0.95 : 0.6);
    txt('TARGET', CX + targetR + 70, CY - 20, 32, TARGET);
    if (pulseR > 0) { var col = inZone ? C.b : PULSE; ring(CX, CY, pulseR, col, pulsing ? (inZone ? 1.0 : 0.85) : 0.3); pc(CX, CY, 10, PULSE_HI, 0.9); }
    if (inZone && pulsing) txt('NOW!', W / 2, snap(H * 0.80), 72, TARGET_HI);
    else if (pulsing) txt('MATCH THE RING', W / 2, snap(H * 0.80), 36, '#ffffff55');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !pulsing || waitTimer > 0) return;
    var diff = Math.abs(pulseR - targetR);
    if (diff < TOL) {
      score++; pulsing = false; flash = 0.22; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.38; game.audio.play('se_success', 0.55);
      for (var p = 0; p < 10; p++) { var pa = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 140; particles.push({ x: CX + Math.cos(pa) * targetR, y: CY + Math.sin(pa) * targetR, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp, life: 0.4, col: C.b }); }
      waitTimer = WAIT_DUR;
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; pulsing = false; flash = 0.32; flashCol = C.a; resultText = pulseR > targetR ? 'TOO BIG!' : 'TOO SMALL!'; resultTimer = 0.45; game.audio.play('se_failure', 0.28);
      waitTimer = WAIT_DUR;
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pulseR === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN RESONANCE!' : 'OFF PULSE', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) nextPulse(); }
      else if (pulsing) { pulseR += pulseSpeed * dt; if (pulseR > MAX_R + TOL) { errors++; pulsing = false; flash = 0.32; flashCol = C.a; resultText = 'TOO LATE!'; resultTimer = 0.45; game.audio.play('se_failure', 0.25); waitTimer = WAIT_DUR; if (errors >= MAX_ERR) { finish(false); return; } } }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.4; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 50, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#080c18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
