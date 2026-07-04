// 608-bubble-pop.js
// バブルポップ — 上へ逃げる泡をタップで次々に弾く。連続で割るとコンボ加点
// 操作: 泡をタップで割る。上端まで逃がすとミス。テンポよく連打でコンボ
// 成功: 12個 割破  失敗: 3個 逃走 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、泡） ──
  var C = { bg:'#0a0018', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var COLS = [C.a, C.d, C.e, C.c, C.f];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE POP';
  var HOW_TO_PLAY = 'TAP THE BUBBLES TO POP THEM · CHAIN QUICK POPS FOR COMBOS';
  var MAX_TIME = 18;
  var NEEDED     = 12;       // 修正2: 50 → 12
  var MAX_ESCAPE = 3;        // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bubbles, popped, escaped, timeLeft, done, particles, combo, comboTimer, comboText, comboTextTimer, flash, flashCol, spawnTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 10) * (r - 10)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#1a0030');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBubble() { var r = 44 + Math.random() * 44; bubbles.push({ x: r + Math.random() * (W - r * 2), y: H + r, r: r, vx: (Math.random() - 0.5) * 60, vy: -90 - Math.random() * 60, col: COLS[Math.floor(Math.random() * COLS.length)], phase: Math.random() * Math.PI * 2 }); }

  function initGame() { bubbles = []; popped = 0; escaped = 0; timeLeft = MAX_TIME; done = false; particles = []; combo = 0; comboTimer = 0; comboText = ''; comboTextTimer = 0; flash = 0; flashCol = C.b; spawnTimer = 0; spawnBubble(); spawnBubble(); spawnBubble(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (popped * 300 + Math.ceil(timeLeft) * 100) : popped * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var bi = 0; bi < bubbles.length; bi++) {
      var b = bubbles[bi], wob = Math.sin(b.phase) * 0.06, rx = b.r * (1 + wob);
      pc(b.x, b.y, rx, b.col, 0.28); ring(b.x, b.y, rx, b.col, 0.7); pc(b.x - rx * 0.3, b.y - rx * 0.3, rx * 0.22, C.g, 0.7);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hit = false;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i], dx = tx - b.x, dy = ty - b.y;
      if (dx * dx + dy * dy < b.r * b.r) {
        popped++; combo++; comboTimer = 1.2; hit = true;
        for (var p = 0; p < 10; p++) { var a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 200; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, r: 8 + Math.random() * 8, col: b.col }); }
        bubbles.splice(i, 1); game.audio.play('se_success', 0.3 + Math.min(combo * 0.05, 0.4));
        if (combo >= 3) { comboText = combo + 'x COMBO!'; comboTextTimer = 0.8; }
        if (popped >= NEEDED) { finish(true); return; }
        break;
      }
    }
    if (!hit) { combo = 0; flash = 0.1; flashCol = C.a; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bubbles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.64, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'POP MASTER!' : 'TOO SLOW', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (comboTimer > 0) comboTimer -= dt; else combo = 0;
      if (comboTextTimer > 0) comboTextTimer -= dt;
      if (flash > 0) flash -= dt * 4;
      spawnTimer += dt; var rate = Math.max(0.5, 1.1 - (MAX_TIME - timeLeft) * 0.02);
      if (spawnTimer > rate) { spawnTimer = 0; spawnBubble(); if (Math.random() < 0.3) spawnBubble(); }
      for (var i = bubbles.length - 1; i >= 0; i--) {
        var b = bubbles[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.phase += dt * 2;
        if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); } if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y + b.r < 0) { escaped++; bubbles.splice(i, 1); flash = 0.2; flashCol = C.a; game.audio.play('se_failure', 0.2); if (escaped >= MAX_ESCAPE) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);
    if (comboTextTimer > 0) txt(comboText, W / 2, snap(H * 0.5), 68, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(popped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#1a0030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
