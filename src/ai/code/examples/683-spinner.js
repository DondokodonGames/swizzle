// 683-spinner.js
// ルーレット — 高速回転するホイールを狙った色でタップして止める
// 操作: タップでホイールにブレーキ。ポインタが狙う色で止まれば成功
// 成功: 5回 色を止める  失敗: 3回 ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ルーレット／セグメント色は保持） ──
  var C = { bg:'#030208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var N = 6;
  var SLICE = Math.PI * 2 / N;
  var SEG_COLORS = ['#ff2079', '#ff6600', '#ffe600', '#00ff41', '#00cfff', '#a855f7'];
  var SEG_NAMES  = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPINNER';
  var HOW_TO_PLAY = 'TAP TO BRAKE THE WHEEL · STOP THE POINTER ON THE TARGET COLOR';
  var MAX_TIME = 22;
  var NEEDED   = 5;          // 修正2: 15 → 5
  var MAX_ERR  = 3;          // 修正2: 8 → 3
  var CX = W / 2, CY = snap(H * 0.44), RADIUS = 340, BRAKE_DUR = 0.6;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rot, angVel, spinning, braking, brakeTimer, brakeStart, target, successes, errors, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#0a0812');
  }

  function background() { game.draw.clear(C.bg); }

  function getSegAtPointer(r) { var idx = Math.floor((-Math.PI / 2 - r) / SLICE); return ((idx % N) + N) % N; }

  function initGame() { successes = 0; errors = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; rot = Math.random() * Math.PI * 2; angVel = 3.0; spinning = true; braking = false; brakeTimer = 0; brakeStart = 0; target = Math.floor(Math.random() * N); }

  function nextRound() { target = Math.floor(Math.random() * N); spinning = true; braking = false; angVel = 3.0 + successes * 0.4; rot += 0.5 + Math.random() * 2; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (successes * 700 + Math.ceil(timeLeft) * 100) : successes * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function evaluate() {
    var seg = getSegAtPointer(rot);
    if (seg === target) {
      successes++; flash = 0.35; flashCol = C.b; resultText = SEG_NAMES[target] + '  STOP!'; resultTimer = 0.7; game.audio.play('se_success', 0.7);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX, y: CY - RADIUS * 0.85, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: SEG_COLORS[target] }); }
      if (successes >= NEEDED) { finish(true); return; }
      setTimeout(nextRound, 900);
    } else {
      errors++; flash = 0.4; flashCol = C.a; resultText = SEG_NAMES[seg] + '  MISS!'; resultTimer = 0.7; game.audio.play('se_failure', 0.5);
      if (errors >= MAX_ERR) { finish(false); return; }
      setTimeout(nextRound, 900);
    }
  }

  function drawScene() {
    ring(CX, CY, RADIUS + 22, C.d, 0.9);
    for (var si = 0; si < N; si++) {
      var startA = rot + si * SLICE, endA = rot + (si + 1) * SLICE, col = SEG_COLORS[si], steps = 24;
      for (var s = 0; s <= steps; s++) { var a = startA + (endA - startA) * s / steps; game.draw.line(CX, CY, CX + Math.cos(a) * RADIUS, CY + Math.sin(a) * RADIUS, col, RADIUS / steps * 2 + 4); }
      game.draw.line(CX, CY, CX + Math.cos(startA) * RADIUS, CY + Math.sin(startA) * RADIUS, '#000', 4);
      var midA = rot + (si + 0.5) * SLICE, lx = CX + Math.cos(midA) * RADIUS * 0.62, ly = CY + Math.sin(midA) * RADIUS * 0.62;
      txt(SEG_NAMES[si], lx, ly + 12, 26, C.g);
    }
    pc(CX, CY, 48, '#0f0f1a', 0.95); pc(CX, CY, 28, '#1e293b', 0.9);
    // Pointer at top
    pc(CX, CY - RADIUS - 12, 24, C.g, 0.95);
    game.draw.rect(snap(CX) - 6, snap(CY - RADIUS - 12), 12, 40, C.g, 0.95);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !spinning || braking) return;
    braking = true; brakeStart = angVel; brakeTimer = BRAKE_DUR; spinning = false; game.audio.play('se_tap', 0.15);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (rot === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.115, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JACKPOT!' : 'BAD LUCK', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
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
      if (spinning) rot += angVel * dt;
      else if (braking) { brakeTimer -= dt; var tt = 1 - Math.max(0, brakeTimer / BRAKE_DUR); angVel = brakeStart * (1 - tt * tt); rot += Math.max(0, angVel) * dt; if (brakeTimer <= 0) { braking = false; angVel = 0; evaluate(); } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);

    // Target display
    txt('TARGET', W / 2, snap(H * 0.78), 30, '#ffffff66');
    pc(W / 2, snap(H * 0.84), 52, SEG_COLORS[target], 0.9);
    txt(SEG_NAMES[target], W / 2, snap(H * 0.84) + 12, 30, C.g);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.71), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(successes + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ERR; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ERR - 1) / 2) * 56) - 10, 224, 20, 20, ei < errors ? C.a : '#0a0812');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
