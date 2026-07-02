// 236-pendulum-aim.js
// ペンデュラムエイム — 揺れる振り子の先端から、狙いを定めてタップで弾を放ち標的を撃つ
// 操作: タップした方向へ振り子先端から発射
// 成功: 3回ヒット  失敗: 5回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、射的場） ──
  var C = { bg:'#040a0f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PENDULUM AIM';
  var HOW_TO_PLAY = 'TAP TO FIRE FROM THE SWINGING BOB';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 10 → 3
  var MAX_MISS = 5;          // 修正2: 10 → 5
  var PIVOT_X = snap(W / 2), PIVOT_Y = snap(H * 0.14), ARM = 420, TARGET_LIFE = 2.5, TARGET_R = 60;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pendAngle, pendVel, target, targetTimer, bullets, hits, misses, timeLeft, done, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.15) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

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

  function bobPos() { return { x: PIVOT_X + Math.sin(pendAngle) * ARM, y: PIVOT_Y + Math.cos(pendAngle) * ARM }; }

  function spawnTarget() { target = { x: snap(game.random(100, W - 100)), y: snap(game.random(H * 0.45, H * 0.78)), r: TARGET_R }; targetTimer = TARGET_LIFE; }

  function drawArm() { var b = bobPos(); for (var r = 0; r < ARM; r += 16) game.draw.rect(snap(PIVOT_X + Math.sin(pendAngle) * r) - 3, snap(PIVOT_Y + Math.cos(pendAngle) * r) - 3, 6, 6, C.d, 0.8); pc(b.x, b.y, 30, C.e, 0.9); game.draw.rect(snap(b.x) - 4, snap(b.y) - 4, 8, 8, C.g); }

  function drawTarget() { if (targetTimer <= 0) return; ring(target.x, target.y, target.r, C.a, 0.7); pc(target.x, target.y, target.r * 0.6, C.a, 0.7); pc(target.x, target.y, target.r * 0.25, C.g, 0.9); }

  function initGame() { pendAngle = Math.PI / 4; pendVel = 0; bullets = []; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; spawnTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 400 + Math.ceil(timeLeft) * 50) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addMiss() { misses++; fbText = 'MISS'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) finish(false); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var b = bobPos(); bullets.push({ x: b.x, y: b.y, vx: (x - b.x) / 0.3, vy: (y - b.y) / 0.3, life: 0.4, r: 14 }); game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); pendAngle = Math.sin(game.time.elapsed * 2) * 0.6; drawArm(); target = { x: W * 0.7, y: H * 0.6, r: TARGET_R }; targetTimer = 1; drawTarget();
      txt(GAME_TITLE, W / 2, H * 0.86, 60, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.90, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) { txt('► 100円 投入 ◄', W / 2, H * 0.95, 56, C.a); txt('TAP TO START', W / 2, H * 0.99, 42, C.g); }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARPSHOOTER!' : 'MISSED OUT', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
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
      var acc = -(9.8 / ARM * 200) * Math.sin(pendAngle); pendVel += acc * dt; pendVel *= 0.999; pendAngle += pendVel * dt;
      targetTimer -= dt; if (targetTimer <= 0) { addMiss(); if (done) return; spawnTarget(); }
      for (var bi = bullets.length - 1; bi >= 0; bi--) {
        var b = bullets[bi]; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (targetTimer > 0 && Math.hypot(b.x - target.x, b.y - target.y) < target.r + b.r) {
          hits++; fbText = 'HIT!'; fbCol = C.b; fbTimer = 0.6; game.audio.play('se_success', 0.7);
          for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.5 }); }
          bullets.splice(bi, 1); if (hits >= NEEDED) { finish(true); return; } spawnTarget(); continue;
        }
        if (b.life <= 0) bullets.splice(bi, 1);
      }
      for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) { var p = particles[pi2]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi2, 1); }
    }

    // ---- 描画 ----
    background(); drawTarget(); drawArm();
    for (var bi2 = 0; bi2 < bullets.length; bi2++) pc(bullets[bi2].x, bullets[bi2].y, bullets[bi2].r, C.c, Math.min(1, bullets[bi2].life * 3));
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.86, 52, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 48) - 8, 224, 16, 16, mm < misses ? C.a : '#0a1420');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
