// 388-balloon-pop.js
// バルーンポップ — 膨らむ風船を、緑のちょうどいいサイズになった瞬間にタップで割る
// 操作: 適正サイズ（緑リング点灯中）の風船をタップ。小さすぎ／膨らみすぎに注意
// 成功: 4個 適正で割る  失敗: 3個 破裂させる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、遊園地） ──
  var C = { bg:'#12042a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BALLOON = [C.a, C.f, C.c, C.b, C.e, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BALLOON POP';
  var HOW_TO_PLAY = 'POP EACH BALLOON WHILE IT GLOWS GREEN (JUST RIGHT)';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 10 → 4
  var MAX_EXPLODE = 3;
  var MIN_R = 56, MAX_R = 150, T_MIN = 96, T_MAX = 124;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var balloons, particles, popped, exploded, timeLeft, done, spawnTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#20103a');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBalloon() { balloons.push({ x: snap(120 + Math.random() * (W - 240)), y: H - 60, r: MIN_R, grow: 28 + Math.random() * 22, col: BALLOON[Math.floor(Math.random() * BALLOON.length)], vy: -40 - Math.random() * 20, wob: Math.random() * Math.PI * 2 }); }

  function initGame() { balloons = []; particles = []; popped = 0; exploded = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (popped * 500 + Math.ceil(timeLeft) * 100) : popped * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBalloon(b) {
    var inZone = b.r >= T_MIN && b.r <= T_MAX;
    pline(b.x, b.y + b.r, b.x + Math.sin(game.time.elapsed + b.wob) * 16, b.y + b.r + 70, C.g, 0.5, 4);
    pc(b.x, b.y, b.r, b.col, 0.9); pc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.22, C.g, 0.4);
    if (inZone) ring(b.x, b.y, b.r + 12, C.b, 0.4 + Math.sin(game.time.elapsed * 8) * 0.2);
    else if (b.r > T_MAX) ring(b.x, b.y, b.r + 12, C.a, (b.r - T_MAX) / (MAX_R - T_MAX) * 0.5);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = balloons.length - 1; i >= 0; i--) {
      var b = balloons[i];
      if (Math.hypot(x - b.x, y - b.y) < b.r) {
        if (b.r >= T_MIN && b.r <= T_MAX) { popped++; game.audio.play('se_success', 0.5); for (var p = 0; p < 10; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, life: 0.6, col: b.col }); } if (popped >= NEEDED) { finish(true); return; } }
        else { game.audio.play('se_failure', 0.2); for (var p2 = 0; p2 < 4; p2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a2) * 80, vy: Math.sin(a2) * 80, life: 0.3, col: '#889' }); } }
        balloons.splice(i, 1); return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawBalloon({ x: W * 0.35, y: H * 0.5, r: 110, col: C.a, wob: 0 }); drawBalloon({ x: W * 0.65, y: H * 0.55, r: 90, col: C.e, wob: 1 });
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
      txt(resultSuccess ? 'JUST RIGHT!' : 'TOO MANY BURST', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0 && balloons.length < 4) { spawnBalloon(); spawnTimer = 1.2 + Math.random() * 1.0; }
      for (var i = balloons.length - 1; i >= 0; i--) {
        var b = balloons[i]; b.r += b.grow * dt; b.y += b.vy * dt; b.x += Math.sin(game.time.elapsed * 1.5 + b.wob) * 22 * dt;
        if (b.y + b.r < 0) { balloons.splice(i, 1); continue; }
        if (b.r >= MAX_R) { exploded++; game.audio.play('se_failure', 0.5); for (var p = 0; p < 12; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, life: 0.7, col: b.col }); } balloons.splice(i, 1); if (exploded >= MAX_EXPLODE) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var bi = 0; bi < balloons.length; bi++) drawBalloon(balloons[bi]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(popped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_EXPLODE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_EXPLODE - 1) / 2) * 56) - 10, 224, 20, 20, ei < exploded ? C.a : '#20103a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
