// 271-heartbeat-tap.js
// ハートビートタップ — 流れる心電図の鋭いRピークの瞬間に合わせてタップする医療リズム
// 操作: 波形が跳ねた瞬間にタップ
// 成功: 3回ジャストで刻む  失敗: 3回外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、心電図モニタ） ──
  var C = { bg:'#001100', a:'#ff3300', b:'#00ff41', c:'#ccffcc', d:'#009922', e:'#66ff66', f:'#ffcc00', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'HEARTBEAT TAP';
  var HOW_TO_PLAY = 'TAP EXACTLY ON THE SHARP PEAK';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 20 → 3
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var CY = snap(H * 0.46), PEAK_WINDOW = 0.24;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var history, beatPeriod, beatTimer, peaked, peakWindow, pwTimer, hits, misses, timeLeft, done, fbText, fbCol, fbTimer, flashes;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#003300');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var gy = 0; gy < 8; gy++) game.draw.rect(0, snap(H * 0.24 + gy * H * 0.08), W, 2, C.d, 0.3);
    for (var gx = 0; gx < 11; gx++) game.draw.rect(snap(gx * W / 10), snap(H * 0.24), 2, snap(H * 0.5), C.d, 0.3);
  }

  function ecg(t) { var p = t % 1; if (p < 0.1) return Math.sin(p * Math.PI * 10) * 20; if (p < 0.38) return 0; if (p < 0.4) return -30; if (p < 0.43) return 200; if (p < 0.46) return -40; if (p < 0.55) return 0; if (p < 0.7) return Math.sin((p - 0.55) / 0.15 * Math.PI) * 35; return 0; }

  function initGame() { history = []; for (var i = 0; i < W / 8; i++) history.push(CY); beatPeriod = 1.1; beatTimer = 0; peaked = false; peakWindow = false; pwTimer = 0; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; fbText = ''; fbCol = C.g; fbTimer = 0; flashes = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 500 + Math.ceil(timeLeft) * 60) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addMiss() { misses++; fbText = 'MISS'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) finish(false); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (peakWindow) { hits++; fbText = 'PERFECT!'; fbCol = C.b; fbTimer = 0.5; peakWindow = false; game.audio.play('se_success', 0.6); flashes.push({ x: x, y: y, life: 0.4 }); if (hits >= NEEDED) { finish(true); return; } }
    else { addMiss(); if (done) return; flashes.push({ x: x, y: y, life: 0.4, bad: true }); }
  });

  // ── 更新 & 描画 ──
  function drawECG() {
    var step = W / history.length;
    for (var i = 1; i < history.length; i++) game.draw.rect(snap((i - 1) * step) - 3, snap(history[i - 1]) - 3, 6, 6, C.b, 0.9);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!history) initGame(); background();
      // 静的な心拍の見本
      for (var i = 0; i < W / 8; i++) history[i] = CY - ecg((i * 8 / W * 3) % 1) ; drawECG();
      txt(GAME_TITLE, W / 2, H * 0.16, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.f);
        txt('TAP TO START', W / 2, H * 0.95, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN RHYTHM!' : 'FLATLINE', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.e);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      beatTimer += dt;
      history.push(CY - ecg(beatTimer / beatPeriod)); if (history.length > W / 8) history.shift();
      var bp = (beatTimer % beatPeriod) / beatPeriod;
      if (bp > 0.4 && bp < 0.46 && !peaked) { peaked = true; peakWindow = true; pwTimer = PEAK_WINDOW; }
      else if (bp > 0.5) { peaked = false; if (peakWindow) { peakWindow = false; addMiss(); if (done) return; } }
      if (peakWindow) { pwTimer -= dt; if (pwTimer <= 0) peakWindow = false; }
      beatPeriod = Math.max(0.7, 1.1 - hits * 0.06);
      for (var f = flashes.length - 1; f >= 0; f--) { flashes[f].life -= dt; if (flashes[f].life <= 0) flashes.splice(f, 1); }
    }

    // ---- 描画 ----
    background(); drawECG();
    if (peakWindow) { game.draw.rect(W - 130, CY - 240, 90, 44, C.a, 0.8); txt('TAP!', W - 85, CY - 210, 34, C.g); }
    for (var f2 = 0; f2 < flashes.length; f2++) { var fl = flashes[f2]; game.draw.rect(snap(fl.x) - 24, snap(fl.y) - 24, 48, 48, fl.bad ? C.a : C.f, fl.life * 2); }
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.78, 48, fbCol);
    txt(Math.round(60 / beatPeriod) + ' BPM', W * 0.8, H * 0.82, 34, C.d);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mm < misses ? C.a : '#003300');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
