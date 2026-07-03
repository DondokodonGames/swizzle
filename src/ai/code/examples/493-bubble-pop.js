// 493-bubble-pop.js
// バブルポップ — 膨らみながら浮かぶシャボン玉を、最大サイズ付近でタップして割る
// 操作: バブルが十分大きくなった瞬間にタップ（小さいうちは得点にならない）
// 成功: 6個 割る  失敗: 3個 逃す or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、水中の泡） ──
  var C = { bg:'#020818', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BUBBLE POP';
  var HOW_TO_PLAY = 'TAP EACH BUBBLE WHEN IT SWELLS TO FULL SIZE';
  var MAX_TIME = 15;
  var NEEDED     = 6;        // 修正2: 20 → 6
  var MAX_ESCAPE = 3;        // 修正2: 5 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bubbles, particles, popped, escaped, timeLeft, done, nextSpawn, spawnInterval, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.12) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#041028');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBubble() { bubbles.push({ x: snap(120 + Math.random() * (W - 240)), y: H * 0.82, r: 8, maxR: 70 + Math.random() * 60, growing: true, growRate: 30 + Math.random() * 30, floatVy: -(30 + Math.random() * 40), wob: Math.random() * Math.PI * 2, wobSp: 1.5 + Math.random() * 2, wobAmp: 15 + Math.random() * 20, popping: false, popTimer: 0 }); }

  function initGame() { bubbles = []; particles = []; popped = 0; escaped = 0; timeLeft = MAX_TIME; done = false; nextSpawn = 0.8; spawnInterval = 1.2; flash = 0; flashCol = C.b; spawnBubble(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (popped * 500 + Math.ceil(timeLeft) * 100) : popped * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawBubbles() {
    for (var bi = 0; bi < bubbles.length; bi++) {
      var b = bubbles[bi], ratio = b.r / b.maxR;
      if (!b.popping) { var ready = !b.growing; var col = ready ? C.b : (ratio >= 0.75 ? C.e : '#305060'); if (ready) ring(b.r + 8 > 0 ? b.x : b.x, b.y, b.r + 8, C.b, 0.3); ring(b.x, b.y, b.r, col, 0.6); pc(b.x, b.y, b.r * 0.3, C.e, 0.15); pc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.14, C.g, 0.5); }
      else pc(b.x, b.y, b.r, C.g, (1 - b.popTimer / 0.3) * 0.5);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i]; if (b.popping) continue;
      if ((tx - b.x) * (tx - b.x) + (ty - b.y) * (ty - b.y) <= (b.r + 12) * (b.r + 12)) {
        b.popping = true; b.popTimer = 0.3;
        if (b.r / b.maxR >= 0.75) { popped++; flash = 0.3; flashCol = C.b; game.audio.play('se_success', 0.7); for (var pi = 0; pi < 12; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: C.e }); } if (popped >= NEEDED) { finish(true); return; } }
        else game.audio.play('se_tap', 0.3);
        return;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bubbles) initGame(); background(); drawBubbles();
      txt(GAME_TITLE, W / 2, H * 0.20, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.26, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.50, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL POPPED!' : 'FLOATED AWAY', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      nextSpawn -= dt; if (nextSpawn <= 0) { spawnBubble(); spawnInterval = Math.max(0.7, spawnInterval - 0.04); nextSpawn = spawnInterval; }
      for (var i = bubbles.length - 1; i >= 0; i--) {
        var b = bubbles[i]; b.wob += b.wobSp * dt; b.x += Math.sin(b.wob) * b.wobAmp * dt;
        if (b.popping) { b.r *= (1 + dt * 5); b.popTimer -= dt; if (b.popTimer <= 0) bubbles.splice(i, 1); continue; }
        if (b.growing) { b.r += b.growRate * dt; if (b.r >= b.maxR) { b.r = b.maxR; b.growing = false; } }
        else { b.y += b.floatVy * dt; if (b.y + b.r < -20) { escaped++; bubbles.splice(i, 1); flash = 0.3; flashCol = C.a; game.audio.play('se_failure', 0.3); if (escaped >= MAX_ESCAPE) { finish(false); return; } } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawBubbles();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(popped + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var ei = 0; ei < MAX_ESCAPE; ei++) game.draw.rect(snap(W / 2 + (ei - (MAX_ESCAPE - 1) / 2) * 56) - 10, 224, 20, 20, ei < escaped ? C.a : '#041028');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
