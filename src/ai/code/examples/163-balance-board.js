// 163-balance-board.js
// バランスボード — 傾くシーソーの上でキャラクターのバランスを保ち続ける感覚
// 操作: タップ左右でキャラクターを移動させる
// 成功: 25秒バランスを保つ  失敗: 傾きが60度を超える

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080510',
    board:   '#7c3aed',
    boardHi: '#a78bfa',
    pivot:   '#4b5563',
    pivotHi: '#9ca3af',
    char:    '#f59e0b',
    charHi:  '#fef08a',
    danger:  '#ef4444',
    safe:    '#22c55e',
    ui:      '#334155'
  };

  var PIVOT_X = W / 2;
  var PIVOT_Y = H * 0.56;
  var BOARD_LEN = 480;
  var BOARD_H = 24;

  var angle = 0; // board tilt (radians, positive = right side down)
  var angleVel = 0;
  var MAX_ANGLE = Math.PI / 3; // 60 degrees = fail

  var charPos = 0; // position along board (-1 to 1)
  var charTargetPos = 0;
  var CHAR_MOVE_SPEED = 1.4;
  var CHAR_R = 36;

  // Board physics
  var GRAVITY_TORQUE = 5.5;
  var ANGLE_FRICTION = 0.94;

  var survived = 0;
  var NEEDED = 25;
  var timeLeft = NEEDED;
  var done = false;
  var particles = [];

  game.onTap(function(tx) {
    if (done) return;
    if (tx < W / 2) {
      charTargetPos = Math.max(-0.85, charTargetPos - 0.25);
    } else {
      charTargetPos = Math.min(0.85, charTargetPos + 0.25);
    }
    game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') charTargetPos = Math.max(-0.85, charTargetPos - 0.35);
    else if (dir === 'right') charTargetPos = Math.min(0.85, charTargetPos + 0.35);
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 80 + 500); }, 400);
        return;
      }
    }

    // Move character toward target
    var charDiff = charTargetPos - charPos;
    var charMove = CHAR_MOVE_SPEED * dt;
    if (Math.abs(charDiff) < charMove) charPos = charTargetPos;
    else charPos += (charDiff > 0 ? charMove : -charMove);

    // Physics: torque from character weight + random wind
    var wind = Math.sin(survived * 0.7) * 0.4 + (Math.random() - 0.5) * 0.3;
    var torque = (charPos * GRAVITY_TORQUE + wind) * dt;
    angleVel += torque;
    angleVel *= Math.pow(ANGLE_FRICTION, dt * 60);
    angle += angleVel * dt;

    // Clamp
    if (Math.abs(angle) >= MAX_ANGLE && !done) {
      done = true;
      game.audio.play('se_failure');
      for (var pi = 0; pi < 16; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: PIVOT_Y, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300 - 100, life: 0.7 });
      }
      setTimeout(function() { game.end.failure(); }, 700);
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 500 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Board
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    var bx1 = PIVOT_X - BOARD_LEN * cos;
    var by1 = PIVOT_Y - BOARD_LEN * sin;
    var bx2 = PIVOT_X + BOARD_LEN * cos;
    var by2 = PIVOT_Y + BOARD_LEN * sin;

    // Board shadow
    game.draw.line(bx1 + 8, by1 + 8, bx2 + 8, by2 + 8, '#000', BOARD_H + 4);
    // Board
    game.draw.line(bx1, by1, bx2, by2, C.board, BOARD_H);
    game.draw.line(bx1, by1, bx2, by2, C.boardHi, 8);
    // Board ends
    game.draw.circle(bx1, by1, 20, C.boardHi, 0.8);
    game.draw.circle(bx2, by2, 20, C.boardHi, 0.8);

    // Pivot stand
    game.draw.line(PIVOT_X, PIVOT_Y, PIVOT_X - 40, PIVOT_Y + 120, C.pivot, 20);
    game.draw.line(PIVOT_X, PIVOT_Y, PIVOT_X + 40, PIVOT_Y + 120, C.pivot, 20);
    game.draw.line(PIVOT_X - 60, PIVOT_Y + 120, PIVOT_X + 60, PIVOT_Y + 120, C.pivot, 20);
    game.draw.circle(PIVOT_X, PIVOT_Y, 28, C.pivotHi, 0.9);

    // Character position on board
    var cx = PIVOT_X + charPos * BOARD_LEN * cos;
    var cy = PIVOT_Y + charPos * BOARD_LEN * sin - CHAR_R;
    // Character
    var lean = angle * 2; // character leans opposite to tilt to look like balancing
    var isDanger = Math.abs(angle) > MAX_ANGLE * 0.6;
    game.draw.circle(cx, cy, CHAR_R + 8, isDanger ? C.danger : C.charHi, 0.2);
    game.draw.circle(cx, cy, CHAR_R, isDanger ? C.danger : C.char, 0.95);
    // Head
    game.draw.circle(cx, cy - CHAR_R - 16, 22, isDanger ? C.danger : C.charHi, 0.9);
    // Arms balancing
    game.draw.line(cx - 50, cy - CHAR_R * 0.3, cx + 50, cy - CHAR_R * 0.3, C.charHi, 8);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 12 * part.life, C.danger, part.life);
    }

    // Angle meter (danger indicator)
    var angleRatio = Math.abs(angle) / MAX_ANGLE;
    var meterCol = angleRatio < 0.5 ? C.safe : (angleRatio < 0.75 ? '#f59e0b' : C.danger);
    game.draw.rect(W / 2 - 180, H * 0.82, 360, 24, '#1e293b', 0.8);
    var meterOffset = (angle / MAX_ANGLE) * 180;
    game.draw.rect(W / 2 + (angle > 0 ? 0 : meterOffset), H * 0.82, Math.abs(meterOffset), 24, meterCol, 0.9);
    game.draw.circle(W / 2, H * 0.82 + 12, 8, '#fff', 0.9);

    // Controls
    game.draw.text('← タップ左', W * 0.22, H * 0.9, { size: 36, color: C.ui });
    game.draw.text('タップ右 →', W * 0.78, H * 0.9, { size: 36, color: C.ui });

    // Timer
    var ratio = Math.max(0, timeLeft / NEEDED);
    game.draw.text(timeLeft.toFixed(1) + '秒', W / 2, 148, { size: 64, color: '#f1f5f9', bold: true });

    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.board : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.25); });
})(game);
