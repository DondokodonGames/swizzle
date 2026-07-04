// 606-spring-launch.js
// スプリングランチ — バネの弾を狙いスワイプで撃ち出し、浮かぶ的をピンポイントで撃ち抜く
// 操作: 撃ちたい向きと逆へスワイプして発射（引くほど強く飛ぶ）。的に当てる
// 成功: 5的 命中  失敗: 3回 外れ or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、射的場） ──
  var C = { bg:'#020508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPRING LAUNCH';
  var HOW_TO_PLAY = 'SWIPE AWAY FROM YOUR AIM TO FLING THE BALL · PULL FARTHER FOR MORE POWER';
  var MAX_TIME = 18;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var SPRING_X = W / 2, SPRING_Y = snap(H * 0.80), MAX_PULL = 260, BALL_R = 26;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ball, targets, hits, misses, timeLeft, done, particles, flash, flashCol, trail, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 10) * (r - 10)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a10');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnTarget() { targets.push({ x: 100 + Math.random() * (W - 200), y: snap(H * 0.14) + Math.random() * (H * 0.42), r: 40 + Math.random() * 22, vx: (Math.random() - 0.5) * 70, phase: Math.random() * Math.PI * 2 }); }

  function initGame() { ball = null; targets = []; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; trail = []; resultText = ''; resultTimer = 0; spawnTarget(); spawnTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 500 + Math.ceil(timeLeft) * 100) : hits * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti], pu = 1 + Math.sin(t.phase) * 0.1;
      pc(t.x, t.y, t.r * pu, C.a, 0.85); ring(t.x, t.y, t.r * 0.65, C.g, 0.4); pc(t.x, t.y, t.r * 0.22, C.c, 0.9);
    }
    // spring base
    game.draw.rect(SPRING_X - 40, SPRING_Y + 8, 80, 40, C.d, 0.8);
    game.draw.rect(SPRING_X - 4, SPRING_Y - 24, 8, 40, C.b, 0.8);
    if (!ball) { ring(SPRING_X, SPRING_Y, MAX_PULL, C.b, 0.05); pc(SPRING_X, SPRING_Y - BALL_R, BALL_R, C.f, 0.9); pc(SPRING_X - 8, SPRING_Y - BALL_R - 8, BALL_R * 0.3, C.c, 0.5); }
    for (var tr = 0; tr < trail.length; tr++) { var tp = trail[tr]; pc(tp.x, tp.y, BALL_R * 0.5 * (tp.life / 0.3), C.f, tp.life * 0.5); }
    if (ball) { pc(ball.x, ball.y, BALL_R, C.f, 0.9); pc(ball.x - 8, ball.y - 8, BALL_R * 0.3, C.c, 0.5); }
  }

  // ── 入力 ──
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done || ball) return;
    var dx = x2 - SPRING_X, dy = y2 - SPRING_Y, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 10) { var cd = Math.min(dist, MAX_PULL); ball = { x: SPRING_X, y: SPRING_Y, vx: -(dx / dist) * cd * 8, vy: -(dy / dist) * cd * 8 }; game.audio.play('se_tap', 0.4); }
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.94, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARPSHOOTER!' : 'OUT OF AMMO', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var ti = 0; ti < targets.length; ti++) { var t = targets[ti]; t.x += t.vx * dt; t.phase += dt * 2; if (t.x < t.r) { t.x = t.r; t.vx = Math.abs(t.vx); } if (t.x > W - t.r) { t.x = W - t.r; t.vx = -Math.abs(t.vx); } }
      if (targets.length < 3) spawnTarget();
      if (ball) {
        ball.vy += 600 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt; trail.push({ x: ball.x, y: ball.y, life: 0.3 });
        var hitT = false;
        for (var ti2 = targets.length - 1; ti2 >= 0; ti2--) {
          var t2 = targets[ti2], dx2 = ball.x - t2.x, dy2 = ball.y - t2.y;
          if (dx2 * dx2 + dy2 * dy2 < (BALL_R + t2.r) * (BALL_R + t2.r)) {
            targets.splice(ti2, 1); hits++; flash = 0.3; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.5; game.audio.play('se_success', 0.7);
            for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: t2.x, y: t2.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: C.c }); }
            ball = null; hitT = true; if (hits >= NEEDED) { finish(true); return; } break;
          }
        }
        if (!hitT && ball && (ball.x < -100 || ball.x > W + 100 || ball.y > H + 100 || ball.y < -250)) {
          misses++; flash = 0.3; flashCol = C.a; resultText = 'MISS'; resultTimer = 0.4; game.audio.play('se_failure', 0.25); ball = null;
          if (misses >= MAX_MISS) { finish(false); return; }
        }
      }
      for (var tr = trail.length - 1; tr >= 0; tr--) { trail[tr].life -= dt * 3; if (trail[tr].life <= 0) trail.splice(tr, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 56, flashCol);
    else if (!ball) txt('SWIPE TO FIRE', W / 2, snap(H * 0.88), 34, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1a10');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
