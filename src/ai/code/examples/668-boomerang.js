// 668-boomerang.js
// ブーメラン — タップで投げ、弧を描いて戻ってきた瞬間タップでキャッチする
// 操作: タップで投擲 → 戻ってきて「NOW!」の輪が出たらタップでキャッチ。逃すとミス
// 成功: 8回 キャッチ  失敗: 3回 取り逃し or 18秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT、荒野） ──
  var C = { bg:'#040a02', a:'#ff3300', b:'#00ff41', c:'#ffe600', d:'#00cc33', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'BOOMERANG';
  var HOW_TO_PLAY = 'TAP TO THROW · TAP AGAIN WHEN IT RETURNS AND THE CATCH RING GLOWS';
  var MAX_TIME = 18;
  var NEEDED   = 8;          // 修正2: 15 → 8
  var MAX_MISS = 3;          // 修正2: 8 → 3
  var PLAYER_X = W * 0.22, PLAYER_Y = snap(H * 0.70), PLAYER_R = 56, CATCH_R = 130, FLIGHT = 1.8, CATCH_WINDOW = 0.45;

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var boomState, boomX, boomY, boomAngle, boomT, boomPeakX, boomStartX, boomStartY, caught, missed, timeLeft, done, particles, flash, flashCol, resultText, resultTimer, catchWindow, catchWindowTimer;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#040802');
  }

  function background() { game.draw.clear(C.bg); game.draw.rect(0, 0, W, H * 0.74, '#081006', 0.8); game.draw.rect(0, snap(H * 0.74), W, H * 0.26, '#1a2e0a', 0.9); game.draw.rect(0, snap(H * 0.74), W, 10, C.d, 0.7); }

  function initGame() { boomState = 'ready'; boomX = PLAYER_X; boomY = PLAYER_Y - PLAYER_R; boomAngle = 0; boomT = 0; caught = 0; missed = 0; timeLeft = MAX_TIME; done = false; particles = []; flash = 0; flashCol = C.b; resultText = ''; resultTimer = 0; catchWindow = false; catchWindowTimer = 0; }

  function throwBoom() { boomState = 'flying'; boomT = 0; boomX = PLAYER_X; boomY = PLAYER_Y - PLAYER_R; boomStartX = PLAYER_X; boomStartY = PLAYER_Y - PLAYER_R; boomPeakX = W * 0.78 + Math.random() * W * 0.1; catchWindow = false; game.audio.play('se_tap', 0.2); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (caught * 500 + Math.ceil(timeLeft) * 100) : caught * 150;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawScene() {
    pc(PLAYER_X, PLAYER_Y, PLAYER_R, C.d, 0.9); pc(PLAYER_X - PLAYER_R * 0.3, PLAYER_Y - PLAYER_R * 0.3, PLAYER_R * 0.25, C.b, 0.5);
    if (boomState === 'returning' && catchWindow) { ring(PLAYER_X, PLAYER_Y - PLAYER_R, CATCH_R, C.b, 0.2 + (Math.sin(game.time.elapsed * 10) + 1) * 0.5 * 0.1); txt('NOW!', PLAYER_X, PLAYER_Y - PLAYER_R - CATCH_R - 20, 48, C.b); }
    if (boomState !== 'ready' && boomState !== 'caught') {
      var bLen = 50;
      var hub = { x: boomX + Math.cos(boomAngle + Math.PI / 2) * bLen * 0.6, y: boomY + Math.sin(boomAngle + Math.PI / 2) * bLen * 0.6 };
      game.draw.line(hub.x, hub.y, boomX + Math.cos(boomAngle) * bLen, boomY + Math.sin(boomAngle) * bLen, C.f, 14);
      game.draw.line(hub.x, hub.y, boomX - Math.cos(boomAngle) * bLen, boomY - Math.sin(boomAngle) * bLen, C.f, 14);
      pc(boomX, boomY, 16, C.c, 0.9);
    }
  }

  // ── 入力 ──
  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (boomState === 'ready') throwBoom();
    else if (boomState === 'returning' && catchWindow) {
      var dx = tx - PLAYER_X, dy = ty - PLAYER_Y;
      if (dx * dx + dy * dy < CATCH_R * CATCH_R) {
        caught++; boomState = 'caught'; catchWindow = false; flash = 0.35; flashCol = C.b; resultText = 'CAUGHT!'; resultTimer = 0.55; game.audio.play('se_success', 0.7);
        for (var p = 0; p < 8; p++) { var pa = Math.random() * Math.PI * 2; particles.push({ x: PLAYER_X, y: PLAYER_Y - PLAYER_R, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.45, col: C.c }); }
        if (caught >= NEEDED) { finish(true); return; }
        setTimeout(function() { boomState = 'ready'; }, 600);
      }
    }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!particles) initGame(); background(); drawScene();
      txt(GAME_TITLE, W / 2, H * 0.12, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.165, 20, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) txt('► 100円 投入 ◄ TAP TO START', W / 2, H * 0.90, 40, C.a);
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOOD HANDS!' : 'FUMBLED', W / 2, H * 0.35, 64, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (flash > 0) flash -= dt * 3; if (resultTimer > 0) resultTimer -= dt;
      boomAngle += dt * 12;
      if (boomState === 'flying') {
        boomT += dt; var t = boomT / (FLIGHT * 0.5);
        if (t >= 1) { boomState = 'returning'; boomT = 0; } else { boomX = boomStartX + (boomPeakX - boomStartX) * t; boomY = boomStartY - Math.sin(t * Math.PI) * (H * 0.32); }
      } else if (boomState === 'returning') {
        boomT += dt; var t2 = boomT / (FLIGHT * 0.5);
        if (t2 >= 1) { boomState = 'ready'; catchWindow = false; missed++; flash = 0.35; flashCol = C.a; resultText = 'MISSED!'; resultTimer = 0.55; game.audio.play('se_failure', 0.35); if (missed >= MAX_MISS) { finish(false); return; } }
        else {
          boomX = boomPeakX + (PLAYER_X - boomPeakX) * t2; boomY = boomStartY - Math.sin((1 - t2) * Math.PI) * (H * 0.26);
          var dist = Math.sqrt((boomX - PLAYER_X) * (boomX - PLAYER_X) + (boomY - (PLAYER_Y - PLAYER_R)) * (boomY - (PLAYER_Y - PLAYER_R)));
          if (dist < CATCH_R && !catchWindow) { catchWindow = true; catchWindowTimer = CATCH_WINDOW; }
        }
        if (catchWindow) { catchWindowTimer -= dt; if (catchWindowTimer <= 0) catchWindow = false; }
      }
      for (var pp = particles.length - 1; pp >= 0; pp--) { var p2 = particles[pp]; p2.x += p2.vx * dt; p2.y += p2.vy * dt; p2.life -= dt * 2.5; if (p2.life <= 0) particles.splice(pp, 1); }
    }

    // ---- 描画 ----
    background(); drawScene();
    for (var pp2 = 0; pp2 < particles.length; pp2++) game.draw.rect(snap(particles[pp2].x) - 5, snap(particles[pp2].y) - 5, 10, 10, particles[pp2].col, particles[pp2].life * 1.6);
    if (flash > 0) game.draw.rect(0, 0, W, H, flashCol, flash * 0.09);
    if (resultTimer > 0) txt(resultText, W / 2, snap(H * 0.80), 64, flashCol);
    else if (boomState === 'ready') txt('TAP TO THROW', W / 2, snap(H * 0.86), 42, '#ffffff44');

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(caught + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var mi = 0; mi < MAX_MISS; mi++) game.draw.rect(snap(W / 2 + (mi - (MAX_MISS - 1) / 2) * 56) - 10, 224, 20, 20, mi < missed ? C.a : '#040802');
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    state = S.ATTRACT;
    initGame();
  });
})(game);
