// 732-paint-overflow.js
// ペイントオーバーフロー — 満ちていく絵の具カップを、溢れる直前でタップして止める
// 操作: 液面が88%〜100%の安全ゾーンに入った瞬間タップ。早すぎ・溢れはミス
// 成功: 8回 成功  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、絵の具色は保持） ──
  var C = { bg:'#030208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PAINT_COLORS = ['#00cfff', '#ff2079', '#00ff41', '#a855f7', '#ff6600', '#ff2fa0'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PAINT OVERFLOW';
  var HOW_TO_PLAY = 'TAP TO STOP THE PAINT IN THE GREEN ZONE (88-100%) · DO NOT OVERFLOW';
  var MAX_TIME = 22;
  var NEEDED   = 8;          // 修正2: 25 → 8
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var CUP_X = W / 2 - 100, CUP_Y = snap(H * 0.25), CUP_W = 200, CUP_H = 400, SAFE_ZONE_LO = 0.88, SAFE_ZONE_HI = 1.00;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var fillLevel, fillSpeed, filling, paintCol, drips, shakeX, shakeAnim, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, waitTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#040311');
  }

  function background() { game.draw.clear(C.bg); }

  function resetCup() { fillLevel = Math.random() * 0.15; fillSpeed = Math.min(0.24, 0.10 + score * 0.015); filling = true; paintCol = PAINT_COLORS[score % PAINT_COLORS.length]; drips = []; shakeX = 0; waitTimer = 0; }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; shakeAnim = 0; resetCup(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 600 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var cx = CUP_X + shakeX, fillH = fillLevel * CUP_H, fillTop = CUP_Y + CUP_H - fillH, inZone = fillLevel >= SAFE_ZONE_LO;
    game.draw.rect(cx, CUP_Y, CUP_W, CUP_H, '#334155', 0.9);
    if (fillH > 0) { game.draw.rect(cx + 4, fillTop, CUP_W - 8, fillH, paintCol, 0.88); game.draw.rect(cx + 4, fillTop, CUP_W - 8, 8, C.g, 0.4); }
    var safeY = CUP_Y + CUP_H * (1 - SAFE_ZONE_LO);
    game.draw.line(cx - 20, safeY, cx + CUP_W + 20, safeY, C.b, 4); txt('STOP', cx + CUP_W + 70, safeY + 10, 28, C.b);
    game.draw.rect(cx, CUP_Y, 8, CUP_H, '#64748b', 0.35); game.draw.rect(cx + CUP_W - 8, CUP_Y, 8, CUP_H, '#64748b', 0.2); game.draw.rect(cx, CUP_Y, CUP_W, 8, '#64748b', 0.35);
    if (inZone && filling) game.draw.rect(cx - 8, CUP_Y - 8, CUP_W + 16, CUP_H + 16, C.b, 0.12 + 0.06 * Math.sin(elapsed * 10));
    var pct2 = Math.round(fillLevel * 100), pctCol = inZone ? C.b : (pct2 > 75 ? C.a : C.g);
    txt(pct2 + '%', W * 0.18, snap(H * 0.45), 72, pctCol);
    if (inZone && filling) txt('TAP!', W / 2, snap(H * 0.78), 56, C.b);
    for (var di2 = 0; di2 < drips.length; di2++) pc(drips[di2].x + shakeX, drips[di2].y, 14 * drips[di2].life, drips[di2].col, drips[di2].life);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !filling || waitTimer > 0) return;
    if (fillLevel >= SAFE_ZONE_LO && fillLevel <= SAFE_ZONE_HI) {
      filling = false; score++; flash = 0.35; flashCol = C.b; resultText = 'STOP AT ' + Math.round(fillLevel * 100) + '%!'; resultTimer = 0.7; game.audio.play('se_success', 0.6);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CUP_X + CUP_W / 2, y: CUP_Y + (1 - fillLevel) * CUP_H, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.45, col: paintCol }); }
      if (score >= NEEDED) { finish(true); return; }
      waitTimer = 0.6;
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = fillLevel < SAFE_ZONE_LO ? Math.round(fillLevel * 100) + '%  TOO EARLY!' : 'OVERFLOW!'; resultTimer = 0.6; game.audio.play('se_failure', 0.35); filling = false;
      if (errors >= MAX_ERR) { finish(false); return; }
      waitTimer = 0.7;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (fillLevel === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STEADY POUR!' : 'SPILLED IT', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) resetCup(); }
      if (filling) {
        fillLevel += fillSpeed * dt;
        if (fillLevel >= 1.0) {
          fillLevel = 1.0; filling = false; errors++; flash = 0.5; flashCol = C.a; resultText = 'OVERFLOW!'; resultTimer = 0.7; game.audio.play('se_failure', 0.5); shakeAnim = 0.3;
          for (var d = 0; d < 5; d++) drips.push({ x: CUP_X + Math.random() * CUP_W, y: CUP_Y, vy: 200 + Math.random() * 200, life: 0.5, col: paintCol });
          if (errors >= MAX_ERR) { finish(false); return; }
          waitTimer = 0.8;
        }
      }
      if (shakeAnim > 0) { shakeAnim -= dt * 3; shakeX = Math.sin(elapsed * 40) * 14 * shakeAnim; } else shakeX = 0;
      for (var di = drips.length - 1; di >= 0; di--) { drips[di].y += drips[di].vy * dt; drips[di].vy += 400 * dt; drips[di].life -= dt * 2; if (drips[di].life <= 0) drips.splice(di, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.85), 48, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#040311');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
