// 463-gravity-flip.js
// 重力反転 — タップで重力の上下を切り替え、迫る壁の隙間を通り抜けて進む
// 操作: タップで重力を反転（上下の壁や障害物に当たると失敗）
// 成功: 500m 到達  失敗: 壁に激突 or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、地下トンネル） ──
  var C = { bg:'#020818', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY · THREAD THE GAPS';
  var MAX_TIME = 20;
  var GOAL = 500;            // 修正2: 1500m → 500m
  var PLAYER_X = 240, PLAYER_R = 24, GRAVITY = 1400, WALL_SPEED = 300;
  var TOP_Y = 88, BOT_Y = H - 88;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerY, playerVY, gravDir, walls, particles, trail, distance, timeLeft, done, flash, nextWall;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a1428');
  }

  function distBar() {
    var t = Math.ceil(Math.min(1, distance / GOAL) * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, H - 60, 72, 40, i < t ? C.c : '#0a1428');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, TOP_Y, '#0f2040', 0.9); game.draw.rect(0, BOT_Y, W, H - BOT_Y, '#0f2040', 0.9); }

  function addWall() { var gapH = Math.max(240, 340 - distance * 0.1), gapY = TOP_Y + 40 + Math.random() * (BOT_Y - TOP_Y - 80 - gapH); walls.push({ x: W + 60, gapY: gapY, gapH: gapH }); }

  function initGame() { playerY = H / 2; playerVY = 0; gravDir = 1; walls = []; particles = []; trail = []; distance = 0; timeLeft = MAX_TIME; done = false; flash = 0; nextWall = 1.2; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.floor(distance) * 12 + Math.ceil(timeLeft) * 100) : Math.floor(distance) * 8;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var wi = 0; wi < walls.length; wi++) {
      var w = walls[wi];
      game.draw.rect(snap(w.x - 50), TOP_Y, 100, w.gapY - TOP_Y, C.d, 0.9); game.draw.rect(snap(w.x - 50), TOP_Y, 100, 8, C.e, 0.6);
      var bt = w.gapY + w.gapH; game.draw.rect(snap(w.x - 50), bt, 100, BOT_Y - bt, C.d, 0.9); game.draw.rect(snap(w.x - 50), bt, 100, 8, C.e, 0.6);
      pc(w.x, w.gapY, 12, C.e, 0.8); pc(w.x, bt, 12, C.e, 0.8);
    }
    for (var ti = 0; ti < trail.length; ti++) { var tr = ti / trail.length; pc(trail[ti].x, trail[ti].y, PLAYER_R * tr * 0.6, C.d, tr * 0.4); }
    pc(PLAYER_X, playerY, PLAYER_R, C.e, 0.9); pc(PLAYER_X, playerY, PLAYER_R * 0.5, C.g, 0.6);
    var ad = gravDir === 1 ? 1 : -1; game.draw.rect(PLAYER_X - 4, snap(playerY) + (ad === 1 ? PLAYER_R : -PLAYER_R - 32), 8, 32, C.c, 0.8);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    gravDir = -gravDir; playerVY *= 0.3; game.audio.play('se_tap', 0.3);
    for (var pi = 0; pi < 4; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, life: 0.3, col: C.g }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (playerY === undefined) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.36, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.60, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.66, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BREAKTHROUGH!' : 'SMASHED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3;
      playerVY += GRAVITY * gravDir * dt; playerVY = Math.max(-800, Math.min(800, playerVY)); playerY += playerVY * dt;
      if (playerY - PLAYER_R < TOP_Y) { finish(false); return; }
      if (playerY + PLAYER_R > BOT_Y) { finish(false); return; }
      trail.push({ x: PLAYER_X, y: playerY }); if (trail.length > 14) trail.shift();
      distance += WALL_SPEED * dt / 3;
      if (distance >= GOAL) { finish(true); return; }
      nextWall -= dt; if (nextWall <= 0) { addWall(); nextWall = 0.9 + Math.random() * 0.4; }
      for (var wi = walls.length - 1; wi >= 0; wi--) {
        walls[wi].x -= WALL_SPEED * dt; var w = walls[wi];
        if (Math.abs(w.x - PLAYER_X) < 50 + PLAYER_R && (playerY - PLAYER_R < w.gapY || playerY + PLAYER_R > w.gapY + w.gapH)) {
          for (var pi2 = 0; pi2 < 12; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(a2) * 200, vy: Math.sin(a2) * 200, life: 0.6, col: C.a }); }
          finish(false); return;
        }
        if (w.x < -100) walls.splice(wi, 1);
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    distBar();
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(distance) + ' / ' + GOAL + 'm', W / 2, 168, 44, C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    state = S.ATTRACT;
    initGame();
  });
})(game);
