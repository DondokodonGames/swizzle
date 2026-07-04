// 737-scanner-lock.js
// スキャナーロック — 上下に走査するスキャン線がターゲットゾーンに来た瞬間にタップする
// 操作: スキャン線が緑のゾーン内にあるときタップでロック。ゾーン外はミス。線は加速
// 成功: 10回 ロック  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、スキャナー） ──
  var C = { bg:'#020d1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SCANNER LOCK';
  var HOW_TO_PLAY = 'TAP WHEN THE SCAN LINE CROSSES THE GREEN TARGET ZONE';
  var MAX_TIME = 20;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var SCAN_Y0 = snap(H * 0.20), SCAN_Y1 = snap(H * 0.80), ZONE_HALF = 72, ZONE_CY = snap(H * 0.50), SCAN_SPEED = 540;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var scanY, scanDir, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, lockTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#05101f');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { scanY = SCAN_Y0; scanDir = 1; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; lockTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var inZone = Math.abs(scanY - ZONE_CY) < ZONE_HALF, SCAN_H = SCAN_Y1 - SCAN_Y0;
    game.draw.rect(0, SCAN_Y0, W, SCAN_H, '#0a2a3a', 0.4);
    for (var gl = 0; gl <= 10; gl++) game.draw.line(0, SCAN_Y0 + gl * (SCAN_H / 10), W, SCAN_Y0 + gl * (SCAN_H / 10), C.e, 0.08);
    var zy0 = ZONE_CY - ZONE_HALF, zy1 = ZONE_CY + ZONE_HALF;
    game.draw.rect(0, zy0, W, ZONE_HALF * 2, inZone ? C.b : '#0e3a50', inZone ? 0.22 : 0.18);
    game.draw.line(0, zy0, W, zy0, inZone ? C.b : C.e, inZone ? 4 : 2); game.draw.line(0, zy1, W, zy1, inZone ? C.b : C.e, inZone ? 4 : 2);
    txt('TARGET', W / 2, ZONE_CY, 40, inZone ? C.b : C.e);
    game.draw.rect(0, scanY - 4, W, 8, C.e, inZone ? 1.0 : 0.8);
    game.draw.rect(0, scanY - 22, 52, 44, C.e, inZone ? 0.9 : 0.6); game.draw.rect(W - 52, scanY - 22, 52, 44, C.e, inZone ? 0.9 : 0.6);
    if (inZone && lockTimer <= 0) txt('TAP NOW!', W / 2, snap(H * 0.87), 56, C.b);
    else txt('TAP IN ZONE', W / 2, snap(H * 0.87), 40, '#e0f7ff44');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lockTimer > 0) return;
    var inZone = Math.abs(scanY - ZONE_CY) < ZONE_HALF;
    if (inZone) {
      score++; flash = 0.25; flashCol = C.b; resultText = 'LOCK!'; resultTimer = 0.4; game.audio.play('se_tap', 0.12); lockTimer = 0.28;
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: scanY, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.4, col: C.e }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = Math.round(Math.abs(scanY - ZONE_CY) - ZONE_HALF) + 'px OFF!'; resultTimer = 0.4; game.audio.play('se_failure', 0.25); lockTimer = 0.18;
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (scanY === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.93, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TARGET LOCKED!' : 'SCAN FAILED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (lockTimer > 0) lockTimer -= dt;
      var spd = Math.min(1100, SCAN_SPEED + score * 24);
      scanY += spd * scanDir * dt;
      if (scanY > SCAN_Y1) { scanY = SCAN_Y1; scanDir = -1; } if (scanY < SCAN_Y0) { scanY = SCAN_Y0; scanDir = 1; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.13), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#05101f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
