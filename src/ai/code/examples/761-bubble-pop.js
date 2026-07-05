// 761-bubble-pop.js
// バブルポップ — 下から浮かび上がる泡を、画面上へ逃げる前にタップして割る
// 操作: 泡をタップして割る。上端まで逃がすとミス
// 成功: 12個 割る  失敗: 3個 逃す or 22秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、水中） ──
  var C = { bg:'#030a18', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var BUBBLE = '#00cfff', BUBBLE_HI = '#e0f2fe';

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE POP';
  var HOW_TO_PLAY = 'TAP THE RISING BUBBLES TO POP THEM BEFORE THEY ESCAPE OFF THE TOP';
  var MAX_TIME = 22;
  var NEEDED     = 12;       // 修正2: 50 → 12
  var MAX_ESCAPE = 3;        // 修正2: 12 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bubbles, spawnTimer, score, escaped, timeLeft, done, elapsed, popParticles, flash, flashCol, resultText, resultTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#060e1c');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBubble() { var r = 40 + Math.random() * 50; bubbles.push({ x: r + Math.random() * (W - r * 2), y: H + r, r: r, vx: (Math.random() - 0.5) * 60, vy: -(90 + Math.random() * 120 + score * 4), wobble: Math.random() * Math.PI * 2, wobbleSpd: 1.5 + Math.random() }); }

  function initGame() { bubbles = []; spawnTimer = 0; score = 0; escaped = 0; timeLeft = MAX_TIME; done = false; elapsed = 0; popParticles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnBubble(); spawnBubble(); spawnBubble(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 100) : score * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      var b3 = bubbles[bi2];
      pc(b3.x, b3.y, b3.r, BUBBLE, 0.18); ring(b3.x, b3.y, b3.r, BUBBLE, 0.7);
      pc(b3.x - b3.r * 0.32, b3.y - b3.r * 0.32, b3.r * 0.2, BUBBLE_HI, 0.6); pc(b3.x - b3.r * 0.18, b3.y - b3.r * 0.18, b3.r * 0.08, C.g, 0.85);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var hitIdx = -1, bestDist = Infinity;
    for (var i = 0; i < bubbles.length; i++) { var b = bubbles[i], dx = tx - b.x, dy = ty - b.y, dist = Math.sqrt(dx * dx + dy * dy); if (dist < b.r && dist < bestDist) { bestDist = dist; hitIdx = i; } }
    if (hitIdx >= 0) {
      var b2 = bubbles[hitIdx]; score++; flash = 0.14; flashCol = C.b; resultText = 'POP!'; resultTimer = 0.28; game.audio.play('se_tap', 0.1);
      for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120; popParticles.push({ x: b2.x, y: b2.y, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp - 40, life: 0.4, r: 4 + Math.random() * 6, col: BUBBLE_HI }); }
      bubbles.splice(hitIdx, 1);
      if (score >= NEEDED) { finish(true); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bubbles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'POP MASTER!' : 'THEY FLOATED AWAY', W / 2, H * 0.35, 50, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; elapsed += dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; var spawnRate = Math.max(0.3, 0.55 - score * 0.01); if (spawnTimer <= 0) { spawnTimer = spawnRate; spawnBubble(); if (score > 6) spawnBubble(); }
      for (var bi = bubbles.length - 1; bi >= 0; bi--) {
        var b = bubbles[bi]; b.wobble += b.wobbleSpd * dt; b.x += b.vx * dt + Math.sin(b.wobble) * 0.8; b.y += b.vy * dt;
        if (b.y + b.r < 0) { escaped++; bubbles.splice(bi, 1); flash = 0.25; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.35; game.audio.play('se_failure', 0.2); if (escaped >= MAX_ESCAPE) { finish(false); return; } }
      }
      for (var pp = popParticles.length - 1; pp >= 0; pp--) { var p2 = popParticles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.vy += 200 * dt; p2.life -= dt * 2.5; if (p2.life <= 0) popParticles.splice(pp, 1); }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < popParticles.length; pp2++) { var pt = popParticles[pp2]; game.draw.rect(snap(pt.x) - snap(pt.r * pt.life), snap(pt.y) - snap(pt.r * pt.life), snap(pt.r * pt.life * 2) + 4, snap(pt.r * pt.life * 2) + 4, pt.col, pt.life); }
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.08);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.85), 52, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#060e1c');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
