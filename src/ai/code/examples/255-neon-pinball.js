// 255-neon-pinball.js
// ネオンピンボール — ネオン管の台でボールをフリッパーで打ち上げ、バンパーを弾いて得点を稼ぐ
// 操作: 左半分タップで左フリッパー、右半分タップで右フリッパー
// 成功: 100点獲得  失敗: ボール3個失う or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ピンボール台） ──
  var C = { bg:'#020109', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON PINBALL';
  var HOW_TO_PLAY = 'TAP ◄ LEFT · RIGHT ► FLIPPER';
  var MAX_TIME = 20;
  var NEEDED   = 100;         // 修正2: 500 → 100
  var TOP = 220, GRAVITY = 900, BALL_R = 20, WALL = 20;
  var FLIP_Y = snap(H * 0.86), FLIP_LEN = 170, FLIP_W = 20, LX = snap(W * 0.22), RX = snap(W * 0.78);
  var REST = 0.5, UP = -0.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ball, lives, score, timeLeft, done, la, ra, lt, rt, bumpers, bflash, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, w, color) { var len = Math.hypot(x2 - x1, y2 - y1), n = Math.max(1, Math.round(len / 8)); for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + (x2 - x1) * i / n) - w / 2, snap(y1 + (y2 - y1) * i / n) - w / 2, w, w, color, 0.9); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1424');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, TOP, WALL, H - TOP, C.d, 0.6); game.draw.rect(W - WALL, TOP, WALL, H - TOP, C.d, 0.6); game.draw.rect(0, TOP, W, WALL, C.d, 0.6); }

  function initBumpers() { bumpers = [ { x: snap(W * 0.3), y: snap(H * 0.4), r: 40, score: 20, col: C.f }, { x: snap(W * 0.7), y: snap(H * 0.4), r: 40, score: 20, col: C.f }, { x: snap(W * 0.5), y: snap(H * 0.3), r: 44, score: 30, col: C.a }, { x: snap(W * 0.25), y: snap(H * 0.55), r: 32, score: 15, col: C.e }, { x: snap(W * 0.75), y: snap(H * 0.55), r: 32, score: 15, col: C.e } ]; bflash = [0, 0, 0, 0, 0]; }

  function resetBall() { ball = { x: snap(W * 0.85), y: snap(H * 0.45), vx: -100, vy: -500, r: BALL_R }; }

  function drawFlipper(bx, ang) { pline(bx, FLIP_Y, bx + Math.cos(ang) * FLIP_LEN, FLIP_Y + Math.sin(ang) * FLIP_LEN, FLIP_W, C.d); pc(bx, FLIP_Y, 12, C.g, 0.7); }

  function flipperHit(bx, ang, flip) {
    var ex = bx + Math.cos(ang) * FLIP_LEN, ey = FLIP_Y + Math.sin(ang) * FLIP_LEN, dx = ex - bx, dy = ey - FLIP_Y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    var proj = ((ball.x - bx) * dx + (ball.y - FLIP_Y) * dy) / (len * len); if (proj < 0 || proj > 1) return;
    var cx = bx + proj * dx, cy = FLIP_Y + proj * dy, dist = Math.hypot(ball.x - cx, ball.y - cy);
    if (dist < ball.r + FLIP_W / 2) { var ov = ball.r + FLIP_W / 2 - dist; ball.x += nx * ov; ball.y += ny * ov; var dot = ball.vx * nx + ball.vy * ny, boost = flip ? 600 : 0; ball.vx = ball.vx - 2 * dot * nx + nx * boost; ball.vy = ball.vy - 2 * dot * ny + ny * boost; game.audio.play('se_tap', 0.3); }
  }

  function initGame() { resetBall(); lives = 3; score = 0; timeLeft = MAX_TIME; done = false; la = REST; ra = Math.PI - REST; lt = REST; rt = Math.PI - REST; initBumpers(); particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score + Math.ceil(timeLeft) * 30) : score;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (x < W / 2) { lt = UP; setTimeout(function() { lt = REST; }, 200); } else { rt = Math.PI - UP; setTimeout(function() { rt = Math.PI - REST; }, 200); }
    game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); for (var i = 0; i < 5; i++) { var bm = bumpers[i]; pc(bm.x, bm.y, bm.r, bm.col, 0.9); } drawFlipper(LX, REST); drawFlipper(RX, Math.PI - REST);
      txt(GAME_TITLE, W / 2, H * 0.15, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.72, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JACKPOT!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      la += (lt - la) * 15 * dt; ra += (rt - ra) * 15 * dt;
      ball.vy += GRAVITY * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x - ball.r < WALL) { ball.x = WALL + ball.r; ball.vx = Math.abs(ball.vx) * 0.85; }
      if (ball.x + ball.r > W - WALL) { ball.x = W - WALL - ball.r; ball.vx = -Math.abs(ball.vx) * 0.85; }
      if (ball.y - ball.r < TOP + WALL) { ball.y = TOP + WALL + ball.r; ball.vy = Math.abs(ball.vy) * 0.85; }
      if (ball.y > H + 50) { lives--; game.audio.play('se_failure', 0.4); if (lives <= 0) { finish(false); return; } resetBall(); }
      flipperHit(LX, la, lt < la); flipperHit(RX, ra, rt > ra);
      for (var bi = 0; bi < bumpers.length; bi++) {
        var bmp = bumpers[bi], dx = ball.x - bmp.x, dy = ball.y - bmp.y, dist = Math.hypot(dx, dy) || 1;
        if (dist < ball.r + bmp.r) { var ov = ball.r + bmp.r - dist, nx = dx / dist, ny = dy / dist; ball.x += nx * ov; ball.y += ny * ov; var sp = Math.max(Math.hypot(ball.vx, ball.vy), 500); ball.vx = nx * sp; ball.vy = ny * sp; score += bmp.score; bflash[bi] = 0.3; game.audio.play('se_success', 0.3); for (var pi = 0; pi < 4; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: bmp.x, y: bmp.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.4 }); } if (score >= NEEDED) { finish(true); return; } }
        if (bflash[bi] > 0) bflash[bi] -= dt;
      }
      var spd = Math.hypot(ball.vx, ball.vy); if (spd > 1400) { ball.vx = ball.vx / spd * 1400; ball.vy = ball.vy / spd * 1400; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var bi2 = 0; bi2 < bumpers.length; bi2++) { var bm2 = bumpers[bi2], lit = bflash[bi2] > 0; pc(bm2.x, bm2.y, bm2.r, lit ? C.g : bm2.col, 0.9); txt(bm2.score + '', bm2.x, bm2.y + 10, 28, '#000'); }
    drawFlipper(LX, la); drawFlipper(RX, ra);
    pc(ball.x, ball.y, ball.r, C.g, 0.95); game.draw.rect(snap(ball.x) - 6, snap(ball.y) - 6, 6, 6, C.e, 0.8);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, C.c, particles[pp2].life * 2.5);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var li = 0; li < 3; li++) game.draw.rect(snap(W * 0.14 + li * 44) - 10, H - 100, 20, 20, li < lives ? C.g : '#0a1424');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
