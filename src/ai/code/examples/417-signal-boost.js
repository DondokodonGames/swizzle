// 417-signal-boost.js
// 電波増幅 — 動く最適角度にアンテナを合わせ、強い電波を出し続けて必要な受信時間を稼ぐ
// 操作: 上下スワイプ／画面上下タップでアンテナ角度を調整（緑の狙いに合わせる）
// 成功: 良好受信を合計8秒 貯める  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、通信塔） ──
  var C = { bg:'#020a04', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SIGNAL BOOST';
  var HOW_TO_PLAY = 'MATCH THE ANTENNA TO THE GREEN AIM · HOLD A STRONG SIGNAL';
  var MAX_TIME = 15;
  var GOAL_GOOD = 8;         // 修正2: 45秒 → 8秒
  var TOW_X = snap(W * 0.35), TOW_Y = snap(H * 0.60), ANT_Y = snap(H * 0.60) - 240;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var antAngle, targetAngle, targetShift, shiftInt, shiftTimer, signal, goodTime, timeLeft, done, particles, waves, pulse;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(cx + Math.cos(a) * r) - 3, snap(cy + Math.sin(a) * r) - 3, 6, 6, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function goodBar() {
    var t = Math.ceil(Math.min(1, goodTime / GOAL_GOOD) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0c');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, TOW_Y, W, H, '#061006', 0.9); game.draw.rect(0, TOW_Y, W, 3, C.d, 0.5); }

  function initGame() { antAngle = 0; targetAngle = 0; targetShift = 0; shiftInt = 3; shiftTimer = 0; signal = 0; goodTime = 0; timeLeft = MAX_TIME; done = false; particles = []; waves = []; pulse = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(goodTime) * 400 + Math.ceil(timeLeft) * 100 + 1000) : Math.round(goodTime * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTower() {
    pline(TOW_X, TOW_Y, TOW_X, ANT_Y, '#2a4a2a', 0.9, 20);
    for (var cb = 0; cb < 4; cb++) pline(TOW_X - 30, TOW_Y - 60 - cb * 50, TOW_X + 30, TOW_Y - 60 - cb * 50, '#2a4a2a', 0.6, 4);
    // 最適の狙い
    pline(TOW_X, ANT_Y, TOW_X + Math.cos(targetAngle - Math.PI / 2) * 200, ANT_Y + Math.sin(targetAngle - Math.PI / 2) * 200, C.d, 0.5, 4);
    ring(TOW_X + Math.cos(targetAngle - Math.PI / 2) * 200, ANT_Y + Math.sin(targetAngle - Math.PI / 2) * 200, 16, C.b, 0.5);
    // アンテナ
    var tx = TOW_X + Math.cos(antAngle - Math.PI / 2) * 180, ty = ANT_Y + Math.sin(antAngle - Math.PI / 2) * 180;
    pline(TOW_X, ANT_Y, tx, ty, C.g, 0.9, 8); pc(TOW_X, ANT_Y, 14, C.g, 0.9); pc(tx, ty, 12, C.c, 0.5 + signal * 0.5);
    for (var wi = 0; wi < waves.length; wi++) ring(waves[wi].x, waves[wi].y, waves[wi].r, waves[wi].col, waves[wi].life * 0.3);
    // 強度メーター
    var mx = W * 0.68, my = snap(H * 0.24), mh = snap(H * 0.4); game.draw.rect(mx - 20, my, 40, mh, '#0a1a0c', 0.9); game.draw.rect(mx - 24, my + mh * 0.25, 48, mh * 0.5, C.d, 0.15);
    var sc = signal > 0.75 ? C.b : signal > 0.4 ? C.c : C.a; game.draw.rect(mx - 20, my + mh * (1 - signal), 40, mh * signal, sc, 0.9); txt(Math.round(signal * 100) + '%', mx, my + mh + 40, 36, sc);
  }

  function adjust(delta) { antAngle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, antAngle + delta)); game.audio.play('se_tap', 0.15); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; adjust(y < H / 2 ? -0.1 : 0.1);
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'up') adjust(-0.18); else if (d === 'down') adjust(0.18);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    pulse += dt * 5;
    if (state === S.ATTRACT) {
      if (antAngle === undefined) initGame(); background(); drawTower();
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SIGNAL LOCKED!' : 'LOST SIGNAL', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      shiftTimer += dt; if (shiftTimer > shiftInt) { targetShift = (Math.random() - 0.5) * 1.2; shiftInt = 2 + Math.random() * 2; shiftTimer = 0; }
      targetAngle += (targetShift - targetAngle) * 2 * dt;
      var rel = antAngle - targetAngle; signal = Math.pow(Math.max(0, 1 - Math.abs(rel) / (Math.PI / 2) * 2), 0.5);
      if (signal > 0.75) { goodTime += dt; if (goodTime >= GOAL_GOOD) { finish(true); return; } }
      if (signal > 0.3 && Math.random() < signal * 0.5) { var tx = TOW_X + Math.cos(antAngle - Math.PI / 2) * 180, ty = ANT_Y + Math.sin(antAngle - Math.PI / 2) * 180; waves.push({ x: tx, y: ty, r: 10, maxR: 200 + signal * 200, life: 1.0, col: signal > 0.75 ? C.b : C.d }); }
      for (var wi = waves.length - 1; wi >= 0; wi--) { waves[wi].r += (waves[wi].maxR - 10) * dt; waves[wi].life -= dt * 1.5; if (waves[wi].life <= 0) waves.splice(wi, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTower();
    var gr = Math.min(1, goodTime / GOAL_GOOD); game.draw.rect(60, snap(H * 0.80), W - 120, 24, '#0a1a0c', 0.8); game.draw.rect(60, snap(H * 0.80), (W - 120) * gr, 24, C.b, 0.85);

    goodBar();
    txt(goodTime.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt(goodTime.toFixed(1) + ' / ' + GOAL_GOOD + 's', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
