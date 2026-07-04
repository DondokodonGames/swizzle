// 691-gravity.js
// グラビティフリップ — タップで重力を上下反転し、障害物の隙間にボールを通す
// 操作: タップで重力を反転。天井と床の間を上下しながら壁の隙間を抜ける
// 成功: 10個 通過  失敗: 3回 衝突 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、重力ダンジョン） ──
  var C = { bg:'#050210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALL = '#a855f7', BALL_HI = '#ddd6fe';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY UP OR DOWN · GUIDE THE BALL THROUGH THE GAPS';
  var MAX_TIME = 18;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_HIT  = 3;          // 修正2: 5 → 3
  var BALL_X = W * 0.25, CEIL_Y = 200, FLOOR_Y = snap(H * 0.86), PLAY_H = FLOOR_Y - CEIL_Y;
  var GRAVITY = 1600, OBS_W = 60, GAP_H = 360, SPAWN_RATE = 1.9;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ballY, ballVY, ballR, gravDir, obstacles, obsSpeed, spawnTimer, passed, hits, timeLeft, done, elapsed, particles, flash, iframes, trail;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); var st = 8; for (var i = 0; i < size; i += st) { var w = size - i; if (dir === 'down') game.draw.rect(cx - w / 2, cy + i - size / 2, w, st, color, 0.9); else game.draw.rect(cx - w / 2, cy - i + size / 2 - st, w, st, color, 0.9); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#07041a');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnObs() { var gapY = CEIL_Y + 60 + Math.random() * (PLAY_H - GAP_H - 120); obstacles.push({ x: W + OBS_W, gapY: gapY, gapH: GAP_H, scored: false }); }

  function initGame() { ballY = (CEIL_Y + FLOOR_Y) / 2; ballVY = 0; ballR = 36; gravDir = 1; obstacles = []; obsSpeed = 260; spawnTimer = 0; passed = 0; hits = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; iframes = 0; trail = []; spawnObs(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 400 + Math.ceil(timeLeft) * 100) : passed * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(0, 0, W, CEIL_Y, '#000000', 0.5); game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, '#000000', 0.5);
    game.draw.line(0, CEIL_Y, W, CEIL_Y, '#ffffff18', 3); game.draw.line(0, FLOOR_Y, W, FLOOR_Y, '#ffffff18', 3);
    for (var oi = 0; oi < obstacles.length; oi++) {
      var obs = obstacles[oi];
      game.draw.rect(obs.x, CEIL_Y, OBS_W, obs.gapY - CEIL_Y, '#1e3a5f', 0.9);
      game.draw.rect(obs.x, obs.gapY + obs.gapH, OBS_W, FLOOR_Y - obs.gapY - obs.gapH, '#1e3a5f', 0.9);
      game.draw.rect(obs.x, obs.gapY - 6, OBS_W, 12, C.b, 0.4); game.draw.rect(obs.x, obs.gapY + obs.gapH - 6, OBS_W, 12, C.b, 0.4);
    }
    for (var tr2 = 0; tr2 < trail.length; tr2++) { var t = trail[tr2]; pc(t.x, t.y, ballR * t.life * 1.4, C.d, t.life * 0.4); }
    var ballAlpha = iframes > 0 ? (Math.sin(elapsed * 20) * 0.5 + 0.5) : 0.9;
    pc(BALL_X, ballY, ballR, BALL, ballAlpha); pc(BALL_X - ballR * 0.3, ballY - ballR * 0.35, ballR * 0.22, BALL_HI, ballAlpha * 0.5);
    arrow(BALL_X, ballY + gravDir * 56, 28, gravDir > 0 ? 'down' : 'up', BALL_HI);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    gravDir *= -1; ballVY = 0; game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 3; p++) particles.push({ x: BALL_X, y: ballY, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, life: 0.3, col: BALL_HI });
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GRAVITY MASTER!' : 'CRASHED', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (iframes > 0) iframes -= dt;
      ballVY += GRAVITY * gravDir * dt; ballY += ballVY * dt;
      if (ballY < CEIL_Y + ballR) { ballY = CEIL_Y + ballR; ballVY = Math.abs(ballVY) * 0.3; }
      if (ballY > FLOOR_Y - ballR) { ballY = FLOOR_Y - ballR; ballVY = -Math.abs(ballVY) * 0.3; }
      trail.push({ x: BALL_X, y: ballY, life: 0.25 });
      obsSpeed = 260 + elapsed * 5; spawnTimer += dt;
      var rate = Math.max(1.0, SPAWN_RATE - elapsed * 0.02); if (spawnTimer >= rate) { spawnTimer = 0; spawnObs(); }
      for (var i = obstacles.length - 1; i >= 0; i--) {
        var o = obstacles[i]; o.x -= obsSpeed * dt;
        if (!o.scored && o.x + OBS_W < BALL_X) { o.scored = true; passed++; game.audio.play('se_tap', 0.08); if (passed >= NEEDED) { finish(true); return; } }
        if (iframes <= 0 && o.x < BALL_X + ballR && o.x + OBS_W > BALL_X - ballR) {
          var inGap = ballY - ballR > o.gapY && ballY + ballR < o.gapY + o.gapH;
          if (!inGap) {
            hits++; iframes = 1.2; flash = 0.5; game.audio.play('se_failure', 0.5);
            for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: BALL_X, y: ballY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.a }); }
            if (hits >= MAX_HIT) { finish(false); return; }
          }
        }
        if (o.x < -OBS_W * 2) obstacles.splice(i, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 3; if (p2.life <= 0) particles.splice(pp, 1); }
      for (var tr = trail.length - 1; tr >= 0; tr--) { trail[tr].life -= dt * 5; if (trail[tr].life <= 0) trail.splice(tr, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HIT; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#07041a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
