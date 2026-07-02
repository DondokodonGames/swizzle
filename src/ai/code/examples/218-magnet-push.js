// 218-magnet-push.js
// マグネットプッシュ — 同極が反発する磁力で金属球を押し、ゴールへねじ込む物理パズル
// 操作: タップで磁石を配置（N/S交互・反発と吸引で球を動かす）
// 成功: 球をゴールに入れる  失敗: 20秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード、磁力実験場） ──
  var C = { bg:'#0a0f1a', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  // ── ゲーム定数 ──
  var GAME_TITLE  = 'MAGNET PUSH';
  var HOW_TO_PLAY = 'TAP TO DROP MAGNETS · PUSH THE BALL TO GOAL';
  var MAX_TIME = 20;
  var TOP = 220, WALL = 32;
  var BALL_R = 36, FRICTION = 0.97, MAX_MAG = 3;
  var GOAL_R = 60, goalX = snap(W * 0.5), goalY = snap(TOP + 120);

  // ── ステート ──
  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  // ── ゲーム変数 ──
  var ballX, ballY, ballVX, ballVY, magnets, polarity, timeLeft, done, trail;
  var obstacles = [
    { x: snap(W * 0.18), y: snap(H * 0.42), w: snap(W * 0.28), h: 24 },
    { x: snap(W * 0.54), y: snap(H * 0.56), w: snap(W * 0.28), h: 24 },
    { x: snap(W * 0.14), y: snap(H * 0.70), w: snap(W * 0.32), h: 24 }
  ];

  // ── ピクセル描画ヘルパー ──
  function snap(v) { return Math.round(v / 8) * 8; }

  function pc(cx, cy, r, color, alpha) {
    var step = 8; cx = snap(cx); cy = snap(cy);
    for (var qy = -r; qy <= r; qy += step) for (var qx = -r; qx <= r; qx += step) {
      if (qx * qx + qy * qy <= r * r) game.draw.rect(cx + qx, cy + qy, step, step, color, alpha);
    }
  }

  function ring(cx, cy, r, color, alpha) {
    for (var a = 0; a < Math.PI * 2; a += 0.35) game.draw.rect(snap(cx + Math.cos(a) * r) - 4, snap(cy + Math.sin(a) * r) - 4, 8, 8, color, alpha);
  }

  function txt(str, x, y, sz, color, align) {
    game.draw.text(str, x + 3, y + 3, { size: sz, color: '#000000', bold: true, align: align || 'center' });
    game.draw.text(str, x, y, { size: sz, color: color, bold: true, align: align || 'center' });
  }

  function scanlines() { for (var s = 0; s < H; s += 8) game.draw.rect(0, s, W, 2, '#000000', 0.18); }

  function timeBar() {
    var t = Math.ceil(timeLeft / MAX_TIME * 12);
    for (var i = 0; i < 12; i++) game.draw.rect(40 + i * 84, 20, 72, 40, i < t ? C.b : '#101828');
  }

  function background() {
    game.draw.clear(C.bg);
    game.draw.rect(0, TOP, W, WALL, C.d, 0.6); game.draw.rect(0, H - 180 - WALL, W, WALL, C.d, 0.6);
    game.draw.rect(0, TOP, WALL, H - 180 - TOP, C.d, 0.6); game.draw.rect(W - WALL, TOP, WALL, H - 180 - TOP, C.d, 0.6);
    for (var oi = 0; oi < obstacles.length; oi++) { var o = obstacles[oi]; game.draw.rect(o.x, o.y, o.w, o.h, C.d, 0.8); game.draw.rect(o.x, o.y, o.w, 6, C.g, 0.3); }
  }

  function collide(o) {
    var bL = ballX - BALL_R, bR = ballX + BALL_R, bT = ballY - BALL_R, bB = ballY + BALL_R;
    if (bR > o.x && bL < o.x + o.w && bB > o.y && bT < o.y + o.h) {
      var ox = Math.min(bR - o.x, o.x + o.w - bL), oy = Math.min(bB - o.y, o.y + o.h - bT);
      if (ox < oy) { if (ballX < o.x + o.w / 2) { ballX -= ox; ballVX = -Math.abs(ballVX) * 0.6; } else { ballX += ox; ballVX = Math.abs(ballVX) * 0.6; } }
      else { if (ballY < o.y + o.h / 2) { ballY -= oy; ballVY = -Math.abs(ballVY) * 0.6; } else { ballY += oy; ballVY = Math.abs(ballVY) * 0.6; } }
    }
  }

  function drawGoal() { ring(goalX, goalY, GOAL_R, C.b, 0.5 + 0.3 * (Math.floor(game.time.elapsed * 4) % 2)); pc(goalX, goalY, GOAL_R * 0.5, C.b, 0.4); txt('IN', goalX, goalY + 14, 40, C.g); }

  function drawMagnet(m) {
    var col = m.pol > 0 ? C.a : C.e;
    ring(m.x, m.y, 44, col, 0.4);
    pc(m.x, m.y, 30, col, 0.9); txt(m.pol > 0 ? 'N' : 'S', m.x, m.y + 12, 34, '#000000');
  }

  function drawBall() { pc(ballX, ballY, BALL_R, C.c, 0.9); pc(ballX - 12, ballY - 12, 8, C.g, 0.6); }

  function initGame() { ballX = snap(W * 0.5); ballY = snap(H * 0.72); ballVX = 0; ballVY = 0; magnets = []; polarity = 1; timeLeft = MAX_TIME; done = false; trail = []; }

  function finish(success) {
    if (done) return;
    done = true; resultSuccess = success;
    finalScore = success ? (600 + Math.ceil(timeLeft) * 120) : Math.ceil(MAX_TIME - timeLeft) * 30;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  // ── 入力 ──
  game.onTap(function(x, y) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT) { state = S.ATTRACT; return; }
    if (done) return;
    if (Math.hypot(x - goalX, y - goalY) < GOAL_R + 30) return;
    if (magnets.length >= MAX_MAG) magnets.shift();
    magnets.push({ x: snap(x), y: snap(y), pol: polarity });
    polarity = -polarity; game.audio.play('se_tap', 0.3);
  });

  // ── 更新 & 描画 ──
  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      background(); drawGoal(); drawBall(); drawMagnet({ x: W * 0.4, y: H * 0.6, pol: 1 });
      txt(GAME_TITLE, W / 2, H * 0.12, 76, C.c);
      txt(HOW_TO_PLAY, W / 2, H * 0.18, 26, C.b);
      if (Math.floor(game.time.elapsed * 8) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.90, 60, C.a);
        txt('TAP TO START', W / 2, H * 0.95, 46, C.g);
      }
      scanlines();
      return;
    }

    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'GOAL!' : 'TIME OUT', W / 2, H * 0.35, 82, resultSuccess ? C.b : C.a);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 60, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 52, C.c);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      for (var mi = 0; mi < magnets.length; mi++) {
        var m = magnets[mi], dx = ballX - m.x, dy = ballY - m.y, dist = Math.hypot(dx, dy);
        if (dist < 8) continue;
        var force = m.pol * 120000 / (dist * dist);
        ballVX += dx / dist * force * dt; ballVY += dy / dist * force * dt;
      }
      var spd = Math.hypot(ballVX, ballVY); if (spd > 900) { ballVX = ballVX / spd * 900; ballVY = ballVY / spd * 900; }
      ballX += ballVX * dt; ballY += ballVY * dt; ballVX *= FRICTION; ballVY *= FRICTION;
      if (ballX < WALL + BALL_R) { ballX = WALL + BALL_R; ballVX = Math.abs(ballVX) * 0.6; }
      if (ballX > W - WALL - BALL_R) { ballX = W - WALL - BALL_R; ballVX = -Math.abs(ballVX) * 0.6; }
      if (ballY < TOP + WALL + BALL_R) { ballY = TOP + WALL + BALL_R; ballVY = Math.abs(ballVY) * 0.6; }
      if (ballY > H - 180 - WALL - BALL_R) { ballY = H - 180 - WALL - BALL_R; ballVY = -Math.abs(ballVY) * 0.6; }
      for (var oi = 0; oi < obstacles.length; oi++) collide(obstacles[oi]);
      if (Math.hypot(ballX - goalX, ballY - goalY) < GOAL_R) { finish(true); return; }
      trail.push({ x: ballX, y: ballY, life: 0.3 });
      for (var ti = trail.length - 1; ti >= 0; ti--) { trail[ti].life -= dt; if (trail[ti].life <= 0) trail.splice(ti, 1); }
    }

    // ---- 描画 ----
    background(); drawGoal();
    for (var t2 = 0; t2 < trail.length; t2++) game.draw.rect(snap(trail[t2].x) - 6, snap(trail[t2].y) - 6, 12, 12, C.c, trail[t2].life * 0.5);
    for (var mi2 = 0; mi2 < magnets.length; mi2++) drawMagnet(magnets[mi2]);
    drawBall();

    timeBar();
    txt(Math.ceil(timeLeft) + '', W / 2, 96, 44, C.g);
    txt('NEXT ' + (polarity > 0 ? 'N' : 'S') + '  (MAX ' + MAX_MAG + ')', W / 2, H - 100, 40, polarity > 0 ? C.a : C.e);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    state = S.ATTRACT;
    initGame();
  });
})(game);
