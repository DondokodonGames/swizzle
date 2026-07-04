// 640-bounce-mad.js
// バウンスマッド — 壁で跳ね回るボールを、タップで動かすバケツで下段で受け止める
// 操作: タップした位置へバケツが移動。壁反射で予測しづらいボールをキャッチ
// 成功: 12個 キャッチ  失敗: 3個 落球 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、跳弾室） ──
  var C = { bg:'#03040a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BOUNCE MAD';
  var HOW_TO_PLAY = 'TAP TO MOVE THE BUCKET · CATCH THE WILDLY BOUNCING BALLS BELOW';
  var MAX_TIME = 18;
  var NEEDED   = 12;         // 修正2: 25 → 12
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var BUCKET_W = 240, BUCKET_H = 84, BUCKET_Y = snap(H * 0.84);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bucketX, targetX, balls, caught, missed, timeLeft, done, spawnTimer, particles, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#05070f');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBall() { var speed = 480 + (MAX_TIME - timeLeft) * 8 + Math.random() * 150, angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6; balls.push({ x: 100 + Math.random() * (W - 200), y: H * 0.18, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 36, trail: [] }); }

  function initGame() { bucketX = W / 2; targetX = W / 2; balls = []; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0; particles = []; flash = 0; flashCol = C.b; spawnBall(); spawnBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, H * 0.14, 12, H * 0.72, '#1e293b', 0.6); game.draw.rect(W - 12, H * 0.14, 12, H * 0.72, '#1e293b', 0.6); game.draw.rect(0, H * 0.14, W, 12, '#334155', 0.3);
    for (var bi = 0; bi < balls.length; bi++) {
      var b = balls[bi];
      for (var ti = 0; ti < b.trail.length; ti++) { var t = b.trail[ti]; pc(t.x, t.y, b.r * (ti / b.trail.length) * 0.6, C.f, (ti / b.trail.length) * 0.3); }
      pc(b.x, b.y, b.r, C.f, 0.9); pc(b.x - 12, b.y - 12, b.r * 0.3, C.c, 0.6);
    }
    var bx = bucketX - BUCKET_W / 2;
    game.draw.rect(snap(bx), BUCKET_Y, BUCKET_W, BUCKET_H, C.d, 0.9); game.draw.rect(snap(bx), BUCKET_Y, BUCKET_W, 14, C.e, 0.6); game.draw.rect(snap(bx) + 12, BUCKET_Y + 16, 20, BUCKET_H - 24, C.g, 0.15);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetX = Math.max(BUCKET_W / 2 + 20, Math.min(W - BUCKET_W / 2 - 20, tx)); game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.06, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.10, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.955, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL CAUGHT!' : 'BUTTERFINGERS', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      bucketX += (targetX - bucketX) * Math.min(1, dt * 12);
      spawnTimer += dt; var rate = Math.max(0.5, 1.4 - (MAX_TIME - timeLeft) * 0.03);
      if (spawnTimer >= rate) { spawnTimer = 0; spawnBall(); }
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi]; b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 8) b.trail.shift();
        b.vy += 600 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y - b.r < H * 0.14) { b.y = H * 0.14 + b.r; b.vy = Math.abs(b.vy) * 0.85; }
        if (b.y + b.r >= BUCKET_Y && b.y - b.r <= BUCKET_Y + BUCKET_H && b.x >= bucketX - BUCKET_W / 2 && b.x <= bucketX + BUCKET_W / 2) {
          caught++; flash = 0.15; flashCol = C.b; game.audio.play('se_success', 0.5);
          for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: BUCKET_Y, vx: Math.cos(pa) * 150, vy: -Math.abs(Math.sin(pa)) * 200, life: 0.4, col: C.c }); }
          balls.splice(bi, 1); if (caught >= NEEDED) { finish(true); return; } continue;
        }
        if (b.y > H + 60) { missed++; balls.splice(bi, 1); flash = 0.2; flashCol = C.a; game.audio.play('se_failure', 0.2); if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 400 * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#05070f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
