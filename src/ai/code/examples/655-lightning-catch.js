// 655-lightning-catch.js
// ライトニングキャッチ — 落雷ポイントへロッドを寄せ、稲妻が光った一瞬にタップで受ける
// 操作: タップでロッドを移動。予告(!)の位置に寄せ、NOW!の瞬間にロッド下でタップ
// 成功: 8本 キャッチ  失敗: 3回 外し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、嵐の夜） ──
  var C = { bg:'#020308', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LIGHTNING CATCH';
  var HOW_TO_PLAY = 'MOVE THE ROD UNDER THE WARNING · TAP THE MOMENT THE BOLT FLASHES';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 15 → 8
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var ROD_Y = snap(H * 0.72), ROD_W = 90, ROD_H = 170, FLASH_WINDOW = 0.4;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rodX, targetRodX, lightningX, boltPhase, waitTimer, flashTimer, boltSegments, caught, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, gameElapsed;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#030409');
  }

  function background() { game.draw.clear(C.bg); }

  function newLightning() {
    lightningX = 80 + Math.random() * (W - 160); boltPhase = 'warning'; waitTimer = 1.2 + Math.random() * 1.8;
    boltSegments = []; var y = H * 0.05; while (y < ROD_Y) { boltSegments.push({ x: lightningX + (Math.random() - 0.5) * 80, y: y }); y += 30 + Math.random() * 30; }
  }

  function initGame() { rodX = W / 2; targetRodX = W / 2; caught = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; gameElapsed = 0; newLightning(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, 0, W, H * 0.72, '#040510', 0.8);
    for (var ci = 0; ci < 5; ci++) { var cx = (ci * W / 4 + gameElapsed * 20) % (W + 200) - 100, cy = H * 0.08 + ci * 30; pc(cx, cy, 80, '#0a0d1a', 0.6); pc(cx + 60, cy - 20, 60, '#141828', 0.5); }
    if (boltPhase === 'warning') { pc(lightningX, H * 0.06, 40, C.d, Math.sin(gameElapsed * 8) * 0.2 + 0.3); txt('!', lightningX, ROD_Y - 20, 48, C.g); }
    if (boltPhase === 'flash') {
      var fp = flashTimer / FLASH_WINDOW; game.draw.rect(0, 0, W, H, C.d, fp * 0.12);
      for (var bi = 0; bi < boltSegments.length - 1; bi++) { var s1 = boltSegments[bi], s2 = boltSegments[bi + 1]; game.draw.line(s1.x, s1.y, s2.x, s2.y, C.g, 8); game.draw.line(s1.x, s1.y, s2.x, s2.y, C.e, 14); }
      txt('NOW!', lightningX, ROD_Y - 30, 64, C.c);
    }
    game.draw.rect(0, ROD_Y + ROD_H, W, H - (ROD_Y + ROD_H), '#111', 0.8);
    game.draw.rect(snap(rodX - ROD_W / 2), ROD_Y, ROD_W, ROD_H, C.c, 0.9); game.draw.rect(snap(rodX - ROD_W / 2), ROD_Y, ROD_W, 16, C.g, 0.6); pc(rodX, ROD_Y, 20, C.g, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetRodX = Math.max(ROD_W / 2 + 20, Math.min(W - ROD_W / 2 - 20, tx));
    if (boltPhase === 'flash') {
      if (Math.abs(rodX - lightningX) < ROD_W / 2 + 30) {
        caught++; flash = 0.3; flashCol = C.b; resultText = 'CAUGHT!'; resultTimer = 0.5; game.audio.play('se_success', 0.6);
        for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: lightningX, y: ROD_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.e }); }
        boltPhase = 'done'; if (caught >= NEEDED) { finish(true); return; } setTimeout(newLightning, 600);
      } else {
        misses++; flash = 0.3; flashCol = C.a; resultText = 'MISSED'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS) { finish(false); return; }
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (lightningX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 19, C.b);
      if (Math.floor(gameElapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.94, 40, C.a);
      gameElapsed += dt;
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STORM RIDER!' : 'GROUNDED', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
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
      rodX += (targetRodX - rodX) * Math.min(1, dt * 14);
      if (boltPhase === 'warning') { waitTimer -= dt; if (waitTimer <= 0) { boltPhase = 'flash'; flashTimer = FLASH_WINDOW; game.audio.play('se_success', 0.15); } }
      else if (boltPhase === 'flash') { flashTimer -= dt; if (flashTimer <= 0) { misses++; game.audio.play('se_failure', 0.25); boltPhase = 'done'; if (misses >= MAX_MISS) { finish(false); return; } setTimeout(newLightning, 400); } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.86), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#030409');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
