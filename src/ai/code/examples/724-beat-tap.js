// 724-beat-tap.js
// ビートタップ — 点滅するビートに合わせてリズムよくタップする
// 操作: 中央のサークルが光った瞬間にタップ。光っていないときに押すとミス
// 成功: 10ビート 命中  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、リズム） ──
  var C = { bg:'#080208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BEAT = '#a855f7', BEAT_HI = '#f0abfc', BEAT_ON = '#ff2fa0', RING = '#7700ff';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BEAT TAP';
  var HOW_TO_PLAY = 'TAP THE MOMENT THE CIRCLE FLASHES · DO NOT TAP OFF BEAT';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 30 → 10
  var MAX_ERR  = 3;          // 修正2: 12 → 3
  var CX = W / 2, CY = snap(H * 0.42), BEAT_R = 140, BEAT_DUR = 0.2, BPM = 90, BEAT_INTERVAL = 60 / 90;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var beatTimer, beatLit, beatCount, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, hitRing, rings;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0e040f');
  }

  function background() { game.draw.clear(C.bg); }

  function initGame() { beatTimer = BEAT_INTERVAL; beatLit = 0; beatCount = 0; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; hitRing = 0; rings = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var isLit = beatLit > 0, approachRatio = 1 - Math.min(1, beatTimer / BEAT_INTERVAL);
    ring(CX, CY, BEAT_R * 1.8 * (1 - approachRatio) + BEAT_R * 1.05, RING, 0.15 + approachRatio * 0.15);
    for (var ri2 = 0; ri2 < rings.length; ri2++) ring(CX, CY, rings[ri2].r, BEAT, rings[ri2].life * 0.4);
    if (hitRing > 0) ring(CX, CY, BEAT_R + (1 - hitRing) * 100, C.b, hitRing * 0.4);
    pc(CX, CY, BEAT_R, isLit ? BEAT_ON : BEAT, isLit ? 0.95 : 0.65);
    pc(CX, CY, BEAT_R * 0.6, isLit ? BEAT_HI : RING, isLit ? 0.4 : 0.2);
    for (var di = 0; di < 4; di++) { var da = -Math.PI / 2 + di * Math.PI * 2 / 4, dActive = (beatCount % 4) === di; pc(CX + Math.cos(da) * (BEAT_R + 56), CY + Math.sin(da) * (BEAT_R + 56), 18, dActive ? BEAT_HI : RING, dActive ? 0.9 : 0.3); }
    txt(isLit ? 'TAP!' : 'WAIT...', W / 2, snap(CY + BEAT_R + 70), 48, isLit ? BEAT_HI : '#ffffff44');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (beatLit > 0) {
      score++; hitRing = 0.5; flash = 0.25; flashCol = C.b; resultText = 'BEAT!'; resultTimer = 0.4; game.audio.play('se_tap', 0.15);
      for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: BEAT_HI }); }
      beatLit = 0;
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; flash = 0.25; flashCol = C.a; resultText = 'OFF BEAT!'; resultTimer = 0.4; game.audio.play('se_failure', 0.25);
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (rings === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT RHYTHM!' : 'LOST THE BEAT', W / 2, H * 0.35, 52, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      beatTimer -= dt; if (beatLit > 0) beatLit -= dt;
      if (beatTimer <= 0) { beatTimer = BEAT_INTERVAL; beatLit = BEAT_DUR; beatCount++; rings.push({ r: BEAT_R * 0.5, life: 0.5 }); game.audio.play('se_tap', 0.05); }
      for (var ri = rings.length - 1; ri >= 0; ri--) { rings[ri].r += 300 * dt; rings[ri].life -= dt * 2; if (rings[ri].life <= 0) rings.splice(ri, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (hitRing > 0) hitRing -= dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0e040f');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
