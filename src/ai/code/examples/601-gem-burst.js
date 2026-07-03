// 601-gem-burst.js
// ジェムバースト — 上から落ちてくる宝石を、床に届く前にタップで砕く。同色連続でコンボ加点
// 操作: 落下中の宝石をタップして砕く。同じ色を続けて砕くとコンボ、取りこぼすと失点
// 成功: 宝石 12個 破壊  失敗: 3個 落球 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、宝石鉱） ──
  var C = { bg:'#030008', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var GEMS = [[C.a, '#ff99bb'], [C.e, '#88bbff'], [C.b, '#88ffcc'], [C.c, '#ffdd88'], [C.d, '#ee99ff']];

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GEM BURST';
  var HOW_TO_PLAY = 'TAP FALLING GEMS TO SHATTER THEM · CHAIN SAME COLORS FOR COMBOS';
  var MAX_TIME = 18;
  var NEEDED   = 12;         // 修正2: 40 → 12
  var MAX_DROP = 3;          // 修正2: 10 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var gems, shattered, dropped, timeLeft, done, particles, flash, flashCol, comboCount, lastColor, comboTimer, nextGem;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#1a1a2e');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnGem() { var col = Math.floor(Math.random() * GEMS.length), size = 46 + Math.random() * 22; gems.push({ x: 80 + Math.random() * (W - 160), y: -size, vy: 170 + (MAX_TIME - timeLeft) * 8 + Math.random() * 50, r: size, colorIdx: col, phase: Math.random() * Math.PI * 2, shatter: false, shatterTimer: 0 }); }

  function initGame() { gems = []; shattered = 0; dropped = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.c; comboCount = 0; lastColor = -1; comboTimer = 0; nextGem = 0.5; spawnGem(); spawnGem(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (shattered * 400 + Math.ceil(timeLeft) * 100) : shattered * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var gi = 0; gi < gems.length; gi++) {
      var g = gems[gi], gc = GEMS[g.colorIdx], pu = 1 + Math.sin(g.phase) * 0.06;
      if (g.shatter) { var sa = 1 - g.shatterTimer / 0.3; for (var si = 0; si < 6; si++) { var fa = si / 6 * Math.PI * 2 + g.phase; pc(g.x + Math.cos(fa) * g.r * 0.6 * (1 - sa), g.y + Math.sin(fa) * g.r * 0.6 * (1 - sa), g.r * 0.3 * sa, gc[0], sa * 0.8); } continue; }
      pc(g.x, g.y, g.r * pu * 1.3, gc[0], 0.12); pc(g.x, g.y, g.r * pu, gc[0], 0.85); pc(g.x, g.y - g.r * 0.2, g.r * pu * 0.5, gc[1], 0.4); pc(g.x - g.r * 0.25, g.y - g.r * 0.25, g.r * 0.2, C.g, 0.5);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var gi = gems.length - 1; gi >= 0; gi--) {
      var g = gems[gi]; if (g.shatter) continue;
      if ((tx - g.x) * (tx - g.x) + (ty - g.y) * (ty - g.y) < (g.r + 20) * (g.r + 20)) {
        g.shatter = true; g.shatterTimer = 0; shattered++; var gc = GEMS[g.colorIdx];
        if (g.colorIdx === lastColor) comboCount++; else { comboCount = 1; lastColor = g.colorIdx; } comboTimer = 1.2;
        var bc = comboCount >= 3 ? 16 : 10; for (var pi = 0; pi < bc; pi++) { var a = Math.random() * Math.PI * 2, sp = 150 + Math.random() * 200; particles.push({ x: g.x, y: g.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 100, life: 0.6, col: gc[1] }); }
        if (comboCount >= 3) { flash = 0.3; flashCol = C.c; game.audio.play('se_success', 0.8); } else game.audio.play('se_success', 0.4);
        if (shattered >= NEEDED) { finish(true); return; } return;
      }
    }
    comboCount = 0; lastColor = -1;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!gems) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GEM MASTER!' : 'DROPPED OUT', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (comboTimer > 0) comboTimer -= dt;
      nextGem -= dt; if (nextGem <= 0) { spawnGem(); nextGem = Math.max(0.3, 0.7 - (MAX_TIME - timeLeft) * 0.02); }
      for (var gi = gems.length - 1; gi >= 0; gi--) {
        var g = gems[gi]; g.phase += dt * 3;
        if (g.shatter) { g.shatterTimer += dt; if (g.shatterTimer > 0.3) gems.splice(gi, 1); continue; }
        g.y += g.vy * dt;
        if (g.y > H + g.r + 20) { gems.splice(gi, 1); dropped++; flash = 0.2; flashCol = C.a; comboCount = 0; lastColor = -1; game.audio.play('se_failure', 0.2); if (dropped >= MAX_DROP) { finish(false); return; } }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.12);
    if (comboTimer > 0 && comboCount >= 2) txt(comboCount + 'x COMBO!', W / 2, snap(H * 0.82), 56 + comboCount * 4, C.c);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(shattered + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var di = 0; di < MAX_DROP; di++) game.draw.rect(snap(W / 2 + (di - (MAX_DROP - 1) / 2) * 56) - 10, 224, 20, 20, di < dropped ? C.a : '#1a1a2e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    state = S.ATTRACT;
    initGame();
  });
})(game);
