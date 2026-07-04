// 747-planet-align.js
// プラネットアライン — 3つの惑星が一直線に並んだ瞬間にタップする
// 操作: 全惑星が太陽をはさんで同一直線上に並んだ瞬間タップ。ズレているとミス
// 成功: 8回 直列  失敗: 3回 ミス or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、太陽系／惑星色は保持） ──
  var C = { bg:'#01020e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SUN = '#ffe600', SUN_HI = '#fef3c7', ALIGN = '#ff6600';
  var PCOLS = ['#ff2079', '#00cfff', '#00ff41'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PLANET ALIGN';
  var HOW_TO_PLAY = 'TAP THE MOMENT ALL THREE PLANETS FORM A STRAIGHT LINE';
  var MAX_TIME = 24;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var CX = W / 2, CY = snap(H * 0.44), ALIGN_TOL = 0.18;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var planets, bgStars, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, alignPulse, lastTapCooldown;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#030310');
  }

  function background() { game.draw.clear(C.bg); for (var bsi2 = 0; bsi2 < bgStars.length; bsi2++) game.draw.rect(snap(bgStars[bsi2].x), snap(bgStars[bsi2].y), bgStars[bsi2].r, bgStars[bsi2].r, C.c, 0.3); }

  function getAlignScore() {
    var a1 = planets[0].angle % (Math.PI * 2), a2 = planets[1].angle % (Math.PI * 2), a3 = planets[2].angle % (Math.PI * 2);
    var d12 = ((a2 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI, d13 = ((a3 - a1 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    var same = Math.abs(d12) < ALIGN_TOL && Math.abs(d13) < ALIGN_TOL;
    var opp12 = ((a2 - a1 + Math.PI * 4) % (Math.PI * 2)), opp13 = ((a3 - a1 + Math.PI * 4) % (Math.PI * 2));
    return same || (Math.abs(opp12 - Math.PI) < ALIGN_TOL && Math.abs(opp13 - Math.PI) < ALIGN_TOL) || (Math.abs(d12) < ALIGN_TOL && Math.abs(opp13 - Math.PI) < ALIGN_TOL) || (Math.abs(opp12 - Math.PI) < ALIGN_TOL && Math.abs(d13) < ALIGN_TOL);
  }

  function initGame() {
    planets = [{ r: 130, speed: 1.1, angle: 0, size: 22, col: PCOLS[0] }, { r: 220, speed: 0.65, angle: Math.PI * 0.7, size: 28, col: PCOLS[1] }, { r: 320, speed: 0.38, angle: Math.PI * 1.4, size: 34, col: PCOLS[2] }];
    bgStars = []; for (var bsi = 0; bsi < 60; bsi++) bgStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < 0.7 ? 8 : 16 });
    score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; alignPulse = 0; lastTapCooldown = 0;
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 600 + Math.ceil(timeLeft) * 100) : score * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var aligned = getAlignScore();
    for (var pi2 = 0; pi2 < planets.length; pi2++) for (var ri = 0; ri < 36; ri++) { var ra = ri * Math.PI * 2 / 36; pc(CX + Math.cos(ra) * planets[pi2].r, CY + Math.sin(ra) * planets[pi2].r, 2, planets[pi2].col, 0.15); }
    if (aligned) { var glow = 0.6 + 0.3 * Math.sin(elapsed * 12); game.draw.line(CX - 420, CY, CX + 420, CY, ALIGN, 3); game.draw.rect(0, CY - 20, W, 40, ALIGN, glow * 0.06); }
    pc(CX, CY, 52, SUN, 0.9); pc(CX - 15, CY - 15, 18, SUN_HI, 0.35);
    for (var pi3 = 0; pi3 < planets.length; pi3++) { var pl = planets[pi3], px = CX + Math.cos(pl.angle) * pl.r, py = CY + Math.sin(pl.angle) * pl.r; pc(px, py, pl.size, pl.col, 0.9); pc(px - pl.size * 0.3, py - pl.size * 0.3, pl.size * 0.28, C.g, 0.3); }
    if (aligned) txt('ALIGNED! TAP NOW!', W / 2, snap(H * 0.84), 48, ALIGN);
    else txt('WAIT FOR ALIGNMENT', W / 2, snap(H * 0.84), 32, '#ffffff44');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lastTapCooldown > 0) return;
    if (getAlignScore()) {
      score++; alignPulse = 0.5; flash = 0.28; flashCol = C.b; resultText = 'ALIGNED!'; resultTimer = 0.45; lastTapCooldown = 0.5; game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.4, col: ALIGN }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.28; flashCol = C.a; resultText = 'NOT YET!'; resultTimer = 0.42; lastTapCooldown = 0.3; game.audio.play('se_failure', 0.25);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!planets) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'COSMIC!' : 'MISALIGNED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var pi = 0; pi < planets.length; pi++) planets[pi].angle += planets[pi].speed * dt * (1 + score * 0.03);
      if (alignPulse > 0) alignPulse -= dt * 2; if (lastTapCooldown > 0) lastTapCooldown -= dt; if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#030310');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);
