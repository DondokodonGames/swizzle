// 427-pendulum-swing.js
// 振り子飛び越え — ちょうどよいタイミングで振り子を飛び越える
// 操作: タップで飛び越えるタイミングを決める
// 成功: 10回連続成功  失敗: 3回衝突

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0518',
    rope:   '#78716c',
    ropeHi: '#a8a29e',
    ball:   '#dc2626',
    ballHi: '#fca5a5',
    runner: '#22c55e',
    runnerHi:'#86efac',
    ground: '#1c1730',
    groundHi:'#312e81',
    shadow: '#000',
    correct:'#22d3ee',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var PIVOT_X = W / 2;
  var PIVOT_Y = H * 0.22;
  var ROPE_LEN = 420;
  var pendAngle = -Math.PI * 0.55;
  var pendOmega = 0;
  var GRAVITY_FACTOR = 5.0;

  var GROUND_Y = H * 0.72;
  var RUNNER_Y = GROUND_Y - 40;
  var RUNNER_X = W / 2;

  var jumping = false;
  var jumpVY = 0;
  var jumpY = RUNNER_Y;
  var JUMP_FORCE = -900;
  var JUMP_GRAVITY = 2200;
  var jumped = false;  // already jumped this swing

  var successes = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var swings = 0;

  function getBallPos() {
    var bx = PIVOT_X + Math.sin(pendAngle) * ROPE_LEN;
    var by = PIVOT_Y + Math.cos(pendAngle) * ROPE_LEN;
    return { x: bx, y: by };
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (jumping) return;

    jumping = true;
    jumpVY = JUMP_FORCE;
    jumpY = RUNNER_Y;
    jumped = false;
    game.audio.play('se_tap', 0.4);
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

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Pendulum physics
    var angAccel = -GRAVITY_FACTOR * Math.sin(pendAngle);
    pendOmega += angAccel * dt;
    pendOmega *= (1 - dt * 0.01);  // very slight damping
    pendAngle += pendOmega * dt;

    // Track swing count for difficulty
    if (pendAngle > 0 && pendOmega > 0) {
      // Crossed center going right
    }

    // Increase speed over time
    var speedFactor = 1 + Math.min(2, elapsed * 0.025);
    pendOmega *= speedFactor * dt + (1 - speedFactor * dt); // approximate

    // Ball position
    var ball = getBallPos();

    // Runner/jump physics
    if (jumping) {
      jumpVY += JUMP_GRAVITY * dt;
      jumpY += jumpVY * dt;

      if (jumpY >= RUNNER_Y) {
        jumpY = RUNNER_Y;
        jumping = false;
        jumpVY = 0;
      }
    }

    // Collision check — ball vs runner
    var runnerBox = { x: RUNNER_X - 28, y: jumpY - 80, w: 56, h: 80 };
    var bdx = ball.x - RUNNER_X;
    var bdy = ball.y - (jumpY - 40);
    var ballR = 44;
    var collision = Math.sqrt(bdx*bdx + bdy*bdy) < ballR + 32;

    if (collision && !done) {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.7;
      game.audio.play('se_failure', 0.5);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: RUNNER_X, y: jumpY - 40, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200-100, life: 0.7, col: C.runner });
      }
      jumping = false; jumpY = RUNNER_Y; jumpVY = 0;
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }

    // Success — ball passed runner while jumping
    if (jumping && !jumped && Math.abs(ball.x - RUNNER_X) < 60 && jumpY < RUNNER_Y - 60) {
      jumped = true;
    }
    if (!jumping && jumped && !collision) {
      successes++;
      jumped = false;
      flashCol = C.correct;
      flashAnim = 0.5;
      game.audio.play('se_success', 0.5);
      for (var pi2 = 0; pi2 < 8; pi2++) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: RUNNER_X, y: RUNNER_Y - 40, vx: Math.cos(ang2)*150, vy: Math.sin(ang2)*150-80, life: 0.5, col: C.correct });
      }
      if (successes >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(successes * 400 + Math.ceil(timeLeft) * 80); }, 500);
      }
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 0.9);
    game.draw.line(0, GROUND_Y, W, GROUND_Y, C.groundHi, 4);

    // Ceiling/pivot structure
    game.draw.rect(PIVOT_X - 30, 0, 60, PIVOT_Y, C.rope, 0.6);
    game.draw.circle(PIVOT_X, PIVOT_Y, 24, C.ropeHi, 0.9);

    // Rope
    game.draw.line(PIVOT_X, PIVOT_Y, ball.x, ball.y, C.rope, 8);
    game.draw.line(PIVOT_X, PIVOT_Y, ball.x, ball.y, C.ropeHi, 3);

    // Ball shadow
    game.draw.circle(ball.x + 8, ball.y + 10, 38, C.shadow, 0.3);
    // Ball
    game.draw.circle(ball.x, ball.y, 44, C.ball, 0.9);
    game.draw.circle(ball.x, ball.y, 38, '#c00000', 0.5);
    game.draw.circle(ball.x - 14, ball.y - 16, 16, C.ballHi, 0.5);

    // Runner shadow
    game.draw.rect(RUNNER_X - 20, GROUND_Y - 6, 40, 10, C.shadow, 0.4);

    // Runner
    var ry = jumpY;
    game.draw.circle(RUNNER_X, ry - 70, 28, C.runner, 0.9);
    game.draw.circle(RUNNER_X - 8, ry - 78, 12, C.runnerHi, 0.5);
    game.draw.rect(RUNNER_X - 22, ry - 44, 44, 44, C.runner, 0.8);
    // Legs
    if (!jumping) {
      game.draw.line(RUNNER_X - 12, ry, RUNNER_X - 12, ry - 20, C.runnerHi, 8);
      game.draw.line(RUNNER_X + 12, ry, RUNNER_X + 12, ry - 20, C.runnerHi, 8);
    } else {
      // Jumping pose
      game.draw.line(RUNNER_X - 16, ry - 6, RUNNER_X - 22, ry - 24, C.runnerHi, 8);
      game.draw.line(RUNNER_X + 16, ry - 6, RUNNER_X + 22, ry - 24, C.runnerHi, 8);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.935, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.runner : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    pendOmega = 2.8;  // give it initial swing
  });
})(game);
