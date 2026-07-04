// 749-ripple-aim.js
// リップルエイム — タップで広がる波紋を使い、漂うターゲットを直撃か波紋で当てる
// 操作: ターゲットを直接タップ、または近くをタップして広がる波紋で当てる
// 成功: 12個 ヒット  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、水面） ──
  var C = { bg:'#020a12', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var TARGET = '#ff6600', TARGET_HI = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'RIPPLE AIM';
  var HOW_TO_PLAY = 'TAP A TARGET DIRECTLY OR TAP NEARBY SO THE SPREADING RIPPLE HITS IT';
  var MAX_TIME = 22;
  var NEEDED   = 12;         // 修正2: 30 → 12
  var MAX_ERR  = 3;          // 修正2: 15 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targets, ripples, spawnTimer, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#040d18');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnTarget() { var margin = 100; targets.push({ x: margin + Math.random() * (W - margin * 2), y: H * 0.20 + Math.random() * (H * 0.62), r: 30 + Math.random() * 18, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, phase: Math.random() * Math.PI * 2, hit: false }); }

  function initGame() { targets = []; ripples = []; spawnTimer = 0.8; score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnTarget(); spawnTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ri2 = 0; ri2 < ripples.length; ri2++) { var rp2 = ripples[ri2]; ring(rp2.x, rp2.y, rp2.r, C.e, rp2.life * 0.35); }
    for (var ti3 = 0; ti3 < targets.length; ti3++) { var t4 = targets[ti3], pulse = 0.9 + 0.1 * Math.sin(t4.phase * 3); pc(t4.x, t4.y, t4.r * pulse, TARGET, 0.9); pc(t4.x - t4.r * 0.3, t4.y - t4.r * 0.3, t4.r * 0.28, TARGET_HI, 0.45); }
  }

  function hitTarget(t) {
    t.hit = true; score++; flash = 0.22; flashCol = C.b;
    for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: TARGET_HI }); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    ripples.push({ x: tx, y: ty, r: 0, maxR: 420, life: 1.0, hit: [] }); game.audio.play('se_tap', 0.08);
    var anyHit = false;
    for (var i = targets.length - 1; i >= 0; i--) { var t = targets[i]; if (t.hit) continue; var dx = tx - t.x, dy = ty - t.y; if (dx * dx + dy * dy < (t.r + 20) * (t.r + 20)) { hitTarget(t); anyHit = true; resultText = 'HIT!'; resultTimer = 0.35; game.audio.play('se_success', 0.5); if (score >= NEEDED) { finish(true); return; } } }
    if (!anyHit) { errors++; flash = 0.18; flashCol = C.a; resultText = 'MISS'; resultTimer = 0.28; if (errors >= MAX_ERR) { finish(false); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'DEAD AIM!' : 'MISFIRE', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; var rate = Math.max(0.5, 0.82 - score * 0.015); if (spawnTimer <= 0) { spawnTimer = rate; if (targets.length < 7) spawnTarget(); }
      for (var ri = ripples.length - 1; ri >= 0; ri--) {
        var rp = ripples[ri]; rp.r += 700 * dt; rp.life -= dt * 1.0;
        for (var ti = targets.length - 1; ti >= 0; ti--) { var t2 = targets[ti]; if (t2.hit || rp.hit.indexOf(ti) >= 0) continue; var dx = rp.x - t2.x, dy = rp.y - t2.y, dist = Math.sqrt(dx * dx + dy * dy); if (Math.abs(dist - rp.r) < t2.r + 12) { rp.hit.push(ti); hitTarget(t2); resultText = 'RIPPLE HIT!'; resultTimer = 0.38; game.audio.play('se_success', 0.45); if (score >= NEEDED) { finish(true); return; } } }
        if (rp.life <= 0 || rp.r > rp.maxR) ripples.splice(ri, 1);
      }
      for (var ti2 = targets.length - 1; ti2 >= 0; ti2--) { var t3 = targets[ti2]; if (t3.hit) { targets.splice(ti2, 1); continue; } t3.phase += dt * 2; t3.x += t3.vx * dt; t3.y += t3.vy * dt; if (t3.x < 60 || t3.x > W - 60) { t3.vx = -t3.vx; t3.x = Math.max(60, Math.min(W - 60, t3.x)); } if (t3.y < H * 0.15 || t3.y > H * 0.85) { t3.vy = -t3.vy; t3.y = Math.max(H * 0.15, Math.min(H * 0.85, t3.y)); } }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.07);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.87), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#040d18');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.03);
    state = S.ATTRACT;
    initGame();
  });
})(game);
