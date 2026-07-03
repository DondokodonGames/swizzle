// 497-coin-spin.js
// コインスピン — くるくる回るコインが「表(H)」を向いた瞬間をタップして捕まえる
// 操作: コインが表を向いた一瞬にタップ（裏で押す・見逃すとミス）
// 成功: 6回 表キャッチ  失敗: 3回 ミス or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、コインゲーム） ──
  var C = { bg:'#0a0700', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'COIN SPIN';
  var HOW_TO_PLAY = 'TAP EACH COIN THE INSTANT IT FLIPS TO HEADS (H)';
  var MAX_TIME = 15;
  var NEEDED   = 6;          // 修正2: 15 → 6
  var MAX_MISS = 3;          // 修正2: 10 → 3

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var coins, hits, misses, timeLeft, done, particles, resultText, resultCol, resultTimer, nextSpawn, flash, flashCol;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function ring(cx, cy, r, color, alpha) { for (var a = 0; a < Math.PI * 2; a += 0.14) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.c : '#1a1000');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnCoin() { var lane = Math.floor(Math.random() * 3); coins.push({ x: snap(W * 0.22 + lane * W * 0.28), y: snap(H * 0.42 + (Math.random() - 0.5) * H * 0.28), angle: Math.random() * Math.PI * 2, speed: 1.4 + Math.random() * 2.6, r: 90, window: false, tapped: false, missT: 0, life: 3.0 + Math.random() * 1.5 }); }

  function initGame() { coins = []; hits = 0; misses = 0; timeLeft = MAX_TIME; done = false; particles = []; resultText = ''; resultTimer = 0; nextSpawn = 0.6; flash = 0; flashCol = C.b; spawnCoin(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (hits * 500 + Math.ceil(timeLeft) * 100) : hits * 200;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawCoins() {
    for (var ci = 0; ci < coins.length; ci++) {
      var c = coins[ci]; if (c.tapped) continue;
      var cosA = Math.cos(c.angle), abs = Math.abs(cosA), cw = c.r * abs, heads = cosA > 0;
      if (abs > 0.05) { pc(c.x, c.y, cw, heads ? C.c : '#78350f', 0.9); pc(c.x, c.y, cw * 0.6, heads ? C.f : '#5a2800', 0.3); if (heads && c.window) ring(c.x, c.y, cw + 12, C.b, 0.3 + Math.sin(game.time.elapsed * 8) * 0.15); }
      game.draw.rect(snap(c.x) - 4, snap(c.y - c.r), 8, c.r * 2, '#b45309', 0.4);
      if (abs > 0.4) txt(heads ? 'H' : 'T', c.x, c.y + 18, Math.floor(56 * abs), heads ? C.bg : C.c);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    for (var i = coins.length - 1; i >= 0; i--) {
      var c = coins[i]; if (c.tapped) continue;
      if ((tx - c.x) * (tx - c.x) + (ty - c.y) * (ty - c.y) <= (c.r + 30) * (c.r + 30)) {
        c.tapped = true;
        if (c.window) { hits++; resultText = 'HEADS!'; resultCol = C.b; resultTimer = 0.7; game.audio.play('se_success', 0.7); for (var pi = 0; pi < 10; pi++) { var a = Math.random() * Math.PI * 2; particles.push({ x: c.x, y: c.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180, life: 0.5, col: C.c }); } if (hits >= NEEDED) { finish(true); return; } }
        else { misses++; resultText = 'TAILS!'; resultCol = C.a; resultTimer = 0.7; game.audio.play('se_failure', 0.4); if (misses >= MAX_MISS) { finish(false); return; } }
        return;
      }
    }
    misses++; resultText = 'MISS'; resultCol = C.a; resultTimer = 0.5; game.audio.play('se_failure', 0.2); if (misses >= MAX_MISS) { finish(false); return; }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!coins) initGame(); background(); drawCoins();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 22, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'JACKPOT!' : 'BAD FLIP', W / 2, H * 0.35, 70, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (resultTimer > 0) resultTimer -= dt; if (flash > 0) flash -= dt * 3;
      nextSpawn -= dt; if (nextSpawn <= 0) { if (coins.length < 3) spawnCoin(); nextSpawn = 0.7 + Math.random() * 0.9; }
      for (var i = coins.length - 1; i >= 0; i--) {
        var c = coins[i];
        if (!c.tapped) { c.angle += c.speed * dt * Math.PI * 2; c.life -= dt; c.window = Math.cos(c.angle) > 0.5; if (c.life <= 0) { if (c.window) { misses++; resultText = 'MISSED'; resultCol = C.a; resultTimer = 0.5; game.audio.play('se_failure', 0.3); if (misses >= MAX_MISS) { finish(false); return; } } coins.splice(i, 1); } }
        else { c.missT += dt; if (c.missT > 0.4) coins.splice(i, 1); }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p = particles[pp]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawCoins();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 6, snap(particles[pp2].y) - 6, 12, 12, particles[pp2].col, particles[pp2].life * 1.5);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 64, resultCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(hits + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < misses ? C.a : '#1a1000');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    state = S.ATTRACT;
    initGame();
  });
})(game);
