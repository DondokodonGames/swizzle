// 776-countdown-zero.js
// カウントダウンゼロ — カウントが「0」になった瞬間だけタップせよ
// 操作: タップ — カウントが0になった瞬間（短い猶予内）
// 成功: 10回 ジャスト  失敗: 3回 失敗 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、時計） ──
  var C = { bg:'#020208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var NUM_CD = '#7700ff', NUM_ZERO = '#ffe600', ZERO_GLOW = '#fff3b0', TICK = '#00cfff';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COUNTDOWN ZERO';
  var HOW_TO_PLAY = 'TAP ONLY THE INSTANT THE COUNT HITS ZERO · TOO EARLY OR LATE MISSES';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var WAIT_DUR = 0.38;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var count, tickInterval, tickTimer, cdPhase, zeroTimer, zeroWindow, answered, waitTimer, numBounce, score, errors, done, timeLeft, elapsed, ripples, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#080810');
  }

  function background() { game.draw.clear(C.bg); }

  function startCount() {
    count = 2 + Math.floor(Math.random() * 4); tickInterval = Math.max(0.5, 0.9 - score * 0.02); zeroWindow = Math.max(0.24, 0.34 - score * 0.006);
    tickTimer = tickInterval; cdPhase = 'counting'; answered = false; numBounce = 0;
  }

  function initGame() { score = 0; errors = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; ripples = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; startCount(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var cy = snap(H * 0.44);
    ring(W / 2, cy, 260, '#161230', 0.9); ring(W / 2, cy, 230, '#0d0d1f', 0.9);
    for (var ti = 0; ti < 12; ti++) { var ta = ti * Math.PI * 2 / 12 - Math.PI / 2; game.draw.line(W / 2 + Math.cos(ta) * 230, cy + Math.sin(ta) * 230, W / 2 + Math.cos(ta) * 250, cy + Math.sin(ta) * 250, TICK, ti % 3 === 0 ? 5 : 2); }
    for (var ri2 = 0; ri2 < ripples.length; ri2++) { var rp = ripples[ri2]; ring(W / 2, cy, rp.r, C.b, rp.life * 0.6); }
    var isZero = cdPhase === 'zero', bounce = 1.0 + numBounce * 0.15, numSize = Math.floor(280 * bounce);
    if (isZero) txt('0', W / 2, cy + 20, numSize + 40, ZERO_GLOW);
    txt('' + (isZero ? 0 : count), W / 2, cy + 20, numSize, isZero ? NUM_ZERO : NUM_CD);
    if (state === S.PLAYING) {
      if (cdPhase === 'zero' && !answered) { var wFrac = Math.max(0, 1 - zeroTimer / zeroWindow); game.draw.rect(W / 2 - 200, snap(H * 0.70), 400, 16, '#161230', 0.8); game.draw.rect(W / 2 - 200, snap(H * 0.70), 400 * wFrac, 16, NUM_ZERO, 0.9); txt('TAP NOW!', W / 2, snap(H * 0.78), 60, NUM_ZERO); }
      else if (cdPhase === 'counting' && !answered) txt('WAIT FOR ZERO...', W / 2, snap(H * 0.70), 40, C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered || waitTimer > 0) return;
    if (cdPhase === 'zero') {
      var accuracy = 1 - (zeroTimer / zeroWindow); score++; answered = true; flash = 0.22; flashCol = C.b; resultText = accuracy > 0.7 ? 'JUST!' : 'ZERO!'; resultTimer = 0.38; game.audio.play('se_success', 0.65);
      ripples.push({ x: W / 2, y: H * 0.44, r: 0, life: 1.0 });
      if (score >= NEEDED) { finish(true); return; }
      waitTimer = WAIT_DUR;
    } else {
      errors++; answered = true; flash = 0.3; flashCol = C.a; resultText = 'TOO EARLY!'; resultTimer = 0.45; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
      waitTimer = WAIT_DUR;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (count === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT TIMING!' : 'MISTIMED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) startCount(); }
      else {
        if (numBounce > 0) numBounce -= dt * 6;
        if (cdPhase === 'counting') { tickTimer -= dt; if (tickTimer <= 0) { count--; numBounce = 0.5; game.audio.play('se_tap', 0.06); if (count <= 0) { cdPhase = 'zero'; zeroTimer = 0; numBounce = 0.8; } else tickTimer = tickInterval; } }
        else if (cdPhase === 'zero') { zeroTimer += dt; if (zeroTimer > zeroWindow && !answered) { errors++; answered = true; flash = 0.3; flashCol = C.a; resultText = 'TOO LATE!'; resultTimer = 0.45; game.audio.play('se_failure', 0.28); waitTimer = WAIT_DUR; if (errors >= MAX_ERR) { finish(false); return; } } }
      }
      for (var ri = ripples.length - 1; ri >= 0; ri--) { ripples[ri].r += 400 * dt; ripples[ri].life -= dt * 2.5; if (ripples[ri].life <= 0) ripples.splice(ri, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.84), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#080810');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
