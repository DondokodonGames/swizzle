// 568-gravity-flip.js
// グラビティフリップ — タップで重力を上下反転し、天井と床を行き来してコインを拾い障害を避ける
// 操作: タップで重力の向きを反転（壁に強く激突 or 障害に接触でダメージ）
// 成功: コイン 8枚 収集  失敗: 3回 衝突 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、反転トンネル） ──
  var C = { bg:'#0d0d1f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };
  var LANE_Y1 = snap(H * 0.18), LANE_Y2 = snap(H * 0.86), PLAYER_R = 36, GRAVITY = 1800;

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY · GRAB COINS · DODGE THE SPIKES';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 15 → 8
  var MAX_HITS = 3;          // 修正2: 5 → 3
  var PX = snap(W * 0.35);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, coins, obstacles, collected, hits, timeLeft, done, particles, trail, nextCoin, nextObs, scrollSpeed, flash, invincible;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#14142a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, LANE_Y1, C.d, 0.8); game.draw.rect(0, LANE_Y1, W, 8, C.e, 0.6); game.draw.rect(0, LANE_Y2, W, H - LANE_Y2, C.d, 0.8); game.draw.rect(0, LANE_Y2 - 8, W, 8, C.e, 0.6); }

  function spawnCoin() { coins.push({ x: W + 60, y: LANE_Y1 + PLAYER_R * 2 + Math.random() * (LANE_Y2 - LANE_Y1 - PLAYER_R * 4), r: 24, taken: false }); }
  function spawnObstacle() { var top = Math.random() < 0.5, h = 120 + Math.random() * 180; obstacles.push({ x: W + 60, y: top ? LANE_Y1 : LANE_Y2 - h, w: 50, h: h }); }

  function initGame() { player = { x: PX, y: H / 2, vy: 0, gravDir: 1 }; coins = []; obstacles = []; collected = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; trail = []; nextCoin = 0.9; nextObs = 1.8; scrollSpeed = 280; flash = 0; invincible = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (collected * 600 + Math.ceil(timeLeft) * 100) : collected * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var oi = 0; oi < obstacles.length; oi++) { var o = obstacles[oi]; game.draw.rect(o.x, o.y, o.w, o.h, C.a, 0.9); game.draw.rect(o.x + 4, o.y + 4, o.w - 8, 12, C.g, 0.4); }
    for (var ci = 0; ci < coins.length; ci++) { var cn = coins[ci]; pc(cn.x, cn.y, cn.r, C.c, 0.9); pc(cn.x - 6, cn.y - 6, cn.r * 0.3, C.g, 0.5); }
    for (var ti = 0; ti < trail.length; ti++) pc(trail[ti].x, trail[ti].y, PLAYER_R * 0.5 * trail[ti].life / 0.3, C.b, trail[ti].life * 0.5);
    var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 20) % 2 ? 0.5 : 0.9) : 0.9;
    pc(player.x, player.y, PLAYER_R, flash > 0 ? C.a : C.b, blink); pc(player.x - 10, player.y - 10, PLAYER_R * 0.35, C.g, blink * 0.5);
    game.draw.rect(snap(player.x) - 3, snap(player.y) + (player.gravDir > 0 ? PLAYER_R : -PLAYER_R - 20), 6, 20, C.g, 0.8);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    player.gravDir *= -1; player.vy = player.gravDir * -400; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.345, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.55, 56, C.a);
        txt('TAP TO START', W / 2, H * 0.59, 42, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'COINS GET!' : 'SMASHED', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 4; if (invincible > 0) invincible -= dt;
      scrollSpeed = Math.min(600, 280 + (MAX_TIME - timeLeft) * 8);
      nextCoin -= dt; if (nextCoin <= 0) { spawnCoin(); nextCoin = 0.8 + Math.random() * 0.5; }
      nextObs -= dt; if (nextObs <= 0) { spawnObstacle(); nextObs = 1.4 + Math.random() * 0.9; }
      player.vy += GRAVITY * player.gravDir * dt; player.vy = Math.max(-1200, Math.min(1200, player.vy)); player.y += player.vy * dt;
      if (player.y - PLAYER_R < LANE_Y1) { player.y = LANE_Y1 + PLAYER_R; if (Math.abs(player.vy) > 400 && invincible <= 0) { hits++; flash = 0.4; invincible = 0.8; game.audio.play('se_failure', 0.4); if (hits >= MAX_HITS) { finish(false); return; } } player.vy = 0; }
      if (player.y + PLAYER_R > LANE_Y2) { player.y = LANE_Y2 - PLAYER_R; if (Math.abs(player.vy) > 400 && invincible <= 0) { hits++; flash = 0.4; invincible = 0.8; game.audio.play('se_failure', 0.4); if (hits >= MAX_HITS) { finish(false); return; } } player.vy = 0; }
      trail.push({ x: player.x, y: player.y, life: 0.3 }); for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt * 3; if (trail[ti].life <= 0) trail.splice(ti, 1); }
      for (var ci = coins.length - 1; ci >= 0; ci--) { coins[ci].x -= scrollSpeed * dt; if (!coins[ci].taken && Math.hypot(player.x - coins[ci].x, player.y - coins[ci].y) < PLAYER_R + coins[ci].r) { coins[ci].taken = true; collected++; game.audio.play('se_success', 0.6); for (var cpi = 0; cpi < 6; cpi++) { var ca = Math.random() * Math.PI * 2; particles.push({ x: coins[ci].x, y: coins[ci].y, vx: Math.cos(ca) * 180, vy: Math.sin(ca) * 180, life: 0.4, col: C.c }); } coins.splice(ci, 1); if (collected >= NEEDED) { finish(true); return; } continue; } if (coins[ci].x < -60) coins.splice(ci, 1); }
      for (var oi = obstacles.length - 1; oi >= 0; oi--) { obstacles[oi].x -= scrollSpeed * dt; var o = obstacles[oi]; if (invincible <= 0 && player.x + PLAYER_R > o.x && player.x - PLAYER_R < o.x + o.w && player.y + PLAYER_R > o.y && player.y - PLAYER_R < o.y + o.h) { hits++; flash = 0.5; invincible = 0.8; game.audio.play('se_failure', 0.5); if (hits >= MAX_HITS) { finish(false); return; } } if (o.x + o.w < -60) obstacles.splice(oi, 1); }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2.5; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.12);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#14142a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
    state = S.ATTRACT;
    initGame();
  });
})(game);
