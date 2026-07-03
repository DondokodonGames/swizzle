// 506-hoop-shot.js
// フープシュート — 左右に揺れるバスケットゴールへ、スワイプの向きと強さでボールを投げ入れる
// 操作: スワイプで投げる（向き＝方向、長さ＝強さ）。リングを通せば得点
// 成功: 4本 決める  失敗: 3本 外す or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、深夜のコート） ──
  var C = { bg:'#030810', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'HOOP SHOT';
  var HOW_TO_PLAY = 'SWIPE TO SHOOT · DIRECTION AND LENGTH = AIM AND POWER';
  var MAX_TIME = 20;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_MISS = 3;          // 修正2: 15 → 3
  var HOOP_R = 68, HOOP_Y = snap(H * 0.32), BALL_R = 46, GRAVITY = 1000, START_Y = snap(H * 0.78);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var hoopX, hoopVx, ball, inPlay, scored, misses, timeLeft, done, particles, resultText, resultCol, resultTimer, netAnim, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#0a1020');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, H * 0.86, W, H * 0.14, '#0a1020', 0.9); }

  function initGame() { hoopX = W / 2; hoopVx = 90; ball = { x: W / 2, y: START_Y, vx: 0, vy: 0 }; inPlay = false; scored = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; resultText = ''; resultTimer = 0; netAnim = 0; flash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (scored * 800 + Math.ceil(timeLeft) * 100) : scored * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(W - 70, HOOP_Y - 120, 50, 200, C.d, 0.9);
    if (netAnim > 0) for (var ni = 0; ni < 5; ni++) { var nx = hoopX - HOOP_R + ni * HOOP_R * 0.5; pline(nx, HOOP_Y + 8, hoopX, HOOP_Y + 60 + Math.sin(game.time.elapsed * 20 + ni) * 10 * netAnim, C.g, 0.6, 3); }
    pline(hoopX - HOOP_R, HOOP_Y, hoopX + HOOP_R, HOOP_Y, C.f, 0.9, 10); pc(hoopX - HOOP_R, HOOP_Y, 8, C.c, 0.8); pc(hoopX + HOOP_R, HOOP_Y, 8, C.c, 0.8);
    pc(ball.x, ball.y, BALL_R, C.f, 0.9); pc(ball.x - 14, ball.y - 14, 14, C.c, 0.5);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || inPlay) return;
    var dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy); if (dist < 30) return;
    var speed = Math.min(dist * 2.6, 1500); ball.x = W / 2; ball.y = START_Y; ball.vx = dx / dist * speed; ball.vy = dy / dist * speed; inPlay = true; game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!ball) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.50, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.56, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.64, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.69, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'BUZZER BEATER!' : 'BRICKED IT', W / 2, H * 0.50, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.56, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.62, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (resultTimer > 0) resultTimer -= dt; if (netAnim > 0) netAnim -= dt * 3; if (flash > 0) flash -= dt * 3;
      hoopX += hoopVx * dt;
      if (hoopX < HOOP_R + 60) { hoopX = HOOP_R + 60; hoopVx = Math.abs(hoopVx); } if (hoopX > W - HOOP_R - 60) { hoopX = W - HOOP_R - 60; hoopVx = -Math.abs(hoopVx); }
      var tspd = 90 + scored * 20; hoopVx = hoopVx > 0 ? Math.min(tspd, hoopVx + 2) : Math.max(-tspd, hoopVx - 2);
      if (inPlay) {
        ball.vy += GRAVITY * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (Math.hypot(ball.x - hoopX, ball.y - HOOP_Y) < HOOP_R - 10 && ball.vy > 0 && ball.y > HOOP_Y - 20 && ball.y < HOOP_Y + 60) {
          scored++; netAnim = 0.6; resultText = 'SWISH!'; resultCol = C.b; resultTimer = 0.8; flash = 0.3; game.audio.play('se_success', 0.8);
          for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: hoopX, y: HOOP_Y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: C.c }); }
          inPlay = false; ball.x = W / 2; ball.y = START_Y; if (scored >= NEEDED) { finish(true); return; }
        } else if (ball.y > H + 50 || ball.x < -50 || ball.x > W + 50) {
          misses++; resultText = 'MISS!'; resultCol = C.a; resultTimer = 0.7; game.audio.play('se_failure', 0.3); inPlay = false; ball.x = W / 2; ball.y = START_Y; if (misses >= MAX_MISS) { finish(false); return; }
        } else if (ball.x > W - 50 && ball.vx > 0 && ball.y < HOOP_Y + 100) { ball.vx *= -0.6; game.audio.play('se_tap', 0.2); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.82), 60, resultCol); else if (!inPlay) txt('SWIPE TO SHOOT', W / 2, snap(H * 0.82), 40, C.d);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(scored + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
