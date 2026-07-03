// 515-meteor-shield.js
// メテオシールド — 落ちてくる隕石の落下地点をタップしてシールドを張り、基地を守る
// 操作: 隕石が来る位置をタップしてシールドを展開（触れた隕石を弾く）
// 成功: 8個 防ぐ  失敗: 3個 通過 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、防衛基地） ──
  var C = { bg:'#000010', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'METEOR SHIELD';
  var HOW_TO_PLAY = 'TAP WHERE A METEOR FALLS TO RAISE A SHIELD';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 25 → 8
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var BASE_Y = snap(H * 0.86), SHIELD_R = 90, SHIELD_DUR = 0.45;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var meteors, shields, particles, stars, blocked, missed, timeLeft, done, nextMeteor, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a20');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < stars.length; si++) game.draw.rect(stars[si].x, stars[si].y, stars[si].r, stars[si].r, C.g, 0.4 + Math.sin(game.time.elapsed * 2 + si) * 0.3); game.draw.rect(0, BASE_Y, W, H - BASE_Y, C.b, 0.25); game.draw.rect(0, BASE_Y, W, 8, C.b, 0.6); }

  function initStars() { stars = []; for (var i = 0; i < 60; i++) stars.push({ x: snap(Math.random() * W), y: snap(Math.random() * H), r: Math.random() < 0.5 ? 4 : 8 }); }

  function spawnMeteor() { meteors.push({ x: snap(60 + Math.random() * (W - 120)), y: -40, vy: 380 + blocked * 20, r: 22 + Math.random() * 14, col: Math.random() < 0.3 ? C.a : C.f }); }

  function initGame() { meteors = []; shields = []; particles = []; blocked = 0; missed = 0; timeLeft = MAX_TIME; done = false; nextMeteor = 0.7; flash = 0; flashCol = C.b; spawnMeteor(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (blocked * 500 + Math.ceil(timeLeft) * 100) : blocked * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var shi = 0; shi < shields.length; shi++) { var sh = shields[shi], al = sh.life / SHIELD_DUR; ring(sh.x, sh.y, SHIELD_R, C.e, al * 0.8); pc(sh.x, sh.y, SHIELD_R * 0.5, C.d, al * 0.3); }
    for (var mi = 0; mi < meteors.length; mi++) { var m = meteors[mi]; game.draw.rect(snap(m.x) - 3, snap(m.y - m.r - 30), 6, 24, C.c, 0.6); pc(m.x, m.y, m.r, m.col, 0.9); pc(m.x - m.r * 0.25, m.y - m.r * 0.25, m.r * 0.2, C.g, 0.3); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    shields.push({ x: tx, y: ty, life: SHIELD_DUR }); game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!stars) { initStars(); initGame(); } background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.36, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BASE SECURE!' : 'BASE HIT', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      nextMeteor -= dt; if (nextMeteor <= 0) { spawnMeteor(); if (blocked > 3 && Math.random() < 0.4) spawnMeteor(); nextMeteor = Math.max(0.4, 0.8 - blocked * 0.03); }
      for (var shi = shields.length - 1; shi >= 0; shi--) { shields[shi].life -= dt; if (shields[shi].life <= 0) shields.splice(shi, 1); }
      for (var mi = meteors.length - 1; mi >= 0; mi--) {
        var m = meteors[mi]; m.y += m.vy * dt; var hit = false;
        for (var shi2 = 0; shi2 < shields.length; shi2++) { var sh = shields[shi2]; if (Math.hypot(m.x - sh.x, m.y - sh.y) < SHIELD_R + m.r) { blocked++; game.audio.play('se_success', 0.5); for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: m.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.4, col: C.c }); } meteors.splice(mi, 1); hit = true; flash = 0.2; if (blocked >= NEEDED) { finish(true); return; } break; } }
        if (hit) continue;
        if (m.y > BASE_Y) { missed++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.5); for (var pi2 = 0; pi2 < 10; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: m.x, y: BASE_Y, vx: Math.cos(a2) * 150, vy: Math.sin(a2) * 150 - 80, life: 0.5, col: C.a }); } meteors.splice(mi, 1); if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(blocked + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi2 = 0; mi2 < MAX_MISS; mi2++) game.draw.rect(snap(W / 2 + (mi2 - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi2 < missed ? C.a : '#0a0a20');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initStars();
    initGame();
  });
})(game);
