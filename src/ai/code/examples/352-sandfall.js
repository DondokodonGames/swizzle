// 352-sandfall.js
// サンドフォール — 上から降り注ぐ砂粒を、左右に動かす受け皿でキャッチして目標量を集める
// 操作: 左右スワイプ（またはタップした側）へ受け皿を動かす
// 成功: 砂を40粒 集める  失敗: 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、砂時計工房） ──
  var C = { bg:'#1a0f00', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', cup:'#5c2e10' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SANDFALL';
  var HOW_TO_PLAY = 'MOVE THE CUP TO CATCH THE FALLING SAND';
  var MAX_TIME = 15;
  var NEEDED   = 40;         // 修正2: 500 → 40
  var CUP_W = 220, CUP_H = 80, CUP_Y = snap(H * 0.76), CUP_SPEED = 560;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var cupX, cupDir, grains, collected, timeLeft, done, spawnTimer, particles;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1800');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(snap(W * 0.15), snap(H * 0.16), snap(W * 0.7), 50, C.f, 0.5); }

  function spawnGrain() { grains.push({ x: snap(W * 0.2 + Math.random() * W * 0.6), y: snap(H * 0.20), vx: (Math.random() - 0.5) * 80, vy: 0, r: 8 }); }

  function initGame() { cupX = W / 2; cupDir = 0; grains = []; collected = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0; particles = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (collected * 200 + Math.ceil(timeLeft) * 100) : collected * 80;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCup() {
    game.draw.rect(snap(cupX - CUP_W / 2 - 10), CUP_Y - CUP_H, 14, CUP_H + 10, C.cup, 0.9);
    game.draw.rect(snap(cupX + CUP_W / 2 - 4), CUP_Y - CUP_H, 14, CUP_H + 10, C.cup, 0.9);
    game.draw.rect(snap(cupX - CUP_W / 2 - 10), CUP_Y - 10, CUP_W + 20, 16, C.cup, 0.9);
    var fill = Math.min(1, collected / NEEDED), sh = fill * (CUP_H - 12);
    if (sh > 2) { game.draw.rect(snap(cupX - CUP_W / 2 + 2), snap(CUP_Y - sh), CUP_W - 4, snap(sh), C.c, 0.85); game.draw.rect(snap(cupX - CUP_W / 2 + 2), snap(CUP_Y - sh), CUP_W - 4, 6, C.g, 0.4); }
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    cupDir = x < W / 2 ? -1 : 1;
  });

  game.onSwipe(function(d) { if (state === S.PLAYING && !done) { if (d === 'left') cupDir = -1; else if (d === 'right') cupDir = 1; } });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!grains) initGame(); background(); drawCup();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FILLED UP!' : 'NOT ENOUGH', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(collected >= NEEDED); return; }
      cupX += cupDir * CUP_SPEED * dt; cupX = Math.max(CUP_W / 2 + 20, Math.min(W - CUP_W / 2 - 20, cupX)); cupDir *= (1 - 3 * dt); if (Math.abs(cupDir) < 0.01) cupDir = 0;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnGrain(); spawnTimer = 0.12 + Math.random() * 0.08; }
      for (var gi = grains.length - 1; gi >= 0; gi--) {
        var g = grains[gi]; g.vy += 600 * dt; g.x += g.vx * dt; g.y += g.vy * dt;
        if (g.x < g.r) { g.x = g.r; g.vx = Math.abs(g.vx); } if (g.x > W - g.r) { g.x = W - g.r; g.vx = -Math.abs(g.vx); }
        if (g.y > CUP_Y - CUP_H && g.y < CUP_Y + 20 && g.x > cupX - CUP_W / 2 && g.x < cupX + CUP_W / 2) { collected++; game.audio.play('se_tap', 0.15); grains.splice(gi, 1); if (collected >= NEEDED) { finish(true); return; } continue; }
        if (g.y > H) grains.splice(gi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var gi2 = 0; gi2 < grains.length; gi2++) game.draw.rect(snap(grains[gi2].x) - 4, snap(grains[gi2].y) - 4, 8, 8, C.c, 0.9);
    drawCup();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
