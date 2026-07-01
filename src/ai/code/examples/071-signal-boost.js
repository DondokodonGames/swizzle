// 071-signal-boost.js
// シグナルブースト — 弱まる電波信号を連打でブーストし続けるサバイバル
// 操作: タップで信号を増幅、ただし過剰増幅（100%）はクラッシュ
// 成功: 8秒間信号を維持  失敗: 信号が0%以下 or 3回100%超過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'SIGNAL BOOST';
  var HOW_TO_PLAY = 'TAP TO BOOST, KEEP UNDER 100%';
  var MAX_TIME = 8;          // 修正2: 生存系 30s → 8s
  var BOOST = 0.08, DECAY = 0.04, SAFE_MAX = 0.85, MAX_OVER = 3;
  var GX = W / 2 - 120, GY = 360, GW = 240, GH = H - 900;   // 修正1: 縦に長いゲージ

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var signal, overloads, timeLeft, done, boostPulse, crashFlash;

  function snap(v) { return Math.round(v / 8) * 8; }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() { signal = 0.5; overloads = 0; timeLeft = MAX_TIME; done = false; boostPulse = 0; crashFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : Math.floor(signal * 100);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    signal += BOOST; boostPulse = 0.15; game.audio.play('se_tap', 0.4);
    if (signal >= 1.0) { signal = 0.6; overloads++; crashFlash = 0.5; game.audio.play('se_failure', 0.8); if (overloads >= MAX_OVER) finish(false); }
  });

  // 世界観: 電波塔の信号制御。減衰する信号を連打で維持しつつ過負荷を避ける。
  function background() {
    game.draw.clear('#0a0018');
    if (crashFlash > 0) game.draw.rect(0, 0, W, H, C.a, crashFlash * 0.3);
    // 電波塔
    game.draw.rect(snap(W / 2) - 8, 140, 16, 200, C.d);
    for (var r = 1; r <= 3; r++) { var rr = r * 40 + (Math.floor(game.time.elapsed * 4) % 2) * 8; game.draw.rect(snap(W / 2 - rr), 150, 4, 4, C.b, 0.6); game.draw.rect(snap(W / 2 + rr), 150, 4, 4, C.b, 0.6); }
    txt('RADIO TOWER', W / 2, 120, 34, C.b);
  }

  function drawGauge() {
    game.draw.rect(snap(GX) - 8, snap(GY) - 8, GW + 16, GH + 16, '#333355');
    game.draw.rect(snap(GX), snap(GY), GW, GH, '#05000f');
    // 安全上限ライン
    game.draw.rect(snap(GX) - 16, snap(GY + GH * (1 - SAFE_MAX)), GW + 32, 6, C.a);
    txt('MAX', GX - 60, GY + GH * (1 - SAFE_MAX), 30, C.a);
    var fillH = GH * signal, fillY = GY + GH - fillH;
    var col = signal < 0.3 ? C.a : (signal < SAFE_MAX ? C.b : C.f);
    game.draw.rect(snap(GX), snap(fillY), GW, snap(fillH), col);
    if (boostPulse > 0) game.draw.rect(snap(GX), snap(GY), GW, GH, C.g, boostPulse / 0.15 * 0.4);
    if (signal > SAFE_MAX && Math.floor(game.time.elapsed * 10) % 2 === 0) game.draw.rect(snap(GX), snap(GY), GW, GH * 0.12, C.a);
    txt(Math.floor(signal * 100) + '%', W / 2, GY + GH + 60, 64, col);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (signal === undefined) initGame();
      background();
      signal = 0.5 + 0.3 * Math.sin(game.time.elapsed * 2);
      drawGauge();
      txt(GAME_TITLE,  W / 2, H * 0.86, 72, C.c);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.97, 44, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      signal -= DECAY * (1 + (MAX_TIME - timeLeft) * 0.06) * dt;
      if (signal <= 0) { signal = 0; finish(false); return; }
      if (boostPulse > 0) boostPulse -= dt;
      if (crashFlash > 0) crashFlash -= dt;
    }

    // ---- draw ----
    background();
    drawGauge();
    timeBar();
    txt('KEEP SIGNAL ' + Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.c);
    for (var o = 0; o < MAX_OVER; o++) game.draw.rect(W / 2 + (o - 1) * 64 - 20, 150, 40, 40, o < overloads ? C.a : '#330011');
    txt('TAP! DONT OVERLOAD!', W / 2, H - 90, 44, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
