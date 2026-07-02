// 273-plasma-bounce.js
// プラズマバウンス — 下のパドルでプラズマ球を跳ね返し、上部のブロックを砕くブロック崩し
// 操作: タップした位置へパドルを移動
// 成功: 3ブロック破壊  失敗: 3回落とす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、プラズマ台） ──
  var C = { bg:'#030210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PLASMA BOUNCE';
  var HOW_TO_PLAY = 'MOVE THE PADDLE · SMASH THE BLOCKS';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 20 → 3
  var MAX_MISS = 3;
  var PADDLE_W = 220, PADDLE_H = 26, PADDLE_Y = snap(H * 0.85), TOP = 220, BALL_R = 20;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var paddleX, ball, targets, destroyed, misses, timeLeft, done, particles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0130');
  }

  function background() { game.draw.clear(C.bg); }

  function buildTargets() {
    targets = []; var cols = 6, rows = 3, tw = (W - 80) / cols, th = 56;
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) targets.push({ x: 40 + c * tw, y: TOP + 40 + r * (th + 12), w: tw - 12, h: th, col: r === 0 ? C.a : r === 1 ? C.f : C.d });
  }

  function drawTarget(t) { game.draw.rect(snap(t.x), snap(t.y), snap(t.w), t.h, t.col, 0.9); game.draw.rect(snap(t.x), snap(t.y), snap(t.w), 6, C.g, 0.4); }

  function resetBall() { ball = { x: snap(W / 2), y: snap(H * 0.55), vx: game.random(-300, 300) || 200, vy: -360, r: BALL_R, trail: [] }; }

  function initGame() { paddleX = W / 2 - PADDLE_W / 2; resetBall(); buildTargets(); destroyed = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (destroyed * 400 + Math.ceil(timeLeft) * 60) : destroyed * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2));
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); for (var i = 0; i < targets.length; i++) drawTarget(targets[i]); pc(W / 2, H * 0.55, BALL_R, C.d, 0.9); game.draw.rect(snap(W / 2 - PADDLE_W / 2), PADDLE_Y, PADDLE_W, PADDLE_H, C.b, 0.9);
      txt(GAME_TITLE, W / 2, H * 0.16, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.72, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SMASHED!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      ball.trail.push({ x: ball.x, y: ball.y }); if (ball.trail.length > 8) ball.trail.shift();
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); } if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - ball.r < TOP) { ball.y = TOP + ball.r; ball.vy = Math.abs(ball.vy); }
      if (ball.y + ball.r >= PADDLE_Y && ball.y + ball.r < PADDLE_Y + PADDLE_H + 20 && ball.x >= paddleX - 10 && ball.x <= paddleX + PADDLE_W + 10 && ball.vy > 0) { ball.vy = -Math.abs(ball.vy); ball.vx += ((ball.x - paddleX) / PADDLE_W - 0.5) * 320; ball.vx = Math.max(-500, Math.min(500, ball.vx)); game.audio.play('se_tap', 0.2); }
      if (ball.y - ball.r > H) { misses++; game.audio.play('se_failure', 0.5); if (misses >= MAX_MISS) { finish(false); return; } resetBall(); }
      for (var ti = targets.length - 1; ti >= 0; ti--) {
        var t = targets[ti];
        if (ball.x + ball.r > t.x && ball.x - ball.r < t.x + t.w && ball.y + ball.r > t.y && ball.y - ball.r < t.y + t.h) {
          var fromSide = ball.x < t.x || ball.x > t.x + t.w; if (fromSide) ball.vx *= -1; else ball.vy *= -1;
          destroyed++; targets.splice(ti, 1); game.audio.play('se_success', 0.4);
          for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: t.x + t.w / 2, y: t.y + t.h / 2, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: t.col }); }
          if (destroyed >= NEEDED) { finish(true); return; }
          break;
        }
      }
      if (targets.length === 0) buildTargets();
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ti2 = 0; ti2 < targets.length; ti2++) drawTarget(targets[ti2]);
    for (var tr = 0; tr < ball.trail.length; tr++) game.draw.rect(snap(ball.trail[tr].x) - 4, snap(ball.trail[tr].y) - 4, 8, 8, C.d, tr / ball.trail.length * 0.5);
    pc(ball.x, ball.y, ball.r, C.d, 0.95); game.draw.rect(snap(ball.x) - 4, snap(ball.y) - 4, 8, 8, C.g, 0.7);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 2);
    game.draw.rect(snap(paddleX), PADDLE_Y, PADDLE_W, PADDLE_H, C.b, 0.9); game.draw.rect(snap(paddleX), PADDLE_Y, PADDLE_W, 6, C.g, 0.5);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(destroyed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mm < misses ? C.a : '#1a0130');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
