// 052-bounce-predict.js
// バウンス予測 — 壁で跳ね返るボールの軌跡を予測してゴールに当てる
// 操作: タップで射出角度を決定（タップ位置でエイム）
// 成功: 6回ゴールに入れる  失敗: 4回外す or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060a14',
    wall:    '#1e3a5f',
    wallHi:  '#2563eb',
    ball:    '#fbbf24',
    ballHi:  '#fef3c7',
    trail:   '#f97316',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    predict: '#818cf8',
    miss:    '#ef4444',
    ui:      '#475569'
  };

  var BALL_R = 28;
  var BALL_SPEED = 900;
  var PLAY_X = 80;
  var PLAY_Y = 200;
  var PLAY_W = W - 160;
  var PLAY_H = H * 0.55;
  var GOAL_R = 52;

  var ball = null; // {x,y,vx,vy,bounces}
  var trail = [];
  var goalX = W / 2;
  var goalY = PLAY_Y + PLAY_H * 0.3;

  var score = 0;
  var needed = 6;
  var misses = 0;
  var maxMisses = 4;
  var timeLeft = 20;
  var done = false;

  var feedback = 0;
  var feedbackOk = false;
  var shootFlash = 0;
  var predictLine = []; // pre-computed bounce path for preview

  // Launch origin (bottom center of play area)
  var ORIGIN_X = W / 2;
  var ORIGIN_Y = PLAY_Y + PLAY_H - 40;

  function newRound() {
    ball = null;
    trail = [];
    shootFlash = 0;
    // Move goal to random position in upper area
    goalX = PLAY_X + GOAL_R + Math.random() * (PLAY_W - GOAL_R * 2);
    goalY = PLAY_Y + GOAL_R + Math.random() * (PLAY_H * 0.5);
    predictLine = [];
  }

  function computePath(startX, startY, vx, vy, steps) {
    var pts = [{x: startX, y: startY}];
    var x = startX, y = startY;
    var dvx = vx, dvy = vy;
    var dt2 = 0.016;
    for (var i = 0; i < steps; i++) {
      x += dvx * dt2;
      y += dvy * dt2;
      // Bounce off walls
      if (x - BALL_R < PLAY_X) { x = PLAY_X + BALL_R; dvx = Math.abs(dvx); }
      if (x + BALL_R > PLAY_X + PLAY_W) { x = PLAY_X + PLAY_W - BALL_R; dvx = -Math.abs(dvx); }
      if (y - BALL_R < PLAY_Y) { y = PLAY_Y + BALL_R; dvy = Math.abs(dvy); }
      pts.push({x: x, y: y});
    }
    return pts;
  }

  game.onTap(function(x, y) {
    if (done || ball) return;
    // Aim from origin toward tap
    var dx = x - ORIGIN_X;
    var dy = y - ORIGIN_Y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var vx = (dx / dist) * BALL_SPEED;
    var vy = (dy / dist) * BALL_SPEED;

    // Only allow shooting upward (toward the play field)
    if (vy > -100) vy = -BALL_SPEED * 0.95;

    ball = { x: ORIGIN_X, y: ORIGIN_Y, vx: vx, vy: vy, bounces: 0 };
    trail = [];
    shootFlash = 0.15;
    predictLine = [];
    game.audio.play('se_tap', 0.6);
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

    if (shootFlash > 0) shootFlash -= dt;

    // Update ball
    if (ball) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      trail.unshift({ x: ball.x, y: ball.y });
      if (trail.length > 18) trail.pop();

      // Bounce
      if (ball.x - BALL_R < PLAY_X) { ball.x = PLAY_X + BALL_R; ball.vx = Math.abs(ball.vx); ball.bounces++; }
      if (ball.x + BALL_R > PLAY_X + PLAY_W) { ball.x = PLAY_X + PLAY_W - BALL_R; ball.vx = -Math.abs(ball.vx); ball.bounces++; }
      if (ball.y - BALL_R < PLAY_Y) { ball.y = PLAY_Y + BALL_R; ball.vy = Math.abs(ball.vy); ball.bounces++; }

      // Goal check
      var gdx = ball.x - goalX, gdy = ball.y - goalY;
      if (Math.sqrt(gdx * gdx + gdy * gdy) < GOAL_R + BALL_R - 8) {
        score++;
        feedbackOk = true;
        feedback = 0.5;
        ball = null;
        game.audio.play('se_tap', 1.0);
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score * 25 + Math.ceil(timeLeft) * 10); }, 400);
          return;
        }
        setTimeout(newRound, 600);
        return;
      }

      // Miss (went below play area)
      if (ball.y > PLAY_Y + PLAY_H + 60) {
        misses++;
        feedbackOk = false;
        feedback = 0.5;
        ball = null;
        game.audio.play('se_failure', 0.5);
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        }
        setTimeout(newRound, 400);
      }
    } else if (!done) {
      // Preview aim line toward last tap (store in predictLine)
      // We do this lazily — just keep updating on each frame without tap
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Play area
    game.draw.rect(PLAY_X - 8, PLAY_Y - 8, PLAY_W + 16, PLAY_H + 16, C.wallHi, 0.15);
    game.draw.rect(PLAY_X, PLAY_Y, PLAY_W, PLAY_H, C.wall, 0.25);

    // Goal
    var gPulse = 0.15 + 0.1 * Math.sin(game.time.elapsed * 6);
    game.draw.circle(goalX, goalY, GOAL_R + 16, C.goalHi, gPulse);
    game.draw.circle(goalX, goalY, GOAL_R, C.goal, 0.9);
    game.draw.circle(goalX, goalY, GOAL_R * 0.5, '#fff', 0.3);
    game.draw.circle(goalX, goalY, GOAL_R * 0.2, C.goalHi, 0.7);
    // Crosshair
    game.draw.line(goalX - GOAL_R, goalY, goalX + GOAL_R, goalY, '#fff', 2);
    game.draw.line(goalX, goalY - GOAL_R, goalX, goalY + GOAL_R, '#fff', 2);

    // Trail
    for (var tr = 0; tr < trail.length; tr++) {
      var ta = (1 - tr / trail.length) * 0.7;
      var tr_r = BALL_R * (1 - tr / trail.length * 0.5);
      game.draw.circle(trail[tr].x, trail[tr].y, tr_r, C.trail, ta);
    }

    // Ball
    if (ball) {
      game.draw.circle(ball.x, ball.y, BALL_R + 8, C.ballHi, 0.2);
      game.draw.circle(ball.x, ball.y, BALL_R, C.ball);
      game.draw.circle(ball.x - 8, ball.y - 8, BALL_R * 0.35, '#fff', 0.5);
    }

    // Launch point
    if (!ball) {
      if (shootFlash <= 0) {
        var lPulse = 0.4 + 0.3 * Math.sin(game.time.elapsed * 5);
        game.draw.circle(ORIGIN_X, ORIGIN_Y, BALL_R + 12, C.ballHi, lPulse);
      }
      game.draw.circle(ORIGIN_X, ORIGIN_Y, BALL_R, C.ball, 0.7);
    }

    // Shoot flash
    if (shootFlash > 0) {
      game.draw.circle(ORIGIN_X, ORIGIN_Y, 80, '#fff', shootFlash / 0.15 * 0.4);
    }

    // Feedback
    if (feedback > 0) {
      feedback -= dt;
      if (feedbackOk) {
        game.draw.text('イン！', W / 2, H * 0.8, { size: 88, color: C.goal, bold: true });
      } else {
        game.draw.text('外れ', W / 2, H * 0.8, { size: 88, color: C.miss, bold: true });
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#060a14');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.wallHi : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    game.draw.text(score + ' / ' + needed, W / 2, 140, { size: 56, color: C.goalHi, bold: true });

    // Miss pips
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 64;
      game.draw.circle(mx, 210, 20, m < misses ? C.miss : '#0f1a28');
    }

    // Guide
    if (!ball) {
      game.draw.text('タップでエイム→発射！', W / 2, H - 200, { size: 52, color: C.ui });
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    newRound();
  });
})(game);
