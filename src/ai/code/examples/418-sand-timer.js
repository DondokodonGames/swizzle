// 418-sand-timer.js
// 砂時計 — 上の砂が落ちきった瞬間から0.5秒以内にタップする、体内時計のジャストタイミング勝負
// 操作: 砂が空になった瞬間にタップ（早すぎ／遅すぎはミス）
// 成功: 3回 ジャストで決める  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、静かな机） ──
  var C = { bg:'#0a0e1c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', sand:'#ffb020' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SAND TIMER';
  var HOW_TO_PLAY = 'TAP THE INSTANT THE SAND RUNS OUT · NOT TOO EARLY OR LATE';
  var MAX_TIME = 20;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_MISS = 3;
  var WINDOW = 0.5;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var flipDur, sandLevel, iphase, emptyTimer, successes, misses, timeLeft, done, particles, flash, flashCol, wobble;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1428');
  }

  function background() { game.draw.clear(C.bg); }

  function newRound() { flipDur = 3 + Math.random() * 3; sandLevel = 1.0; iphase = 'running'; emptyTimer = 0; }

  function initGame() { successes = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; wobble = 0; newRound(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 700 + Math.ceil(timeLeft) * 100) : successes * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function miss() { misses++; flashCol = C.a; flash = 0.6; wobble = 1.0; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return true; } newRound(); return false; }

  function drawGlass() {
    var cx = W / 2, cy = H / 2, wob = Math.sin(wobble * 20) * wobble * 24, gw = 240, gh = 400, gx = cx - gw / 2 + wob, gy = cy - gh / 2;
    // 枠
    game.draw.rect(gx + 10, gy - 20, gw - 20, 20, '#3a4a6a', 0.9); game.draw.rect(gx + 10, gy + gh, gw - 20, 20, '#3a4a6a', 0.9);
    pline(gx + 30, gy, gx + 30, gy + gh, '#3a4a6a', 0.9, 8); pline(gx + gw - 30, gy, gx + gw - 30, gy + gh, '#3a4a6a', 0.9, 8);
    // ガラス輪郭
    pline(gx + 40, gy + 20, cx + wob, cy, C.e, 0.4, 4); pline(gx + gw - 40, gy + 20, cx + wob, cy, C.e, 0.4, 4);
    pline(cx + wob, cy, gx + 40, gy + gh - 20, C.e, 0.4, 4); pline(cx + wob, cy, gx + gw - 40, gy + gh - 20, C.e, 0.4, 4);
    // 上の砂
    if (sandLevel > 0) { var th = (gh / 2 - 40) * sandLevel; for (var y = 0; y < th; y += 8) { var w = (gw / 2 - 40) * (1 - y / (gh / 2 - 40)) * sandLevel + 8; game.draw.rect(snap(cx + wob - w), snap(cy - 20 - y), snap(w * 2), 8, C.sand, 0.9); } }
    // 下の砂
    var bh = (gh / 2 - 40) * (1 - sandLevel); for (var y2 = 0; y2 < bh; y2 += 8) { var w2 = (gw / 2 - 40) * (y2 / (gh / 2 - 40)) * (0.4 + 0.6 * (1 - sandLevel)) + 8; game.draw.rect(snap(cx + wob - w2), snap(gy + gh - 20 - y2), snap(w2 * 2), 8, C.f, 0.9); }
    if (iphase === 'running' && sandLevel > 0.01) { pline(cx + wob, cy - 8, cx + wob, cy + snap(gh * 0.2), C.sand, 0.8, 5); pc(cx + wob, cy + snap(gh * 0.2), 6, C.sand, 0.9); }
    if (iphase === 'empty') { var urg = Math.min(1, emptyTimer / WINDOW); ring(cx, cy, 110 + Math.sin(game.time.elapsed * 10) * 16, urg > 0.8 ? C.a : C.b, 0.4); txt('TAP!', cx, cy - gh / 2 - 60, 64, C.c); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (iphase === 'running') { miss(); }
    else if (iphase === 'empty') {
      if (emptyTimer <= WINDOW) { successes++; flashCol = C.b; flash = 0.8; game.audio.play('se_success', 0.6); for (var k = 0; k < 15; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: H / 2, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180 - 60, life: 0.7, col: C.c }); } if (successes >= NEEDED) { finish(true); return; } iphase = 'wait'; setTimeout(function() { if (!done && state === S.PLAYING) newRound(); }, 500); }
      else miss();
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (sandLevel === undefined) initGame(); background(); drawGlass();
      txt(GAME_TITLE, W / 2, H * 0.10, 76, C.c);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.905, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT TIMING!' : 'OFF BEAT', W / 2, H * 0.32, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.46, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.60, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2; if (wobble > 0) wobble -= dt * 4;
      if (iphase === 'running') { sandLevel -= dt / flipDur; if (sandLevel <= 0) { sandLevel = 0; iphase = 'empty'; emptyTimer = 0; game.audio.play('se_tap', 0.15); } }
      else if (iphase === 'empty') { emptyTimer += dt; if (emptyTimer > WINDOW + 1.2) { if (miss()) return; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawGlass();
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#0a1428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
