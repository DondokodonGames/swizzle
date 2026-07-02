// 290-water-level.js
// ウォーターレベル — 注水/排水で水位を操り、沈む魚をターゲット深度ラインまで導く水槽パズル
// 操作: 左ボタンで注水、右ボタンで排水（トグル）
// 成功: 3匹を指定深度へ届ける  失敗: 3回あふれる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、アクアラボ） ──
  var C = { bg:'#02080f', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'WATER LEVEL';
  var HOW_TO_PLAY = 'FILL / DRAIN TO GUIDE THE FISH TO THE LINE';
  var MAX_TIME = 15;
  var NEEDED   = 3;          // 修正2: 10 → 3
  var MAX_OVER = 3;
  var TANK_X = snap(W * 0.14), TANK_Y = snap(H * 0.22), TANK_W = snap(W * 0.72), TANK_H = snap(H * 0.50);
  var FILL_RATE = 90, DRAIN_RATE = 70;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var waterLevel, fish, targetY, delivered, overflows, timeLeft, done, filling, draining, bubbles, flash, deliverLock;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#0a1a28');
  }

  function background() { game.draw.clear(C.bg); }

  function spawnFish() { targetY = snap(TANK_Y + 80 + Math.random() * (TANK_H - 160)); fish = { y: TANK_Y + 30, wag: 0 }; deliverLock = false; }

  function initGame() { waterLevel = TANK_H * 0.5; delivered = 0; overflows = 0; timeLeft = MAX_TIME; done = false; filling = false; draining = false; bubbles = []; flash = 0; spawnFish(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (delivered * 400 + Math.ceil(timeLeft) * 80) : delivered * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawTank() {
    game.draw.rect(TANK_X - 8, TANK_Y - 8, TANK_W + 16, TANK_H + 16, C.d, 0.9);
    game.draw.rect(TANK_X, TANK_Y, TANK_W, TANK_H, '#040c14', 0.95);
    var wy = snap(TANK_Y + TANK_H - waterLevel);
    game.draw.rect(TANK_X, wy, TANK_W, snap(waterLevel), C.e, 0.35);
    game.draw.rect(TANK_X, wy, TANK_W, 8, C.e, 0.7);
  }

  function drawFish() {
    if (!fish) return;
    var fx = snap(TANK_X + TANK_W / 2), fy = snap(fish.y), wag = Math.floor(game.time.elapsed * 8) % 2 ? 8 : -8;
    pc(fx, fy, 26, C.f, 0.95);
    game.draw.rect(fx + 22, fy - 4 + wag, 20, 8, C.f, 0.9);
    game.draw.rect(fx + 22, fy - 12 + wag, 12, 8, C.f, 0.9);
    game.draw.rect(fx + 8, fy - 8, 10, 10, C.g, 0.95); game.draw.rect(fx + 12, fy - 6, 5, 5, C.bg, 1);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var by = snap(H * 0.82);
    if (y >= by && y <= by + 100) { if (x < W / 2) { filling = !filling; draining = false; } else { draining = !draining; filling = false; } game.audio.play('se_tap', 0.3); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (fish === undefined || fish === null) initGame(); background(); drawTank();
      game.draw.rect(TANK_X, snap(targetY), TANK_W, 6, C.b, 0.8); txt('>', TANK_X + TANK_W + 24, targetY + 12, 40, C.b);
      drawFish();
      txt(GAME_TITLE, W / 2, H * 0.13, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.185, 24, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.94, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.98, 44, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ALL SAFE!' : 'FLOODED', W / 2, H * 0.35, 76, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (flash > 0) flash -= dt;
      if (filling) waterLevel += FILL_RATE * dt;
      if (draining) waterLevel -= DRAIN_RATE * dt;
      waterLevel = Math.max(0, waterLevel);
      if (waterLevel >= TANK_H) { waterLevel = TANK_H; if (filling) { overflows++; filling = false; game.audio.play('se_failure', 0.5); if (overflows >= MAX_OVER) { finish(false); return; } } }
      // 魚は水面につれて沈む（水位が高いほど深く漂う）
      if (fish && !deliverLock) {
        var surfaceY = TANK_Y + TANK_H - waterLevel;
        fish.y = Math.min(fish.y + 40 * dt, Math.max(surfaceY + 40, TANK_Y + 40));
        if (Math.abs(fish.y - targetY) < 22) {
          deliverLock = true; delivered++; flash = 0.5; game.audio.play('se_success', 0.5);
          if (delivered >= NEEDED) { finish(true); return; }
          setTimeout(function() { if (!done) spawnFish(); }, 700);
        }
      }
      if (filling && Math.random() < 0.3) bubbles.push({ x: snap(TANK_X + Math.random() * TANK_W), y: TANK_Y + TANK_H - waterLevel, life: 1.0 });
      for (var bi = bubbles.length - 1; bi >= 0; bi--) { bubbles[bi].y -= 100 * dt; bubbles[bi].life -= dt; if (bubbles[bi].life <= 0 || bubbles[bi].y < TANK_Y) bubbles.splice(bi, 1); }
    }

    // ---- 描画 ----
    background(); drawTank();
    game.draw.rect(TANK_X, snap(targetY), TANK_W, 6, C.b, 0.8 + 0.2 * (Math.floor(game.time.elapsed * 4) % 2)); txt('>', TANK_X + TANK_W + 24, targetY + 12, 40, C.b);
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) game.draw.rect(snap(bubbles[bi2].x) - 4, snap(bubbles[bi2].y) - 4, 8, 8, C.e, bubbles[bi2].life * 0.6);
    drawFish();
    if (flash > 0) game.draw.rect(TANK_X, TANK_Y, TANK_W, TANK_H, C.b, flash * 0.4);

    // コントロールボタン
    var by = snap(H * 0.82);
    game.draw.rect(40, by, W / 2 - 60, 100, filling ? C.e : '#0a1a28', 0.9); txt(filling ? 'FILL [ON]' : 'FILL', W * 0.25, by + 62, 40, filling ? '#000' : C.g);
    game.draw.rect(W / 2 + 20, by, W / 2 - 60, 100, draining ? C.a : '#0a1a28', 0.9); txt(draining ? 'DRAIN [ON]' : 'DRAIN', W * 0.75, by + 62, 40, draining ? '#000' : C.g);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(delivered + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var oi = 0; oi < MAX_OVER; oi++) game.draw.rect(snap(W / 2 + (oi - (MAX_OVER - 1) / 2) * 56) - 10, 224, 20, 20, oi < overflows ? C.a : '#0a1a28');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    state = S.ATTRACT;
    fish = null;
    initGame();
  });
})(game);
