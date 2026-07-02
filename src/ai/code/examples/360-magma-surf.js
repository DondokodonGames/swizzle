// 360-magma-surf.js
// マグマサーフ — 3レーンの溶岩流をサーフし、降ってくる岩をタップ/スワイプでレーン移動して避け生き残る
// 操作: 左右スワイプ（またはレーンをタップ）で移動して岩を避ける
// 成功: 10秒生き残る  失敗: 岩に3回ぶつかる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、溶岩流） ──
  var C = { bg:'#0d0200', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', lava:'#c02010' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGMA SURF';
  var HOW_TO_PLAY = 'SWIPE OR TAP LANES TO DODGE THE ROCKS';
  var NEEDED   = 10;         // 修正2: サバイバル 30s → 10s
  var MAX_HITS = 3;
  var LANES = 3, LANE_W = snap(W / 3), BOARD_Y = snap(H * 0.72);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lane, boardX, obstacles, survived, hits, timeLeft, done, spawnTimer, particles, wave, invin;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / NEEDED * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#2a1000');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var row = 0; row < 10; row++) { var ry = snap((row * H / 9 + wave * 60) % H); game.draw.rect(0, ry, W, snap(H / 12), C.lava, 0.4 + Math.sin(wave + row) * 0.1); }
    game.draw.rect(0, 0, W, H, C.f, 0.08);
    game.draw.rect(LANE_W - 1, 0, 2, H, C.f, 0.4); game.draw.rect(2 * LANE_W - 1, 0, 2, H, C.f, 0.4);
  }

  function laneX(l) { return snap(LANE_W * (l + 0.5)); }

  function spawnObstacle() { var l = Math.floor(Math.random() * LANES); obstacles.push({ lane: l, y: -80, speed: 320 + Math.random() * 180 + survived * 20, r: 44 }); }

  function initGame() { lane = 1; boardX = laneX(1); obstacles = []; survived = 0; hits = 0; timeLeft = NEEDED; done = false; spawnTimer = 0.5; particles = []; wave = 0; invin = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(survived) * 300 + (MAX_HITS - hits) * 500) : Math.round(survived) * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var oi = 0; oi < obstacles.length; oi++) { var o = obstacles[oi], ox = laneX(o.lane) + Math.sin(wave * 2 + oi) * 12; pc(ox, o.y, o.r, '#555', 0.9); pc(ox - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.25, '#888', 0.4); }
    var al = invin > 0 ? (Math.floor(game.time.elapsed * 16) % 2 ? 0.4 : 0.9) : 0.9;
    game.draw.rect(snap(boardX) - 50, snap(BOARD_Y + 10), 100, 20, C.e, al); pc(boardX, BOARD_Y - 22, 26, C.c, al); pc(boardX, BOARD_Y - 46, 16, C.g, al);
    game.draw.rect(snap(boardX) - 42, snap(BOARD_Y - 28), 84, 8, C.c, al);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    lane = x < W / 3 ? 0 : x < 2 * W / 3 ? 1 : 2; game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(d) { if (state === S.PLAYING && !done) { if (d === 'left' && lane > 0) { lane--; game.audio.play('se_tap', 0.2); } else if (d === 'right' && lane < 2) { lane++; game.audio.play('se_tap', 0.2); } } });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    wave += dt;
    if (state === S.ATTRACT) {
      if (!obstacles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.32, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.38, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.50, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.56, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVOR!' : 'BURNED UP', W / 2, H * 0.35, 74, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived = NEEDED - Math.max(0, timeLeft);
      if (timeLeft <= 0) { finish(true); return; }
      if (invin > 0) invin -= dt;
      boardX += (laneX(lane) - boardX) * Math.min(1, 10 * dt);
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = Math.max(0.35, 0.7 - survived * 0.03); }
      for (var oi = obstacles.length - 1; oi >= 0; oi--) {
        var o = obstacles[oi]; o.y += o.speed * dt; var ox = laneX(o.lane);
        if (invin <= 0 && Math.hypot(boardX - ox, BOARD_Y - o.y) < o.r + 30) { hits++; invin = 1.5; game.audio.play('se_failure', 0.5); for (var k = 0; k < 10; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: boardX, y: BOARD_Y, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.6, col: C.f }); } obstacles.splice(oi, 1); if (hits >= MAX_HITS) { finish(false); return; } continue; }
        if (o.y > H + 100) obstacles.splice(oi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('SURVIVE ' + Math.floor(survived) + ' / ' + NEEDED + 's', W / 2, 168, 46, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#2a1000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
