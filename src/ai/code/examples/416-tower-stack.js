// 416-tower-stack.js
// タワー積み — 左右に流れるブロックをタップで落とし、下の段に揃えて積み上げる
// 操作: タップでブロックを落とす（はみ出した分は削れる）
// 成功: 3段 積む  失敗: 3回 大きく外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜景ビル） ──
  var C = { bg:'#0a0614', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BLOCK = [C.a, C.f, C.c, C.b, C.e, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TOWER STACK';
  var HOW_TO_PLAY = 'TAP TO DROP THE BLOCK · LINE IT UP WITH THE ONE BELOW';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 15 → 3
  var MAX_FELL = 3;
  var BLOCK_H = 90, BASE_W = 360, BASE_Y = snap(H * 0.74);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var blocks, moving, stacked, fell, timeLeft, done, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#181030');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, BASE_Y + BLOCK_H, W, H, '#120e20', 0.8); }

  function topBlock() { return blocks[blocks.length - 1]; }

  function nextMoving() { var top = topBlock(); moving = { x: Math.random() < 0.5 ? -60 : W + 60, w: top.w, vx: (Math.random() < 0.5 ? 1 : -1) * (280 + Math.min(stacked * 20, 200)), col: BLOCK[stacked % BLOCK.length] }; }

  function initGame() { blocks = [{ x: W / 2, w: BASE_W, col: BLOCK[0] }]; stacked = 0; fell = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.c; nextMoving(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (stacked * 700 + Math.ceil(timeLeft) * 100) : stacked * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function blockY(i) { return BASE_Y - i * BLOCK_H; }

  function drawTower() {
    for (var bi = 0; bi < blocks.length; bi++) { var b = blocks[bi], y = blockY(bi); game.draw.rect(snap(b.x - b.w / 2), y, snap(b.w), BLOCK_H, b.col, 0.9); game.draw.rect(snap(b.x - b.w / 2) + 8, y + 8, snap(b.w / 3), BLOCK_H / 3, C.g, 0.2); }
    var my = blockY(blocks.length); game.draw.rect(snap(moving.x - moving.w / 2), my, snap(moving.w), BLOCK_H, moving.col, 0.9); game.draw.rect(snap(moving.x - moving.w / 2) + 8, my + 8, snap(moving.w / 3), BLOCK_H / 3, C.g, 0.2);
    var top = topBlock(); game.draw.rect(snap(top.x - top.w / 2), my, 2, BLOCK_H, C.g, 0.4); game.draw.rect(snap(top.x + top.w / 2), my, 2, BLOCK_H, C.g, 0.4);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var top = topBlock(), my = blockY(blocks.length);
    var oL = Math.max(top.x - top.w / 2, moving.x - moving.w / 2), oR = Math.min(top.x + top.w / 2, moving.x + moving.w / 2), ov = oR - oL;
    if (ov <= 0 || ov < BASE_W * 0.18) { fell++; game.audio.play('se_failure', 0.5); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: moving.x, y: my, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200 - 100, life: 0.6, col: moving.col }); } if (fell >= MAX_FELL) { finish(false); return; } nextMoving(); return; }
    var nx = (oL + oR) / 2, nw = ov;
    if (Math.abs(nx - top.x) < 10 && Math.abs(nw - top.w) < 10) { nx = top.x; nw = top.w; flash = 0.5; flashCol = C.c; game.audio.play('se_success', 0.6); for (var k2 = 0; k2 < 8; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: nx, y: my, vx: Math.cos(a2) * 160, vy: Math.sin(a2) * 160, life: 0.6, col: C.c }); } }
    else game.audio.play('se_tap', 0.4);
    blocks.push({ x: nx, w: nw, col: moving.col }); stacked++;
    if (stacked >= NEEDED) { finish(true); return; }
    nextMoving();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!blocks) initGame(); background(); drawTower();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TALL TOWER!' : 'TOPPLED', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      moving.x += moving.vx * dt;
      if (moving.x > W + moving.w / 2 + 20) moving.vx = -Math.abs(moving.vx); if (moving.x < -moving.w / 2 - 20) moving.vx = Math.abs(moving.vx);
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTower();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(stacked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FELL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FELL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fell ? C.a : '#181030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
