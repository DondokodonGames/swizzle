// 340-signal-boost.js
// シグナルブースト — 減衰しながら流れる信号を、通過するブースターをタップで増幅しアンテナへ届ける
// 操作: 信号が近づいたブースターをタップして強度を上げる（強度0で途切れる）
// 成功: 3回信号を届ける  失敗: 3回途切れる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、通信網） ──
  var C = { bg:'#020a06', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#eaffea', grid:'#0a2818' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SIGNAL BOOST';
  var HOW_TO_PLAY = 'TAP BOOSTERS AS THE SIGNAL PASSES · REACH THE ANTENNA';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 15 → 3
  var MAX_BROKE = 3;         // 修正2: 5 → 3
  var LINE_Y = snap(H * 0.5), ANT_X = snap(W * 0.94);
  var BOOSTERS = [{ x: snap(W * 0.20), y: LINE_Y }, { x: snap(W * 0.40), y: LINE_Y }, { x: snap(W * 0.62), y: LINE_Y }, { x: snap(W * 0.82), y: LINE_Y }];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sigX, sigProg, sigStr, active, charges, cool, succeeded, broke, timeLeft, done, particles, effects, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.2) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2010');
  }

  function background() { game.draw.clear(C.bg); for (var gx = 0; gx < W; gx += 96) game.draw.rect(gx, 0, 2, H, C.grid, 0.5); for (var gy = 0; gy < H; gy += 96) game.draw.rect(0, gy, W, 2, C.grid, 0.5); pline(0, LINE_Y, ANT_X, LINE_Y, C.grid, 0.9, 8); }

  function startSignal() { sigX = 0; sigProg = 0; sigStr = 1.0; active = true; charges = [1, 1, 1, 1]; cool = [0, 0, 0, 0]; }

  function initGame() { succeeded = 0; broke = 0; timeLeft = MAX_TIME; done = false; particles = []; effects = []; fbText = ''; fbCol = C.g; fbTimer = 0; startSignal(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (succeeded * 500 + Math.ceil(timeLeft) * 100) : succeeded * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    if (active) { pline(0, LINE_Y, sigX, LINE_Y, C.e, Math.max(0.2, sigStr), 6); pc(sigX, LINE_Y, 20 * sigStr + 6, C.e, sigStr * 0.9); }
    for (var i = 0; i < BOOSTERS.length; i++) { var bo = BOOSTERS[i], ch = charges[i] > 0 && cool[i] <= 0; ring(bo.x, bo.y, 44, ch ? C.b : C.d, ch ? 0.9 : 0.4); pc(bo.x, bo.y, 30, ch ? C.b : '#153020', ch ? 0.8 : 0.5); txt(ch ? '+' : 'o', bo.x, bo.y + 12, 34, ch ? '#000' : C.d); }
    for (var e = 0; e < effects.length; e++) ring(effects[e].x, effects[e].y, effects[e].r, C.g, effects[e].life * 0.6);
    pline(ANT_X, snap(H * 0.3), ANT_X, LINE_Y, C.b, 0.9, 6); pline(ANT_X - 36, snap(H * 0.34), ANT_X, snap(H * 0.38), C.b, 0.7, 4); pline(ANT_X + 36, snap(H * 0.34), ANT_X, snap(H * 0.38), C.b, 0.7, 4); pc(ANT_X, snap(H * 0.3), 16, C.b, 0.9);
    pc(30, LINE_Y, 20, C.e, 0.8); txt('TX', 30, LINE_Y + 10, 22, '#000');
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (!active) { startSignal(); return; }
    var best = -1, bd = 200; for (var i = 0; i < BOOSTERS.length; i++) { var d = Math.hypot(x - BOOSTERS[i].x, y - BOOSTERS[i].y); if (d < bd && charges[i] > 0 && cool[i] <= 0) { bd = d; best = i; } }
    if (best >= 0) { sigStr = Math.min(1.0, sigStr + 0.5); charges[best]--; cool[best] = 1.0; game.audio.play('se_tap', 0.4); effects.push({ x: BOOSTERS[best].x, y: BOOSTERS[best].y, r: 0, life: 0.5 }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (charges === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 74, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.e);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONNECTED!' : 'SIGNAL LOST', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
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
      for (var i = 0; i < 4; i++) if (cool[i] > 0) { cool[i] -= dt; if (cool[i] <= 0) charges[i] = 1; }
      if (active) {
        sigProg += dt * 0.4; sigStr -= dt * 0.15; sigX = sigProg * ANT_X;
        if (sigStr <= 0) { active = false; broke++; fbText = 'SIGNAL LOST'; fbCol = C.a; fbTimer = 0.8; game.audio.play('se_failure', 0.5); if (broke >= MAX_BROKE) { finish(false); return; } setTimeout(function() { if (!done) startSignal(); }, 800); }
        else if (sigProg >= 1.0) { active = false; succeeded++; fbText = 'REACHED!'; fbCol = C.b; fbTimer = 0.8; game.audio.play('se_success', 0.6); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: ANT_X, y: LINE_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.b }); } if (succeeded >= NEEDED) { finish(true); return; } setTimeout(function() { if (!done) startSignal(); }, 600); }
      }
      for (var se = effects.length - 1; se >= 0; se--) { effects[se].r += 100 * dt; effects[se].life -= dt * 2; if (effects[se].life <= 0) effects.splice(se, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.66), 56, fbCol);
    else if (active) { var pct = Math.round(sigStr * 100); txt('POWER ' + pct + '%', W / 2, snap(H * 0.66), 46, sigStr > 0.5 ? C.b : sigStr > 0.25 ? C.c : C.a); }
    else txt('TAP TO SEND', W / 2, snap(H * 0.66), 46, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(succeeded + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var br = 0; br < MAX_BROKE; br++) game.draw.rect(snap(W / 2 + (br - (MAX_BROKE - 1) / 2) * 56) - 10, 224, 20, 20, br < broke ? C.a : '#0a2010');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
