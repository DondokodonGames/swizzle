// 408-fishing-line.js
// 釣り糸 — タップで釣り針の深さを上下に切り替え、泳いでくる魚の層に合わせて引っ掛けて釣る
// 操作: タップで針を降ろす／上げるを切り替え、魚に重なると釣れる
// 成功: 4匹 釣る  失敗: 3匹 逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、桟橋の釣り） ──
  var C = { bg:'#020c1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', water:'#0c2a4a' };
  var FISH = [C.f, C.b, C.d, C.a, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FISHING LINE';
  var HOW_TO_PLAY = 'TAP TO RAISE/LOWER THE HOOK · SNAG THE FISH';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_MISSED = 3;
  var ROD_X = snap(W / 2), ROD_Y = snap(H * 0.12), WATER_Y = snap(H * 0.24), MAX_DEPTH = H - snap(H * 0.24) - 80;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var hookY, pressing, fishes, spawnTimer, caught, missed, timeLeft, done, particles, bubbles, catchAnim;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2e');
  }

  function background() {
    game.draw.clear(C.bg); game.draw.rect(0, WATER_Y, W, H, C.water, 0.9); game.draw.rect(0, WATER_Y - 4, W, 6, C.e, 0.5);
    for (var bi = 0; bi < bubbles.length; bi++) pc(bubbles[bi].x, bubbles[bi].y, bubbles[bi].r, C.e, bubbles[bi].life * 0.3);
  }

  function spawnFish() { var depth = snap(WATER_Y + 80 + Math.random() * (MAX_DEPTH - 80)), side = Math.random() < 0.5; fishes.push({ x: side ? -80 : W + 80, y: depth, vx: (side ? 1 : -1) * (80 + Math.random() * 50), col: FISH[Math.floor(Math.random() * 5)], size: 28 + Math.random() * 14, wobble: Math.random() * Math.PI * 2, caught: false }); }

  function initGame() { hookY = WATER_Y + 40; pressing = false; fishes = []; spawnTimer = 0.5; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; bubbles = []; catchAnim = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFish(f) {
    var wy = Math.sin(f.wobble) * 6, right = f.vx > 0;
    pc(f.x, f.y + wy, f.size, f.col, 0.9); pc(f.x + (right ? -f.size : f.size), f.y + wy, f.size * 0.55, f.col, 0.7);
    pc(f.x + (right ? f.size * 0.35 : -f.size * 0.35), f.y + wy - 6, 8, C.g, 0.9); pc(f.x + (right ? f.size * 0.4 : -f.size * 0.4), f.y + wy - 6, 4, '#111', 0.9);
  }

  function drawHook() { pline(ROD_X, ROD_Y, ROD_X, hookY, C.g, 0.6, 4); pc(ROD_X, hookY, 14, C.g, 0.9); pc(ROD_X, hookY + 18, 8, C.e, 0.8); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; pressing = !pressing; game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!fishes) initGame(); background(); drawFish({ x: W * 0.3, y: H * 0.5, vx: 60, col: C.f, size: 32, wobble: 0 }); drawFish({ x: W * 0.7, y: H * 0.6, vx: -60, col: C.b, size: 32, wobble: 1 }); drawHook();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BIG HAUL!' : 'GOT AWAY', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (catchAnim > 0) catchAnim -= dt * 2;
      hookY = pressing ? Math.min(WATER_Y + MAX_DEPTH, hookY + 600 * dt) : Math.max(WATER_Y + 20, hookY - 300 * dt);
      spawnTimer -= dt; if (spawnTimer <= 0 && fishes.length < 6) { spawnFish(); if (Math.random() < 0.3) spawnFish(); spawnTimer = 1.2 + Math.random() * 1.0; }
      for (var fi = fishes.length - 1; fi >= 0; fi--) {
        var f = fishes[fi]; if (f.caught) continue; f.x += f.vx * dt; f.wobble += dt * 3;
        if (Math.abs(f.x - ROD_X) < f.size + 18 && Math.abs(f.y - hookY) < f.size + 22) { f.caught = true; caught++; catchAnim = 0.6; game.audio.play('se_success', 0.5); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: f.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.6, col: f.col }); } fishes.splice(fi, 1); if (caught >= NEEDED) { finish(true); return; } continue; }
        if (f.x < -160 || f.x > W + 160) { missed++; game.audio.play('se_failure', 0.2); fishes.splice(fi, 1); if (missed >= MAX_MISSED) { finish(false); return; } }
      }
      if (Math.random() < 0.2) bubbles.push({ x: snap(ROD_X + (Math.random() - 0.5) * 60), y: hookY, vy: -40 - Math.random() * 60, life: 1.5, r: 4 + Math.random() * 6 });
      for (var bi = bubbles.length - 1; bi >= 0; bi--) { bubbles[bi].y += bubbles[bi].vy * dt; bubbles[bi].life -= dt; if (bubbles[bi].life <= 0 || bubbles[bi].y < WATER_Y) bubbles.splice(bi, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var fi2 = 0; fi2 < fishes.length; fi2++) drawFish(fishes[fi2]);
    drawHook();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (catchAnim > 0) game.draw.rect(0, 0, W, H, C.b, catchAnim * 0.08);
    txt(pressing ? 'DIVING' : 'RISING', W / 2, ROD_Y + 56, 40, C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISSED; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISSED - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#0a1a2e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
