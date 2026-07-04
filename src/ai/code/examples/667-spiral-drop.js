// 667-spiral-drop.js
// スパイラルドロップ — 回転する同心円の輪の隙間が来た瞬間、タップで内へ通り抜ける
// 操作: 現在の輪の隙間が球の位置に重なった時タップで前進。輪に当たると衝突
// 成功: 12輪 通過  失敗: 3回 衝突 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、渦巻き回廊） ──
  var C = { bg:'#030008', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPIRAL DROP';
  var HOW_TO_PLAY = 'TAP WHEN THE CURRENT RING GAP LINES UP WITH YOUR BALL · SLIP INWARD';
  var MAX_TIME = 18;
  var NEEDED   = 12;         // 修正2: 25 → 12
  var MAX_HIT  = 3;          // 修正2: 8 → 3
  var CENTER_X = W / 2, CENTER_Y = snap(H * 0.46), MAX_RINGS = 5, GAP_ARC = 0.7, BALL_ANGLE = -Math.PI / 2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rings, ballR, passed, hits, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, advancing, advanceTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#060010');
  }

  function background() { game.draw.clear(C.bg); }

  function initRings() { rings = []; for (var i = 0; i < MAX_RINGS; i++) rings.push({ r: 90 + i * 84, gapStart: Math.random() * Math.PI * 2, rotSpeed: (0.8 + Math.random() * 0.6) * (i % 2 === 0 ? 1 : -1) }); }

  function initGame() { ballR = 0; passed = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; advancing = false; advanceTimer = 0; initRings(); }

  function isInGap(ring) { var rel = ((BALL_ANGLE - ring.gapStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); return rel < GAP_ARC || rel > Math.PI * 2 - 0.1; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 500 + Math.ceil(timeLeft) * 100) : passed * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ri = rings.length - 1; ri >= 0; ri--) {
      var ring = rings[ri], inBall = ri === ballR, crossed = ri < ballR, numSegs = 60;
      for (var seg = 0; seg < numSegs; seg++) {
        var segAngle = (seg / numSegs) * Math.PI * 2, rel = ((segAngle - ring.gapStart) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (rel >= GAP_ARC) { var al = crossed ? 0.3 : (inBall ? 0.95 : 0.6); pc(CENTER_X + Math.cos(segAngle) * ring.r, CENTER_Y + Math.sin(segAngle) * ring.r, inBall ? 9 : 7, inBall ? C.e : C.d, al); }
      }
      if (inBall) { var gm = ring.gapStart + GAP_ARC / 2; pc(CENTER_X + Math.cos(gm) * ring.r, CENTER_Y + Math.sin(gm) * ring.r, 12, C.b, 0.8); }
    }
    var cr = ballR < rings.length ? rings[ballR] : null, brad = cr ? cr.r - 28 : 20;
    var bx = CENTER_X + Math.cos(BALL_ANGLE) * brad, by = CENTER_Y + Math.sin(BALL_ANGLE) * brad;
    pc(bx, by, 36, C.f, 0.9); pc(bx - 11, by - 11, 13, C.c, 0.5);
    if (cr && isInGap(cr)) txt('NOW!', bx, by - 60, 44, C.b);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || advancing || ballR >= rings.length) return;
    var ring = rings[ballR];
    if (isInGap(ring)) {
      advancing = true; advanceTimer = 0.25; passed++; flash = 0.3; flashCol = C.b; resultText = 'THROUGH!'; resultTimer = 0.45; game.audio.play('se_success', 0.55);
      var bx = CENTER_X + Math.cos(BALL_ANGLE) * ring.r, by = CENTER_Y + Math.sin(BALL_ANGLE) * ring.r;
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: bx, y: by, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.c }); }
      ballR++; if (ballR >= rings.length) { ballR = 0; initRings(); }
      if (passed >= NEEDED) { finish(true); return; }
    } else {
      hits++; flash = 0.4; flashCol = C.a; resultText = 'CRASH!'; resultTimer = 0.5; game.audio.play('se_failure', 0.4); if (hits >= MAX_HIT) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rings) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.12, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SPIRAL CLEAR!' : 'SMASHED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      if (advancing) { advanceTimer -= dt; if (advanceTimer <= 0) advancing = false; }
      var sm = 1 + (MAX_TIME - timeLeft) * 0.02;
      for (var i = 0; i < rings.length; i++) rings[i].gapStart += rings[i].rotSpeed * sm * dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.84), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HIT; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#060010');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
