// 720-pulse-match.js
// パルスマッチ — 脈動する光輪が目標サイズになった瞬間にタップする
// 操作: リングの大きさが目標マーカーと重なった瞬間タップ。誤差が小さいほど良い
// 成功: 8回 命中  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、パルス） ──
  var C = { bg:'#020210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RING = '#00cfff', RING_GLOW = '#7dd3fc', TARGET = '#ff6600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PULSE MATCH';
  var HOW_TO_PLAY = 'THE RING PULSES IN AND OUT · TAP WHEN IT MATCHES THE TARGET SIZE';
  var MAX_TIME = 22;
  var NEEDED   = 8;          // 修正2: 15 → 8
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.40), MIN_R = 80, MAX_R = 310, RANGE = 310 - 80, TOLERANCE = 24;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var pulsePhase, pulseSpeed, targetR, score, misses, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer, hitRing;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#040418');
  }

  function background() { game.draw.clear(C.bg); }

  function curR() { return MIN_R + RANGE * (0.5 + 0.5 * Math.sin(pulsePhase)); }
  function pickTarget() { var newR, tries = 0; do { newR = MIN_R + 20 + Math.floor(Math.random() * (RANGE - 40)); tries++; } while (Math.abs(newR - targetR) < 60 && tries < 20); targetR = newR; }

  function initGame() { pulsePhase = 0; pulseSpeed = 2.0; targetR = 200; score = 0; misses = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; hitRing = 0; pickTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 600 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var cr = curR(), diff = Math.abs(cr - targetR), closeness = Math.max(0, 1 - diff / TOLERANCE);
    var BAR_X0 = 100, BAR_W = W - 200, BAR_Y = snap(H * 0.72);
    game.draw.rect(BAR_X0, BAR_Y - 8, BAR_W, 16, '#040418', 0.9);
    var targetBarX = BAR_X0 + (targetR - MIN_R) / RANGE * BAR_W, tolBarW = TOLERANCE / RANGE * BAR_W;
    game.draw.rect(targetBarX - tolBarW, BAR_Y - 8, tolBarW * 2, 16, C.b, 0.3);
    pc(targetBarX, BAR_Y, 20, TARGET, 0.95); txt('TARGET', targetBarX, BAR_Y - 44, 28, TARGET);
    pc(BAR_X0 + (cr - MIN_R) / RANGE * BAR_W, BAR_Y, 16, RING, 0.95);
    txt('S', BAR_X0, BAR_Y + 40, 30, '#ffffff44'); txt('L', BAR_X0 + BAR_W, BAR_Y + 40, 30, '#ffffff44');
    ring(CX, CY, targetR, TARGET, 0.3);
    if (closeness > 0) ring(CX, CY, cr, C.b, closeness * 0.4);
    if (hitRing > 0) ring(CX, CY, cr + (1 - hitRing) * 80, C.b, hitRing * 0.35);
    ring(CX, CY, cr, RING_GLOW, 0.8);
    pc(CX, CY, 10, RING, 0.6);
    var diffCol = diff <= TOLERANCE ? C.b : (diff <= TOLERANCE * 2 ? C.c : C.a);
    txt(Math.round(diff) + '', W * 0.12, CY - 16, 56, diffCol); txt('px', W * 0.12, CY + 36, 30, diffCol);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var cr = curR();
    if (Math.abs(cr - targetR) <= TOLERANCE) {
      score++; hitRing = 0.45; flash = 0.3; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.5; game.audio.play('se_success', 0.5);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX + Math.cos(pa) * cr, y: CY + Math.sin(pa) * cr, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.5, col: TARGET }); }
      pickTarget(); pulseSpeed = Math.min(5.0, 2.0 + score * 0.3);
      if (score >= NEEDED) { finish(true); return; }
    } else {
      misses++; flash = 0.3; flashCol = C.a; resultText = cr > targetR ? 'TOO BIG!' : 'TOO SMALL!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (pulsePhase === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN SYNC!' : 'OUT OF PULSE', W / 2, H * 0.35, 58, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      pulsePhase += pulseSpeed * dt;
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt; if (hitRing > 0) hitRing -= dt * 2;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.84), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#040418');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
