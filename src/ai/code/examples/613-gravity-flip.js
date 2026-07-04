// 613-gravity-flip.js
// グラビティフリップ — タップで重力を上下反転させ、迫る障害物の隙間を通り抜ける
// 操作: タップで重力の向きを反転。天井と床の間を落下・上昇しながら壁の穴を抜ける
// 成功: 15秒 生き残る  失敗: 3回 衝突 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、重力回廊） ──
  var C = { bg:'#05001a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY UP OR DOWN · THREAD THROUGH THE GAPS IN THE WALLS';
  var MAX_TIME = 15;         // 修正2: 20 → 15
  var MAX_HITS = 3;
  var PLAYER_X = W * 0.25, PLAYER_R = 30, CHAN_Y1 = snap(H * 0.12), CHAN_Y2 = snap(H * 0.88), GRAV = 1800;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var playerY, playerVY, gravityDir, trail, obstacles, hits, timeLeft, done, particles, flash, invincible, spawnTimer, speed;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function arrow(cx, cy, size, dir, color) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < size; i += 8) { var w = size - i; if (dir === 'down') game.draw.rect(cx - w / 2, cy + i, w, 8, color); else game.draw.rect(cx - w / 2, cy - i - 8, w, 8, color); } }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0a0025');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnObstacle() {
    var gapY = CHAN_Y1 + 220 + Math.random() * (CHAN_Y2 - CHAN_Y1 - 440);
    var gapH = Math.max(240, 300 - (MAX_TIME - timeLeft) * 3);
    obstacles.push({ x: W + 80, topH: gapY - CHAN_Y1, botY: gapY + gapH, botH: CHAN_Y2 - (gapY + gapH), w: 64 });
  }

  function initGame() { playerY = H / 2; playerVY = 0; gravityDir = 1; trail = []; obstacles = []; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; invincible = 0; spawnTimer = 0; speed = 340; spawnObstacle(); spawnObstacle(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (MAX_TIME * 200 + (MAX_HITS - hits) * 600) : Math.round((MAX_TIME - timeLeft) * 200);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function takeHit() {
    hits++; invincible = 0.9; flash = 0.4; game.audio.play('se_failure', 0.4);
    for (var p = 0; p < 8; p++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, life: 0.4, col: C.e }); }
  }

  function drawScene() {
    game.draw.rect(0, 0, W, CHAN_Y1, '#1a1040', 1); game.draw.rect(0, CHAN_Y2, W, H - CHAN_Y2, '#1a1040', 1);
    game.draw.rect(0, CHAN_Y1 - 4, W, 8, C.d, 0.7); game.draw.rect(0, CHAN_Y2 - 4, W, 8, C.d, 0.7);
    for (var oi = 0; oi < obstacles.length; oi++) {
      var o = obstacles[oi];
      game.draw.rect(snap(o.x), CHAN_Y1, o.w, o.topH, C.d, 0.9); game.draw.rect(snap(o.x), snap(o.botY), o.w, o.botH, C.d, 0.9);
      game.draw.rect(snap(o.x), CHAN_Y1 + o.topH - 8, o.w, 8, C.a, 0.7); game.draw.rect(snap(o.x), snap(o.botY), o.w, 8, C.a, 0.7);
    }
    for (var ti = 0; ti < trail.length; ti++) { var tr = trail[ti]; pc(tr.x, tr.y, PLAYER_R * 0.4 * tr.life, C.e, tr.life * 0.5); }
    var pa = (invincible > 0 && Math.floor(game.time.elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    pc(PLAYER_X, playerY, PLAYER_R, C.e, pa); pc(PLAYER_X - 8, playerY - 8 * gravityDir, PLAYER_R * 0.3, C.g, pa * 0.6);
    arrow(PLAYER_X, playerY + gravityDir * 4, 16, gravityDir > 0 ? 'down' : 'up', C.c);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    gravityDir *= -1; playerVY *= 0.3; game.audio.play('se_tap', 0.2);
    for (var ti = 0; ti < trail.length; ti++) trail[ti].life *= 0.5;
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.045, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.085, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.55, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'CRASHED', W / 2, H * 0.35, 66, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 3; if (invincible > 0) invincible -= dt;
      playerVY += GRAV * gravityDir * dt; playerVY = Math.max(-900, Math.min(900, playerVY)); playerY += playerVY * dt;
      if (playerY - PLAYER_R < CHAN_Y1) { playerY = CHAN_Y1 + PLAYER_R; if (playerVY < 0) playerVY = 0; if (gravityDir < 0 && invincible <= 0) { takeHit(); if (hits >= MAX_HITS) { finish(false); return; } } }
      if (playerY + PLAYER_R > CHAN_Y2) { playerY = CHAN_Y2 - PLAYER_R; if (playerVY > 0) playerVY = 0; if (gravityDir > 0 && invincible <= 0) { takeHit(); if (hits >= MAX_HITS) { finish(false); return; } } }
      trail.push({ x: PLAYER_X, y: playerY, life: 0.5 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt * 2; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      speed = 340 + (MAX_TIME - timeLeft) * 12;
      spawnTimer += dt; if (spawnTimer > 1.5) { spawnTimer = 0; spawnObstacle(); }
      for (var oi = obstacles.length - 1; oi >= 0; oi--) {
        var o = obstacles[oi]; o.x -= speed * dt;
        if (o.x + o.w < 0) { obstacles.splice(oi, 1); continue; }
        if (invincible <= 0 && PLAYER_X + PLAYER_R > o.x && PLAYER_X - PLAYER_R < o.x + o.w) {
          var topBot = CHAN_Y1 + o.topH, botTop = o.botY;
          if (playerY - PLAYER_R < topBot || playerY + PLAYER_R > botTop) { takeHit(); if (hits >= MAX_HITS) { finish(false); return; } }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.1);

    timeBar();
    txt(Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.g);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 168, 20, 20, hi < hits ? C.a : C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    state = S.ATTRACT;
    initGame();
  });
})(game);
