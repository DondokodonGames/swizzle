// 281-gravity-flip.js
// グラビティフリップ — タップで重力を上下反転し、壁の隙間ゲートを次々くぐり抜ける
// 操作: タップで重力の向きを反転
// 成功: 3ゲート通過  失敗: 壁に3回当たる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、反重力回廊） ──
  var C = { bg:'#020710', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY · PASS THE GATES';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 10 → 3
  var MAX_HIT = 3;
  var PR = 28, FLOOR = snap(H * 0.86), CEIL = snap(H * 0.16), PX = snap(W * 0.22);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var py, vy, grav, gates, hits, obstacles, scrollSpeed, spawnTimer, timeLeft, done, trail, particles, hitFlash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1020');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, FLOOR, W, H - FLOOR, C.d, 0.7); game.draw.rect(0, CEIL - 30, W, 30, C.d, 0.7);
  }

  function drawPlayer() { pc(PX, py, PR, C.b, 0.95); var dir = grav === 1 ? 1 : -1; game.draw.rect(snap(PX) - 4, snap(py + dir * 14) - 4, 8, 8, C.bg); }

  function spawnObstacle() { var gapH = Math.max(220, 300 - gates * 10), gapY = CEIL + Math.random() * (FLOOR - CEIL - gapH); obstacles.push({ x: W + 60, gapY: gapY, gapH: gapH, passed: false, flash: 0 }); }

  function initGame() { py = H * 0.5; vy = 0; grav = 1; gates = 0; hits = 0; obstacles = []; scrollSpeed = 260; spawnTimer = 1; timeLeft = MAX_TIME; done = false; trail = []; particles = []; hitFlash = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (gates * 400 + Math.ceil(timeLeft) * 60) : gates * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawObstacle(o) { var col = o.flash > 0 ? C.a : C.d; game.draw.rect(snap(o.x), CEIL, 60, o.gapY - CEIL, col, 0.9); game.draw.rect(snap(o.x), o.gapY + o.gapH, 60, FLOOR - o.gapY - o.gapH, col, 0.9); game.draw.rect(snap(o.x), snap(o.gapY) - 6, 60, 6, C.c, 0.6); game.draw.rect(snap(o.x), snap(o.gapY + o.gapH), 60, 6, C.c, 0.6); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    grav *= -1; vy *= 0.3; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame(); background(); drawObstacle({ x: W * 0.65, gapY: H * 0.4, gapH: 260, flash: 0 }); drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.72, 40, '#443366');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEARED!' : 'CRASHED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (hitFlash > 0) hitFlash -= dt;
      vy += 1200 * grav * dt; vy = Math.max(-800, Math.min(800, vy)); py += vy * dt;
      if (grav === 1 && py + PR >= FLOOR) { py = FLOOR - PR; vy = 0; } if (grav === -1 && py - PR <= CEIL) { py = CEIL + PR; vy = 0; }
      trail.push({ x: PX, y: py }); if (trail.length > 12) trail.shift();
      scrollSpeed = 260 + gates * 20; spawnTimer -= dt; if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = 1.1; }
      for (var oi = obstacles.length - 1; oi >= 0; oi--) {
        var o = obstacles[oi]; o.x -= scrollSpeed * dt; if (o.flash > 0) o.flash -= dt;
        if (PX + PR > o.x && PX - PR < o.x + 60) { if (!(py - PR >= o.gapY && py + PR <= o.gapY + o.gapH)) { hits++; o.flash = 0.4; hitFlash = 0.4; vy = 0; game.audio.play('se_failure', 0.6); for (var pk = 0; pk < 6; pk++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PX, y: py, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5 }); } if (hits >= MAX_HIT) { finish(false); return; } } }
        if (!o.passed && o.x + 60 < PX - PR) { o.passed = true; gates++; game.audio.play('se_success', 0.4); if (gates >= NEEDED) { finish(true); return; } }
        if (o.x + 60 < -100) obstacles.splice(oi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.a, hitFlash * 0.25);
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) drawObstacle(obstacles[oi2]);
    for (var t2 = 0; t2 < trail.length; t2++) game.draw.rect(snap(trail[t2].x) - 5, snap(trail[t2].y) - 5, 10, 10, C.d, t2 / trail.length * 0.5);
    drawPlayer();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.a, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(gates + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HIT; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0a1020');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
