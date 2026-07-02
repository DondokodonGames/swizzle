// 285-tower-stack.js
// タワースタック — 左右に流れるブロックを真上でタップして落とし、ずれた分を削りつつ積み上げる
// 操作: タップで動くブロックを落とす
// 成功: 3段積む  失敗: 3回はみ出す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ビル建築） ──
  var C = { bg:'#04030a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLS = [C.e, C.d, C.b, C.f, C.a];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TOWER STACK';
  var HOW_TO_PLAY = 'TAP TO DROP THE MOVING BLOCK ONTO THE STACK';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 15 → 3
  var MAX_DROP = 3;
  var BLOCK_H = 60, BASE_W = 340, BASE_Y = snap(H * 0.82);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stack, moving, drops, timeLeft, done, particles, scrollOffset, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function topY() { return BASE_Y - stack.length * (BLOCK_H + 4); }

  function spawnMoving() { var top = stack[stack.length - 1], sp = 220 + stack.length * 30; moving = { x: -top.w, y: topY() - BLOCK_H - 8, w: top.w, vx: sp, col: COLS[stack.length % COLS.length] }; }

  function initGame() { stack = [{ x: snap(W / 2 - BASE_W / 2), w: BASE_W, col: C.d }]; drops = 0; timeLeft = MAX_TIME; done = false; particles = []; scrollOffset = 0; fbText = ''; fbCol = C.g; fbTimer = 0; spawnMoving(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? ((stack.length - 1) * 400 + Math.ceil(timeLeft) * 60) : (stack.length - 1) * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBlock(b, y) { game.draw.rect(snap(b.x), snap(y), snap(b.w), BLOCK_H, b.col, 0.9); game.draw.rect(snap(b.x), snap(y), snap(b.w), 8, C.g, 0.25); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !moving) return;
    var prev = stack[stack.length - 1], oL = Math.max(moving.x, prev.x), oR = Math.min(moving.x + moving.w, prev.x + prev.w), ov = oR - oL;
    if (ov <= 0) { drops++; fbText = 'MISSED!'; fbCol = C.a; fbTimer = 0.6; game.audio.play('se_failure', 0.5); moving = null; if (drops >= MAX_DROP) { finish(false); return; } spawnMoving(); return; }
    var perfect = Math.abs(moving.x - prev.x) < 10, bw = perfect ? prev.w : ov, bx = oL;
    fbText = perfect ? 'PERFECT!' : '+' + Math.round(bw); fbCol = perfect ? C.b : C.c; fbTimer = 0.4;
    stack.push({ x: bx, w: bw, col: moving.col });
    for (var pk = 0; pk < 4; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bx + bw / 2, y: topY(), vx: Math.cos(a) * 120, vy: Math.sin(a) * 100, life: 0.4, col: moving.col }); }
    game.audio.play(perfect ? 'se_success' : 'se_tap', 0.4); moving = null;
    if (stack.length > 6) scrollOffset = (stack.length - 6) * (BLOCK_H + 4);
    if (stack.length - 1 >= NEEDED) { finish(true); return; }
    spawnMoving();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stack) initGame(); background(); for (var i = 0; i < stack.length; i++) drawBlock(stack[i], BASE_Y - i * (BLOCK_H + 4)); if (moving) drawBlock(moving, moving.y);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.52, 40, '#554466');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TOWER UP!' : 'COLLAPSE', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (moving) { moving.x += moving.vx * dt; if (moving.x > W + moving.w) moving.vx = -Math.abs(moving.vx); if (moving.x < -moving.w) moving.vx = Math.abs(moving.vx); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var i2 = 0; i2 < stack.length; i2++) drawBlock(stack[i2], BASE_Y - i2 * (BLOCK_H + 4) + scrollOffset);
    if (moving) drawBlock(moving, moving.y + scrollOffset);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y + scrollOffset) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 2);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.6, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt((stack.length - 1) + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var dd = 0; dd < MAX_DROP; dd++) game.draw.rect(snap(W / 2 + (dd - (MAX_DROP - 1) / 2) * 56) - 10, 224, 20, 20, dd < drops ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
