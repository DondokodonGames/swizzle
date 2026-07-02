// 314-weight-lift.js
// ウェイトリフティング — 力ゲージが成功ゾーン(MAX付近)に来た瞬間に上スワイプでバーベルを挙げる
// 操作: ゲージが成功ゾーンのとき上スワイプ！
// 成功: 3回挙げる  失敗: 3回失敗 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、パワージム） ──
  var C = { bg:'#0a0c14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WEIGHT LIFT';
  var HOW_TO_PLAY = 'SWIPE UP WHEN THE GAUGE HITS THE GREEN ZONE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 5 → 3
  var MAX_FAIL = 3;
  var ZONE = [0.82, 0.98];
  var BAR_Y = snap(H * 0.56);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var gauge, gDir, phase, liftY, liftVY, lifts, fails, timeLeft, done, particles, fbText, fbCol, fbTimer, shake;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#12121e');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, snap(H * 0.72), W, H, '#161428', 0.9); game.draw.rect(0, snap(H * 0.72), W, 8, C.d, 0.5); }

  function drawLifter(sh) {
    var cx = snap(W / 2 + sh), bY = BAR_Y + liftY;
    // 選手（ピクセル人形）
    pline(cx, snap(H * 0.70), cx - 40, snap(H * 0.78), C.f, 0.9, 12);
    pline(cx, snap(H * 0.70), cx + 40, snap(H * 0.78), C.f, 0.9, 12);
    pline(cx, snap(H * 0.70), cx, snap(H * 0.56), C.f, 0.9, 12);
    pline(cx, snap(H * 0.56), cx - 44, bY, C.c, 0.9, 8);
    pline(cx, snap(H * 0.56), cx + 44, bY, C.c, 0.9, 8);
    pc(cx, snap(H * 0.53), 22, C.f, 0.95);
    // バーベル
    pline(cx - 190, bY, cx + 190, bY, C.g, 0.95, 14);
    var wts = [[-180, -130], [-125, -80], [80, 125], [130, 180]];
    for (var wi = 0; wi < wts.length; wi++) { var wx = cx + wts[wi][0]; game.draw.rect(snap(wx), snap(bY - 44), wts[wi][1] - wts[wi][0], 88, C.e, 0.9); game.draw.rect(snap(wx), snap(bY - 44), 6, 88, C.g, 0.4); }
  }

  function initGame() { gauge = 0; gDir = 1; phase = 'ready'; liftY = 0; liftVY = 0; lifts = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; shake = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (lifts * 700 + Math.ceil(timeLeft) * 100) : lifts * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done || d !== 'up' || phase !== 'ready') return;
    if (gauge >= ZONE[0] && gauge <= ZONE[1]) {
      phase = 'lifting'; liftVY = -600 - gauge * 200; liftY = 0; lifts++;
      fbText = gauge > 0.92 ? 'PERFECT!' : 'LIFT!'; fbCol = C.b; fbTimer = 1.0; game.audio.play('se_success', 0.7);
      for (var k = 0; k < 14; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: W / 2, y: BAR_Y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300 - 100, life: 0.8, col: C.c }); }
      if (lifts >= NEEDED) { finish(true); return; }
    } else {
      fails++; fbText = gauge < ZONE[0] ? 'TOO EARLY!' : 'TOO LATE!'; fbCol = C.a; fbTimer = 0.8; shake = 0.4; game.audio.play('se_failure', 0.6);
      if (fails >= MAX_FAIL) { finish(false); return; }
      setTimeout(function() { if (!done) { phase = 'ready'; gauge = 0; gDir = 1; } }, 500);
      phase = 'fail';
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawLifter(0);
      txt(GAME_TITLE, W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'NEW RECORD!' : 'NO LIFT', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt; if (shake > 0) shake -= dt;
      if (phase === 'ready') { gauge += dt * 1.4 * gDir; if (gauge >= 1) { gauge = 1; gDir = -1; } if (gauge <= 0) { gauge = 0; gDir = 1; } }
      else if (phase === 'lifting') { liftVY += 800 * dt; liftY += liftVY * dt; if (liftY >= 0) { liftY = 0; liftVY = 0; phase = 'ready'; gauge = 0; gDir = 1; } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    var sh = shake > 0 ? (Math.floor(game.time.elapsed * 40) % 2 ? 10 : -10) : 0;
    background(); drawLifter(sh);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    // 力ゲージ（12ブロック、成功ゾーン枠）
    var gx = snap(W * 0.08), gy = snap(H * 0.80), gw = snap(W * 0.84), gc = Math.ceil(gauge * 12);
    for (var i = 0; i < 12; i++) { var frac = (i + 1) / 12, inZone = frac > ZONE[0] && frac <= ZONE[1]; game.draw.rect(gx + i * gw / 12 + 2, gy, gw / 12 - 4, 48, i < gc ? (gauge >= ZONE[0] && gauge <= ZONE[1] ? C.b : C.c) : (inZone ? '#0a3020' : '#12121e'), i < gc ? 0.95 : 0.5); }
    if (fbTimer > 0) txt(fbText, W / 2, snap(H * 0.68), 56, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(lifts + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#12121e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
