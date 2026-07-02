// 432-sprout-care.js
// 芽吹きの世話 — 左タップで水、右タップで日光。水と日光のバランスを保って苗を満開まで育てる
// 操作: 画面左タップ=近い苗に水やり、右タップ=全体に日光
// 成功: 3本 満開にする  失敗: 1本でも枯れる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、苗床） ──
  var C = { bg:'#020a02', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SPROUT CARE';
  var HOW_TO_PLAY = 'TAP LEFT FOR WATER, RIGHT FOR SUN · BALANCE BOTH TO BLOOM';
  var MAX_TIME = 20;
  var NUM = 3;              // 修正2: 5 → 3
  var GROUND_Y = snap(H * 0.78);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var plants, bloomed, timeLeft, done, particles, waterFx, sunFx;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a0c');
  }

  function background() {
    game.draw.clear(C.bg); game.draw.rect(0, 0, W, GROUND_Y, '#041004', 0.5);
    if (sunFx > 0) pc(W * 0.8, 180, 60 + sunFx * 16, C.c, 0.5); else pc(W * 0.8, 180, 48, C.c, 0.3);
    if (waterFx > 0) pc(W * 0.18, 300, 30 + waterFx * 16, C.e, 0.6);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, '#1a0d00', 0.9); game.draw.rect(0, GROUND_Y, W, 4, C.f, 0.4);
  }

  function initGame() { plants = []; var sp = W / (NUM + 1); for (var i = 0; i < NUM; i++) plants.push({ x: snap(sp * (i + 1)), growth: 0.1, water: 0.5, sun: 0.5, health: 1.0, bloomed: false }); bloomed = 0; timeLeft = MAX_TIME; done = false; particles = []; waterFx = 0; sunFx = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (2000 + Math.ceil(timeLeft) * 100) : bloomed * 500;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawPlant(p) {
    var stemH = p.growth * 300, col = p.health < 0.5 ? C.f : C.b, sw = 8 + p.growth * 10;
    if (p.bloomed) { pline(p.x, GROUND_Y, p.x, GROUND_Y - 320, C.b, 0.9, sw); for (var li = 0; li < 6; li++) { var la = li * Math.PI / 3 + game.time.elapsed; pc(p.x + Math.cos(la) * 44, GROUND_Y - 320 + Math.sin(la) * 44, 20, C.a, 0.7); } pc(p.x, GROUND_Y - 320, 30, C.c, 0.9); pc(p.x - 40, GROUND_Y - 180, 26, C.b, 0.8); pc(p.x + 40, GROUND_Y - 120, 24, C.b, 0.7); }
    else { pline(p.x, GROUND_Y, p.x, GROUND_Y - stemH, col, 0.9, sw); if (p.growth > 0.35) { pc(p.x - 26, GROUND_Y - stemH * 0.6, 20, C.b, 0.7); pc(p.x + 24, GROUND_Y - stemH * 0.4, 18, C.b, 0.6); } pc(p.x, GROUND_Y - stemH, 14, C.b, 0.85); }
    var bw = 60, by = GROUND_Y + 16; game.draw.rect(snap(p.x - bw / 2), by, bw, 10, '#0a1a0c', 0.8); game.draw.rect(snap(p.x - bw / 2), by, bw * p.water, 10, C.e, 0.8); game.draw.rect(snap(p.x - bw / 2), by + 14, bw, 10, '#0a1a0c', 0.8); game.draw.rect(snap(p.x - bw / 2), by + 14, bw * p.sun, 10, C.c, 0.8);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (x < W / 2) { waterFx = 1.0; var near = -1, nd = 999; for (var pi = 0; pi < plants.length; pi++) { if (plants[pi].bloomed) continue; var d = Math.abs(plants[pi].x - x); if (d < nd) { nd = d; near = pi; } } if (near >= 0) { plants[near].water = Math.min(1, plants[near].water + 0.25); for (var w = 0; w < 4; w++) { var a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: plants[near].x, y: GROUND_Y, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, life: 0.5, col: C.e }); } } game.audio.play('se_tap', 0.3); }
    else { sunFx = 1.0; game.audio.play('se_tap', 0.2); for (var pi2 = 0; pi2 < plants.length; pi2++) if (!plants[pi2].bloomed) plants[pi2].sun = Math.min(1, plants[pi2].sun + 0.12); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (waterFx > 0) waterFx -= dt * 3; if (sunFx > 0) sunFx -= dt * 3;
    if (state === S.ATTRACT) {
      if (!plants) initGame(); background(); for (var pi0 = 0; pi0 < plants.length; pi0++) drawPlant(plants[pi0]);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.44, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.50, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN FULL BLOOM!' : 'WITHERED', W / 2, H * 0.35, 62, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      bloomed = 0;
      for (var pi3 = 0; pi3 < plants.length; pi3++) {
        var p = plants[pi3]; if (p.bloomed) { bloomed++; continue; }
        p.water = Math.max(0, p.water - dt * 0.08); p.sun = Math.max(0, p.sun - dt * 0.05);
        var bal = Math.min(p.water, p.sun), stress = Math.abs(p.water - p.sun);
        if (bal > 0.3 && stress < 0.4) p.growth += dt * 0.08 * bal;
        if (p.water < 0.1 || p.sun < 0.1 || stress > 0.6) p.health -= dt * 0.18; else p.health = Math.min(1, p.health + dt * 0.05);
        if (p.health <= 0) { finish(false); return; }
        if (p.growth >= 1.0) { p.bloomed = true; bloomed++; game.audio.play('se_success', 0.6); for (var f = 0; f < 10; f++) { var a = Math.random() * Math.PI * 2; particles.push({ x: p.x, y: GROUND_Y - 200, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 - 80, life: 0.8, col: C.a }); } if (bloomed >= NUM) { finish(true); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var pt = particles[pp]; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 200 * dt; pt.life -= dt; if (pt.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pi4 = 0; pi4 < plants.length; pi4++) drawPlant(plants[pi4]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.4);
    txt('WATER', W * 0.15, GROUND_Y - 8, 40, C.e); txt('SUN', W * 0.82, GROUND_Y - 8, 40, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(bloomed + ' / ' + NUM, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
