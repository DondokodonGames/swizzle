// 727-magnet-pull.js
// マグネットプル — タップで磁場を発生させ、金属ボールを引き寄せて的に当てる
// 操作: タップした場所に磁場が生まれ、近くのボールを引き寄せる。ボールを的に導く
// 成功: 10個 キャッチ  失敗: 3個 逃す or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、磁場） ──
  var C = { bg:'#05030a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALL = '#94a3b8', BALL_HI = '#e2e8f0', MAGNET = '#ff2079', MAGNET_HI = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNET PULL';
  var HOW_TO_PLAY = 'TAP TO CREATE A MAGNETIC FIELD · PULL THE METAL BALLS INTO THE TARGET';
  var MAX_TIME = 22;
  var NEEDED     = 10;       // 修正2: 25 → 10
  var MAX_ESCAPE = 3;        // 修正2: 10 → 3
  var TARGET_X = W / 2, TARGET_Y = snap(H * 0.72), TARGET_R = 70, BALL_R = 28, MAGNET_STRENGTH = 1800, MAGNET_RANGE = 400;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, magnets, spawnTimer, score, escaped, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#09050e');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBall() {
    var side = Math.floor(Math.random() * 3), bx, by, vx, vy;
    if (side === 0) { bx = 100 + Math.random() * (W - 200); by = -BALL_R; vx = (Math.random() - 0.5) * 200; vy = 100 + Math.random() * 150; }
    else if (side === 1) { bx = -BALL_R; by = 200 + Math.random() * (H * 0.4); vx = 100 + Math.random() * 150; vy = (Math.random() - 0.5) * 200; }
    else { bx = W + BALL_R; by = 200 + Math.random() * (H * 0.4); vx = -(100 + Math.random() * 150); vy = (Math.random() - 0.5) * 200; }
    balls.push({ x: bx, y: by, vx: vx, vy: vy, phase: Math.random() * Math.PI * 2 });
  }

  function initGame() { balls = []; magnets = []; spawnTimer = 1.2; score = 0; escaped = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    ring(TARGET_X, TARGET_Y, TARGET_R, C.b, 0.4); ring(TARGET_X, TARGET_Y, TARGET_R - 20, C.b, 0.25);
    txt('IN', TARGET_X, TARGET_Y + 16, 48, '#00ff9fcc');
    for (var mdi = 0; mdi < magnets.length; mdi++) {
      var md = magnets[mdi], alpha = md.life / md.maxLife;
      ring(md.x, md.y, MAGNET_RANGE * alpha * 0.5, MAGNET, alpha * 0.15);
      pc(md.x, md.y, 30 * alpha, MAGNET_HI, alpha * 0.8);
      for (var fl = 0; fl < 6; fl++) { var fa = fl * Math.PI / 3, fr = 60 + (1 - alpha) * 120; pc(md.x + Math.cos(fa) * fr * alpha, md.y + Math.sin(fa) * fr * alpha, 8 * alpha, MAGNET, alpha * 0.4); }
    }
    for (var bi2 = 0; bi2 < balls.length; bi2++) { var bl = balls[bi2], shine = 0.8 + 0.2 * Math.sin(bl.phase * 3); pc(bl.x, bl.y, BALL_R, BALL, 0.88); pc(bl.x - BALL_R * 0.3, bl.y - BALL_R * 0.3, BALL_R * 0.25, BALL_HI, 0.45 * shine); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    magnets.push({ x: tx, y: ty, life: 0.5, maxLife: 0.5 }); game.audio.play('se_tap', 0.08);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MAGNETIC!' : 'THEY GOT AWAY', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(score >= NEEDED); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      spawnTimer -= dt; var spawnRate = Math.max(0.5, 1.2 - score * 0.02);
      if (spawnTimer <= 0) { spawnTimer = spawnRate; if (balls.length < 6) spawnBall(); }
      for (var mi = magnets.length - 1; mi >= 0; mi--) { magnets[mi].life -= dt; if (magnets[mi].life <= 0) magnets.splice(mi, 1); }
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi];
        for (var mj = 0; mj < magnets.length; mj++) {
          var mag = magnets[mj], mdx = mag.x - b.x, mdy = mag.y - b.y, mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < MAGNET_RANGE && mdist > 1) { var force = MAGNET_STRENGTH * (mag.life / mag.maxLife) / (mdist * mdist) * 100; b.vx += (mdx / mdist) * force * dt; b.vy += (mdy / mdist) * force * dt; }
        }
        b.vy += 60 * dt;
        var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy); if (spd > 700) { b.vx = b.vx / spd * 700; b.vy = b.vy / spd * 700; }
        b.x += b.vx * dt; b.y += b.vy * dt; b.phase += dt * 2;
        var tdx = b.x - TARGET_X, tdy = b.y - TARGET_Y;
        if (tdx * tdx + tdy * tdy < (TARGET_R + BALL_R) * (TARGET_R + BALL_R)) {
          score++; flash = 0.3; flashCol = C.b; resultText = 'CAUGHT!'; resultTimer = 0.4; game.audio.play('se_success', 0.5);
          for (var p = 0; p < 5; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: BALL_HI }); }
          balls.splice(bi, 1);
          if (score >= NEEDED) { finish(true); return; }
          continue;
        }
        if (b.x < -100 || b.x > W + 100 || b.y > H + 100) {
          escaped++; flash = 0.3; flashCol = C.a; resultText = 'ESCAPED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.25); balls.splice(bi, 1);
          if (escaped >= MAX_ESCAPE) { finish(false); return; }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.88), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#09050e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
