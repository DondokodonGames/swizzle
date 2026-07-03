// 550-spring-jump.js
// スプリングジャンプ — バネの溜めを調整してボールを打ち上げ、光るプラットフォームに着地させる
// 操作: タップで溜め開始→もう一度タップで発射（溜め時間で高さ、狙いは自動で次の足場へ）
// 成功: 6回 着地  失敗: 3回 落下 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、パチンコ台） ──
  var C = { bg:'#0a0818', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPRING JUMP';
  var HOW_TO_PLAY = 'TAP TO CHARGE THE SPRING · TAP AGAIN TO LAUNCH ONTO THE PLATFORM';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_FALLS = 3;         // 修正2: 5 → 3
  var SPRING_X = W / 2, SPRING_Y = snap(H * 0.86), SPRING_BASE_H = 80, SPRING_W = 160, BALL_R = 36, PLAT_W = 240, PLAT_H = 28;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ball, springComp, pressing, pressTime, platforms, landed, falls, timeLeft, done, particles, trail, flash, landAnim, nextPlatX;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color) { cx = snap(cx); cy = snap(cy); for (var a = 0; a < 5; a++) { var ang = -Math.PI / 2 + a * Math.PI * 2 / 5; pc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, r * 0.3, color, 0.95); } pc(cx, cy, r * 0.4, color, 0.95); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a0828');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, H * 0.5, W, H * 0.5, '#1a0828', 0.4); }

  function spawnPlatform() { nextPlatX = W * 0.15 + Math.random() * W * 0.7; platforms.push({ x: nextPlatX, y: snap(H * 0.28 + Math.random() * H * 0.32), w: PLAT_W, landed: false }); if (platforms.length > 4) platforms.shift(); }

  function initGame() { ball = { x: SPRING_X, y: SPRING_Y - SPRING_BASE_H - BALL_R, vy: 0, vx: 0, inAir: false }; springComp = 0; pressing = false; pressTime = 0; platforms = []; landed = 0; falls = 0; timeLeft = MAX_TIME; done = false; particles = []; trail = []; flash = 0; landAnim = 0; nextPlatX = W / 2; spawnPlatform(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (landed * 700 + Math.ceil(timeLeft) * 100) : landed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var pi = 0; pi < platforms.length; pi++) { var pl = platforms[pi], isT = pi === platforms.length - 1 && !pl.landed, col = pl.landed ? C.b : isT ? C.e : C.d, pu = isT ? 1 + Math.sin(game.time.elapsed * 4) * 0.06 : 1; game.draw.rect(pl.x - pl.w / 2 * pu, pl.y - 4, pl.w * pu, 8, col, 0.3); game.draw.rect(pl.x - pl.w / 2 * pu, pl.y, pl.w * pu, PLAT_H, col, 0.9); if (isT) star(pl.x, pl.y - 48, 26, C.c); }
    var compH = SPRING_BASE_H * (1 - springComp * 0.7);
    game.draw.rect(SPRING_X - SPRING_W / 2 + 8, SPRING_Y + 4, SPRING_W - 16, 16, C.f, 0.9);
    for (var zi = 0; zi < 5; zi++) { var zy = SPRING_Y - compH + zi * compH / 5, zx = SPRING_X + (zi % 2 === 0 ? 1 : -1) * 30; game.draw.line(SPRING_X, SPRING_Y - compH + (zi - 1) * compH / 5, zx, zy, C.f, 8); }
    game.draw.rect(SPRING_X - SPRING_W * 0.3, SPRING_Y - compH - 8, SPRING_W * 0.6, 16, C.c, 0.9);
    if (pressing) { var pwr = Math.min(pressTime / 0.6, 1); game.draw.rect(SPRING_X - 80, SPRING_Y + 40, 160, 20, '#1a0828', 0.6); game.draw.rect(SPRING_X - 80, SPRING_Y + 40, 160 * pwr, 20, pwr > 0.7 ? C.a : C.f, 0.9); txt('POWER', SPRING_X, SPRING_Y + 84, 32, C.f); }
    for (var ti = 0; ti < trail.length; ti++) game.draw.rect(snap(trail[ti].x) - BALL_R * 0.3 * trail[ti].t, snap(trail[ti].y) - BALL_R * 0.3 * trail[ti].t, BALL_R * 0.6 * trail[ti].t, BALL_R * 0.6 * trail[ti].t, C.f, trail[ti].t * 0.5);
    pc(ball.x, ball.y, BALL_R + 6, C.f, 0.15); pc(ball.x, ball.y, BALL_R, C.f, 0.95); pc(ball.x - 10, ball.y - 12, 12, C.g, 0.5);
    if (!pressing && !ball.inAir && Math.floor(game.time.elapsed * 4) % 2 === 0) txt('TAP TO CHARGE', W / 2, SPRING_Y + 60, 40, C.c);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!ball.inAir && !pressing) { pressing = true; pressTime = 0; }
    else if (pressing) {
      var power = Math.min(pressTime / 0.6, 1.0); ball.vy = -(1200 + power * 1400); ball.vx = Math.max(-400, Math.min(400, (nextPlatX - SPRING_X) * 0.8)); ball.inAir = true; pressing = false; springComp = 0; game.audio.play('se_tap', 0.6);
      for (var pi = 0; pi < 8; pi++) { var a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: ball.x, y: ball.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.35, col: C.c }); }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ball) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.68, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.72, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SKY HIGH!' : 'FELL DOWN', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (landAnim > 0) landAnim -= dt * 3;
      if (pressing) { pressTime += dt; springComp = Math.min(pressTime / 0.6, 0.9); }
      if (ball.inAir) {
        ball.vy += 1600 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.vx *= Math.pow(0.98, dt * 60);
        if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx) * 0.7; } if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.7; }
        trail.push({ x: ball.x, y: ball.y, t: 0.25 }); if (trail.length > 20) trail.shift();
        for (var pi2 = 0; pi2 < platforms.length; pi2++) {
          var pl = platforms[pi2]; if (pl.landed) continue;
          if (ball.vy > 0 && ball.x > pl.x - pl.w / 2 - BALL_R && ball.x < pl.x + pl.w / 2 + BALL_R && ball.y + BALL_R >= pl.y && ball.y + BALL_R <= pl.y + 40) {
            ball.y = pl.y - BALL_R; ball.vy = 0; ball.vx = 0; ball.inAir = false; pl.landed = true; landed++; landAnim = 0.5; game.audio.play('se_success', 0.7);
            for (var pi3 = 0; pi3 < 10; pi3++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: ball.x, y: ball.y, vx: Math.cos(a2) * 180, vy: Math.sin(a2) * 180 - 100, life: 0.4, col: C.b }); }
            if (landed >= NEEDED) { finish(true); return; }
            setTimeout(function() { if (!done) { ball.x = SPRING_X; ball.y = SPRING_Y - SPRING_BASE_H - BALL_R; ball.vy = 0; ball.vx = 0; ball.inAir = false; spawnPlatform(); } }, 500);
            break;
          }
        }
        if (ball.y > H + 60) { falls++; ball.x = SPRING_X; ball.y = SPRING_Y - SPRING_BASE_H - BALL_R; ball.vy = 0; ball.vx = 0; ball.inAir = false; trail = []; flash = 0.5; game.audio.play('se_failure', 0.5); if (falls >= MAX_FALLS) { finish(false); return; } }
      }
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].t -= dt * 3; if (trail[ti].t <= 0) trail.splice(ti, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (landAnim > 0) game.draw.rect(0, 0, W, H, C.b, landAnim * 0.1);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(landed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FALLS; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALLS - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#1a0828');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
