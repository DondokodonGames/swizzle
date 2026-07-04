// 677-firefly.js
// ホタルハント — 森の闇に明滅するホタルが光った一瞬をタップで捕まえる
// 操作: 光っているホタルをタップ。暗い時は捕れない。放置すると飛び去ってしまう
// 成功: 10匹 捕獲  失敗: 3匹 逃走 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、夜の森） ──
  var C = { bg:'#000a02', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FIREFLY HUNT';
  var HOW_TO_PLAY = 'TAP EACH FIREFLY WHILE IT GLOWS · DO NOT LET THEM DRIFT AWAY';
  var MAX_TIME = 18;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var MAX_FLIES = 8, SPAWN_RATE = 0.85;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var flies, spawnTimer, caught, missed, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, stars;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#030a05');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) { var st = stars[si]; game.draw.rect(snap(st.x), snap(st.y), 8, 8, C.g, 0.15 + 0.2 * Math.sin(game.time.elapsed * 1.3 + st.phase)); } game.draw.rect(0, snap(H * 0.87), W, H * 0.13, '#071204', 0.95); }

  function spawnFly() { flies.push({ x: 100 + Math.random() * (W - 200), y: H * 0.18 + Math.random() * (H * 0.6), vx: (Math.random() - 0.5) * 55, vy: (Math.random() - 0.5) * 55, phase: Math.random() * Math.PI * 2, blinkPeriod: 1.3 + Math.random(), blinkOn: 0.4 + Math.random() * 0.14, lit: false, age: 0, maxAge: 6 + Math.random() * 4, tapped: false }); }

  function initGame() { flies = []; spawnTimer = 0; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; stars = []; for (var s = 0; s < 60; s++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.85, phase: Math.random() * Math.PI * 2 }); spawnFly(); spawnFly(); spawnFly(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var fi = 0; fi < flies.length; fi++) { var f = flies[fi]; if (f.lit) { pc(f.x, f.y, 30, C.d, 0.2); pc(f.x, f.y, 15, C.c, 0.95); } else pc(f.x, f.y, 8, '#1e3a0d', 0.45); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = flies.length - 1; i >= 0; i--) {
      var f = flies[i]; if (!f.lit || f.tapped) continue;
      var dx = tx - f.x, dy = ty - f.y;
      if (dx * dx + dy * dy < 72 * 72) {
        f.tapped = true; caught++; flash = 0.28; flashCol = C.b; resultText = 'CAUGHT!'; resultTimer = 0.45; game.audio.play('se_success', 0.45);
        for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: f.y, vx: Math.cos(pa) * 130, vy: Math.sin(pa) * 130, life: 0.5, col: C.c }); }
        if (caught >= NEEDED) { finish(true); return; } break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!flies) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.58, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'NIGHT HUNTER!' : 'THEY FLEW OFF', W / 2, H * 0.35, 56, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      spawnTimer += dt; if (spawnTimer >= SPAWN_RATE && flies.length < MAX_FLIES) { spawnTimer = 0; spawnFly(); }
      for (var i = flies.length - 1; i >= 0; i--) {
        var f = flies[i]; if (f.tapped) { flies.splice(i, 1); continue; }
        f.age += dt; f.phase += dt; f.lit = (f.phase % f.blinkPeriod) < f.blinkOn;
        f.x += f.vx * dt; f.y += f.vy * dt; f.vx += (Math.random() - 0.5) * 50 * dt; f.vy += (Math.random() - 0.5) * 50 * dt;
        var spd = Math.sqrt(f.vx * f.vx + f.vy * f.vy); if (spd > 80) { f.vx = f.vx / spd * 80; f.vy = f.vy / spd * 80; }
        if (f.x < 60) f.vx = Math.abs(f.vx); if (f.x > W - 60) f.vx = -Math.abs(f.vx); if (f.y < H * 0.14) f.vy = Math.abs(f.vy); if (f.y > H * 0.84) f.vy = -Math.abs(f.vy);
        if (f.age >= f.maxAge) { if (f.lit) { missed++; flash = 0.22; flashCol = C.a; resultText = 'ESCAPED!'; resultTimer = 0.35; game.audio.play('se_failure', 0.18); if (missed >= MAX_MISS) { finish(false); return; } } flies.splice(i, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.07);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#030a05');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);
