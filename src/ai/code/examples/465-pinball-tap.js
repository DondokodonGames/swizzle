// 465-pinball-tap.js
// ピンボールタップ — 落ちてくるボールをフリッパーで打ち返し、バンパーに当てて得点する
// 操作: 画面左タップ=左フリッパー、右タップ=右フリッパー（ボールを落とさない）
// 成功: 8点 獲得  失敗: 3回 落下 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ピンボール台） ──
  var C = { bg:'#050018', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PINBALL TAP';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT TO FIRE THE FLIPPERS · HIT THE BUMPERS';
  var MAX_TIME = 20;
  var NEEDED    = 8;         // 修正2: 20 → 8
  var MAX_FALLS = 3;         // 修正2: 5 → 3
  var FLIPPER_Y = snap(H * 0.84), FLIPPER_L = 170, FL_X = snap(W * 0.26), FR_X = snap(W * 0.74), BASE_A = 0.45, HIT_A = -0.7, ACTIVE_T = 0.18;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var leftActive, rightActive, leftTimer, rightTimer, leftAngle, rightAngle, ball, bumpers, particles, score, falls, timeLeft, done, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#14002a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(60, 300, W - 120, H - 300, '#0a0030', 0.5); game.draw.rect(0, 300, 60, H - 300, C.d, 0.8); game.draw.rect(W - 60, 300, 60, H - 300, C.d, 0.8); }

  function resetBall() { ball = { x: W / 2 + (Math.random() - 0.5) * 100, y: H * 0.42, vx: (Math.random() - 0.5) * 200, vy: 180 + Math.random() * 100, r: 22 }; }

  function initGame() {
    leftActive = false; rightActive = false; leftTimer = 0; rightTimer = 0; leftAngle = BASE_A; rightAngle = Math.PI - BASE_A;
    bumpers = [{ x: W * 0.3, y: H * 0.42, r: 40, lit: 0, col: C.a }, { x: W * 0.7, y: H * 0.42, r: 40, lit: 0, col: C.f }, { x: W * 0.5, y: H * 0.34, r: 36, lit: 0, col: C.c }, { x: W * 0.22, y: H * 0.56, r: 32, lit: 0, col: C.e }, { x: W * 0.78, y: H * 0.56, r: 32, lit: 0, col: C.b }];
    particles = []; score = 0; falls = 0; timeLeft = MAX_TIME; done = false; flash = 0; resetBall();
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var bi = 0; bi < bumpers.length; bi++) { var b = bumpers[bi]; var col = b.lit > 0 ? C.c : b.col; pc(b.x, b.y, b.r, col, 0.9); pc(b.x, b.y, b.r * 0.5, b.lit > 0 ? C.g : C.g, 0.4); }
    pc(ball.x, ball.y, ball.r, C.g, 0.9); pc(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.3, C.g, 0.5);
    var lt = { x: FL_X + Math.cos(leftAngle) * FLIPPER_L, y: FLIPPER_Y + Math.sin(leftAngle) * FLIPPER_L };
    var rt = { x: FR_X + Math.cos(rightAngle) * FLIPPER_L, y: FLIPPER_Y + Math.sin(rightAngle) * FLIPPER_L };
    pline(FL_X, FLIPPER_Y, lt.x, lt.y, leftActive ? C.c : C.e, 0.9, 26); pline(FR_X, FLIPPER_Y, rt.x, rt.y, rightActive ? C.c : C.e, 0.9, 26);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (x < W / 2) { leftActive = true; leftTimer = ACTIVE_T; } else { rightActive = true; rightTimer = ACTIVE_T; }
    game.audio.play('se_tap', 0.3);
  });

  function checkFlipper(fx, fy, ang, active, push) {
    var dx = Math.cos(ang) * FLIPPER_L, dy = Math.sin(ang) * FLIPPER_L, bx = ball.x - fx, by = ball.y - fy;
    var t = Math.max(0, Math.min(1, (bx * dx + by * dy) / (dx * dx + dy * dy)));
    var cx = fx + t * dx, cy = fy + t * dy, d = Math.hypot(ball.x - cx, ball.y - cy);
    if (d < ball.r + 14) { var ny = (ball.y - cy) / (d || 1); ball.vy = -Math.abs(ball.vy) * 0.9; ball.vx += active ? push : 0; ball.y = cy + ny * (ball.r + 16); if (active) game.audio.play('se_tap', 0.4); }
  }

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ball) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.72, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.77, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'HIGH SCORE!' : 'BALL LOST', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      if (leftTimer > 0) { leftTimer -= dt; if (leftTimer <= 0) leftActive = false; }
      if (rightTimer > 0) { rightTimer -= dt; if (rightTimer <= 0) rightActive = false; }
      leftAngle = leftActive ? HIT_A : BASE_A; rightAngle = rightActive ? Math.PI - HIT_A : Math.PI - BASE_A;
      ball.vy += 800 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x - ball.r < 60) { ball.x = 60 + ball.r; ball.vx = Math.abs(ball.vx) * 0.85; }
      if (ball.x + ball.r > W - 60) { ball.x = W - 60 - ball.r; ball.vx = -Math.abs(ball.vx) * 0.85; }
      if (ball.y - ball.r < 300) { ball.y = 300 + ball.r; ball.vy = Math.abs(ball.vy) * 0.8; }
      for (var bi = 0; bi < bumpers.length; bi++) {
        var b = bumpers[bi]; if (b.lit > 0) b.lit -= dt * 3;
        var dx = ball.x - b.x, dy = ball.y - b.y, d = Math.hypot(dx, dy);
        if (d < b.r + ball.r) {
          var nx = dx / d, ny = dy / d, dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * 1.1; ball.vy = (ball.vy - 2 * dot * ny) * 1.1;
          var sp = Math.hypot(ball.vx, ball.vy); if (sp > 1200) { ball.vx = ball.vx / sp * 1200; ball.vy = ball.vy / sp * 1200; }
          ball.x = b.x + nx * (b.r + ball.r + 2); ball.y = b.y + ny * (b.r + ball.r + 2); b.lit = 0.4; score++; flash = 0.2; game.audio.play('se_tap', 0.3);
          for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.4, col: C.c }); }
          if (score >= NEEDED) { finish(true); return; }
        }
      }
      checkFlipper(FL_X, FLIPPER_Y, leftAngle, leftActive, 200); checkFlipper(FR_X, FLIPPER_Y, rightAngle, rightActive, -200);
      if (ball.y > H + 50) { falls++; game.audio.play('se_failure', 0.5); if (falls >= MAX_FALLS) { finish(false); return; } resetBall(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.c, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FALLS; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALLS - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#14002a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
