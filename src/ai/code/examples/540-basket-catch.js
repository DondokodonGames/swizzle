// 540-basket-catch.js
// バスケットキャッチ — 落ちてくるボールを、左右に動くバスケットで受け止める
// 操作: 左右スワイプでバスケットを動かす（タップした位置へも寄せられる）紫は2点
// 成功: 8個 キャッチ  失敗: 3個 落球 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、屋台のかご） ──
  var C = { bg:'#0a0408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BASKET CATCH';
  var HOW_TO_PLAY = 'SWIPE TO MOVE THE BASKET · CATCH FALLING BALLS · PURPLE = 2PT';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 25 → 8
  var MAX_DROP = 3;          // 修正2: 10 → 3
  var BASKET_Y = snap(H * 0.82), BASKET_W = 240, BASKET_H = 60;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var basketX, basketVX, balls, caught, dropped, timeLeft, done, particles, flash, flashCol, nextBall, catchAnim;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a0a12');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, H, '#12060e', 0.5); }

  function spawnBall() {
    var sp = Math.random() < 0.2;
    balls.push({ x: 80 + Math.random() * (W - 160), y: -30, vy: 300 + Math.random() * 160 + caught * 6, vx: (Math.random() - 0.5) * 60, r: sp ? 40 : 32, col: sp ? C.d : C.f, special: sp });
  }

  function initGame() { basketX = W / 2; basketVX = 0; balls = []; caught = 0; dropped = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; nextBall = 0.6; catchAnim = 0; spawnBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var bi = 0; bi < balls.length; bi++) { var b = balls[bi]; pc(b.x, b.y, b.r + 4, b.col, 0.15); pc(b.x, b.y, b.r, b.col, 0.9); pc(b.x, b.y - b.r * 0.3, b.r * 0.15, C.g, 0.5); if (b.special) pc(b.x, b.y, b.r + 10 + Math.sin(game.time.elapsed * 5) * 4, b.col, 0.2); }
    var bw = BASKET_W * (1 + catchAnim * 0.15), bxs = basketX - bw / 2;
    game.draw.rect(bxs, BASKET_Y, 12, BASKET_H, C.f, 0.9);
    game.draw.rect(bxs + bw - 12, BASKET_Y, 12, BASKET_H, C.f, 0.9);
    game.draw.rect(bxs, BASKET_Y + BASKET_H - 12, bw, 12, C.f, 0.9);
    game.draw.rect(bxs, BASKET_Y, bw, 8, C.c, 0.7);
    for (var ni = 1; ni < 5; ni++) game.draw.rect(bxs + bw * ni / 5, BASKET_Y, 3, BASKET_H, C.c, 0.4);
  }

  // ── 入力 ──
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') basketVX -= 600; if (dir === 'right') basketVX += 600;
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    basketVX += (tx - basketX) * 1.5; game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.24, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.285, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.54, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'NICE CATCH!' : 'DROPPED OUT', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (catchAnim > 0) catchAnim -= dt * 3;
      basketX += basketVX * dt; basketVX *= Math.pow(0.1, dt); basketX = Math.max(BASKET_W / 2 + 20, Math.min(W - BASKET_W / 2 - 20, basketX));
      nextBall -= dt; if (nextBall <= 0) { spawnBall(); nextBall = Math.max(0.5, 0.9 - caught * 0.02); }
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi]; b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 200 * dt; b.vx *= 0.99;
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y + b.r >= BASKET_Y && b.y - b.r < BASKET_Y + BASKET_H && Math.abs(b.x - basketX) < BASKET_W / 2 + b.r * 0.5) {
          caught += b.special ? 2 : 1; catchAnim = 0.4; flash = 0.25; flashCol = C.b; game.audio.play('se_success', b.special ? 0.8 : 0.5);
          for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: BASKET_Y, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 - 100, life: 0.4, col: b.col }); }
          balls.splice(bi, 1); if (caught >= NEEDED) { finish(true); return; } continue;
        }
        if (b.y > H + 40) { dropped++; balls.splice(bi, 1); flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.3); if (dropped >= MAX_DROP) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DROP; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DROP - 1) / 2) * 56) - 10, 224, 20, 20, di < dropped ? C.a : '#1a0a12');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
