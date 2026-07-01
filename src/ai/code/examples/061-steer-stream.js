// 061-steer-stream.js
// ストリームステアー — 激流を下る丸太に乗って岩を避けながら川を下る
// 操作: 左右スワイプで丸太の位置を移動
// 成功: 8秒生き残る  失敗: 岩に当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'STEER STREAM';
  var HOW_TO_PLAY = 'SWIPE L/R TO STEER THE LOG';
  var MAX_TIME = 8;          // 修正2: 生存系 30s → 8s
  var LOG_W = 260, LOG_H = 72, LOG_Y = H * 0.8, LOG_LANES = 5, LANE_W = W / 5;   // 修正1: 丸太は下部
  var SPAWN_INTERVAL = 0.8;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var logX, rocks, foam, scrollSpeed, spawnTimer, timeLeft, done, deathFlash, waterPhase;

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

  function spawnRock() { var lane = Math.floor(Math.random() * LOG_LANES), x = LANE_W * lane + LANE_W / 2, w = 90 + Math.random() * 70; rocks.push({ x: x, y: -120, w: w, h: w }); }
  function initGame() { logX = W / 2; rocks = []; foam = []; scrollSpeed = 460; spawnTimer = 0.5; timeLeft = MAX_TIME; done = false; deathFlash = 0; waterPhase = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? 300 : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left') { logX = Math.max(LOG_W / 2, logX - LANE_W); game.audio.play('se_tap', 0.4); }
    else if (dir === 'right') { logX = Math.min(W - LOG_W / 2, logX + LANE_W); game.audio.play('se_tap', 0.4); }
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  // 世界観: 激流下り。丸太に乗り岩をかわして川を下る。
  function background() {
    game.draw.clear('#000022');
    game.draw.rect(0, 0, W, H, C.a, 0.4);   // 川面
    for (var wl = 0; wl < 10; wl++) { var wy = snap((wl / 10 * H + waterPhase * 100) % H); game.draw.rect(0, wy, W, 10, C.b, 0.12); }
    for (var l = 1; l < LOG_LANES; l++) game.draw.rect(snap(LANE_W * l) - 1, 0, 2, H, C.b, 0.15);
  }

  function drawLog(x) {
    var bx = snap(x - LOG_W / 2), by = snap(LOG_Y - LOG_H / 2);
    game.draw.rect(bx, by, LOG_W, LOG_H, C.f);
    for (var g = 0; g < 3; g++) game.draw.rect(bx + 16, by + 16 + g * 16, LOG_W - 32, 4, C.d, 0.4);
    drawPixelCircle(x - LOG_W / 2, LOG_Y, LOG_H / 2, C.d, 0.6);
    drawPixelCircle(x + LOG_W / 2, LOG_Y, LOG_H / 2, C.d, 0.6);
    game.draw.rect(snap(x) - 16, snap(LOG_Y - LOG_H / 2 - 32), 32, 32, C.c);  // 乗り手
  }
  function drawRocks() { for (var r = 0; r < rocks.length; r++) { drawPixelCircle(rocks[r].x, rocks[r].y, rocks[r].w / 2, '#555577', 1); drawPixelCircle(rocks[r].x - rocks[r].w * 0.2, rocks[r].y - rocks[r].w * 0.2, rocks[r].w * 0.15, C.c, 0.4); } }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!rocks) initGame();
      background();
      drawRocks(); drawLog(W / 2);
      txt(GAME_TITLE,  W / 2, H * 0.2, 80, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 38, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 72, C.g);
        txt('TAP TO START', W / 2, H * 0.57, 52, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.64, 42, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.d : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(true); return; }
      waterPhase += dt * 2; scrollSpeed = 460 + (MAX_TIME - timeLeft) * 40;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnRock(); spawnTimer = Math.max(0.45, SPAWN_INTERVAL - (MAX_TIME - timeLeft) * 0.03); }
      for (var i = rocks.length - 1; i >= 0; i--) {
        rocks[i].y += scrollSpeed * dt; var rk = rocks[i];
        if (rk.y + rk.h / 2 > LOG_Y - LOG_H / 2 && rk.y - rk.h / 2 < LOG_Y + LOG_H / 2 && rk.x + rk.w / 2 > logX - LOG_W / 2 && rk.x - rk.w / 2 < logX + LOG_W / 2) { deathFlash = 0.5; finish(false); return; }
        if (rk.y > H + 200) rocks.splice(i, 1);
      }
    }

    // ---- draw ----
    background();
    drawRocks();
    drawLog(logX);
    if (deathFlash > 0) game.draw.rect(0, 0, W, H, C.e, deathFlash * 0.4);
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 48, C.c);
    txt('SWIPE TO STEER!', W / 2, H - 100, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
