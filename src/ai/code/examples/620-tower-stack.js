// 620-tower-stack.js
// タワースタック — 左右に揺れるブロックをタイミングよくタップで落として積み上げる
// 操作: タップでブロックを落とす。はみ出た部分は切り落とされ、次第に細くなる
// 成功: 8段 積む  失敗: 完全にミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、建設） ──
  var C = { bg:'#030810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BLOCK_COLORS = [C.e, C.d, C.a, C.f, C.b];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TOWER STACK';
  var HOW_TO_PLAY = 'TAP TO DROP THE SWINGING BLOCK · OVERHANG GETS SLICED OFF · STACK HIGH';
  var MAX_TIME = 20;
  var NEEDED   = 8;          // 修正2: 15 → 8
  var INITIAL_W = 520, BLOCK_H = 64, BASE_Y = snap(H * 0.88);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stack, currentBlock, swingDir, swingX, swingSpeed, level, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, dropped, lock;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); }

  function camOff() { return level > 4 ? (level - 4) * BLOCK_H : 0; }

  function newBlock() {
    var w = stack.length > 0 ? stack[stack.length - 1].w : INITIAL_W;
    var col = BLOCK_COLORS[stack.length % BLOCK_COLORS.length];
    currentBlock = { x: W / 2, w: w, col: col };
    swingX = -w / 2 - 40; swingDir = 1; dropped = false; swingSpeed = 300 + level * 14;
  }

  function initGame() { stack = []; currentBlock = null; level = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; dropped = false; lock = false; stack.push({ x: W / 2, w: INITIAL_W, col: C.e }); newBlock(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (level * 700 + Math.ceil(timeLeft) * 100) : level * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var off = camOff();
    for (var si = 0; si < stack.length; si++) {
      var s = stack[si], absY = BASE_Y - (si + 1) * BLOCK_H + off;
      game.draw.rect(snap(s.x - s.w / 2), snap(absY), snap(s.w), BLOCK_H - 2, s.col, 0.9);
      game.draw.rect(snap(s.x - s.w / 2), snap(absY), snap(s.w), 10, C.g, 0.3);
    }
    if (currentBlock) {
      var cbY = BASE_Y - (stack.length + 1) * BLOCK_H + off;
      game.draw.rect(snap(currentBlock.x - currentBlock.w / 2), snap(cbY), snap(currentBlock.w), BLOCK_H - 2, currentBlock.col, 0.9);
      game.draw.rect(snap(currentBlock.x - currentBlock.w / 2), snap(cbY), snap(currentBlock.w), 10, C.g, 0.4);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || dropped || lock || !currentBlock) return;
    dropped = true;
    var top = stack[stack.length - 1], topLeft = top.x - top.w / 2, topRight = top.x + top.w / 2;
    var curLeft = currentBlock.x - currentBlock.w / 2, curRight = currentBlock.x + currentBlock.w / 2;
    var oL = Math.max(topLeft, curLeft), oR = Math.min(topRight, curRight), oW = oR - oL;
    var cbY = BASE_Y - (stack.length + 1) * BLOCK_H + camOff();
    if (oW <= 0) {
      resultText = 'MISSED!'; resultTimer = 0.8; flash = 0.35; flashCol = C.a; game.audio.play('se_failure', 0.5);
      for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: currentBlock.x, y: cbY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: currentBlock.col }); }
      currentBlock = null; finish(false); return;
    }
    var perfect = Math.abs(oW - top.w) < 10, newW = perfect ? top.w : oW, newX = (oL + oR) / 2;
    stack.push({ x: newX, y: cbY, w: newW, col: currentBlock.col }); level++;
    if (!perfect) {
      if (curLeft < topLeft) { var cx = (curLeft + topLeft) / 2; for (var p2 = 0; p2 < 4; p2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: cx, y: cbY, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180 + 200, life: 0.4, col: currentBlock.col }); } }
      if (curRight > topRight) { var cx2 = (curRight + topRight) / 2; for (var p3 = 0; p3 < 4; p3++) { var a3 = Math.random() * Math.PI * 2; particles.push({ x: cx2, y: cbY, vx: Math.cos(a3) * 180, vy: Math.sin(a3) * 180 + 200, life: 0.4, col: currentBlock.col }); } }
    }
    resultText = perfect ? 'PERFECT!' : '+' + Math.round(oW) + 'px'; flashCol = perfect ? C.c : C.b; resultTimer = 0.6; flash = 0.25; game.audio.play('se_success', perfect ? 0.8 : 0.5);
    if (level >= NEEDED) { finish(true); return; }
    lock = true; setTimeout(function() { if (!done) { newBlock(); lock = false; } }, 400);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stack) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.34, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.38, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SKY HIGH!' : 'TOPPLED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (currentBlock && !dropped) {
        swingX += swingDir * swingSpeed * dt; currentBlock.x = W / 2 + swingX;
        var limit = W / 2 - currentBlock.w / 2 - 20;
        if (currentBlock.x + currentBlock.w / 2 > W - 20) { swingDir = -1; }
        if (currentBlock.x - currentBlock.w / 2 < 20) { swingDir = 1; }
        swingX = currentBlock.x - W / 2;
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.30), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(level + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
