// 101-magnet-maze.js
// 磁石迷路 — タップした位置に磁力を出し、ボールを引き寄せてゴールへ導く
// 操作: タップで磁力を発生させてボールを誘導
// 成功: ゴールに到達  失敗: 壁に激突 or 25秒

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'MAGNET MAZE';
  var HOW_TO_PLAY = 'TAP TO PULL THE BALL TO GOAL';
  var MAX_TIME = 25;
  var BALL_R = 24, WALL_W = 24, MAGNET_FORCE = 1200, MAGNET_R = 220, FRICTION = 0.88;
  var PLAY_X = 100, PLAY_Y = H * 0.22, PLAY_W = W - 200, PLAY_H = H * 0.56;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var walls, ballX, ballY, ballVX, ballVY, goalX, goalY, magnetX, magnetY, magnetT, trail, timeLeft, done, deathFlash;

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

  function addWall(x1, y1, x2, y2) { walls.push({ x1: PLAY_X + x1 * PLAY_W, y1: PLAY_Y + y1 * PLAY_H, x2: PLAY_X + x2 * PLAY_W, y2: PLAY_Y + y2 * PLAY_H }); }
  function segHit(x1, y1, x2, y2, cx, cy, r) {
    var dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / len2));
    var nx = x1 + t * dx, ny = y1 + t * dy, dX = cx - nx, dY = cy - ny, d2 = dX * dX + dY * dY;
    if (d2 < r * r) { var d = Math.sqrt(d2) || 0.001; return { hit: true, nx: dX / d, ny: dY / d, pen: r - d }; }
    return { hit: false };
  }

  function initGame() {
    walls = [];
    addWall(0, 0, 1, 0); addWall(1, 0, 1, 1); addWall(0, 1, 1, 1); addWall(0, 0, 0, 1);   // 外周
    addWall(0.35, 0, 0.35, 0.55);                                                          // 修正2: 内壁を簡素化
    addWall(0.65, 0.45, 0.65, 1.0);
    ballX = PLAY_X + PLAY_W * 0.1; ballY = PLAY_Y + PLAY_H * 0.1; ballVX = 0; ballVY = 0;
    goalX = PLAY_X + PLAY_W * 0.88; goalY = PLAY_Y + PLAY_H * 0.88;
    magnetX = -1; magnetY = -1; magnetT = 0; trail = []; timeLeft = MAX_TIME; done = false; deathFlash = 0;
  }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (400 + Math.ceil(timeLeft) * 40) : 0;
    game.audio.play(success ? 'se_success' : 'se_failure');
    state = S.RESULT;
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    magnetX = tx; magnetY = ty; magnetT = 0.4; game.audio.play('se_tap', 0.4);
  });

  // 世界観: 磁力ラボ。タップで磁極を作りボールを引き寄せて迷路のゴールへ運ぶ。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(snap(PLAY_X), snap(PLAY_Y), PLAY_W, PLAY_H, '#12002a');
    if (deathFlash > 0) game.draw.rect(0, 0, W, H, C.e, deathFlash * 0.4);
    txt('MAGNET LAB', W / 2, 250, 34, C.b);
  }

  function drawScene() {
    for (var tri = 0; tri < trail.length; tri++) { var t = trail[tri]; drawPixelCircle(t.x, t.y, BALL_R * (1 - t.age * 2), C.f, (1 - t.age * 2) * 0.4); }
    for (var wi = 0; wi < walls.length; wi++) { var w = walls[wi]; game.draw.line(w.x1, w.y1, w.x2, w.y2, C.d, WALL_W); game.draw.line(w.x1, w.y1, w.x2, w.y2, C.e, 3); }
    var lit = Math.floor(game.time.elapsed * 4) % 2 === 0;
    drawPixelCircle(goalX, goalY, 48, C.b, lit ? 0.9 : 0.6); txt('*', goalX, goalY, 44, C.g);
    if (magnetT > 0 && magnetX >= 0) { drawPixelCircle(magnetX, magnetY, 32, C.d, 0.5 + 0.5 * (Math.floor(game.time.elapsed * 10) % 2)); txt('N', magnetX, magnetY, 32, C.g); }
    drawPixelCircle(ballX, ballY, BALL_R, C.f, 1); game.draw.rect(snap(ballX) - 12, snap(ballY) - 12, 8, 8, C.g, 0.7);
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (!walls) initGame();
      background();
      drawScene();
      txt(GAME_TITLE,  W / 2, H * 0.14, 76, C.d);
      txt(HOW_TO_PLAY, W / 2, H * 0.195, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.86, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.91, 46, C.g);
      }
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'CONGRATULATIONS!' : 'GAME OVER', W / 2, H * 0.35, 80, resultSuccess ? C.b : C.e);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.5, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.65, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      if (magnetT > 0) { magnetT -= dt;
        var dx = magnetX - ballX, dy = magnetY - ballY, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0 && dist < MAGNET_R) { var force = MAGNET_FORCE * (1 - dist / MAGNET_R); ballVX += (dx / dist) * force * dt; ballVY += (dy / dist) * force * dt; }
      }
      ballVX *= FRICTION; ballVY *= FRICTION; ballX += ballVX * dt; ballY += ballVY * dt;
      for (var i = 0; i < walls.length; i++) {
        var w = walls[i], col = segHit(w.x1, w.y1, w.x2, w.y2, ballX, ballY, BALL_R + WALL_W / 2);
        if (col.hit) {
          ballX += col.nx * col.pen; ballY += col.ny * col.pen;
          var dot = ballVX * col.nx + ballVY * col.ny;
          if (dot < 0) { ballVX -= 2 * dot * col.nx; ballVY -= 2 * dot * col.ny; ballVX *= 0.5; ballVY *= 0.5; if (Math.abs(dot) > 280) { deathFlash = 0.5; finish(false); return; } }
        }
      }
      trail.push({ x: ballX, y: ballY, age: 0 });
      for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
      trail = trail.filter(function(t) { return t.age < 0.5; });
      if (Math.sqrt((ballX - goalX) * (ballX - goalX) + (ballY - goalY) * (ballY - goalY)) < BALL_R + 44) { finish(true); return; }
      if (deathFlash > 0) deathFlash -= dt;
    }

    // ---- draw ----
    background();
    drawScene();
    timeBar();
    txt('GUIDE TO GOAL', W / 2, 96, 44, C.c);
    txt('TAP TO MAGNETIZE!', W / 2, H - 90, 42, C.d);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    state = S.ATTRACT;
    initGame();
  });
})(game);
