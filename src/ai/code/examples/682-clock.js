// 682-clock.js
// クロックストップ — 加速して回る針が真上(12時)を指した瞬間、タップで止める
// 操作: タップで針を停止。12時から誤差10度以内なら成功。成功ごとに針が速くなる
// 成功: 5回 ジャスト  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、時計台） ──
  var C = { bg:'#04060a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CLOCK STOP';
  var HOW_TO_PLAY = 'TAP WHEN THE HAND POINTS STRAIGHT UP AT 12 · WITHIN 10 DEGREES';
  var MAX_TIME = 22;
  var NEEDED   = 5;          // 修正2: 10 → 5
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var CX = W / 2, CY = snap(H * 0.44), RADIUS = 320, TOLERANCE = 10, FREEZE_DUR = 0.9;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var angle, spd, frozen, frozenTimer, successes, errors, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 14) * (r - 14)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0d14');
  }

  function background() { game.draw.clear(C.bg); }

  function normalize(a) { while (a < -Math.PI) a += Math.PI * 2; while (a > Math.PI) a -= Math.PI * 2; return a; }

  function initGame() { successes = 0; errors = 0; spd = 1.5; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; frozen = false; frozenTimer = 0; angle = -Math.PI / 2 + (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random() * 1.5); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 700 + Math.ceil(timeLeft) * 100) : successes * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function checkResult() {
    var diff = Math.abs(normalize(angle - (-Math.PI / 2))) * (180 / Math.PI);
    if (diff <= TOLERANCE) {
      successes++; flash = 0.35; flashCol = C.b; resultText = 'JUST RIGHT!'; resultTimer = 0.6; game.audio.play('se_success', 0.7);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY - RADIUS * 0.8, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.5, col: C.b }); }
      if (successes >= NEEDED) { finish(true); return; }
    } else { errors++; flash = 0.4; flashCol = C.a; resultText = Math.round(diff) + ' OFF'; resultTimer = 0.6; game.audio.play('se_failure', 0.45); if (errors >= MAX_ERR) { finish(false); return; } }
  }

  function drawScene() {
    ring(CX, CY, RADIUS + 20, C.d, 0.9); pc(CX, CY, RADIUS + 8, '#0d1117', 0.95);
    var tolRad = TOLERANCE * Math.PI / 180;
    for (var a = -tolRad; a <= tolRad; a += 0.06) pc(CX + Math.cos(-Math.PI / 2 + a) * (RADIUS + 4), CY + Math.sin(-Math.PI / 2 + a) * (RADIUS + 4), 14, C.b, 0.4);
    for (var ti = 0; ti < 12; ti++) { var ta = -Math.PI / 2 + ti * (Math.PI / 6); game.draw.line(CX + Math.cos(ta) * (RADIUS - 46), CY + Math.sin(ta) * (RADIUS - 46), CX + Math.cos(ta) * RADIUS, CY + Math.sin(ta) * RADIUS, C.e, 8); }
    txt('12', CX, CY - RADIUS + 76, 52, C.b);
    game.draw.line(CX, CY, CX + Math.cos(0) * RADIUS * 0.5, CY + Math.sin(0) * RADIUS * 0.5, '#475569', 16);
    var hx = CX + Math.cos(angle) * (RADIUS - 30), hy = CY + Math.sin(angle) * (RADIUS - 30);
    game.draw.line(CX, CY, hx, hy, frozen ? C.b : C.g, 8); pc(hx, hy, 20, frozen ? C.b : C.g, 0.9); pc(CX, CY, 20, '#64748b', 0.9);
    if (frozen && frozenTimer > FREEZE_DUR * 0.6) ring(CX, CY, RADIUS + 26, C.b, (frozenTimer / FREEZE_DUR) * 0.3);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || frozen) return;
    frozen = true; frozenTimer = FREEZE_DUR; checkResult();
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (angle === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.12, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT TIMING!' : 'OFF THE MARK', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
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
      if (frozen) { frozenTimer -= dt; if (frozenTimer <= 0) { frozen = false; angle = -Math.PI / 2 + (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 1.5); spd = 1.5 + successes * 0.4; } }
      else angle += spd * dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.82), 60, flashCol);
    else txt('SPEED x' + (Math.round(spd * 10) / 10).toFixed(1), W / 2, snap(H * 0.78), 34, '#ffffff44');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0a0d14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
