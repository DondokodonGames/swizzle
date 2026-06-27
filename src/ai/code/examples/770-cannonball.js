// 770-cannonball.js
// キャノンボール — 大砲の弾道を予測してターゲットに直撃させろ
// 操作: タップで大砲を発射（タップX位置で弾道が変わる）
// 成功: 30回命中  失敗: 10回外れ or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0603',
    sky:     '#0d1b2a',
    ground:  '#2d1a0a',
    groundHi:'#5c3d1e',
    cannon:  '#374151',
    cannonHi:'#9ca3af',
    ball:    '#d97706',
    ballHi:  '#fde68a',
    target:  '#22c55e',
    targetHi:'#4ade80',
    smoke:   '#6b7280',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0c0804'
  };

  var GROUND_Y = H * 0.76;
  var CANNON_X = W * 0.14;
  var CANNON_Y = GROUND_Y - 44;
  var GRAVITY = 1200;

  var targetX = 0;
  var targetY = 0;
  var TARGET_R = 56;

  var ball = null;
  var trajectoryDots = [];
  var aimX = W / 2; // current aim tap X
  var cannonAnim = 0;

  var waitTimer = 0;
  var WAIT_DUR = 0.5;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var smokeParticles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function newTarget() {
    targetX = W * 0.45 + Math.random() * W * 0.45;
    targetY = GROUND_Y - 80 - Math.random() * (H * 0.32);
    ball = null;
  }

  function getLaunchVelocity(aimTapX) {
    // Map tap X to launch angle (left = steep, right = shallow)
    var norm = (aimTapX - CANNON_X) / (W - CANNON_X);
    norm = Math.max(0.05, Math.min(0.95, norm));
    // Angle from 20 to 75 degrees
    var angle = 0.35 + (1 - norm) * 1.05;
    var spd = 900 + Math.random() * 80;
    return { vx: Math.cos(angle) * spd, vy: -Math.sin(angle) * spd };
  }

  function fire(tapX) {
    var v = getLaunchVelocity(tapX);
    ball = { x: CANNON_X, y: CANNON_Y, vx: v.vx, vy: v.vy, hit: false, done: false };
    cannonAnim = 0.4;
    // Smoke
    for (var p = 0; p < 6; p++) {
      var pa = -Math.PI * 0.4 + Math.random() * Math.PI * 0.3;
      smokeParticles.push({ x: CANNON_X + 60, y: CANNON_Y, vx: Math.cos(pa) * (60 + Math.random() * 80), vy: Math.sin(pa) * 60 - 40, life: 0.6, r: 20 + Math.random() * 20 });
    }
    // Preview dots
    trajectoryDots = [];
    var px = CANNON_X, py = CANNON_Y, pvx = v.vx, pvy = v.vy;
    for (var ti = 0; ti < 12; ti++) {
      var dtSim = 0.1;
      for (var si = 0; si < 3; si++) {
        pvy += GRAVITY * dtSim;
        px += pvx * dtSim;
        py += pvy * dtSim;
      }
      if (py > GROUND_Y) break;
      trajectoryDots.push({ x: px, y: py });
    }
    game.audio.play('se_tap', 0.12);
  }

  game.onTap(function(tx, ty) {
    if (done || waitTimer > 0) return;
    if (ball && !ball.done) return; // already in flight
    aimX = tx;
    fire(tx);
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0 && !done) newTarget();
    }

    if (ball && !ball.done) {
      ball.vx += 0; // no wind (or add if desired)
      ball.vy += GRAVITY * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Hit target?
      var dx = ball.x - targetX;
      var dy = ball.y - targetY;
      if (Math.sqrt(dx * dx + dy * dy) < TARGET_R + 20) {
        ball.done = true;
        score++;
        flashCol = C.correct;
        flashAnim = 0.25;
        resultText = '命中！';
        resultTimer = 0.4;
        game.audio.play('se_success', 0.7);
        for (var p2 = 0; p2 < 8; p2++) {
          var pa2 = Math.random() * Math.PI * 2;
          smokeParticles.push({ x: targetX, y: targetY, vx: Math.cos(pa2) * 180, vy: Math.sin(pa2) * 180 - 100, life: 0.45, r: 14 });
        }
        waitTimer = WAIT_DUR;
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 360 + Math.ceil(timeLeft) * 100); }, 700);
          return;
        }
      }

      // Hit ground?
      if (ball.y > GROUND_Y + 20) {
        ball.done = true;
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.3;
        resultText = 'はずれ！';
        resultTimer = 0.42;
        game.audio.play('se_failure', 0.28);
        // Ground hit smoke
        for (var p3 = 0; p3 < 5; p3++) {
          var pa3 = -Math.PI * 0.8 + Math.random() * Math.PI * 0.6;
          smokeParticles.push({ x: ball.x, y: GROUND_Y, vx: Math.cos(pa3) * 80, vy: Math.sin(pa3) * 80 - 60, life: 0.5, r: 16 });
        }
        waitTimer = WAIT_DUR;
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }

      // Off screen sides
      if (ball.x > W + 60) {
        ball.done = true;
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = '飛びすぎ！';
        resultTimer = 0.38;
        game.audio.play('se_failure', 0.22);
        waitTimer = WAIT_DUR;
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    if (cannonAnim > 0) cannonAnim -= dt * 3;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = smokeParticles.length - 1; pp >= 0; pp--) {
      smokeParticles[pp].x += smokeParticles[pp].vx * dt;
      smokeParticles[pp].y += smokeParticles[pp].vy * dt;
      smokeParticles[pp].vy += 200 * dt;
      smokeParticles[pp].life -= dt * 1.8;
      if (smokeParticles[pp].life <= 0) smokeParticles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.sky);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 1.0);
    game.draw.rect(0, GROUND_Y, W, 14, C.groundHi, 0.6);

    // Target
    var targetPulse = 0.7 + 0.3 * Math.sin(elapsed * 5);
    game.draw.circle(targetX + 4, targetY + 4, TARGET_R, '#000', 0.25);
    game.draw.circle(targetX, targetY, TARGET_R, C.target, 0.85);
    game.draw.circle(targetX, targetY, TARGET_R * 0.6, C.targetHi, targetPulse * 0.5);
    game.draw.circle(targetX, targetY, TARGET_R * 0.25, C.targetHi, 0.85);
    // Crosshair
    game.draw.line(targetX - TARGET_R, targetY, targetX + TARGET_R, targetY, C.targetHi, 3);
    game.draw.line(targetX, targetY - TARGET_R, targetX, targetY + TARGET_R, C.targetHi, 3);

    // Trajectory preview dots
    for (var ti2 = 0; ti2 < trajectoryDots.length; ti2++) {
      var td = trajectoryDots[ti2];
      var alpha = 0.5 - ti2 * 0.04;
      game.draw.circle(td.x, td.y, 6, C.ball, Math.max(0.1, alpha));
    }

    // Cannon body
    var cx = CANNON_X;
    var cy = CANNON_Y;
    var recoil = cannonAnim > 0 ? cannonAnim * 16 : 0;
    game.draw.rect(cx - 52 + recoil, cy - 22, 96, 44, C.cannon, 0.9);
    game.draw.rect(cx - 52 + recoil, cy - 22, 96, 10, C.cannonHi, 0.4);
    game.draw.rect(cx + 16 + recoil, cy - 14, 56, 28, C.cannon, 0.95); // barrel
    game.draw.rect(cx + 16 + recoil, cy - 14, 56, 7, C.cannonHi, 0.35);
    game.draw.circle(cx - 8, cy, 36, C.cannon, 0.95);
    game.draw.circle(cx - 8, cy, 28, C.cannonHi, 0.2);
    // Wheels
    game.draw.circle(cx - 32, CANNON_Y + 28, 28, '#1f2937', 0.9);
    game.draw.circle(cx + 16, CANNON_Y + 28, 22, '#1f2937', 0.9);

    // Ball in flight
    if (ball && !ball.done) {
      game.draw.circle(ball.x + 3, ball.y + 3, 22, '#000', 0.25);
      game.draw.circle(ball.x, ball.y, 22, C.ball, 0.95);
      game.draw.circle(ball.x - 7, ball.y - 7, 7, C.ballHi, 0.5);
    }

    // Smoke particles
    for (var pp2 = 0; pp2 < smokeParticles.length; pp2++) {
      var sp = smokeParticles[pp2];
      game.draw.circle(sp.x, sp.y, sp.r * sp.life, C.smoke, sp.life * 0.4);
    }

    if (!done && !ball) {
      game.draw.text('タップで発射！', W / 2, H * 0.88, { size: 40, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.22, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 48 + ei * 96, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newTarget();
  });
})(game);
