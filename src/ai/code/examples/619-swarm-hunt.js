// 619-swarm-hunt.js
// スワームハント — 群れて飛ぶ虫が密集した瞬間をタップし、衝撃波でまとめて撃破する
// 操作: タップで衝撃波を発生。範囲内の虫を一掃。密集を狙うほど大量に倒せる
// 成功: 15匹 撃破  失敗: 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、害虫駆除） ──
  var C = { bg:'#000a02', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SWARM HUNT';
  var HOW_TO_PLAY = 'TAP TO SEND A SHOCKWAVE · CATCH THE BUGS WHILE THEY CLUSTER TOGETHER';
  var MAX_TIME = 18;
  var NEEDED   = 15;         // 修正2: 60 → 15
  var KILL_R = 150;
  var ALIGN_R = 100, COHESION_R = 150, SEPARATE_R = 50, ALIGN_W = 0.1, COHESION_W = 0.05, SEPARATE_W = 0.3, BUG_SPEED = 130, BUG_R = 14;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var bugs, killed, timeLeft, done, particles, waves, flash, spawnTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) { var d = qx * qx + qy * qy; if (d <= r * r && d >= (r - 12) * (r - 12)) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#002200');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnBug() {
    var edge = Math.floor(Math.random() * 4), x, y;
    if (edge === 0) { x = Math.random() * W; y = -20; } else if (edge === 1) { x = W + 20; y = Math.random() * H; } else if (edge === 2) { x = Math.random() * W; y = H + 20; } else { x = -20; y = Math.random() * H; }
    var ang = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5), sz = BUG_R + Math.random() * 6;
    bugs.push({ x: x, y: y, vx: Math.cos(ang) * BUG_SPEED, vy: Math.sin(ang) * BUG_SPEED, phase: Math.random() * Math.PI * 2, size: sz });
  }

  function initGame() { bugs = []; killed = 0; timeLeft = MAX_TIME; done = false; particles = []; waves = []; flash = 0; spawnTimer = 0; for (var i = 0; i < 10; i++) spawnBug(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (killed * 300 + Math.ceil(timeLeft) * 100) : killed * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    if (bugs.length > 5) { var sx = 0, sy = 0; for (var i = 0; i < bugs.length; i++) { sx += bugs[i].x; sy += bugs[i].y; } sx /= bugs.length; sy /= bugs.length; pc(sx, sy, 80 + bugs.length * 4, C.d, 0.1); }
    for (var bi = 0; bi < bugs.length; bi++) { var b = bugs[bi], s = b.size; pc(b.x, b.y, s, C.d, 0.9); pc(b.x, b.y, s * 0.6, C.b, 0.85); pc(b.x - s * 0.25, b.y - s * 0.25, s * 0.2, C.g, 0.6); }
    for (var wi = 0; wi < waves.length; wi++) { var w = waves[wi], wa = w.life / w.maxLife; ring(w.x, w.y, w.r, C.c, wa * 0.6); }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    waves.push({ x: tx, y: ty, r: 20, maxR: KILL_R, life: 0.6, maxLife: 0.6 }); game.audio.play('se_success', 0.4); flash = 0.15;
    for (var bi = bugs.length - 1; bi >= 0; bi--) {
      var b = bugs[bi], dx = b.x - tx, dy = b.y - ty;
      if (dx * dx + dy * dy < KILL_R * KILL_R) {
        killed++;
        for (var p = 0; p < 4; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.3, col: C.b }); }
        bugs.splice(bi, 1);
        if (killed >= NEEDED) { finish(true); return; }
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!bugs) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.64, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SWARM CLEARED!' : 'TIME UP', W / 2, H * 0.35, 60, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4;
      spawnTimer += dt; var target = Math.min(30, 10 + Math.floor((MAX_TIME - timeLeft) * 0.8));
      if (bugs.length < target && spawnTimer > 0.3) { spawnTimer = 0; spawnBug(); }
      for (var bi = 0; bi < bugs.length; bi++) {
        var b = bugs[bi]; b.phase += dt * 4;
        var ax = 0, ay = 0, alignX = 0, alignY = 0, alignN = 0, cohX = 0, cohY = 0, cohN = 0, sepX = 0, sepY = 0;
        for (var bj = 0; bj < bugs.length; bj++) {
          if (bi === bj) continue; var b2 = bugs[bj], dx = b2.x - b.x, dy = b2.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < ALIGN_R) { alignX += b2.vx; alignY += b2.vy; alignN++; }
          if (d < COHESION_R) { cohX += b2.x; cohY += b2.y; cohN++; }
          if (d < SEPARATE_R && d > 0) { sepX -= dx / d; sepY -= dy / d; }
        }
        if (alignN > 0) { ax += (alignX / alignN - b.vx) * ALIGN_W; ay += (alignY / alignN - b.vy) * ALIGN_W; }
        if (cohN > 0) { ax += (cohX / cohN - b.x) * COHESION_W * dt; ay += (cohY / cohN - b.y) * COHESION_W * dt; }
        ax += sepX * SEPARATE_W; ay += sepY * SEPARATE_W;
        var cx = W / 2 - b.x, cy = H * 0.5 - b.y, cd = Math.sqrt(cx * cx + cy * cy);
        if (cd > 200) { ax += cx / cd * 20 * dt; ay += cy / cd * 20 * dt; }
        b.vx += ax; b.vy += ay;
        var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (spd > BUG_SPEED * 1.5) { b.vx = b.vx / spd * BUG_SPEED * 1.5; b.vy = b.vy / spd * BUG_SPEED * 1.5; }
        if (spd < BUG_SPEED * 0.5 && spd > 0) { b.vx = b.vx / spd * BUG_SPEED * 0.5; b.vy = b.vy / spd * BUG_SPEED * 0.5; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < -30) b.x = W + 30; if (b.x > W + 30) b.x = -30; if (b.y < -30) b.y = H + 30; if (b.y > H + 30) b.y = -30;
      }
      for (var wi = waves.length - 1; wi >= 0; wi--) { var w = waves[wi]; w.r += (w.maxR - w.r) * dt * 5; w.life -= dt; if (w.life <= 0) waves.splice(wi, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 3; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.c, flash * 0.08);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(killed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    txt('SWARM ' + bugs.length, W / 2, 224, 30, C.d);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
