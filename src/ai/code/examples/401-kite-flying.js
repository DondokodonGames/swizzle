// 401-kite-flying.js
// 凧揚げ — 風に乗せて凧を操り、糸を切らさないよう張力に注意しながら目標高度まで揚げる
// 操作: スワイプで凧に引く力を加えて操縦（張力が高すぎると糸が切れる）
// 成功: 高度600m 到達  失敗: 糸が切れる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、青空） ──
  var C = { bg:'#04121e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var KITE = [C.a, C.c, C.b, C.f][Math.floor(Math.random() * 4)];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'KITE FLYING';
  var HOW_TO_PLAY = 'SWIPE TO STEER · WATCH THE STRING TENSION · FLY HIGH';
  var MAX_TIME = 15;
  var MAX_ALT = 600;         // 修正2: 2000 → 600
  var PX = snap(W / 2), PY = snap(H * 0.86), STRING = 640;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var kx, ky, kvx, kvy, altitude, tension, windX, windY, windTimer, windInt, timeLeft, done, particles, tenFlash, clouds;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function altBar() {
    var t = Math.ceil(Math.min(1, altitude / MAX_ALT) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2030');
  }

  function background() {
    game.draw.clear(C.bg); game.draw.rect(0, snap(H * 0.3), W, H, '#123a5a', 0.5);
    for (var ci = 0; ci < clouds.length; ci++) { var cl = clouds[ci]; pc(cl.x, cl.y, cl.w * 0.4, '#1a3a55', 0.4); pc(cl.x + cl.w * 0.25, cl.y + 8, cl.w * 0.3, '#1a3a55', 0.3); }
  }

  function initClouds() { clouds = []; for (var i = 0; i < 7; i++) clouds.push({ x: snap(Math.random() * W), y: snap(H * 0.08 + Math.random() * H * 0.35), w: 120 + Math.random() * 160, speed: 20 + Math.random() * 25 }); }

  function updateWind() { windX = (Math.random() - 0.4) * 80; windY = -(20 + Math.random() * 50); windInt = 1.2 + Math.random() * 2; windTimer = 0; }

  function initGame() { kx = W / 2; ky = H * 0.45; kvx = 0; kvy = -40; altitude = 0; tension = 0.8; windTimer = 0; windInt = 2; timeLeft = MAX_TIME; done = false; particles = []; tenFlash = 0; updateWind(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(altitude) * 8 + Math.ceil(timeLeft) * 100) : Math.round(altitude) * 4;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var tenCol = tension > 1.6 ? C.a : C.g;
    var prevX = PX, prevY = PY;
    for (var si = 1; si <= 10; si++) { var t = si / 10, lx = PX + (kx - PX) * t, ly = PY + (ky - PY) * t + Math.sin(t * Math.PI) * 20 * (1 - tension * 0.5); pline(prevX, prevY, lx, ly, tenCol, 0.7, tension > 1.6 ? 6 : 4); prevX = lx; prevY = ly; }
    pc(kx, ky, 52, KITE, 0.9); pc(kx, ky, 26, C.c, 0.7); pc(kx, ky, 10, C.g, 0.8);
    game.draw.rect(snap(kx) - 4, snap(ky + 40), 8, 60, KITE, 0.6);
    pc(PX, PY, 24, C.g, 0.9);
  }

  // ── 入力 ──
  game.onSwipe(function(d, x1, y1, x2, y2) {
    if (state !== S.PLAYING || done) return;
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy); if (len < 20) return;
    var force = Math.min(len * 0.8, 400); kvx += dx / len * force * 0.3; kvy += dy / len * force * 0.3; game.audio.play('se_tap', 0.2);
  });

  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    for (var ci = 0; ci < (clouds ? clouds.length : 0); ci++) { clouds[ci].x += clouds[ci].speed * dt; if (clouds[ci].x > W + 200) clouds[ci].x = -200; }
    if (state === S.ATTRACT) {
      if (!clouds) { initClouds(); initGame(); } background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.92, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.96, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SKY HIGH!' : 'STRING SNAPPED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (tenFlash > 0) tenFlash -= dt * 3;
      windTimer += dt; if (windTimer > windInt) updateWind();
      kvx += windX * dt; kvy += windY * dt; kvx *= (1 - 1.5 * dt); kvy *= (1 - 1.5 * dt); kx += kvx * dt; ky += kvy * dt;
      var dx = kx - PX, dy = ky - PY, dist = Math.hypot(dx, dy); tension = dist / STRING;
      if (dist > STRING) { var nx = dx / dist, ny = dy / dist; kx = PX + nx * STRING; ky = PY + ny * STRING; kvx -= nx * Math.abs(kvx) * 0.5; kvy -= ny * Math.abs(kvy) * 0.5; }
      altitude = Math.max(0, (PY - ky) * 0.7);
      if (altitude >= MAX_ALT) { finish(true); return; }
      if (tension > 1.85) { finish(false); return; }
      if (tension > 1.6) tenFlash = 0.4;
      if (!done && Math.random() < 0.3) particles.push({ x: kx + (Math.random() - 0.5) * 30, y: ky + 50, vx: kvx * 0.3, vy: kvy * 0.1 + 30, life: 0.8, col: KITE });
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.2);
    drawScene();
    if (tenFlash > 0) game.draw.rect(0, 0, W, H, C.a, tenFlash * 0.12);
    txt('TENSION ' + Math.round(tension * 100) + '%', W / 2, snap(H * 0.92), 36, tension > 1.6 ? C.a : tension > 1.2 ? C.c : C.e);

    altBar();
    txt(Math.round(altitude) + 'm', W / 2, 96, 44, C.c);
    txt(Math.round(altitude) + ' / ' + MAX_ALT + 'm', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initClouds();
    initGame();
  });
})(game);
