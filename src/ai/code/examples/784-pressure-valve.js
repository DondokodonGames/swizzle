// 784-pressure-valve.js
// プレッシャーバルブ — 上昇する圧力を連続タップで抑え、レッドゾーンから守れ
// 操作: 連続タップで圧力を下げる（タップ毎に低下）
// 成功: 16秒間 レッドゾーン超過なしで耐える  失敗: 3回 過圧 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、蒸気機関） ──
  var C = { bg:'#080508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SAFE = '#00ff41', WARN = '#ffaa00', DANGER = '#ff2079', PIPE = '#1e2b45', STEAM = '#8494a8', NEEDLE = '#f1f5f9';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PRESSURE VALVE';
  var HOW_TO_PLAY = 'TAP RAPIDLY TO BLEED PRESSURE · KEEP IT OUT OF THE RED ZONE';
  var MAX_TIME    = 24;
  var WIN_TIME    = 16;      // 修正2: 60 → 16
  var MAX_OVERLOADS = 3;
  var RISE_SPEED = 0.14, TAP_REDUCE = 0.05, RED_ZONE = 0.85, WARN_ZONE = 0.65, RED_GRACE = 1.2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pressure, overloads, inRed, redTimer, gameTimer, done, timeLeft, elapsed, steam, tapFlash, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#0a070a');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { pressure = 0.2; overloads = 0; inRed = false; redTimer = 0; gameTimer = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; steam = []; tapFlash = 0; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(gameTimer) * 300 + Math.ceil(timeLeft) * 120 + (overloads === 0 ? 3000 : 0)) : Math.floor(gameTimer) * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(snap(W * 0.1), snap(H * 0.38), snap(W * 0.8), 60, PIPE, 0.9); game.draw.rect(snap(W * 0.1), snap(H * 0.38), snap(W * 0.8), 8, '#3a4a6a', 0.6);
    for (var bi = 0; bi < 6; bi++) { var bx = W * 0.1 + bi * W * 0.8 / 5; pc(bx, H * 0.38 + 30, 12, '#1e2b45', 0.9); pc(bx, H * 0.38 + 30, 6, '#0a0f1a', 0.9); }
    var gx = snap(W / 2 - 160), gy = snap(H * 0.18), gw = 320, gh = 190;
    game.draw.rect(gx, gy, gw, gh, '#0f0a0f', 0.95); game.draw.rect(gx, gy, gw, 6, '#2d3748', 0.7);
    var barX = gx + 20, barY = gy + 50, barW = gw - 40, barH = 40;
    game.draw.rect(barX, barY, barW * WARN_ZONE, barH, SAFE, 0.7); game.draw.rect(barX + barW * WARN_ZONE, barY, barW * (RED_ZONE - WARN_ZONE), barH, WARN, 0.7); game.draw.rect(barX + barW * RED_ZONE, barY, barW * (1 - RED_ZONE), barH, DANGER, 0.7);
    var col = pressure >= RED_ZONE ? DANGER : (pressure >= WARN_ZONE ? WARN : SAFE), pulse = pressure >= RED_ZONE ? 1 + 0.1 * Math.sin(elapsed * 12) : 1;
    game.draw.rect(barX, barY, snap(barW * pressure * pulse), barH, col, 0.9);
    game.draw.rect(snap(barX + barW * pressure) - 4, barY - 10, 8, barH + 20, NEEDLE, 0.95);
    txt('PRESSURE', W / 2, gy + 30, 30, C.g); txt(Math.round(pressure * 100) + '%', W / 2, gy + 130, 54, col); txt('RED LINE ' + Math.round(RED_ZONE * 100) + '%', W / 2, gy + 175, 26, DANGER);
    for (var pp2 = 0; pp2 < steam.length; pp2++) { var sp = steam[pp2]; pc(sp.x, sp.y, sp.size * sp.life, STEAM, sp.life * 0.4); }
    var valveY = snap(H * 0.32);
    game.draw.rect(W / 2 - 50, valveY - 20, 100, 40, '#3a4a6a', 0.9); pc(W / 2, valveY, 28 + tapFlash * 20, tapFlash > 0 ? SAFE : '#4a5a6a', 0.9); pc(W / 2, valveY, 16, tapFlash > 0 ? C.g : '#64748b', 0.9);
    txt('VALVE', W / 2, valveY + 60, 28, STEAM);
    if (state === S.PLAYING) {
      if (pressure >= RED_ZONE) { game.draw.rect(0, 0, W, H, DANGER, 0.04 + 0.04 * Math.sin(elapsed * 15)); txt('RED ZONE! TAP FAST!', W / 2, snap(H * 0.60), 48, DANGER); }
      else txt('TAP TO RELEASE PRESSURE', W / 2, snap(H * 0.60), 36, C.e);
      var gameRatio = Math.min(1, gameTimer / WIN_TIME);
      game.draw.rect(snap(W * 0.1), snap(H * 0.66), snap(W * 0.8), 24, '#0a070a', 0.9); game.draw.rect(snap(W * 0.1), snap(H * 0.66), snap(W * 0.8 * gameRatio), 24, C.b, 0.85);
      txt('HOLD  ' + Math.floor(gameTimer) + ' / ' + WIN_TIME + 's', W / 2, snap(H * 0.72), 36, C.g);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    pressure = Math.max(0, pressure - TAP_REDUCE); tapFlash = 0.12; game.audio.play('se_tap', 0.05);
    for (var i = 0; i < 3; i++) { var pa = -Math.PI / 2 + (Math.random() - 0.5) * 1.2; steam.push({ x: W / 2 + (Math.random() - 0.5) * 60, y: H * 0.32, vx: Math.cos(pa) * (60 + Math.random() * 80), vy: Math.sin(pa) * (80 + Math.random() * 100), life: 0.5 + Math.random() * 0.3, size: 16 + Math.random() * 18 }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pressure === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.125, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.85, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PRESSURE HELD!' : 'BOILER BURST', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(gameTimer >= WIN_TIME); return; }
      var riseMulti = 1 + Math.floor(gameTimer / 4) * 0.05;
      pressure = Math.min(1, pressure + RISE_SPEED * riseMulti * dt);
      if (pressure >= RED_ZONE) {
        if (!inRed) { inRed = true; redTimer = 0; }
        redTimer += dt;
        if (redTimer >= RED_GRACE) { overloads++; inRed = false; redTimer = 0; pressure = 0.5; flash = 0.5; flashCol = C.a; resultText = 'OVERLOAD!'; resultTimer = 0.5; game.audio.play('se_failure', 0.5); for (var b = 0; b < 12; b++) { var ba = Math.random() * Math.PI * 2; steam.push({ x: W / 2, y: H * 0.32, vx: Math.cos(ba) * (150 + Math.random() * 200), vy: Math.sin(ba) * (150 + Math.random() * 200) - 100, life: 0.7, size: 26 }); } if (overloads >= MAX_OVERLOADS) { finish(false); return; } }
      } else { inRed = false; redTimer = 0; }
      gameTimer += dt; if (gameTimer >= WIN_TIME) { finish(true); return; }
      if (tapFlash > 0) tapFlash -= dt * 4; if (flash > 0) flash -= dt * 2.5; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = steam.length - 1; pp >= 0; pp--) { var s2 = steam[pp]; s2.x += s2.vx * dt; s2.y += s2.vy * dt; s2.vy -= 40 * dt; s2.life -= dt * 1.8; if (s2.life <= 0) steam.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.78), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(gameTimer) + ' / ' + WIN_TIME + 's', W / 2, 168, 48, C.b);
    for (var oi = 0; oi < MAX_OVERLOADS; oi++) game.draw.rect(snap(W / 2 + (oi - (MAX_OVERLOADS - 1) / 2) * 56) - 10, 224, 20, 20, oi < overloads ? C.a : '#0a070a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
