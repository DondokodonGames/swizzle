// 499-number-crunch.js
// ナンバークランチ — 散らばった数字を大きい順に素早くタップして1セットを片付ける
// 操作: 大→小の順に数字をタップ（順番を間違えるとミス）
// 成功: 4セット 完成  失敗: 3ミス or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、計算機） ──
  var C = { bg:'#030a03', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var NUM_COLS = [C.b, C.e, C.c, C.d, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'NUMBER CRUNCH';
  var HOW_TO_PLAY = 'TAP THE NUMBERS FROM HIGHEST TO LOWEST';
  var MAX_TIME = 20;
  var NEEDED   = 4;          // 修正2: 15 → 4
  var MAX_MISS = 3;          // 修正2: 5 → 3
  var NUM_COUNT = 4;         // 修正2: 5 → 4

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var numbers, order, tapIdx, sets, misses, timeLeft, done, particles, resultText, resultCol, resultTimer, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#061206');
  }

  function background() { game.draw.clear(C.bg); }

  function genNumbers() {
    numbers = []; var vals = [];
    while (vals.length < NUM_COUNT) { var v = 1 + Math.floor(Math.random() * 30); if (vals.indexOf(v) < 0) vals.push(v); }
    var positions = [];
    for (var i = 0; i < NUM_COUNT; i++) {
      var at = 0, px, py, ok;
      do { px = 160 + Math.random() * (W - 320); py = 340 + Math.random() * (H * 0.5); ok = true; for (var j = 0; j < positions.length; j++) if (Math.hypot(px - positions[j].x, py - positions[j].y) < 220) { ok = false; break; } at++; } while (!ok && at < 30);
      positions.push({ x: snap(px), y: snap(py) }); numbers.push({ x: snap(px), y: snap(py), val: vals[i], tapped: false, scale: 1.0, col: NUM_COLS[i] });
    }
    order = numbers.slice().sort(function(a, b) { return b.val - a.val; }); tapIdx = 0;
  }

  function initGame() { sets = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; resultText = ''; resultTimer = 0; flash = 0; flashCol = C.b; genNumbers(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (sets * 700 + Math.ceil(timeLeft) * 100) : sets * 250;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawNumbers() {
    for (var ni = 0; ni < numbers.length; ni++) {
      var n = numbers[ni]; if (n.scale <= 0) continue;
      var isNext = !n.tapped && tapIdx < order.length && n.val === order[tapIdx].val, r = 76 * n.scale;
      if (isNext) ring(n.x, n.y, r + 12, C.g, 0.5 + Math.sin(game.time.elapsed * 6) * 0.2);
      pc(n.x, n.y, r, n.col, n.tapped ? 0.3 : 0.9);
      if (!n.tapped) txt(n.val + '', n.x, n.y + 24, Math.floor(72 * n.scale), C.bg);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hit = -1;
    for (var i = 0; i < numbers.length; i++) { if (numbers[i].tapped) continue; if ((tx - numbers[i].x) * (tx - numbers[i].x) + (ty - numbers[i].y) * (ty - numbers[i].y) <= 90 * 90) { hit = i; break; } }
    if (hit < 0) return;
    if (numbers[hit].val === order[tapIdx].val) {
      numbers[hit].tapped = true; numbers[hit].scale = 1.6; tapIdx++; game.audio.play('se_tap', 0.4);
      for (var pi = 0; pi < 6; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: numbers[hit].x, y: numbers[hit].y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.4, col: numbers[hit].col }); }
      if (tapIdx >= NUM_COUNT) {
        sets++; resultText = 'SET!'; resultCol = C.b; resultTimer = 0.7; flash = 0.4; flashCol = C.b; game.audio.play('se_success', 0.8);
        if (sets >= NEEDED) { finish(true); return; }
        setTimeout(function() { if (!done) genNumbers(); }, 500);
      }
    } else {
      misses++; resultText = 'MISS!'; resultCol = C.a; resultTimer = 0.7; flash = 0.5; flashCol = C.a; numbers[hit].scale = 0.5; game.audio.play('se_failure', 0.5);
      if (misses >= MAX_MISS) { finish(false); return; }
      setTimeout(function() { if (!done) genNumbers(); }, 600);
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!numbers) initGame(); background(); drawNumbers();
      txt(GAME_TITLE, W / 2, H * 0.14, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CRUNCHED!' : 'MISCOUNT', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
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
      for (var i = 0; i < numbers.length; i++) { if (numbers[i].tapped) numbers[i].scale = Math.max(0, numbers[i].scale - dt * 6); else if (numbers[i].scale < 1.0) numbers[i].scale = Math.min(1.0, numbers[i].scale + dt * 5); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawNumbers();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.90), 64, resultCol);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(sets + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#061206');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
