// 734-shadow-dodge.js
// シャドウドッジ — 画面を横切る影の帯を避け、明るいゾーンをタップする
// 操作: 影の外側の明るい部分をタップ。影の中を押すとミス。影は加速する
// 成功: 10回 成功  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、影と光） ──
  var C = { bg:'#050510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var SHADOW = '#000000', LIGHT = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHADOW DODGE';
  var HOW_TO_PLAY = 'TAP THE BRIGHT AREA OUTSIDE THE SWEEPING SHADOW BAND';
  var MAX_TIME = 20;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var shadowW = 280, SHADOW_SPEED = 380;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shadowX, shadowDir, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#12121c');
  }

  function background() { game.draw.clear(C.bg); for (var lr = 0; lr < 8; lr++) game.draw.line(lr * (W / 7), 0, lr * (W / 7), H, LIGHT, 2); }

  function initGame() { shadowX = W / 2; shadowDir = 1; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var s = 0; s < 12; s++) { var sw = shadowW / 6, sx = shadowX - shadowW + s * sw, sAlpha = (s < 6) ? (s / 6) * 0.7 : ((12 - s) / 6) * 0.7; game.draw.rect(sx, 0, sw, H, SHADOW, sAlpha); }
    game.draw.rect(shadowX - shadowW * 0.3, 0, shadowW * 0.6, H, SHADOW, 0.9);
    if (shadowX - shadowW > 80) game.draw.rect(0, H * 0.42, shadowX - shadowW, H * 0.16, C.b, 0.1);
    if (shadowX + shadowW < W - 80) game.draw.rect(shadowX + shadowW, H * 0.42, W - (shadowX + shadowW), H * 0.16, C.b, 0.1);
    txt('TAP THE LIGHT', W / 2, H * 0.20, 44, C.c);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var inShadow = Math.abs(tx - shadowX) < shadowW;
    if (!inShadow) {
      score++; flash = 0.25; flashCol = C.b; resultText = 'IN THE LIGHT!'; resultTimer = 0.4; game.audio.play('se_tap', 0.1);
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: tx, y: ty, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150, life: 0.4, col: LIGHT }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.3; flashCol = C.a; resultText = 'IN SHADOW!'; resultTimer = 0.4; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (shadowX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'LIGHT WALKER!' : 'CAUGHT IN THE DARK', W / 2, H * 0.35, 50, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      var spd = Math.min(700, SHADOW_SPEED + score * 20);
      shadowX += spd * shadowDir * dt;
      if (shadowX > W + shadowW) { shadowX = W + shadowW; shadowDir = -1; } if (shadowX < -shadowW) { shadowX = -shadowW; shadowDir = 1; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#12121c');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
