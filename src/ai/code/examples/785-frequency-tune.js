// 785-frequency-tune.js
// フリークエンシーチューン — ノイズの中から目標周波数に合わせて維持せよ
// 操作: 左半分タップで周波数↓、右半分タップで↑。緑ゾーンに合わせてキープ
// 成功: 10回 チューン成功  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、波形は保持） ──
  var C = { bg:'#03070a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var WAVE = '#00cfff', TARGET = '#00ff41', TUNED = '#7fffb0', KNOB = '#8494a8';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FREQUENCY TUNE';
  var HOW_TO_PLAY = 'TAP LEFT TO LOWER, RIGHT TO RAISE · LOCK ONTO THE GREEN TARGET BAND';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var TUNE_ZONE = 0.06, TUNE_HOLD = 0.6, WAIT_DUR = 0.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var currentFreq, targetFreq, driftSpeed, tunedTimer, confirming, waitTimer, score, errors, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 12; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'right') game.draw.rect(cx + i - size / 2, cy - w / 2, st, w, color, 0.95); else game.draw.rect(cx - i + size / 2 - st, cy - w / 2, st, w, color, 0.95); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#040810');
  }

  function background() { game.draw.clear(C.bg); }

  function newTarget() {
    var oldTarget = targetFreq || 0.5;
    do { targetFreq = 0.1 + Math.random() * 0.8; } while (Math.abs(targetFreq - oldTarget) < 0.2);
    driftSpeed = (Math.random() - 0.5) * 0.04 * Math.min(1, score * 0.1); tunedTimer = 0; confirming = false;
  }

  function isInTune() { return Math.abs(currentFreq - targetFreq) <= TUNE_ZONE; }

  function initGame() { currentFreq = 0.5; targetFreq = 0.5; score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; tunedTimer = 0; confirming = false; newTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var inTune = isInTune(), waveY = snap(H * 0.45), waveAmp = 120, freq = 4 + currentFreq * 12, tFreq = 4 + targetFreq * 12, noiseAmt = inTune ? 0 : (1 - Math.max(0, 1 - Math.abs(currentFreq - targetFreq) * 5)) * 0.4;
    for (var xi = 0; xi < W; xi += 12) { var tx2 = xi / W, ty2 = waveY + Math.sin(tx2 * tFreq * Math.PI * 2 + elapsed * 3) * waveAmp * 0.6; game.draw.rect(snap(xi), snap(ty2), 8, 8, TARGET, 0.25); }
    for (var xi2 = 0; xi2 < W; xi2 += 12) { var tx3 = xi2 / W, noise = (Math.random() - 0.5) * waveAmp * noiseAmt, ty3 = waveY + Math.sin(tx3 * freq * Math.PI * 2 + elapsed * 4) * waveAmp + noise; game.draw.rect(snap(xi2), snap(ty3), 10, 10, inTune ? TUNED : WAVE, inTune ? 0.8 : 0.6); }
    var specY = snap(H * 0.68), specH = 60;
    game.draw.rect(40, specY, W - 80, specH, '#0a1520', 0.9);
    var tX = 40 + (W - 80) * targetFreq, zoneW = (W - 80) * TUNE_ZONE * 2;
    game.draw.rect(tX - zoneW / 2, specY, zoneW, specH, TARGET, 0.15); game.draw.rect(tX - 4, specY - 6, 8, specH + 12, TARGET, 0.8); arrow(tX, specY - 22, 26, 'right', TARGET);
    var cX = 40 + (W - 80) * currentFreq;
    game.draw.rect(cX - 5, specY - 8, 10, specH + 16, inTune ? TUNED : KNOB, 0.95);
    if (inTune && tunedTimer > 0) { var holdPct = Math.min(1, tunedTimer / TUNE_HOLD); game.draw.rect(snap(W * 0.2), snap(H * 0.76), snap(W * 0.6), 18, TUNED, 0.15); game.draw.rect(snap(W * 0.2), snap(H * 0.76), snap(W * 0.6 * holdPct), 18, TUNED, 0.9); }
    txt('TARGET', tX, specY + specH + 30, 28, TARGET); txt('NOW', cX, specY - 50, 26, inTune ? TUNED : KNOB);
    if (state === S.PLAYING) {
      arrow(W * 0.2, snap(H * 0.87), 36, 'left', C.e); txt('LOWER', W * 0.28, snap(H * 0.875), 30, C.g, 'left');
      arrow(W * 0.8, snap(H * 0.87), 36, 'right', C.f); txt('RAISE', W * 0.72, snap(H * 0.875), 30, C.g, 'right');
      if (inTune) txt('HOLD IT!', W / 2, snap(H * 0.18), 60, TUNED);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || waitTimer > 0) return;
    var step = 0.03 - Math.min(0.015, score * 0.002);
    if (tx < W / 2) currentFreq = Math.max(0, currentFreq - step); else currentFreq = Math.min(1, currentFreq + step);
    game.audio.play('se_tap', 0.04);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (currentFreq === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.93, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT SIGNAL!' : 'STATIC', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) newTarget(); }
      else {
        targetFreq += driftSpeed * dt;
        if (targetFreq < 0.05) { targetFreq = 0.05; driftSpeed = Math.abs(driftSpeed); }
        if (targetFreq > 0.95) { targetFreq = 0.95; driftSpeed = -Math.abs(driftSpeed); }
        if (isInTune()) {
          tunedTimer += dt;
          if (tunedTimer >= TUNE_HOLD && !confirming) { confirming = true; score++; flash = 0.22; flashCol = C.b; resultText = 'TUNED!'; resultTimer = 0.4; game.audio.play('se_success', 0.65); for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H * 0.5, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.4, col: TUNED }); } if (score >= NEEDED) { finish(true); return; } waitTimer = WAIT_DUR; }
        } else { if (tunedTimer > 0.2) { errors++; flash = 0.28; flashCol = C.a; resultText = 'LOST IT!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3); if (errors >= MAX_ERR) { finish(false); return; } waitTimer = WAIT_DUR; } tunedTimer = 0; }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y) - 5, 10, 10, p3.col, p3.life * 2.5); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.22), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#040810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
