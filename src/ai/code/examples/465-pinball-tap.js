// 465-pinball-tap.js
// ピンボールタップ — ボールがフリッパーに来た瞬間にタップして打ち返す
// 操作: 左タップで左フリッパー、右タップで右フリッパー
// 成功: 20点獲得  失敗: 5回落下 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050018',
    field:  '#0a0030',
    wall:   '#7c3aed',
    wallHi: '#a855f7',
    flipper:'#06b6d4',
    flipperHi:'#22d3ee',
    flipperActive:'#fbbf24',
    ball:   '#f1f5f9',
    ballHi: '#fff',
    bumper: '#ef4444',
    bumperHi:'#fca5a5',
    bumperOn:'#fbbf24',
    score:  '#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var FLIPPER_Y = H * 0.85;
  var FLIPPER_L = 160;
  var FL_X = W * 0.25;  // left flipper center
  var FR_X = W * 0.75;  // right flipper center
  var FLIPPER_BASE_ANGLE = 0.45;  // radians
  var FLIPPER_HIT_ANGLE = -0.7;

  var leftAngle = FLIPPER_BASE_ANGLE;
  var rightAngle = Math.PI - FLIPPER_BASE_ANGLE;
  var leftActive = false;
  var rightActive = false;
  var leftTimer = 0;
  var rightTimer = 0;
  var FLIPPER_ACTIVE_DURATION = 0.18;

  var ball = { x: W/2, y: H*0.3, vx: 80, vy: 200, r: 22 };
  var bumpers = [
    { x: W*0.3, y: H*0.22, r: 40, lit: 0 },
    { x: W*0.7, y: H*0.22, r: 40, lit: 0 },
    { x: W*0.5, y: H*0.15, r: 36, lit: 0 },
    { x: W*0.2, y: H*0.38, r: 32, lit: 0 },
    { x: W*0.8, y: H*0.38, r: 32, lit: 0 }
  ];
  var particles = [];
  var score = 0;
  var NEEDED = 20;
  var falls = 0;
  var MAX_FALLS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;

  function resetBall() {
    ball.x = W/2 + (Math.random() - 0.5) * 100;
    ball.y = H * 0.3;
    ball.vx = (Math.random() - 0.5) * 200;
    ball.vy = 180 + Math.random() * 100;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W/2) {
      leftActive = true;
      leftTimer = FLIPPER_ACTIVE_DURATION;
    } else {
      rightActive = true;
      rightTimer = FLIPPER_ACTIVE_DURATION;
    }
    game.audio.play('se_tap', 0.3);
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
    if (leftTimer > 0) { leftTimer -= dt; if (leftTimer <= 0) { leftActive = false; } }
    if (rightTimer > 0) { rightTimer -= dt; if (rightTimer <= 0) { rightActive = false; } }
    leftAngle = leftActive ? FLIPPER_HIT_ANGLE : FLIPPER_BASE_ANGLE;
    rightAngle = leftActive ? Math.PI - FLIPPER_HIT_ANGLE : Math.PI - FLIPPER_BASE_ANGLE;
    // Animate right independently
    rightAngle = rightActive ? Math.PI - FLIPPER_HIT_ANGLE : Math.PI - FLIPPER_BASE_ANGLE;

    // Ball physics
    ball.vy += 800 * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Side walls
    if (ball.x - ball.r < 60) { ball.x = 60 + ball.r; ball.vx = Math.abs(ball.vx) * 0.85; }
    if (ball.x + ball.r > W - 60) { ball.x = W - 60 - ball.r; ball.vx = -Math.abs(ball.vx) * 0.85; }
    if (ball.y - ball.r < 80) { ball.y = 80 + ball.r; ball.vy = Math.abs(ball.vy) * 0.8; }

    // Bumper collisions
    for (var bi = 0; bi < bumpers.length; bi++) {
      var b = bumpers[bi];
      if (b.lit > 0) b.lit -= dt * 3;
      var dx = ball.x - b.x;
      var dy = ball.y - b.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < b.r + ball.r) {
        var nx = dx / dist;
        var ny = dy / dist;
        var dot = ball.vx * nx + ball.vy * ny;
        ball.vx = (ball.vx - 2 * dot * nx) * 1.1;
        ball.vy = (ball.vy - 2 * dot * ny) * 1.1;
        if (Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy) > 1200) {
          var sp = Math.sqrt(ball.vx*ball.vx + ball.vy*ball.vy);
          ball.vx = ball.vx/sp * 1200;
          ball.vy = ball.vy/sp * 1200;
        }
        ball.x = b.x + nx * (b.r + ball.r + 2);
        ball.y = b.y + ny * (b.r + ball.r + 2);
        b.lit = 0.4;
        score++;
        flashAnim = 0.2;
        game.audio.play('se_tap', 0.3);
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(ang)*120, vy: Math.sin(ang)*120, life: 0.4, col: C.bumperOn });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.8);
          setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 80); }, 700);
        }
      }
    }

    // Flipper collisions (simplified)
    function checkFlipper(fx, fy, ang, side) {
      var tipX = fx + Math.cos(ang) * FLIPPER_L;
      var tipY = fy + Math.sin(ang) * FLIPPER_L;
      // Simple dist to line segment
      var dx2 = tipX - fx;
      var dy2 = tipY - fy;
      var bx = ball.x - fx;
      var by2 = ball.y - fy;
      var t = Math.max(0, Math.min(1, (bx*dx2 + by2*dy2) / (dx2*dx2 + dy2*dy2)));
      var closestX = fx + t * dx2;
      var closestY = fy + t * dy2;
      var dist2 = Math.sqrt((ball.x-closestX)*(ball.x-closestX) + (ball.y-closestY)*(ball.y-closestY));
      if (dist2 < ball.r + 14) {
        var flipActive = side === 'left' ? leftActive : rightActive;
        var ny2 = (ball.y - closestY) / dist2;
        var nx2 = (ball.x - closestX) / dist2;
        ball.vy = -Math.abs(ball.vy) * 0.9;
        ball.vx += flipActive ? (side === 'left' ? 200 : -200) : 0;
        ball.y = closestY + ny2 * (ball.r + 14 + 2);
        if (flipActive) {
          game.audio.play('se_tap', 0.4);
        }
      }
    }
    checkFlipper(FL_X, FLIPPER_Y, leftAngle, 'left');
    checkFlipper(FR_X, FLIPPER_Y, rightAngle, 'right');

    // Ball falls
    if (ball.y > H + 50) {
      falls++;
      game.audio.play('se_failure', 0.5);
      if (falls >= MAX_FALLS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
      resetBall();
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(60, 80, W - 120, H - 80, C.field, 0.5);

    // Side walls
    game.draw.rect(0, 80, 60, H - 80, C.wall, 0.8);
    game.draw.rect(W - 60, 80, 60, H - 80, C.wall, 0.8);
    game.draw.rect(0, 80, 60, 8, C.wallHi, 0.5);
    game.draw.rect(W - 60, 80, 60, 8, C.wallHi, 0.5);

    // Bumpers
    for (var bi2 = 0; bi2 < bumpers.length; bi2++) {
      var b2 = bumpers[bi2];
      var bCol = b2.lit > 0 ? C.bumperOn : C.bumper;
      game.draw.circle(b2.x, b2.y, b2.r + 8, bCol, b2.lit * 0.3);
      game.draw.circle(b2.x, b2.y, b2.r, bCol, 0.9);
      game.draw.circle(b2.x, b2.y, b2.r * 0.5, b2.lit > 0 ? '#fff' : C.bumperHi, 0.5);
    }

    // Ball
    game.draw.circle(ball.x, ball.y, ball.r + 6, C.ballHi, 0.1);
    game.draw.circle(ball.x, ball.y, ball.r, C.ball, 0.9);
    game.draw.circle(ball.x - ball.r*0.3, ball.y - ball.r*0.3, ball.r*0.3, '#fff', 0.4);

    // Flippers
    var lTipX = FL_X + Math.cos(leftAngle) * FLIPPER_L;
    var lTipY = FLIPPER_Y + Math.sin(leftAngle) * FLIPPER_L;
    var rTipX = FR_X + Math.cos(rightAngle) * FLIPPER_L;
    var rTipY = FLIPPER_Y + Math.sin(rightAngle) * FLIPPER_L;
    var lCol = leftActive ? C.flipperActive : C.flipper;
    var rCol = rightActive ? C.flipperActive : C.flipper;
    game.draw.line(FL_X, FLIPPER_Y, lTipX, lTipY, lCol, 28);
    game.draw.line(FL_X, FLIPPER_Y, lTipX, lTipY, C.flipperHi, 12);
    game.draw.line(FR_X, FLIPPER_Y, rTipX, rTipY, rCol, 28);
    game.draw.line(FR_X, FLIPPER_Y, rTipX, rTipY, C.flipperHi, 12);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.9);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.bumperOn, flashAnim * 0.08);

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W/2 - (MAX_FALLS-1)*44 + fi*88, H*0.955, 18, fi < falls ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.flipper : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    resetBall();
  });
})(game);
