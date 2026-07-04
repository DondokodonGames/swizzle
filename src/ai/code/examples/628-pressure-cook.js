// 628-pressure-cook.js
// プレッシャークック — タップで火力を上げ、鍋の圧力を緑の適正ゾーンに保ち続ける
// 操作: タップ/上スワイプで火力アップ、下スワイプでダウン。針を緑帯に維持する
// 成功: 適正圧力を通算12秒 維持  失敗: 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、厨房） ──
  var C = { bg:'#0a0604', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PRESSURE COOK';
  var HOW_TO_PLAY = 'TAP OR SWIPE UP TO ADD HEAT · SWIPE DOWN TO EASE OFF · KEEP THE NEEDLE GREEN';
  var MAX_TIME = 22;
  var SAFE_MIN = 35, SAFE_MAX = 65;
  var NEEDED_SAFE = 12;      // 修正2: 30 → 12

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pressure, targetPressure, heat, safeTime, gameElapsed, timeLeft, done, particles, steam, flash, inSafe;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#2a1a0a');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { pressure = 50; targetPressure = 50; heat = 50; safeTime = 0; gameElapsed = 0; timeLeft = MAX_TIME; done = false; particles = []; steam = []; flash = 0; inSafe = false; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(safeTime) * 300 + Math.ceil(timeLeft) * 100) : Math.round(safeTime * 150);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var POT_X = W / 2 - 240, POT_Y = snap(H * 0.50), POT_W = 480, POT_H = 320;
    game.draw.rect(POT_X, POT_Y, POT_W, POT_H, '#5a4030', 0.9);
    game.draw.rect(POT_X, POT_Y, POT_W, 20, C.f, 0.5);
    game.draw.rect(POT_X - 20, POT_Y - 30, POT_W + 40, 40, '#8a6050', 0.9);
    for (var sp = 0; sp < steam.length; sp++) { var s = steam[sp]; pc(s.x, s.y, s.r, C.e, s.life * 0.4); }
    // gauge
    var GX = W / 2 - 160, GY = snap(H * 0.24), GW = 320, GH = 150;
    game.draw.rect(GX, GY, GW, GH, '#1a1a2a', 0.9);
    var safeLeft = GX + (SAFE_MIN / 100) * GW, safeW = ((SAFE_MAX - SAFE_MIN) / 100) * GW;
    game.draw.rect(safeLeft, GY + 20, safeW, GH - 40, C.b, 0.18);
    game.draw.rect(safeLeft, GY + 20, 4, GH - 40, C.b, 0.6); game.draw.rect(safeLeft + safeW - 4, GY + 20, 4, GH - 40, C.b, 0.6);
    var needleX = GX + (pressure / 100) * GW, nc = inSafe ? C.b : (pressure > SAFE_MAX ? C.a : C.c);
    game.draw.rect(snap(needleX) - 4, GY + 15, 8, GH - 30, nc, 0.9); pc(needleX, GY + GH / 2, 16, nc, 0.9);
    // heat bar
    game.draw.rect(GX, GY + GH + 20, GW, 20, '#1a1a2a', 0.8); game.draw.rect(GX, GY + GH + 20, GW * (heat / 100), 20, C.f, 0.8);
    txt('HEAT ' + Math.round(heat) + '%', W / 2, GY + GH + 60, 30, C.f);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') heat = Math.min(100, heat + 20); else if (dir === 'down') heat = Math.max(0, heat - 20); game.audio.play('se_tap', 0.15);
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    heat = Math.min(100, heat + 12); game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pressure === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECTLY COOKED!' : 'BOILED OVER', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; gameElapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      targetPressure = 50 + Math.sin(gameElapsed * 0.5) * 20 + Math.sin(gameElapsed * 0.23) * 10;
      pressure += ((targetPressure - pressure) * 0.3 + (heat - 50) * 0.8) * dt;
      heat = Math.max(0, heat - 10 * dt);
      pressure = Math.max(0, Math.min(100, pressure));
      inSafe = pressure >= SAFE_MIN && pressure <= SAFE_MAX;
      if (inSafe) { safeTime += dt; if (safeTime >= NEEDED_SAFE) { finish(true); return; } }
      else if (pressure > SAFE_MAX + 20 || pressure < SAFE_MIN - 20) flash = 0.2;
      if (Math.random() < (pressure / 100) * 0.5) steam.push({ x: W / 2 + (Math.random() - 0.5) * 140, y: snap(H * 0.46), vx: (Math.random() - 0.5) * 50, vy: -60 - Math.random() * 60, life: 0.8 + Math.random() * 0.4, r: 14 + Math.random() * 14 });
      for (var sp = steam.length - 1; sp >= 0; sp--) { var s = steam[sp]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) steam.splice(sp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (flash > 0) game.draw.rect(0, 0, W, H, pressure > SAFE_MAX ? C.a : C.c, flash * 0.1);

    // safe-time progress
    var pr = Math.min(1, safeTime / NEEDED_SAFE);
    game.draw.rect(W / 2 - 200, snap(H * 0.88), 400, 24, '#2a1a0a', 0.7);
    game.draw.rect(W / 2 - 200, snap(H * 0.88), 400 * pr, 24, C.b, 0.9);
    txt(Math.ceil(safeTime) + 's / ' + NEEDED_SAFE + 's', W / 2, snap(H * 0.88) + 48, 32, C.b);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(inSafe ? 'STABLE OK' : (pressure > SAFE_MAX ? 'TOO HIGH!' : 'TOO LOW!'), W / 2, 168, 40, inSafe ? C.b : C.a);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
