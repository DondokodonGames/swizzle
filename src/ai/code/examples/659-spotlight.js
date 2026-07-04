// 659-spotlight.js
// スポットライト — 動くライトが役者を照らした一瞬にタップでキャッチする
// 操作: スポットが役者に重なって光った瞬間タップ。暗い間の空タップはノーペナルティ
// 成功: 8回 キャッチ  失敗: 3回 見逃し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、劇場） ──
  var C = { bg:'#000003', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPOTLIGHT';
  var HOW_TO_PLAY = 'TAP THE INSTANT THE SPOTLIGHT REVEALS THE PERFORMER IN THE DARK';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 15 → 8
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var STAGE_Y = snap(H * 0.42), PERFORMER_Y = snap(H * 0.68), SPOT_R = 170;
  var SPOT_SPEED = 500;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var spotX, spotDir, performerX, illuminated, wasIlluminated, tappedThisWindow, caught, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, gameElapsed;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#050508');
  }

  function background() { game.draw.clear(C.bg); }

  function movePerformer() { performerX = 120 + Math.random() * (W - 240); }

  function initGame() { spotX = W / 2; spotDir = 1; illuminated = false; wasIlluminated = false; tappedThisWindow = false; caught = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; gameElapsed = 0; movePerformer(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, STAGE_Y, W, H - STAGE_Y, '#08080f', 0.9); game.draw.rect(0, STAGE_Y, W, 6, C.g, 0.15);
    game.draw.rect(0, 0, 90, H * 0.66, C.d, 0.6); game.draw.rect(W - 90, 0, 90, H * 0.66, C.d, 0.6);
    var pa = illuminated ? 0.92 : 0.04;
    pc(performerX, PERFORMER_Y, 56, C.f, pa); pc(performerX - 18, PERFORMER_Y - 18, 20, C.c, pa * 0.5);
    if (illuminated) txt('NOW!', performerX, PERFORMER_Y - 96, 52, C.g);
    game.draw.rect(0, 0, W, H, '#000000', 0.72);
    pc(spotX, PERFORMER_Y, SPOT_R, C.g, 0.1); pc(spotX, PERFORMER_Y, SPOT_R * 0.6, C.g, 0.08);
    game.draw.line(W * 0.35, 0, spotX - SPOT_R, PERFORMER_Y, C.g, 1); game.draw.line(W * 0.65, 0, spotX + SPOT_R, PERFORMER_Y, C.g, 1);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (illuminated && !tappedThisWindow) {
      caught++; tappedThisWindow = true; flash = 0.35; flashCol = C.b; resultText = 'CAUGHT!'; resultTimer = 0.55; game.audio.play('se_success', 0.65);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: performerX, y: PERFORMER_Y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.45, col: C.c }); }
      movePerformer(); if (caught >= NEEDED) { finish(true); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (performerX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(gameElapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      gameElapsed += dt;
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STAR SPOTTER!' : 'CURTAIN CALL', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(gameElapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      gameElapsed += dt;
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; gameElapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      var spd = SPOT_SPEED * (1 + (MAX_TIME - timeLeft) * 0.03);
      spotX += spotDir * spd * dt; if (spotX > W - 50) { spotX = W - 50; spotDir = -1; } if (spotX < 50) { spotX = 50; spotDir = 1; }
      wasIlluminated = illuminated; illuminated = Math.abs(spotX - performerX) < SPOT_R * 0.68;
      if (!wasIlluminated && illuminated) tappedThisWindow = false;
      else if (wasIlluminated && !illuminated && !tappedThisWindow) {
        misses++; flash = 0.35; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.55; game.audio.play('se_failure', 0.3); movePerformer();
        if (misses >= MAX_MISS) { finish(false); return; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.84), 68, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#050508');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
