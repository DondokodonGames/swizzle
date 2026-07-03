// 595-shimmer-catch.js
// シマーキャッチ — 水面のゆらぎに隠れて泳ぐ魚の光る影を、位置を読んでタップで網ですくう
// 操作: 魚のシマー（青い光の影）をタップして網を投げる。ズレるとハズレ
// 成功: 6匹 捕獲  失敗: 3回 空振り or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、夜の水辺） ──
  var C = { bg:'#000510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SHIMMER CATCH';
  var HOW_TO_PLAY = 'TAP THE GLOWING SHIMMER TO NET THE FISH HIDDEN UNDER THE WATER';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var WATER_Y = snap(H * 0.30);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var fishes, netAnim, caught, misses, timeLeft, done, particles, flash, flashCol, waves, nextFish, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha, w) { w = w || 6; var n = Math.max(8, Math.ceil(r / 6)); for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; game.draw.rect(snap(cx + Math.cos(a) * r) - w / 2, snap(cy + Math.sin(a) * r) - w / 2, w, w, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#001830');
  }

  function background() {
    game.draw.clear(C.bg); game.draw.rect(0, 0, W, WATER_Y, '#001020', 0.8); game.draw.rect(0, WATER_Y, W, H - WATER_Y, '#001830', 0.9);
    for (var si = 0; si < 6; si++) game.draw.rect(0, WATER_Y + si * 4, W, 2, C.e, 0.3 - si * 0.04);
    for (var wi = 0; wi < waves.length; wi++) ring(waves[wi].x, waves[wi].y, waves[wi].r, C.e, waves[wi].alpha, 4);
  }

  function spawnFish() { var side = Math.random() < 0.5 ? -1 : 1, x = side < 0 ? -60 : W + 60, y = WATER_Y + 100 + Math.random() * (H - WATER_Y - 300), sp = 90 + Math.random() * 70; fishes.push({ x: x, y: y, vx: side * sp, vy: (Math.random() - 0.5) * 40, r: 30 + Math.random() * 12, phase: Math.random() * Math.PI * 2, sx: x, sy: y }); }

  function initGame() { fishes = []; netAnim = null; caught = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; waves = []; nextFish = 0.8; resultText = ''; resultTimer = 0; spawnFish(); spawnFish(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 700 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var fi = 0; fi < fishes.length; fi++) { var f = fishes[fi]; if (f.sx < 0 || f.sx > W) continue; var sa = 0.3 + Math.sin(f.phase * 3) * 0.15; pc(f.sx, f.sy, f.r * 1.3, C.d, sa * 0.5); pc(f.sx, f.sy, f.r * 0.6, C.e, sa * 0.4); }
    if (netAnim) { var na = netAnim.timer / 0.5; ring(netAnim.x, netAnim.y, netAnim.r, netAnim.hit ? C.b : C.c, na * 0.6, 6); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || netAnim) return;
    netAnim = { x: tx, y: ty, r: 0, timer: 0.5, hit: false }; game.audio.play('se_tap', 0.3);
    var hit = -1; for (var fi = 0; fi < fishes.length; fi++) { var f = fishes[fi]; if ((tx - f.sx) * (tx - f.sx) + (ty - f.sy) * (ty - f.sy) < (f.r + 50) * (f.r + 50)) { hit = fi; break; } }
    if (hit >= 0) {
      var f2 = fishes[hit]; netAnim.hit = true; caught++; flash = 0.2; flashCol = C.b; resultText = 'CAUGHT!'; resultTimer = 0.6; game.audio.play('se_success', 0.7);
      for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: f2.sx, y: f2.sy, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: C.c }); }
      waves.push({ x: f2.sx, y: f2.sy, r: 0, alpha: 0.6 }); fishes.splice(hit, 1); if (caught >= NEEDED) { finish(true); return; }
    } else { misses++; flash = 0.2; flashCol = C.a; resultText = 'MISS'; resultTimer = 0.5; game.audio.play('se_failure', 0.25); waves.push({ x: tx, y: ty, r: 0, alpha: 0.3 }); if (misses >= MAX_MISS) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!fishes) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FULL NET!' : 'THEY SLIPPED', W / 2, H * 0.22, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.32, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.38, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (resultTimer > 0) resultTimer -= dt;
      nextFish -= dt; if (nextFish <= 0) { if (fishes.length < 4) spawnFish(); nextFish = 0.8 + Math.random() * 0.7; }
      for (var fi = fishes.length - 1; fi >= 0; fi--) {
        var f = fishes[fi]; f.x += f.vx * dt; f.y += f.vy * dt; f.phase += dt * 2;
        var off = 20 + Math.sin(f.phase) * 15; f.sx = f.x + Math.sin(f.phase * 1.7) * off; f.sy = f.y + Math.cos(f.phase * 2.3) * off * 0.5;
        if (f.y < WATER_Y + f.r) { f.y = WATER_Y + f.r; f.vy = Math.abs(f.vy); } if (f.y > H - 120 - f.r) { f.y = H - 120 - f.r; f.vy = -Math.abs(f.vy); }
        if (f.x < -120 || f.x > W + 120) fishes.splice(fi, 1);
      }
      if (netAnim) { netAnim.timer -= dt; netAnim.r = (1 - netAnim.timer / 0.5) * 80; if (netAnim.timer <= 0) netAnim = null; }
      for (var wi = waves.length - 1; wi >= 0; wi--) { waves[wi].r += 150 * dt; waves[wi].alpha -= dt * 2.5; if (waves[wi].alpha <= 0) waves.splice(wi, 1); }
      if (Math.random() < 0.2) waves.push({ x: Math.random() * W, y: WATER_Y + Math.random() * (H - WATER_Y - 120), r: 0, alpha: 0.12 });
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.86), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#001830');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
