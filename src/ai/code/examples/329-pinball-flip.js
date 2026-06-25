// 329-pinball-flip.js
// ピンボールフリップ — 左右フリッパーでボールを打ち続けてスコアを稼ぐ
// 操作: 左タップ=左フリッパー, 右タップ=右フリッパー
// 成功: 2000点  失敗: 3回ボール落下

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0414',
    wall:   '#1e1b4b',
    wallHi: '#312e81',
    flipper:'#4f46e5',
    flipHi: '#6366f1',
    ball:   '#e2e8f0',
    ballHi: '#fff',
    bumper: '#f59e0b',
    bumperHi:'#fde68a',
    bumperLit:'#fbbf24',
    lane:   '#22c55e',
    laneHi: '#86efac',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  // Ball
  var bx = W / 2, by = H * 0.35;
  var bvx = 150, bvy = 100;
  var BALL_R = 20;

  // Flippers
  var FL_Y = H * 0.82;
  var FL_LEN = 160;
  var flipL = 0.5;  // angle from center outward (resting)
  var flipR = Math.PI - 0.5;
  var flipLActive = false, flipRActive = false;
  var TARGET_L = 0.5, TARGET_R = Math.PI - 0.5;
  var FLIP_L_UP = -0.3, FLIP_R_UP = Math.PI + 0.3;

  // Bumpers
  var bumpers = [
    { x: W * 0.25, y: H * 0.3, r: 44, lit: 0, pts: 50 },
    { x: W * 0.75, y: H * 0.3, r: 44, lit: 0, pts: 50 },
    { x: W * 0.5, y: H * 0.22, r: 44, lit: 0, pts: 100 },
    { x: W * 0.35, y: H * 0.44, r: 36, lit: 0, pts: 75 },
    { x: W * 0.65, y: H * 0.44, r: 36, lit: 0, pts: 75 }
  ];

  var score = 0;
  var TARGET_SCORE = 2000;
  var balls = 3;
  var done = false;
  var elapsed = 0;
  var particles = [];
  var scoreAnim = 0;
  var lastScoreText = '';

  function resetBall() {
    bx = W / 2;
    by = H * 0.35;
    bvx = (Math.random() - 0.5) * 200;
    bvy = 100;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      flipLActive = true;
      setTimeout(function() { flipLActive = false; }, 180);
    } else {
      flipRActive = true;
      setTimeout(function() { flipRActive = false; }, 180);
    }
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) elapsed += dt;

    // Animate flippers
    var tL = flipLActive ? FLIP_L_UP : TARGET_L;
    var tR = flipRActive ? FLIP_R_UP : TARGET_R;
    flipL += (tL - flipL) * Math.min(1, dt * 14);
    flipR += (tR - flipR) * Math.min(1, dt * 14);

    if (scoreAnim > 0) scoreAnim -= dt * 2;

    // Physics
    bvy += 700 * dt; // gravity
    bx += bvx * dt;
    by += bvy * dt;

    // Wall bounce (left/right)
    if (bx < BALL_R + 40) { bx = BALL_R + 40; bvx = Math.abs(bvx) * 0.9; }
    if (bx > W - BALL_R - 40) { bx = W - BALL_R - 40; bvx = -Math.abs(bvx) * 0.9; }
    // Ceiling
    if (by < BALL_R + 80) { by = BALL_R + 80; bvy = Math.abs(bvy) * 0.8; }

    // Bumper collisions
    for (var bi = 0; bi < bumpers.length; bi++) {
      var bump = bumpers[bi];
      var dx = bx - bump.x, dy = by - bump.y;
      var dist = Math.hypot(dx, dy);
      if (dist < BALL_R + bump.r) {
        // Bounce off
        var nx = dx / dist, ny = dy / dist;
        var dot = bvx * nx + bvy * ny;
        bvx = bvx - 2 * dot * nx;
        bvy = bvy - 2 * dot * ny;
        bvx *= 1.1; bvy *= 1.1; // energize
        // Clamp speed
        var spd = Math.hypot(bvx, bvy);
        if (spd > 900) { bvx = bvx / spd * 900; bvy = bvy / spd * 900; }

        bx = bump.x + nx * (BALL_R + bump.r + 2);
        by = bump.y + ny * (BALL_R + bump.r + 2);

        score += bump.pts;
        bump.lit = 0.6;
        lastScoreText = '+' + bump.pts;
        scoreAnim = 0.7;
        game.audio.play('se_tap', 0.4);
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: bx, y: by, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: C.bumperHi });
        }

        if (score >= TARGET_SCORE && !done) {
          done = true;
          setTimeout(function() { game.end.success(score + balls * 200); }, 400);
        }
      }
      if (bump.lit > 0) bump.lit -= dt * 1.5;
    }

    // Flipper collision (left)
    var flLX = W * 0.28, flLY = FL_Y;
    var flLTX = flLX + Math.cos(flipL) * FL_LEN, flLTY = flLY + Math.sin(flipL) * FL_LEN;
    // Closest point on flipper line to ball
    var t = Math.max(0, Math.min(1, ((bx - flLX) * (flLTX - flLX) + (by - flLY) * (flLTY - flLY)) / (FL_LEN * FL_LEN)));
    var cpx = flLX + t * (flLTX - flLX), cpy = flLY + t * (flLTY - flLY);
    if (Math.hypot(bx - cpx, by - cpy) < BALL_R + 8 && bvy > 0) {
      bvy = -(Math.abs(bvy) * 0.9 + 300);
      bvx += flipLActive ? 150 : -30;
      game.audio.play('se_tap', 0.35);
    }

    // Flipper collision (right)
    var flRX = W * 0.72, flRY = FL_Y;
    var flRTX = flRX + Math.cos(flipR) * FL_LEN, flRTY = flRY + Math.sin(flipR) * FL_LEN;
    var t2 = Math.max(0, Math.min(1, ((bx - flRX) * (flRTX - flRX) + (by - flRY) * (flRTY - flRY)) / (FL_LEN * FL_LEN)));
    var cpx2 = flRX + t2 * (flRTX - flRX), cpy2 = flRY + t2 * (flRTY - flRY);
    if (Math.hypot(bx - cpx2, by - cpy2) < BALL_R + 8 && bvy > 0) {
      bvy = -(Math.abs(bvy) * 0.9 + 300);
      bvx += flipRActive ? -150 : 30;
      game.audio.play('se_tap', 0.35);
    }

    // Ball falls out
    if (by > H + 50 && !done) {
      balls--;
      if (balls <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        setTimeout(function() { game.end.failure(); }, 400);
      } else {
        game.audio.play('se_failure', 0.3);
        resetBall();
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Side walls
    game.draw.rect(0, 0, 40, H * 0.85, C.wallHi, 0.8);
    game.draw.rect(W - 40, 0, 40, H * 0.85, C.wallHi, 0.8);
    // Angled gutters
    game.draw.line(40, H * 0.85, W * 0.28, FL_Y, C.wall, 16);
    game.draw.line(W - 40, H * 0.85, W * 0.72, FL_Y, C.wall, 16);

    // Bumpers
    for (var bi2 = 0; bi2 < bumpers.length; bi2++) {
      var b = bumpers[bi2];
      var isLit = b.lit > 0;
      game.draw.circle(b.x, b.y, b.r + 8, isLit ? C.bumperLit : C.bumper, isLit ? b.lit * 0.5 : 0.15);
      game.draw.circle(b.x, b.y, b.r, isLit ? C.bumperLit : C.bumper, isLit ? 0.9 : 0.7);
      game.draw.circle(b.x, b.y, b.r * 0.4, C.bumperHi, isLit ? 0.9 : 0.5);
    }

    // Ball
    game.draw.circle(bx, by, BALL_R + 6, C.ball, 0.2);
    game.draw.circle(bx, by, BALL_R, C.ball, 0.9);
    game.draw.circle(bx - 6, by - 6, 6, C.ballHi, 0.7);

    // Flippers
    game.draw.line(W * 0.28, FL_Y, W * 0.28 + Math.cos(flipL) * FL_LEN, FL_Y + Math.sin(flipL) * FL_LEN, C.flipHi, 24);
    game.draw.circle(W * 0.28, FL_Y, 14, C.flipper, 0.9);
    game.draw.line(W * 0.72, FL_Y, W * 0.72 + Math.cos(flipR) * FL_LEN, FL_Y + Math.sin(flipR) * FL_LEN, C.flipHi, 24);
    game.draw.circle(W * 0.72, FL_Y, 14, C.flipper, 0.9);

    // Score anim
    if (scoreAnim > 0) {
      game.draw.text(lastScoreText, bx, by - 60, { size: 48, color: C.bumperHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Balls remaining
    for (var li = 0; li < 3; li++) {
      game.draw.circle(W * 0.3 + li * 50, H * 0.92, 16, li < balls ? C.ball : '#0a0414');
    }

    game.draw.text(score + '', W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.min(1, score / TARGET_SCORE);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, C.bumper);
    game.draw.text(score + ' / ' + TARGET_SCORE, W / 2, 36, { size: 36, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    resetBall();
  });
})(game);
