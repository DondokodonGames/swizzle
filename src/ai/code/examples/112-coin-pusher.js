// 112-coin-pusher.js
// コインプッシャー — プッシャーで押し出しコインを棚の端から落とすゲーセンの定番
// 操作: タップでコインを投下
// 成功: 3枚を落とす  失敗: 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'COIN PUSHER';
  var HOW_TO_PLAY = 'TAP TO DROP COINS OFF THE EDGE';
  var MAX_TIME = 30;
  var NEEDED = 3;           // 修正2: 30 → 3
  var SHELF_Y = H * 0.55, SHELF_H = 48, SHELF_X = 100, SHELF_W = W - 200, COIN_R = 40, PUSHER_H = 72, PUSHER_W = 220, PUSHER_SPEED = 260;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var coins, pusherX, pusherDir, fallen, timeLeft, done, scoreFlash;

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

  function initGame() {
    coins = [];
    for (var i = 0; i < 8; i++) coins.push({ x: SHELF_X + 60 + Math.random() * (SHELF_W - 120), y: SHELF_Y - COIN_R - Math.floor(Math.random() * 2) * (COIN_R * 2 + 4), vx: 0, vy: 0, r: COIN_R, fallen: false });
    pusherX = SHELF_X; pusherDir = 1; fallen = 0; timeLeft = MAX_TIME; done = false; scoreFlash = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : fallen * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var x = Math.max(SHELF_X + COIN_R, Math.min(SHELF_X + SHELF_W - COIN_R, tx));
    coins.push({ x: x, y: SHELF_Y - 300, vx: 0, vy: 0, r: COIN_R, fallen: false });
    game.audio.play('se_tap', 0.5);
  });

  // 世界観: ゲームセンターのコインプッシャー台。押し出しで端から落とす。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(snap(SHELF_X) - 20, snap(SHELF_Y) - 320, SHELF_W + 40, 300, '#12002a');
    txt('PUSHER ARCADE', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    game.draw.rect(snap(SHELF_X), snap(SHELF_Y), SHELF_W, SHELF_H, '#221040');
    game.draw.rect(snap(SHELF_X), snap(SHELF_Y), SHELF_W, 8, C.d);
    game.draw.rect(snap(pusherX), snap(SHELF_Y - PUSHER_H), PUSHER_W, PUSHER_H, C.d);
    game.draw.rect(snap(pusherX), snap(SHELF_Y - PUSHER_H), PUSHER_W, 8, C.e);
    for (var ci = 0; ci < coins.length; ci++) { var c = coins[ci]; if (c.fallen) continue; drawPixelCircle(c.x, c.y, c.r, C.c, 1); drawPixelCircle(c.x, c.y, c.r * 0.5, C.f, 1); txt('Y', c.x, c.y, 30, '#663300'); }
    if (scoreFlash > 0) txt('+1', W / 2, H * 0.72, 72, C.b);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!coins) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 28, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.82, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.87, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.92, 40, '#888888');
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
      pusherX += pusherDir * PUSHER_SPEED * dt;
      if (pusherX + PUSHER_W > SHELF_X + SHELF_W - 8) { pusherX = SHELF_X + SHELF_W - PUSHER_W - 8; pusherDir = -1; }
      if (pusherX < SHELF_X + 8) { pusherX = SHELF_X + 8; pusherDir = 1; }
      var PUSHER_Y = SHELF_Y - PUSHER_H;
      for (var i = 0; i < coins.length; i++) {
        var c = coins[i]; if (c.fallen) continue;
        c.vy += 1200 * dt; c.y += c.vy * dt; c.x += c.vx * dt; c.vx *= Math.pow(0.85, dt * 60);
        if (c.y + c.r > SHELF_Y && c.vy > 0) { c.y = SHELF_Y - c.r; c.vy *= -0.2; if (Math.abs(c.vy) < 30) c.vy = 0; }
        if (c.y + c.r >= SHELF_Y - 4 && c.x + c.r > pusherX && c.x - c.r < pusherX + PUSHER_W && c.y + c.r > PUSHER_Y) c.vx += pusherDir * PUSHER_SPEED * 0.8;
        for (var j = i + 1; j < coins.length; j++) {
          var c2 = coins[j]; if (c2.fallen) continue;
          var dx = c2.x - c.x, dy = c2.y - c.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < c.r + c2.r && dist > 0) { var ov = (c.r + c2.r - dist) / 2, nx = dx / dist, ny = dy / dist; c.x -= nx * ov; c.y -= ny * ov; c2.x += nx * ov; c2.y += ny * ov; var rv = (c2.vx - c.vx) * nx + (c2.vy - c.vy) * ny; if (rv < 0) { c.vx -= rv * nx * 0.5; c.vy -= rv * ny * 0.5; c2.vx += rv * nx * 0.5; c2.vy += rv * ny * 0.5; } }
        }
        if (c.x - c.r < SHELF_X || c.x + c.r > SHELF_X + SHELF_W) { c.fallen = true; fallen++; scoreFlash = 0.4; game.audio.play('se_tap', 0.8); if (fallen >= NEEDED) { finish(true); return; } }
      }
      coins = coins.filter(function(c) { return !c.fallen; });
      if (scoreFlash > 0) scoreFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('DROPPED ' + fallen + ' / ' + NEEDED, W / 2, 96, 44, C.c);
    txt('TAP TO DROP COINS!', W / 2, H - 90, 42, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
