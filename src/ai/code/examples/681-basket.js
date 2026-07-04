// 681-basket.js
// バスケットキャッチ — タップした位置へ籠を横移動させ、落ちてくるボールを受け止める
// 操作: タップで籠がその真下へ移動。上から落ちるボールを籠でキャッチ。取りこぼし注意
// 成功: 10個 キャッチ  失敗: 3個 落球 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、コート） ──
  var C = { bg:'#040a1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BASKET CATCH';
  var HOW_TO_PLAY = 'TAP TO SLIDE THE BASKET UNDER THE FALLING BALLS · CATCH THEM ALL';
  var MAX_TIME = 18;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var BASKET_W = 240, BASKET_H = 64, BASKET_Y = snap(H * 0.80), SPAWN_RATE = 1.3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var basketX, targetX, balls, spawnTimer, caught, missed, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#060e1f');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBall() { balls.push({ x: 100 + Math.random() * (W - 200), y: -40, r: 40, speed: 380 + Math.random() * 220 + (MAX_TIME - timeLeft) * 8, caught: false, missed: false }); }

  function initGame() { basketX = W / 2; targetX = W / 2; balls = []; spawnTimer = 0; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, BASKET_Y + BASKET_H, W, H - BASKET_Y - BASKET_H, '#0a1628', 0.9);
    game.draw.rect(snap(basketX) - 1, 200, 2, BASKET_Y - 220, C.d, 0.15);
    for (var bi = 0; bi < balls.length; bi++) { var b = balls[bi]; pc(b.x, b.y, b.r, C.f, 0.9); pc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.22, C.c, 0.5); game.draw.line(b.x - b.r * 0.6, b.y, b.x + b.r * 0.6, b.y, '#7c2d12', 4); }
    var bx = basketX - BASKET_W / 2;
    game.draw.rect(snap(bx), BASKET_Y, BASKET_W, BASKET_H, C.f, 0.85); game.draw.rect(snap(bx), BASKET_Y, BASKET_W, 12, C.c, 0.5);
    game.draw.rect(snap(bx) - 8, BASKET_Y - 8, 16, 24, C.a, 0.9); game.draw.rect(snap(bx) + BASKET_W - 8, BASKET_Y - 8, 16, 24, C.a, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetX = Math.max(BASKET_W / 2 + 20, Math.min(W - BASKET_W / 2 - 20, tx)); game.audio.play('se_tap', 0.08);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SLAM DUNK!' : 'BUTTERFINGERS', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      basketX += (targetX - basketX) * Math.min(1, dt * 18);
      spawnTimer += dt; var rate = Math.max(0.7, SPAWN_RATE - (MAX_TIME - timeLeft) * 0.02); if (spawnTimer >= rate) { spawnTimer = 0; spawnBall(); }
      for (var i = balls.length - 1; i >= 0; i--) {
        var b = balls[i]; if (b.caught || b.missed) { balls.splice(i, 1); continue; }
        b.y += b.speed * dt;
        if (b.y + b.r >= BASKET_Y && b.y - b.r < BASKET_Y + BASKET_H && Math.abs(b.x - basketX) < BASKET_W / 2 - b.r * 0.5) {
          b.caught = true; caught++; flash = 0.25; flashCol = C.b; resultText = 'CATCH!'; resultTimer = 0.4; game.audio.play('se_success', 0.5);
          for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: BASKET_Y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160 - 80, life: 0.4, col: C.c }); }
          if (caught >= NEEDED) { finish(true); return; }
        }
        if (b.y > H + b.r) { b.missed = true; missed++; flash = 0.22; flashCol = C.a; resultText = 'DROPPED!'; resultTimer = 0.38; game.audio.play('se_failure', 0.2); if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 300 * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.63), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#060e1f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
