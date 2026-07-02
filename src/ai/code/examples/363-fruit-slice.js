// 363-fruit-slice.js
// フルーツスライス — 打ち上がるフルーツをスワイプで斬る。黒い爆弾は斬らず、落とさないように
// 操作: スワイプで斬る（爆弾を斬るとダメージ、フルーツを落とすとミス）
// 成功: 6個 斬る  失敗: 爆弾3回 or フルーツ3個逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、フルーツ道場） ──
  var C = { bg:'#070510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FRUIT = [C.a, C.f, C.b, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FRUIT SLICE';
  var HOW_TO_PLAY = 'SWIPE TO SLICE FRUIT · AVOID THE BOMBS';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 30 → 6
  var MAX_BOMB = 3;
  var MAX_MISS = 3;          // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var fruits, cut, bombHits, missed, timeLeft, done, spawnTimer, particles, trail, trailTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100820');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnFruit() { var bomb = Math.random() < 0.22; fruits.push({ x: snap(W * 0.15 + Math.random() * W * 0.7), y: H + 50, vx: (Math.random() - 0.5) * 260, vy: -760 - Math.random() * 240, r: 46, col: bomb ? '#181828' : FRUIT[Math.floor(Math.random() * 4)], bomb: bomb, sliced: false }); }

  function initGame() { fruits = []; cut = 0; bombHits = 0; missed = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; particles = []; trail = null; trailTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (cut * 400 + Math.ceil(timeLeft) * 100) : cut * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFruit(f) {
    if (f.bomb) { ring(f.x, f.y, f.r + 8, C.a, 0.5); pc(f.x, f.y, f.r, f.col, 0.95); pc(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.22, C.d, 0.5); pline(f.x + f.r * 0.4, f.y - f.r, f.x + f.r * 0.4 + 10, f.y - f.r - 24, C.f, 0.9, 6); pc(f.x + f.r * 0.4 + 12, f.y - f.r - 30, 8 + 4 * (Math.floor(game.time.elapsed * 8) % 2), C.c, 0.9); }
    else { pc(f.x, f.y, f.r, f.col, 0.9); pc(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.22, C.g, 0.5); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    trail = { x1: x1, y1: y1, x2: x2, y2: y2 }; trailTimer = 0.2;
    for (var fi = fruits.length - 1; fi >= 0; fi--) {
      var f = fruits[fi]; if (f.sliced) continue;
      var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); if (len < 1) continue;
      var t = Math.max(0, Math.min(1, ((f.x - x1) * dx + (f.y - y1) * dy) / (len * len)));
      var cx = x1 + t * dx, cy = y1 + t * dy;
      if (Math.hypot(f.x - cx, f.y - cy) < f.r) {
        f.sliced = true;
        if (f.bomb) { bombHits++; game.audio.play('se_failure', 0.7); for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: f.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 0.7, col: C.f }); } if (bombHits >= MAX_BOMB) { finish(false); return; } }
        else { cut++; game.audio.play('se_tap', 0.4); for (var k2 = 0; k2 < 8; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: f.y, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200 - 100, life: 0.5, col: f.col }); } if (cut >= NEEDED) { finish(true); return; } }
        fruits.splice(fi, 1);
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawFruit({ x: W * 0.35, y: H * 0.5, r: 46, col: C.f, bomb: false }); drawFruit({ x: W * 0.65, y: H * 0.55, r: 46, col: '#181828', bomb: true });
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
      txt(resultSuccess ? 'SLICED!' : 'GAME OVER', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
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
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnFruit(); if (Math.random() < 0.3) spawnFruit(); spawnTimer = 0.7 + Math.random() * 0.5; }
      for (var fi = fruits.length - 1; fi >= 0; fi--) {
        var f = fruits[fi]; f.vy += 600 * dt; f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.y > H + 100) { if (!f.bomb && !f.sliced) { missed++; if (missed >= MAX_MISS) { finish(false); return; } } fruits.splice(fi, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var fi2 = 0; fi2 < fruits.length; fi2++) drawFruit(fruits[fi2]);
    if (trailTimer > 0 && trail) pline(trail.x1, trail.y1, trail.x2, trail.y2, C.g, trailTimer / 0.2, 8);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt('MISS ' + missed + '/' + MAX_MISS, W * 0.78, snap(H * 0.90), 34, missed > 0 ? C.a : '#667');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(cut + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var bi = 0; bi < MAX_BOMB; bi++) game.draw.rect(snap(W / 2 + (bi - (MAX_BOMB - 1) / 2) * 56) - 10, 224, 20, 20, bi < bombHits ? C.a : '#100820');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
