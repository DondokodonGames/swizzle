// 170-turret-aim.js
// 回転砲台 — ゆっくり回る砲口が的を向いた瞬間に撃て、狙い待ちの緊張感
// 操作: タップで発射
// 成功: 1発命中  失敗: 5発外す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、射撃場） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TURRET AIM';
  var HOW_TO_PLAY = 'TAP TO FIRE WHEN AIMED AT ●';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED   = 1;              // 修正2: 8 → 1
  var MAX_MISS = 5;
  var TOP    = 220;
  var GUN_X = snap(W / 2), GUN_Y = snap(H * 0.76), GUN_R = 72, BARREL_LEN = 150;
  var BULLET_SPEED = 1100, BULLET_R = 16, TARGET_R = 60, TARGET_COUNT = 4;
  var GUN_SPEED = 1.0, MIN_ANG = -Math.PI * 0.9, MAX_ANG = -Math.PI * 0.1;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var gunAngle, gunDir, bullet, targets, spawnTimer, score, misses, timeLeft, done, feedback, feedbackOk, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#2a0a3a');
  }

  function background() { game.draw.clear(C.bg); }

  function drawTarget(t) {
    if (!t.alive) { if (t.hitTimer > 0) pc(t.x, t.y, TARGET_R, C.b, t.hitTimer); return; }
    pc(t.x, t.y, TARGET_R, C.a, 0.9);
    pc(t.x, t.y, TARGET_R * 0.6, C.g, 0.9);
    pc(t.x, t.y, 12, C.a, 1);
  }

  function drawGun() {
    // アーム
    for (var i = 0; i < 10; i++) game.draw.rect(snap(GUN_X + Math.cos(gunAngle) * (GUN_R + i * 8)) - 12, snap(GUN_Y + Math.sin(gunAngle) * (GUN_R + i * 8)) - 12, 24, 24, C.e);
    pc(GUN_X, GUN_Y, GUN_R, C.d, 1);
    pc(GUN_X, GUN_Y, GUN_R * 0.5, C.b, 0.7);
    game.draw.rect(GUN_X - 12, GUN_Y - 12, 24, 24, C.g);
  }

  function spawnTarget() {
    if (targets.length >= TARGET_COUNT) return;
    targets.push({ x: snap(TARGET_R + 60 + Math.random() * (W - (TARGET_R + 60) * 2)), y: snap(TOP + 40 + Math.random() * (H * 0.4)), vx: (Math.random() < 0.5 ? 1 : -1) * game.random(60, 160), alive: true, hitTimer: 0 });
  }

  function initGame() {
    gunAngle = -Math.PI / 2; gunDir = 1; bullet = null;
    targets = []; spawnTimer = 0; score = 0; misses = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0; particles = [];
    spawnTarget(); spawnTarget(); spawnTarget();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + Math.ceil(timeLeft) * 25) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || bullet) return;
    bullet = { x: GUN_X + Math.cos(gunAngle) * BARREL_LEN, y: GUN_Y + Math.sin(gunAngle) * BARREL_LEN, vx: Math.cos(gunAngle) * BULLET_SPEED, vy: Math.sin(gunAngle) * BULLET_SPEED };
    game.audio.play('se_tap', 0.8);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      gunAngle += GUN_SPEED * gunDir * dt; if (gunAngle > MAX_ANG) { gunAngle = MAX_ANG; gunDir = -1; } if (gunAngle < MIN_ANG) { gunAngle = MIN_ANG; gunDir = 1; }
      drawTarget({ x: W * 0.35, y: H * 0.35, alive: true }); drawTarget({ x: W * 0.7, y: H * 0.3, alive: true });
      drawGun();
      txt(GAME_TITLE, W / 2, H * 0.14, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DIRECT HIT!' : 'OUT OF SHOTS', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      gunAngle += GUN_SPEED * gunDir * dt; if (gunAngle > MAX_ANG) { gunAngle = MAX_ANG; gunDir = -1; } if (gunAngle < MIN_ANG) { gunAngle = MIN_ANG; gunDir = 1; }
      spawnTimer -= dt; if (spawnTimer <= 0 && targets.length < TARGET_COUNT) { spawnTimer = 0.8 + Math.random() * 0.5; spawnTarget(); }
      for (var ti = 0; ti < targets.length; ti++) {
        var t = targets[ti];
        if (!t.alive) { t.hitTimer -= dt; continue; }
        t.x += t.vx * dt;
        if (t.x < TARGET_R || t.x > W - TARGET_R) { t.vx *= -1; t.x = Math.max(TARGET_R, Math.min(W - TARGET_R, t.x)); }
      }
      targets = targets.filter(function(t) { return t.alive || t.hitTimer > 0; });
      if (bullet) {
        bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;
        for (var ti2 = 0; ti2 < targets.length; ti2++) {
          var t2 = targets[ti2];
          if (!t2.alive) continue;
          if (Math.hypot(bullet.x - t2.x, bullet.y - t2.y) < BULLET_R + TARGET_R) {
            t2.alive = false; t2.hitTimer = 0.5; score++;
            feedbackOk = true; feedback = 0.4;
            game.audio.play('se_success', 0.9);
            for (var pi = 0; pi < 10; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: t2.x, y: t2.y, vx: Math.cos(ang) * 240, vy: Math.sin(ang) * 240, life: 0.5 }); }
            bullet = null;
            if (score >= NEEDED) { finish(true); return; }
            break;
          }
        }
        if (bullet && (bullet.x < -20 || bullet.x > W + 20 || bullet.y < -20 || bullet.y > H + 20)) {
          bullet = null; misses++; feedbackOk = false; feedback = 0.35;
          game.audio.play('se_failure', 0.4);
          if (misses >= MAX_MISS) { finish(false); return; }
        }
      }
    }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 400 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    for (var ti3 = 0; ti3 < targets.length; ti3++) drawTarget(targets[ti3]);
    for (var gl = 0; gl < 6; gl++) game.draw.rect(snap(GUN_X + Math.cos(gunAngle) * (BARREL_LEN + gl * 90)) - 4, snap(GUN_Y + Math.sin(gunAngle) * (BARREL_LEN + gl * 90)) - 4, 8, 8, C.c, 0.4 * (1 - gl / 6));
    if (bullet) pc(bullet.x, bullet.y, BULLET_R, C.c, 1);
    drawGun();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) {
      var mx = snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56);
      game.draw.rect(mx - 12, 208, 24, 24, mm < misses ? C.a : '#2a0a3a');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
