// 603-earthquake.js
// アースクエイク — 揺れて傾く足場の上で、反対側へ体重移動してバランスを保つ
// 操作: 傾いた方向と逆へ左右スワイプ/タップで踏ん張る（端まで滑ると転落）
// 成功: 15秒 生き残る  失敗: 3回 転落 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、崩落地帯） ──
  var C = { bg:'#0a0400', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'EARTHQUAKE';
  var HOW_TO_PLAY = 'SWIPE / TAP AGAINST THE TILT TO KEEP YOUR BALANCE · DO NOT SLIDE OFF';
  var MAX_TIME = 15;         // 修正2: 20 → 15
  var MAX_FALLS = 3;
  var PLAT_W = W * 0.72, PLAT_H = 44;
  var PIVOT_X = W / 2, PIVOT_Y = snap(H * 0.62);
  var PLAYER_R = 30;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var platAngle, platAngVel, shakeTimer, shakePeriod, shakeTarget, playerRelX, playerVelX, playerAX, playerAY, falls, invincible, timeLeft, done, particles, flash, hitFlash, cracks, dust;
  var SHAKE_AMP = 0.5;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#2a1400');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { platAngle = 0; platAngVel = 0; shakeTimer = 0; shakePeriod = 1.5; shakeTarget = 0; playerRelX = 0; playerVelX = 0; playerAX = PIVOT_X; playerAY = PIVOT_Y - PLAYER_R; falls = 0; invincible = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; hitFlash = 0; cracks = []; dust = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (MAX_TIME * 200 + (MAX_FALLS - falls) * 600) : Math.round((MAX_TIME - timeLeft) * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var shakeX = Math.sin(game.time.elapsed * 12) * 8 * Math.abs(platAngle);
    game.draw.rect(shakeX, snap(H * 0.82), W, H * 0.18, '#3a2000', 0.6);
    for (var di2 = 0; di2 < dust.length; di2++) { var dp = dust[di2]; game.draw.rect(snap(dp.x + shakeX), snap(dp.y), 10, 10, '#8a6a20', dp.life * 0.4); }

    // platform (pixel blocks along the tilted line)
    var cosA = Math.cos(platAngle), sinA = Math.sin(platAngle);
    for (var bx = -PLAT_W / 2; bx <= PLAT_W / 2; bx += 16) {
      var wx = PIVOT_X + bx * cosA, wy = PIVOT_Y + bx * sinA;
      game.draw.rect(snap(wx) - 8, snap(wy), 16, PLAT_H, '#5a3010');
      game.draw.rect(snap(wx) - 8, snap(wy), 16, 6, C.f, 0.8);
    }
    for (var ci = 0; ci < cracks.length; ci++) { var cr = cracks[ci], cx = PIVOT_X + cr.x * cosA, cy = PIVOT_Y + cr.x * sinA; game.draw.rect(snap(cx) - 2, snap(cy), 4, PLAT_H, '#1a0c00', cr.life * 0.6); }

    // player
    var pCol = hitFlash > 0 ? C.a : C.e;
    var pa = (invincible > 0 && Math.floor(game.time.elapsed * 8) % 2 === 0) ? 0.3 : 0.9;
    pc(playerAX, playerAY, PLAYER_R, pCol, pa); pc(playerAX - 8, playerAY - 8, PLAYER_R * 0.3, C.g, 0.5 * pa);

    // balance meter
    game.draw.rect(W / 2 - 200, snap(H * 0.20), 400, 16, '#2a1400', 0.8);
    var bx2 = W / 2 + playerRelX * 200;
    pc(bx2, H * 0.20 + 8, 16, Math.abs(playerRelX) > 0.6 ? C.a : C.b, 0.95);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') playerVelX -= 190; else if (dir === 'right') playerVelX += 190;
    game.audio.play('se_tap', 0.15);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (tx < W / 2) playerVelX -= 130; else playerVelX += 130; game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!particles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STAYED UP!' : 'FELL OFF', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 3; if (hitFlash > 0) hitFlash -= dt * 3; if (invincible > 0) invincible -= dt;

      shakeTimer += dt;
      if (shakeTimer > shakePeriod) { shakeTimer = 0; shakeTarget = (Math.random() - 0.5) * SHAKE_AMP * 2; shakePeriod = 0.8 + Math.random() * 0.8; if (Math.random() < 0.5) cracks.push({ x: (Math.random() - 0.5) * PLAT_W, life: 1.5 }); }
      platAngVel += (shakeTarget - platAngle) * 4 * dt; platAngVel *= 0.92; platAngle += platAngVel * dt;
      platAngle = Math.max(-SHAKE_AMP * 1.2, Math.min(SHAKE_AMP * 1.2, platAngle));
      for (var ci = cracks.length - 1; ci >= 0; ci--) { cracks[ci].life -= dt; if (cracks[ci].life <= 0) cracks.splice(ci, 1); }

      var gravEffect = Math.sin(platAngle) * 400;
      playerVelX += gravEffect * dt; playerVelX *= 0.88;
      playerRelX += playerVelX * dt / (PLAT_W / 2);
      playerRelX = Math.max(-1, Math.min(1, playerRelX));
      var localX = playerRelX * PLAT_W / 2, cosA = Math.cos(platAngle), sinA = Math.sin(platAngle);
      playerAX = PIVOT_X + localX * cosA - (PLAT_H / 2 + PLAYER_R) * (-sinA);
      playerAY = PIVOT_Y + localX * sinA - (PLAT_H / 2 + PLAYER_R) * cosA;

      if (Math.random() < 0.2) dust.push({ x: PIVOT_X + (Math.random() - 0.5) * PLAT_W, y: PIVOT_Y + PLAT_H, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, life: 0.5 });
      for (var di = dust.length - 1; di >= 0; di--) { dust[di].x += dust[di].vx * dt; dust[di].y += dust[di].vy * dt; dust[di].life -= dt * 2; if (dust[di].life <= 0) dust.splice(di, 1); }

      if (Math.abs(playerRelX) >= 1 && invincible <= 0) {
        falls++; invincible = 1.5; hitFlash = 0.5; flash = 0.4; playerRelX = 0; playerVelX = 0; game.audio.play('se_failure', 0.5);
        for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: playerAX, y: playerAY, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: C.e }); }
        if (falls >= MAX_FALLS) { finish(false); return; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 2);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.a, hitFlash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    for (var fi = 0; fi < MAX_FALLS; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALLS - 1) / 2) * 56) - 10, 168, 20, 20, fi < falls ? C.a : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
