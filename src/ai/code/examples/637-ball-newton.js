// 637-ball-newton.js
// ボールニュートン — 振り子の玉が衝突する瞬間を止めろ
// 操作: タップで振り子を止める
// 成功: 完璧な衝突タイミング15回  失敗: 10ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060810',
    string:  '#334155',
    ball:    '#e2e8f0',
    ballHi:  '#ffffff',
    ballSha: '#000000',
    pivot:   '#475569',
    zone:    '#22c55e',
    zoneHi:  '#86efac',
    hit:     '#ef4444',
    perfect: '#fbbf24',
    text:    '#f1f5f9',
    ui:      '#0a0e18',
    glow:    '#22c55e44'
  };

  var PIVOT_Y = H * 0.22;
  var PIVOT_X = W / 2;
  var ARM_LEN = 480;
  var BALL_R = 60;
  var MAX_ANGLE = Math.PI / 2.5;
  var SPEED_BASE = 1.8;

  // Two pendulums side by side
  var LEFT_PX = W * 0.28;
  var RIGHT_PX = W * 0.72;

  var leftAngle = -MAX_ANGLE;
  var leftVel = SPEED_BASE;
  var rightAngle = MAX_ANGLE;
  var rightVel = -SPEED_BASE;
  var leftStopped = false;
  var rightStopped = false;

  var correct = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISSES = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.zone;
  var resultText = '';
  var resultTimer = 0;
  var roundActive = true;
  var roundTimer = 0;

  function getBallPos(pivotX, angle) {
    return {
      x: pivotX + Math.sin(angle) * ARM_LEN,
      y: PIVOT_Y + Math.cos(angle) * ARM_LEN
    };
  }

  function checkCollision() {
    var lp = getBallPos(LEFT_PX, leftAngle);
    var rp = getBallPos(RIGHT_PX, rightAngle);
    var dx = rp.x - lp.x;
    var dist = Math.abs(dx);
    return dist < BALL_R * 2.2;
  }

  function resetRound() {
    leftAngle = -MAX_ANGLE;
    leftVel = SPEED_BASE * (0.9 + Math.random() * 0.3);
    rightAngle = MAX_ANGLE;
    rightVel = -SPEED_BASE * (0.9 + Math.random() * 0.3);
    leftStopped = false;
    rightStopped = false;
    roundActive = true;
    roundTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || !roundActive) return;
    // Stop the ball closer to tap
    var lp = getBallPos(LEFT_PX, leftAngle);
    var rp = getBallPos(RIGHT_PX, rightAngle);
    var dl = Math.sqrt((tx - lp.x) * (tx - lp.x) + (ty - lp.y) * (ty - lp.y));
    var dr = Math.sqrt((tx - rp.x) * (tx - rp.x) + (ty - rp.y) * (ty - rp.y));

    if (dl < dr && !leftStopped) {
      leftStopped = true;
      leftVel = 0;
    } else if (!rightStopped) {
      rightStopped = true;
      rightVel = 0;
    }

    if (leftStopped && rightStopped) {
      // Both stopped — check if in collision zone
      var isColliding = checkCollision();
      if (isColliding) {
        correct++;
        flashCol = C.perfect;
        flashAnim = 0.3;
        resultText = '完璧！';
        resultTimer = 0.6;
        game.audio.play('se_success', 0.6);
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          var mp = { x: (lp.x + rp.x) / 2, y: (lp.y + rp.y) / 2 };
          particles.push({ x: mp.x, y: mp.y, vx: Math.cos(pa) * 250, vy: Math.sin(pa) * 250, life: 0.5, col: C.zoneHi });
        }
        if (correct >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(correct * 300 + Math.ceil(timeLeft) * 80); }, 700);
        }
      } else {
        misses++;
        flashCol = C.hit;
        flashAnim = 0.3;
        resultText = '惜しい！';
        resultTimer = 0.5;
        game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISSES && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
      roundActive = false;
      roundTimer = 0.8;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    if (!roundActive) {
      roundTimer -= dt;
      if (roundTimer <= 0) resetRound();
    }

    if (roundActive) {
      if (!leftStopped) {
        leftVel += -leftAngle * 3 * dt; // pendulum physics: acc = -g/L * sin(theta)
        leftAngle += leftVel * dt;
      }
      if (!rightStopped) {
        rightVel += -rightAngle * 3 * dt;
        rightAngle += rightVel * dt;
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Pivot bar
    game.draw.rect(W * 0.1, PIVOT_Y - 16, W * 0.8, 16, C.pivot, 0.8);
    game.draw.circle(LEFT_PX, PIVOT_Y, 18, C.pivot, 0.9);
    game.draw.circle(RIGHT_PX, PIVOT_Y, 18, C.pivot, 0.9);

    // Collision zone indicator (at mid-bottom)
    var midY = PIVOT_Y + ARM_LEN;
    var isNear = checkCollision();
    game.draw.circle(W / 2, midY, BALL_R * 2, isNear ? C.glow : '#ffffff11', 0.8);
    game.draw.circle(W / 2, midY, 8, isNear ? C.zone : '#ffffff22', 0.9);

    // Left pendulum
    var lp2 = getBallPos(LEFT_PX, leftAngle);
    game.draw.line(LEFT_PX, PIVOT_Y, lp2.x, lp2.y, C.string, 4);
    game.draw.circle(lp2.x + 5, lp2.y + 5, BALL_R, C.ballSha, 0.3);
    game.draw.circle(lp2.x, lp2.y, BALL_R, C.ball, leftStopped ? 0.5 : 0.9);
    game.draw.circle(lp2.x - 18, lp2.y - 18, BALL_R * 0.3, C.ballHi, 0.5);

    // Right pendulum
    var rp2 = getBallPos(RIGHT_PX, rightAngle);
    game.draw.line(RIGHT_PX, PIVOT_Y, rp2.x, rp2.y, C.string, 4);
    game.draw.circle(rp2.x + 5, rp2.y + 5, BALL_R, C.ballSha, 0.3);
    game.draw.circle(rp2.x, rp2.y, BALL_R, C.ball, rightStopped ? 0.5 : 0.9);
    game.draw.circle(rp2.x - 18, rp2.y - 18, BALL_R * 0.3, C.ballHi, 0.5);

    // Stop indicators
    if (leftStopped) game.draw.text('●', lp2.x, lp2.y + 8, { size: 28, color: C.hit });
    if (rightStopped) game.draw.text('●', rp2.x, rp2.y + 8, { size: 28, color: C.hit });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 14 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 72, color: flashCol, bold: true });
    }
    if (roundActive && !leftStopped && !rightStopped) {
      game.draw.text('タップで止めろ', W / 2, H * 0.87, { size: 44, color: '#ffffff55' });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISSES; mi++) {
      game.draw.circle(W / 2 - (MAX_MISSES - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.hit : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.zone : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    resetRound();
  });
})(game);
