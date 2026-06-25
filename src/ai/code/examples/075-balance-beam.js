// 075-balance-beam.js
// バランスビーム — 傾くシーソーの上でボールを中心に保ち続けるバランスゲーム
// 操作: タップで傾きを逆転させる
// 成功: 20秒バランスを保つ  失敗: ボールが端から落ちる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050a14',
    beam:    '#1e3a5f',
    beamHi:  '#3b82f6',
    pivot:   '#6d28d9',
    pivotHi: '#a78bfa',
    ball:    '#f97316',
    ballHi:  '#fed7aa',
    safe:    '#22c55e',
    danger:  '#ef4444',
    ui:      '#475569'
  };

  var BEAM_W = 700;
  var BEAM_H = 28;
  var PIVOT_X = W / 2;
  var PIVOT_Y = H * 0.52;

  var angle = 0;       // beam angle in radians (0 = horizontal)
  var angVel = 0;      // angular velocity
  var TILT_FORCE = 0.4; // gravity tilt force
  var DAMP = 0.97;     // angular damping

  var ballPos = 0;     // position along beam, -1=left end, 1=right end
  var ballVel = 0;     // velocity along beam

  var tapSide = 0;     // which way we're currently counterbalancing: -1, 0, 1
  var timeLeft = 20;
  var done = false;
  var dangerFlash = 0;

  game.onTap(function(x, y) {
    if (done) return;
    // Tap left = push left side down (tilt left), tap right = push right side down
    var pushDir = x < W / 2 ? -1 : 1;
    angVel += pushDir * 0.4;
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + 80); }, 300);
        return;
      }
    }

    // Beam physics: naturally wants to tip randomly
    var naturalForce = Math.sin(game.time.elapsed * 0.7) * 0.12 + Math.sin(game.time.elapsed * 1.3) * 0.08;
    angVel += naturalForce * dt;
    angVel *= DAMP;
    angle += angVel * dt;
    // Clamp angle
    if (angle > Math.PI * 0.38) { angle = Math.PI * 0.38; angVel = -Math.abs(angVel) * 0.3; }
    if (angle < -Math.PI * 0.38) { angle = -Math.PI * 0.38; angVel = Math.abs(angVel) * 0.3; }

    // Ball rolls along beam (affected by beam tilt)
    var tiltAccel = Math.sin(angle) * 900;
    ballVel += tiltAccel * dt;
    ballVel *= 0.985;
    ballPos += ballVel * dt / (BEAM_W / 2);

    // Ball limits
    if (Math.abs(ballPos) > 0.92) {
      if (!done) {
        done = true;
        dangerFlash = 0.5;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }

    if (Math.abs(ballPos) > 0.75) dangerFlash = 0.1;
    if (dangerFlash > 0) dangerFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    if (dangerFlash > 0) {
      game.draw.rect(0, 0, W, H, C.danger, dangerFlash * 0.3);
    }

    // Pivot
    game.draw.circle(PIVOT_X, PIVOT_Y + 20, 40, C.pivot);
    game.draw.circle(PIVOT_X, PIVOT_Y + 20, 24, C.pivotHi, 0.6);

    // Beam (rotated via drawn lines)
    var cos_a = Math.cos(angle);
    var sin_a = Math.sin(angle);
    var halfW = BEAM_W / 2;

    // Left end
    var lx = PIVOT_X - cos_a * halfW;
    var ly = PIVOT_Y - sin_a * halfW;
    // Right end
    var rx = PIVOT_X + cos_a * halfW;
    var ry = PIVOT_Y + sin_a * halfW;

    // Beam body (thick line)
    game.draw.line(lx, ly, rx, ry, C.beam, BEAM_H + 4);
    game.draw.line(lx, ly, rx, ry, C.beamHi, BEAM_H);
    // Highlight stripe
    game.draw.line(lx + cos_a * 20, ly + sin_a * 20 - 6, rx - cos_a * 20, ry - sin_a * 20 - 6, '#fff', 4);

    // End caps
    game.draw.circle(lx, ly, BEAM_H / 2 + 4, C.beamHi, 0.8);
    game.draw.circle(rx, ry, BEAM_H / 2 + 4, C.beamHi, 0.8);

    // Ball position on beam
    var ballX = PIVOT_X + cos_a * (ballPos * halfW);
    var ballY = PIVOT_Y + sin_a * (ballPos * halfW);
    var ballDanger = Math.abs(ballPos) > 0.75;
    var BALL_R = 32;

    game.draw.circle(ballX, ballY - BALL_R - BEAM_H / 2, BALL_R + 10, ballDanger ? C.danger : C.ballHi, ballDanger ? 0.5 : 0.2);
    game.draw.circle(ballX, ballY - BALL_R - BEAM_H / 2, BALL_R, C.ball);
    game.draw.circle(ballX - 8, ballY - BALL_R - BEAM_H / 2 - 8, 10, '#fff', 0.5);

    // Safe zone indicator on beam
    var safeL = PIVOT_X - cos_a * halfW * 0.75;
    var safeR = PIVOT_X + cos_a * halfW * 0.75;
    var safeY1 = PIVOT_Y - sin_a * halfW * 0.75;
    var safeY2 = PIVOT_Y + sin_a * halfW * 0.75;
    game.draw.line(safeL, safeY1, safeR, safeY2, C.safe, 4);

    // Angle indicator
    var angleDeg = Math.floor(angle * 180 / Math.PI);
    game.draw.text((angleDeg > 0 ? '+' : '') + angleDeg + '°', W / 2, PIVOT_Y + 100, {
      size: 44, color: Math.abs(angleDeg) > 20 ? C.danger : '#64748b'
    });

    // Tap guides
    game.draw.text('←', W * 0.2, PIVOT_Y, { size: 80, color: '#1e3a5f', bold: true });
    game.draw.text('→', W * 0.8, PIVOT_Y, { size: 80, color: '#1e3a5f', bold: true });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#050a14');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.pivot : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('タップでバランス調整！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    angVel = 0.15; // slight initial tilt
  });
})(game);
