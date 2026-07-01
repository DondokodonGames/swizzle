// 162-ricochet-shot.js
// 壁当てスナイパー — 反射角を計算して壁越しに的を狙い撃つ頭脳戦
// 操作: タップで射角を指定して発射
// 成功: 1発命中  失敗: 8発撃ち尽くす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、射撃レンジ） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RICOCHET SHOT';
  var HOW_TO_PLAY = 'TAP TO AIM · BANK OFF WALLS TO HIT ●';
  var MAX_TIME = 15;             // 修正2: 45 → 15
  var NEEDED   = 1;              // 修正2: 6 → 1
  var MAX_AMMO = 8;              // 修正2: 10 → 8
  var PX = snap(80), PY = snap(H * 0.14), PW = snap(W - 160), PH = snap(H * 0.62);
  var GUN_X = PX + PW / 2, GUN_Y = PY + PH - 60;
  var BULLET_R = 14, BULLET_SPEED = 850, TARGET_R = 48;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bullet, targetX, targetY, aimAngle, score, ammo, timeLeft, done, feedback, feedbackOk, particles, trail;

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

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(PX, PY, PW, PH, '#0a0018', 0.9);
    game.draw.rect(PX, PY, PW, 16, C.e);
    game.draw.rect(PX, PY, 16, PH, C.e);
    game.draw.rect(PX + PW - 16, PY, 16, PH, C.e);
  }

  function drawTarget() {
    pc(targetX, targetY, TARGET_R, C.a, 1);
    pc(targetX, targetY, TARGET_R * 0.6, C.g, 0.9);
    pc(targetX, targetY, TARGET_R * 0.25, C.a, 1);
  }

  function drawGun() {
    for (var t = 0; t < 8; t++) game.draw.rect(snap(GUN_X + Math.cos(aimAngle) * (t * 10)) - 8, snap(GUN_Y + Math.sin(aimAngle) * (t * 10)) - 8, 16, 16, C.c);
    pc(GUN_X, GUN_Y, 30, C.d, 1);
    game.draw.rect(GUN_X - 10, GUN_Y - 10, 20, 20, C.g);
  }

  function placeTarget() {
    targetX = snap(PX + TARGET_R + 40 + Math.random() * (PW - (TARGET_R + 40) * 2));
    targetY = snap(PY + TARGET_R + 30 + Math.random() * (PH * 0.4));
  }

  function initGame() {
    bullet = null; aimAngle = -Math.PI / 2; score = 0; ammo = MAX_AMMO;
    timeLeft = MAX_TIME; done = false; feedback = 0; particles = []; trail = [];
    placeTarget();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 300 + ammo * 40 + Math.ceil(timeLeft) * 20) : score * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || bullet) return;
    aimAngle = Math.atan2(y - GUN_Y, x - GUN_X);
    bullet = { x: GUN_X, y: GUN_Y, vx: Math.cos(aimAngle) * BULLET_SPEED, vy: Math.sin(aimAngle) * BULLET_SPEED, bounces: 0 };
    trail = []; ammo--;
    game.audio.play('se_tap', 0.7);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawTarget(); drawGun();
      txt(GAME_TITLE, W / 2, H * 0.05, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.82, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 48, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BANK SHOT!' : 'OUT OF AMMO', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done && bullet) {
      trail.push({ x: bullet.x, y: bullet.y, life: 0.3 });
      bullet.x += bullet.vx * dt; bullet.y += bullet.vy * dt;
      if (bullet.x < PX + BULLET_R) { bullet.x = PX + BULLET_R; bullet.vx = Math.abs(bullet.vx); bullet.bounces++; game.audio.play('se_tap', 0.2); }
      if (bullet.x > PX + PW - BULLET_R) { bullet.x = PX + PW - BULLET_R; bullet.vx = -Math.abs(bullet.vx); bullet.bounces++; game.audio.play('se_tap', 0.2); }
      if (bullet.y < PY + BULLET_R) { bullet.y = PY + BULLET_R; bullet.vy = Math.abs(bullet.vy); bullet.bounces++; game.audio.play('se_tap', 0.2); }
      if (bullet.bounces > 6 || bullet.y > PY + PH + 20) {
        bullet = null; trail = []; feedbackOk = false; feedback = 0.3;
        if (ammo <= 0) { finish(false); return; }
      } else if (Math.hypot(bullet.x - targetX, bullet.y - targetY) < BULLET_R + TARGET_R) {
        score++; feedbackOk = true; feedback = 0.5;
        game.audio.play('se_success', 0.9);
        for (var pi = 0; pi < 14; pi++) { var ang = Math.random() * Math.PI * 2; particles.push({ x: targetX, y: targetY, vx: Math.cos(ang) * 280, vy: Math.sin(ang) * 280, life: 0.5 }); }
        bullet = null; trail = [];
        if (score >= NEEDED) { finish(true); return; }
        placeTarget();
      }
    }
    if (!done) { timeLeft -= dt; if (timeLeft <= 0) { finish(false); return; } }
    for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt * 2; if (trail[ti].life <= 0) trail.splice(ti, 1); }
    for (var p = 0; p < particles.length; p++) { particles[p].x += particles[p].vx * dt; particles[p].y += particles[p].vy * dt; particles[p].vy += 400 * dt; particles[p].life -= dt; }
    particles = particles.filter(function(pt) { return pt.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- 描画 ----
    background();
    if (!bullet) { for (var gi = 1; gi <= 8; gi++) game.draw.rect(snap(GUN_X + Math.cos(aimAngle) * gi * 24) - 4, snap(GUN_Y + Math.sin(aimAngle) * gi * 24) - 4, 8, 8, C.c, 0.5); }
    drawTarget();
    for (var ti2 = 0; ti2 < trail.length; ti2++) game.draw.rect(snap(trail[ti2].x) - 4, snap(trail[ti2].y) - 4, 8, 8, C.c, trail[ti2].life * 2);
    if (bullet) pc(bullet.x, bullet.y, BULLET_R, C.c, 1);
    drawGun();
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.b : C.a, feedback * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 44, C.b);
    txt('AMMO ' + ammo, W / 2, H - 110, 44, ammo < 3 ? C.a : C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
