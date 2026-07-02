// 336-gravity-flip.js
// グラビティフリップ — タップで重力を上下反転し、天井と床のトゲを避けてゴール距離まで走り抜ける
// 操作: タップで重力反転（床↔天井を行き来）
// 成功: 600mまで到達  失敗: トゲに3回当たる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、重力トンネル） ──
  var C = { bg:'#04020c', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', wall:'#241a4a' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY · DODGE THE SPIKES';
  var MAX_TIME = 15;
  var GOAL = 600;            // 修正2: 2000m → 600m
  var MAX_HITS = 3;
  var PR = 24, GFORCE = 1300, SCROLL = 220, FLOOR_Y = snap(H * 0.86), CEIL_Y = snap(H * 0.14), PX = snap(W * 0.18);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var py, pvy, grav, obstacles, scrollX, dist, hits, timeLeft, done, particles, trails, invin, flipAnim;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function distBar() {
    var t = Math.ceil(Math.min(1, dist / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#221400');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, 0, W, CEIL_Y, C.wall, 0.9); game.draw.rect(0, FLOOR_Y, W, H, C.wall, 0.9);
    for (var gx = -(scrollX % 120); gx < W; gx += 120) game.draw.rect(snap(gx), CEIL_Y, 2, FLOOR_Y - CEIL_Y, C.d, 0.15);
  }

  function makeObstacles() { obstacles = []; for (var i = 0; i < 16; i++) obstacles.push({ ox: 700 + i * 300 + Math.random() * 80, side: Math.random() < 0.5 ? 'floor' : 'ceiling', h: snap(70 + Math.random() * 90), w: 56 }); }

  function initGame() { py = snap(H * 0.5); pvy = 0; grav = 1; scrollX = 0; dist = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; trails = []; invin = 0; flipAnim = 0; makeObstacles(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(dist) * 20 + (MAX_HITS - hits) * 500 + Math.ceil(timeLeft) * 100) : Math.round(dist) * 20;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var oi = 0; oi < obstacles.length; oi++) {
      var o = obstacles[oi], sx = o.ox - scrollX + PX; if (sx < -o.w || sx > W + o.w) continue;
      var oy = o.side === 'floor' ? FLOOR_Y - o.h : CEIL_Y;
      game.draw.rect(snap(sx - o.w / 2), snap(oy), o.w, o.h, C.a, 0.9); game.draw.rect(snap(sx - o.w / 2), snap(oy), o.w, 8, C.g, 0.4);
      var tip = o.side === 'floor' ? oy : oy + o.h; pc(sx, tip, 14, C.g, 0.6);
    }
    for (var ti = 0; ti < trails.length; ti++) pc(trails[ti].x, trails[ti].y, PR * trails[ti].life, C.f, trails[ti].life * 0.4);
    var al = invin > 0 ? (Math.floor(game.time.elapsed * 16) % 2 ? 0.4 : 0.9) : 0.9;
    if (flipAnim > 0) pc(PX, py, PR * (1 + flipAnim), C.c, flipAnim * 0.4);
    pc(PX, py, PR, C.c, al); game.draw.rect(snap(PX) - 3, snap(py), 6, grav * (PR + 12), C.g, 0.6 * al);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    grav = -grav; flipAnim = 0.3; game.audio.play('se_tap', 0.3);
    for (var k = 0; k < 4; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PX, y: py, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.3, col: C.c }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.40, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.46, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.58, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.63, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOAL!' : 'CRASHED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('DIST ' + Math.round(dist) + 'm', W / 2, H * 0.45, 52, C.c);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.54, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.66, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flipAnim > 0) flipAnim -= dt * 3; if (invin > 0) invin -= dt;
      pvy += GFORCE * grav * dt; pvy = Math.max(-900, Math.min(900, pvy)); py += pvy * dt;
      if (py > FLOOR_Y - PR) { py = FLOOR_Y - PR; pvy = 0; } if (py < CEIL_Y + PR) { py = CEIL_Y + PR; pvy = 0; }
      trails.push({ x: PX, y: py, life: 0.25 }); for (var ti = trails.length - 1; ti >= 0; ti--) { trails[ti].life -= dt * 4; if (trails[ti].life <= 0) trails.splice(ti, 1); }
      scrollX += SCROLL * dt; dist += SCROLL * dt / 3;
      var last = obstacles.length ? obstacles[obstacles.length - 1].ox : 700; if (last - scrollX < W) obstacles.push({ ox: last + 260 + Math.random() * 120, side: Math.random() < 0.5 ? 'floor' : 'ceiling', h: snap(70 + Math.random() * 90), w: 56 });
      while (obstacles.length && obstacles[0].ox - scrollX < -200) obstacles.shift();
      if (invin <= 0) for (var oi = 0; oi < obstacles.length; oi++) {
        var o = obstacles[oi], sx = o.ox - scrollX + PX, top = o.side === 'floor' ? FLOOR_Y - o.h : CEIL_Y, bot = o.side === 'floor' ? FLOOR_Y : CEIL_Y + o.h;
        if (sx - o.w / 2 < PX + PR && sx + o.w / 2 > PX - PR && py - PR < bot && py + PR > top) { hits++; invin = 1.5; game.audio.play('se_failure', 0.5); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PX, y: py, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.a }); } if (hits >= MAX_HITS) { finish(false); return; } break; }
      }
      if (dist >= GOAL) { finish(true); return; }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    distBar();
    txt(Math.round(dist) + 'm', W / 2, 96, 44, C.c);
    txt(Math.round(dist) + ' / ' + GOAL + 'm   ' + Math.ceil(timeLeft) + 's', W / 2, 168, 44, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#221400');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
