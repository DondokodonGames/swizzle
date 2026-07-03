// 443-balloon-pop.js
// 風船割り — 浮かび上がりながら膨らむ風船を、破裂する前にタップで割る。膨らみすぎると爆発
// 操作: 風船をタップして割る（限界サイズ＝赤いリングになる前に）
// 成功: 6個 割る  失敗: 3回 爆発 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、縁日） ──
  var C = { bg:'#0a0014', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLORS = [C.a, C.f, C.c, C.b, C.e, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALLOON POP';
  var HOW_TO_PLAY = 'POP THE RISING BALLOONS BEFORE THEY OVER-INFLATE';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_EXPLODE = 3;       // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balloons, particles, popped, explosions, timeLeft, done, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#180030');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBalloon() { balloons.push({ x: snap(120 + Math.random() * (W - 240)), y: H + 60, r: 20, maxR: 70 + Math.random() * 40, grow: 18 + Math.random() * 18 + popped * 1.5, vy: -(60 + Math.random() * 40), vx: (Math.random() - 0.5) * 60, col: COLORS[Math.floor(Math.random() * COLORS.length)], age: 0 }); }

  function initGame() { balloons = []; particles = []; popped = 0; explosions = 0; timeLeft = MAX_TIME; done = false; flash = 0; flashCol = C.a; spawnBalloon(); spawnBalloon(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (popped * 400 + Math.ceil(timeLeft) * 100) : popped * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBalloon(b) {
    var ratio = b.r / b.maxR, pulse = ratio > 0.8 ? (Math.sin(b.age * 20) * 0.5 + 0.5) * 0.15 : 0;
    pline(b.x, b.y + b.r, b.x + Math.sin(b.age * 3) * 16, b.y + b.r + b.r * 1.4, C.g, 0.5, 4);
    pc(b.x, b.y, b.r * (1 + pulse), b.col, 0.9); pc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, C.g, 0.4);
    if (ratio > 0.75) ring(b.x, b.y, b.r + 10, C.a, ratio - 0.7);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = balloons.length - 1; i >= 0; i--) { var b = balloons[i]; if (Math.hypot(x - b.x, y - b.y) < b.r + 20) { for (var k = 0; k < 12; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.5, col: b.col }); } balloons.splice(i, 1); popped++; flash = 0.3; flashCol = C.c; game.audio.play('se_tap', 0.5); if (popped >= NEEDED) { finish(true); return; } break; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!balloons) initGame(); background(); drawBalloon({ x: W * 0.35, y: H * 0.5, r: 60, maxR: 100, col: C.a, age: 0 }); drawBalloon({ x: W * 0.65, y: H * 0.55, r: 50, maxR: 100, col: C.e, age: 1 });
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'POPPED!' : 'BURST TOO MANY', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      var target = 2 + Math.floor(popped / 2); while (balloons.length < target) spawnBalloon();
      for (var bi = balloons.length - 1; bi >= 0; bi--) {
        var b = balloons[bi]; b.age += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.grow * dt; b.vy += 10 * dt;
        if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.r >= b.maxR) { for (var k = 0; k < 16; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, life: 0.7, col: C.a }); } balloons.splice(bi, 1); explosions++; flash = 0.6; flashCol = C.a; game.audio.play('se_failure', 0.4); if (explosions >= MAX_EXPLODE) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var bi2 = 0; bi2 < balloons.length; bi2++) drawBalloon(balloons[bi2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(popped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_EXPLODE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_EXPLODE - 1) / 2) * 56) - 10, 224, 20, 20, ei < explosions ? C.a : '#180030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
