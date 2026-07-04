// 614-drop-zone.js
// ドロップゾーン — 上から降るボールを、左右スワイプ/タップで動かすバケツで受け止める
// 操作: 画面タップした位置へバケツが移動。左右スワイプでも寄せられる。取りこぼし注意
// 成功: 10個 キャッチ  失敗: 3個 落球 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、落下受け） ──
  var C = { bg:'#0a0a14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALL_COLORS = [C.c, C.a, C.b, C.e];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'DROP ZONE';
  var HOW_TO_PLAY = 'TAP TO MOVE THE BUCKET UNDER THE FALLING BALLS · CATCH THEM ALL';
  var MAX_TIME = 18;
  var NEEDED   = 10;         // 修正2: 20 → 10
  var MAX_DROP = 3;          // 修正2: 8 → 3
  var BUCKET_W = 220, BUCKET_H = 84, BUCKET_Y = snap(H * 0.84), BALL_R = 36;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bucketX, targetX, balls, caught, dropped, timeLeft, done, particles, flash, flashCol, spawnTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#1a1028');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBall() { var x = BALL_R * 2 + Math.random() * (W - BALL_R * 4), speed = 280 + Math.random() * 160 + (MAX_TIME - timeLeft) * 6; balls.push({ x: x, y: -BALL_R, vy: speed, vx: (Math.random() - 0.5) * 100, r: BALL_R, col: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)], phase: Math.random() * Math.PI * 2 }); }

  function initGame() { bucketX = W / 2; targetX = W / 2; balls = []; caught = 0; dropped = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; spawnTimer = 0; spawnBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var bi = 0; bi < balls.length; bi++) { var b = balls[bi], wob = 1 + Math.sin(b.phase) * 0.05; pc(b.x, b.y, b.r * wob, b.col, 0.9); pc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.2, C.g, 0.5); }
    var bx = bucketX - BUCKET_W / 2;
    game.draw.rect(snap(bx), BUCKET_Y, BUCKET_W, BUCKET_H, C.d, 0.9);
    game.draw.rect(snap(bx), BUCKET_Y, BUCKET_W, 12, C.e, 0.7);
    game.draw.rect(snap(bx) + 12, BUCKET_Y + 16, 20, BUCKET_H - 24, C.g, 0.2);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') targetX = Math.max(BUCKET_W / 2, targetX - 180); else if (dir === 'right') targetX = Math.min(W - BUCKET_W / 2, targetX + 180);
    game.audio.play('se_tap', 0.1);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetX = Math.max(BUCKET_W / 2, Math.min(W - BUCKET_W / 2, tx)); game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.64, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'NICE CATCH!' : 'BUTTERFINGERS', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      bucketX += (targetX - bucketX) * Math.min(1, dt * 10);
      spawnTimer += dt; var rate = Math.max(0.6, 1.4 - (MAX_TIME - timeLeft) * 0.03);
      if (spawnTimer > rate) { spawnTimer = 0; spawnBall(); if (timeLeft < MAX_TIME - 8 && Math.random() < 0.35) spawnBall(); }
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi]; b.vy += 400 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.phase += dt * 3;
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y + b.r >= BUCKET_Y && b.y - b.r <= BUCKET_Y + BUCKET_H && b.x >= bucketX - BUCKET_W / 2 && b.x <= bucketX + BUCKET_W / 2) {
          caught++; flash = 0.2; flashCol = C.b; game.audio.play('se_success', 0.5);
          for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: BUCKET_Y, vx: Math.cos(a) * 150, vy: -Math.abs(Math.sin(a)) * 250, life: 0.5, col: b.col }); }
          balls.splice(bi, 1); if (caught >= NEEDED) { finish(true); return; } continue;
        }
        if (b.y - b.r > H) { dropped++; balls.splice(bi, 1); flash = 0.2; flashCol = C.a; game.audio.play('se_failure', 0.2); if (dropped >= MAX_DROP) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 400 * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DROP; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DROP - 1) / 2) * 56) - 10, 224, 20, 20, di < dropped ? C.a : '#1a1028');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
