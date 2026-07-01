// 097-volcano-escape.js
// 火山脱出 — 上昇する溶岩から足場を登って逃げ続けるサバイバル
// 操作: スワイプ上でジャンプ、左右でレーン移動
// 成功: 5秒生き残る  失敗: 溶岩に飲まれる

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'VOLCANO ESCAPE';
  var HOW_TO_PLAY = 'SWIPE UP=JUMP, L/R=MOVE';
  var MAX_TIME = 5;         // 修正2: 生存系 20s → 5s
  var LANES = 3, LANE_XS = [W * 0.24, W * 0.5, W * 0.76], PLAYER_Y0 = H * 0.68;
  var GRAVITY = 1800, JUMP_VY = -820, SPAWN_INTERVAL = 0.7;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var playerLane, targetLane, laneT, playerY, playerVY, onGround, lavaY, lavaRise, platforms, spawnTimer, timeLeft, done, survived;

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

  function spawnPlatform() { var lane = Math.floor(Math.random() * LANES), w = 150 + Math.random() * 80; platforms.push({ x: LANE_XS[lane] - w / 2, y: 340 + Math.random() * (H * 0.4), w: w, scrollY: 0 }); }
  function initGame() {
    playerLane = 1; targetLane = 1; laneT = 1; playerY = PLAYER_Y0; playerVY = 0; onGround = true; lavaY = H + 100; lavaRise = 60; spawnTimer = 0; timeLeft = MAX_TIME; done = false; survived = 0;
    platforms = [];
    for (var i = 0; i < 4; i++) platforms.push({ x: LANE_XS[i % LANES] - 90, y: H * 0.45 + i * (H * 0.14), w: 180, scrollY: 0 });
    for (var j = 0; j < LANES; j++) platforms.push({ x: LANE_XS[j] - 90, y: H * 0.76, w: 180, scrollY: 0 });
  }

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
    if (dir === 'up' && onGround) { playerVY = JUMP_VY; onGround = false; game.audio.play('se_tap', 0.7); }
    else if (dir === 'left') { targetLane = Math.max(0, playerLane - 1); laneT = 0; }
    else if (dir === 'right') { targetLane = Math.min(LANES - 1, playerLane + 1); laneT = 0; }
  });

  function playerX() { return LANE_XS[playerLane] + (LANE_XS[targetLane] - LANE_XS[playerLane]) * (1 - laneT); }

  // 世界観: 噴火する火山。迫る溶岩から足場を登って脱出する。
  function background() {
    game.draw.clear('#0a0018');
    for (var l = 0; l < LANES; l++) game.draw.rect(snap(LANE_XS[l]) - 2, 300, 4, H, C.f, 0.1);
    txt('VOLCANO', W / 2, 250, 34, C.f);
  }

  function drawScene() {
    for (var k = 0; k < platforms.length; k++) {
      var p = platforms[k], py = p.y + (p.scrollY || 0);
      if (py > H + 50 || py < 280) continue;
      game.draw.rect(snap(p.x), snap(py) - 20, snap(p.w), 24, '#442200');
      game.draw.rect(snap(p.x), snap(py) - 20, snap(p.w), 8, C.f, 0.6);
    }
    // プレイヤー（ドット絵）
    var px = playerX();
    drawPixelCircle(px, playerY, 30, C.e, 1);
    game.draw.rect(snap(px) - 12, snap(playerY) - 12, 8, 8, C.g);
    game.draw.rect(snap(px) + 4, snap(playerY) - 12, 8, 8, C.g);
    // 溶岩
    for (var lx = 0; lx < W; lx += 64) { var wave = Math.sin(game.time.elapsed * 3 + lx * 0.02) * 12; game.draw.rect(snap(lx), snap(lavaY + wave), 64, H - lavaY + 60, C.f); }
    game.draw.rect(0, snap(lavaY) - 24, W, 24, C.c, 0.3 + 0.2 * (Math.floor(game.time.elapsed * 6) % 2));
    if (playerY > lavaY - 300) game.draw.rect(0, 0, W, H, C.f, Math.max(0, (300 - (lavaY - playerY)) / 300) * 0.25);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!platforms) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 72, C.f);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.55, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.6, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'SURVIVED!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt; survived += dt; lavaRise += 3 * dt;
      if (timeLeft <= 0) { finish(true); return; }
      if (laneT < 1) { laneT += dt * 10; if (laneT >= 1) { laneT = 1; playerLane = targetLane; } }
      playerVY += GRAVITY * dt; playerY += playerVY * dt;
      onGround = false;
      var px = playerX();
      for (var i = 0; i < platforms.length; i++) {
        var pl = platforms[i], py = pl.y + (pl.scrollY || 0);
        if (px >= pl.x - 20 && px <= pl.x + pl.w + 20 && playerY >= py - 80 && playerY <= py + 10 && playerVY >= 0) { playerY = py - 80; playerVY = 0; onGround = true; break; }
      }
      if (playerY < H * 0.4) { var scroll = H * 0.4 - playerY; playerY += scroll; lavaY += scroll; for (var j = 0; j < platforms.length; j++) platforms[j].scrollY = (platforms[j].scrollY || 0) + scroll; }
      lavaY -= lavaRise * dt;
      spawnTimer -= dt; if (spawnTimer <= 0) { spawnTimer = SPAWN_INTERVAL; spawnPlatform(); }
      platforms = platforms.filter(function(pl) { return pl.y + (pl.scrollY || 0) < lavaY + 100; });
      if (playerY + 30 >= lavaY) { finish(false); return; }
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 44, C.b);
    txt('UP=JUMP  L/R=MOVE', W / 2, H - 90, 42, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
