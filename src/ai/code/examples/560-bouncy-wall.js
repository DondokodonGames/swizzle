// 560-bouncy-wall.js
// バウンシーウォール — 壁で跳ね返るボールをスワイプで投げ、上部のターゲットを撃ち抜く
// 操作: スワイプで投げる方向と強さを決める（タップした方向へも投げられる）壁で反射
// 成功: ターゲット 6個 破壊  失敗: ボール 5球 使い切る or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、反射台） ──
  var C = { bg:'#0a0814', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BOUNCY WALL';
  var HOW_TO_PLAY = 'SWIPE TO THROW THE BALL · IT BOUNCES OFF WALLS · HIT TARGETS';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_BALLS = 5;         // 修正2: 12 → 5
  var WT = 40, PLAY_X = 40, PLAY_Y = snap(H * 0.14), PLAY_W = W - 80, PLAY_H = snap(H * 0.70), BALL_R = 30, MAX_BOUNCES = 6;
  var SPAWN_X = W / 2, SPAWN_Y = snap(H * 0.14) + snap(H * 0.70) - 100;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ball, targets, broken, ballsUsed, timeLeft, done, particles, trail;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#151022');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, PLAY_Y, WT, PLAY_H, C.d, 0.7); game.draw.rect(W - WT, PLAY_Y, WT, PLAY_H, C.d, 0.7); game.draw.rect(PLAY_X, PLAY_Y, PLAY_W, WT / 2, C.d, 0.7);
    game.draw.rect(WT - 4, PLAY_Y, 4, PLAY_H, C.e, 0.5); game.draw.rect(W - WT, PLAY_Y, 4, PLAY_H, C.e, 0.5);
  }

  function spawnTargets() {
    targets = []; var cols = 5, rows = 3;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) if (Math.random() < 0.7) { var hp = Math.random() < 0.3 ? 2 : 1; targets.push({ x: PLAY_X + (c + 0.5) * PLAY_W / cols, y: PLAY_Y + (r + 0.5) * (PLAY_H * 0.42) / rows, r: 40, hp: hp }); }
    if (targets.length < 6) for (var i = targets.length; i < 6; i++) targets.push({ x: PLAY_X + Math.random() * PLAY_W, y: PLAY_Y + 60 + Math.random() * PLAY_H * 0.3, r: 40, hp: 1 });
  }

  function initGame() { ball = null; broken = 0; ballsUsed = 0; timeLeft = MAX_TIME; done = false; particles = []; trail = []; spawnTargets(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (broken * 500 + Math.ceil(timeLeft) * 100) : broken * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function launch(dx, dy, speed) { var len = Math.hypot(dx, dy); if (len < 1) return; ball = { x: SPAWN_X, y: SPAWN_Y, vx: dx / len * speed, vy: dy / len * speed, bounces: 0, r: BALL_R }; ballsUsed++; trail = []; game.audio.play('se_tap', 0.4); }

  function drawScene() {
    for (var ti = 0; ti < targets.length; ti++) { var t = targets[ti], col = t.hp > 1 ? C.c : C.b, pu = 1 + Math.sin(game.time.elapsed * 3 + ti * 0.5) * 0.06; pc(t.x, t.y, (t.r) * pu, col, 0.9); pc(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.25, C.g, 0.3); if (t.hp > 1) txt('2', t.x, t.y + 14, 36, C.bg); }
    for (var tri = 0; tri < trail.length; tri++) game.draw.rect(snap(trail[tri].x) - BALL_R * 0.3 * trail[tri].t, snap(trail[tri].y) - BALL_R * 0.3 * trail[tri].t, BALL_R * 0.6 * trail[tri].t, BALL_R * 0.6 * trail[tri].t, C.f, trail[tri].t * 0.5);
    if (ball) { pc(ball.x, ball.y, ball.r + 6, C.f, 0.2); pc(ball.x, ball.y, ball.r, C.f, 0.95); pc(ball.x - 8, ball.y - 8, ball.r * 0.35, C.g, 0.5); }
    else { pc(SPAWN_X, SPAWN_Y, BALL_R + 8, C.e, 0.2 + Math.sin(game.time.elapsed * 3) * 0.1); pc(SPAWN_X, SPAWN_Y, BALL_R, C.f, 0.7); txt('SWIPE TO THROW', SPAWN_X, SPAWN_Y + 80, 34, C.e); }
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || ball) return;
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); if (len < 30) return; launch(dx, dy, Math.min(len * 5, 1400));
  });

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || ball) return;
    launch(tx - SPAWN_X, ty - SPAWN_Y, 900);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.345, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.50, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.54, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL BROKEN!' : 'OUT OF BALLS', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (ball) {
        ball.x += ball.vx * dt; ball.y += ball.vy * dt; trail.push({ x: ball.x, y: ball.y, t: 0.35 }); if (trail.length > 30) trail.shift();
        if (ball.x - ball.r < PLAY_X) { ball.x = PLAY_X + ball.r; ball.vx = Math.abs(ball.vx) * 0.95; ball.bounces++; game.audio.play('se_tap', 0.3); }
        if (ball.x + ball.r > PLAY_X + PLAY_W) { ball.x = PLAY_X + PLAY_W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.95; ball.bounces++; game.audio.play('se_tap', 0.3); }
        if (ball.y - ball.r < PLAY_Y) { ball.y = PLAY_Y + ball.r; ball.vy = Math.abs(ball.vy) * 0.95; ball.bounces++; game.audio.play('se_tap', 0.3); }
        for (var ti = targets.length - 1; ti >= 0; ti--) {
          var t = targets[ti]; if (Math.hypot(ball.x - t.x, ball.y - t.y) < ball.r + t.r) {
            t.hp--; ball.vy = -Math.abs(ball.vy) * 0.85; ball.vx += (Math.random() - 0.5) * 200; game.audio.play('se_success', 0.6);
            for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.b }); }
            if (t.hp <= 0) { broken++; targets.splice(ti, 1); if (targets.length < 4) spawnTargets(); if (broken >= NEEDED) { finish(true); return; } }
            ball.bounces++;
          }
        }
        if (ball.y > PLAY_Y + PLAY_H + 60 || ball.bounces > MAX_BOUNCES) { ball = null; trail = []; if (ballsUsed >= MAX_BALLS) { finish(false); return; } }
      }
      for (var ti2 = trail.length - 1; ti2 >= 0; ti2--) { trail[ti2].t -= dt * 2.5; if (trail[ti2].t <= 0) trail.splice(ti2, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(broken + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var bi = 0; bi < MAX_BALLS; bi++) game.draw.rect(snap(W / 2 + (bi - (MAX_BALLS - 1) / 2) * 56) - 10, 224, 20, 20, bi < ballsUsed ? C.a : C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
