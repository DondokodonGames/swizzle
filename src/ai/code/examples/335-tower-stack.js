// 335-tower-stack.js
// タワースタック — 左右に流れるブロックをタップで落とし、重なった幅だけ積み上げる高層建築
// 操作: タップで動くブロックを落とす（前の段と重なった部分だけ残る）
// 成功: 3段積む  失敗: 幅が細くなりすぎる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、摩天楼） ──
  var C = { bg:'#0c0c14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BCOLS = [C.e, C.d, C.b, C.f, C.a, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TOWER STACK';
  var HOW_TO_PLAY = 'TAP TO DROP THE MOVING BLOCK ON THE STACK';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 15 → 3
  var BLOCK_H = 60, START_W = 380, SWING = 300, BASE_Y = snap(H * 0.84), PERFECT = 16;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var stack, moving, layer, cameraY, perfects, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#12121e');
  }

  function background() { game.draw.clear(C.bg); for (var i = 0; i < 20; i++) { var sx = (i * 137 + 50) % W, sy = (i * 97 + 30) % (H * 0.7); game.draw.rect(snap(sx), snap(sy), 8, 8, C.g, Math.floor(game.time.elapsed * 2 + i) % 3 === 0 ? 0.5 : 0.2); } }

  function initGame() { stack = [{ x: snap(W / 2 - START_W / 2), w: START_W, y: BASE_Y - BLOCK_H, layer: 0 }]; moving = { x: -START_W, w: START_W, dir: 1 }; layer = 0; cameraY = 0; perfects = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (layer * 400 + perfects * 100 + Math.ceil(timeLeft) * 100) : layer * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBlock(x, y, w, col, alpha) { game.draw.rect(snap(x), snap(y), snap(w), BLOCK_H - 4, col, alpha); game.draw.rect(snap(x), snap(y), snap(w), 8, C.g, 0.25); }

  function drop() {
    var prev = stack[stack.length - 1], oL = Math.max(moving.x, prev.x), oR = Math.min(moving.x + moving.w, prev.x + prev.w), ov = oR - oL;
    if (ov <= 0) { finish(false); return; }
    var cut = moving.w - ov, perfect = cut < PERFECT;
    if (perfect) { perfects++; fbText = 'PERFECT!'; fbCol = C.b; fbTimer = 0.6; game.audio.play('se_success', 0.6); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: oL + ov / 2, y: BASE_Y - stack.length * BLOCK_H - cameraY, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: C.b }); } }
    else { fbText = '+' + Math.round(ov); fbCol = C.c; fbTimer = 0.4; game.audio.play('se_tap', 0.4); }
    layer++;
    var nw = perfect ? prev.w : ov, nx = perfect ? prev.x : oL;
    stack.push({ x: nx, w: nw, y: BASE_Y - stack.length * BLOCK_H, layer: layer });
    moving = { x: Math.random() < 0.5 ? -nw : W, w: nw, dir: Math.random() < 0.5 ? 1 : -1 };
    if (nw < START_W * 0.28) { finish(false); return; }
    if (layer >= 4) cameraY = (layer - 3) * BLOCK_H;
    if (layer >= NEEDED) { finish(true); return; }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    drop();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stack) initGame(); background();
      for (var i = 0; i < stack.length; i++) drawBlock(stack[i].x, stack[i].y, stack[i].w, BCOLS[stack[i].layer % 6], 0.9);
      drawBlock(moving.x, BASE_Y - stack.length * BLOCK_H, moving.w, BCOLS[(layer + 1) % 6], 0.8);
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SKYSCRAPER!' : 'TOPPLED', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
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
      moving.x += moving.dir * SWING * (1 + layer * 0.08) * dt;
      if (moving.x > W) { moving.x = W; moving.dir = -1; }
      if (moving.x + moving.w < 0) { moving.x = -moving.w; moving.dir = 1; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var bi = 0; bi < stack.length; bi++) { var y = stack[bi].y - cameraY; if (y > H + BLOCK_H || y < -BLOCK_H) continue; drawBlock(stack[bi].x, y, stack[bi].w, BCOLS[stack[bi].layer % 6], 0.9); }
    drawBlock(moving.x, stack[stack.length - 1].y - BLOCK_H - cameraY, moving.w, BCOLS[(layer + 1) % 6], 0.85);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.62), 52, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(layer + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
