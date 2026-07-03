// 483-target-lock.js
// ターゲットロック — レーダー上を動き回る機影をタップして撃破する
// 操作: 動くターゲットを直接タップで撃破（画面外へ逃がすとミス）
// 成功: 6機 撃破  失敗: 3機 逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、レーダー室） ──
  var C = { bg:'#000800', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TARGET LOCK';
  var HOW_TO_PLAY = 'TAP THE MOVING BLIPS TO DESTROY THEM';
  var MAX_TIME = 15;
  var NEEDED     = 6;        // 修正2: 10 → 6
  var MAX_ESCAPE = 3;        // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targets, particles, destroyed, escaped, timeLeft, done, nextSpawn, radarAngle, flash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 3, snap(cy + Math.sin(a) * r) - 3, 6, 6, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() {
    game.draw.clear(C.bg); game.draw.rect(0, 0, W, H, '#001a0a', 0.3);
    pline(W / 2, H / 2, W / 2 + Math.cos(radarAngle) * W, H / 2 + Math.sin(radarAngle) * W, C.d, 0.4, 4);
    for (var ri = 1; ri <= 3; ri++) ring(W / 2, H / 2, ri * 240, C.d, 0.2);
  }

  function spawnTarget() {
    var edge = Math.floor(Math.random() * 4), x, y, vx, vy, spd = 160 + Math.random() * 100 + destroyed * 12;
    if (edge === 0) { x = Math.random() * W; y = -60; vx = (Math.random() - 0.5) * spd; vy = spd * 0.6; }
    else if (edge === 1) { x = W + 60; y = Math.random() * H; vx = -spd; vy = (Math.random() - 0.5) * spd * 0.6; }
    else if (edge === 2) { x = Math.random() * W; y = H + 60; vx = (Math.random() - 0.5) * spd; vy = -spd; }
    else { x = -60; y = Math.random() * H; vx = spd; vy = (Math.random() - 0.5) * spd * 0.6; }
    targets.push({ x: x, y: y, vx: vx, vy: vy, r: 40, life: 4 + Math.random() * 2 });
  }

  function initGame() { targets = []; particles = []; destroyed = 0; escaped = 0; timeLeft = MAX_TIME; done = false; nextSpawn = 0.8; radarAngle = 0; flash = 0; spawnTarget(); spawnTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (destroyed * 500 + Math.ceil(timeLeft) * 100) : destroyed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTargets() {
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti]; pc(t.x, t.y, t.r, C.a, 0.8); pc(t.x, t.y, t.r * 0.4, C.c, 0.6);
      var rc = t.r + 18;
      pline(t.x - rc, t.y - rc, t.x - rc + 26, t.y - rc, C.b, 0.7, 4); pline(t.x - rc, t.y - rc, t.x - rc, t.y - rc + 26, C.b, 0.7, 4);
      pline(t.x + rc, t.y - rc, t.x + rc - 26, t.y - rc, C.b, 0.7, 4); pline(t.x + rc, t.y - rc, t.x + rc, t.y - rc + 26, C.b, 0.7, 4);
      pline(t.x - rc, t.y + rc, t.x - rc + 26, t.y + rc, C.b, 0.7, 4); pline(t.x - rc, t.y + rc, t.x - rc, t.y + rc - 26, C.b, 0.7, 4);
      pline(t.x + rc, t.y + rc, t.x + rc - 26, t.y + rc, C.b, 0.7, 4); pline(t.x + rc, t.y + rc, t.x + rc, t.y + rc - 26, C.b, 0.7, 4);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var ti = targets.length - 1; ti >= 0; ti--) {
      var t = targets[ti];
      if (Math.hypot(tx - t.x, ty - t.y) < t.r + 24) {
        destroyed++; flash = 0.3; game.audio.play('se_success', 0.6);
        for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.7, col: C.c }); }
        targets.splice(ti, 1); if (destroyed >= NEEDED) { finish(true); return; } return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    radarAngle += dt * 1.2;
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.55, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.61, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL CLEAR!' : 'BREACHED', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
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
      nextSpawn -= dt; if (nextSpawn <= 0 && targets.length < 5) { spawnTarget(); nextSpawn = 0.7 + Math.random() * 0.7; }
      for (var ti = targets.length - 1; ti >= 0; ti--) {
        var t = targets[ti]; t.x += t.vx * dt; t.y += t.vy * dt; t.life -= dt;
        if (t.x < 60) { t.x = 60; t.vx = Math.abs(t.vx); } if (t.x > W - 60) { t.x = W - 60; t.vx = -Math.abs(t.vx); }
        if (t.y < 300) { t.y = 300; t.vy = Math.abs(t.vy); } if (t.y > H - 120) { t.y = H - 120; t.vy = -Math.abs(t.vy); }
        if (t.life <= 0) { targets.splice(ti, 1); escaped++; game.audio.play('se_failure', 0.3); if (escaped >= MAX_ESCAPE) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawTargets();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.b, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(destroyed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
