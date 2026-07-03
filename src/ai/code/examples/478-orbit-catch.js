// 478-orbit-catch.js
// 軌道キャッチ — 惑星の周回軌道を回るボールを、タップの磁力で引き寄せて捕獲する
// 操作: ボールの近くをタップして磁力を発動（引き寄せてキャッチ）
// 成功: 8個 キャッチ  失敗: 3個 逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、宇宙ステーション） ──
  var C = { bg:'#000510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALL_COLS = [C.a, C.f, C.b, C.d, C.e];
  var ORBITS = [200, 300, 400, 500];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ORBIT CATCH';
  var HOW_TO_PLAY = 'TAP NEAR AN ORBITING BALL TO MAGNET IT IN';
  var MAX_TIME = 15;
  var NEEDED     = 8;        // 修正2: 20 → 8
  var MAX_ESCAPE = 3;        // 修正2: 10 → 3
  var CX = snap(W / 2), CY = snap(H * 0.46), PLANET_R = 88;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, stars, particles, caught, escaped, timeLeft, done, nextSpawn, magnet, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.1) game.draw.rect(snap(cx + Math.cos(a) * r) - 3, snap(cy + Math.sin(a) * r) - 3, 6, 6, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1428');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.4 + Math.sin(game.time.elapsed * 2 + si) * 0.3); }

  function initStars() { stars = []; for (var i = 0; i < 50; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: Math.random() < 0.5 ? 4 : 8 }); }

  function spawnBall() { var orbitR = ORBITS[Math.floor(Math.random() * ORBITS.length)], angle = Math.random() * Math.PI * 2, sp = (0.8 + Math.random() * 0.6) * (Math.random() < 0.5 ? 1 : -1); balls.push({ angle: angle, orbitR: orbitR, angVel: sp / orbitR, r: 24 + Math.random() * 12, col: BALL_COLS[Math.floor(Math.random() * BALL_COLS.length)], pulled: false, pvx: 0, pvy: 0, x: CX + Math.cos(angle) * orbitR, y: CY + Math.sin(angle) * orbitR, life: 5 + Math.random() * 3 }); }

  function initGame() { balls = []; particles = []; caught = 0; escaped = 0; timeLeft = MAX_TIME; done = false; nextSpawn = 0.8; magnet = null; flash = 0; spawnBall(); spawnBall(); spawnBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var oi = 0; oi < ORBITS.length; oi++) ring(CX, CY, ORBITS[oi], C.d, 0.2);
    pc(CX, CY, PLANET_R, C.d, 0.9); pc(CX - PLANET_R * 0.3, CY - PLANET_R * 0.3, PLANET_R * 0.3, C.e, 0.4); ring(CX, CY, PLANET_R + 14, C.e, 0.2);
    for (var bi = 0; bi < balls.length; bi++) { var b = balls[bi]; pc(b.x, b.y, b.r, b.col, Math.min(1, b.life / 3) * 0.8 + 0.2); pc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, C.g, 0.3); }
    if (magnet && magnet.t > 0) { ring(magnet.x, magnet.y, 140 * (magnet.t / 0.5), C.c, 0.4); pc(magnet.x, magnet.y, 26, C.c, 0.8); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    magnet = { x: tx, y: ty, t: 0.5 }; game.audio.play('se_tap', 0.4);
    for (var bi = 0; bi < balls.length; bi++) { var b = balls[bi]; if (b.pulled) continue; var dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy); if (d < 150) { b.pulled = true; b.pvx = dx / d * 600; b.pvy = dy / d * 600; b.tx = tx; b.ty = ty; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) { initStars(); initGame(); } background(); for (var ai = 0; ai < balls.length; ai++) { var ba = balls[ai]; ba.angle += ba.angVel * dt; ba.x = CX + Math.cos(ba.angle) * ba.orbitR; ba.y = CY + Math.sin(ba.angle) * ba.orbitR; } drawScene();
      txt(GAME_TITLE, W / 2, H * 0.80, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.86, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.91, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.955, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawScene();
      txt(resultSuccess ? 'CARGO SECURED!' : 'DRIFTED AWAY', W / 2, H * 0.80, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.86, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.92, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (magnet && magnet.t > 0) magnet.t -= dt;
      nextSpawn -= dt; if (nextSpawn <= 0 && balls.length < 10) { spawnBall(); nextSpawn = 0.5 + Math.random() * 0.6; }
      for (var bi = balls.length - 1; bi >= 0; bi--) {
        var b = balls[bi]; b.life -= dt;
        if (b.pulled) {
          b.x += b.pvx * dt; b.y += b.pvy * dt;
          if (Math.hypot(b.x - b.tx, b.y - b.ty) < 40) {
            caught++; balls.splice(bi, 1); flash = 0.3; game.audio.play('se_tap', 0.6);
            for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.tx, y: b.ty, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.5, col: C.b }); }
            if (caught >= NEEDED) { finish(true); return; }
            continue;
          }
        } else { b.angle += b.angVel * dt; b.x = CX + Math.cos(b.angle) * b.orbitR; b.y = CY + Math.sin(b.angle) * b.orbitR; }
        if (b.life <= 0) { balls.splice(bi, 1); escaped++; game.audio.play('se_failure', 0.2); if (escaped >= MAX_ESCAPE) { finish(false); return; } continue; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#0a1428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
