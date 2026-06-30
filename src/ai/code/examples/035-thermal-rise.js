// 035-thermal-rise.js
// サーマルライズ — 上昇気流に乗りながら高さを調整する気球操縦
// 操作: タップで熱気を吹かす（高度が上がる）、離すと下がる
// 成功: 目標高度ゾーンを3秒キープ  失敗: 天井衝突・地面激突・20秒超過

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'THERMAL RISE';
  var HOW_TO_PLAY = 'TAP TO BURN / HOLD ALTITUDE';
  var MAX_TIME = 20;
  var NEEDED_TIME = 3;       // 修正2: 生存系 10s → 3s
  var GRAVITY = -0.18, THRUST = 0.45, DAMPING = 0.96;
  var ZONE_MIN = 0.35, ZONE_MAX = 0.65;
  var CEILING_H = 200, GROUND_H = 200, PLAYFIELD_H = H - 400;  // 修正1: 縦全域
  var BALLOON_R = 88;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var altitude, velocity, isThrusting, zoneTimer, timeLeft, done, balloonY;

  function snap(v) { return Math.round(v / 8) * 8; }
  function drawPixelCircle(px, py, r, color, alpha) {
    var step = 8; px = snap(px); py = snap(py);
    for (var yy = -r; yy <= r; yy += step)
      for (var xx = -r; xx <= r; xx += step)
        if (xx * xx + yy * yy <= r * r) game.draw.rect(px + xx, py + yy, step, step, color, alpha);
  }
  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x,     y,     { size: sz, color: color,     bold: true, align: align || 'center' });
  }
  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }
  function timeBar() {
    var blocks = 12, lit = Math.ceil(timeLeft / MAX_TIME * blocks);
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#003b00');
  }

  function initGame() { altitude = 0.5; velocity = 0; isThrusting = false; zoneTimer = 0; timeLeft = MAX_TIME; done = false; balloonY = H / 2; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : Math.floor(zoneTimer * 100);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onHold(function(x, y) { if (state === S.PLAYING && !done) isThrusting = true; });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    isThrusting = !isThrusting;  // PLAYING: トグル点火
  });

  function background() {
    game.draw.clear(C.bg);
    var zoneY1 = CEILING_H + PLAYFIELD_H * (1 - ZONE_MAX), zoneH = PLAYFIELD_H * (ZONE_MAX - ZONE_MIN);
    game.draw.rect(0, snap(zoneY1), W, snap(zoneH), C.b, 0.2);
    game.draw.rect(0, snap(zoneY1), W, 6, C.b);
    game.draw.rect(0, snap(zoneY1 + zoneH) - 6, W, 6, C.b);
    game.draw.rect(0, 0, W, CEILING_H, C.d, 0.6); txt('CEILING', W / 2, CEILING_H / 2, 40, C.g);
    game.draw.rect(0, H - GROUND_H, W, GROUND_H, C.f, 0.5); txt('GROUND', W / 2, H - GROUND_H / 2, 40, C.g);
  }

  function drawBalloon() {
    var bx = W / 2;
    if (isThrusting) game.draw.rect(snap(bx - 12), snap(balloonY + BALLOON_R + 48), 24, snap(60 + (Math.floor(game.time.elapsed * 16) % 2) * 24), C.f);
    game.draw.rect(snap(bx - 44), snap(balloonY + BALLOON_R - 8), 88, 56, C.f);
    drawPixelCircle(bx, balloonY, BALLOON_R, C.a, 1);
    drawPixelCircle(bx - 24, balloonY - 28, 16, C.g, 0.6);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (altitude === undefined) initGame();
      background();
      balloonY = CEILING_H + PLAYFIELD_H * (0.5 + Math.sin(game.time.elapsed) * 0.2);
      drawBalloon();
      txt(GAME_TITLE,  W / 2, H * 0.16, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.24, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.74, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.8, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.88, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.c : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var accel = GRAVITY + (isThrusting ? THRUST : 0);
      velocity = (velocity + accel * dt) * DAMPING;
      altitude += velocity * dt;
      if (altitude <= 0 || altitude >= 1) { finish(false); return; }
      if (altitude >= ZONE_MIN && altitude <= ZONE_MAX) { zoneTimer += dt; if (zoneTimer >= NEEDED_TIME) { finish(true); return; } }
      balloonY = CEILING_H + PLAYFIELD_H * (1 - altitude);
    }

    // ---- draw ----
    background();
    drawBalloon();
    timeBar();
    txt('KEEP ' + Math.ceil(NEEDED_TIME - zoneTimer) + 's', W / 2, 96, 48, (altitude >= ZONE_MIN && altitude <= ZONE_MAX) ? C.b : C.g);
    txt(isThrusting ? 'BURNING!' : 'TAP TO BURN!', W / 2, H - 120, 48, isThrusting ? C.f : C.c);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
