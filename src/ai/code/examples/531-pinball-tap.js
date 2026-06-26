// 531-pinball-tap.js
// ピンボールタップ — 跳ね回るボールを下部フリッパーでタップして打ち返す
// 操作: 左タップで左フリッパー、右タップで右フリッパー
// 成功: ターゲット10個破壊  失敗: 5回ボール落下 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#020008',
    wall:     '#1a0a3a',
    wallHi:   '#2e1860',
    flipper:  '#f59e0b',
    flipperHi:'#fde68a',
    ball:     '#f1f5f9',
    ballHi:   '#ffffff',
    target:   '#ef4444',
    targetHi: '#fca5a5',
    hit:      '#22c55e',
    lost:     '#ef4444',
    text:     '#f1f5f9',
    ui:       '#374151',
    bumper:   '#8b5cf6'
  };

  var FLIPPER_Y = H * 0.87;
  var FLIPPER_L = 240;
  var FLIPPER_BASE_ANGLE = 30; // degrees from horizontal when resting
  var LEFT_BASE_X = W * 0.28;
  var RIGHT_BASE_X = W * 0.72;
  var BALL_R = 28;

  var ball = { x: W / 2, y: H * 0.3, vx: 150, vy: -200 };
  var leftFlipper = { angle: FLIPPER_BASE_ANGLE, active: false, timer: 0 };
  var rightFlipper = { angle: 180 - FLIPPER_BASE_ANGLE, active: false, timer: 0 };
  var targets = [];
  var bumpers = [];
  var broken = 0;
  var NEEDED = 10;
  var balls = 3;
  var MAX_BALLS = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;

  function initTargets() {
    targets = [];
    var rows = 2;
    var cols = 5;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        targets.push({ x: W * 0.12 + c * (W * 0.76 / 4), y: H * 0.2 + r * 90, r: 44, hp: 1, anim: 0 });
      }
    }
    // Bumpers
    bumpers = [
      { x: W * 0.3, y: H * 0.45, r: 50 },
      { x: W * 0.7, y: H * 0.45, r: 50 },
      { x: W / 2,   y: H * 0.55, r: 50 }
    ];
  }

  function flipperTip(flipper, baseX) {
    var rad = flipper.angle * Math.PI / 180;
    return {
      x: baseX + Math.cos(rad) * FLIPPER_L,
      y: FLIPPER_Y + Math.sin(rad) * FLIPPER_L
    };
  }

  function activateFlipper(flipper, isLeft) {
    flipper.active = true;
    flipper.timer = 0.25;
    flipper.angle = isLeft ? -40 : 180 + 40;
    game.audio.play('se_tap', 0.4);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) activateFlipper(leftFlipper, true);
    else activateFlipper(rightFlipper, false);
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

    // Flipper timers
    if (leftFlipper.active) {
      leftFlipper.timer -= dt;
      if (leftFlipper.timer <= 0) { leftFlipper.active = false; leftFlipper.angle = FLIPPER_BASE_ANGLE; }
    }
    if (rightFlipper.active) {
      rightFlipper.timer -= dt;
      if (rightFlipper.timer <= 0) { rightFlipper.active = false; rightFlipper.angle = 180 - FLIPPER_BASE_ANGLE; }
    }

    // Ball physics
    ball.vy += 900 * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Wall bounces
    if (ball.x - BALL_R < 40) { ball.x = 40 + BALL_R; ball.vx = Math.abs(ball.vx) * 0.9; }
    if (ball.x + BALL_R > W - 40) { ball.x = W - 40 - BALL_R; ball.vx = -Math.abs(ball.vx) * 0.9; }
    if (ball.y - BALL_R < 100) { ball.y = 100 + BALL_R; ball.vy = Math.abs(ball.vy) * 0.9; }

    // Flipper collision (simplified: check if ball near flipper line)
    var flippers = [
      { base: { x: LEFT_BASE_X, y: FLIPPER_Y }, fl: leftFlipper, isLeft: true },
      { base: { x: RIGHT_BASE_X, y: FLIPPER_Y }, fl: rightFlipper, isLeft: false }
    ];
    for (var fi = 0; fi < flippers.length; fi++) {
      var fData = flippers[fi];
      var tip = flipperTip(fData.fl, fData.base.x);
      var dx = tip.x - fData.base.x, dy = tip.y - fData.base.y;
      var len2 = dx * dx + dy * dy;
      var t = Math.max(0, Math.min(1, ((ball.x - fData.base.x) * dx + (ball.y - fData.base.y) * dy) / len2));
      var closestX = fData.base.x + t * dx;
      var closestY = fData.base.y + t * dy;
      var dist = Math.sqrt(Math.pow(ball.x - closestX, 2) + Math.pow(ball.y - closestY, 2));
      if (dist < BALL_R + 12) {
        var nx = (ball.x - closestX) / dist, ny = (ball.y - closestY) / dist;
        ball.x = closestX + nx * (BALL_R + 13);
        ball.y = closestY + ny * (BALL_R + 13);
        var flipSpeed = fData.fl.active ? 600 : 0;
        var dot = ball.vx * nx + ball.vy * ny;
        ball.vx -= 2 * dot * nx;
        ball.vy -= 2 * dot * ny;
        if (fData.fl.active) ball.vy -= flipSpeed;
        var spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        if (spd < 400) { ball.vx = ball.vx / spd * 400; ball.vy = ball.vy / spd * 400; }
        game.audio.play('se_tap', 0.3);
      }
    }

    // Bumper collisions
    for (var bi = 0; bi < bumpers.length; bi++) {
      var bmp = bumpers[bi];
      var bdx = ball.x - bmp.x, bdy = ball.y - bmp.y;
      var bd = Math.sqrt(bdx * bdx + bdy * bdy);
      if (bd < BALL_R + bmp.r) {
        var bnx = bdx / bd, bny = bdy / bd;
        ball.x = bmp.x + bnx * (BALL_R + bmp.r + 2);
        ball.y = bmp.y + bny * (BALL_R + bmp.r + 2);
        ball.vx = bnx * 700;
        ball.vy = bny * 700;
        game.audio.play('se_tap', 0.2);
      }
    }

    // Target collisions
    for (var ti = targets.length - 1; ti >= 0; ti--) {
      var tgt = targets[ti];
      if (tgt.hp <= 0) continue;
      tgt.anim = Math.max(0, tgt.anim - dt * 4);
      var tdx = ball.x - tgt.x, tdy = ball.y - tgt.y;
      if (Math.sqrt(tdx * tdx + tdy * tdy) < BALL_R + tgt.r) {
        tgt.hp--;
        tgt.anim = 1.0;
        if (tgt.hp <= 0) {
          broken++;
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: tgt.x, y: tgt.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.targetHi });
          }
          if (broken >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(broken * 500 + Math.ceil(timeLeft) * 100); }, 700);
          }
        }
        var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
        var tnx = tdx / Math.sqrt(tdx*tdx+tdy*tdy), tny = tdy / Math.sqrt(tdx*tdx+tdy*tdy);
        ball.vx = tnx * speed;
        ball.vy = tny * speed;
        game.audio.play('se_success', 0.4);
      }
    }

    // Ball lost
    if (ball.y > H) {
      balls++;
      flashAnim = 0.5;
      game.audio.play('se_failure', 0.5);
      if (balls > MAX_BALLS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      } else {
        ball.x = W / 2; ball.y = H * 0.3;
        ball.vx = (Math.random() - 0.5) * 200;
        ball.vy = -300;
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

    // Walls
    game.draw.rect(0, 0, 40, H, C.wall, 0.9);
    game.draw.rect(W - 40, 0, 40, H, C.wall, 0.9);
    game.draw.rect(0, 90, W, 16, C.wallHi, 0.4);

    // Bumpers
    for (var bi2 = 0; bi2 < bumpers.length; bi2++) {
      var bmp2 = bumpers[bi2];
      game.draw.circle(bmp2.x, bmp2.y, bmp2.r + 6, C.bumper, 0.3);
      game.draw.circle(bmp2.x, bmp2.y, bmp2.r, C.bumper, 0.8);
    }

    // Targets
    for (var ti2 = 0; ti2 < targets.length; ti2++) {
      var tgt2 = targets[ti2];
      if (tgt2.hp <= 0) continue;
      var tc = tgt2.anim > 0 ? C.targetHi : C.target;
      game.draw.rect(tgt2.x - tgt2.r, tgt2.y - 28, tgt2.r * 2, 56, tc, 0.9);
      game.draw.rect(tgt2.x - tgt2.r, tgt2.y - 28, tgt2.r * 2, 8, '#fff', 0.3);
    }

    // Flippers
    for (var fi2 = 0; fi2 < flippers.length; fi2++) {
      var fData2 = flippers[fi2];
      var tip2 = flipperTip(fData2.fl, fData2.base.x);
      game.draw.line(fData2.base.x, FLIPPER_Y, tip2.x, tip2.y, C.flipperHi, 24);
      game.draw.line(fData2.base.x, FLIPPER_Y, tip2.x, tip2.y, C.flipper, 16);
      game.draw.circle(fData2.base.x, FLIPPER_Y, 16, C.flipperHi, 0.9);
    }

    // Ball
    game.draw.circle(ball.x, ball.y, BALL_R + 4, '#888', 0.3);
    game.draw.circle(ball.x, ball.y, BALL_R, C.ball, 0.95);
    game.draw.circle(ball.x - 6, ball.y - 6, BALL_R * 0.25, C.ballHi, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.lost, flashAnim * 0.15);

    // Ball counter
    for (var li = 0; li < MAX_BALLS; li++) {
      game.draw.circle(W / 2 - (MAX_BALLS - 1) * 40 + li * 80, H * 0.955, 16, li < MAX_BALLS - balls + 1 ? C.ball : C.ui, 0.9);
    }

    game.draw.text(broken + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.bumper : C.lost);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    initTargets();
  });
})(game);
