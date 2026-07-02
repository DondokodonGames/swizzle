// 232-countdown-catch.js
// カウントダウンキャッチ — ゼロ直前まで数える爆弾を、残り1秒以内でタップして掴む度胸
// 操作: 残り1秒以内のボールをタップ（早すぎ・時間切れはミス）
// 成功: 3個キャッチ  失敗: 3回ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、時限装置） ──
  var C = { bg:'#04060a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COUNTDOWN CATCH';
  var HOW_TO_PLAY = 'TAP A BALL ONLY IN ITS LAST SECOND';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 10 → 3
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var TOP = 260, BOT = H - 200, BALL_R = 56, WINDOW = 1.0;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, caught, misses, timeLeft, done, spawnTimer, feedback, feedbackCol, feedbackTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.15) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a0a14');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBall() {
    var cf = 2.5 + Math.random() * 2.5;
    balls.push({ x: snap(game.random(100, W - 100)), y: snap(game.random(TOP + 40, BOT - 40)), timer: cf, total: cf, r: BALL_R, phase: 'counting', vx: game.random(-60, 60), vy: game.random(-60, 60) });
  }

  function drawBall(b) {
    var win = b.phase === 'counting' && b.timer <= WINDOW, col = b.phase === 'expired' ? C.d : win ? C.b : C.e;
    if (win) ring(b.x, b.y, b.r + 16, C.b, 0.4 + 0.3 * (Math.floor(game.time.elapsed * 10) % 2));
    pc(b.x, b.y, b.r, col, b.phase === 'expired' ? 0.3 : 0.85);
    if (b.phase === 'counting') txt(b.timer.toFixed(1), b.x, b.y + 14, 44, win ? C.a : b.timer <= 2 ? C.c : C.g);
  }

  function initGame() { balls = []; caught = 0; misses = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; feedback = ''; feedbackCol = C.g; feedbackTimer = 0; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 50) : caught * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function addMiss(msg) { misses++; feedback = msg; feedbackCol = C.a; feedbackTimer = 0.7; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) finish(false); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi]; if (b.phase !== 'counting') continue;
      if (Math.hypot(x - b.x, y - b.y) < b.r + 30) {
        if (b.timer <= WINDOW) { b.phase = 'caught'; caught++; feedback = 'CATCH!'; feedbackCol = C.b; feedbackTimer = 0.6; game.audio.play('se_success', 0.7); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5 }); } if (caught >= NEEDED) { finish(true); return; } }
        else { addMiss('TOO EARLY!'); if (done) return; }
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawBall({ x: W * 0.35, y: H * 0.45, r: BALL_R, phase: 'counting', timer: 2.5 }); drawBall({ x: W * 0.68, y: H * 0.55, r: BALL_R, phase: 'counting', timer: 0.7 });
      txt(GAME_TITLE, W / 2, H * 0.14, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#445566');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEFUSED!' : 'BOOM', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (feedbackTimer > 0) feedbackTimer -= dt;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnBall(); spawnTimer = 1.6 * (0.7 + Math.random() * 0.6); }
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi]; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < b.r || b.x > W - b.r) b.vx = -b.vx; if (b.y < TOP + b.r || b.y > BOT - b.r) b.vy = -b.vy;
        b.x = Math.max(b.r, Math.min(W - b.r, b.x)); b.y = Math.max(TOP + b.r, Math.min(BOT - b.r, b.y));
        if (b.phase === 'counting') { b.timer -= dt; if (b.timer <= 0) { b.phase = 'expired'; addMiss('TOO LATE!'); if (done) return; } }
        else if (b.phase === 'caught') { b.r += 200 * dt; if (b.r > 200) balls.splice(bi, 1); }
        else if (b.phase === 'expired') { b.r -= 120 * dt; if (b.r <= 0) balls.splice(bi, 1); }
      }
      for (var pi = particles.length - 1; pi >= 0; pi--) { var p = particles[pi]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pi, 1); }
    }

    // ---- 描画 ----
    background();
    for (var bi2 = 0; bi2 < balls.length; bi2++) drawBall(balls[bi2]);
    for (var pp = 0; pp < particles.length; pp++) game.draw.rect(snap(particles[pp].x) - 5, snap(particles[pp].y) - 5, 10, 10, C.b, particles[pp].life * 2);
    if (feedbackTimer > 0) txt(feedback, W / 2, H * 0.16, 48, feedbackCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mm < misses ? C.a : '#0a0a14');
    txt('CATCH IN THE LAST SECOND', W / 2, H - 100, 36, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
