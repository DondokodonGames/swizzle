// 022-drift-lane.js
// ドリフトレーン — ドリフトしながらカーブを抜けるコントロールの快感
// 操作: スワイプ左右で車線変更しながら障害物を避ける
// 成功: 5秒完走  失敗: 障害物に衝突

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'DRIFT LANE';
  var HOW_TO_PLAY = 'SWIPE TO CHANGE LANES';
  var MAX_TIME = 5;          // 修正2: 生存系 20s → 5s
  var LANES = 3, LANE_W = W / LANES;
  var CAR_Y = H * 0.78, CAR_W = 180, CAR_H = 260;   // 修正1: 車は下3分の1
  var SCROLL_SPEED = 720;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var carLane, carX, targetX, obstacles, spawnTimer, timeLeft, done, scrollY;

  function snap(v) { return Math.round(v / 8) * 8; }
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
    carLane = 1; carX = LANE_W * carLane + LANE_W / 2; targetX = carX;
    obstacles = []; spawnTimer = 1.0; timeLeft = MAX_TIME; done = false; scrollY = 0;
    spawnObstacle();
  }

  function spawnObstacle() {
    var lane = Math.floor(Math.random() * 3);
    obstacles.push({ lane: lane, y: -CAR_H * 2, w: CAR_W, h: CAR_H * 1.3 });
    if (Math.random() > 0.6) {
      var other = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
      obstacles.push({ lane: other, y: -CAR_H * 2 - 60, w: CAR_W, h: CAR_H * 1.3 });
    }
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (500 + Math.ceil(timeLeft) * 40) : 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1500);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left' && carLane > 0) carLane--;
    else if (dir === 'right' && carLane < 2) carLane++;
    targetX = LANE_W * carLane + LANE_W / 2;
    game.audio.play('se_tap', 0.4);
  });

  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, 0, W, H, '#0a0018');
    for (var l = 1; l < LANES; l++) {
      var lx = LANE_W * l;
      for (var d = 0; d < 14; d++) {
        var dy = snap((d * 200 - scrollY) % H); if (dy < 0) dy += H;
        game.draw.rect(snap(lx) - 4, dy, 8, 120, C.d, 0.7);
      }
    }
    game.draw.rect(0, 0, 8, H, C.f, 0.6);
    game.draw.rect(W - 8, 0, 8, H, C.f, 0.6);
  }

  // ── ドット絵スプライト: 障害物（縞模様バリケード）──
  function drawObstacles() {
    for (var k = 0; k < obstacles.length; k++) {
      var ob = obstacles[k], bx = snap(LANE_W * ob.lane + (LANE_W - ob.w) / 2), by = snap(ob.y);
      game.draw.rect(bx, by, ob.w, ob.h, C.a);                 // 本体
      game.draw.rect(bx, by, ob.w, 16, C.g);                  // 上枠
      game.draw.rect(bx, by + ob.h - 16, ob.w, 16, C.g);      // 下枠
      for (var s = 0; s < ob.w; s += 48)                       // 警告縞
        game.draw.rect(bx + s, by + ob.h * 0.4, 24, 24, C.c, 0.7);
    }
  }

  // ── ドット絵スプライト: 自車（ボディ＋窓＋ライト＋タイヤ）──
  function drawCar() {
    var bx = snap(carX - CAR_W / 2), by = snap(CAR_Y), on = Math.floor(game.time.elapsed * 10) % 2 === 0;
    game.draw.rect(bx - 12, by + 24, 16, 48, '#000000');         // 左タイヤ
    game.draw.rect(bx + CAR_W - 4, by + 24, 16, 48, '#000000');  // 右タイヤ
    game.draw.rect(bx - 12, by + CAR_H - 72, 16, 48, '#000000'); // 左後輪
    game.draw.rect(bx + CAR_W - 4, by + CAR_H - 72, 16, 48, '#000000'); // 右後輪
    game.draw.rect(bx, by, CAR_W, CAR_H, C.f);                   // ボディ
    game.draw.rect(bx + 16, by + 12, CAR_W - 32, 28, on ? C.c : C.d); // ヘッドライト
    game.draw.rect(bx + 24, by + 56, CAR_W - 48, 80, C.e, 0.85); // フロントガラス
    game.draw.rect(bx + 24, by + CAR_H - 48, CAR_W - 48, 24, C.a); // リアスポイラー
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame();
      background();
      carX = LANE_W * (1 + Math.round(Math.sin(game.time.elapsed))) + LANE_W / 2;
      drawCar();
      txt(GAME_TITLE,  W / 2, H * 0.2, 84, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.28, 42, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.5, 72, C.a);
        txt('TAP TO START', W / 2, H * 0.58, 52, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.66, 42, '#888888');
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
      if (timeLeft <= 0) { finish(true); return; }
      carX += (targetX - carX) * 8 * dt;
      var speed = SCROLL_SPEED + (MAX_TIME - timeLeft) * 40;
      scrollY = (scrollY + speed * dt) % H;
      spawnTimer -= dt;
      if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = Math.max(0.6, 1.2 - (MAX_TIME - timeLeft) * 0.06); }
      for (var i = obstacles.length - 1; i >= 0; i--) {
        var ob = obstacles[i]; ob.y += speed * dt;
        var obX = LANE_W * ob.lane + (LANE_W - ob.w) / 2;
        if (ob.y + ob.h > CAR_Y && ob.y < CAR_Y + CAR_H &&
            Math.abs(carX - (obX + ob.w / 2)) < (CAR_W / 2 + ob.w / 2) * 0.7) { finish(false); return; }
        if (ob.y > H + 100) obstacles.splice(i, 1);
      }
    }

    // ---- draw ----
    background();
    drawObstacles();
    drawCar();
    timeBar();
    txt('SURVIVE ' + Math.ceil(timeLeft) + 's', W / 2, 96, 48, C.g);
    txt('SWIPE TO DODGE!', W / 2, H - 120, 48, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
