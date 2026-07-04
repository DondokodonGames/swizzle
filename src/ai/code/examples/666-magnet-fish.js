// 666-magnet-fish.js
// マグネットフィッシュ — タップで磁石を左右に動かし、浮いてくる金属を引き上げて回収する
// 操作: タップした位置へ磁石が移動。近づいた金属は磁力で吸着し引き上げる。星は高得点
// 成功: 10個 回収  失敗: 3個 取り逃し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（アイスブルー、水底探査） ──
  var C = { bg:'#01080f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#3355ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNET FISH';
  var HOW_TO_PLAY = 'TAP TO MOVE THE MAGNET · PULL UP THE RISING METAL · GOLD STARS SCORE DOUBLE';
  var MAX_TIME = 18;
  var NEEDED   = 10;         // 修正2: 25 → 10
  var MAX_MISS = 3;          // 修正2: 10 → 3
  var SURFACE_Y = snap(H * 0.30), MAGNET_Y = snap(H * 0.20), MAGNET_R = 60, ATTRACT_R = 220, SPAWN_RATE = 0.9;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var magnetX, targetMagnetX, items, nextId, spawnTimer, caught, missed, timeLeft, done, particles, flash, flashCol, resultText, resultTimer;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) { var step = 8; cx = snap(cx); cy = snap(cy); for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha); }

  function star(cx, cy, r, color, alpha) { cx = snap(cx); cy = snap(cy); for (var i = 0; i < 5; i++) { var a = i / 5 * Math.PI * 2 - Math.PI / 2; game.draw.rect(cx + Math.cos(a) * r - 4, cy + Math.sin(a) * r - 4, 8, 8, color, alpha); var a2 = a + Math.PI / 5; game.draw.rect(cx + Math.cos(a2) * r * 0.45 - 4, cy + Math.sin(a2) * r * 0.45 - 4, 8, 8, color, alpha); } pc(cx, cy, r * 0.4, color, alpha); }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.e : '#01050b');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, SURFACE_Y, '#010609', 0.8); game.draw.rect(0, SURFACE_Y, W, H - SURFACE_Y, '#0c2a40', 0.85); game.draw.rect(0, SURFACE_Y - 8, W, 16, C.e, 0.6); }

  function spawnItem() { var isGold = Math.random() < 0.25; items.push({ id: nextId++, x: 60 + Math.random() * (W - 120), y: SURFACE_Y + 120 + Math.random() * (H * 0.4), vy: -(60 + Math.random() * 60), r: isGold ? 36 : 28, isGold: isGold, attached: false, attachDx: 0, scored: false }); }

  function initGame() { magnetX = W / 2; targetMagnetX = W / 2; items = []; nextId = 0; spawnTimer = 0; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; spawnItem(); spawnItem(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    for (var ii = 0; ii < items.length; ii++) {
      var it = items[ii], col = it.isGold ? C.c : '#94a3b8';
      if (it.attached) game.draw.line(magnetX, MAGNET_Y, it.x, it.y - it.r, '#94a3b8', 2);
      if (it.isGold) star(it.x, it.y, it.r, C.c, 0.9); else { pc(it.x, it.y, it.r, col, 0.9); pc(it.x - it.r * 0.3, it.y - it.r * 0.3, it.r * 0.22, C.g, 0.5); }
    }
    pc(magnetX, MAGNET_Y, ATTRACT_R, C.a, 0.04);
    game.draw.rect(snap(magnetX) - 4, 0, 8, MAGNET_Y - MAGNET_R, '#94a3b8', 1);
    pc(magnetX, MAGNET_Y, MAGNET_R, C.a, 0.9); pc(magnetX - MAGNET_R * 0.3, MAGNET_Y - MAGNET_R * 0.3, MAGNET_R * 0.22, C.g, 0.5); txt('N', magnetX, MAGNET_Y + 10, 36, C.g);
  }

  // ── 入力 ──
  game.onTap(function(tx) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    targetMagnetX = Math.max(MAGNET_R + 20, Math.min(W - MAGNET_R - 20, tx));
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!items) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.10, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.145, 19, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'BIG HAUL!' : 'ONE THAT GOT AWAY', W / 2, H * 0.35, 48, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      magnetX += (targetMagnetX - magnetX) * Math.min(1, dt * 10);
      spawnTimer += dt; if (spawnTimer >= SPAWN_RATE && items.length < 8) { spawnTimer = 0; spawnItem(); }
      for (var i = items.length - 1; i >= 0; i--) {
        var item = items[i];
        if (item.attached) {
          item.x = magnetX + item.attachDx; item.y += (MAGNET_Y + MAGNET_R + item.r - item.y) * Math.min(1, dt * 8);
          if (item.y < MAGNET_Y + MAGNET_R + item.r + 10) item.scored = true;
          if (item.y < SURFACE_Y - 40 && item.scored) {
            caught++; flash = 0.3; flashCol = C.b; resultText = item.isGold ? 'GOLD! +2' : 'CAUGHT!'; resultTimer = 0.5; game.audio.play('se_success', item.isGold ? 0.7 : 0.5);
            for (var p = 0; p < 6; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: item.x, y: item.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: item.isGold ? C.c : C.e }); }
            items.splice(i, 1); if (caught >= NEEDED) { finish(true); return; } continue;
          }
        } else {
          item.y += item.vy * dt; item.vy *= (1 - dt * 0.5); if (item.vy > -10) item.vy = -10;
          var dx = magnetX - item.x, dy = MAGNET_Y - item.y;
          if (Math.sqrt(dx * dx + dy * dy) < ATTRACT_R) { item.attached = true; item.attachDx = item.x - magnetX; game.audio.play('se_tap', 0.1); }
          if (item.y < SURFACE_Y && !item.attached) { missed++; flash = 0.3; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.5; game.audio.play('se_failure', 0.3); items.splice(i, 1); if (missed >= MAX_MISS) { finish(false); return; } continue; }
        }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 4, snap(particles[pp2].y) - 4, 8, 8, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.76), 60, flashCol);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#01050b');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    state = S.ATTRACT;
    initGame();
  });
})(game);
