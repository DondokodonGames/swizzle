// 501-chain-reaction.js
// チェーンリアクション — たった1タップで爆発を起こし、爆風が球へ次々連鎖する大連鎖を狙う
// 操作: 好きな位置をタップして起爆（爆風に触れた球も連鎖爆発する）
// 成功: 累計20個 破壊  失敗: 3回 試行 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、爆破実験場） ──
  var C = { bg:'#0a0200', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN REACTION';
  var HOW_TO_PLAY = 'TAP ANYWHERE TO IGNITE · THE BLAST CHAINS ACROSS THE BALLS';
  var MAX_TIME = 20;
  var NEEDED   = 20;         // 修正2: 60 → 20
  var MAX_TRIES = 3;
  var BALL_R = 40, EXPLODE_R = 140, NUM_BALLS = 22;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, explosions, particles, destroyed, totalDestroyed, tries, timeLeft, done, iphase, chainCount, chainText, chainTimer, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a0400');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBalls() {
    balls = [];
    for (var i = 0; i < NUM_BALLS; i++) { var at = 0, bx, by, ok; do { bx = snap(BALL_R + 40 + Math.random() * (W - BALL_R * 2 - 80)); by = snap(320 + Math.random() * (H * 0.55)); ok = true; for (var j = 0; j < balls.length; j++) if (Math.hypot(bx - balls[j].x, by - balls[j].y) < BALL_R * 2 + 10) { ok = false; break; } at++; } while (!ok && at < 30); balls.push({ x: bx, y: by, alive: true, triggered: false, col: [C.a, C.f, C.c, C.b, C.e][i % 5] }); }
    destroyed = 0; iphase = 'aim'; chainCount = 0; explosions = [];
  }

  function initGame() { particles = []; totalDestroyed = 0; tries = 0; timeLeft = MAX_TIME; done = false; chainText = ''; chainTimer = 0; flash = 0; spawnBalls(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (totalDestroyed * 150 + Math.ceil(timeLeft) * 100) : totalDestroyed * 60;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function explode(x, y) { explosions.push({ x: x, y: y, r: 0, maxR: EXPLODE_R, timer: 0.5 }); for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: x, y: y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.5, col: C.c }); } }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'aim') return;
    tries++; iphase = 'exploding'; chainCount = 0; explode(tx, ty); game.audio.play('se_failure', 0.5);
  });

  // ── 更新 & 描画 ──
  function drawScene() {
    for (var bi = 0; bi < balls.length; bi++) { if (!balls[bi].alive) continue; var b = balls[bi]; pc(b.x, b.y, BALL_R, b.col, 0.85); pc(b.x - BALL_R * 0.25, b.y - BALL_R * 0.25, BALL_R * 0.2, C.g, 0.35); }
    for (var ei = 0; ei < explosions.length; ei++) { var ex = explosions[ei]; ring(ex.x, ex.y, ex.r, C.g, ex.timer * 0.6); pc(ex.x, ex.y, ex.r * 0.5, C.c, ex.timer * 0.5); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.17, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MEGA BLAST!' : 'FIZZLED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (chainTimer > 0) chainTimer -= dt; if (flash > 0) flash -= dt * 3;
      if (iphase === 'exploding') {
        for (var ei = explosions.length - 1; ei >= 0; ei--) {
          var ex = explosions[ei]; ex.timer -= dt; ex.r = (1 - ex.timer / 0.5) * ex.maxR; if (ex.timer <= 0) { explosions.splice(ei, 1); continue; }
          for (var bi = 0; bi < balls.length; bi++) { if (!balls[bi].alive || balls[bi].triggered) continue; if (Math.hypot(balls[bi].x - ex.x, balls[bi].y - ex.y) <= ex.r + BALL_R) { balls[bi].alive = false; balls[bi].triggered = true; destroyed++; totalDestroyed++; chainCount++; chainText = chainCount + ' CHAIN'; chainTimer = 0.6; flash = 0.2; game.audio.play('se_tap', 0.2); explode(balls[bi].x, balls[bi].y); } }
        }
        if (explosions.length === 0) {
          if (destroyed >= 8) game.audio.play('se_success', 0.8);
          if (totalDestroyed >= NEEDED) { finish(true); return; }
          if (tries >= MAX_TRIES) { finish(false); return; }
          setTimeout(function() { if (!done) spawnBalls(); }, 800);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (chainTimer > 0) txt(chainText, W / 2, H * 0.5, 72, C.c);
    if (iphase === 'aim') txt('TAP TO IGNITE', W / 2, snap(H * 0.90), 46, C.f);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.f, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(totalDestroyed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ti = 0; ti < MAX_TRIES; ti++) game.draw.rect(snap(W / 2 + (ti - (MAX_TRIES - 1) / 2) * 56) - 10, 224, 20, 20, ti < tries ? C.a : '#1a0400');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
