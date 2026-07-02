// 264-coin-tower.js
// コインタワー — 左右に揺れる台の中心を狙い、落ちてくるコインをタップで放して積み上げる
// 操作: タップでコインを落とす（中心に載せる）
// 成功: 3枚積む  失敗: 3枚こぼす or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、コイン積み） ──
  var C = { bg:'#04030a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COIN TOWER';
  var HOW_TO_PLAY = 'TAP TO DROP THE COIN ONTO THE SWAYING PLATFORM';
  var MAX_TIME = 15;
  var NEEDED   = 3;           // 修正2: 10 → 3
  var MAX_DROPS = 3;
  var PLAT_W = 220, PLAT_H = 24, PLAT_Y = snap(H * 0.78), COIN_R = 44, COIN_H = 28, TOP = 260;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var platX, coins, falling, drops, timeLeft, done, spawnTimer, particles, fbText, fbCol, fbTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function background() { game.draw.clear(C.bg); }

  function topOfStack() { return coins.length === 0 ? PLAT_Y : PLAT_Y - coins.length * (COIN_H + 4); }
  function stackCenter() { if (coins.length === 0) return platX + PLAT_W / 2; var s = 0; for (var i = 0; i < coins.length; i++) s += coins[i].x; return s / coins.length; }

  function drawCoin(x, y, col) { game.draw.rect(snap(x) - COIN_R, snap(y), COIN_R * 2, COIN_H, col, 0.9); game.draw.rect(snap(x) - COIN_R, snap(y), COIN_R * 2, 4, C.g, 0.5); }

  function spawnCoin() { falling = { x: snap(game.random(W * 0.15, W * 0.85)), y: TOP, vy: 0, released: false }; }

  function initGame() { platX = W / 2 - PLAT_W / 2; coins = []; falling = null; drops = 0; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; particles = []; fbText = ''; fbCol = C.g; fbTimer = 0; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (coins.length * 400 + Math.ceil(timeLeft) * 60) : coins.length * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || !falling || falling.released) return;
    falling.released = true; falling.vy = 300; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); game.draw.rect(snap(W / 2 - PLAT_W / 2), PLAT_Y, PLAT_W, PLAT_H, C.d, 0.9); drawCoin(W / 2, PLAT_Y - COIN_H - 4, C.c); drawCoin(W / 2, TOP, C.f);
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.40, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.46, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.52, 40, '#554466');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'TOWER BUILT!' : 'TOPPLED', W / 2, H * 0.35, 68, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (fbTimer > 0) fbTimer -= dt;
      platX = (W / 2 - PLAT_W / 2) + Math.sin(game.time.elapsed * (1.2 + coins.length * 0.15)) * 140;
      if (!falling) { spawnTimer -= dt; if (spawnTimer <= 0) spawnCoin(); }
      if (falling && !falling.released) { falling.x += (W / 2 - falling.x) * 0.5 * dt; }
      if (falling && falling.released) {
        falling.y += falling.vy * dt; falling.vy += 600 * dt;
        var stackTop = topOfStack();
        if (falling.y + COIN_H >= stackTop) {
          var ok = coins.length === 0 ? (falling.x >= platX + COIN_R * 0.4 && falling.x <= platX + PLAT_W - COIN_R * 0.4) : (Math.abs(falling.x - stackCenter()) < COIN_R * 1.1);
          if (ok) { coins.push({ x: falling.x, flash: 0.3 }); game.audio.play('se_success', 0.5); falling = null; spawnTimer = 0.5; if (coins.length >= NEEDED) { finish(true); return; } }
          else { drops++; fbText = 'DROPPED!'; fbCol = C.a; fbTimer = 0.6; game.audio.play('se_failure', 0.5); for (var pi = 0; pi < 5; pi++) { var a = Math.random() * Math.PI + Math.PI / 2; particles.push({ x: falling.x, y: falling.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 100, life: 0.6 }); } falling = null; spawnTimer = 0.8; if (drops >= MAX_DROPS) { finish(false); return; } }
        }
      }
      for (var ci = 0; ci < coins.length; ci++) if (coins[ci].flash > 0) coins[ci].flash -= dt;
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background();
    game.draw.rect(snap(platX), PLAT_Y, PLAT_W, PLAT_H, C.d, 0.9); game.draw.rect(snap(platX), PLAT_Y, PLAT_W, 6, C.g, 0.4);
    for (var ci2 = 0; ci2 < coins.length; ci2++) drawCoin(coins[ci2].x, PLAT_Y - (ci2 + 1) * (COIN_H + 4), coins[ci2].flash > 0 ? C.g : C.c);
    if (falling) { drawCoin(falling.x, falling.y, falling.released ? C.g : C.f); if (!falling.released) { for (var y = falling.y + COIN_H; y < topOfStack(); y += 16) game.draw.rect(snap(falling.x) - 2, snap(y), 4, 6, C.e, 0.3); txt('TAP', falling.x, falling.y + 60, 32, C.f); } }
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 5, 12, 10, C.c, particles[pp2].life * 1.4);
    if (fbTimer > 0) txt(fbText, W / 2, H * 0.6, 48, fbCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(coins.length + ' / ' + NEEDED, W / 2, 168, 48, C.c);
    for (var dd = 0; dd < MAX_DROPS; dd++) game.draw.rect(snap(W / 2 + (dd - (MAX_DROPS - 1) / 2) * 56) - 10, 224, 20, 20, dd < drops ? C.a : '#1a1030');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
