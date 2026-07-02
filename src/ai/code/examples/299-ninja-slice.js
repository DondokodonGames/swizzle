// 299-ninja-slice.js
// 忍者スライス — 宙に舞う的をスワイプで斬り、黒い爆弾は絶対に斬らない道場アクション
// 操作: スワイプで的を斬る（爆弾を斬るとダメージ）
// 成功: 的を5個斬る  失敗: 爆弾を3回斬る or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、忍者道場） ──
  var C = { bg:'#0a0208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var TCOLS = [C.a, C.c, C.b, C.e];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NINJA SLICE';
  var HOW_TO_PLAY = 'SWIPE TO SLICE TARGETS · NEVER CUT THE BOMB';
  var MAX_TIME = 15;
  var NEEDED   = 5;          // 修正2: 40 → 5
  var MAX_BOMB = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var objs, sliced, bombHits, timeLeft, done, spawnTimer, particles, trail, trailTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0a12');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnObj() {
    var isBomb = Math.random() < 0.22, fromLeft = Math.random() < 0.5;
    var x = fromLeft ? -80 : W + 80, y = snap(H * (0.4 + Math.random() * 0.4)), spd = 550 + Math.random() * 350;
    var vx = fromLeft ? spd * (0.4 + Math.random() * 0.4) : -spd * (0.4 + Math.random() * 0.4);
    objs.push({ x: x, y: y, vx: vx, vy: -560 - Math.random() * 360, r: isBomb ? 54 : 48, bomb: isBomb, col: isBomb ? '#181828' : TCOLS[Math.floor(Math.random() * TCOLS.length)], sliced: false, anim: 0 });
  }

  function initGame() { objs = []; sliced = 0; bombHits = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; particles = []; trail = []; trailTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sliced * 400 + Math.ceil(timeLeft) * 100) : sliced * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawObj(o) {
    if (o.sliced) { pc(o.x - 18 * (1 - o.anim), o.y, o.r * o.anim, o.col, o.anim * 0.8); pc(o.x + 18 * (1 - o.anim), o.y, o.r * o.anim, o.col, o.anim * 0.8); return; }
    if (o.bomb) {
      ring(o.x, o.y, o.r + 8, C.a, 0.5); pc(o.x, o.y, o.r, o.col, 0.95); pc(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.25, C.d, 0.5);
      pline(o.x + o.r * 0.4, o.y - o.r, o.x + o.r * 0.4 + 10, o.y - o.r - 24, C.f, 0.9, 6);
      pc(o.x + o.r * 0.4 + 12, o.y - o.r - 30, 8 + 4 * (Math.floor(game.time.elapsed * 8) % 2), C.c, 0.9);
    } else {
      ring(o.x, o.y, o.r + 6, o.col, 0.4); pc(o.x, o.y, o.r, o.col, 0.9); pc(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.22, C.g, 0.5);
    }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    trail = { x1: x1, y1: y1, x2: x2, y2: y2 }; trailTimer = 0.15;
    for (var oi = objs.length - 1; oi >= 0; oi--) {
      var o = objs[oi]; if (o.sliced) continue;
      var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); if (len < 1) continue;
      var t = Math.max(0, Math.min(1, ((o.x - x1) * dx + (o.y - y1) * dy) / (len * len)));
      var cx = x1 + t * dx, cy = y1 + t * dy, dist = Math.hypot(o.x - cx, o.y - cy);
      if (dist < o.r + 20) {
        o.sliced = true; o.anim = 1;
        if (o.bomb) { bombHits++; game.audio.play('se_failure', 0.7); for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: o.x, y: o.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 - 100, life: 0.7, col: C.f }); } if (bombHits >= MAX_BOMB) { finish(false); return; } }
        else { sliced++; game.audio.play('se_success', 0.35); for (var k2 = 0; k2 < 8; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: o.x, y: o.y, vx: Math.cos(a2) * 250, vy: Math.sin(a2) * 250 - 50, life: 0.5, col: o.col }); } if (sliced >= NEEDED) { finish(true); return; } }
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawObj({ x: W * 0.35, y: H * 0.5, r: 48, bomb: false, col: C.c, sliced: false }); drawObj({ x: W * 0.65, y: H * 0.55, r: 54, bomb: true, col: '#181828', sliced: false });
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MASTER CUT!' : 'BOOM!', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (trailTimer > 0) trailTimer -= dt;
      spawnTimer -= dt; if (spawnTimer <= 0) { var n = Math.random() < 0.3 ? 2 : 1; for (var s = 0; s < n; s++) spawnObj(); spawnTimer = 0.7 + Math.random() * 0.5; }
      for (var oi = objs.length - 1; oi >= 0; oi--) {
        var o = objs[oi];
        if (!o.sliced) { o.x += o.vx * dt; o.y += o.vy * dt; o.vy += 700 * dt; } else { o.anim -= dt * 2; }
        if (o.y > H + 120 || o.x < -220 || o.x > W + 220 || o.anim < 0) objs.splice(oi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var oi2 = 0; oi2 < objs.length; oi2++) drawObj(objs[oi2]);
    if (trailTimer > 0 && trail.x1 !== undefined) pline(trail.x1, trail.y1, trail.x2, trail.y2, C.g, trailTimer / 0.15, 8);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sliced + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var bi = 0; bi < MAX_BOMB; bi++) game.draw.rect(snap(W / 2 + (bi - (MAX_BOMB - 1) / 2) * 56) - 10, 224, 20, 20, bi < bombHits ? C.a : '#1a0a12');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
