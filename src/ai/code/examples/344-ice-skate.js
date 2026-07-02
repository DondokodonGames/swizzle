// 344-ice-skate.js
// アイススケート — 惰性で滑り続けるスケーターをタップで方向転換し、壁の隙間を抜けフラグを通過
// 操作: タップで左右の進行方向を切り替える（壁の穴を狙う）
// 成功: 3本のフラグを通過  失敗: 壁に3回ぶつかる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、スケートリンク） ──
  var C = { bg:'#020c1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff', ice:'#0c2a4a' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ICE SKATE';
  var HOW_TO_PLAY = 'TAP TO CHANGE DIRECTION · PASS THROUGH THE GAPS';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_HITS = 3;
  var SPEED = 380, WALL_GAP = 420;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var sx, sy, vx, vy, dir, flags, walls, passed, hits, timeLeft, done, invin, trail, particles, cameraY;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a2e');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, H, C.ice, 0.4); }

  function initLevel() {
    flags = []; walls = []; var startY = H * 0.3;
    for (var i = 0; i < NEEDED; i++) flags.push({ x: snap(W * 0.2 + Math.random() * W * 0.6), y: snap(startY - i * 420) });
    for (var j = 0; j < NEEDED - 1; j++) { var gx = snap(W * 0.12 + Math.random() * (W * 0.76 - WALL_GAP)); walls.push({ gapX: gx, gapEnd: gx + WALL_GAP, y: snap(startY - j * 420 - 210) }); }
  }

  function initGame() { sx = W / 2; sy = H * 0.5; vx = SPEED; vy = 0; dir = 1; passed = 0; hits = 0; timeLeft = MAX_TIME; done = false; invin = 0; trail = []; particles = []; cameraY = 0; initLevel(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 500 + Math.ceil(timeLeft) * 100) : passed * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var wi = 0; wi < walls.length; wi++) { var w = walls[wi], wy = w.y - cameraY; if (wy < -50 || wy > H + 50) continue; game.draw.rect(0, wy - 16, w.gapX, 32, C.d, 0.9); game.draw.rect(w.gapEnd, wy - 16, W - w.gapEnd, 32, C.d, 0.9); }
    for (var fi = 0; fi < flags.length; fi++) { var f = flags[fi], fy = f.y - cameraY; if (fy < -80 || fy > H + 80) continue; game.draw.rect(snap(f.x) - 3, snap(fy - 80), 6, 80, C.g, 0.6); game.draw.rect(snap(f.x), snap(fy - 80), 44, 34, C.a, 0.9); pc(f.x, fy, 16, C.a, 0.5); }
    for (var ti = 0; ti < trail.length; ti++) pc(trail[ti].x, trail[ti].y - cameraY, 12 * trail[ti].life, C.e, trail[ti].life * 0.6);
    var al = invin > 0 ? (Math.floor(game.time.elapsed * 16) % 2 ? 0.4 : 0.9) : 0.9;
    pc(sx, sy - cameraY, 28, C.e, al); pc(sx, sy - cameraY - 34, 16, C.g, al); game.draw.rect(snap(sx) - 20, snap(sy - cameraY + 30), 40, 6, C.g, al);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    dir = -dir; vx = dir * SPEED; vy = -SPEED * 0.4; game.audio.play('se_tap', 0.2);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!flags) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
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
      txt(resultSuccess ? 'FINISH!' : 'CRASHED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (invin > 0) invin -= dt;
      var spd = Math.hypot(vx, vy); if (spd > 0) { var fr = 20 * dt; vx -= vx / spd * fr; vy -= vy / spd * fr; }
      vy += 80 * dt; sx += vx * dt; sy += vy * dt;
      if (sx < 40) { sx = 40; vx = Math.abs(vx); dir = 1; } if (sx > W - 40) { sx = W - 40; vx = -Math.abs(vx); dir = -1; }
      cameraY = sy - H * 0.6;
      trail.push({ x: sx, y: sy, life: 0.4 }); for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      for (var fi = flags.length - 1; fi >= 0; fi--) { if (Math.hypot(sx - flags[fi].x, sy - flags[fi].y) < 60) { flags.splice(fi, 1); passed++; game.audio.play('se_success', 0.5); for (var k = 0; k < 8; k++) { var a = Math.random() * Math.PI * 2; particles.push({ x: sx, y: sy, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.6, col: C.a }); } if (passed >= NEEDED) { finish(true); return; } } }
      if (invin <= 0) for (var wi = 0; wi < walls.length; wi++) { var w = walls[wi]; if (Math.abs(sy - w.y) < 28 && !(sx > w.gapX && sx < w.gapEnd)) { hits++; invin = 1.5; vx = -vx; game.audio.play('se_failure', 0.4); for (var k2 = 0; k2 < 6; k2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: sx, y: sy, vx: Math.cos(a2) * 160, vy: Math.sin(a2) * 160, life: 0.5, col: C.d }); } if (hits >= MAX_HITS) { finish(false); return; } } }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y - cameraY) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0a1a2e');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    initGame();
  });
})(game);
