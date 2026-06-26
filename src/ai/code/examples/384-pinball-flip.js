// 384-pinball-flip.js
// ピンボールフリップ — フリッパーでボールを弾いて的を叩く
// 操作: 左タップで左フリッパー、右タップで右フリッパー
// 成功: 20点獲得  失敗: ボールをアウト3回 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020014',
    wall:   '#312e81',
    wallHi: '#4338ca',
    flipper:'#7c3aed',
    flipperHi:'#a78bfa',
    ball:   '#fbbf24',
    ballHi: '#fef3c7',
    target: '#ef4444',
    targetHi:'#fca5a5',
    targetLit:'#22c55e',
    bumper: '#3b82f6',
    bumperHi:'#93c5fd',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  // Ball
  var bx = W / 2, by = H * 0.4;
  var bvx = 200, bvy = 0;
  var BALL_R = 22;
  var GRAVITY = 700;

  // Flippers
  var FL_X = W * 0.28, FL_Y = H * 0.88;
  var FR_X = W * 0.72, FR_Y = H * 0.88;
  var FLIP_LEN = 160;
  var leftFlipAngle = 30;   // degrees up
  var rightFlipAngle = 150;
  var leftActive = false, rightActive = false;
  var TARGET_ANGLE_UP_L = -30;  // when activated
  var TARGET_ANGLE_UP_R = 210;
  var REST_ANGLE_L = 30;
  var REST_ANGLE_R = 150;

  // Targets
  var targets = [
    { x: W * 0.25, y: H * 0.22, r: 48, lit: false, points: 2 },
    { x: W * 0.5, y: H * 0.16, r: 48, lit: false, points: 3 },
    { x: W * 0.75, y: H * 0.22, r: 48, lit: false, points: 2 },
    { x: W * 0.18, y: H * 0.38, r: 38, lit: false, points: 1 },
    { x: W * 0.82, y: H * 0.38, r: 38, lit: false, points: 1 }
  ];

  // Bumpers
  var bumpers = [
    { x: W * 0.38, y: H * 0.32, r: 36 },
    { x: W * 0.62, y: H * 0.32, r: 36 },
    { x: W * 0.5, y: H * 0.44, r: 30 }
  ];

  var score = 0;
  var NEEDED = 20;
  var outs = 0;
  var MAX_OUTS = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];

  function resetBall() {
    bx = W / 2; by = H * 0.35;
    bvx = (Math.random() - 0.5) * 300;
    bvy = -200;
  }

  function flipperTipPos(cx, cy, angleDeg) {
    var rad = angleDeg * Math.PI / 180;
    return { x: cx + Math.cos(rad) * FLIP_LEN, y: cy + Math.sin(rad) * FLIP_LEN };
  }

  function reflectOff(nx, ny) {
    var dot = bvx * nx + bvy * ny;
    bvx -= 2 * dot * nx;
    bvy -= 2 * dot * ny;
    var spd = Math.sqrt(bvx*bvx+bvy*bvy);
    if (spd > 1400) { bvx = bvx/spd*1400; bvy = bvy/spd*1400; }
    if (spd < 200) { var f = 200/spd; bvx *= f; bvy *= f; }
  }

  game.onTap(function(tx) {
    if (done) return;
    if (tx < W / 2) leftActive = true;
    else rightActive = true;
    setTimeout(function() {
      if (tx < W / 2) leftActive = false;
      else rightActive = false;
    }, 180);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Animate flippers
    var targetL = leftActive ? TARGET_ANGLE_UP_L : REST_ANGLE_L;
    var targetR = rightActive ? TARGET_ANGLE_UP_R : REST_ANGLE_R;
    leftFlipAngle += (targetL - leftFlipAngle) * 15 * dt;
    rightFlipAngle += (targetR - rightFlipAngle) * 15 * dt;

    // Ball physics
    bvy += GRAVITY * dt;
    bx += bvx * dt;
    by += bvy * dt;

    // Wall bounces
    if (bx - BALL_R < 60) { bx = 60 + BALL_R; bvx = Math.abs(bvx) * 0.85; }
    if (bx + BALL_R > W - 60) { bx = W - 60 - BALL_R; bvx = -Math.abs(bvx) * 0.85; }
    if (by - BALL_R < 60) { by = 60 + BALL_R; bvy = Math.abs(bvy) * 0.85; }

    // Flipper collision (simplified line segment)
    var flippers = [
      { cx: FL_X, cy: FL_Y, angle: leftFlipAngle, active: leftActive },
      { cx: FR_X, cy: FR_Y, angle: rightFlipAngle, active: rightActive }
    ];
    for (var fi = 0; fi < 2; fi++) {
      var f = flippers[fi];
      var tip = flipperTipPos(f.cx, f.cy, f.angle);
      var fdx = tip.x - f.cx, fdy = tip.y - f.cy;
      var flen = Math.sqrt(fdx*fdx+fdy*fdy);
      var t = Math.max(0, Math.min(1, ((bx-f.cx)*fdx + (by-f.cy)*fdy) / (flen*flen)));
      var closestX = f.cx + t*fdx, closestY = f.cy + t*fdy;
      var distToFlip = Math.hypot(bx - closestX, by - closestY);
      if (distToFlip < BALL_R + 14 && bvy > 0) {
        // Normal pointing away from flipper center
        var nx = (bx - closestX) / distToFlip;
        var ny = (by - closestY) / distToFlip;
        by = closestY + ny * (BALL_R + 15);
        if (f.active) bvy -= 600; // boost if flipper active
        reflectOff(nx, ny);
        game.audio.play('se_tap', 0.4);
      }
    }

    // Bumper collision
    for (var bi = 0; bi < bumpers.length; bi++) {
      var bump = bumpers[bi];
      var d = Math.hypot(bx - bump.x, by - bump.y);
      if (d < BALL_R + bump.r) {
        var bnx = (bx - bump.x) / d, bny = (by - bump.y) / d;
        bx = bump.x + bnx * (BALL_R + bump.r + 2);
        by = bump.y + bny * (BALL_R + bump.r + 2);
        reflectOff(bnx, bny);
        bvx += bnx * 200; bvy += bny * 200;
        score++;
        game.audio.play('se_tap', 0.2);
        for (var pi = 0; pi < 4; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: bump.x, y: bump.y, vx: Math.cos(ang)*120, vy: Math.sin(ang)*120, life:0.3, col: C.bumperHi });
        }
        if (score >= NEEDED && !done) { done = true; game.end.success(score * 200 + Math.ceil(timeLeft) * 80); return; }
      }
    }

    // Target collision
    for (var ti = 0; ti < targets.length; ti++) {
      var tgt = targets[ti];
      var td = Math.hypot(bx - tgt.x, by - tgt.y);
      if (td < BALL_R + tgt.r && !tgt.lit) {
        tgt.lit = true;
        score += tgt.points;
        game.audio.play('se_success', 0.5);
        for (var pi2 = 0; pi2 < 8; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: tgt.x, y: tgt.y, vx: Math.cos(ang2)*160, vy: Math.sin(ang2)*160, life:0.5, col: C.targetLit });
        }
        var tnx = (bx - tgt.x) / td, tny = (by - tgt.y) / td;
        bx = tgt.x + tnx * (BALL_R + tgt.r + 2);
        by = tgt.y + tny * (BALL_R + tgt.r + 2);
        reflectOff(tnx, tny);
        if (score >= NEEDED && !done) { done = true; game.end.success(score * 200 + Math.ceil(timeLeft) * 80); return; }
      }
    }
    // Reset targets after all lit
    var allLit = true;
    for (var ti2 = 0; ti2 < targets.length; ti2++) { if (!targets[ti2].lit) { allLit = false; break; } }
    if (allLit) { for (var ti3 = 0; ti3 < targets.length; ti3++) targets[ti3].lit = false; }

    // Ball out
    if (by > H + 40) {
      outs++;
      game.audio.play('se_failure', 0.4);
      resetBall();
      if (outs >= MAX_OUTS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 300);
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

    // Walls
    game.draw.rect(0, 0, 60, H, C.wall, 0.9);
    game.draw.rect(W - 60, 0, 60, H, C.wall, 0.9);
    game.draw.rect(0, 0, W, 60, C.wall, 0.9);
    // Angled walls at bottom
    game.draw.line(60, H - 100, FL_X - 20, FL_Y, C.wallHi, 20);
    game.draw.line(W - 60, H - 100, FR_X + 20, FR_Y, C.wallHi, 20);

    // Bumpers
    for (var bi2 = 0; bi2 < bumpers.length; bi2++) {
      var bmp = bumpers[bi2];
      game.draw.circle(bmp.x, bmp.y, bmp.r + 8, C.bumper, 0.3);
      game.draw.circle(bmp.x, bmp.y, bmp.r, C.bumper, 0.9);
      game.draw.circle(bmp.x, bmp.y, bmp.r * 0.55, C.bumperHi, 0.85);
    }

    // Targets
    for (var ti4 = 0; ti4 < targets.length; ti4++) {
      var tg = targets[ti4];
      game.draw.circle(tg.x, tg.y, tg.r, tg.lit ? C.targetLit : C.target, 0.9);
      game.draw.circle(tg.x, tg.y, tg.r * 0.6, tg.lit ? '#86efac' : C.targetHi, 0.85);
      game.draw.text(tg.points + '', tg.x, tg.y + 12, { size: 32, color: '#fff', bold: true });
    }

    // Flippers
    for (var fi2 = 0; fi2 < 2; fi2++) {
      var f2 = flippers[fi2];
      var tip2 = flipperTipPos(f2.cx, f2.cy, f2.angle);
      game.draw.line(f2.cx, f2.cy, tip2.x, tip2.y, f2.active ? C.flipperHi : C.flipper, 28);
      game.draw.circle(f2.cx, f2.cy, 18, C.flipperHi, 0.9);
    }

    // Ball
    game.draw.circle(bx, by, BALL_R + 6, C.ball, 0.2);
    game.draw.circle(bx, by, BALL_R, C.ball, 0.9);
    game.draw.circle(bx - 7, by - 7, BALL_R * 0.35, C.ballHi, 0.8);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 7 * p.life * 2, p.col, p.life * 0.8);
    }

    // Out dots
    for (var oi = 0; oi < MAX_OUTS; oi++) {
      game.draw.circle(W/2 - (MAX_OUTS-1)*40 + oi*80, H*0.94, 16, oi < outs ? C.target : C.wall, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 140, { size: 56, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.flipper : C.target);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    resetBall();
  });
})(game);
