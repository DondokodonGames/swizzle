// 385-snowflake-catch.js
// 雪の結晶キャッチ — 舌をタップで伸ばし、舞い落ちる雪の結晶をタイミングよく捕まえる
// 操作: タップで舌を上へ伸ばす（結晶に届けばキャッチ）
// 成功: 6個 キャッチ  失敗: 8個 逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、雪空） ──
  var C = { bg:'#010a1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SNOWFLAKE CATCH';
  var HOW_TO_PLAY = 'TAP TO STICK OUT YOUR TONGUE · CATCH THE FLAKES';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 20 → 6
  var MAX_MISS = 8;          // 修正2: 30 → 8
  var FACE_X = snap(W / 2), FACE_Y = snap(H * 0.80), FACE_R = 100, TONGUE_SPD = 1800, MAX_TONGUE = 640;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var tOut, tLen, flakes, spawnTimer, caught, missed, timeLeft, done, particles, catchAnim, windPhase;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2e');
  }

  function background() { game.draw.clear(C.bg); for (var si = 0; si < 40; si++) { var sx = (si * 87 + game.time.elapsed * 15) % W, sy = (si * 133 + game.time.elapsed * 30) % H; game.draw.rect(snap(sx), snap(sy), 4, 4, C.g, 0.25); } }

  function spawnFlake() { flakes.push({ x: snap(80 + Math.random() * (W - 160)), y: -30, size: 18 + Math.random() * 14, spin: (Math.random() - 0.5) * 3, angle: 0, speed: 70 + Math.random() * 60, wave: Math.random() * Math.PI * 2 }); }

  function drawFlake(x, y, size, angle) { for (var i = 0; i < 6; i++) { var a = angle + i * Math.PI / 3; pline(x, y, x + Math.cos(a) * size, y + Math.sin(a) * size, C.e, 0.9, 4); var mx = x + Math.cos(a) * size * 0.5, my = y + Math.sin(a) * size * 0.5; pline(mx, my, mx + Math.cos(a + 1) * size * 0.3, my + Math.sin(a + 1) * size * 0.3, C.g, 0.7, 3); pline(mx, my, mx + Math.cos(a - 1) * size * 0.3, my + Math.sin(a - 1) * size * 0.3, C.g, 0.7, 3); } pc(x, y, 6, C.g, 0.9); }

  function initGame() { tOut = false; tLen = 0; flakes = []; spawnTimer = 0.4; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; catchAnim = 0; windPhase = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFace() {
    pc(FACE_X, FACE_Y, FACE_R, C.c, 0.9);
    pc(FACE_X - 36, FACE_Y - 28, 16, C.g, 0.95); pc(FACE_X + 36, FACE_Y - 28, 16, C.g, 0.95);
    pc(FACE_X - 36, FACE_Y - 28, 8, '#111', 0.95); pc(FACE_X + 36, FACE_Y - 28, 8, '#111', 0.95);
    pc(FACE_X - 60, FACE_Y + 18, 16, C.a, 0.4); pc(FACE_X + 60, FACE_Y + 18, 16, C.a, 0.4);
    game.draw.rect(snap(FACE_X - 30), snap(FACE_Y + 40), 60, 22, '#8a1010', 0.9);
    if (catchAnim > 0) pc(FACE_X, FACE_Y, FACE_R + 16, C.b, catchAnim * 0.3);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || tOut) return; tOut = true; tLen = 0; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawFlake(W * 0.3, H * 0.4, 30, 1); drawFlake(W * 0.7, H * 0.5, 26, 2); drawFace();
      txt(GAME_TITLE, W / 2, H * 0.16, 72, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.65, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'YUMMY!' : 'TOO SLOW', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    var tipY = FACE_Y - FACE_R - tLen;
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      windPhase += dt * 0.5; if (catchAnim > 0) catchAnim -= dt * 3;
      if (tOut) { tLen += TONGUE_SPD * dt; if (tLen >= MAX_TONGUE) { tLen = MAX_TONGUE; tOut = false; } }
      else if (tLen > 0) { tLen -= TONGUE_SPD * dt; if (tLen < 0) tLen = 0; }
      tipY = FACE_Y - FACE_R - tLen;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnFlake(); spawnTimer = 0.5 + Math.random() * 0.4; }
      for (var fi = flakes.length - 1; fi >= 0; fi--) {
        var f = flakes[fi]; f.angle += f.spin * dt; f.x += Math.sin(windPhase + f.wave) * 28 * dt; f.y += f.speed * dt;
        if (tLen > 20 && Math.hypot(f.x - FACE_X, f.y - tipY) < f.size + 22) { caught++; catchAnim = 0.5; game.audio.play('se_success', 0.4); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: f.y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, life: 0.5, col: C.g }); } flakes.splice(fi, 1); tOut = false; if (caught >= NEEDED) { finish(true); return; } continue; }
        if (f.y > H + 40) { missed++; game.audio.play('se_failure', 0.1); flakes.splice(fi, 1); if (missed >= MAX_MISS) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var fi2 = 0; fi2 < flakes.length; fi2++) drawFlake(flakes[fi2].x, flakes[fi2].y, flakes[fi2].size, flakes[fi2].angle);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (tLen > 0) { pline(FACE_X, FACE_Y - FACE_R, FACE_X, tipY, C.a, 0.9, 18); pc(FACE_X, tipY, 16, C.g, 0.9); }
    drawFace();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt('MISS ' + missed + '/' + MAX_MISS, W / 2, 232, 34, missed > MAX_MISS * 0.6 ? C.a : '#88a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
