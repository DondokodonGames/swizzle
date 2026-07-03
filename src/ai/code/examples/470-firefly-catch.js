// 470-firefly-catch.js
// ホタル捕獲 — 暗闇でほんの一瞬だけ光るホタルを、光っている間にタップして捕まえる
// 操作: 光った瞬間のホタルをタップ（光っていない間は捕まえられない）
// 成功: 6匹 捕獲  失敗: 3匹 逃がす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、真夏の夜の草むら） ──
  var C = { bg:'#000a00', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FIREFLY CATCH';
  var HOW_TO_PLAY = 'TAP THE FIREFLIES ONLY WHILE THEY GLOW';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var fireflies, particles, caught, missed, timeLeft, done, nextSpawn, flash, flashCol;

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

  function background() { game.draw.clear(C.bg); game.draw.rect(0, H * 0.88, W, H * 0.12, '#031a05', 0.9); }

  function spawnFirefly() { fireflies.push({ x: snap(120 + Math.random() * (W - 240)), y: snap(H * 0.16 + Math.random() * (H * 0.66)), vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 60, litTimer: 0, waitTimer: 0.8 + Math.random() * 1.6, litDur: 0.4 + Math.random() * 0.4, lit: false, life: 4 + Math.random() * 3 }); }

  function initGame() { fireflies = []; particles = []; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; nextSpawn = 0.5; flash = 0; flashCol = C.b; spawnFirefly(); spawnFirefly(); spawnFirefly(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFireflies() {
    for (var fi = 0; fi < fireflies.length; fi++) { var f = fireflies[fi]; if (f.lit) { pc(f.x, f.y, 40, C.d, 0.12); pc(f.x, f.y, 22, C.c, 0.6); pc(f.x, f.y, 12, C.b, 1.0); } else pc(f.x, f.y, 8, '#0a1505', 0.6); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var fi = fireflies.length - 1; fi >= 0; fi--) {
      var f = fireflies[fi]; if (!f.lit) continue;
      if (Math.hypot(tx - f.x, ty - f.y) < 60) {
        for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: f.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.7, col: C.c }); }
        fireflies.splice(fi, 1); caught++; flash = 0.3; flashCol = C.b; game.audio.play('se_tap', 0.5);
        if (caught >= NEEDED) { finish(true); return; }
        break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!fireflies) initGame(); background(); drawFireflies();
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
      txt(resultSuccess ? 'JAR FULL!' : 'THEY FLEW OFF', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      nextSpawn -= dt; if (nextSpawn <= 0) { if (fireflies.length < 6) spawnFirefly(); nextSpawn = 0.6 + Math.random() * 0.8; }
      for (var fi = fireflies.length - 1; fi >= 0; fi--) {
        var f = fireflies[fi]; f.life -= dt;
        f.vx += (Math.random() - 0.5) * 30 * dt; f.vy += (Math.random() - 0.5) * 30 * dt; f.vx *= 0.98; f.vy *= 0.98;
        var sp = Math.hypot(f.vx, f.vy); if (sp > 90) { f.vx = f.vx / sp * 90; f.vy = f.vy / sp * 90; }
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < 60) { f.x = 60; f.vx = Math.abs(f.vx); } if (f.x > W - 60) { f.x = W - 60; f.vx = -Math.abs(f.vx); }
        if (f.y < H * 0.12) { f.y = H * 0.12; f.vy = Math.abs(f.vy); } if (f.y > H * 0.84) { f.y = H * 0.84; f.vy = -Math.abs(f.vy); }
        if (f.lit) { f.litTimer -= dt; if (f.litTimer <= 0) { f.lit = false; f.waitTimer = 0.7 + Math.random() * 1.6; } }
        else { f.waitTimer -= dt; if (f.waitTimer <= 0) { f.lit = true; f.litTimer = f.litDur; } }
        if (f.life <= 0) { fireflies.splice(fi, 1); missed++; flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.2); if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawFireflies();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#002200');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
