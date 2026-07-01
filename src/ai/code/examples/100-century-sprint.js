// 100-century-sprint.js
// 100メートル走 — 左右交互タップのリズムで加速しゴールテープを切る爽快感
// 操作: 左右交互に素早くタップしてランナーを加速
// 成功: 時間内にゴール  失敗: 15秒オーバー

(function(game) {
  var W = game.canvas.width;   // 1080
  var H = game.canvas.height;  // 1920

  // ── パレット（ネオンアーケード） ──
  var C = { bg:'#1a0028', a:'#ff2079', b:'#00ff9f', c:'#ffe600', d:'#7700ff', e:'#00cfff', f:'#ff6600', g:'#ffffff' };

  var GAME_TITLE  = 'CENTURY SPRINT';
  var HOW_TO_PLAY = 'TAP L/R ALTERNATELY TO RUN';
  var MAX_TIME = 15;
  var GOAL_DIST = 320;      // 修正2: 1000 → 320（易化）
  var TRACK_Y = H * 0.52, RUNNER_Y = TRACK_Y - 100, MAX_SPEED = 400, ACCEL = 110, DECAY = 55;

  var S = { ATTRACT: 0, PLAYING: 1, RESULT: 2 };
  var state = S.ATTRACT;
  var resultSuccess = false, finalScore = 0;

  var runnerPos, speed, lastSide, tapCount, timeLeft, done, finished, finishTime, cameraX, steps;

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

  function initGame() { runnerPos = 0; speed = 0; lastSide = 0; tapCount = 0; timeLeft = MAX_TIME; done = false; finished = false; finishTime = 0; cameraX = 0; steps = []; }

  function finish(success) {
    if (done) return;
    done = true;
    resultSuccess = success;
    finalScore = success ? (Math.max(0, Math.floor((MAX_TIME - finishTime) * 60)) + 300) : Math.floor(runnerPos);
    game.audio.play(success ? 'se_success' : 'se_failure');
    setTimeout(function() { state = S.RESULT; }, success ? 600 : 0);
    setTimeout(function() { if (success) game.end.success(finalScore); else game.end.failure(); }, 1800);
  }

  game.onTap(function(tx, ty) {
    if (state === S.ATTRACT) { game.audio.play('se_tap', 1.0); state = S.PLAYING; initGame(); return; }
    if (state === S.RESULT)  { state = S.ATTRACT; return; }
    if (done) return;
    var side = tx < W / 2 ? -1 : 1;
    if (side === lastSide) { speed = Math.max(0, speed - 60); return; }
    lastSide = side; speed = Math.min(MAX_SPEED, speed + ACCEL); tapCount++; game.audio.play('se_tap', 0.5);
    steps.push({ x: runnerPos - cameraX + W * 0.25, y: RUNNER_Y + 90, vx: -20 + Math.random() * 40, vy: -80 + Math.random() * 40, life: 0.3, side: side });
  });

  // 世界観: ナイター競技場。左右交互タップでランナーを加速しゴールを切る。
  function background() {
    game.draw.clear('#0a0018');
    game.draw.rect(0, snap(TRACK_Y) - 24, W, 220, '#221040');
    game.draw.rect(0, snap(TRACK_Y) - 24, W, 6, C.d);
    game.draw.rect(0, snap(TRACK_Y) + 190, W, 6, C.d);
    for (var lx = -60; lx < W; lx += 80) { var bx = snap(lx + (cameraX % 80)); game.draw.rect(bx, snap(TRACK_Y) + 40, 40, 6, C.d, 0.3); }
    txt('NIGHT STADIUM', W / 2, 250, 34, C.b);
  }

  function drawRunner() {
    var rx = runnerPos - cameraX + W * 0.25, la = Math.sin(tapCount * 0.9) * 24;
    game.draw.rect(snap(rx) - 24, snap(RUNNER_Y) - 40, 48, 80, C.f);         // 胴
    drawPixelCircle(rx, RUNNER_Y - 64, 28, C.c, 1);                          // 頭
    game.draw.rect(snap(rx) - 8, snap(RUNNER_Y - 64) - 8, 8, 8, '#000000');
    game.draw.line(rx, RUNNER_Y + 40, rx - 20 + la, RUNNER_Y + 100, C.f, 14); // 脚
    game.draw.line(rx, RUNNER_Y + 40, rx + 20 - la, RUNNER_Y + 100, C.f, 14);
    game.draw.line(rx, RUNNER_Y - 20, rx - 36 - la * 0.5, RUNNER_Y + 20, C.a, 12); // 腕
    game.draw.line(rx, RUNNER_Y - 20, rx + 36 + la * 0.5, RUNNER_Y + 20, C.a, 12);
    for (var pi = 0; pi < steps.length; pi++) { var p = steps[pi]; game.draw.rect(snap(p.x) - 6, snap(p.y) - 6, 12, 12, C.c, p.life * 3); }
    // ゴールテープ
    var gx = GOAL_DIST - cameraX + W * 0.25;
    if (gx > -50 && gx < W + 50) { game.draw.rect(snap(gx) - 4, snap(TRACK_Y) - 44, 8, 240, C.c); txt('GOAL', gx, TRACK_Y - 70, 44, C.c); }
  }

  game.onUpdate(function(dt) {
    if (state === S.ATTRACT) {
      if (runnerPos === undefined) initGame();
      background();
      drawRunner();
      txt(GAME_TITLE,  W / 2, H * 0.16, 76, C.f);
      txt(HOW_TO_PLAY, W / 2, H * 0.22, 30, C.b);
      if (Math.floor(game.time.elapsed * 1.67) % 2 === 0) {
        txt('► 100円 投入 ◄', W / 2, H * 0.8, 64, C.a);
        txt('TAP TO START', W / 2, H * 0.85, 46, C.g);
      }
      txt('INSERT COIN', W / 2, H * 0.9, 40, '#888888');
      scanlines();
      return;
    }
    if (state === S.RESULT) {
      background();
      txt(resultSuccess ? 'FINISH!' : 'TIME UP', W / 2, H * 0.35, 84, resultSuccess ? C.c : C.a);
      if (resultSuccess) txt(finishTime.toFixed(2) + 's', W / 2, H * 0.44, 60, C.f);
      txt('SCORE  ' + String(finalScore).padStart(6, '0'), W / 2, H * 0.52, 64, C.g);
      if (Math.floor(game.time.elapsed * 2) % 2 === 0) txt('TAP TO CONTINUE', W / 2, H * 0.66, 54, C.b);
      scanlines();
      return;
    }

    // PLAYING
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { finish(false); return; }
      speed = Math.max(0, speed - DECAY * dt); runnerPos += speed * dt; cameraX = Math.max(0, runnerPos - W * 0.0);
      if (runnerPos >= GOAL_DIST) { finished = true; finishTime = MAX_TIME - timeLeft; finish(true); return; }
      for (var i = 0; i < steps.length; i++) { var p = steps[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt; }
      steps = steps.filter(function(p) { return p.life > 0; });
    }

    // ---- draw ----
    background();
    drawRunner();
    timeBar();
    var sf = speed / MAX_SPEED, bw = 500;
    game.draw.rect(snap(W / 2 - bw / 2), snap(H * 0.72), bw, 24, '#221040');
    game.draw.rect(snap(W / 2 - bw / 2), snap(H * 0.72), snap(bw * sf), 24, sf > 0.7 ? C.b : C.f);
    txt('SPEED ' + Math.round(speed), W / 2, 96, 44, C.c);
    txt('TAP L / R FAST!', W / 2, H - 90, 44, C.f);
    scanlines();
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
    state = S.ATTRACT;
    initGame();
  });
})(game);
