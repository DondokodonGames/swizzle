// 099-pinball-aim.js
// ピンボールエイム — 発射角を慎重に調整して狙ったターゲットにボールを当てる一発集中
// 操作: スワイプ上下で角度調整、タップで発射
// 成功: 5個のターゲット全撃破  失敗: 8発撃ち尽くす or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#05080f',
    launcher:'#1e3a5f',
    launchHi:'#3b82f6',
    ball:    '#fbbf24',
    ballHi:  '#fef3c7',
    target:  '#ef4444',
    targetHi:'#fca5a5',
    wall:    '#0f172a',
    wallHi:  '#1e293b',
    correct: '#22c55e',
    ui:      '#334155'
  };

  var LAUNCHER_X = W / 2;
  var LAUNCHER_Y = H * 0.88;
  var BALL_SPEED = 900;
  var BALL_R = 20;

  var angle = -Math.PI / 4; // angle from vertical (negative = left, positive = right)
  var MIN_ANGLE = -Math.PI * 0.45;
  var MAX_ANGLE = Math.PI * 0.45;

  var ball = null; // { x, y, vx, vy }
  var targets = []; // { x, y, r, hit, hitTimer }
  var ammo = 8;
  var score = 0;
  var needed = 5;
  var timeLeft = 30;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var aimLine = [];

  function initTargets() {
    targets = [];
    var positions = [
      { x: W * 0.25, y: H * 0.2 },
      { x: W * 0.75, y: H * 0.2 },
      { x: W / 2,    y: H * 0.15 },
      { x: W * 0.2,  y: H * 0.35 },
      { x: W * 0.8,  y: H * 0.35 }
    ];
    for (var i = 0; i < needed; i++) {
      targets.push({ x: positions[i].x, y: positions[i].y, r: 52, hit: false, hitTimer: 0 });
    }
  }

  function computeAimLine() {
    aimLine = [];
    var bx = LAUNCHER_X;
    var by = LAUNCHER_Y;
    var vx = Math.sin(angle) * BALL_SPEED;
    var vy = -Math.cos(angle) * BALL_SPEED;
    for (var i = 0; i < 12; i++) {
      aimLine.push({ x: bx, y: by });
      var t = 0.06;
      bx += vx * t;
      by += vy * t;
      if (bx < BALL_R || bx > W - BALL_R) { vx = -vx; }
      if (by < BALL_R) { vy = -vy; }
      if (by > H) break;
    }
  }

  game.onSwipe(function(dir) {
    if (done || ball) return;
    if (dir === 'left') angle -= 0.12;
    if (dir === 'right') angle += 0.12;
    angle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, angle));
  });

  game.onTap(function(tx, ty) {
    if (done || ball || ammo <= 0) return;
    ammo--;
    ball = {
      x: LAUNCHER_X,
      y: LAUNCHER_Y,
      vx: Math.sin(angle) * BALL_SPEED,
      vy: -Math.cos(angle) * BALL_SPEED
    };
    game.audio.play('se_tap', 0.8);
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

    // Precompute aim line when no ball
    if (!ball) computeAimLine();

    // Update ball
    if (ball) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Wall bounces (left/right/top)
      if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

      // Target hit
      for (var i = 0; i < targets.length; i++) {
        var t2 = targets[i];
        if (t2.hit) continue;
        var dx = ball.x - t2.x;
        var dy = ball.y - t2.y;
        if (Math.sqrt(dx * dx + dy * dy) < BALL_R + t2.r) {
          t2.hit = true;
          t2.hitTimer = 0.4;
          score++;
          feedbackOk = true;
          feedback = 0.4;
          game.audio.play('se_tap', 1.0);
          ball = null;
          if (score >= needed && !done) {
            done = true;
            game.audio.play('se_success');
            setTimeout(function() { game.end.success(score * 60 + Math.ceil(timeLeft) * 15 + ammo * 20); }, 500);
            return;
          }
          break;
        }
      }

      // Ball exits bottom
      if (ball && ball.y > H + 40) {
        ball = null;
        feedbackOk = false;
        feedback = 0.3;
        game.audio.play('se_failure', 0.4);
        if (ammo <= 0 && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    // Update hit timers
    for (var j = 0; j < targets.length; j++) {
      if (targets[j].hitTimer > 0) targets[j].hitTimer -= dt;
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Walls
    game.draw.rect(0, 0, 8, H, C.wall);
    game.draw.rect(W - 8, 0, 8, H, C.wall);
    game.draw.rect(0, 0, W, 8, C.wall);

    // Targets
    for (var ti = 0; ti < targets.length; ti++) {
      var t3 = targets[ti];
      if (t3.hit) {
        if (t3.hitTimer > 0) {
          var frac = t3.hitTimer / 0.4;
          game.draw.circle(t3.x, t3.y, t3.r + (1 - frac) * 60, C.correct, frac * 0.5);
          game.draw.text('★', t3.x, t3.y, { size: 52, color: C.ballHi, bold: true });
        }
      } else {
        var tPulse = 0.6 + 0.4 * Math.abs(Math.sin(game.time.elapsed * 3 + ti));
        game.draw.circle(t3.x, t3.y, t3.r + 8, C.targetHi, tPulse * 0.3);
        game.draw.circle(t3.x, t3.y, t3.r, C.target);
        game.draw.circle(t3.x - t3.r * 0.3, t3.y - t3.r * 0.3, t3.r * 0.2, '#fff', 0.4);
        game.draw.circle(t3.x, t3.y, t3.r * 0.5, C.targetHi, 0.3);
      }
    }

    // Aim line (dotted)
    if (!ball && aimLine.length > 1) {
      for (var al = 0; al < aimLine.length - 1; al++) {
        var a1 = aimLine[al], a2 = aimLine[al + 1];
        game.draw.line(a1.x, a1.y, a2.x, a2.y, '#1d4ed8', 3);
        game.draw.circle(a1.x, a1.y, 4, '#3b82f6', 0.5);
      }
    }

    // Ball
    if (ball) {
      game.draw.circle(ball.x, ball.y, BALL_R + 6, C.ballHi, 0.4);
      game.draw.circle(ball.x, ball.y, BALL_R, C.ball);
      game.draw.circle(ball.x - 6, ball.y - 6, 6, '#fff', 0.5);
    }

    // Launcher
    var angleLen = 80;
    var launchTipX = LAUNCHER_X + Math.sin(angle) * angleLen;
    var launchTipY = LAUNCHER_Y - Math.cos(angle) * angleLen;
    game.draw.line(LAUNCHER_X, LAUNCHER_Y, launchTipX, launchTipY, C.launchHi, 12);
    game.draw.circle(LAUNCHER_X, LAUNCHER_Y, 28, C.launcher);
    game.draw.circle(LAUNCHER_X, LAUNCHER_Y, 16, C.launchHi);

    // Ammo indicators
    for (var ai = 0; ai < 8; ai++) {
      var aix = W / 2 + (ai - 3.5) * 72;
      game.draw.circle(aix, H * 0.95, 22, ai < ammo ? C.ball : '#0a1428');
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? 'ヒット！' : '外れ…', W / 2, H * 0.5, {
        size: 80, color: feedbackOk ? C.correct : '#64748b', bold: true
      });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#05080f');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.launchHi : C.targetHi);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 88;
      game.draw.circle(sx, 136, 28, s < score ? C.correct : '#060c18');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    initTargets();
  });
})(game);
