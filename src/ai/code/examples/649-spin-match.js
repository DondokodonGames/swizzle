// 649-spin-match.js
// スピンマッチ — 回転する4つの輪をタップで止め、頂点の色をすべてお題の色にそろえる
// 操作: 輪の上をタップで一番近い輪を停止。全輪の頂点色が目標と一致すれば成功
// 成功: 5回 全色一致  失敗: 3ミス or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、色合わせ盤／輪色は保持） ──
  var C = { bg:'#050508', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var RING_COLORS = ['#ff2079', '#00cfff', '#00ff41', '#ffe600'];
  var RING_NAMES = ['RED', 'CYAN', 'GREEN', 'YELLOW'];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPIN MATCH';
  var HOW_TO_PLAY = 'TAP A RING TO STOP IT · MATCH EVERY RING TOP TO THE TARGET COLORS';
  var MAX_TIME = 22;
  var NEEDED   = 5;          // 修正2: 10 → 5
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var CX = W / 2, CY = snap(H * 0.44), NUM_RINGS = 4;
  var SEG = 2 * Math.PI / RING_COLORS.length;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var rings, targets, correct, misses, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, checking;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < size; i += 8) { var w = size - i; game.draw.rect(cx - w / 2, cy + i, w, 8, color); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0a14');
  }

  function background() { game.draw.clear(C.bg); }

  function initRound() {
    rings = []; targets = []; checking = false;
    for (var i = 0; i < NUM_RINGS; i++) { var dir = Math.random() > 0.5 ? 1 : -1; rings.push({ angle: Math.random() * Math.PI * 2, speed: (1.5 + Math.random() * 2 + i * 0.3) * dir, r: 130 + i * 100, stopped: false }); targets.push(Math.floor(Math.random() * RING_COLORS.length)); }
  }

  function initGame() { correct = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; initRound(); }

  function colorAtTop(angle) { var n = ((-Math.PI / 2 - angle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); return Math.floor(n / SEG) % RING_COLORS.length; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (correct * 600 + Math.ceil(timeLeft) * 100) : correct * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function checkAll() {
    for (var i = 0; i < NUM_RINGS; i++) if (!rings[i].stopped) return;
    checking = true;
    var allOk = true;
    for (var i2 = 0; i2 < NUM_RINGS; i2++) if (colorAtTop(rings[i2].angle) !== targets[i2]) { allOk = false; break; }
    if (allOk) {
      correct++; flash = 0.3; flashCol = C.b; resultText = 'PERFECT!'; resultTimer = 0.7; game.audio.play('se_success', 0.7);
      for (var p = 0; p < 10; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: CX + Math.cos(pa) * 200, y: CY + Math.sin(pa) * 200, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.6, col: RING_COLORS[Math.floor(Math.random() * 4)] }); }
      if (correct >= NEEDED) { finish(true); return; }
    } else {
      misses++; flash = 0.35; flashCol = C.a; resultText = 'WRONG!'; resultTimer = 0.7; game.audio.play('se_failure', 0.35);
      if (misses >= MAX_MISS) { finish(false); return; }
    }
    setTimeout(initRound, 800);
  }

  function drawScene() {
    pc(CX, CY, 26, '#0a0a14', 0.9);
    for (var ri = 0; ri < NUM_RINGS; ri++) {
      var ring = rings[ri], r = ring.r;
      for (var si = 0; si < RING_COLORS.length; si++) { var startA = ring.angle + si * SEG; for (var arc = 0; arc <= 10; arc++) { var a3 = startA + (arc / 10) * SEG; pc(CX + Math.cos(a3) * r, CY + Math.sin(a3) * r, 22, RING_COLORS[si % RING_COLORS.length], ring.stopped ? 0.9 : 0.7); } }
      var tx2 = CX, ty2 = CY - r; pc(tx2, ty2, 18, C.g, ring.stopped ? 0.6 : 0.3);
    }
    arrow(CX, CY - rings[NUM_RINGS - 1].r - 60, 26, 'down', C.g);
    // targets
    txt('MATCH', W / 2, snap(H * 0.86), 34, '#ffffff88');
    for (var ti = 0; ti < NUM_RINGS; ti++) { var tgx = W / 2 + (ti - (NUM_RINGS - 1) / 2) * 130; pc(tgx, snap(H * 0.92), 30, RING_COLORS[targets[ti]], 0.9); txt(RING_NAMES[targets[ti]], tgx, snap(H * 0.92) + 54, 22, RING_COLORS[targets[ti]]); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || checking) return;
    var bestDist = Infinity, bestIdx = -1;
    for (var i = 0; i < NUM_RINGS; i++) { if (rings[i].stopped) continue; var d = Math.abs(Math.sqrt((tx - CX) * (tx - CX) + (ty - CY) * (ty - CY)) - rings[i].r); if (d < bestDist) { bestDist = d; bestIdx = i; } }
    if (bestIdx >= 0 && bestDist < 80) { rings[bestIdx].stopped = true; game.audio.play('se_tap', 0.2); checkAll(); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rings) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.08, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.12, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.965, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'COLOR LOCKED!' : 'MISMATCH', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
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
      for (var i = 0; i < NUM_RINGS; i++) if (!rings[i].stopped) rings[i].angle += rings[i].speed * dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.6);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 72, flashCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(correct + ' / ' + NEEDED, W / 2, 158, 44, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 210, 20, 20, mi < misses ? C.a : '#0a0a14');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
