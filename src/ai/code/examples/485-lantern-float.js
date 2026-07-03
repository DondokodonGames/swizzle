// 485-lantern-float.js
// ランタン浮遊 — タップした場所へ漂うランタンを、迫るトゲ障害物から避けつつ高く昇らせる
// 操作: 昇らせたい方向をタップ（ランタンがそこへ引き寄せられる）。トゲに触れると爆発
// 成功: 高度500m 到達  失敗: 3回 爆発 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、灯籠流しの夜空） ──
  var C = { bg:'#050020', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'LANTERN FLOAT';
  var HOW_TO_PLAY = 'TAP TO PULL THE LANTERN · DODGE THE SPIKES · RISE HIGH';
  var MAX_TIME = 20;
  var GOAL      = 500;       // 修正2: 2000m → 500m
  var MAX_EXPLODE = 3;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lantern, hazards, stars, altitude, explosions, timeLeft, done, nextHazard, particles, target, flash, invincible;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#0a0035');
  }

  function altBar() {
    var t = Math.ceil(Math.min(1, altitude / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(W - 60, H - 120 - i * 72, 40, 60, i < t ? C.e : '#0a0035');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, H, '#0a0035', 0.5); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.4 + Math.sin(game.time.elapsed * 1.5 + si) * 0.3); }

  function initStars() { stars = []; for (var i = 0; i < 70; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: Math.random() < 0.5 ? 4 : 8 }); }

  function spawnHazard() {
    var side = Math.floor(Math.random() * 3), x, y, vx, vy, spd = 140 + Math.random() * 100 + altitude * 0.1;
    if (side === 0) { x = 80 + Math.random() * (W - 160); y = -60; vx = (Math.random() - 0.5) * spd * 0.5; vy = spd * 0.6; }
    else if (side === 1) { x = -60; y = 300 + Math.random() * H * 0.5; vx = spd; vy = (Math.random() - 0.5) * spd * 0.4; }
    else { x = W + 60; y = 300 + Math.random() * H * 0.5; vx = -spd; vy = (Math.random() - 0.5) * spd * 0.4; }
    hazards.push({ x: x, y: y, vx: vx, vy: vy, r: 26 + Math.random() * 18, life: 6 });
  }

  function initGame() { lantern = { x: W / 2, y: H * 0.7, vx: 0, vy: -30, r: 36 }; hazards = []; altitude = 0; explosions = 0; timeLeft = MAX_TIME; done = false; nextHazard = 1.2; particles = []; target = { x: W / 2, y: H * 0.5 }; flash = 0; invincible = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.floor(altitude) * 20 + Math.ceil(timeLeft) * 100) : Math.floor(altitude) * 12;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawLantern() {
    var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 12) % 2) : 1;
    if (blink) { pc(lantern.x, lantern.y, lantern.r + 12, C.c, 0.12); game.draw.rect(snap(lantern.x - lantern.r * 0.7), snap(lantern.y - lantern.r * 0.8), lantern.r * 1.4, lantern.r * 1.6, C.f, 0.9); pc(lantern.x, lantern.y, lantern.r * 0.5, C.c, 0.6); pc(lantern.x, lantern.y - lantern.r * 0.5, 12 + Math.sin(game.time.elapsed * 10) * 4, C.a, 0.8); }
  }

  function drawHazards() {
    for (var hi = 0; hi < hazards.length; hi++) { var h = hazards[hi]; pc(h.x, h.y, h.r, C.a, 0.85); pc(h.x, h.y, h.r * 0.4, C.c, 0.5); for (var sk = 0; sk < 6; sk++) { var a = (sk / 6) * Math.PI * 2 + game.time.elapsed * 2; pline(h.x + Math.cos(a) * h.r, h.y + Math.sin(a) * h.r, h.x + Math.cos(a) * (h.r + 14), h.y + Math.sin(a) * (h.r + 14), C.a, 0.8, 4); } }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    target = { x: tx, y: ty }; game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) { initStars(); initGame(); } background(); drawLantern();
      txt(GAME_TITLE, W / 2, H * 0.16, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background(); drawLantern();
      txt(resultSuccess ? 'SKYWARD!' : 'BURNED OUT', W / 2, H * 0.16, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.22, 52, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.28, 44, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; altitude += 30 * dt + Math.max(0, (H * 0.5 - lantern.y) / H) * 60 * dt;
      if (altitude >= GOAL) { finish(true); return; }
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (invincible > 0) invincible -= dt;
      var dx = target.x - lantern.x, dy = target.y - lantern.y; lantern.vx += dx * 1.8 * dt; lantern.vy += dy * 1.8 * dt;
      lantern.vy -= 50 * dt; lantern.vx *= 0.96; lantern.vy *= 0.97;
      var sp = Math.hypot(lantern.vx, lantern.vy); if (sp > 500) { lantern.vx = lantern.vx / sp * 500; lantern.vy = lantern.vy / sp * 500; }
      lantern.x += lantern.vx * dt; lantern.y += lantern.vy * dt;
      if (lantern.x < lantern.r + 20) { lantern.x = lantern.r + 20; lantern.vx = Math.abs(lantern.vx) * 0.7; } if (lantern.x > W - lantern.r - 20) { lantern.x = W - lantern.r - 20; lantern.vx = -Math.abs(lantern.vx) * 0.7; }
      if (lantern.y > H - lantern.r - 40) { lantern.y = H - lantern.r - 40; lantern.vy = -Math.abs(lantern.vy) * 0.7; } if (lantern.y < lantern.r + 300) { lantern.y = lantern.r + 300; lantern.vy = Math.abs(lantern.vy) * 0.5; }
      nextHazard -= dt; if (nextHazard <= 0) { spawnHazard(); nextHazard = 0.6 + Math.random() * 0.9; }
      for (var hi = hazards.length - 1; hi >= 0; hi--) {
        var h = hazards[hi]; h.x += h.vx * dt; h.y += h.vy * dt; h.life -= dt;
        if (invincible <= 0 && Math.hypot(lantern.x - h.x, lantern.y - h.y) < lantern.r + h.r - 8) {
          explosions++; flash = 0.6; invincible = 1.5; game.audio.play('se_failure', 0.6);
          for (var pi = 0; pi < 14; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: lantern.x, y: lantern.y, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, life: 0.7, col: C.a }); }
          hazards.splice(hi, 1); if (explosions >= MAX_EXPLODE) { finish(false); return; } continue;
        }
        if (h.x < -100 || h.x > W + 100 || h.y > H + 100 || h.life <= 0) hazards.splice(hi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawHazards(); drawLantern();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.12);

    altBar();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(altitude) + ' / ' + GOAL + 'm', W / 2, 168, 44, C.e);
    for (var ei = 0; ei < MAX_EXPLODE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_EXPLODE - 1) / 2) * 56) - 10, 224, 20, 20, ei < explosions ? C.a : '#0a0035');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
