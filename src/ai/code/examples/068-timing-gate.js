// 068-timing-gate.js
// タイミングゲート — 左右に往復するゲートが全開になった瞬間にボールを通す
// 操作: タップでボールをリリース
// 成功: 8回ゲートを通過  失敗: 4回ゲートに当たる or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#04080c',
    gate:     '#1e3a5f',
    gateHi:   '#2563eb',
    ball:     '#fbbf24',
    ballHi:   '#fef3c7',
    safe:     '#22c55e',
    danger:   '#ef4444',
    trail:    '#f97316',
    ui:       '#475569'
  };

  // Gate at a fixed Y position, two halves sliding in from left and right
  var GATE_Y = H * 0.45;
  var GATE_H = 48;
  var GATE_SPEED = 2.8; // radians/sec (gate oscillation)
  var MIN_GAP = 80; // minimum gap between gate halves
  var MAX_HALF = (W - MIN_GAP) / 2; // max extent of each half

  // Gate phase: 0 = fully open, π = fully closed
  var gatePhase = Math.PI; // start closed
  var gateDir = 1; // speed direction

  // Ball
  var ball = null; // {x,y,vy}
  var BALL_R = 36;
  var BALL_START_X = W / 2;
  var BALL_START_Y = H * 0.72;
  var BALL_SPEED_UP = -1100;
  var trails = [];

  var score = 0;
  var needed = 8;
  var hits = 0;
  var maxHits = 4;
  var timeLeft = 20;
  var done = false;

  var feedback = 0;
  var feedbackOk = false;

  function getGateExtent() {
    // gatePhase 0=open, π=closed
    var closed = (Math.cos(gatePhase) + 1) / 2; // 0=open, 1=closed
    return closed * MAX_HALF;
  }

  game.onTap(function(x, y) {
    if (done || ball) return;
    ball = { x: BALL_START_X, y: BALL_START_Y, vy: BALL_SPEED_UP };
    trails = [];
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

    // Oscillate gate
    gatePhase += GATE_SPEED * dt;
    if (gatePhase > Math.PI * 2) gatePhase -= Math.PI * 2;

    // Ball
    if (ball) {
      ball.vy += 1600 * dt; // gravity
      ball.y += ball.vy * dt;
      trails.unshift({ x: ball.x, y: ball.y });
      if (trails.length > 10) trails.pop();

      // Check gate collision
      if (ball.y + BALL_R >= GATE_Y - GATE_H / 2 && ball.y - BALL_R <= GATE_Y + GATE_H / 2) {
        var ext = getGateExtent();
        var leftGate = W / 2 - ext;
        var rightGate = W / 2 + ext;
        var gapLeft = leftGate;
        var gapRight = rightGate;

        if (ball.x - BALL_R < gapLeft || ball.x + BALL_R > gapRight) {
          // Hit gate wall
          hits++;
          feedbackOk = false;
          feedback = 0.5;
          ball = null;
          game.audio.play('se_failure', 0.7);
          if (hits >= maxHits && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          }
        } else if (ball.y < GATE_Y && ball.vy < 0) {
          // Passed through gate!
          // (will be confirmed when ball exits above gate)
        }
      }

      // Ball passed through gate (now above)
      if (ball && ball.y < GATE_Y - GATE_H / 2 - BALL_R * 2 && ball.vy < 0) {
        score++;
        feedbackOk = true;
        feedback = 0.5;
        game.audio.play('se_tap', 1.0);
        if (score >= needed && !done) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() { game.end.success(score * 20 + Math.ceil(timeLeft) * 10); }, 400);
        }
        // Ball continues up and falls back down
      }

      // Reset when ball exits screen bottom
      if (ball && ball.y > H + 80) {
        ball = null;
      }
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    var ext = getGateExtent();
    var leftX = W / 2 - ext;
    var rightX = W / 2 + ext;
    var openRatio = 1 - ext / MAX_HALF; // 0=closed, 1=open

    // Gate open indicator
    var gateColor = openRatio > 0.65 ? C.safe : (openRatio > 0.35 ? C.gateHi : C.danger);

    // Left gate half
    game.draw.rect(0, GATE_Y - GATE_H / 2, leftX, GATE_H, C.gate);
    game.draw.rect(leftX - 16, GATE_Y - GATE_H / 2 - 8, 16, GATE_H + 16, gateColor, 0.8);
    game.draw.rect(0, GATE_Y - GATE_H / 2, leftX, 12, C.gateHi, 0.3);

    // Right gate half
    game.draw.rect(rightX, GATE_Y - GATE_H / 2, W - rightX, GATE_H, C.gate);
    game.draw.rect(rightX, GATE_Y - GATE_H / 2 - 8, 16, GATE_H + 16, gateColor, 0.8);
    game.draw.rect(rightX, GATE_Y - GATE_H / 2, W - rightX, 12, C.gateHi, 0.3);

    // Gap glow
    if (openRatio > 0.5) {
      game.draw.rect(leftX, GATE_Y - GATE_H / 2 - 24, rightX - leftX, GATE_H + 48, gateColor, openRatio * 0.15);
    }

    // Gap width text
    var gapW = rightX - leftX;
    game.draw.text('GAP: ' + Math.floor(gapW), W / 2, GATE_Y + GATE_H / 2 + 52, {
      size: 36, color: gateColor, bold: true
    });

    // Ball trail
    for (var tr = 0; tr < trails.length; tr++) {
      var ta = (1 - tr / trails.length) * 0.5;
      game.draw.circle(trails[tr].x, trails[tr].y, BALL_R * 0.6 * (1 - tr / trails.length), C.trail, ta);
    }

    // Ball
    if (ball) {
      game.draw.circle(ball.x, ball.y, BALL_R + 8, C.ballHi, 0.2);
      game.draw.circle(ball.x, ball.y, BALL_R, C.ball);
      game.draw.circle(ball.x - 10, ball.y - 10, BALL_R * 0.35, '#fff', 0.5);
    } else if (!done) {
      // Launch indicator
      var pulse = 0.3 + 0.3 * Math.sin(game.time.elapsed * 5);
      game.draw.circle(BALL_START_X, BALL_START_Y, BALL_R + 12, C.ballHi, pulse);
      game.draw.circle(BALL_START_X, BALL_START_Y, BALL_R, C.ball, 0.7);
      game.draw.text('↑', BALL_START_X, BALL_START_Y - BALL_R - 40, { size: 48, color: C.ball, bold: true });
    }

    // Feedback
    if (feedback > 0) {
      if (feedbackOk) {
        game.draw.text('通過！', W / 2, GATE_Y - 100, { size: 80, color: C.safe, bold: true });
      } else {
        game.draw.text('当たった！', W / 2, GATE_Y - 100, { size: 80, color: C.danger, bold: true });
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#04080c');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.gateHi : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & hits
    game.draw.text(score + ' / ' + needed, W / 2, 140, { size: 56, color: C.ballHi, bold: true });
    for (var h = 0; h < maxHits; h++) {
      var hx = W / 2 + (h - (maxHits - 1) / 2) * 64;
      game.draw.circle(hx, 212, 20, h < hits ? C.danger : '#0a1428');
    }

    // Guide
    game.draw.text('ゲートが開いたらタップ！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
  });
})(game);
