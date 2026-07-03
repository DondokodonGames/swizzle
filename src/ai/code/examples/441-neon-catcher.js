// 441-neon-catcher.js
// ネオンキャッチ — 画面を高速で跳ね回るネオン球を、狙ってタップで次々にキャッチする
// 操作: 光の球をタップして捕まえる（連続で取るとコンボ）
// 成功: 8個 キャッチ  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ライトショー） ──
  var C = { bg:'#03001a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var NEON = [C.a, C.d, C.e, C.b, C.c, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NEON CATCHER';
  var HOW_TO_PLAY = 'TAP THE BOUNCING NEON ORBS TO CATCH THEM';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 40 → 8

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balls, particles, caught, combo, comboTimer, timeLeft, done, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#100828');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBall() { var r = 30 + Math.random() * 18, m = r + 20, ang = Math.random() * Math.PI * 2, sp = 180 + Math.random() * 240 + caught * 15; balls.push({ x: snap(m + Math.random() * (W - m * 2)), y: snap(m + 200 + Math.random() * (H * 0.7 - m * 2)), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: r, col: NEON[Math.floor(Math.random() * NEON.length)], trail: [], pulse: Math.random() * Math.PI * 2, spawning: 0.3 }); }

  function initGame() { balls = []; particles = []; caught = 0; combo = 0; comboTimer = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.b; spawnBall(); spawnBall(); spawnBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + combo * 50 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBall(b) {
    var pulse = Math.sin(b.pulse) * 0.15, sa = b.spawning > 0 ? 1 - b.spawning : 1;
    for (var ti = 0; ti < b.trail.length; ti++) { var tr = ti / b.trail.length; pc(b.trail[ti].x, b.trail[ti].y, b.r * tr * 0.6, b.col, tr * 0.3 * sa); }
    pc(b.x, b.y, b.r * (1.3 + pulse), b.col, 0.15 * sa); pc(b.x, b.y, b.r, b.col, 0.9 * sa); pc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.3, C.g, 0.6 * sa);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hit = -1, hd = 999;
    for (var bi = balls.length - 1; bi >= 0; bi--) { var b = balls[bi]; if (b.spawning > 0) continue; var d = Math.hypot(x - b.x, y - b.y); if (d < b.r + 24 && d < hd) { hd = d; hit = bi; } }
    if (hit >= 0) { var b2 = balls[hit]; caught++; combo++; comboTimer = 1.5; flash = 0.3; flashCol = b2.col; game.audio.play('se_tap', 0.3 + Math.min(0.4, combo * 0.05)); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 150; particles.push({ x: b2.x, y: b2.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, col: b2.col }); } balls.splice(hit, 1); if (caught >= NEEDED) { finish(true); return; } }
    else combo = 0;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balls) initGame(); background();
      for (var bi0 = 0; bi0 < balls.length; bi0++) { balls[bi0].pulse += dt * 4; drawBall(balls[bi0]); }
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.36, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.68, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DAZZLING!' : 'TIME OUT', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      if (comboTimer > 0) comboTimer -= dt; else combo = Math.max(0, combo - 1);
      var target = 3 + Math.floor(caught / 3); while (balls.length < target) spawnBall();
      for (var bi = 0; bi < balls.length; bi++) { var b = balls[bi]; if (b.spawning > 0) { b.spawning -= dt * 3; continue; } b.trail.push({ x: b.x, y: b.y }); if (b.trail.length > 10) b.trail.shift(); b.x += b.vx * dt; b.y += b.vy * dt; b.pulse += dt * 4; if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); } if (b.y < b.r + 200) { b.y = b.r + 200; b.vy = Math.abs(b.vy); } if (b.y > H - b.r - 80) { b.y = H - b.r - 80; b.vy = -Math.abs(b.vy); } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= (1 - dt * 2); p.vy *= (1 - dt * 2); p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var bi2 = 0; bi2 < balls.length; bi2++) drawBall(balls[bi2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);
    if (combo >= 3) txt('x' + combo + ' COMBO!', W / 2, snap(H * 0.9), 50, NEON[combo % NEON.length]);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
