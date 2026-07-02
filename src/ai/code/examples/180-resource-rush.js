// 180-resource-rush.js
// 資源管理 — 3つのゲージが別々の速度で減る、底をつく前にタップして補充
// 操作: 各ゲージ（または下の補充ボタン）をタップして補充
// 成功: 8秒すべてのゲージを維持  失敗: どれかが0になる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、管制室） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RES = [C.e, C.b, C.f];
  var LABEL = ['H2O', 'FOOD', 'PWR'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RESOURCE RUSH';
  var HOW_TO_PLAY = 'TAP A GAUGE TO REFILL BEFORE IT EMPTIES';
  var NEEDED   = 8;              // 修正2: 35 → 8（サバイバル短縮）
  var DRAIN = [0.014, 0.020, 0.011];   // 修正2: 減りを緩やかに
  var FILL = 0.45;
  var GW = 200, GH = 760, GX = [snap(W * 0.22), snap(W * 0.5), snap(W * 0.78)], GY = snap(300);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var levels, flash, survived, timeLeft, done;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawGauge(gi) {
    var gx = GX[gi] - GW / 2, lvl = levels[gi], low = lvl < 0.25;
    game.draw.rect(gx - 12, GY - 12, GW + 24, GH + 180, C.d, 0.4);
    game.draw.rect(gx, GY, GW, GH, '#0a0018', 0.9);
    var fh = snap(GH * lvl), fy = GY + (GH - fh);
    var blink = low && Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(gx, fy, GW, fh, flash[gi] > 0 ? C.g : (blink ? C.a : RES[gi]), 0.9);
    game.draw.rect(gx, fy, GW, 10, C.g, 0.4);
    game.draw.rect(gx, GY, GW, 8, RES[gi]);
    if (lvl < 0.12 && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('!', GX[gi], GY - 40, 60, C.a);
    txt(LABEL[gi], GX[gi], GY + GH + 50, 48, RES[gi]);
    txt(Math.round(lvl * 100) + '%', GX[gi], GY + GH + 96, 34, low ? C.a : '#8888aa');
    // 補充ボタン
    game.draw.rect(gx, GY + GH + 120, GW, 60, RES[gi], 0.7);
    txt('FILL', GX[gi], GY + GH + 152, 36, C.bg);
  }

  function initGame() {
    levels = [0.85, 0.85, 0.85]; flash = [0, 0, 0]; survived = 0; timeLeft = NEEDED; done = false;
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
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = 0; i < 3; i++) {
      var gx = GX[i] - GW / 2;
      if (x > gx && x < gx + GW && y > GY && y < GY + GH + 200) { levels[i] = Math.min(1, levels[i] + FILL); flash[i] = 0.3; game.audio.play('se_tap', 0.4); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      levels = [0.7, 0.5, 0.8]; flash = [0, 0, 0];
      for (var g = 0; g < 3; g++) drawGauge(g);
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 58, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SUSTAINED!' : 'DEPLETED', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (timeLeft <= 0) { finish(true); return; }
      var prog = survived / NEEDED;
      for (var i = 0; i < 3; i++) {
        levels[i] = Math.max(0, levels[i] - DRAIN[i] * (1 + prog * 0.6) * dt);
        if (flash[i] > 0) flash[i] -= dt;
        if (levels[i] <= 0) { finish(false); return; }
      }
    }

    // ---- 描画 ----
    background();
    for (var g2 = 0; g2 < 3; g2++) drawGauge(g2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(HOW_TO_PLAY, W / 2, 168, 30, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
