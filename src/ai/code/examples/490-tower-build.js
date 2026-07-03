// 490-tower-build.js
// タワービルド — 左右に流れるブロックをタップで落とし、真下のブロックと重ねて高く積む
// 操作: タップでブロックを落下（重なった部分だけ残る・完全に外すとミス）
// 成功: 8段 積む  失敗: 3回 全外し or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、建設現場） ──
  var C = { bg:'#050814', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BLOCK_COLS = [C.e, C.b, C.c, C.d, C.a, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TOWER BUILD';
  var HOW_TO_PLAY = 'TAP TO DROP THE BLOCK · STACK IT ON THE ONE BELOW';
  var MAX_TIME = 20;
  var GOAL     = 8;          // 修正2: 15 → 8
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var GROUND_Y = snap(H * 0.86), BLOCK_H = 64, MIN_W = 60;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tower, sliding, fallingPieces, misses, timeLeft, done, particles, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#1a0e06', 0.9); }

  function topBlock() { return tower.length > 0 ? tower[tower.length - 1] : { x: W / 2 - 200, w: 400 }; }

  function spawnSliding() {
    var top = topBlock(), nw = Math.max(MIN_W, Math.min(top.w + 40, 440)), y = GROUND_Y - (tower.length + 1) * BLOCK_H;
    var startX = Math.random() < 0.5 ? -nw : W, vx = startX < 0 ? 280 + tower.length * 14 : -(280 + tower.length * 14);
    sliding = { x: startX, w: nw, y: y, col: BLOCK_COLS[tower.length % BLOCK_COLS.length], vx: vx };
  }

  function initGame() { tower = [{ x: W / 2 - 200, w: 400, col: '#374151' }]; sliding = null; fallingPieces = []; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; spawnSliding(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (tower.length * 400 + Math.ceil(timeLeft) * 100) : tower.length * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function placeBlock() {
    if (!sliding) return;
    var top = topBlock(), sL = sliding.x, sR = sliding.x + sliding.w, tL = top.x, tR = top.x + top.w;
    var oL = Math.max(sL, tL), oR = Math.min(sR, tR), ow = oR - oL;
    if (ow <= 0) {
      misses++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.5);
      fallingPieces.push({ x: sliding.x, y: sliding.y, w: sliding.w, col: sliding.col, vy: 0 }); sliding = null;
      if (misses >= MAX_MISS) { finish(false); return; }
      spawnSliding(); return;
    }
    tower.push({ x: oL, w: ow, col: sliding.col }); flash = 0.25; flashCol = C.b; game.audio.play('se_tap', 0.4 + ow / sliding.w * 0.3);
    if (sL < oL) fallingPieces.push({ x: sL, y: sliding.y, w: oL - sL, col: sliding.col, vy: 0 });
    if (sR > oR) fallingPieces.push({ x: oR, y: sliding.y, w: sR - oR, col: sliding.col, vy: 0 });
    for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: oL + ow / 2, y: sliding.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120 - 80, life: 0.5, col: sliding.col }); }
    sliding = null;
    if (tower.length - 1 >= GOAL) { finish(true); return; }
    spawnSliding();
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    placeBlock();
  });

  function drawScene() {
    for (var ti = 0; ti < tower.length; ti++) { var b = tower[ti], by = GROUND_Y - (ti + 1) * BLOCK_H; game.draw.rect(snap(b.x) + 3, by + 3, b.w - 6, BLOCK_H - 6, b.col, 0.9); game.draw.rect(snap(b.x) + 3, by + 3, b.w - 6, 10, C.g, 0.2); }
    for (var fp = 0; fp < fallingPieces.length; fp++) { var f = fallingPieces[fp]; game.draw.rect(snap(f.x) + 2, snap(f.y) + 2, f.w - 4, BLOCK_H - 4, f.col, 0.6); }
    if (sliding) { game.draw.rect(snap(sliding.x) + 3, snap(sliding.y) + 3, sliding.w - 6, BLOCK_H - 6, sliding.col, 0.9); game.draw.rect(snap(sliding.x) + 3, snap(sliding.y) + 3, sliding.w - 6, 10, C.g, 0.3); var top = topBlock(); game.draw.rect(snap(top.x) - 1, snap(sliding.y) + BLOCK_H, 2, GROUND_Y - sliding.y - BLOCK_H, C.d, 0.4); game.draw.rect(snap(top.x + top.w) - 1, snap(sliding.y) + BLOCK_H, 2, GROUND_Y - sliding.y - BLOCK_H, C.d, 0.4); }
  }

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!tower) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'SKY HIGH!' : 'TOPPLED', W / 2, H * 0.20, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.27, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.33, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      if (sliding) { sliding.x += sliding.vx * dt; if (sliding.x < -sliding.w - 40) { sliding.x = -sliding.w - 40; sliding.vx = Math.abs(sliding.vx); } if (sliding.x > W + 40) { sliding.x = W + 40; sliding.vx = -Math.abs(sliding.vx); } }
      for (var fp = fallingPieces.length - 1; fp >= 0; fp--) { fallingPieces[fp].vy += 600 * dt; fallingPieces[fp].y += fallingPieces[fp].vy * dt; if (fallingPieces[fp].y > H + 100) fallingPieces.splice(fp, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt((tower.length - 1) + ' / ' + GOAL, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
