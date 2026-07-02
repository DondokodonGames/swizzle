// 301-ice-skate.js
// 氷上の演技 — 惰性で滑り続けるスケーターをタップで90度旋回させ、壁を避けてゴールへ導く
// 操作: タップで進行方向を時計回りに90度変える
// 成功: 3つのゴールに到達  失敗: 壁に3回ぶつかる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、氷上リンク） ──
  var C = { bg:'#020c1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', ice:'#0c2a4a' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE SKATE';
  var HOW_TO_PLAY = 'TAP TO TURN 90° · REACH THE GOAL · DODGE WALLS';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_HIT  = 3;
  var GRID = 7, CELL = snap(W * 0.82 / GRID), OX = snap((W - CELL * GRID) / 2), OY = snap(H * 0.24);
  var SPEED = 9;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sx, sy, dirX, dirY, goalX, goalY, scored, hits, timeLeft, done, trail, particles, hitFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.24) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2e');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var gx = 0; gx < GRID; gx++) for (var gy = 0; gy < GRID; gy++) { game.draw.rect(OX + gx * CELL + 2, OY + gy * CELL + 2, CELL - 4, CELL - 4, C.ice, 0.7); game.draw.rect(OX + gx * CELL + 2, OY + gy * CELL + 2, CELL - 4, 4, C.e, 0.25); }
    game.draw.rect(OX - 16, OY - 16, GRID * CELL + 32, 16, C.d, 0.9); game.draw.rect(OX - 16, OY + GRID * CELL, GRID * CELL + 32, 16, C.d, 0.9);
    game.draw.rect(OX - 16, OY - 16, 16, GRID * CELL + 32, C.d, 0.9); game.draw.rect(OX + GRID * CELL, OY - 16, 16, GRID * CELL + 32, C.d, 0.9);
  }

  function cellCX(gx) { return OX + gx * CELL + CELL / 2; }
  function cellCY(gy) { return OY + gy * CELL + CELL / 2; }

  function placeGoal() { var gx, gy; do { gx = Math.floor(Math.random() * GRID); gy = Math.floor(Math.random() * GRID); } while (Math.abs(cellCX(gx) - sx) < CELL * 2 && Math.abs(cellCY(gy) - sy) < CELL * 2); goalX = cellCX(gx); goalY = cellCY(gy); }

  function initGame() { sx = cellCX(Math.floor(GRID / 2)); sy = cellCY(GRID - 1); dirX = 0; dirY = -1; scored = 0; hits = 0; timeLeft = MAX_TIME; done = false; trail = []; particles = []; hitFlash = 0; placeGoal(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (scored * 500 + Math.ceil(timeLeft) * 100) : scored * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawGoal() { var p = 4 * (Math.floor(game.time.elapsed * 4) % 2); ring(goalX, goalY, 30 + p, C.b, 0.7); pc(goalX, goalY, 18, C.b, 0.85); pc(goalX, goalY, 8, C.g, 0.9); }

  function drawSkater() { pc(sx, sy - 24, 16, C.g, 0.95); game.draw.rect(snap(sx) - 5, snap(sy - 8), 10, 26, C.g, 0.9); game.draw.rect(snap(sx + dirX * 36) - 6, snap(sy + dirY * 36) - 6, 12, 12, C.e, 0.9); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var nx = -dirY, ny = dirX; dirX = nx; dirY = ny; game.audio.play('se_tap', 0.25);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (goalX === undefined) initGame(); background(); drawGoal(); drawSkater();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.19, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOLD MEDAL!' : 'WIPEOUT', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (hitFlash > 0) hitFlash -= dt;
      var mv = CELL * SPEED, nx = sx + dirX * mv * dt, ny = sy + dirY * mv * dt;
      if (nx < OX + CELL * 0.4 || nx > OX + GRID * CELL - CELL * 0.4 || ny < OY + CELL * 0.4 || ny > OY + GRID * CELL - CELL * 0.4) {
        hits++; hitFlash = 0.4; game.audio.play('se_failure', 0.5);
        for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: sx, y: sy, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.5, col: C.a }); }
        dirX = -dirX; dirY = -dirY; sx += dirX * CELL * 0.3; sy += dirY * CELL * 0.3;
        if (hits >= MAX_HIT) { finish(false); return; }
      } else { sx = nx; sy = ny; }
      trail.push({ x: sx, y: sy, a: 0.7 }); if (trail.length > 24) trail.shift();
      if (Math.abs(sx - goalX) < CELL * 0.6 && Math.abs(sy - goalY) < CELL * 0.6) {
        scored++; game.audio.play('se_success', 0.5);
        for (var k2 = 0; k2 < 10; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: goalX, y: goalY, vx: Math.cos(a2) * 250, vy: Math.sin(a2) * 250, life: 0.6, col: C.b }); }
        if (scored >= NEEDED) { finish(true); return; }
        placeGoal();
      }
      for (var ti = 0; ti < trail.length; ti++) trail[ti].a -= dt * 2;
      trail = trail.filter(function(t) { return t.a > 0; });
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    if (hitFlash > 0) game.draw.rect(OX, OY, GRID * CELL, GRID * CELL, C.a, hitFlash * 0.3);
    for (var ti2 = 0; ti2 < trail.length; ti2++) game.draw.rect(snap(trail[ti2].x) - 6, snap(trail[ti2].y) - 6, 12, 12, C.e, trail[ti2].a * 0.6);
    drawGoal(); drawSkater();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.8);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(scored + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HIT; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0a1a2e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
