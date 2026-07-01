// 144-traffic-cross.js
// 交差点横断 — 車が途切れた瞬間を見極めてキャラを渡らせる瞬時判断ゲーム
// 操作: タップでキャラを前進（2回で渡り切る）
// 成功: 1回渡る  失敗: 3回轢かれる or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（クラシックアーケード、夜の道路） ──
  var C = { bg:'#000011', a:'#0000ff', b:'#00ffff', c:'#ffffff', d:'#ffff00', e:'#ff0000', f:'#00ff00', g:'#ff00ff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'TRAFFIC CROSS';
  var HOW_TO_PLAY = 'TAP TO STEP FORWARD · DODGE CARS';
  var MAX_TIME = 15;             // 修正2: 40 → 15
  var NEEDED   = 1;              // 修正2: 10 → 1
  var MAX_HIT  = 3;
  var TOP    = 220;

  var LANE_Y = [snap(H * 0.44), snap(H * 0.58)];
  var LANE_DIR = [-1, 1];
  var CAR_W = 176, CAR_H = 72;
  var CAR_SPEED = [300, 260];
  var CAR_COLORS = [];
  var SIDE_Y1 = snap(H * 0.30), SIDE_Y2 = snap(H * 0.72), MID_Y = snap(H * 0.51);
  var POSITIONS = [SIDE_Y2, MID_Y, SIDE_Y1];
  var PLAYER_X = snap(W / 2);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var cars, spawnTimers, playerPos, playerY, targetY, moving, score, hits, timeLeft, done, feedback, feedbackOk, hitFlash;

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var py = -r; py <= r; py += step) for (var px = -r; px <= r; px += step) {
      if (px * px + py * py <= r * r) game.draw.rect(cx + px, cy + py, step, step, color, alpha);
    }
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var sy = 0; sy < H; sy += 8) game.draw.rect(0, sy, W, 2, '#000000', 0.18); }

  function timeBar() {
    var lit = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.b : '#001133');
  }

  function background() {
    game.draw.clear(C.bg);
    // 歩道
    game.draw.rect(0, SIDE_Y1 - 64, W, 64, C.a, 0.5);
    game.draw.rect(0, SIDE_Y2, W, 64, C.a, 0.5);
    // 道路
    game.draw.rect(0, SIDE_Y1, W, SIDE_Y2 - SIDE_Y1, '#000022');
    game.draw.rect(0, SIDE_Y1, W, 6, C.d, 0.6);
    game.draw.rect(0, SIDE_Y2 - 6, W, 6, C.d, 0.6);
    // 中央破線
    for (var x = 0; x < W; x += 96) game.draw.rect(x, MID_Y - 4, 48, 8, C.d, 0.5);
  }

  // ── スプライト（多矩形でキャラクター性） ──
  function drawCar(car) {
    game.draw.rect(car.x - CAR_W / 2, car.y - CAR_H / 2, CAR_W, CAR_H, car.color);
    game.draw.rect(car.x - CAR_W / 2, car.y - CAR_H / 2, CAR_W, 12, C.g, 0.4);   // 屋根光
    game.draw.rect(car.x - CAR_W / 2 + 24, car.y - CAR_H / 2 + 16, 48, 24, C.b, 0.7); // 窓
    game.draw.rect(car.x + CAR_W / 2 * car.dir - 16 * car.dir, car.y - 8, 16, 16, C.c); // ヘッドライト
    pc(car.x - CAR_W * 0.3, car.y + CAR_H / 2 - 4, 14, '#000000', 0.9);
    pc(car.x + CAR_W * 0.3, car.y + CAR_H / 2 - 4, 14, '#000000', 0.9);
  }

  function drawPlayer() {
    pc(PLAYER_X, playerY - 20, 24, C.f, 1);              // 頭
    game.draw.rect(PLAYER_X - 8, playerY - 24, 8, 8, C.bg);   // 目
    game.draw.rect(PLAYER_X + 4, playerY - 24, 8, 8, C.bg);
    game.draw.rect(PLAYER_X - 20, playerY + 4, 40, 40, C.b);  // 胴
    game.draw.rect(PLAYER_X - 16, playerY + 44, 12, 24, C.f); // 脚
    game.draw.rect(PLAYER_X + 4, playerY + 44, 12, 24, C.f);
  }

  function spawnCar(lane) {
    var dir = LANE_DIR[lane];
    cars.push({ x: dir > 0 ? -CAR_W : W + CAR_W, y: LANE_Y[lane], dir: dir, color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], speed: CAR_SPEED[lane] + game.random(-40, 40) });
  }

  function initGame() {
    CAR_COLORS = [C.e, C.a, C.g];
    cars = []; spawnTimers = [0.3, 0.8];
    playerPos = 0; playerY = POSITIONS[0]; targetY = POSITIONS[0]; moving = false;
    score = 0; hits = 0;
    timeLeft = MAX_TIME; done = false; feedback = 0; hitFlash = 0;
    spawnCar(0); spawnCar(1);
  }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (score * 400 + Math.ceil(timeLeft) * 30) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done || moving) return;
    if (playerPos < 2) { playerPos++; targetY = POSITIONS[playerPos]; moving = true; game.audio.play('se_tap', 0.5); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background();
      drawCar({ x: W * 0.6, y: LANE_Y[0], dir: -1, color: C.e });
      drawCar({ x: W * 0.4, y: LANE_Y[1], dir: 1, color: C.a });
      playerY = POSITIONS[0];
      drawPlayer();
      txt(GAME_TITLE, W / 2, H * 0.14, 80, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.84, 32, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 62, C.d);
        txt('TAP TO START', W / 2, H * 0.95, 48, C.c);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'MADE IT!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.f : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (moving) {
        var diff = targetY - playerY, step = 700 * dt * (diff < 0 ? -1 : 1);
        if (Math.abs(step) >= Math.abs(diff)) {
          playerY = targetY; moving = false;
          if (playerPos === 2) {
            score++; feedbackOk = true; feedback = 0.5;
            game.audio.play('se_success');
            if (score >= NEEDED) { finish(true); return; }
            playerPos = 0; targetY = POSITIONS[0]; playerY = POSITIONS[0];
          }
        } else playerY += step;
      }
      for (var li = 0; li < 2; li++) {
        spawnTimers[li] -= dt;
        if (spawnTimers[li] <= 0) { spawnTimers[li] = (li === 0 ? 1.4 : 1.6) * (0.8 + Math.random() * 0.6); spawnCar(li); }
      }
      for (var ci = 0; ci < cars.length; ci++) cars[ci].x += cars[ci].dir * cars[ci].speed * dt;
      cars = cars.filter(function(c) { return c.x > -CAR_W * 2 && c.x < W + CAR_W * 2; });
      for (var ci2 = 0; ci2 < cars.length; ci2++) {
        var car = cars[ci2];
        if (Math.abs(playerY - car.y) < 44 && Math.abs(PLAYER_X - car.x) < CAR_W / 2 + 28) {
          hits++; hitFlash = 0.5; feedbackOk = false; feedback = 0.5;
          game.audio.play('se_failure');
          playerPos = 0; playerY = POSITIONS[0]; targetY = POSITIONS[0]; moving = false; cars = [];
          if (hits >= MAX_HIT) { finish(false); return; }
          break;
        }
      }
    }
    if (feedback > 0) feedback -= dt;
    if (hitFlash > 0) hitFlash -= dt;

    // ---- 描画 ----
    background();
    for (var ci3 = 0; ci3 < cars.length; ci3++) drawCar(cars[ci3]);
    drawPlayer();
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.e, hitFlash * 0.3);
    if (!moving && playerPos < 2 && Math.floor(game.time.elapsed * 8) % 2 === 0) txt('▲ TAP', PLAYER_X, playerY - 80, 40, C.c);
    if (feedback > 0) txt(feedbackOk ? 'SAFE!' : 'HIT!', W / 2, H * 0.20, 72, feedbackOk ? C.f : C.e);

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.c);
    txt(score + ' / ' + NEEDED, W / 2, 168, 48, C.b);
    for (var hi = 0; hi < MAX_HIT; hi++) {
      var hx = snap(W / 2 + (hi - (MAX_HIT - 1) / 2) * 56);
      game.draw.rect(hx - 12, 208, 24, 24, hi < hits ? C.e : '#001133');
    }
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
