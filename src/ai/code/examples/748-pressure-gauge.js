// 748-pressure-gauge.js
// プレッシャーゲージ — 回転する針がグリーンゾーンに入った瞬間にタップする
// 操作: 針が緑の圧力ゾーンに重なった瞬間タップ。ゾーン外はミス。針は加速する
// 成功: 10回 成功  失敗: 3回 ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、計器） ──
  var C = { bg:'#0a0605', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var NEEDLE = '#ff2079', NEEDLE_TIP = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PRESSURE GAUGE';
  var HOW_TO_PLAY = 'TAP WHEN THE SWEEPING NEEDLE ENTERS THE GREEN PRESSURE ZONE';
  var MAX_TIME = 20;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.46), DIAL_R = 280, NEEDLE_L = 240, ZONE_START = Math.PI * 0.62, ZONE_END = Math.PI * 0.88, NEEDLE_SPEED = 2.2;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var needleAngle, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, lockTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 16) * (r - 16)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.f : '#140803');
  }

  function background() { game.draw.clear(C.bg); }

  function angleInZone(a) { var na = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return na >= ZONE_START && na <= ZONE_END; }

  function initGame() { needleAngle = 0; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; lockTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var inZone = angleInZone(needleAngle);
    pc(CX, CY, DIAL_R, '#1c1008', 0.95); ring(CX, CY, DIAL_R - 6, '#78350f', 0.3);
    for (var ri = 0; ri < 30; ri++) { var ra = (ri / 30) * Math.PI * 0.5 - Math.PI * 0.05; pc(CX + Math.cos(ra) * (DIAL_R - 24), CY + Math.sin(ra) * (DIAL_R - 24), 10, C.a, 0.55); }
    for (var gi = 0; gi <= 24; gi++) { var ga = ZONE_START + (gi / 24) * (ZONE_END - ZONE_START); pc(CX + Math.cos(ga) * (DIAL_R - 24), CY + Math.sin(ga) * (DIAL_R - 24), 12, inZone ? C.b : '#14532d', inZone ? 0.85 : 0.5); }
    for (var ti = 0; ti < 20; ti++) { var ta = (ti / 20) * Math.PI * 2; game.draw.line(CX + Math.cos(ta) * (DIAL_R - 40), CY + Math.sin(ta) * (DIAL_R - 40), CX + Math.cos(ta) * (DIAL_R - 18), CY + Math.sin(ta) * (DIAL_R - 18), '#3d2b10', ti % 5 === 0 ? 4 : 2); }
    var nx = CX + Math.cos(needleAngle) * NEEDLE_L, ny = CY + Math.sin(needleAngle) * NEEDLE_L, bx = CX - Math.cos(needleAngle) * 50, by = CY - Math.sin(needleAngle) * 50;
    game.draw.line(bx, by, nx, ny, NEEDLE, inZone ? 8 : 6); pc(nx, ny, 12, NEEDLE_TIP, 0.9); pc(CX, CY, 22, '#5a3010', 0.95); pc(CX, CY, 12, NEEDLE_TIP, 0.9);
    if (inZone && lockTimer <= 0) txt('TAP NOW!', W / 2, snap(H * 0.82), 56, C.b);
    else txt('TAP IN GREEN ZONE', W / 2, snap(H * 0.82), 34, '#fef3c744');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || lockTimer > 0) return;
    if (angleInZone(needleAngle)) {
      score++; flash = 0.25; flashCol = C.b; var pos = Math.round(((needleAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - ZONE_START) / (ZONE_END - ZONE_START) * 100); resultText = 'PRESSURE ' + pos + '%!'; resultTimer = 0.4; lockTimer = 0.3; game.audio.play('se_tap', 0.12);
      var nx = CX + Math.cos(needleAngle) * NEEDLE_L, ny = CY + Math.sin(needleAngle) * NEEDLE_L;
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: nx, y: ny, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.b }); }
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.28; flashCol = C.a; resultText = 'OUT OF ZONE!'; resultTimer = 0.4; lockTimer = 0.18; game.audio.play('se_failure', 0.25);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (needleAngle === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 74, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.115, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PRESSURE HELD!' : 'BLEW A VALVE', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (lockTimer > 0) lockTimer -= dt;
      needleAngle += Math.min(5.5, NEEDLE_SPEED + score * 0.18) * dt;
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#140803');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
