// 736-hot-potato.js
// ホットポテト — 熱くなるジャガイモを、爆発する前にタップして投げ捨てる
// 操作: 温度メーターが限界に達する前にタップで投げる。熱すぎると爆発してミス
// 成功: 10回 投げる  失敗: 3回 爆発 or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、芋色は保持） ──
  var C = { bg:'#0c0402', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var POTATO = '#a16207', POTATO_HI = '#ffe600', HOT = '#ff2079', COOL = '#00ff41', SMOKE = '#78716c';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'HOT POTATO';
  var HOW_TO_PLAY = 'TAP TO THROW BEFORE THE HEAT METER MAXES OUT · TOO HOT AND IT BLOWS';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.42), POTATO_R = 80, DANGER_ZONE = 0.75;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var heatLevel, heatRate, thrown, throwAnim, throwVx, throwVy, potatoX, potatoY, waitTimer, smokeParticles, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#140803');
  }

  function background() { game.draw.clear(C.bg); }

  function resetPotato() { heatLevel = Math.random() * 0.15; heatRate = Math.min(0.38, 0.20 + score * 0.015); thrown = false; throwAnim = 0; potatoX = CX; potatoY = CY; waitTimer = 0; smokeParticles = []; }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; resetPotato(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function throwPotato(label, vol) {
    thrown = true; var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; throwVx = Math.cos(angle) * 800; throwVy = Math.sin(angle) * 800; throwAnim = 0.5;
    score++; flash = 0.25; flashCol = C.b; resultText = label; resultTimer = 0.5; game.audio.play('se_success', vol);
    for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: POTATO_HI }); }
    if (score >= NEEDED) { finish(true); return; }
    waitTimer = 0.5;
  }

  function drawScene() {
    var isDanger = heatLevel >= DANGER_ZONE, heatCol = isDanger ? HOT : (heatLevel > 0.5 ? C.f : POTATO);
    var meterX = 80, meterY0 = snap(H * 0.20), meterH = snap(H * 0.50);
    game.draw.rect(meterX - 24, meterY0, 48, meterH, '#1c0a04', 0.9);
    game.draw.rect(meterX - 20, meterY0 + meterH - heatLevel * meterH, 40, heatLevel * meterH, heatCol, 0.9);
    var dangerY = meterY0 + (1 - DANGER_ZONE) * meterH;
    game.draw.line(meterX - 32, dangerY, meterX + 32, dangerY, HOT, 4);
    txt('HOT', meterX, meterY0 - 24, 26, HOT); txt('OK', meterX, meterY0 + meterH + 34, 26, COOL);
    for (var spi2 = 0; spi2 < smokeParticles.length; spi2++) { var sp = smokeParticles[spi2]; pc(sp.x, sp.y, 18 * sp.life, SMOKE, sp.life * 0.5); }
    if (!thrown || throwAnim > 0) {
      var px = thrown ? potatoX : CX, py = thrown ? potatoY : CY, pulse = isDanger ? (0.92 + 0.08 * Math.sin(elapsed * 15)) : 1.0;
      pc(px, py, POTATO_R * pulse, heatCol, 0.9); pc(px - POTATO_R * 0.3, py - POTATO_R * 0.35, POTATO_R * 0.2, C.g, 0.3);
    }
    txt(Math.round(heatLevel * 100) + '°', W * 0.75, snap(H * 0.45), 80, heatCol);
    if (!thrown && isDanger) txt('THROW NOW!', W / 2, snap(H * 0.78), 52, HOT);
    else if (!thrown) txt('TAP TO THROW', W / 2, snap(H * 0.78), 44, '#ffffff44');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || thrown || waitTimer > 0) return;
    if (heatLevel < DANGER_ZONE) throwPotato('THROWN AT ' + Math.round(heatLevel * 100) + '°', 0.5);
    else throwPotato('JUST IN TIME!', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (heatLevel === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'QUICK HANDS!' : 'BLEW UP', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) resetPotato(); }
      if (!thrown) {
        heatLevel += heatRate * dt;
        if (heatLevel >= 1.0) {
          heatLevel = 1.0; thrown = true; errors++; flash = 0.5; flashCol = C.a; resultText = 'BOOM!'; resultTimer = 0.7; game.audio.play('se_failure', 0.55);
          for (var e = 0; e < 12; e++) { var ea = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(ea) * 300, vy: Math.sin(ea) * 300, life: 0.6, col: HOT }); }
          if (errors >= MAX_ERR) { finish(false); return; }
          waitTimer = 0.9;
        }
      }
      if (thrown && throwAnim > 0) { throwAnim -= dt; potatoX += throwVx * dt; potatoY += throwVy * dt; throwVy += 600 * dt; }
      if (!thrown && heatLevel > 0.4 && Math.random() < 0.3) smokeParticles.push({ x: CX + (Math.random() - 0.5) * 40, y: CY - POTATO_R, vx: (Math.random() - 0.5) * 30, vy: -50 - Math.random() * 40, life: 0.6 });
      for (var spi = smokeParticles.length - 1; spi >= 0; spi--) { smokeParticles[spi].x += smokeParticles[spi].vx * dt; smokeParticles[spi].y += smokeParticles[spi].vy * dt; smokeParticles[spi].life -= dt * 1.5; if (smokeParticles[spi].life <= 0) smokeParticles.splice(spi, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#140803');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
