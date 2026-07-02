// 372-puddle-jump.js
// 水たまりジャンプ — 雨の路上、3レーンを移動して迫る水たまりを避けながらゴールまで走る
// 操作: タップ左右／スワイプでレーン移動
// 成功: 80m 前進  失敗: 水たまりを3回 踏む or 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、雨の路上） ──
  var C = { bg:'#050a18', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', road:'#12203a' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'PUDDLE JUMP';
  var HOW_TO_PLAY = 'MOVE LANES · DODGE THE PUDDLES · REACH THE GOAL';
  var MAX_TIME = 12;
  var GOAL = 80;             // 修正2: 200m → 80m
  var MAX_SPLASH = 3;
  var LANES = 3, LANE_W = snap(W / 3), PY = snap(H * 0.76), SPEED = 300;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var lane, px, tx, dist, splash, timeLeft, done, particles, rain, puddles, spawnTimer, roadOff, jump;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1428');
  }

  function background() {
    game.draw.clear(C.bg); game.draw.rect(0, 0, W, H, C.road, 0.9);
    for (var li = 1; li < LANES; li++) { var lx = LANE_W * li; for (var seg = -1; seg < H / 120 + 1; seg++) { var ly = snap(seg * 120 + roadOff % 120); game.draw.rect(lx - 4, ly, 8, 60, C.g, 0.5); } }
  }

  function laneX(l) { return snap(LANE_W * l + LANE_W / 2); }

  function spawnPuddle() { puddles.push({ lane: Math.floor(Math.random() * LANES), y: -80, active: true }); }

  function initGame() { lane = 1; px = laneX(1); tx = px; dist = 0; splash = 0; timeLeft = MAX_TIME; done = false; particles = []; rain = []; puddles = []; spawnTimer = 0.5; roadOff = 0; jump = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.round(dist) * 60 + (MAX_SPLASH - splash) * 400 + Math.ceil(timeLeft) * 100) : Math.round(dist) * 30;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function move(dir) { lane = Math.max(0, Math.min(LANES - 1, lane + dir)); tx = laneX(lane); jump = 0.2; game.audio.play('se_tap', 0.3); }

  function drawPlayer() {
    var bob = jump > 0 ? -24 * (jump / 0.2) : Math.sin(game.time.elapsed * 8) * 4;
    pc(px, PY + bob, 40, C.c, 0.9); pc(px, PY - 52 + bob, 28, C.g, 0.9);
    game.draw.rect(snap(px - 28), snap(PY + 30 + bob), 22, 14, C.f, 0.9); game.draw.rect(snap(px + 6), snap(PY + 30 + bob), 22, 14, C.f, 0.9);
  }

  // ── 入力 ──
  game.onTap(function(x) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return; move(x < W / 2 ? -1 : 1);
  });

  game.onSwipe(function(d) {
    if (state !== S.PLAYING || done) return;
    if (d === 'left') move(-1); else if (d === 'right') move(1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (roadOff === undefined) roadOff = 0; roadOff += SPEED * dt; if (roadOff > 120) roadOff -= 120;
      if (!puddles) initGame(); background(); drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.16, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MADE IT!' : 'SOAKED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (jump > 0) jump -= dt;
      px += (tx - px) * 10 * dt;
      dist += SPEED * dt / 12;
      if (dist >= GOAL) { finish(true); return; }
      roadOff += SPEED * dt; if (roadOff > 120) roadOff -= 120;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnPuddle(); if (Math.random() < 0.3) spawnPuddle(); spawnTimer = 0.5 + Math.random() * 0.4; }
      for (var pi = puddles.length - 1; pi >= 0; pi--) {
        puddles[pi].y += SPEED * dt;
        if (puddles[pi].y > H + 100) { puddles.splice(pi, 1); continue; }
        if (puddles[pi].active && Math.abs(px - laneX(puddles[pi].lane)) < LANE_W * 0.4 && Math.abs(PY - puddles[pi].y) < 48) {
          puddles[pi].active = false; splash++; game.audio.play('se_failure', 0.4);
          for (var k = 0; k < 8; k++) { var a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI; particles.push({ x: px, y: PY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.e }); }
          if (splash >= MAX_SPLASH) { finish(false); return; }
        }
      }
      if (Math.random() < dt * 24) rain.push({ x: snap(Math.random() * W), y: 0, vy: 700 + Math.random() * 300, life: 2 });
      for (var ri = rain.length - 1; ri >= 0; ri--) { rain[ri].y += rain[ri].vy * dt; rain[ri].life -= dt; if (rain[ri].life <= 0 || rain[ri].y > H) rain.splice(ri, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    for (var pui = 0; pui < puddles.length; pui++) { var pd = puddles[pui], pdx = laneX(pd.lane); if (pd.active) { pc(pdx, pd.y, 52, C.d, 0.85); pc(pdx - 16, pd.y - 12, 14, C.e, 0.5); } else pc(pdx, pd.y, 52, C.e, 0.25); }
    for (var ri2 = 0; ri2 < rain.length; ri2++) game.draw.rect(rain[ri2].x, snap(rain[ri2].y), 3, 22, C.e, 0.6);
    drawPlayer();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    distBar();
    txt(Math.round(dist) + 'm', W / 2, 96, 44, C.c);
    txt(Math.round(dist) + ' / ' + GOAL + 'm   ' + Math.ceil(timeLeft) + 's', W / 2, 168, 44, C.b);
    for (var si = 0; si < MAX_SPLASH; si++) game.draw.rect(snap(W / 2 + (si - (MAX_SPLASH - 1) / 2) * 56) - 10, 224, 20, 20, si < splash ? C.a : '#0a1428');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
