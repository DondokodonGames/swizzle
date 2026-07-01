// 054-gravity-flip.js
// グラビティフリップ — 重力の向きを反転させてキャラクターを障害物の間を通す
// 操作: タップで重力を上下反転
// 成功: ゴールまで到達  失敗: 障害物に当たる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#008f11', c:'#003b00', d:'#00ff41', e:'#ffffff', f:'#ff0000', g:'#ffff00' };

  var GAME_TITLE  = 'GRAVITY FLIP';
  var HOW_TO_PLAY = 'TAP TO FLIP GRAVITY';
  var MAX_TIME = 20;
  var PLAYER_R = 40, GRAVITY = 1800, PLAYER_X = 200, WALL_W = 96;
  var GAP_H = 460, SCROLL_SPEED = 320, GOAL_DISTANCE = 1400;   // 修正2: 距離短縮・隙間拡大で易化

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var playerY, playerVy, gravityDir, flipAnim, walls, wallTimer, distance, timeLeft, done, deathFlash;

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
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.a : '#330000');
  }

  function spawnWall() { var gt = 220 + Math.random() * (H - 440 - GAP_H); walls.push({ x: W + 100, gapTop: gt, gapBottom: gt + GAP_H }); }
  function initGame() { playerY = H / 2; playerVy = 0; gravityDir = 1; flipAnim = 0; walls = []; wallTimer = 0.7; distance = 0; timeLeft = MAX_TIME; done = false; deathFlash = 0; spawnWall(); }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 30) : Math.floor(distance / GOAL_DISTANCE * 300);
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1500);
  }

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    gravityDir = -gravityDir; playerVy *= 0.3; flipAnim = 0.15; game.audio.play('se_tap', 0.5);
  });

  // 世界観: 洞窟トンネルを重力を反転させながら飛び抜ける探査ドローン。
  function background() {
    game.draw.clear('#001100');
    for (var gy = 100; gy < H; gy += 80) game.draw.rect(0, gy, W, 2, C.c, 0.6);
    txt('CAVE TUNNEL', W / 2, 96, 34, C.b);
    // 進捗バー
    var prog = Math.min(1, distance / GOAL_DISTANCE);
    game.draw.rect(0, H - 24, W, 24, C.c);
    game.draw.rect(0, H - 24, W * prog, 24, C.a);
    if (prog > 0.9) txt('GOAL', W * prog - 80, H - 60, 32, C.g);
  }

  function drawWalls() {
    for (var w = 0; w < walls.length; w++) {
      var wl = walls[w];
      game.draw.rect(snap(wl.x), 0, WALL_W, snap(wl.gapTop), C.b);
      game.draw.rect(snap(wl.x), snap(wl.gapTop) - 12, WALL_W, 12, C.a);
      game.draw.rect(snap(wl.x), snap(wl.gapBottom), WALL_W, H - snap(wl.gapBottom), C.b);
      game.draw.rect(snap(wl.x), snap(wl.gapBottom), WALL_W, 12, C.a);
    }
  }

  function drawDrone(x, y) {
    var bx = snap(x), by = snap(y);
    drawPixelCircle(bx, by, PLAYER_R, C.a, 1);
    game.draw.rect(bx - 16, by - 8, 32, 16, C.e);   // 窓
    game.draw.rect(bx - 8, by + gravityDir * (PLAYER_R + 4), 16, 16, C.g); // 推進(重力方向)
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!walls) initGame();
      background();
      drawDrone(PLAYER_X, H / 2 + Math.sin(game.time.elapsed * 2) * 200);
      txt(GAME_TITLE,  W / 2, H * 0.3, 84, C.g);
      txt(HOW_TO_PLAY, W / 2, H * 0.4, 44, C.a);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.62, 72, C.e);
        txt('TAP TO START', W / 2, H * 0.72, 52, C.e);
      }
      txt('INSERT COIN', W / 2, H * 0.86, 42, '#446644');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.g : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.e);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.a);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      playerVy += GRAVITY * gravityDir * dt; playerY += playerVy * dt;
      if (playerY - PLAYER_R < 0) { playerY = PLAYER_R; playerVy = Math.abs(playerVy) * 0.3; }
      if (playerY + PLAYER_R > H) { playerY = H - PLAYER_R; playerVy = -Math.abs(playerVy) * 0.3; }
      if (flipAnim > 0) flipAnim -= dt;
      distance += SCROLL_SPEED * dt;
      wallTimer -= dt; if (wallTimer <= 0) { spawnWall(); wallTimer = 1.3; }
      for (var i = walls.length - 1; i >= 0; i--) {
        walls[i].x -= SCROLL_SPEED * dt;
        if (walls[i].x + WALL_W > PLAYER_X - PLAYER_R && walls[i].x < PLAYER_X + PLAYER_R &&
            (playerY - PLAYER_R < walls[i].gapTop || playerY + PLAYER_R > walls[i].gapBottom)) { deathFlash = 0.5; finish(false); return; }
        if (walls[i].x < -WALL_W - 20) walls.splice(i, 1);
      }
      if (distance >= GOAL_DISTANCE) { finish(true); return; }
    }

    // ---- draw ----
    background();
    drawWalls();
    drawDrone(PLAYER_X, playerY);
    if (deathFlash > 0) game.draw.rect(0, 0, W, H, C.f, deathFlash * 0.4);
    timeBar();
    txt('DEPTH ' + Math.floor(distance / GOAL_DISTANCE * 100) + '%', W / 2, 150, 44, C.g);
    txt('TAP TO FLIP!', W / 2, H - 80, 44, C.a);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
