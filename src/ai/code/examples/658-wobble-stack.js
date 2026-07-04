// 658-wobble-stack.js
// ゆらゆら積み — 左右に揺れるブロックが塔の真上に来た瞬間、タップで落として積む
// 操作: タップでブロックを落下。中心に近いほど高評価。ズレの許容範囲は少しずつ狭まる
// 成功: 8個 積む  失敗: 3回 外し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、建設現場） ──
  var C = { bg:'#050a14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WOBBLE STACK';
  var HOW_TO_PLAY = 'TAP TO DROP THE SWINGING BLOCK WHEN IT LINES UP WITH THE TOWER';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 12 → 8
  var MAX_MISS = 3;
  var BLOCK_H = 72, BLOCK_W = 240, CENTER_X = W / 2, GROUND_Y = snap(H * 0.82), DROPPER_Y = snap(H * 0.19), SWING_AMP = 400, MIN_HW = 72;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var dropperX, dropTime, allowedHW, stacked, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, gameElapsed;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#020610');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { dropperX = CENTER_X; dropTime = 0; allowedHW = 200; stacked = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; gameElapsed = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (stacked * 600 + Math.ceil(timeLeft) * 100) : stacked * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.d, 0.3); game.draw.rect(0, GROUND_Y, W, 8, C.e, 0.5);
    for (var ti = 0; ti < stacked; ti++) { var bt = GROUND_Y - (ti + 1) * BLOCK_H; game.draw.rect(snap(CENTER_X - BLOCK_W / 2), snap(bt), BLOCK_W, BLOCK_H, C.d, 0.9); game.draw.rect(snap(CENTER_X - BLOCK_W / 2), snap(bt), BLOCK_W, 12, C.e, 0.6); }
    var zoneTop = GROUND_Y - stacked * BLOCK_H - BLOCK_H;
    game.draw.rect(CENTER_X - allowedHW, snap(zoneTop), allowedHW * 2, BLOCK_H, C.b, 0.1); game.draw.rect(CENTER_X - allowedHW, snap(zoneTop + BLOCK_H - 4), allowedHW * 2, 4, C.b, 0.5);
    game.draw.line(CENTER_X, H * 0.09, dropperX, DROPPER_Y - BLOCK_H / 2, '#94a3b8', 3);
    game.draw.rect(snap(dropperX - BLOCK_W / 2), DROPPER_Y - BLOCK_H / 2, BLOCK_W, BLOCK_H, C.f, 0.92); game.draw.rect(snap(dropperX - BLOCK_W / 2), DROPPER_Y - BLOCK_H / 2, BLOCK_W, 14, C.c, 0.6);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var offset = Math.abs(dropperX - CENTER_X);
    if (offset <= allowedHW) {
      stacked++; allowedHW = Math.max(MIN_HW, allowedHW - 12); flash = 0.35; flashCol = C.b; resultText = offset < 40 ? 'PERFECT!' : 'NICE!'; resultTimer = 0.55; game.audio.play('se_success', 0.6);
      var hitY = GROUND_Y - stacked * BLOCK_H + BLOCK_H / 2;
      for (var p = 0; p < 7; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CENTER_X, y: hitY, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.45, col: C.c }); }
      if (stacked >= NEEDED) { finish(true); return; }
    } else { misses++; flash = 0.4; flashCol = C.a; resultText = 'MISSED'; resultTimer = 0.5; game.audio.play('se_failure', 0.35); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (dropperX === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(gameElapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.30, 40, C.a);
      gameElapsed += dt; dropTime += dt; dropperX = CENTER_X + Math.sin(dropTime * 1.5) * SWING_AMP;
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TOWER BUILT!' : 'TOPPLED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      dropTime += dt; var freq = 1.5 + (MAX_TIME - timeLeft) * 0.03; dropperX = CENTER_X + Math.sin(dropTime * freq) * SWING_AMP;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.68), 68, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(stacked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#020610');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
