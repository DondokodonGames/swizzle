// 334-mirror-dodge.js
// ミラードッジ — 左半分の自機をスワイプで動かし、跳ね回るボールを避けて生き残る（右は鏡像世界）
// 操作: 4方向スワイプで自機を移動してボールを避ける
// 成功: 10秒生き残る  失敗: 3回当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、鏡界） ──
  var C = { bg:'#060010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR DODGE';
  var HOW_TO_PLAY = 'SWIPE TO MOVE · DODGE THE BALLS · SURVIVE';
  var NEEDED   = 10;         // 修正2: サバイバル 30s → 10s
  var MAX_HITS = 3;
  var HALF = snap(W / 2), PR = 28;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, py, balls, survived, hits, timeLeft, done, spawnTimer, particles, hitAnim, invin;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100820');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(HALF, 0, HALF, H, '#0a0020', 0.9);
    game.draw.rect(HALF - 2, 0, 4, H, C.d, 0.6);
    for (var ml = 0; ml < H; ml += 100) game.draw.rect(HALF - 4, snap(ml + 50) - 4, 8, 8, C.d, 0.6);
  }

  function spawnBall() { var side = Math.random() < 0.5 ? -1 : 1, spd = 180 + survived * 20; balls.push({ x: HALF * 0.5, y: snap(H * 0.2 + Math.random() * H * 0.6), vx: (Math.random() * spd + 60) * side, vy: (Math.random() - 0.5) * spd, r: 22 }); }

  function initGame() { px = snap(HALF * 0.4); py = snap(H * 0.5); balls = []; survived = 0; hits = 0; timeLeft = NEEDED; done = false; spawnTimer = 0.5; particles = []; hitAnim = 0; invin = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 300 + (MAX_HITS - hits) * 500) : Math.round(survived) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var bi = 0; bi < balls.length; bi++) { var b = balls[bi]; pc(b.x, b.y, b.r, C.a, 0.9); pc(W - b.x, b.y, b.r, C.f, 0.7); }
    var al = invin > 0 ? (Math.floor(game.time.elapsed * 16) % 2 ? 0.4 : 0.9) : 0.9;
    pc(px, py, PR, C.e, al); pc(px - 8, py - 8, 8, C.g, 0.6 * al);
    pc(W - px, py, PR, C.d, al * 0.85); pc(W - px + 8, py - 8, 8, C.g, 0.5 * al);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    var step = 140;
    if (d === 'left') px = Math.max(PR + 20, px - step);
    else if (d === 'right') px = Math.min(HALF - PR - 20, px + step);
    else if (d === 'up') py = Math.max(PR + 100, py - step);
    else if (d === 'down') py = Math.min(H - PR - 60, py + step);
    game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVOR!' : 'SHATTERED', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived = NEEDED - Math.max(0, timeLeft);
      if (timeLeft <= 0) { finish(true); return; }
      if (hitAnim > 0) hitAnim -= dt * 2; if (invin > 0) invin -= dt;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnBall(); spawnTimer = Math.max(0.35, 0.8 - survived * 0.04); }
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi]; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < b.r + 20) { b.x = b.r + 20; b.vx = Math.abs(b.vx); } if (b.x > HALF - b.r - 20) { b.x = HALF - b.r - 20; b.vx = -Math.abs(b.vx); }
        if (b.y < b.r + 100) { b.y = b.r + 100; b.vy = Math.abs(b.vy); } if (b.y > H - b.r - 60) { b.y = H - b.r - 60; b.vy = -Math.abs(b.vy); }
        if (invin <= 0 && Math.hypot(b.x - px, b.y - py) < PR + b.r) { hits++; hitAnim = 0.6; invin = 1.5; game.audio.play('se_failure', 0.5); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: px, y: py, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.c }); } if (hits >= MAX_HITS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    if (hitAnim > 0) game.draw.rect(0, 0, W, H, C.a, hitAnim * 0.2);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('SURVIVE ' + Math.floor(survived) + ' / ' + NEEDED + 's', W / 2, 168, 46, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#100820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
