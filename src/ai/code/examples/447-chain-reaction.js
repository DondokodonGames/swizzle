// 447-chain-reaction.js
// 連鎖爆発 — たった1発のタップで球を爆発させ、爆風が次々に球へ連鎖する大連鎖を狙う
// 操作: 球を1つタップして起爆（爆風に触れた球も連鎖爆発する）
// 成功: 8連鎖 以上を2回  失敗: 3回 届かず or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、実験場） ──
  var C = { bg:'#0a0500', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = [C.a, C.f, C.c, C.b, C.e, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CHAIN REACTION';
  var HOW_TO_PLAY = 'TAP ONE BALL · THE BLAST CHAINS · GO FOR 8+';
  var MAX_TIME = 20;
  var TARGET_CHAIN = 8;      // 修正2: 15 → 8
  var NEEDED   = 2;          // 修正2: 3 → 2
  var MAX_MISS = 3;
  var BALL_R = 28, EXPLODE_R = 100;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, explosions, particles, iphase, chainCount, resultTimer, tries, succeeded, timeLeft, done, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1000');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBalls() { balls = []; var count = 16 + Math.floor(Math.random() * 6); for (var i = 0; i < count; i++) balls.push({ x: snap(BALL_R * 2 + Math.random() * (W - BALL_R * 4)), y: snap(260 + Math.random() * (H * 0.6)), col: COLORS[Math.floor(Math.random() * COLORS.length)], exploded: false, r: BALL_R }); explosions = []; chainCount = 0; iphase = 'aim'; }

  function initGame() { particles = []; tries = 0; succeeded = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; spawnBalls(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (succeeded * 800 + Math.ceil(timeLeft) * 100) : succeeded * 300;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function explode(x, y, col) { explosions.push({ x: x, y: y, col: col, r: 0, maxR: EXPLODE_R, life: 0.5 }); for (var p = 0; p < 6; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: x, y: y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: col }); } chainCount++; }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || iphase !== 'aim') return;
    for (var i = 0; i < balls.length; i++) { var b = balls[i]; if (b.exploded) continue; if (Math.hypot(x - b.x, y - b.y) < b.r + 15) { b.exploded = true; explode(b.x, b.y, b.col); iphase = 'exploding'; game.audio.play('se_tap', 0.5); return; } }
  });

  // ── 更新 & 描画 ──
  function drawBalls() {
    for (var bi = 0; bi < balls.length; bi++) { var b = balls[bi]; if (!b.exploded) { ring(b.x, b.y, EXPLODE_R, b.col, 0.06); pc(b.x, b.y, b.r, b.col, 0.9); pc(b.x - 8, b.y - 8, b.r * 0.3, C.g, 0.3); } }
    for (var ei = 0; ei < explosions.length; ei++) { var e = explosions[ei]; ring(e.x, e.y, e.r, C.g, e.life * 0.4); pc(e.x, e.y, e.r * 0.6, C.c, e.life * 0.5); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background(); drawBalls();
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.c);
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
      txt(resultSuccess ? 'MEGA CHAIN!' : 'FIZZLED OUT', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      var active = false;
      for (var ei = 0; ei < explosions.length; ei++) { var e = explosions[ei]; if (e.life <= 0) continue; e.r += 400 * dt; e.life -= dt * 2; if (e.r > e.maxR) e.r = e.maxR; active = true; for (var bi = 0; bi < balls.length; bi++) { var b = balls[bi]; if (b.exploded) continue; if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r) { b.exploded = true; explode(b.x, b.y, b.col); game.audio.play('se_tap', 0.2); } } }
      for (var ei2 = explosions.length - 1; ei2 >= 0; ei2--) if (explosions[ei2].life <= 0) explosions.splice(ei2, 1);
      if (iphase === 'exploding' && !active) {
        iphase = 'result'; resultTimer = 0;
        if (chainCount >= TARGET_CHAIN) { succeeded++; flash = 1.0; flashCol = C.b; game.audio.play('se_success', 0.8); if (succeeded >= NEEDED) { finish(true); return; } }
        else { tries++; flash = 0.7; flashCol = C.a; game.audio.play('se_failure', 0.4); if (tries >= MAX_MISS) { finish(false); return; } }
      }
      if (iphase === 'result') { resultTimer += dt; if (resultTimer > 1.3) spawnBalls(); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBalls();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);
    if (iphase === 'aim') txt('TARGET ' + TARGET_CHAIN + ' CHAIN', W / 2, snap(H * 0.90), 40, C.c);
    else txt('CHAIN ' + chainCount, W / 2, snap(H * 0.90), 54, chainCount >= TARGET_CHAIN ? C.b : C.g);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(succeeded + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < tries ? C.a : '#1a1000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
