// 211-mirror-dodge.js
// ミラードッジ — 左右が反転する鏡の部屋で、逆さ操作を頼りに飛来する弾を避け抜く脳トレ
// 操作: タップで移動（左右が逆転）
// 成功: 6秒生き残る  失敗: 弾に当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、鏡の間） ──
  var C = { bg:'#060408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR DODGE';
  var HOW_TO_PLAY = 'TAP TO MOVE · LEFT AND RIGHT ARE FLIPPED';
  var NEEDED   = 6;            // 修正2: 20 → 6（サバイバル短縮）
  var TOP = 220, BOTTOM = H - 180;
  var PLAYER_R = 40, PLAYER_SPEED = 640;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var px, py, pvx, pvy, targetX, targetY, balls, survived, timeLeft, done, trail;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.35) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var y = TOP; y < BOTTOM; y += 16) game.draw.rect(W / 2 - 2, y, 4, 8, C.e, 0.25);
  }

  function drawPlayer() { pc(px, py, PLAYER_R, C.b, 0.95); game.draw.rect(snap(px) - 14, snap(py) - 10, 10, 12, C.bg); game.draw.rect(snap(px) + 4, snap(py) - 10, 10, 12, C.bg); }

  function drawBall(b) { pc(b.x, b.y, b.r, C.a, 0.9); game.draw.rect(snap(b.x) - 10, snap(b.y) - 10, 8, 8, C.g, 0.5); }

  function spawnBall() {
    var side = Math.floor(Math.random() * 4), speed = 320 + survived * 24, bx, by, bvx, bvy;
    if (side === 0) { bx = game.random(0, W); by = TOP - 20; bvx = game.random(-150, 150); bvy = speed; }
    else if (side === 1) { bx = game.random(0, W); by = BOTTOM + 20; bvx = game.random(-150, 150); bvy = -speed; }
    else if (side === 2) { bx = -20; by = game.random(TOP, BOTTOM); bvx = speed; bvy = game.random(-150, 150); }
    else { bx = W + 20; by = game.random(TOP, BOTTOM); bvx = -speed; bvy = game.random(-150, 150); }
    balls.push({ x: bx, y: by, vx: bvx, vy: bvy, r: 28 });
  }

  function initGame() { px = snap(W / 2); py = snap(H * 0.72); pvx = 0; pvy = 0; targetX = px; targetY = py; balls = []; survived = 0; timeLeft = NEEDED; done = false; trail = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(survived) * 120) : Math.round(survived * 150);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetX = W - x;  // 左右反転
    targetY = Math.max(TOP + PLAYER_R, Math.min(BOTTOM - PLAYER_R, y));
    game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawBall({ x: W * 0.3, y: H * 0.4, r: 28 }); drawBall({ x: W * 0.7, y: H * 0.5, r: 28 });
      drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.90, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.96, 40, '#554466');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'HIT', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      survived += dt; timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      var dx = targetX - px, dy = targetY - py, dist = Math.hypot(dx, dy);
      if (dist > 8) { pvx = dx / dist * PLAYER_SPEED; pvy = dy / dist * PLAYER_SPEED; } else { pvx *= 0.8; pvy *= 0.8; }
      px += pvx * dt; py += pvy * dt;
      px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, px));
      py = Math.max(TOP + PLAYER_R, Math.min(BOTTOM - PLAYER_R, py));
      if (Math.random() < dt * (1.5 + survived / 6)) spawnBall();
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi]; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < -60 || b.x > W + 60 || b.y < TOP - 60 || b.y > BOTTOM + 60) { balls.splice(bi, 1); continue; }
        if (Math.hypot(px - b.x, py - b.y) < PLAYER_R + b.r) { finish(false); return; }
      }
      trail.push({ x: px, y: py, life: 0.3 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
    }

    // ---- 描画 ----
    background();
    for (var t2 = 0; t2 < trail.length; t2++) game.draw.rect(snap(trail[t2].x) - 6, snap(trail[t2].y) - 6, 12, 12, C.b, trail[t2].life * 0.5);
    ring(targetX, targetY, 28, C.c, 0.3 + 0.2 * (Math.floor(game.time.elapsed * 6) % 2));
    for (var bi2 = 0; bi2 < balls.length; bi2++) drawBall(balls[bi2]);
    drawPlayer();

    timeBar();
    txt(timeLeft.toFixed(1) + 's', W / 2, 96, 44, C.g);
    txt('CONTROLS ARE MIRRORED', W / 2, H - 100, 38, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
