// 237-slope-rush.js
// スロープラッシュ — 急斜面を転がり落ちるボールを左右レーンに寄せ、障害物を避けてゴールへ
// 操作: 左右スワイプでレーン移動
// 成功: 20m到達  失敗: 障害物に激突 or 15秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、ダウンヒル） ──
  var C = { bg:'#080c14', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'SLOPE RUSH';
  var HOW_TO_PLAY = 'SWIPE LEFT / RIGHT TO DODGE';
  var MAX_TIME = 15;
  var NEEDED   = 20;          // 修正2: 50 → 20
  var TOP = 220, BALL_R = 32, LANE_W = W / 3, SCROLL = 340, BALL_PY = snap(H * 0.32);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ballLane, ballX, obstacles, obstacleDist, distance, scrolled, timeLeft, done, trail;

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
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#1a2030');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, TOP, W, H - TOP, C.d, 0.15);
    game.draw.rect(LANE_W - 2, TOP, 4, H - TOP, C.d, 0.5); game.draw.rect(LANE_W * 2 - 2, TOP, 4, H - TOP, C.d, 0.5);
    var off = scrolled % 120;
    for (var dc = 0; dc < 3; dc++) for (var dr = -1; dr < (H - TOP) / 120 + 1; dr++) game.draw.rect(snap(LANE_W * dc + LANE_W / 2) - 4, snap(TOP + dr * 120 + off), 8, 60, C.d, 0.3);
    game.draw.rect(0, TOP, 16, H - TOP, C.a, 0.5); game.draw.rect(W - 16, TOP, 16, H - TOP, C.a, 0.5);
  }

  function drawObstacle(o) { game.draw.rect(snap(o.x) - o.r, snap(o.y) - o.r, o.r * 2, o.r * 2, C.a, 0.9); game.draw.rect(snap(o.x) - o.r, snap(o.y) - o.r, o.r * 2, 8, C.g, 0.4); }

  function drawBall() { pc(ballX, BALL_PY, BALL_R, C.b, 0.95); game.draw.rect(snap(ballX) - 12, snap(BALL_PY) - 12, 10, 10, C.g, 0.5); }

  function initGame() { ballLane = 1; ballX = W / 2; obstacles = []; obstacleDist = 200; distance = 0; scrolled = 0; timeLeft = MAX_TIME; done = false; trail = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 120) : Math.floor(distance) * 40;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function() {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
  });

  game.onSwipe(function(dir) {
    if (state !== S.PLAYING || done) return;
    if (dir === 'left' && ballLane > 0) { ballLane--; game.audio.play('se_tap', 0.3); }
    else if (dir === 'right' && ballLane < 2) { ballLane++; game.audio.play('se_tap', 0.3); }
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!obstacles) initGame(); background(); drawObstacle({ x: LANE_W * 2 + LANE_W / 2, y: H * 0.55, r: 34 }); drawBall();
      txt(GAME_TITLE, W / 2, H * 0.14, 82, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.20, 28, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 62, C.a);
        txt('TAP TO START', W / 2, H * 0.92, 48, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.97, 40, '#556677');
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FINISH!' : 'CRASHED', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      var scroll = SCROLL * dt; scrolled += scroll; distance += scroll / 50;
      ballX += (LANE_W * ballLane + LANE_W / 2 - ballX) * dt * 8;
      for (var oi = obstacles.length - 1; oi >= 0; oi--) {
        obstacles[oi].y += scroll;
        if (obstacles[oi].y > H + 80) { obstacles.splice(oi, 1); continue; }
        if (Math.abs(obstacles[oi].y - BALL_PY) < BALL_R + 30 && Math.abs(obstacles[oi].x - ballX) < BALL_R + 34) { finish(false); return; }
      }
      obstacleDist -= scroll; if (obstacleDist <= 0) { var lane = Math.floor(Math.random() * 3); obstacles.push({ x: LANE_W * lane + LANE_W / 2, y: TOP - 40, r: 34 }); obstacleDist = 200 + Math.random() * 160; }
      if (distance >= NEEDED) { finish(true); return; }
    }

    // ---- 描画 ----
    background();
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) drawObstacle(obstacles[oi2]);
    drawBall();

    game.draw.rect(0, H - 60, W * Math.min(1, distance / NEEDED), 14, C.c, 0.8);
    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt(Math.floor(distance) + ' / ' + NEEDED + 'm', W / 2, 168, 48, C.b);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    state = S.ATTRACT;
    initGame();
  });
})(game);
