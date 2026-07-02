// 194-escape-gravity.js
// 重力脱出 — 引力に引かれる宇宙船を連続タップで引力圏の外へ突破する達成感
// 操作: タップで推力を与える
// 成功: 画面上部の脱出ゾーンへ到達  失敗: 落下 or 12秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、宇宙） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'ESCAPE GRAVITY';
  var HOW_TO_PLAY = 'TAP TO THRUST · REACH THE TOP ZONE';
  var MAX_TIME = 12;             // 修正2: 30 → 12
  var PLANET_X = snap(W / 2), PLANET_Y = snap(H * 0.9), PLANET_R = 200;
  var GRAVITY_RANGE = H * 0.85, THRUST = 1300, DRAG = 0.98;
  var ESCAPE_Y = snap(H * 0.10);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var shipX, shipY, shipVX, shipVY, timeLeft, done, thrustFlash, exhaust, stars;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#001133');
  }

  function background() {
    game.draw.clear(C.bg);
    for (var i = 0; i < stars.length; i++) { var on = Math.floor((game.time.elapsed + stars[i].o) * 8) % 2 === 0 ? 0.9 : 0.3; game.draw.rect(stars[i].x, stars[i].y, 8, 8, C.c, on); }
    // 脱出ゾーン
    var eg = Math.floor(game.time.elapsed * 8) % 2 === 0;
    game.draw.rect(0, 0, W, ESCAPE_Y, C.g, eg ? 0.18 : 0.1);
    txt('ESCAPE ZONE', W / 2, ESCAPE_Y / 2, 40, C.g);
    // 惑星
    pc(PLANET_X, PLANET_Y, PLANET_R, C.a, 0.9);
    pc(PLANET_X - PLANET_R * 0.3, PLANET_Y - PLANET_R * 0.3, PLANET_R * 0.25, C.b, 0.5);
  }

  function drawShip() {
    if (thrustFlash > 0) pc(shipX, shipY + 30, 20, C.d, thrustFlash * 3);
    game.draw.rect(snap(shipX) - 8, snap(shipY) - 28, 16, 16, C.e);      // ノーズ
    game.draw.rect(snap(shipX) - 20, snap(shipY) - 12, 40, 32, C.c);     // 胴
    game.draw.rect(snap(shipX) - 20, snap(shipY) - 12, 40, 8, C.b);
    game.draw.rect(snap(shipX) - 28, snap(shipY) + 12, 16, 16, C.e);     // フィン
    game.draw.rect(snap(shipX) + 12, snap(shipY) + 12, 16, 16, C.e);
  }

  function initGame() {
    shipX = W / 2; shipY = H * 0.68; shipVX = 0; shipVY = 0;
    timeLeft = MAX_TIME; done = false; thrustFlash = 0; exhaust = [];
    stars = [];
    for (var i = 0; i < 48; i++) stars.push({ x: snap(game.random(0, W)), y: snap(game.random(0, H)), o: Math.random() });
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (Math.ceil(timeLeft) * 100 + 600) : 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    var tdx = x - shipX, tdy = y - shipY, td = Math.hypot(tdx, tdy);
    if (td > 10) { shipVX += tdx / td * THRUST * 0.4; shipVY += tdy / td * THRUST * 0.4; }
    shipVY -= THRUST * 0.6;
    thrustFlash = 0.25; game.audio.play('se_tap', 0.5);
    for (var ei = 0; ei < 5; ei++) exhaust.push({ x: shipX + game.random(-16, 16), y: shipY + 28, vx: game.random(-80, 80), vy: game.random(160, 320), life: 0.4 });
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); shipY = H * 0.5 + Math.sin(game.time.elapsed * 2) * 40; shipX = W / 2; thrustFlash = 0.2; drawShip();
      txt(GAME_TITLE, W / 2, H * 0.30, 78, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.38, 30, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.78, 62, C.d);
        txt('TAP TO START', W / 2, H * 0.84, 48, C.c);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'ESCAPED!' : 'PULLED DOWN', W / 2, H * 0.35, 72, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var dx = PLANET_X - shipX, dy = PLANET_Y - shipY, dist = Math.hypot(dx, dy);
      if (dist < GRAVITY_RANGE && dist > PLANET_R) { var g = 900 / (dist * dist) * 3000; shipVX += dx / dist * g * dt; shipVY += dy / dist * g * dt; }
      shipVX *= Math.pow(DRAG, dt * 60); shipVY *= Math.pow(DRAG, dt * 60);
      shipX += shipVX * dt; shipY += shipVY * dt;
      if (shipX < 40) { shipX = 40; shipVX = Math.abs(shipVX) * 0.5; }
      if (shipX > W - 40) { shipX = W - 40; shipVX = -Math.abs(shipVX) * 0.5; }
      if (shipY < ESCAPE_Y) { finish(true); return; }
      if (dist < PLANET_R + 20 || shipY > H + 50) { finish(false); return; }
      if (thrustFlash > 0) thrustFlash -= dt;
      for (var ei = exhaust.length - 1; ei >= 0; ei--) { exhaust[ei].x += exhaust[ei].vx * dt; exhaust[ei].y += exhaust[ei].vy * dt; exhaust[ei].life -= dt; if (exhaust[ei].life <= 0) exhaust.splice(ei, 1); }
    }

    // ---- 描画 ----
    background();
    for (var ei2 = 0; ei2 < exhaust.length; ei2++) game.draw.rect(snap(exhaust[ei2].x) - 4, snap(exhaust[ei2].y) - 4, 8, 8, C.d, exhaust[ei2].life * 1.5);
    drawShip();
    // 高度メーター
    var alt = Math.max(0, 1 - (shipY - ESCAPE_Y) / (H - ESCAPE_Y));
    game.draw.rect(W - 40, ESCAPE_Y, 24, H - ESCAPE_Y - 100, '#001133');
    game.draw.rect(W - 40, H - 100 - (H - ESCAPE_Y - 100) * alt, 24, (H - ESCAPE_Y - 100) * alt, alt > 0.7 ? C.g : C.f);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt('TAP TO THRUST!', W / 2, H - 120, 44, C.d);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
