// 522-gravity-flip.js
// グラビティフリップ — タップで重力を反転し、天井と床を行き来してコインを集めトゲを避ける
// 操作: タップで重力を上下反転（壁の内側に激突 or トゲに触れるとダメージ）
// 成功: 8コイン 収集  失敗: 3回 衝突 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、反重力トンネル） ──
  var C = { bg:'#020816', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY · GRAB COINS · DODGE SPIKES';
  var MAX_TIME = 15;
  var NEEDED   = 8;          // 修正2: 20 → 8
  var MAX_HITS = 3;
  var PX = snap(W * 0.22), PR = 36, GRAVITY = 2400, WALL = 88;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var player, coins, spikes, collected, hits, timeLeft, done, particles, flash, invincible, speed;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#0c1a3a');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, WALL, '#0c1a3a', 0.9); game.draw.rect(0, H - WALL, W, WALL, '#0c1a3a', 0.9); }

  function spawnObjects() {
    for (var i = 0; i < 3; i++) coins.push({ x: W + 80 + i * 300, y: snap(WALL + PR + Math.random() * (H - 2 * WALL - 2 * PR)), r: 26, angle: Math.random() * Math.PI * 2 });
    if (Math.random() < 0.4) { var gapY = WALL + 100 + Math.random() * (H - 2 * WALL - 200 - PR * 2), gapH = 220 + PR * 2; spikes.push({ x: W + 220, topH: gapY - WALL, bottomY: gapY + gapH, bottomH: H - WALL - (gapY + gapH) }); }
  }

  function initGame() { player = { y: H / 2, vy: 0, gravDir: 1 }; coins = []; spikes = []; collected = 0; hits = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; invincible = 0; speed = 320; spawnObjects(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (collected * 500 + Math.ceil(timeLeft) * 100) : collected * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var si = 0; si < spikes.length; si++) { var sk = spikes[si]; game.draw.rect(snap(sk.x) - 20, WALL, 40, sk.topH, C.a, 0.8); game.draw.rect(snap(sk.x) - 20, snap(sk.bottomY), 40, sk.bottomH, C.a, 0.8); }
    for (var ci = 0; ci < coins.length; ci++) { var cn = coins[ci], cw = Math.abs(Math.cos(cn.angle)) * cn.r; game.draw.rect(snap(cn.x) - cw, snap(cn.y) - cn.r, cw * 2 + 8, cn.r * 2, C.c, 0.9); pc(cn.x, cn.y, 8, C.g, 0.7); }
    var blink = invincible > 0 ? (Math.floor(game.time.elapsed * 12) % 2) : 1;
    if (blink) { pc(PX, player.y, PR, C.e, 0.9); pc(PX - 10, player.y - 10, 10, C.g, 0.4); game.draw.rect(PX - 3, snap(player.y) + (player.gravDir === 1 ? PR : -PR - 24), 6, 24, C.g, 0.8); }
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    player.gravDir = -player.gravDir; player.vy *= 0.3; game.audio.play('se_tap', 0.4);
    for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: PX, y: player.y, vx: Math.cos(a) * 100, vy: Math.sin(a) * 100, life: 0.3, col: C.g }); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!player) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.30, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.36, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.58, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.64, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'COINS GET!' : 'SMASHED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; speed = 320 + collected * 12;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (invincible > 0) invincible -= dt;
      player.vy += GRAVITY * player.gravDir * dt; player.y += player.vy * dt;
      var ceilY = WALL + PR, floorY = H - WALL - PR;
      if (player.y < ceilY) { player.y = ceilY; player.vy = Math.abs(player.vy) * 0.3; if (invincible <= 0) { hits++; invincible = 1.0; flash = 0.4; game.audio.play('se_failure', 0.4); if (hits >= MAX_HITS) { finish(false); return; } } }
      if (player.y > floorY) { player.y = floorY; player.vy = -Math.abs(player.vy) * 0.3; if (invincible <= 0) { hits++; invincible = 1.0; flash = 0.4; game.audio.play('se_failure', 0.4); if (hits >= MAX_HITS) { finish(false); return; } } }
      for (var ci = coins.length - 1; ci >= 0; ci--) {
        coins[ci].x -= speed * dt; coins[ci].angle += dt * 3; if (coins[ci].x < -60) { coins.splice(ci, 1); continue; }
        if (Math.hypot(PX - coins[ci].x, player.y - coins[ci].y) < PR + coins[ci].r) { collected++; flash = 0.2; game.audio.play('se_tap', 0.5); for (var pi2 = 0; pi2 < 6; pi2++) { var a2 = Math.random() * Math.PI * 2; particles.push({ x: coins[ci].x, y: coins[ci].y, vx: Math.cos(a2) * 160, vy: Math.sin(a2) * 160, life: 0.4, col: C.c }); } coins.splice(ci, 1); if (collected >= NEEDED) { finish(true); return; } }
      }
      for (var si = spikes.length - 1; si >= 0; si--) {
        spikes[si].x -= speed * dt; if (spikes[si].x < -80) { spikes.splice(si, 1); continue; }
        if (invincible <= 0) { var sk = spikes[si]; if (Math.abs(PX - sk.x) < PR + 20 && (player.y - PR < WALL + sk.topH || player.y + PR > sk.bottomY)) { hits++; invincible = 1.0; flash = 0.5; game.audio.play('se_failure', 0.5); if (hits >= MAX_HITS) { finish(false); return; } } }
      }
      if (coins.length === 0 || coins[coins.length - 1].x < W - 200) spawnObjects();
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 2; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (flash > 0) game.draw.rect(0, 0, W, H, C.a, flash * 0.15);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(collected + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HITS; hi++) game.draw.rect(snap(W / 2 + (hi - (MAX_HITS - 1) / 2) * 56) - 10, 224, 20, 20, hi < hits ? C.a : '#0c1a3a');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
