// 539-voltage-spike.js
// ボルテージスパイク — 監視波形が閾値を突き抜けて跳ね上がる瞬間だけをタップで検出する
// 操作: 電圧が閾値ライン（上）を超えて赤くスパイクしたらタップ。平常時に押すと誤検知
// 成功: スパイク 6回 検出  失敗: 3回 見逃し/誤検知 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、オシロスコープ） ──
  var C = { bg:'#000a02', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOLTAGE SPIKE';
  var HOW_TO_PLAY = 'TAP ONLY WHEN THE WAVE SPIKES PAST THE THRESHOLD LINE';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var GX = 60, GY = snap(H * 0.28), GW = W - 120, GH = snap(H * 0.42), HLEN = 120;
  var BASE = 0.4, RISE = 0.12, HOLD = 0.25, FALL = 0.18;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var history, voltage, vel, phase, phaseTimer, nextSpike, detected, missed, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { history = []; for (var i = 0; i < HLEN; i++) history.push(BASE); voltage = BASE; vel = 0; phase = 'none'; phaseTimer = 0; nextSpike = 1.5; detected = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (detected * 600 + Math.ceil(timeLeft) * 100) : detected * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGraph() {
    game.draw.rect(GX, GY, GW, GH, '#001a04', 0.9);
    for (var gi = 1; gi < 4; gi++) game.draw.rect(GX, GY + GH * gi / 4, GW, 1, C.d, 0.5);
    for (var gj = 1; gj < 8; gj++) game.draw.rect(GX + GW * gj / 8, GY, 1, GH, C.d, 0.5);
    var threshY = GY + GH * (1 - 0.7);
    game.draw.rect(GX, threshY - 1, GW, 3, C.a, 0.7); txt('THRESH', GX + GW - 60, threshY - 14, 24, C.a, 'right');
    for (var hi = 1; hi < history.length; hi++) {
      var x1 = GX + (hi - 1) / (HLEN - 1) * GW, x2 = GX + hi / (HLEN - 1) * GW, y1 = GY + GH * (1 - history[hi - 1]), y2 = GY + GH * (1 - history[hi]), sp = history[hi] > 0.7;
      game.draw.line(x1, y1, x2, y2, sp ? C.a : C.b, sp ? 4 : 2);
    }
    var curY = GY + GH * (1 - voltage);
    pc(GX + GW, curY, 14, voltage > 0.7 ? C.a : C.b, 0.9);
    if (voltage > 0.7) pc(GX + GW, curY, 24 + Math.sin(game.time.elapsed * 12) * 6, C.a, 0.3);
    txt('V ' + voltage.toFixed(2), GX + 90, GY - 24, 34, voltage > 0.7 ? C.a : C.b);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (voltage > 0.7) {
      detected++; phase = 'none'; flash = 0.4; flashCol = C.b; resultText = 'DETECTED!'; resultTimer = 0.8; game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: GY + GH * (1 - voltage), vx: Math.cos(a) * 160, vy: Math.sin(a) * 160, life: 0.4, col: C.a }); }
      voltage = BASE;
      if (detected >= NEEDED) { finish(true); return; }
    } else { missed++; flash = 0.3; flashCol = C.a; resultText = 'FALSE ALARM'; resultTimer = 0.7; game.audio.play('se_failure', 0.3); if (missed >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!history) initGame(); background(); drawGraph();
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL DETECTED!' : 'SENSOR FAIL', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (phase === 'none') {
        nextSpike -= dt; vel += (Math.random() - 0.5) * 0.8 * dt; vel *= 0.9; voltage += vel; voltage = Math.max(0.1, Math.min(0.65, voltage)); voltage += (BASE - voltage) * dt * 1.5;
        if (nextSpike <= 0) { phase = 'rising'; phaseTimer = RISE; nextSpike = 1.2 + Math.random() * 2.2; }
      } else if (phase === 'rising') { phaseTimer -= dt; voltage = BASE + (1.0 - BASE) * (1 - phaseTimer / RISE); if (phaseTimer <= 0) { phase = 'hold'; phaseTimer = HOLD; voltage = 1.0; } }
      else if (phase === 'hold') { phaseTimer -= dt; voltage = 1.0; if (phaseTimer <= 0) { phase = 'falling'; phaseTimer = FALL; } }
      else if (phase === 'falling') { phaseTimer -= dt; voltage = BASE + (1.0 - BASE) * (phaseTimer / FALL); if (phaseTimer <= 0) { if (voltage > 0.65) { missed++; resultText = 'MISSED!'; resultTimer = 0.7; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.4); if (missed >= MAX_MISS) { finish(false); return; } } phase = 'none'; voltage = BASE; } }
      history.push(voltage); if (history.length > HLEN) history.shift();
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGraph();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    if (resultTimer > 0) txt(resultText, W / 2, GY + GH + 70, 52, resultText.indexOf('DETECT') >= 0 ? C.b : C.a);
    else txt(voltage > 0.7 ? 'TAP NOW!' : 'MONITOR...', W / 2, GY + GH + 70, 48, voltage > 0.7 ? C.a : C.d);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(detected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
