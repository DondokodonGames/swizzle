// 435-petal-fall.js
// 花びらの舞 — 風に舞って落ちてくる桜の花びらを、地面に落ちる前にタップして受け止める
// 操作: 落ちてくる花びらをタップ（地面に落ちるとミス）
// 成功: 6枚 キャッチ  失敗: 3枚 落とす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、桜並木） ──
  var C = { bg:'#0d0408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var PETAL = [C.a, C.d, C.f, C.c];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PETAL FALL';
  var HOW_TO_PLAY = 'TAP THE FALLING PETALS BEFORE THEY HIT THE GROUND';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 30 → 6
  var MAX_DROP = 3;          // 修正2: 10 → 3
  var GROUND_Y = snap(H * 0.86);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var petals, caught, dropped, timeLeft, done, particles, spawnTimer, wind, windTimer, flash, flashCol;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a0814');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(snap(W * 0.5) - 20, snap(H * 0.28), 40, H, '#2a1006', 0.8); pc(W * 0.5, H * 0.22, 90, C.a, 0.15);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#1a0d1a', 0.9); game.draw.rect(0, GROUND_Y, W, 4, C.d, 0.5);
  }

  function spawnPetal() { petals.push({ x: snap(100 + Math.random() * (W - 200)), y: -40, vx: (Math.random() - 0.5) * 80, vy: 60 + Math.random() * 70 + caught * 4, r: 20 + Math.random() * 12, col: PETAL[Math.floor(Math.random() * PETAL.length)], wob: Math.random() * Math.PI * 2 }); }

  function initGame() { petals = []; caught = 0; dropped = 0; timeLeft = MAX_TIME; done = false; particles = []; spawnTimer = 0.4; wind = 0; windTimer = 0; flash = 0; flashCol = C.b; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPetal(p) { var ws = Math.sin(p.wob) * 8; pc(p.x + ws, p.y, p.r, p.col, 0.9); pc(p.x + ws - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.35, C.g, 0.4); pc(p.x + ws, p.y, p.r * 0.4, C.c, 0.4); }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var pi = petals.length - 1; pi >= 0; pi--) { var p = petals[pi]; if (Math.hypot(x - p.x, y - p.y) < p.r + 30) { caught++; flash = 0.35; flashCol = C.b; game.audio.play('se_tap', 0.3); for (var k = 0; k < 6; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100 - 50, life: 0.5, col: p.col }); } petals.splice(pi, 1); if (caught >= NEEDED) { finish(true); return; } break; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!petals) initGame(); background(); drawPetal({ x: W * 0.35, y: H * 0.45, r: 26, col: C.a, wob: 0 }); drawPetal({ x: W * 0.62, y: H * 0.5, r: 24, col: C.d, wob: 1 });
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'PETAL DANCE!' : 'FADED', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
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
      windTimer += dt; wind = Math.sin(windTimer * 0.4) * 40 + Math.sin(windTimer * 0.9) * 20;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnPetal(); spawnTimer = Math.max(0.5, 0.9 - caught * 0.03); }
      for (var pi = petals.length - 1; pi >= 0; pi--) {
        var p = petals[pi]; p.vx += (wind - p.vx) * dt * 0.5; p.x += p.vx * dt; p.y += p.vy * dt; p.wob += dt * 3;
        if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx) * 0.5; } if (p.x > W - p.r) { p.x = W - p.r; p.vx = -Math.abs(p.vx) * 0.5; }
        if (p.y > GROUND_Y) { dropped++; flash = 0.4; flashCol = C.a; game.audio.play('se_failure', 0.2); petals.splice(pi, 1); if (dropped >= MAX_DROP) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var pt = particles[pp]; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 150 * dt; pt.life -= dt; if (pt.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pi2 = 0; pi2 < petals.length; pi2++) drawPetal(petals[pi2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.07);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DROP; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DROP - 1) / 2) * 56) - 10, 224, 20, 20, di < dropped ? C.a : '#1a0814');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
