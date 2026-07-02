// 263-power-surge.js
// パワーサージ — 連打で電力メーターを上げ、移動する安全ゾーン内に留め続ける電力制御
// 操作: タップで電力チャージ（自然に減衰する）
// 成功: 8秒ゾーン内に維持  失敗: 危険ゾーンを3回踏む or レンジ外

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、発電制御室） ──
  var C = { bg:'#030208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'POWER SURGE';
  var HOW_TO_PLAY = 'TAP TO CHARGE · STAY IN THE GREEN ZONE';
  var NEEDED   = 8;           // 修正2: 30 → 8（サバイバル短縮）
  var MAX_RED = 3;
  var MW = W - 80, MH = 110, MX = 40, MY = snap(H * 0.36);
  var DRAIN = 0.18, BOOST = 0.07;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var power, zoneLo, zoneHi, zoneTimer, zoneInterval, survived, timeLeft, redHits, inRed, redTimer, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function moveZone() { var cen = 0.25 + Math.random() * 0.5; zoneLo = Math.max(0.1, cen - 0.14); zoneHi = Math.min(0.9, cen + 0.14); }

  function initGame() { power = 0.5; moveZone(); zoneTimer = 0; zoneInterval = 2.5; survived = 0; timeLeft = NEEDED; redHits = 0; inRed = false; redTimer = 0; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(survived) * 120) : Math.round(survived * 100);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawMeter() {
    game.draw.rect(MX, MY, MW, MH, C.d, 0.3);
    game.draw.rect(MX, MY, snap(MW * zoneLo), MH, C.a, 0.2); game.draw.rect(MX + snap(MW * zoneHi), MY, MW - snap(MW * zoneHi), MH, C.a, 0.2);
    game.draw.rect(MX + snap(MW * zoneLo), MY, snap(MW * (zoneHi - zoneLo)), MH, C.b, 0.3);
    var inGreen = power >= zoneLo && power <= zoneHi, col = inGreen ? C.e : (power < 0.1 || power > 0.9 ? C.a : C.f);
    game.draw.rect(MX + 4, MY + 4, snap(MW * power), MH - 8, col, 0.9);
    txt(Math.round(power * 100) + '%', W / 2, MY - 30, 52, col);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    power = Math.min(1, power + BOOST); game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); power = (Math.sin(game.time.elapsed * 2) + 1) / 2; zoneLo = 0.35; zoneHi = 0.65; drawMeter();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.72, 40, '#554466');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STABLE!' : 'OVERLOAD', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; power = Math.max(0, power - DRAIN * dt);
      if (fbTimer > 0) fbTimer -= dt;
      zoneTimer += dt; if (zoneTimer >= zoneInterval) { zoneTimer = 0; moveZone(); zoneInterval = 2 + Math.random() * 1.5; }
      var inGreen = power >= zoneLo && power <= zoneHi, inRange = power >= 0.05 && power <= 0.95;
      if (inGreen) { survived += dt; if (survived >= NEEDED || timeLeft <= 0) { finish(true); return; } }
      else if (!inRange) { finish(false); return; }
      if (timeLeft <= 0) { finish(survived >= NEEDED * 0.9); return; }
      if (!inGreen && inRange) { if (!inRed) { inRed = true; redTimer = 0; } redTimer += dt; if (redTimer > 1.0) { redHits++; fbText = 'DANGER!'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.4); redTimer = 0; if (redHits >= MAX_RED) { finish(false); return; } } }
      else { inRed = false; redTimer = 0; }
    }

    // ---- 描画 ----
    background();
    var ig = power >= zoneLo && power <= zoneHi;
    game.draw.rect(0, 0, W, H, ig ? C.b : C.a, ig ? 0.04 : 0.04 + 0.06 * (Math.floor(game.time.elapsed * 4) % 2));
    drawMeter();
    // タップターゲット
    var tp = 0.85 + 0.15 * (Math.floor(game.time.elapsed * 6) % 2);
    game.draw.rect(snap(W / 2) - snap(80 * tp), snap(H * 0.62) - snap(80 * tp), snap(160 * tp), snap(160 * tp), C.e, 0.25); txt('TAP', W / 2, H * 0.62 + 16, 60, C.e);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.80, 48, fbCol);

    timeBar();
    txt(survived.toFixed(1) + 's / ' + NEEDED, W / 2, 96, 44, C.g);
    for (var ri = 0; ri < MAX_RED; ri++) game.draw.rect(snap(W / 2 + (ri - (MAX_RED - 1) / 2) * 56) - 10, 168, 20, 20, ri < redHits ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
