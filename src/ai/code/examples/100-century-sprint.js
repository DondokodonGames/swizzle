// 100-century-sprint.js
// 100メートル走 — 交互タップのリズムで加速し、ゴールテープを切る瞬間の爽快感
// 操作: 左右交互に素早くタップしてランナーを加速させる
// 成功: 10秒以内にゴール  失敗: 15秒オーバー

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    track:   '#0f172a',
    trackHi: '#1e293b',
    lane:    '#1e3a5f',
    runner:  '#f97316',
    runnerHi:'#fed7aa',
    goal:    '#fbbf24',
    goalHi:  '#fef3c7',
    correct: '#22c55e',
    ui:      '#334155'
  };

  var TRACK_Y = H * 0.5;
  var RUNNER_Y = TRACK_Y - 80;
  var GOAL_DIST = 1000; // virtual pixels to goal

  var runnerPos = 0; // 0 to GOAL_DIST
  var speed = 0;
  var MAX_SPEED = 400;
  var ACCEL = 100;
  var DECAY = 60;

  var lastSide = 0; // -1=left, 1=right
  var altOk = false; // true if next tap must be different side

  var tapCount = 0;
  var timeLeft = 15;
  var done = false;
  var finished = false;
  var finishTime = 0;

  var cameraX = 0;
  var particles = [];

  // Track markers (100m = GOAL_DIST units)
  var trackMarkings = [];
  for (var m = 0; m <= 10; m++) {
    trackMarkings.push({ pos: m * (GOAL_DIST / 10), label: (m * 10) + 'm' });
  }

  function onSideTap(side) {
    if (done) return;
    if (side === lastSide) {
      // Wrong — must alternate!
      speed -= 60;
      if (speed < 0) speed = 0;
      return;
    }
    lastSide = side;
    speed = Math.min(MAX_SPEED, speed + ACCEL);
    tapCount++;
    game.audio.play('se_tap', 0.5);
    // Foot step particles
    particles.push({
      x: runnerPos - cameraX + W * 0.25,
      y: RUNNER_Y + 80,
      vx: -20 + Math.random() * 40,
      vy: -80 + Math.random() * 40,
      life: 0.3,
      side: side
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    onSideTap(tx < W / 2 ? -1 : 1);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Update speed and position
    if (!finished) {
      speed = Math.max(0, speed - DECAY * dt);
      runnerPos += speed * dt;
      cameraX = Math.max(0, runnerPos - W * 0.25);

      if (runnerPos >= GOAL_DIST && !finished) {
        finished = true;
        finishTime = 15 - timeLeft;
        done = true;
        game.audio.play('se_success');
        var bonusScore = Math.max(0, Math.floor((10 - finishTime) * 50)) + 200;
        setTimeout(function() { game.end.success(bonusScore); }, 500);
      }
    }

    // Update particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Track background
    game.draw.rect(0, TRACK_Y - 20, W, 200, C.track);
    game.draw.rect(0, TRACK_Y - 20, W, 6, C.trackHi);
    game.draw.rect(0, TRACK_Y + 140, W, 6, C.trackHi);

    // Lane dividers
    for (var li = 0; li < 4; li++) {
      var ly = TRACK_Y + li * 40;
      for (var lx = -60; lx < W; lx += 60) {
        game.draw.rect(lx + (cameraX % 60), ly, 36, 4, C.lane, 0.3);
      }
    }

    // Track markings
    for (var mi = 0; mi < trackMarkings.length; mi++) {
      var mk = trackMarkings[mi];
      var mkX = mk.pos - cameraX;
      if (mkX < -100 || mkX > W + 100) continue;
      game.draw.line(mkX, TRACK_Y - 20, mkX, TRACK_Y + 140, '#334155', 3);
      game.draw.text(mk.label, mkX, TRACK_Y + 170, { size: 32, color: '#64748b' });
    }

    // Goal tape
    var goalX = GOAL_DIST - cameraX;
    if (goalX > -50 && goalX < W + 50) {
      game.draw.line(goalX, TRACK_Y - 40, goalX, TRACK_Y + 160, C.goal, 8);
      game.draw.text('GOAL', goalX, TRACK_Y - 60, { size: 44, color: C.goalHi, bold: true });
    }

    // Runner
    var rx = runnerPos - cameraX;
    var legAnim = Math.sin(tapCount * 0.8) * 30;
    // Body
    game.draw.rect(rx - 24, RUNNER_Y - 60, 48, 80, C.runner);
    game.draw.circle(rx, RUNNER_Y - 80, 32, C.runnerHi);
    // Legs
    game.draw.line(rx, RUNNER_Y + 20, rx - 20 + legAnim, RUNNER_Y + 80, C.runner, 12);
    game.draw.line(rx, RUNNER_Y + 20, rx + 20 - legAnim, RUNNER_Y + 80, C.runner, 12);
    // Arms
    game.draw.line(rx, RUNNER_Y - 20, rx - 40 - legAnim * 0.5, RUNNER_Y + 20, C.runnerHi, 10);
    game.draw.line(rx, RUNNER_Y - 20, rx + 40 + legAnim * 0.5, RUNNER_Y + 20, C.runnerHi, 10);

    // Foot particles
    for (var pi = 0; pi < particles.length; pi++) {
      var pp = particles[pi];
      game.draw.circle(pp.x, pp.y, 8 * pp.life * 3, pp.side > 0 ? C.runner : C.runnerHi, pp.life * 2);
    }

    // Speed meter
    var speedFrac = speed / MAX_SPEED;
    var meterW = 400;
    game.draw.rect(W / 2 - meterW / 2, H * 0.82, meterW, 24, '#0a1428');
    game.draw.rect(W / 2 - meterW / 2, H * 0.82, meterW * speedFrac, 24, speedFrac > 0.7 ? C.correct : C.runner);
    game.draw.text('速度: ' + Math.round(speed), W / 2, H * 0.87, { size: 40, color: '#94a3b8' });

    // Progress bar
    var progFrac = Math.min(1, runnerPos / GOAL_DIST);
    var progW = 700;
    game.draw.rect(W / 2 - progW / 2, H * 0.9, progW, 16, '#0a1428');
    game.draw.rect(W / 2 - progW / 2, H * 0.9, progW * progFrac, 16, C.goal);

    // Tap instruction
    game.draw.text('左右交互タップで走れ！', W / 2, H * 0.95, { size: 44, color: C.ui });

    // Finish banner
    if (finished) {
      game.draw.rect(0, H * 0.35, W, 180, '#000', 0.7);
      game.draw.text('FINISH! ' + finishTime.toFixed(2) + 's', W / 2, H * 0.44, { size: 72, color: C.goal, bold: true });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 15);
    game.draw.rect(0, 0, W, 72, '#040810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.4 ? C.runner : '#ef4444');
    game.draw.text(timeLeft.toFixed(1) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
  });
})(game);
