// 519-firefly-catch.js
// ホタル捕獲 — 暗闇でふわふわ舞うホタルが光った瞬間にタップして捕まえる
// 操作: 光っているホタルをタップ（暗い間は捕まえられない・逃がすとミス）
// 成功: 6匹 捕獲  失敗: 3匹 逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、蛍の草むら） ──
  var C = { bg:'#000800', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FIREFLY CATCH';
  var HOW_TO_PLAY = 'TAP EACH FIREFLY ONLY WHILE IT GLOWS';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_ESCAPE = 3;        // 修正2: 10 → 3
  var GROUND_Y = snap(H * 0.86);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var flies, caught, escaped, timeLeft, done, particles, nextSpawn, stars, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.3 + Math.sin(game.time.elapsed * 2 + si) * 0.2); game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#031a05', 0.9); }

  function initStars() { stars = []; for (var i = 0; i < 50; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * GROUND_Y * 0.7), r: Math.random() < 0.5 ? 4 : 8 }); }

  function spawnFly() { flies.push({ x: snap(80 + Math.random() * (W - 160)), y: snap(H * 0.18 + Math.random() * (GROUND_Y - H * 0.24)), vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, r: 22, lit: true, litTimer: 0.5 + Math.random(), darkTimer: 0, DARK: 0.4 + Math.random() * 0.5, LIT: 0.5 + Math.random(), life: 3 + Math.random() * 2 }); }

  function initGame() { flies = []; caught = 0; escaped = 0; timeLeft = MAX_TIME; done = false; particles = []; nextSpawn = 0.5; flash = 0; flashCol = C.b; spawnFly(); spawnFly(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFlies() { for (var fi = 0; fi < flies.length; fi++) { var f = flies[fi]; if (f.lit) { pc(f.x, f.y, f.r + 14, C.d, 0.1); pc(f.x, f.y, f.r, C.b, 0.9); pc(f.x, f.y - 6, 8, '#0a2a00', 0.9); } else pc(f.x, f.y, 8, '#0a1505', 0.4); } }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = flies.length - 1; i >= 0; i--) { var f = flies[i]; if (!f.lit) continue; if (Math.hypot(tx - f.x, ty - f.y) < f.r + 40) { caught++; flash = 0.3; flashCol = C.b; game.audio.play('se_tap', 0.4); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: f.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.5, col: C.c }); } flies.splice(i, 1); if (caught >= NEEDED) { finish(true); return; } break; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) { initStars(); initGame(); } background(); drawFlies();
      txt(GAME_TITLE, W / 2, H * 0.16, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JAR FULL!' : 'THEY ESCAPED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      nextSpawn -= dt; if (nextSpawn <= 0) { if (flies.length < 6) spawnFly(); nextSpawn = 0.5 + Math.random() * 0.7; }
      for (var fi = flies.length - 1; fi >= 0; fi--) {
        var f = flies[fi]; f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < 40 || f.x > W - 40) { f.vx = -f.vx; f.x = Math.max(40, Math.min(W - 40, f.x)); } if (f.y < H * 0.14 || f.y > GROUND_Y - 20) f.vy = -f.vy;
        f.vx += (Math.random() - 0.5) * 30 * dt; f.vy += (Math.random() - 0.5) * 30 * dt; var sp = Math.hypot(f.vx, f.vy); if (sp > 120) { f.vx = f.vx / sp * 120; f.vy = f.vy / sp * 120; }
        if (f.lit) { f.litTimer -= dt; if (f.litTimer <= 0) { f.lit = false; f.darkTimer = f.DARK; } } else { f.darkTimer -= dt; if (f.darkTimer <= 0) { f.lit = true; f.litTimer = f.LIT; } }
        f.life -= dt; if (f.life <= 0) { escaped++; flies.splice(fi, 1); flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.2); if (escaped >= MAX_ESCAPE) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawFlies();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
