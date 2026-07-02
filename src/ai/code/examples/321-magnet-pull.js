// 321-magnet-pull.js
// マグネットプル — 画面をタップして磁力を発生させ、飛び交う金属ボールを中央のゴールへ引き寄せる
// 操作: タップした位置に磁力が働きボールを引き寄せる
// 成功: 3個ゴール  失敗: 3個落とす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、磁力研究所） ──
  var C = { bg:'#0a0f14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNET PULL';
  var HOW_TO_PLAY = 'TAP TO PULL THE METAL BALLS INTO THE GOAL';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_LOST = 3;          // 修正2: 5 → 3
  var GX = snap(W / 2), GY = snap(H * 0.72), GR = 64;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, magX, magY, magOn, magTimer, scored, lost, timeLeft, done, spawnTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1420');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBall() {
    var side = Math.floor(Math.random() * 3), bx, by, bvx, bvy, sp = 80 + Math.random() * 60;
    if (side === 0) { bx = snap(120 + Math.random() * (W - 240)); by = H * 0.22; bvx = (Math.random() - 0.5) * 80; bvy = sp; }
    else if (side === 1) { bx = 80; by = snap(H * 0.28 + Math.random() * H * 0.3); bvx = sp; bvy = (Math.random() - 0.5) * 80; }
    else { bx = W - 80; by = snap(H * 0.28 + Math.random() * H * 0.3); bvx = -sp; bvy = (Math.random() - 0.5) * 80; }
    balls.push({ x: bx, y: by, vx: bvx, vy: bvy, r: 26 });
  }

  function initGame() { balls = []; magX = -1; magY = -1; magOn = false; magTimer = 0; scored = 0; lost = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (scored * 500 + Math.ceil(timeLeft) * 100) : scored * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGoal() { ring(GX, GY, GR + 12 + 4 * (Math.floor(game.time.elapsed * 4) % 2), C.b, 0.5); ring(GX, GY, GR, C.b, 0.8); pc(GX, GY, GR - 24, C.b, 0.3); txt('GOAL', GX, GY + 12, 34, C.g); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    magX = x; magY = y; magOn = true; magTimer = 0.4; game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawGoal();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
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
      txt(resultSuccess ? 'MAGNETIZED!' : 'DROPPED', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (magTimer > 0) { magTimer -= dt; if (magTimer <= 0) magOn = false; }
      spawnTimer -= dt; if (spawnTimer <= 0 && balls.length < 4) { spawnBall(); spawnTimer = 1.1 - Math.min(0.5, scored * 0.1); }
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi];
        if (magOn) { var dx = magX - b.x, dy = magY - b.y, dist = Math.max(1, Math.hypot(dx, dy)); if (dist < 420) { var force = 1300 / (dist + 50); b.vx += dx / dist * force * dt; b.vy += dy / dist * force * dt; } }
        b.vy += 120 * dt;
        var spd = Math.hypot(b.vx, b.vy); if (spd > 600) { b.vx = b.vx / spd * 600; b.vy = b.vy / spd * 600; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.7; } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.7; }
        if (b.y < H * 0.2) { b.y = H * 0.2; b.vy = Math.abs(b.vy) * 0.7; }
        if (Math.hypot(b.x - GX, b.y - GY) < GR + b.r) { scored++; game.audio.play('se_success', 0.5); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); } balls.splice(bi, 1); if (scored >= NEEDED) { finish(true); return; } continue; }
        if (b.y > H * 0.92) { lost++; game.audio.play('se_failure', 0.2); balls.splice(bi, 1); if (lost >= MAX_LOST) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGoal();
    for (var bi2 = 0; bi2 < balls.length; bi2++) { pc(balls[bi2].x, balls[bi2].y, balls[bi2].r, C.e, 0.9); pc(balls[bi2].x - 6, balls[bi2].y - 6, 6, C.g, 0.7); }
    if (magOn) { ring(magX, magY, 50, C.a, 0.5); pc(magX, magY, 28, C.a, 0.8); txt('N', magX, magY + 10, 30, C.g); }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(scored + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_LOST; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_LOST - 1) / 2) * 56) - 10, 224, 20, 20, mi < lost ? C.a : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
