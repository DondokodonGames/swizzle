// 725-voltage-surge.js
// ボルテージサージ — 乱高下する電圧が安全ゾーンにいる間にタップして充電する
// 操作: 針が緑ゾーン内のときにタップで充電。ゾーン外で押すとオーバーロード
// 成功: 10回 充電  失敗: 3回 オーバーロード or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、電圧計） ──
  var C = { bg:'#020a04', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOLTAGE SURGE';
  var HOW_TO_PLAY = 'TAP WHILE THE NEEDLE SITS IN THE GREEN SAFE ZONE · CHARGE UP';
  var MAX_TIME = 20;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var GAUGE_X = W / 2 - 60, GAUGE_W = 120, GAUGE_Y0 = snap(H * 0.20), GAUGE_H = snap(H * 0.54), SAFE_TOP = 0.30, SAFE_BOT = 0.70;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var voltage, noisePhase1, noisePhase2, noisePhase3, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, chargeAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#030e05');
  }

  function background() { game.draw.clear(C.bg); }

  function inSafeZone() { return voltage >= SAFE_TOP && voltage <= SAFE_BOT; }

  function initGame() { voltage = 0.5; noisePhase1 = 0; noisePhase2 = Math.random() * 10; noisePhase3 = Math.random() * 10; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; chargeAnim = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var safe = inSafeZone(), needleY = GAUGE_Y0 + voltage * GAUGE_H, safeY0 = GAUGE_Y0 + SAFE_TOP * GAUGE_H, safeY1 = GAUGE_Y0 + SAFE_BOT * GAUGE_H;
    game.draw.rect(GAUGE_X - 4, GAUGE_Y0 - 4, GAUGE_W + 8, GAUGE_H + 8, '#052e16', 0.9);
    game.draw.rect(GAUGE_X, GAUGE_Y0, GAUGE_W, GAUGE_H, '#000', 0.6);
    game.draw.rect(GAUGE_X, safeY0, GAUGE_W, safeY1 - safeY0, C.d, 0.35);
    game.draw.line(GAUGE_X, safeY0, GAUGE_X + GAUGE_W, safeY0, C.b, 4); game.draw.line(GAUGE_X, safeY1, GAUGE_X + GAUGE_W, safeY1, C.b, 4);
    var fillH = voltage * GAUGE_H;
    game.draw.rect(GAUGE_X, GAUGE_Y0 + GAUGE_H - fillH, GAUGE_W, fillH, safe ? C.b : C.a, 0.55);
    if (chargeAnim > 0) game.draw.rect(GAUGE_X - 10, GAUGE_Y0 - 10, GAUGE_W + 20, GAUGE_H + 20, C.b, chargeAnim * 0.2);
    game.draw.rect(GAUGE_X - 20, needleY - 5, GAUGE_W + 40, 10, C.c, 0.95); pc(GAUGE_X - 20, needleY, 16, C.c, 0.95);
    txt('HIGH', GAUGE_X + GAUGE_W / 2, GAUGE_Y0 - 32, 30, '#ff330088'); txt('LOW', GAUGE_X + GAUGE_W / 2, GAUGE_Y0 + GAUGE_H + 40, 30, '#ff330088');
    txt('SAFE', GAUGE_X + GAUGE_W + 80, snap((safeY0 + safeY1) / 2) + 14, 32, C.b);
    var statusText = safe ? 'TAP!' : (voltage < SAFE_TOP ? 'TOO LOW' : 'TOO HIGH');
    txt(statusText, W / 2, snap(H * 0.83), 52, safe ? C.b : C.a);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (inSafeZone()) {
      score++; chargeAnim = 0.4; flash = 0.25; flashCol = C.b; resultText = 'CHARGE!'; resultTimer = 0.4; game.audio.play('se_tap', 0.12);
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: GAUGE_X + GAUGE_W / 2, y: GAUGE_Y0 + voltage * GAUGE_H, vx: Math.cos(pa) * 120, vy: Math.sin(pa) * 120, life: 0.4, col: C.b }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.35; flashCol = C.a; resultText = 'OVERLOAD!'; resultTimer = 0.5; game.audio.play('se_failure', 0.4);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (voltage === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.115, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FULLY CHARGED!' : 'CIRCUIT FRIED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      var spd = 1.0 + elapsed * 0.02;
      noisePhase1 += dt * 2.1 * spd; noisePhase2 += dt * 3.7 * spd; noisePhase3 += dt * 5.3 * spd;
      var target = 0.5 + 0.25 * Math.sin(noisePhase1) + 0.15 * Math.sin(noisePhase2) + 0.08 * Math.sin(noisePhase3);
      target = Math.max(0.05, Math.min(0.95, target)); voltage += (target - voltage) * dt * 3.5; voltage = Math.max(0.02, Math.min(0.98, voltage));
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (chargeAnim > 0) chargeAnim -= dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 48, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#030e05');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
