// 198-voltage-spike.js
// 電圧スパイク — 急上昇する電圧を上限を超える前にタップでリセットするゲーム
// 操作: タップで電圧をリセット
// 成功: 8秒維持  失敗: 電圧が上限を超える

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、オシロスコープ） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'VOLTAGE SPIKE';
  var HOW_TO_PLAY = 'TAP TO RESET BEFORE IT MAXES OUT';
  var NEEDED   = 8;              // 修正2: 30 → 8（サバイバル短縮）
  var SAFE_MAX = 0.7, CRIT_MAX = 0.9, BASE_RISE = 0.05, SPIKE_RISE = 0.7, RESET = 0.6;
  var GX = snap(96), GY = snap(320), GW = snap(W - 160), GH = snap(H * 0.44);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var voltage, spiking, spikeTimer, nextSpikeT, spikeInterval, survived, timeLeft, done, history, tapFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.a : '#003300');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(GX - 16, GY - 16, GW + 32, GH + 32, C.d, 0.4);
    for (var gy = 0; gy <= 4; gy++) game.draw.rect(GX, GY + gy * GH / 4, GW, 2, C.d, 0.4);
  }

  function drawGraph() {
    // 履歴グラフ（ピクセル）
    for (var hi = 0; hi < history.length; hi++) {
      var x = GX + hi / 80 * GW, y = GY + GH * (1 - history[hi]);
      var col = history[hi] > CRIT_MAX ? C.f : (history[hi] > SAFE_MAX ? C.e : C.a);
      game.draw.rect(snap(x) - 3, snap(y) - 3, 6, 6, col, 0.9);
    }
    // 上限ライン
    game.draw.rect(GX, snap(GY + GH * (1 - SAFE_MAX)), GW, 3, C.e, 0.7);
    game.draw.rect(GX, snap(GY + GH * (1 - CRIT_MAX)), GW, 3, C.f, 0.8);
    // 現在値バー
    var vcol = voltage > CRIT_MAX ? C.f : (voltage > SAFE_MAX ? C.e : C.a);
    var vh = snap(GH * voltage);
    game.draw.rect(GX + GW - 40, GY + GH - vh, 40, vh, vcol, 0.9);
    txt(Math.round(voltage * 100) + 'V', W / 2, GY + GH + 70, 72, vcol);
  }

  function initGame() {
    voltage = 0.2; spiking = false; spikeTimer = 0; nextSpikeT = 2.0; spikeInterval = 3.5;
    survived = 0; timeLeft = NEEDED; done = false; history = []; tapFlash = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.round(survived) * 100) : Math.round(survived * 120);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    voltage = Math.max(0, voltage - RESET); spiking = false; spikeTimer = 0; tapFlash = 0.25;
    game.audio.play('se_tap', 0.6);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      voltage = (Math.sin(game.time.elapsed * 2) + 1) / 2 * 0.6; history = history || [];
      drawGraph();
      txt(GAME_TITLE, W / 2, H * 0.18, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.e);
        txt('TAP TO START', W / 2, H * 0.95, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STABLE!' : 'OVERLOAD', W / 2, H * 0.35, 78, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (!spiking) { nextSpikeT -= dt; if (nextSpikeT <= 0) { spiking = true; spikeTimer = 1.2; nextSpikeT = spikeInterval * (0.7 + Math.random() * 0.6); spikeInterval = Math.max(1.8, spikeInterval - 0.1); } }
      else { spikeTimer -= dt; if (spikeTimer <= 0) spiking = false; }
      voltage = Math.min(1, voltage + (spiking ? SPIKE_RISE : BASE_RISE) * (1 + survived / 30) * dt);
      history.push(voltage); if (history.length > 80) history.shift();
      if (voltage >= 1) { finish(false); return; }
      if (tapFlash > 0) tapFlash -= dt;
    }

    // ---- 描画 ----
    background(); drawGraph();
    if (spiking) { game.draw.rect(0, 0, W, H, C.f, Math.floor(game.time.elapsed * 8) % 2 === 0 ? 0.12 : 0.05); txt('SPIKE!', W / 2, H * 0.80, 60, C.f); }
    else txt('TAP TO RESET', W / 2, H * 0.80, 44, C.b);
    if (tapFlash > 0) game.draw.rect(0, 0, W, H, C.a, tapFlash * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
