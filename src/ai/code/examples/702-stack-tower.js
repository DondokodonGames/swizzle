// 702-stack-tower.js
// スタックタワー — スライドするブロックをタップで止め、ずれなく積み上げる
// 操作: タップで横移動するブロックを停止。下の段からはみ出した分は切り落とされる
// 成功: 8段 積む  失敗: ブロックが乗らず落下 or 24秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ブロック色は保持） ──
  var C = { bg:'#030810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BLOCK_COLORS = ['#7700ff', '#a855f7', '#00cfff', '#00ff9f', '#ffe600', '#ff6600', '#ff2079'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'STACK TOWER';
  var HOW_TO_PLAY = 'TAP TO DROP THE SLIDING BLOCK · KEEP IT ALIGNED WITH THE STACK';
  var MAX_TIME = 24;
  var NEEDED   = 8;          // 修正2: 15 → 8
  var GROUND_Y = snap(H * 0.86), BLOCK_H = 60, MAX_W = 500, MIN_W = 60;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stack, currentBlock, blockDir, blockSpeed, level, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, dropAnim, waitTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#05080f');
  }

  function background() { game.draw.clear(C.bg); }

  function getTopY() { return GROUND_Y - stack.length * BLOCK_H - BLOCK_H; }

  function spawnBlock() {
    var prevW = stack.length > 0 ? stack[stack.length - 1].w : MAX_W, blockW = Math.min(prevW, MAX_W);
    var col = BLOCK_COLORS[level % BLOCK_COLORS.length], startX = Math.random() > 0.5 ? -blockW : W;
    blockDir = startX < 0 ? 1 : -1; blockSpeed = 320 + level * 12;
    currentBlock = { x: startX, w: blockW, y: getTopY(), col: col };
  }

  function initGame() { stack = [{ x: (W - MAX_W) / 2, w: MAX_W, y: GROUND_Y, col: '#1e293b' }]; currentBlock = null; blockDir = 1; blockSpeed = 320; level = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; dropAnim = null; waitTimer = 0; spawnBlock(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (level * 600 + Math.ceil(timeLeft) * 100) : level * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene(scroll) {
    var sy = function(y) { return y + scroll; };
    game.draw.rect(0, sy(GROUND_Y), W, BLOCK_H * 2, '#1e293b', 0.9);
    for (var si = 0; si < stack.length; si++) {
      var bl = stack[si], by = sy(bl.y); if (by > H + 20 || by + BLOCK_H < -20) continue;
      game.draw.rect(snap(bl.x), by, snap(bl.w), BLOCK_H, bl.col, 0.9); game.draw.rect(snap(bl.x), by, snap(bl.w), 8, C.g, 0.2);
    }
    if (currentBlock) { var cby = sy(currentBlock.y); game.draw.rect(snap(currentBlock.x), cby, snap(currentBlock.w), BLOCK_H, currentBlock.col, 0.9); game.draw.rect(snap(currentBlock.x), cby, snap(currentBlock.w), 8, C.g, 0.3); }
    if (dropAnim) { var dby = sy(dropAnim.y); game.draw.rect(snap(dropAnim.x), dby, snap(dropAnim.w), BLOCK_H, dropAnim.col, 0.6); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !currentBlock || waitTimer > 0) return;
    var prev = stack.length > 0 ? stack[stack.length - 1] : { x: (W - MAX_W) / 2, w: MAX_W };
    var bLeft = currentBlock.x, bRight = currentBlock.x + currentBlock.w, pLeft = prev.x, pRight = prev.x + prev.w;
    var overlapLeft = Math.max(bLeft, pLeft), overlapRight = Math.min(bRight, pRight), overlapW = overlapRight - overlapLeft;
    if (overlapW <= 0) {
      dropAnim = { x: currentBlock.x, y: currentBlock.y, w: currentBlock.w, col: currentBlock.col, vy: 0 };
      currentBlock = null; flash = 0.5; flashCol = C.a; resultText = 'DROPPED!'; resultTimer = 0.8;
      finish(false); return;
    }
    var newBlock = { x: overlapLeft, w: overlapW, y: currentBlock.y, col: currentBlock.col };
    if (overlapW < currentBlock.w) { var trimX = bLeft < pLeft ? bLeft : overlapRight, trimW = currentBlock.w - overlapW; dropAnim = { x: trimX, y: currentBlock.y, w: trimW, col: currentBlock.col, vy: 0 }; }
    stack.push(newBlock); level++; game.audio.play('se_tap', 0.15);
    var perfectThresh = 12;
    if (overlapW >= currentBlock.w - perfectThresh) { newBlock.x = prev.x + (prev.w - overlapW) / 2; newBlock.w = overlapW; flash = 0.3; flashCol = C.b; resultText = overlapW >= currentBlock.w ? 'PERFECT!' : 'NICE!'; game.audio.play('se_success', 0.45); }
    else resultText = '+' + Math.round(overlapW) + 'px';
    resultTimer = 0.5;
    for (var p = 0; p < 4; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: overlapLeft + overlapW / 2, y: newBlock.y, vx: Math.cos(pa) * 150, vy: Math.sin(pa) * 150 - 80, life: 0.4, col: newBlock.col }); }
    currentBlock = null;
    if (level >= NEEDED) { finish(true); return; }
    waitTimer = 0.3;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    var scroll = stack && stack.length > 8 ? (stack.length - 8) * BLOCK_H : 0;

    if (state === S.ATTRACT) {
      if (!stack) initGame(); background(); drawScene(scroll);
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.30, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SKY HIGH!' : 'TIMBER!', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) spawnBlock(); }
      if (currentBlock) { currentBlock.x += blockDir * blockSpeed * dt; if (currentBlock.x > W + 20) { currentBlock.x = W + 20; blockDir = -1; } if (currentBlock.x + currentBlock.w < -20) { currentBlock.x = -20 - currentBlock.w; blockDir = 1; } }
      if (dropAnim) { dropAnim.vy += 800 * dt; dropAnim.y += dropAnim.vy * dt; if (dropAnim.y > H + 100) dropAnim = null; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene(scroll);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y + scroll) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.07);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.30), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(level + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
