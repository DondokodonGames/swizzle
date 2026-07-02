// 215-pressure-cook.js
// プレッシャークック — 上がり続ける圧力計を、爆発する前にタップで逃がし続ける緊張の調理
// 操作: 下半分をタップで圧力解放
// 成功: 10秒しのぐ  失敗: 圧力が爆発する

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、圧力炉） ──
  var C = { bg:'#0d0208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PRESSURE COOK';
  var HOW_TO_PLAY = 'TAP THE LOWER HALF TO RELEASE PRESSURE';
  var NEEDED   = 10;          // 修正2: 60 → 10（サバイバル短縮）
  var SAFE_MAX = 0.65, DANGER_MIN = 0.78, RELEASE = 0.22, RISE = 0.16;
  var GCX = snap(W / 2), GCY = snap(H * 0.6), GR = 200;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pressure, fireLevel, survived, timeLeft, done, steam, feedback;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a0a12');
  }

  function background() { game.draw.clear(C.bg); }

  function drawGauge() {
    var start = Math.PI * 0.75, total = Math.PI * 1.5;
    for (var a = start; a < start + total; a += 0.06) {
      var frac = (a - start) / total, col = frac > DANGER_MIN ? C.a : frac > SAFE_MAX ? C.f : C.b;
      game.draw.rect(snap(GCX + Math.cos(a) * GR) - 5, snap(GCY + Math.sin(a) * GR) - 5, 10, 10, col, 0.8);
    }
    var na = start + total * pressure;
    for (var r = 0; r < GR - 20; r += 8) game.draw.rect(snap(GCX + Math.cos(na) * r) - 5, snap(GCY + Math.sin(na) * r) - 5, 10, 10, C.g, 0.9);
    pc(GCX, GCY, 16, C.g, 0.9);
    var pcol = pressure > DANGER_MIN ? C.a : pressure > SAFE_MAX ? C.f : C.b;
    txt(Math.round(pressure * 100) + '%', GCX, GCY + GR * 0.55, 60, pcol);
  }

  function drawPot() {
    var px = snap(W / 2 - 180), py = snap(H * 0.24);
    game.draw.rect(px, py, 360, 160, C.d, 0.8);
    game.draw.rect(px - 20, py - 24, 400, 28, C.e, 0.8);
    var shake = pressure > DANGER_MIN ? (Math.floor(game.time.elapsed * 10) % 2 ? 8 : -8) : 0;
    game.draw.rect(snap(W / 2) - 16 + shake, py - 56, 32, 32, pressure > DANGER_MIN ? C.a : C.e, 0.9);
  }

  function initGame() { pressure = 0.3; fireLevel = 0.6; survived = 0; timeLeft = NEEDED; done = false; steam = []; feedback = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(survived) * 100) : Math.round(survived * 120);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (y > H * 0.5) {
      pressure = Math.max(0, pressure - RELEASE); feedback = 0.2; game.audio.play('se_tap', 0.5);
      for (var i = 0; i < 6; i++) steam.push({ x: W / 2 + game.random(-60, 60), y: H * 0.22, vx: game.random(-60, 60), vy: -(120 + Math.random() * 120), life: 0.7, size: 20 + Math.random() * 16 });
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); pressure = (Math.sin(game.time.elapsed * 2) + 1) / 2 * 0.6; drawPot(); drawGauge();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
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
      txt(resultSuccess ? 'PERFECT COOK!' : 'BOOM!', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (feedback > 0) feedback -= dt;
      fireLevel += (Math.random() - 0.45) * 0.03; fireLevel = Math.max(0.3, Math.min(0.9, fireLevel));
      pressure += RISE * fireLevel * (1 + survived / 20) * dt;
      pressure = Math.max(0, Math.min(1, pressure));
      if (pressure >= 1) { finish(false); return; }
      if (pressure > 0.5 && Math.random() < dt * pressure * 5) steam.push({ x: W / 2 + game.random(-40, 40), y: H * 0.20, vx: game.random(-40, 40), vy: -(40 + Math.random() * 80), life: 0.6, size: 14 + Math.random() * 12 });
      for (var si = steam.length - 1; si >= 0; si--) { var s = steam[si]; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; if (s.life <= 0) steam.splice(si, 1); }
    }

    // ---- 描画 ----
    background();
    for (var si2 = 0; si2 < steam.length; si2++) pc(steam[si2].x, steam[si2].y, steam[si2].size * steam[si2].life, C.g, steam[si2].life * 0.4);
    drawPot(); drawGauge();
    if (pressure > DANGER_MIN) game.draw.rect(0, 0, W, H, C.a, (Math.floor(game.time.elapsed * 8) % 2 ? 0.12 : 0.04));
    if (feedback > 0) game.draw.rect(0, 0, W, H, C.b, feedback * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    txt(pressure > DANGER_MIN ? 'RELEASE NOW!' : 'TAP LOWER HALF', W / 2, H - 100, pressure > DANGER_MIN ? 52 : 40, pressure > DANGER_MIN ? C.a : C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
