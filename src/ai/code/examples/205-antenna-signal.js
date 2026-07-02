// 205-antenna-signal.js
// アンテナ信号 — 軌道を巡る受信機がアンテナ先端に重なった瞬間をタップして電波を掴む
// 操作: 先端に受信機が来たらタップ
// 成功: 3回受信  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、通信基地の夜） ──
  var C = { bg:'#030814', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ANTENNA SIGNAL';
  var HOW_TO_PLAY = 'TAP WHEN THE DISH REACHES THE TIP';
  var MAX_TIME = 15;
  var NEEDED   = 3;             // 修正2: 12 → 3（ceil）
  var MAX_MISS = 3;             // 修正2: 6 → 3
  var ANT_X = snap(W / 2), ANT_BASE = snap(H * 0.78), ANT_TIP = snap(H * 0.30);
  var RECV_R = 48, CATCH_R = 66;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var recvAngle, recvX, recvY, orbitDir, pulses, pulseTimer, waves, score, misses, timeLeft, done, feedback, feedbackOk;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.3) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1424');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var si = 0; si < 24; si++) { var sx = snap((si * 149 + 40) % W), sy = snap((si * 103 + 260) % (H - 260) + 260); game.draw.rect(sx, sy, 4, 4, C.g, 0.15 + 0.15 * (Math.floor(game.time.elapsed * 3 + si) % 2)); }
  }

  function drawAntenna() {
    for (var y = ANT_TIP; y < ANT_BASE; y += 16) game.draw.rect(ANT_X - 6, snap(y), 12, 8, C.d, 0.8);
    game.draw.rect(ANT_X - 40, ANT_BASE, 80, 24, C.d, 0.9);
    pc(ANT_X, ANT_TIP, 16, C.c, 0.9);
  }

  function drawRecv(x, y, atTip) {
    ring(x, y, RECV_R, atTip ? C.b : C.f, 0.5);
    pc(x, y, RECV_R * 0.6, atTip ? C.b : C.f, 0.9);
    game.draw.rect(snap(x) - 4, snap(y) - 4, 8, 8, C.g, 0.8);
  }

  function initGame() {
    recvAngle = 0; orbitDir = 1; pulses = []; pulseTimer = 0; waves = [];
    score = 0; misses = 0; timeLeft = MAX_TIME; done = false; feedback = 0; feedbackOk = false;
    recvX = ANT_X; recvY = ANT_TIP;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 50) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function atTipNow() { return Math.hypot(recvX - ANT_X, recvY - ANT_TIP) < CATCH_R; }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (atTipNow()) {
      score++; feedbackOk = true; feedback = 0.4; game.audio.play('se_success', 0.8);
      for (var wi = 0; wi < 3; wi++) waves.push({ r: 20, life: 0.8, delay: wi * 0.15 });
      if (score >= NEEDED) { finish(true); return; }
    } else {
      misses++; feedbackOk = false; feedback = 0.3; game.audio.play('se_failure', 0.4);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawAntenna();
      drawRecv(ANT_X + Math.cos(game.time.elapsed) * 140, ANT_TIP + Math.sin(game.time.elapsed) * 70, false);
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.91, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LOCKED ON!' : 'LOST SIGNAL', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedback > 0) feedback -= dt;
      recvAngle += (1.6 + score * 0.3) * orbitDir * dt;
      var orbitR = 90 + Math.sin(game.time.elapsed * 0.7) * 60 + Math.sin(game.time.elapsed * 1.3) * 40;
      recvX = ANT_X + Math.cos(recvAngle) * orbitR;
      recvY = ANT_TIP + Math.sin(recvAngle) * orbitR * 0.5;
      if (Math.random() < dt * 0.25) orbitDir *= -1;
      pulseTimer -= dt; if (pulseTimer <= 0) { pulses.push({ y: ANT_BASE, life: 1.0 }); pulseTimer = 1.2; }
      for (var pi = pulses.length - 1; pi >= 0; pi--) { pulses[pi].y -= 420 * dt; pulses[pi].life -= dt; if (pulses[pi].y < ANT_TIP - 20 || pulses[pi].life <= 0) pulses.splice(pi, 1); }
      for (var wi = waves.length - 1; wi >= 0; wi--) { var w = waves[wi]; if (w.delay > 0) { w.delay -= dt; continue; } w.r += 220 * dt; w.life -= dt; if (w.life <= 0) waves.splice(wi, 1); }
    }

    // ---- 描画 ----
    background();
    for (var w2 = 0; w2 < waves.length; w2++) if (waves[w2].delay <= 0) ring(ANT_X, ANT_TIP, waves[w2].r, C.b, waves[w2].life * 0.5);
    drawAntenna();
    for (var p2 = 0; p2 < pulses.length; p2++) game.draw.rect(ANT_X - 8, snap(pulses[p2].y) - 8, 16, 16, C.b, pulses[p2].life);
    var tip = atTipNow();
    if (tip) ring(ANT_X, ANT_TIP, CATCH_R, C.b, 0.4 + 0.3 * (Math.floor(game.time.elapsed * 8) % 2));
    drawRecv(recvX, recvY, tip);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 208, 20, 20, mm < misses ? C.a : '#0a1424');
    txt(tip ? 'TAP NOW!' : 'WAIT FOR THE TIP', W / 2, H - 110, tip ? 56 : 38, tip ? C.c : C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
