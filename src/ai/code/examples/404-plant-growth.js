// 404-plant-growth.js
// 植物育成 — 左タップで水、右タップで日光を与え、水と光を適正ゾーンに保って花を満開まで育てる
// 操作: 画面左タップ=水やり、右タップ=日光
// 成功: 成長100%（満開）  失敗: 枯れる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、温室） ──
  var C = { bg:'#04140a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PLANT GROWTH';
  var HOW_TO_PLAY = 'TAP LEFT FOR WATER, RIGHT FOR SUN · KEEP BOTH IN THE ZONE';
  var MAX_TIME = 20;
  var W_MIN = 0.3, W_MAX = 0.7, S_MIN = 0.3, S_MAX = 0.8;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var water, sun, health, growth, timeLeft, done, particles, leafPhase, growFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2010');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { water = 0.5; sun = 0.5; health = 0.5; growth = 0; timeLeft = MAX_TIME; done = false; particles = []; leafPhase = 0; growFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (2000 + Math.ceil(timeLeft) * 100) : Math.round(growth * 1500);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPlant() {
    var potX = W / 2, potY = snap(H * 0.78), potW = 200, stemH = 180 + growth * 340, top = potY - stemH;
    game.draw.rect(potX - potW / 2, potY, potW, 150, C.f, 0.9); game.draw.rect(potX - potW / 2 - 16, potY, potW + 32, 22, C.f, 0.8); game.draw.rect(potX - potW / 2 + 8, potY + 8, potW - 16, 44, '#5a3010', 0.9);
    var stemCol = health > 0.3 ? C.b : '#6a5020'; game.draw.rect(snap(potX - 8), snap(top), 16, snap(stemH), stemCol, 0.9);
    if (growth > 0.15) { var sw = Math.sin(leafPhase) * 8; pc(potX - 40 + sw, potY - stemH * 0.4, 34 + growth * 20, stemCol, 0.85); }
    if (growth > 0.35) pc(potX + 40, potY - stemH * 0.65, 30 + growth * 18, stemCol, 0.85);
    if (growth > 0.7) { var fr = (growth - 0.7) * 3.3 * 60; for (var fp = 0; fp < 6; fp++) { var fa = fp / 6 * Math.PI * 2 + game.time.elapsed; pc(potX + Math.cos(fa) * fr * 0.6, top + Math.sin(fa) * fr * 0.6, fr * 0.4, C.a, 0.85); } pc(potX, top, fr * 0.4, C.c, 0.9); }
  }

  function bars() {
    var bw = W / 2 - 80, by = snap(H * 0.90);
    game.draw.rect(40, by, bw, 22, '#0a2010', 0.8); game.draw.rect(40 + bw * W_MIN, by, bw * (W_MAX - W_MIN), 22, C.b, 0.2); game.draw.rect(40, by, bw * water, 22, C.e, 0.85); txt('WATER', 40 + bw / 2, by - 16, 28, C.e);
    game.draw.rect(W / 2 + 40, by, bw, 22, '#0a2010', 0.8); game.draw.rect(W / 2 + 40 + bw * S_MIN, by, bw * (S_MAX - S_MIN), 22, C.b, 0.2); game.draw.rect(W / 2 + 40, by, bw * sun, 22, C.c, 0.85); txt('SUN', W / 2 + 40 + bw / 2, by - 16, 28, C.c);
    game.draw.rect(W / 4, snap(H * 0.95), W / 2, 14, '#0a2010', 0.7); game.draw.rect(W / 4, snap(H * 0.95), W / 2 * health, 14, health > 0.5 ? C.b : C.a, 0.85);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (x < W / 2) { water = Math.min(1, water + 0.15); game.audio.play('se_tap', 0.3); for (var p = 0; p < 4; p++) particles.push({ x: snap(100 + Math.random() * (W / 2 - 150)), y: H * 0.3, vy: 200, life: 0.8, col: C.e }); }
    else { sun = Math.min(1, sun + 0.13); game.audio.play('se_tap', 0.4); for (var p2 = 0; p2 < 4; p2++) particles.push({ x: snap(W * 0.6 + Math.random() * (W / 2 - 150)), y: 100, vy: 200, life: 0.7, col: C.c }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    leafPhase += dt * 2;
    if (state === S.ATTRACT) {
      if (growth === undefined) initGame(); background(); drawPlant();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FULL BLOOM!' : 'WITHERED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (growFlash > 0) growFlash -= dt * 2;
      water = Math.max(0, water - 0.045 * dt); sun = Math.max(0, sun - 0.035 * dt);
      var wg = water >= W_MIN && water <= W_MAX, sg = sun >= S_MIN && sun <= S_MAX;
      health = (wg && sg) ? Math.min(1, health + dt * 0.25) : Math.max(0, health - dt * 0.18);
      if (health > 0.6) { var pg = growth; growth = Math.min(1, growth + dt * 0.08); if (Math.floor(growth * 10) > Math.floor(pg * 10)) { growFlash = 0.5; game.audio.play('se_success', 0.3); } if (growth >= 1) { finish(true); return; } }
      else if (health <= 0) { finish(false); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawPlant();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 0.9);
    if (growFlash > 0) game.draw.rect(0, 0, W, H, C.b, growFlash * 0.06);
    bars();

    timeBar();
    txt(Math.round(growth * 100) + '%', W / 2, 96, 44, C.g);
    txt('BLOOM ' + Math.round(growth * 100) + '%', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
