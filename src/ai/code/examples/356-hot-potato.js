// 356-hot-potato.js
// ホットポテト — 熱々のイモを持ちすぎて爆発する前に、持っている側をタップで相手へ手早く渡す
// 操作: イモを持っている側をタップして反対へパス（持ちすぎると爆発）
// 成功: 6回パス  失敗: 3回爆発 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、パーティー） ──
  var C = { bg:'#1a0500', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'HOT POTATO';
  var HOW_TO_PLAY = 'TAP THE HOLDER SIDE TO PASS · DO NOT HOLD TOO LONG';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 25 → 6
  var MAX_BOOM = 3;
  var MAX_HOLD = 1.6, PLX = snap(W * 0.24), PRX = snap(W * 0.76), PY = snap(H * 0.52), PASS_SPEED = 1600;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var holder, holdTime, passed, booms, timeLeft, done, particles, smoke, potX, potTX, passing, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1000');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { holder = 0; holdTime = 0; passed = 0; booms = 0; timeLeft = MAX_TIME; done = false; particles = []; smoke = []; potX = PLX; potTX = PLX; passing = false; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 500 + Math.ceil(timeLeft) * 100) : passed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function boom() {
    booms++; fbText = 'BOOM!'; fbCol = C.a; fbTimer = 0.8; game.audio.play('se_failure', 0.7);
    for (var k = 0; k < 15; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: potX, y: PY - 20, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280 - 100, life: 0.7, col: C.f }); }
    if (booms >= MAX_BOOM) { finish(false); return; }
    holdTime = 0; holder = Math.random() < 0.5 ? 0 : 1; potX = holder === 0 ? PLX : PRX; potTX = potX;
  }

  function drawPlayer(px, col, armIn) {
    pc(px, PY - 90, 46, col, 0.9); pc(px, PY - 90, 30, C.g, 0.7);
    game.draw.rect(snap(px) - 30, snap(PY - 40), 60, 100, col, 0.85);
    pline(px + (px < W / 2 ? 30 : -30), PY - 30, px + (px < W / 2 ? 84 : -84) + armIn, PY + 6, col, 0.9, 14);
  }

  function drawPotato() {
    var heat = holdTime / MAX_HOLD, col = heat > 0.66 ? C.a : C.f, pu = Math.floor(game.time.elapsed * 8) % 2 ? 4 : 0;
    pc(potX, PY - 20, 42 + pu, col, 0.95); pc(potX - 12, PY - 32, 10, C.c, 0.6);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || passing) return;
    if (x < W / 2 && holder === 0) { passing = true; holder = 1; potTX = PRX; passed++; holdTime = 0; game.audio.play('se_tap', 0.4); fbText = 'PASS!'; fbCol = C.c; fbTimer = 0.4; if (passed >= NEEDED) { finish(true); return; } }
    else if (x >= W / 2 && holder === 1) { passing = true; holder = 0; potTX = PLX; passed++; holdTime = 0; game.audio.play('se_tap', 0.4); fbText = 'PASS!'; fbCol = C.c; fbTimer = 0.4; if (passed >= NEEDED) { finish(true); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawPlayer(PLX, C.e, 0); drawPlayer(PRX, C.b, 0); drawPotato();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
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
      txt(resultSuccess ? 'HOT HANDS!' : 'BURNED!', W / 2, H * 0.35, 78, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (passing) { var diff = potTX - potX, mv = PASS_SPEED * dt; if (Math.abs(diff) < mv) { potX = potTX; passing = false; } else potX += Math.sign(diff) * mv; }
      else { holdTime += dt; if (holdTime > MAX_HOLD * 0.5 && Math.random() < dt * 8) smoke.push({ x: potX + (Math.random() - 0.5) * 30, y: PY - 40, vy: -40, life: 0.8 }); if (holdTime >= MAX_HOLD) { boom(); if (done) return; } }
      for (var st = smoke.length - 1; st >= 0; st--) { smoke[st].y += smoke[st].vy * dt; smoke[st].life -= dt; if (smoke[st].life <= 0) smoke.splice(st, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    drawPlayer(PLX, C.e, holder === 0 ? -20 : 0); drawPlayer(PRX, C.b, holder === 1 ? 20 : 0);
    for (var st2 = 0; st2 < smoke.length; st2++) game.draw.rect(snap(smoke[st2].x) - 6, snap(smoke[st2].y) - 6, 12, 12, '#888', smoke[st2].life * 0.4);
    drawPotato();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    // ヒートゲージ
    var heat = holdTime / MAX_HOLD, gx = snap(W / 2 - 200), gy = snap(PY + 110);
    game.draw.rect(gx, gy, 400, 24, '#2a1000', 0.9); game.draw.rect(gx, gy, snap(400 * heat), 24, heat > 0.66 ? C.a : heat > 0.33 ? C.c : C.f, 0.9);
    if (heat > 0.75) txt('PASS NOW!', W / 2, snap(gy + 60), 40, C.a);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.78), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var bi = 0; bi < MAX_BOOM; bi++) game.draw.rect(snap(W / 2 + (bi - (MAX_BOOM - 1) / 2) * 56) - 10, 224, 20, 20, bi < booms ? C.a : '#2a1000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
