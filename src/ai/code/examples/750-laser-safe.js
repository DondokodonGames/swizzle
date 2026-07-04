// 750-laser-safe.js
// レーザーセーフ — 片側からレーザーが照射される。安全な反対側を素早くタップする
// 操作: DANGER 側でないほう（SAFE 側）をタップ。反応が遅すぎてもミス
// 成功: 12回 回避  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、レーザー） ──
  var C = { bg:'#06020e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LASER = '#ff2079', LASER_HI = '#ffe600', SAFE = '#00ff9f';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LASER SAFE';
  var HOW_TO_PLAY = 'A LASER FIRES ON ONE SIDE · TAP THE SAFE OTHER SIDE FAST';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 35 → 12
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var WAIT_DUR = 0.3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var laserSide, showTimer, showDur, waitTimer, answered, scanLine, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0e040e');
  }

  function background() { game.draw.clear(C.bg); }

  function nextRound() { laserSide = Math.random() < 0.5 ? -1 : 1; showDur = Math.max(0.45, 0.9 - score * 0.03); showTimer = showDur; answered = false; scanLine = 0; }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; nextRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    if (showTimer > 0 || waitTimer > 0) {
      var lx = laserSide === -1 ? 0 : W / 2, sx = laserSide === 1 ? 0 : W / 2, frac = showTimer / showDur;
      game.draw.rect(lx, 0, W / 2, H, LASER, 0.07 + frac * 0.05);
      var scanY = (scanLine % 1) * H;
      game.draw.rect(lx, scanY - 2, W / 2, 4, LASER, 0.4); game.draw.rect(lx, ((scanLine + 0.5) % 1) * H - 2, W / 2, 4, LASER, 0.25);
      if (laserSide === -1) { game.draw.line(0, 0, W / 2, H / 3, LASER, frac * 4 + 1); game.draw.line(0, H, W / 2, H * 2 / 3, LASER, frac * 4 + 1); game.draw.line(0, H / 2, W / 2, H / 2, LASER_HI, frac * 6 + 2); }
      else { game.draw.line(W, 0, W / 2, H / 3, LASER, frac * 4 + 1); game.draw.line(W, H, W / 2, H * 2 / 3, LASER, frac * 4 + 1); game.draw.line(W, H / 2, W / 2, H / 2, LASER_HI, frac * 6 + 2); }
      game.draw.rect(sx, 0, W / 2, H, SAFE, 0.04);
      game.draw.line(W / 2, 0, W / 2, H, C.g, 3);
      var dangerX = laserSide === -1 ? W * 0.25 : W * 0.75, safeX = laserSide === 1 ? W * 0.25 : W * 0.75;
      txt('DANGER', dangerX, snap(H * 0.45), 64, LASER); txt('SAFE', safeX, snap(H * 0.45), 64, SAFE); txt('TAP HERE', safeX, snap(H * 0.53), 34, SAFE);
      game.draw.rect(W / 2 - 240, snap(H * 0.68), 480, 16, '#1a1a2a', 0.9); game.draw.rect(W / 2 - 240, snap(H * 0.68), 480 * frac, 16, frac > 0.4 ? SAFE : C.a, 0.9);
    } else txt('...', W / 2, snap(H * 0.44), 80, '#ffffff33');
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || answered || showTimer <= 0 || waitTimer > 0) return;
    var tappedSide = tx < W / 2 ? -1 : 1; answered = true;
    if (tappedSide !== laserSide) {
      score++; flash = 0.22; flashCol = C.b; resultText = 'DODGED!'; resultTimer = 0.35; game.audio.play('se_tap', 0.1);
      var cx = tappedSide === -1 ? W * 0.25 : W * 0.75;
      for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: cx, y: H / 2, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.35, col: SAFE }); }
      if (score >= NEEDED) { finish(true); return; }
      waitTimer = WAIT_DUR;
    } else {
      errors++; flash = 0.32; flashCol = C.a; resultText = 'HIT BY LASER!'; resultTimer = 0.45; game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR) { finish(false); return; }
      waitTimer = WAIT_DUR;
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (laserSide === undefined) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.28, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.33, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.60, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'UNTOUCHABLE!' : 'ZAPPED', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) nextRound(); }
      else { scanLine += dt * 0.9; if (showTimer > 0) { showTimer -= dt; if (showTimer <= 0 && !answered) { errors++; flash = 0.25; flashCol = C.a; resultText = 'TOO SLOW!'; resultTimer = 0.38; game.audio.play('se_failure', 0.2); if (errors >= MAX_ERR) { finish(false); return; } waitTimer = WAIT_DUR; } } }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.8; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0e040e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
