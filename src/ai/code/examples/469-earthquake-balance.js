// 469-earthquake-balance.js
// 地震バランス — 地震で揺れる台を左右タップで傾け、上の荷物を落とさず耐える
// 操作: 画面左タップ=左に傾ける、右タップ=右に傾ける（重心を保つ）
// 成功: 10秒 持ちこたえる  失敗: 3個 落下 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、倒壊寸前の倉庫） ──
  var C = { bg:'#0a0808', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var OBJ_COLS = [C.a, C.e, C.b, C.c, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'QUAKE BALANCE';
  var HOW_TO_PLAY = 'TAP LEFT / RIGHT TO TILT THE PLATFORM · DON\'T DROP THE CARGO';
  var MAX_TIME = 20;
  var GOAL      = 10;        // 修正2: 30秒 → 10秒 持ちこたえる
  var MAX_FALLS = 3;         // 修正2: 5 → 3
  var PLAT_W = 720, PLAT_H = 32, PLAT_X = W / 2, PLAT_Y = snap(H * 0.62);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var platAngle, platAngVel, objects, falls, survived, timeLeft, done, quakeTimer, nextQuake, particles, tiltDir, tiltTimer, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function arrow(cx, cy, dir, sz, color, alpha) {
    cx = snap(cx); cy = snap(cy); var s = sz;
    for (var i = -s; i <= s; i += 8) { var w = s - Math.abs(i); if (dir === 'left') game.draw.rect(cx + i, cy - w, 8, w * 2 + 8, color, alpha); else game.draw.rect(cx - i, cy - w, 8, w * 2 + 8, color, alpha); }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#1a1008');
  }

  function survBar() {
    var t = Math.ceil(Math.min(1, survived / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, H - 60, 72, 40, i < t ? C.b : '#1a1008');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, H * 0.92, W, H * 0.08, '#1c1008', 0.9); }

  function spawnObject() { var r = 30 + Math.random() * 18; objects.push({ x: (Math.random() - 0.5) * (PLAT_W - r * 2), y: -r - 10, vx: 0, vy: 0, r: r, col: OBJ_COLS[Math.floor(Math.random() * OBJ_COLS.length)] }); }

  function initGame() { platAngle = 0; platAngVel = 0; objects = []; falls = 0; survived = 0; timeLeft = MAX_TIME; done = false; quakeTimer = 2; nextQuake = 2; particles = []; tiltDir = 0; tiltTimer = 0; flash = 0; flashCol = C.b; spawnObject(); spawnObject(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(survived) * 400 + (MAX_FALLS - falls) * 500 + Math.ceil(timeLeft) * 100) : Math.ceil(survived) * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var cos = Math.cos(platAngle), sin = Math.sin(platAngle), hw = PLAT_W / 2;
    pline(PLAT_X - hw * cos, PLAT_Y - hw * sin, PLAT_X + hw * cos, PLAT_Y + hw * sin, C.f, 0.9, PLAT_H);
    for (var oi = 0; oi < objects.length; oi++) { var o = objects[oi], wx = o.x + PLAT_X, wy = o.y + PLAT_Y - 100; pc(wx, wy, o.r, o.col, 0.9); pc(wx - o.r * 0.25, wy - o.r * 0.25, o.r * 0.3, C.g, 0.3); }
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    tiltDir = x < W / 2 ? -1 : 1; tiltTimer = 0.25; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!objects) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.18, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.87, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'STOOD FIRM!' : 'COLLAPSED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (survived >= GOAL) { finish(true); return; }
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 2;
      quakeTimer -= dt; if (quakeTimer <= 0) { platAngVel += (Math.random() - 0.5) * 2.2; quakeTimer = nextQuake; nextQuake = 1.4 + Math.random() * 2; }
      if (tiltTimer > 0) { tiltTimer -= dt; platAngVel += tiltDir * 1.5 * dt; }
      platAngVel += (-platAngle * 3.0 - platAngVel * 1.8) * dt; platAngle += platAngVel * dt; platAngle = Math.max(-0.8, Math.min(0.8, platAngle));
      var gx = Math.sin(platAngle) * 600, gy = 700;
      for (var oi = objects.length - 1; oi >= 0; oi--) {
        var o = objects[oi]; o.vx += gx * dt; o.vy += gy * dt; o.x += o.vx * dt; o.y += o.vy * dt;
        var ptY = PLAT_Y - PLAT_H / 2 - Math.tan(platAngle) * (o.x + PLAT_X - PLAT_X);
        var oWorldY = o.y + PLAT_Y - 100;
        var surfY = PLAT_Y - PLAT_H / 2 - 100 - Math.tan(platAngle) * o.x;
        if (oWorldY + o.r >= surfY && oWorldY - o.r < surfY + 60 && Math.abs(o.x) < PLAT_W / 2) { o.y = surfY - PLAT_Y + 100 - o.r; o.vy = -o.vy * 0.3; o.vx *= 0.85; }
        if (o.y + PLAT_Y - 100 > H + 100) {
          objects.splice(oi, 1); falls++; flash = 0.5; flashCol = C.a; game.audio.play('se_failure', 0.4);
          for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: o.x + PLAT_X, y: H - 120, vx: Math.cos(a) * 100, vy: -Math.random() * 200, life: 0.6, col: o.col }); }
          if (falls >= MAX_FALLS) { finish(false); return; }
        }
      }
      if (objects.length < 4 && Math.random() < dt * 0.6) spawnObject();
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    arrow(W * 0.14, PLAT_Y + 140, 'left', 30, tiltTimer > 0 && tiltDir === -1 ? C.g : C.d, 0.8);
    arrow(W * 0.86, PLAT_Y + 140, 'right', 30, tiltTimer > 0 && tiltDir === 1 ? C.g : C.d, 0.8);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    survBar();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(survived) + ' / ' + GOAL + 's', W / 2, 168, 44, C.b);
    for (var fi = 0; fi < MAX_FALLS; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FALLS - 1) / 2) * 56) - 10, 224, 20, 20, fi < falls ? C.a : '#1a1008');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
