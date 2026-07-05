// 775-stack-fall.js
// スタックフォール — 振り子のように揺れるブロックを、下段に重ねて塔を積み上げろ
// 操作: タップでブロックを落とす（下のブロックに重なった部分だけが残る）
// 成功: 10段 達成  失敗: 3回 全部外す or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ブロック色は保持） ──
  var C = { bg:'#05080f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BLOCK = ['#7700ff', '#ff6600', '#00ff41', '#ff2079', '#ffe600', '#00cfff'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STACK FALL';
  var HOW_TO_PLAY = 'TAP TO DROP THE SWINGING BLOCK · ONLY THE OVERLAP STAYS · STACK IT UP';
  var MAX_TIME = 24;
  var NEEDED   = 10;         // 修正2: 20 → 10
  var MAX_MISS = 3;
  var BLOCK_H = 56, BASE_W = 340, BASE_X = snap(W / 2), BASE_Y = snap(H - 220), SWING_R = W * 0.55;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stack, swingBlock, swingAngle, swingSpeed, score, misses, done, timeLeft, elapsed, particles, flash, flashCol, resultText, resultTimer, camOffset, dropLock;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#080c14');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnSwing() {
    var topBlock = stack[stack.length - 1] || { x: BASE_X, w: BASE_W };
    swingBlock = { w: topBlock.w, colorIdx: stack.length % BLOCK.length }; swingAngle = -Math.PI * 0.55; swingSpeed = Math.min(2.8, 1.4 + score * 0.08); dropLock = false;
  }

  function getSwingX() { return W / 2 + Math.sin(swingAngle) * SWING_R; }
  function getTopStackY() { return BASE_Y - stack.length * BLOCK_H; }

  function initGame() {
    stack = [{ x: BASE_X, w: BASE_W, colorIdx: 0 }]; score = 0; misses = 0; done = false; timeLeft = MAX_TIME; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; camOffset = 0;
    spawnSwing();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 450 + Math.ceil(timeLeft) * 120) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var si = 0; si < stack.length; si++) {
      var bl = stack[si], bx = bl.x, by = BASE_Y - si * BLOCK_H + camOffset;
      if (by > H + BLOCK_H || by < -BLOCK_H * 2) continue;
      game.draw.rect(snap(bx - bl.w / 2), snap(by), snap(bl.w), BLOCK_H, BLOCK[bl.colorIdx], 0.88); game.draw.rect(snap(bx - bl.w / 2), snap(by), snap(bl.w), 10, C.g, 0.15);
    }
    game.draw.rect(snap(BASE_X - BASE_W / 2 - 20), snap(BASE_Y + camOffset), snap(BASE_W + 40), BLOCK_H + 20, '#2a3545', 0.9); game.draw.rect(snap(BASE_X - BASE_W / 2 - 20), snap(BASE_Y + camOffset), snap(BASE_W + 40), 8, '#8494a8', 0.4);
    if (swingBlock) {
      var sx = getSwingX(), sy = getTopStackY() - BLOCK_H * 0.5 + camOffset, col2 = BLOCK[swingBlock.colorIdx];
      game.draw.line(W / 2, -40, sx, sy - BLOCK_H / 2, '#2a3545', 4);
      game.draw.rect(snap(sx - swingBlock.w / 2), snap(sy), snap(swingBlock.w), BLOCK_H, col2, 0.9); game.draw.rect(snap(sx - swingBlock.w / 2), snap(sy), snap(swingBlock.w), 10, C.g, 0.2);
      game.draw.line(sx, sy + BLOCK_H, sx, sy + BLOCK_H + 30, col2, 3);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !swingBlock || dropLock) return;
    var dropX = getSwingX(), topBlock = stack[stack.length - 1] || { x: BASE_X, w: BASE_W };
    var overlapLeft = Math.max(topBlock.x - topBlock.w / 2, dropX - swingBlock.w / 2), overlapRight = Math.min(topBlock.x + topBlock.w / 2, dropX + swingBlock.w / 2), overlap = overlapRight - overlapLeft;
    var col = BLOCK[swingBlock.colorIdx];
    if (overlap <= 0) {
      misses++; dropLock = true; flash = 0.4; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.5; game.audio.play('se_failure', 0.35);
      for (var p = 0; p < 5; p++) { var pa = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: dropX, y: getTopStackY(), vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 120, life: 0.4, col: col }); }
      if (misses >= MAX_MISS) { finish(false); return; }
      setTimeout(function() { if (!done && state === S.PLAYING) spawnSwing(); }, 500);
    } else {
      var newX = (overlapLeft + overlapRight) / 2;
      stack.push({ x: newX, w: overlap, colorIdx: swingBlock.colorIdx }); score++;
      if (Math.abs(overlap - topBlock.w) < 10) { stack[stack.length - 1].w = topBlock.w; stack[stack.length - 1].x = topBlock.x; flash = 0.28; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.4; game.audio.play('se_success', 0.7); }
      else { game.audio.play('se_tap', 0.1); resultText = Math.round(overlap) + 'px'; resultTimer = 0.28; flash = 0.15; flashCol = C.b; }
      for (var p2 = 0; p2 < 4; p2++) particles.push({ x: newX, y: getTopStackY(), vx: (Math.random() - 0.5) * 100, vy: -50, life: 0.5, col: col });
      if (score >= NEEDED) { finish(true); return; }
      spawnSwing();
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stack) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.30, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TOWER COMPLETE!' : 'TOPPLED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(score >= NEEDED); return; }
      if (swingBlock && !dropLock) { swingAngle += swingSpeed * dt; if (swingAngle > Math.PI * 0.55 || swingAngle < -Math.PI * 0.55) { swingSpeed *= -1; swingAngle = Math.max(-Math.PI * 0.55, Math.min(Math.PI * 0.55, swingAngle)); } }
      var topY = BASE_Y - stack.length * BLOCK_H, targetCam = Math.min(0, H * 0.4 - topY); camOffset += (targetCam - camOffset) * dt * 4;
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) { var p3 = particles[pp2]; game.draw.rect(snap(p3.x) - 5, snap(p3.y + camOffset) - 5, 10, 10, p3.col, p3.life * 2); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.30), 50, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#080c14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
