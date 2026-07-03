// 593-mirror-tap.js
// ミラータップ — 上半分に現れるターゲットをタップ。下半分には鏡像が映る空間認識ゲーム
// 操作: 上半分（実像）に光るターゲットをタップ（消える前に）。下の鏡像エリアを押すと無効
// 成功: 6回 命中  失敗: 3回 外し/見逃し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、鏡の間） ──
  var C = { bg:'#020510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MIRROR TAP';
  var HOW_TO_PLAY = 'TAP TARGETS IN THE TOP HALF · THE BOTTOM IS ONLY A MIRROR';
  var MAX_TIME = 18;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_FAIL = 3;          // 修正2: 8 → 3
  var MIRROR_Y = H / 2, TARGET_R = 46;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var targets, score, fails, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, ripples;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha, w) { w = w || 6; var n = Math.max(8, Math.ceil(r / 6)); for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; game.draw.rect(snap(cx + Math.cos(a) * r) - w / 2, snap(cy + Math.sin(a) * r) - w / 2, w, w, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#001a2e');
  }

  function background() {
    game.draw.clear(C.bg); game.draw.rect(0, 0, W, MIRROR_Y, '#001a2e', 0.3); game.draw.rect(0, MIRROR_Y, W, H - MIRROR_Y, '#001a2e', 0.5);
    game.draw.rect(0, MIRROR_Y - 4, W, 8, C.e, 0.8);
    for (var ri = 0; ri < ripples.length; ri++) ring(ripples[ri].x, ripples[ri].y, ripples[ri].r, C.e, ripples[ri].alpha * 0.5, 6);
  }

  function spawnTarget() { targets.push({ x: 120 + Math.random() * (W - 240), y: 300 + Math.random() * (MIRROR_Y - 400), life: 3.0 - Math.min(1.5, score * 0.15), maxLife: 3.0 - Math.min(1.5, score * 0.15), phase: Math.random() * Math.PI * 2, hit: false }); }

  function initGame() { targets = []; score = 0; fails = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; ripples = []; spawnTarget(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 700 + Math.ceil(timeLeft) * 100) : score * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ti = 0; ti < targets.length; ti++) {
      var t = targets[ti]; if (t.hit) { pc(t.x, t.y, TARGET_R * 1.6 * (1 - t.life), C.b, t.life * 0.8 / 0.25); continue; }
      var lr = t.life / t.maxLife; ring(t.x, t.y, TARGET_R + 12, C.d, lr * 0.4, 6); pc(t.x, t.y, TARGET_R, C.e, 0.85); pc(t.x - 12, t.y - 12, TARGET_R * 0.3, C.g, 0.5);
      var mirY = MIRROR_Y * 2 - t.y; pc(t.x, mirY, TARGET_R, C.d, lr * 0.4);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (ty >= MIRROR_Y) { game.audio.play('se_failure', 0.15); return; }
    for (var ti = targets.length - 1; ti >= 0; ti--) {
      var t = targets[ti]; if (t.hit) continue;
      if ((tx - t.x) * (tx - t.x) + (ty - t.y) * (ty - t.y) < (TARGET_R + 30) * (TARGET_R + 30)) {
        t.hit = true; t.life = 0.25; t.maxLife = 0.25; score++; flash = 0.2; flashCol = C.b; resultText = 'HIT!'; resultTimer = 0.5; game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: t.x, y: t.y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.b }); }
        ripples.push({ x: t.x, y: MIRROR_Y * 2 - t.y, r: 0, alpha: 0.6 });
        if (score >= NEEDED) { finish(true); return; } return;
      }
    }
    fails++; flash = 0.25; flashCol = C.a; resultText = 'MISS'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); ripples.push({ x: tx, y: ty, r: 0, alpha: 0.4 }); if (fails >= MAX_FAIL) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!targets) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.345, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SHARP EYE!' : 'MISSED IT', W / 2, H * 0.30, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.4, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.46, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (resultTimer > 0) resultTimer -= dt;
      if (targets.filter(function(t) { return !t.hit; }).length < 1 + Math.floor(score / 3)) spawnTarget();
      for (var ti = targets.length - 1; ti >= 0; ti--) { var t = targets[ti]; t.phase += dt * 2; t.life -= t.hit ? dt * 4 : dt; if (t.life <= 0) { if (!t.hit) { fails++; flash = 0.2; flashCol = C.a; resultText = 'TOO LATE'; resultTimer = 0.5; game.audio.play('se_failure', 0.2); if (fails >= MAX_FAIL) { finish(false); return; } } targets.splice(ti, 1); } }
      for (var ri = ripples.length - 1; ri >= 0; ri--) { ripples[ri].r += 150 * dt; ripples[ri].alpha -= dt * 2; if (ripples[ri].alpha <= 0) ripples.splice(ri, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.82), 56, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var fi = 0; fi < MAX_FAIL; fi++) game.draw.rect(snap(W / 2 + (fi - (MAX_FAIL - 1) / 2) * 56) - 10, 224, 20, 20, fi < fails ? C.a : '#001a2e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
