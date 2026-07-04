// 674-popcorn.js
// ポップコーン — 鍋の中の粒が弾けて飛び上がった一瞬、タップでキャッチする
// 操作: 弾けて「POP!」と光った粒をタップ。窓の時間内に取らないと逃げてしまう
// 成功: 12粒 キャッチ  失敗: 3粒 逃走 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、屋台） ──
  var C = { bg:'#0a0400', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'POPCORN';
  var HOW_TO_PLAY = 'TAP EACH KERNEL THE MOMENT IT POPS UP · GRAB IT BEFORE IT ESCAPES';
  var MAX_TIME = 18;
  var NEEDED   = 12;         // 修正2: 30 → 12
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var PAN_Y = snap(H * 0.76), PAN_W = W * 0.8, PAN_H = 80, PAN_X = W / 2, SPAWN_RATE = 0.85;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var kernels, nextId, spawnTimer, caught, missed, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#100500');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnKernel() { kernels.push({ id: nextId++, x: PAN_X - PAN_W * 0.4 + Math.random() * PAN_W * 0.8, y: PAN_Y - 20, heatTime: 0, HEAT_DUR: 1.0 + Math.random(), popping: false, popTimer: 0, POP_WINDOW: 0.55, tapped: false, vy: 0 }); }

  function initGame() { kernels = []; nextId = 0; spawnTimer = 0; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnKernel(); spawnKernel(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    game.draw.rect(PAN_X - PAN_W / 2, PAN_Y, PAN_W, PAN_H, '#1c0f00', 0.9); game.draw.rect(PAN_X - PAN_W / 2, PAN_Y, PAN_W, 14, '#3d1f00', 0.6);
    game.draw.rect(PAN_X - PAN_W / 2 + 20, PAN_Y + PAN_H, PAN_W - 40, 20, C.a, 0.3);
    for (var ki = 0; ki < kernels.length; ki++) {
      var k = kernels[ki];
      if (k.popping) { var pa = k.popTimer / k.POP_WINDOW, r = 40 + (1 - pa) * 20; pc(k.x, k.y, r, C.f, 0.9); pc(k.x - r * 0.3, k.y - r * 0.3, r * 0.28, C.c, 0.6); if (pa > 0.3) txt('POP!', k.x, k.y - r - 30, 36, C.c); }
      else { var hr = k.heatTime / k.HEAT_DUR; pc(k.x, k.y, 22, hr > 0.7 ? C.c : '#f5f0e8', 0.85); if (hr > 0.8) pc(k.x, k.y, 30, C.a, ((Math.sin(game.time.elapsed * 10) + 1) * 0.5) * 0.4); }
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = kernels.length - 1; i >= 0; i--) {
      var k = kernels[i]; if (!k.popping || k.tapped) continue;
      var dx = tx - k.x, dy = ty - k.y;
      if (dx * dx + dy * dy < 70 * 70) {
        k.tapped = true; caught++; flash = 0.25; flashCol = C.b; resultText = 'CAUGHT!'; resultTimer = 0.45; game.audio.play('se_success', 0.5);
        for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: k.x, y: k.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.c }); }
        if (caught >= NEEDED) { finish(true); return; } break;
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!kernels) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BUTTERY!' : 'BURNT BATCH', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
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
      spawnTimer += dt; if (spawnTimer >= SPAWN_RATE && kernels.length < 6) { spawnTimer = 0; spawnKernel(); }
      for (var i = kernels.length - 1; i >= 0; i--) {
        var k = kernels[i];
        if (!k.popping) { k.heatTime += dt; if (k.heatTime >= k.HEAT_DUR) { k.popping = true; k.popTimer = k.POP_WINDOW; k.vy = -(400 + Math.random() * 200); game.audio.play('se_tap', 0.08); } }
        else {
          k.popTimer -= dt; k.y += k.vy * dt; k.vy += 600 * dt;
          if (k.popTimer <= 0 && !k.tapped) { missed++; flash = 0.25; flashCol = C.a; resultText = 'ESCAPED!'; resultTimer = 0.4; game.audio.play('se_failure', 0.2); kernels.splice(i, 1); if (missed >= MAX_MISS) { finish(false); return; } continue; }
          if (k.tapped || k.y > H) kernels.splice(i, 1);
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.62), 64, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#100500');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
