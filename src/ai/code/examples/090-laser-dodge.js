// 090-laser-dodge.js
// レーザー回避 — 壁から走査するレーザーをスワイプで避け続けるスリル
// 操作: スワイプで自機を上下レーンに移動
// 成功: 5秒生き残る  失敗: レーザーに当たる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  var GAME_TITLE  = 'LASER DODGE';
  var HOW_TO_PLAY = 'SWIPE UP/DOWN TO DODGE';
  var MAX_TIME = 5;         // 修正2: 生存系 20s → 5s
  var LANES = 5, LANE_H = (H * 0.6) / 5, LANE_Y0 = H * 0.26, SHIP_X = W * 0.2;
  var SPAWN_INTERVAL = 0.9;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var playerLane, targetLane, laneProgress, lasers, timeLeft, done, spawnTimer, hitFlash, survived;

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

  function laneY(lane) { return LANE_Y0 + (lane + 0.5) * LANE_H; }
  function shipY() { return laneY(playerLane) * (1 - laneProgress) + laneY(targetLane) * laneProgress; }

  function spawnLaser() {
    var fromRight = Math.random() > 0.5;
    lasers.push({ lane: Math.floor(Math.random() * LANES), x: fromRight ? W + 40 : -40, dir: fromRight ? -1 : 1, speed: 620 + survived * 30, warning: 0.6 });
  }
  function initGame() { playerLane = 2; targetLane = 2; laneProgress = 1; lasers = []; timeLeft = MAX_TIME; done = false; spawnTimer = 0.4; hitFlash = 0; survived = 0; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(survived) * 40) : Math.floor(survived * 60);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });
  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') targetLane = Math.max(0, playerLane - 1);
    if (dir === 'down') targetLane = Math.min(LANES - 1, playerLane + 1);
    if (targetLane !== playerLane) { laneProgress = 0; game.audio.play('se_tap', 0.4); }
  });

  // 世界観: レーザー迷宮。走査ビームの隙間をレーン移動で切り抜ける宇宙船。
  function background() {
    game.draw.clear('#000011');
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.e, hitFlash * 0.5);
    for (var li = 0; li < LANES; li++) { var ty = LANE_Y0 + li * LANE_H; game.draw.rect(0, snap(ty), W, LANE_H - 2, li % 2 === 0 ? '#000822' : '#00051a'); }
    txt('LASER MAZE', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var ki = 0; ki < lasers.length; ki++) {
      var l = lasers[ki], cy = laneY(l.lane);
      if (l.warning > 0) { if (Math.floor(game.time.elapsed * 16) % 2 === 0) { game.draw.rect(0, snap(cy) - LANE_H * 0.4, W, LANE_H * 0.8, C.e, 0.15); txt('!', l.dir > 0 ? 60 : W - 60, cy, 44, C.e); } }
      else { var from = l.dir > 0 ? 0 : W; game.draw.line(from, cy, l.x, cy, C.e, 10); game.draw.line(from, cy, l.x, cy, C.c, 4); drawPixelCircle(l.x, cy, 16, C.c, 0.9); }
    }
    // 自機（ドット絵）
    var sy = shipY();
    game.draw.rect(snap(SHIP_X) - 8, snap(sy) - 16, 48, 32, C.b);
    game.draw.rect(snap(SHIP_X) - 24, snap(sy) - 8, 24, 16, C.a);
    game.draw.rect(snap(SHIP_X) + 32, snap(sy) - 8, 16, 16, C.c);
    game.draw.rect(snap(SHIP_X) - 40, snap(sy) - 4, 16, 8, C.d, 0.8);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!lasers) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 80, C.b);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.c);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.88, 64, C.g);
        txt('TAP TO START', W / 2, H * 0.93, 46, C.c);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (laneProgress < 1) { laneProgress += dt * 8; if (laneProgress >= 1) { laneProgress = 1; playerLane = targetLane; } }
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnTimer = Math.max(0.5, SPAWN_INTERVAL - survived * 0.05); spawnLaser(); }
      var sy = shipY();
      for (var i = lasers.length - 1; i >= 0; i--) {
        var l = lasers[i];
        if (l.warning > 0) { l.warning -= dt; continue; }
        l.x += l.dir * l.speed * dt;
        if (Math.abs(sy - laneY(l.lane)) < LANE_H * 0.35 && l.x > SHIP_X - 40 && l.x < SHIP_X + 44) { hitFlash = 0.5; finish(false); return; }
        if (l.x < -100 || l.x > W + 100) lasers.splice(i, 1);
      }
      if (hitFlash > 0) hitFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.f);
    txt('SWIPE UP / DOWN!', W / 2, H - 90, 44, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
