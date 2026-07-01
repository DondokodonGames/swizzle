// 078-neon-snake.js
// ネオンスネーク — 自分の尾を避けながら光る餌を集めるネオン蛇
// 操作: スワイプで方向転換
// 成功: 2個の餌を食べる  失敗: 壁か自分の尾に当たる or 30秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（グリーンCRT） ──
  var C = { bg:'#001100', a:'#00ff41', b:'#66ff66', c:'#ccffcc', d:'#009922', e:'#ffcc00', f:'#ff3300', g:'#ffffff' };

  var GAME_TITLE  = 'NEON SNAKE';
  var HOW_TO_PLAY = 'SWIPE TO TURN, EAT THE ORBS';
  var MAX_TIME = 30;
  var NEEDED = 2;            // 修正2: 12 → 2
  var COLS = 14, ROWS = 18, CELL = 60;
  var GRID_X = (W - COLS * CELL) / 2;
  var GRID_Y = H * 0.2;                                // 修正1: 盤は上寄せ、下部にUI

  var DIR_VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var snake, direction, nextDirection, food, score, timeLeft, done, moveTimer, deathFlash;
  var MOVE_INTERVAL = 0.2;

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
    for (var i = 0; i < blocks; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < lit ? C.a : '#003b00');
  }

  function randomFood() {
    var occupied = {}; for (var i = 0; i < snake.length; i++) occupied[snake[i].c + ',' + snake[i].r] = true;
    var cand = []; for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (!occupied[c + ',' + r]) cand.push({ c: c, r: r });
    return cand.length ? cand[Math.floor(Math.random() * cand.length)] : null;
  }
  function initGame() {
    snake = [{ c: 4, r: Math.floor(ROWS / 2) }, { c: 3, r: Math.floor(ROWS / 2) }, { c: 2, r: Math.floor(ROWS / 2) }];
    direction = 'right'; nextDirection = 'right'; food = randomFood(); score = 0; timeLeft = MAX_TIME; done = false; moveTimer = MOVE_INTERVAL; deathFlash = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (300 + Math.ceil(timeLeft) * 40) : score * 100;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir !== OPPOSITE[direction]) nextDirection = dir;
  });
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
  });

  // 世界観: ネオングリッドの回廊。光る蛇を操りエネルギーオーブを回収する。
  function background() {
    game.draw.clear('#001100');
    if (deathFlash > 0) game.draw.rect(0, 0, W, H, C.f, deathFlash * 0.4);
    game.draw.rect(snap(GRID_X) - 12, snap(GRID_Y) - 12, COLS * CELL + 24, ROWS * CELL + 24, C.d);
    game.draw.rect(snap(GRID_X), snap(GRID_Y), COLS * CELL, ROWS * CELL, '#000800');
    for (var c = 1; c < COLS; c++) game.draw.rect(snap(GRID_X + c * CELL), snap(GRID_Y), 2, ROWS * CELL, C.d, 0.3);
    for (var r = 1; r < ROWS; r++) game.draw.rect(snap(GRID_X), snap(GRID_Y + r * CELL), COLS * CELL, 2, C.d, 0.3);
    txt('GRID CORRIDOR', W / 2, 260, 34, C.b);
  }

  function drawScene() {
    for (var j = snake.length - 1; j >= 0; j--) {
      var seg = snake[j], gx = GRID_X + seg.c * CELL, gy = GRID_Y + seg.r * CELL, ratio = 1 - j / snake.length;
      game.draw.rect(snap(gx) + 4, snap(gy) + 4, CELL - 8, CELL - 8, j === 0 ? C.b : C.a, 0.4 + ratio * 0.6);
      if (j === 0) { game.draw.rect(snap(gx) + 14, snap(gy) + 14, 12, 12, '#000800'); game.draw.rect(snap(gx) + CELL - 26, snap(gy) + 14, 12, 12, '#000800'); }
    }
    if (food) {
      var fx = GRID_X + food.c * CELL + CELL / 2, fy = GRID_Y + food.r * CELL + CELL / 2;
      drawPixelCircle(fx, fy, 22, C.e, 0.9);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) drawPixelCircle(fx, fy, 28, C.e, 0.25);
    }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!snake) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.1, 84, C.a);
      txt(HOW_TO_PLAY, W / 2, H * 0.155, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.84, 68, C.e);
        txt('TAP TO START', W / 2, H * 0.89, 50, C.c);
      }
      txt('INSERT COIN', W / 2, H * 0.94, 40, '#448844');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.a : C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.c);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      moveTimer -= dt;
      if (moveTimer <= 0) {
        moveTimer = MOVE_INTERVAL;
        direction = nextDirection;
        var dv = DIR_VEC[direction], head = snake[0], nh = { c: head.c + dv[0], r: head.r + dv[1] };
        if (nh.c < 0 || nh.c >= COLS || nh.r < 0 || nh.r >= ROWS) { deathFlash = 0.5; finish(false); return; }
        for (var i = 0; i < snake.length - 1; i++) if (snake[i].c === nh.c && snake[i].r === nh.r) { deathFlash = 0.5; finish(false); return; }
        snake.unshift(nh);
        if (food && nh.c === food.c && nh.r === food.r) {
          score++; game.audio.play('se_tap', 0.8); food = randomFood();
          if (score >= NEEDED) { finish(true); return; }
        } else snake.pop();
      }
      if (deathFlash > 0) deathFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('ORBS ' + score + ' / ' + NEEDED, W / 2, 96, 48, C.b);
    txt('SWIPE TO TURN!', W / 2, H - 90, 44, C.a);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    state = S.ATTRACT;
    initGame();
  });
})(game);
