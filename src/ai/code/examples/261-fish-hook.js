// 261-fish-hook.js
// フィッシュフック — 泳ぐ魚に釣り針の高さを合わせ、重なった瞬間に引き上げて釣り上げる
// 操作: タップで投げ込み、魚に重なったらタップで引き上げ
// 成功: 魚を3匹釣る  失敗: 3回空振り or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、夜釣り） ──
  var C = { bg:'#020510', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#0c2a4a', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var FISH = [C.f, C.b, C.d];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FISH HOOK';
  var HOW_TO_PLAY = 'TAP TO CAST · TAP AGAIN ON A FISH TO REEL';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 10 → 3
  var MAX_MISS = 3;
  var WATER_Y = snap(H * 0.34), HOOK_X = snap(W / 2), TOP = 220;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var hookY, hookTarget, hookState, caughtIdx, fish, caught, misses, timeLeft, done, particles, fbText, fbCol, fbTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1424');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, WATER_Y, W, H - WATER_Y, C.d, 0.6);
    for (var xi = 0; xi < W; xi += 16) game.draw.rect(xi, snap(WATER_Y + Math.sin(xi * 0.02 + game.time.elapsed * 2) * 10), 16, 6, C.e, 0.4);
  }

  function drawHook() { for (var y = TOP; y < hookY; y += 12) game.draw.rect(HOOK_X - 2, snap(y), 4, 6, C.g, 0.5); pc(HOOK_X, hookY, 12, C.e, 0.9); }

  function drawFish(f) { var dir = f.vx > 0 ? 1 : -1; pc(f.x, f.y, f.r, f.col, 0.9); game.draw.rect(snap(f.x - dir * (f.r + 6)) - 6, snap(f.y) - 6, 12, 12, f.col, 0.7); game.draw.rect(snap(f.x + dir * f.r * 0.4) - 4, snap(f.y - f.r * 0.2) - 4, 8, 8, C.g, 0.8); }

  function spawnFish() { var side = Math.random() < 0.5 ? -1 : 1; fish.push({ x: side < 0 ? -80 : W + 80, y: snap(game.random(WATER_Y + 80, H - 200)), vx: side < 0 ? (90 + Math.random() * 60) : -(90 + Math.random() * 60), r: 30, col: FISH[Math.floor(Math.random() * FISH.length)], caught: false }); }

  function initGame() { hookY = WATER_Y - 40; hookTarget = hookY; hookState = 'up'; caughtIdx = -1; fish = []; caught = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; for (var i = 0; i < 4; i++) spawnFish(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 400 + Math.ceil(timeLeft) * 60) : caught * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (hookState === 'up') { hookTarget = snap(game.random(WATER_Y + 80, H - 200)); hookState = 'down'; game.audio.play('se_tap', 0.3); }
    else if (hookState === 'down') {
      hookState = 'reel'; hookTarget = WATER_Y - 40; var hooked = false;
      for (var fi = 0; fi < fish.length; fi++) { var f = fish[fi]; if (f.caught) continue; if ((HOOK_X - f.x) * (HOOK_X - f.x) + (hookY - f.y) * (hookY - f.y) < (f.r + 24) * (f.r + 24)) { f.caught = true; caughtIdx = fi; hooked = true; game.audio.play('se_success', 0.7); break; } }
      if (!hooked && hookY > WATER_Y) { misses++; fbText = 'MISSED'; fbCol = C.a; fbTimer = 0.5; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!fish) initGame(); background(); drawHook(); for (var i = 0; i < fish.length; i++) drawFish(fish[i]);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOOD CATCH!' : 'ONE THAT GOT AWAY', W / 2, H * 0.35, 54, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      if (hookY < hookTarget) hookY = Math.min(hookTarget, hookY + 400 * dt); else if (hookY > hookTarget) hookY = Math.max(hookTarget, hookY - 400 * dt);
      if (hookState === 'reel' && hookY <= WATER_Y - 30) {
        if (caughtIdx >= 0 && fish[caughtIdx]) { caught++; fbText = 'CAUGHT!'; fbCol = C.b; fbTimer = 0.6; for (var pi = 0; pi < 8; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: HOOK_X, y: WATER_Y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6 }); } fish.splice(caughtIdx, 1); caughtIdx = -1; if (caught >= NEEDED) { finish(true); return; } }
        hookState = 'up';
      }
      if (caughtIdx >= 0 && fish[caughtIdx]) { fish[caughtIdx].x = HOOK_X; fish[caughtIdx].y = hookY + 20; }
      for (var fi2 = fish.length - 1; fi2 >= 0; fi2--) { var f2 = fish[fi2]; if (f2.caught) continue; f2.x += f2.vx * dt; if (f2.x < -120 || f2.x > W + 120) fish.splice(fi2, 1); }
      if (fish.length < 5 && Math.random() < 0.03) spawnFish();
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var fi3 = 0; fi3 < fish.length; fi3++) drawFish(fish[fi3]);
    drawHook();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, C.c, particles[pp2].life * 1.4);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.28, 48, fbCol);
    else txt(hookState === 'up' ? 'TAP TO CAST' : hookState === 'down' ? 'TAP ON A FISH!' : '...', W / 2, H * 0.28, 36, hookState === 'down' ? C.c : C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mm = 0; mm < MAX_MISS; mm++) game.draw.rect(snap(W / 2 + (mm - (MAX_MISS - 1) / 2) * 56) - 10, H - 100, 20, 20, mm < misses ? C.a : '#0a1424');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
