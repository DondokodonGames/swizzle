// 209-gravity-switch.js
// 重力スイッチ — 重力の向きを4方向に切り替え、棘を避けてコアをゴールへ導く実験室パズル
// 操作: スワイプで重力方向を変える
// 成功: ゴールに到達  失敗: 棘に当たる or 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、重力実験室） ──
  var C = { bg:'#060408', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'GRAVITY SWITCH';
  var HOW_TO_PLAY = 'SWIPE TO SET GRAVITY · REACH THE GOAL';
  var MAX_TIME = 20;
  var COLS = 9, ROWS = 14, CELL = 112;
  var GX = snap((W - COLS * CELL) / 2), GY = snap(260);
  var GRAVITY = 1200;

  // 0=空 1=壁 2=棘 3=ゴール 4=スタート（易化レベル）
  var level = [
    [1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,2,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,1],
    [1,0,0,0,0,2,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,1],
    [1,4,0,0,0,0,3,0,1],
    [1,1,1,1,1,1,1,1,1]
  ];

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var BALL_R = 40, ballX, ballY, ballVX, ballVY, gravDir, timeLeft, done, trail;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a1030');
  }

  function initBall() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) if (level[r][c] === 4) { ballX = GX + c * CELL + CELL / 2; ballY = GY + r * CELL + CELL / 2; ballVX = 0; ballVY = 0; return; }
  }

  function cellAt(wx, wy) {
    var c = Math.floor((wx - GX) / CELL), r = Math.floor((wy - GY) / CELL);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return 1;
    return level[r][c];
  }

  function initGame() { gravDir = { x: 0, y: 1 }; timeLeft = MAX_TIME; done = false; trail = []; initBall(); }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 100) : Math.ceil(MAX_TIME - timeLeft) * 30;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  function drawLevel() {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
      var cx = GX + c * CELL, cy = GY + r * CELL, cell = level[r][c];
      if (cell === 1) { game.draw.rect(cx, cy, CELL, CELL, C.d, 0.7); game.draw.rect(cx, cy, CELL, 8, C.g, 0.2); }
      else if (cell === 2) { pc(cx + CELL / 2, cy + CELL / 2, CELL * 0.32, C.a, 0.85); game.draw.rect(cx + CELL / 2 - 4, cy + CELL / 2 - 4, 8, 8, C.g, 0.7); }
      else if (cell === 3) { var gp = Math.floor(game.time.elapsed * 6) % 2; pc(cx + CELL / 2, cy + CELL / 2, CELL * 0.36, C.b, gp ? 0.9 : 0.6); txt('OUT', cx + CELL / 2, cy + CELL / 2 + 12, 34, '#000000'); }
    }
  }

  function drawBall() { pc(ballX, ballY, BALL_R, C.c, 0.92); pc(ballX - 12, ballY - 12, 8, C.g, 0.7); }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'up') gravDir = { x: 0, y: -1 };
    else if (dir === 'down') gravDir = { x: 0, y: 1 };
    else if (dir === 'left') gravDir = { x: -1, y: 0 };
    else if (dir === 'right') gravDir = { x: 1, y: 0 };
    game.audio.play('se_tap', 0.4);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      game.draw.clear(C.bg); drawLevel(); drawBall();
      txt(GAME_TITLE, W / 2, H * 0.12, 70, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.18, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      game.draw.clear(C.bg);
      txt(resultSuccess ? 'ESCAPED!' : 'CRASHED', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      ballVX += gravDir.x * GRAVITY * dt; ballVY += gravDir.y * GRAVITY * dt;
      var steps = 4;
      for (var s = 0; s < steps; s++) {
        ballX += ballVX * dt / steps; ballY += ballVY * dt / steps;
        var left = cellAt(ballX - BALL_R, ballY), right = cellAt(ballX + BALL_R, ballY), top = cellAt(ballX, ballY - BALL_R), bottom = cellAt(ballX, ballY + BALL_R);
        if (left === 1) { ballVX = Math.abs(ballVX) * 0.4; ballX = Math.floor((ballX - GX) / CELL) * CELL + GX + BALL_R + CELL; }
        if (right === 1) { ballVX = -Math.abs(ballVX) * 0.4; ballX = Math.floor((ballX + BALL_R - GX) / CELL) * CELL + GX - BALL_R; }
        if (top === 1) { ballVY = Math.abs(ballVY) * 0.4; ballY = Math.floor((ballY - GY) / CELL) * CELL + GY + BALL_R + CELL; }
        if (bottom === 1) { ballVY = -Math.abs(ballVY) * 0.4; ballY = Math.floor((ballY + BALL_R - GY) / CELL) * CELL + GY - BALL_R; }
        if (left === 2 || right === 2 || top === 2 || bottom === 2 || cellAt(ballX, ballY) === 2) { finish(false); return; }
        if (left === 3 || right === 3 || top === 3 || bottom === 3 || cellAt(ballX, ballY) === 3) { finish(true); return; }
      }
      var spd = Math.hypot(ballVX, ballVY); if (spd > 800) { ballVX = ballVX / spd * 800; ballVY = ballVY / spd * 800; }
      trail.push({ x: ballX, y: ballY, life: 0.4 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
    }

    // ---- 描画 ----
    game.draw.clear(C.bg); drawLevel();
    for (var t2 = 0; t2 < trail.length; t2++) game.draw.rect(snap(trail[t2].x) - 6, snap(trail[t2].y) - 6, 12, 12, C.f, trail[t2].life * 0.5);
    drawBall();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('GRAVITY ' + (gravDir.y === 1 ? 'DOWN' : gravDir.y === -1 ? 'UP' : gravDir.x === 1 ? 'RIGHT' : 'LEFT'), W / 2, 168, 40, C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
