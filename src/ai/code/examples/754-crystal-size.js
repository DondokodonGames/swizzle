// 754-crystal-size.js
// クリスタルサイズ — 成長するクリスタルが目標リングと同じ大きさになった瞬間タップする
// 操作: クリスタルが目標リングに重なった瞬間タップ。大きすぎ・小さすぎはミス
// 成功: 10回 成功  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、結晶） ──
  var C = { bg:'#050210', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var CRYSTAL = '#a855f7', CRYSTAL_HI = '#ede9fe', RINGC = '#ff6600', RING_HI = '#ffe600';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRYSTAL SIZE';
  var HOW_TO_PLAY = 'THE CRYSTAL GROWS · TAP WHEN IT MATCHES THE TARGET RING SIZE';
  var MAX_TIME = 22;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_ERR  = 3;          // 修正2: 10 → 3
  var CX = W / 2, CY = snap(H * 0.44), TOL = 18, WAIT_DUR = 0.6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var crystR, growSpeed, growing, targetR, waitTimer, score, errors, timeLeft, done, elapsed, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0518');
  }

  function background() { game.draw.clear(C.bg); }

  function nextCrystal() { crystR = 10; targetR = 70 + Math.random() * 120; growSpeed = Math.min(280, 120 + score * 12); growing = true; waitTimer = 0; }

  function initGame() { score = 0; errors = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; waitTimer = 0; nextCrystal(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 500 + Math.ceil(timeLeft) * 100) : score * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    var inZone = Math.abs(crystR - targetR) < TOL;
    ring(CX, CY, targetR, inZone ? RING_HI : RINGC, inZone ? 0.9 : 0.6);
    txt('TARGET', CX + targetR + 60, CY, 28, RINGC);
    if (crystR > 0) {
      pc(CX, CY, crystR, inZone ? RINGC : CRYSTAL, 0.75); pc(CX, CY, crystR * 0.5, inZone ? RING_HI : CRYSTAL_HI, 0.4);
      for (var fi = 0; fi < 6; fi++) { var fa = fi * Math.PI / 3 + elapsed * 0.3; game.draw.line(CX, CY, CX + Math.cos(fa) * crystR * 0.85, CY + Math.sin(fa) * crystR * 0.85, inZone ? RING_HI : CRYSTAL_HI, inZone ? 3 : 1); }
    }
    txt(Math.round(crystR) + ' / ' + Math.round(targetR), W / 2, snap(H * 0.80), 52, inZone ? RINGC : C.g);
    if (inZone && growing) txt('TAP NOW!', W / 2, snap(H * 0.86), 56, RING_HI);
    else if (growing) txt('MATCH THE RING', W / 2, snap(H * 0.86), 36, '#ffffff44');
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !growing || waitTimer > 0) return;
    var diff = Math.abs(crystR - targetR);
    if (diff < TOL) {
      score++; growing = false; flash = 0.25; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.45; game.audio.play('se_success', 0.6);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY, vx: Math.cos(pa) * (crystR * 0.8 + 60), vy: Math.sin(pa) * (crystR * 0.8 + 60), life: 0.4, col: CRYSTAL_HI }); }
      waitTimer = WAIT_DUR;
      if (score >= NEEDED) { finish(true); return; }
    } else {
      errors++; growing = false; flash = 0.3; flashCol = C.a; resultText = crystR > targetR ? 'TOO BIG!' : 'TOO SMALL!'; resultTimer = 0.45; game.audio.play('se_failure', 0.28);
      waitTimer = WAIT_DUR;
      if (errors >= MAX_ERR) { finish(false); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (crystR === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.92, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PERFECT GROWTH!' : 'OFF SIZE', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (waitTimer > 0) { waitTimer -= dt; if (waitTimer <= 0) nextCrystal(); }
      else if (growing) {
        crystR += growSpeed * dt;
        if (crystR > 240) { growing = false; errors++; flash = 0.35; flashCol = C.a; resultText = 'TOO BIG!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); waitTimer = WAIT_DUR; if (errors >= MAX_ERR) { finish(false); return; } }
      }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.91), 48, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0a0518');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
