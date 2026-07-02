// 308-flower-bloom.js
// 花ひらく — つぼみの成長リングが最高潮のときに水をやり、一気に咲かせる園芸タイミングゲーム
// 操作: つぼみ付近をタップで水やり（リング最大で当てると開花）
// 成功: 3本咲かせる  失敗: 3本枯らす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ナイトガーデン） ──
  var C = { bg:'#030a02', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', soil:'#2a1808' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'FLOWER BLOOM';
  var HOW_TO_PLAY = 'TAP WHEN THE RING IS FULL TO BLOOM';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 12 → 3
  var MAX_WITHER = 3;        // 修正2: 5 → 3
  var SLOTS = 4, SOIL_Y = snap(H * 0.72);
  var PCOLS = [C.a, C.c, C.d];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var flowers, bloomed, withered, timeLeft, done, spawnTimer, particles;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.22) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function pline(x1, y1, x2, y2, color, alpha, w) { var dx = x2 - x1, dy = y2 - y1, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8)); w = w || 8; for (var i = 0; i <= n; i++) game.draw.rect(snap(x1 + dx * i / n) - w / 2, snap(y1 + dy * i / n) - w / 2, w, w, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#102008');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, SOIL_Y, W, H, C.soil, 0.9); game.draw.rect(0, SOIL_Y, W, 12, C.f, 0.4); }

  function slotX(s) { return snap((s + 0.5) * W / SLOTS); }

  function spawnFlower() {
    var free = []; for (var s = 0; s < SLOTS; s++) { var occ = false; for (var i = 0; i < flowers.length; i++) if (flowers[i].slot === s) { occ = true; break; } if (!occ) free.push(s); }
    if (!free.length || flowers.length >= 3) return;
    var slot = free[Math.floor(Math.random() * free.length)];
    flowers.push({ slot: slot, x: slotX(slot), phase: 'grow', grow: 0, rate: 0.32 + Math.random() * 0.12, life: 5, col: PCOLS[Math.floor(Math.random() * PCOLS.length)], anim: 0 });
  }

  function initGame() { flowers = []; bloomed = 0; withered = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.3; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (bloomed * 500 + Math.ceil(timeLeft) * 100) : bloomed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawFlower(f) {
    var top = snap(SOIL_Y - f.grow * 200);
    if (f.phase === 'wither') { pline(f.x, SOIL_Y, f.x, top + 40, C.soil, 0.9, 8); pc(f.x, top + 40, 14, '#442200', 0.8); return; }
    pline(f.x, SOIL_Y, f.x, top, C.b, 0.9, 8);
    if (f.grow > 0.3) pc(f.x + 28, top + 70, 14, C.b, 0.7);
    if (f.phase === 'bloom') {
      for (var pet = 0; pet < 8; pet++) { var pa = pet / 8 * Math.PI * 2 + f.anim * 0.3, pr = 42; pc(f.x + Math.cos(pa) * pr, top + Math.sin(pa) * pr, 18, f.col, 0.9); }
      pc(f.x, top, 22, C.c, 0.95);
    } else {
      var budR = 12 + f.grow * 14; pc(f.x, top, budR, f.col, 0.9);
      var perfect = f.grow > 0.7, segs = 12, on = Math.ceil(segs * Math.min(1, f.grow));
      for (var sg = 0; sg < on; sg++) { var sa = -Math.PI / 2 + sg / segs * Math.PI * 2; game.draw.rect(snap(f.x + Math.cos(sa) * (budR + 16)) - 4, snap(top + Math.sin(sa) * (budR + 16)) - 4, 8, 8, perfect ? C.b : C.e, 0.9); }
    }
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var best = -1, bd = 130; for (var i = 0; i < flowers.length; i++) { if (flowers[i].phase !== 'grow') continue; var d = Math.abs(x - flowers[i].x); if (d < bd) { bd = d; best = i; } }
    if (best === -1) return;
    var f = flowers[best], bonus = (f.grow > 0.7 && f.grow < 1.0) ? 0.5 : 0.15;
    f.grow = Math.min(1, f.grow + bonus); f.life = f.life + 1; game.audio.play('se_tap', 0.3);
    if (f.grow >= 1) {
      f.phase = 'bloom'; f.anim = 0; bloomed++; game.audio.play('se_success', 0.5);
      for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: f.x, y: SOIL_Y - f.grow * 200, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180 - 60, life: 0.8, col: f.col }); }
      if (bloomed >= NEEDED) { finish(true); return; }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!flowers) initGame(); background(); drawFlower({ x: W / 2, phase: 'bloom', grow: 1, col: C.a, anim: game.time.elapsed });
      txt(GAME_TITLE, W / 2, H * 0.16, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'IN FULL BLOOM!' : 'WITHERED', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnFlower(); spawnTimer = 1.3 + Math.random() * 0.8; }
      for (var i = flowers.length - 1; i >= 0; i--) {
        var f = flowers[i];
        if (f.phase === 'grow') { f.grow = Math.min(1.3, f.grow + f.rate * dt); f.life -= dt; if (f.grow >= 1.25) { f.phase = 'wither'; f.life = 1.2; withered++; game.audio.play('se_failure', 0.3); if (withered >= MAX_WITHER) { finish(false); return; } } else if (f.life <= 0) { f.phase = 'wither'; f.life = 1.2; withered++; game.audio.play('se_failure', 0.3); if (withered >= MAX_WITHER) { finish(false); return; } } }
        else if (f.phase === 'bloom') { f.anim += dt; f.life -= dt; if (f.life <= 0) flowers.splice(i, 1); }
        else { f.life -= dt; if (f.life <= 0) flowers.splice(i, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var i2 = 0; i2 < flowers.length; i2++) drawFlower(flowers[i2]);
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.2);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(bloomed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var wi = 0; wi < MAX_WITHER; wi++) game.draw.rect(snap(W / 2 + (wi - (MAX_WITHER - 1) / 2) * 56) - 10, 224, 20, 20, wi < withered ? C.a : '#102008');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
