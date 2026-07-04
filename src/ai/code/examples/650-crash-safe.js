// 650-crash-safe.js
// クラッシュセーフ — 高速で迫る壁の隙間を、タップで上下移動してくぐり抜ける
// 操作: 画面上半分タップで上へ、下半分で下へジャンプ。壁のギャップに合わせて通過
// 成功: 12枚 突破  失敗: 3回 衝突 or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、高速回廊） ──
  var C = { bg:'#040208', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'CRASH SAFE';
  var HOW_TO_PLAY = 'TAP UPPER HALF TO RISE, LOWER HALF TO DROP · THREAD THE WALL GAPS';
  var MAX_TIME = 18;
  var NEEDED   = 12;         // 修正2: 20 → 12
  var MAX_HITS = 3;
  var PLAYER_X = W * 0.22, PLAYER_R = 36, MOVE_STEP = 220, GAP_H = 300;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerY, targetY, walls, passed, hits, timeLeft, done, spawnTimer, wallSpeed, invincible, particles, trail, flash;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.d : '#070413');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnWall() { var gapY = PLAYER_R * 2 + 90 + Math.random() * (H - GAP_H - PLAYER_R * 4 - 180); walls.push({ x: W + 80, gapY: gapY, passed: false }); }

  function initGame() { playerY = H / 2; targetY = H / 2; walls = []; passed = 0; hits = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0; wallSpeed = 380; invincible = 0; particles = []; trail = []; flash = 0; spawnWall(); spawnWall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (passed * 400 + Math.ceil(timeLeft) * 100) : passed * 120;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var wi = 0; wi < walls.length; wi++) {
      var w = walls[wi];
      game.draw.rect(snap(w.x) - 30, 90, 60, w.gapY - 90, C.d, 0.85); game.draw.rect(snap(w.x) - 30, w.gapY - 10, 60, 10, C.e, 0.5);
      var botY = w.gapY + GAP_H; game.draw.rect(snap(w.x) - 30, botY, 60, H - botY, C.d, 0.85); game.draw.rect(snap(w.x) - 30, botY, 60, 10, C.e, 0.5);
    }
    for (var ti = 0; ti < trail.length; ti++) pc(trail[ti].x, trail[ti].y, PLAYER_R * (ti / trail.length) * 0.6, C.c, (ti / trail.length) * 0.4);
    var pa = (invincible > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    pc(PLAYER_X, playerY, PLAYER_R, C.c, pa); pc(PLAYER_X - 12, playerY - 12, PLAYER_R * 0.3, C.g, pa * 0.6);
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetY = ty < H / 2 ? Math.max(PLAYER_R + 100, playerY - MOVE_STEP) : Math.min(H - PLAYER_R - 60, playerY + MOVE_STEP); game.audio.play('se_tap', 0.1);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!walls) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CLEAN RUN!' : 'CRASHED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 4; if (invincible > 0) invincible -= dt;
      playerY += (targetY - playerY) * Math.min(1, dt * 14);
      trail.push({ x: PLAYER_X, y: playerY }); if (trail.length > 12) trail.shift();
      wallSpeed = 380 + (MAX_TIME - timeLeft) * 10 + passed * 8;
      spawnTimer += dt; if (spawnTimer >= 1.3) { spawnTimer = 0; spawnWall(); }
      for (var wi = walls.length - 1; wi >= 0; wi--) {
        var w = walls[wi]; w.x -= wallSpeed * dt;
        if (!w.passed && w.x + 40 < PLAYER_X - PLAYER_R) { w.passed = true; passed++; game.audio.play('se_success', 0.3); if (passed >= NEEDED) { finish(true); return; } }
        if (invincible <= 0 && w.x - 30 < PLAYER_X + PLAYER_R && w.x + 30 > PLAYER_X - PLAYER_R) {
          var inGap = playerY + PLAYER_R > w.gapY && playerY - PLAYER_R < w.gapY + GAP_H;
          if (!inGap) {
            hits++; invincible = 1.2; flash = 0.5; game.audio.play('se_failure', 0.5);
            for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(pa) * 250, vy: Math.sin(pa) * 250, life: 0.5, col: C.c }); }
            if (hits >= MAX_HITS) { finish(false); return; }
          }
        }
        if (w.x < -100) walls.splice(wi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(passed + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#070413');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
