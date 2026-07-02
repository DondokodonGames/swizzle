// 395-tide-pool.js
// タイドプール — 満ちてくる潮に流されるヒトデをタップで拾い、岩の上へ避難させて救出する
// 操作: ヒトデをタップで選び、岩をタップして置く
// 成功: 4匹 救出  失敗: 3匹 流される or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、磯だまり） ──
  var C = { bg:'#04121e', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', ocean:'#123a5a' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TIDE POOL';
  var HOW_TO_PLAY = 'TAP A STARFISH THEN TAP A ROCK TO RESCUE IT';
  var MAX_TIME = 15;
  var NEEDED   = 4;          // 修正2: 8 → 4
  var MAX_LOST = 3;          // 修正2: 5 → 3
  var WATER_Y = snap(H * 0.72), RISE = 14;

  var rocks = [ { x: snap(W * 0.18), y: snap(H * 0.56), w: 180, h: 80 }, { x: snap(W * 0.52), y: snap(H * 0.50), w: 160, h: 90 }, { x: snap(W * 0.82), y: snap(H * 0.58), w: 170, h: 76 } ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var waterLevel, starfish, saved, lost, timeLeft, done, particles, selected, nextSpawn, wavePhase;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.16) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a2030');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, snap(H * 0.82), W, H, '#2a1a0a', 0.8);
    game.draw.rect(0, snap(waterLevel), W, H, C.ocean, 0.85);
    for (var wx = 0; wx < W; wx += 80) { var wy = snap(waterLevel + Math.sin(wavePhase + wx * 0.008) * 16); pc(wx + 40, wy, 30, C.d, 0.25); }
    for (var ri = 0; ri < rocks.length; ri++) { var rk = rocks[ri]; game.draw.rect(rk.x - rk.w / 2 - 8, rk.y - rk.h - 8, rk.w + 16, rk.h + 16, '#405060', 0.6); game.draw.rect(rk.x - rk.w / 2, rk.y - rk.h, rk.w, rk.h, '#556575', 0.9); }
  }

  function spawnStar() { starfish.push({ x: snap(80 + Math.random() * (W - 160)), y: snap(H * 0.76 + Math.random() * H * 0.08), vx: (Math.random() - 0.5) * 40, r: 34, angle: Math.random() * Math.PI * 2, saved: false }); }

  function initGame() { waterLevel = WATER_Y; starfish = []; saved = 0; lost = 0; timeLeft = MAX_TIME; done = false; particles = []; selected = null; nextSpawn = 0.6; wavePhase = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (saved * 500 + Math.ceil(timeLeft) * 100) : saved * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawStar(s, sel) {
    var inWater = s.y > waterLevel, alpha = s.saved ? 0.6 : inWater ? 0.45 : 0.9, col = s.saved ? C.b : C.f;
    if (sel) ring(s.x, s.y, s.r + 12, C.g, 0.5);
    for (var sp = 0; sp < 5; sp++) { var a = s.angle + sp * Math.PI * 2 / 5; pc(s.x + Math.cos(a) * s.r * 0.9, s.y + Math.sin(a) * s.r * 0.9, 12, col, alpha); }
    pc(s.x, s.y, 16, C.c, alpha * 0.9);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (selected !== null) {
      for (var ri = 0; ri < rocks.length; ri++) { var r = rocks[ri]; if (x > r.x - r.w / 2 && x < r.x + r.w / 2 && y > r.y - r.h && y < r.y + 20) { var s = selected; s.x = snap(r.x + (Math.random() - 0.5) * (r.w - 60)); s.y = snap(r.y - r.h / 2 - 10); s.vx = 0; s.saved = true; saved++; game.audio.play('se_success', 0.4); for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: s.x, y: s.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 0.6, col: C.b }); } if (saved >= NEEDED) { finish(true); return; } selected = null; return; } }
      selected = null; return;
    }
    for (var i = starfish.length - 1; i >= 0; i--) { var sf = starfish[i]; if (!sf.saved && Math.hypot(x - sf.x, y - sf.y) < sf.r + 24) { selected = sf; game.audio.play('se_tap', 0.3); return; } }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    wavePhase += dt * 1.8;
    if (state === S.ATTRACT) {
      if (!starfish) initGame(); background(); drawStar({ x: W * 0.4, y: H * 0.6, r: 34, angle: 0 }, false); drawStar({ x: W * 0.62, y: H * 0.64, r: 34, angle: 1 }, false);
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
      txt(resultSuccess ? 'RESCUED!' : 'WASHED AWAY', W / 2, H * 0.35, 72, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      waterLevel -= RISE * dt;
      nextSpawn -= dt; if (nextSpawn <= 0 && starfish.length < 6) { spawnStar(); nextSpawn = 1.4 + Math.random() * 1.2; }
      for (var i = starfish.length - 1; i >= 0; i--) {
        var sf = starfish[i]; if (sf.saved) continue; sf.x += sf.vx * dt; sf.angle += 0.5 * dt;
        if (sf.y > waterLevel) { sf.vx += (Math.random() - 0.3) * 20 * dt; sf.vx = Math.max(-80, Math.min(80, sf.vx)); }
        if (sf.x < -sf.r * 2 || sf.x > W + sf.r * 2 || sf.y > H + 60) { lost++; game.audio.play('se_failure', 0.3); starfish.splice(i, 1); if (lost >= MAX_LOST) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var i2 = 0; i2 < starfish.length; i2++) drawStar(starfish[i2], starfish[i2] === selected);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    txt(selected ? 'TAP A ROCK TO PLACE' : 'TAP A STARFISH', W / 2, snap(H * 0.90), 38, selected ? C.c : C.e);
    if (waterLevel < H * 0.42) txt('TIDE RISING!', W / 2, snap(H * 0.44), 48, C.a);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(saved + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var li = 0; li < MAX_LOST; li++) game.draw.rect(snap(W / 2 + (li - (MAX_LOST - 1) / 2) * 56) - 10, 224, 20, 20, li < lost ? C.a : '#0a2030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    state = S.ATTRACT;
    initGame();
  });
})(game);
