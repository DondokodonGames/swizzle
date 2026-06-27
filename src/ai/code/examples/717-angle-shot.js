// 717-angle-shot.js
// 角度射撃 — 回転する砲台の向きが目標角度になった瞬間タップして発射せよ
// 操作: タップで砲弾発射（角度が目標と一致したとき）
// 成功: 20発命中  失敗: 15発外す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030910',
    cannon:  '#334155',
    canHi:   '#64748b',
    target:  '#22c55e',
    shell:   '#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050c14',
    arc:     '#0ea5e9'
  };

  var CX = W / 2;
  var CY = H * 0.8;
  var CANNON_LEN = 100;

  var cannonAngle = -Math.PI / 2; // starts pointing up
  var rotSpeed = 1.5; // radians per second
  var rotDir = 1;
  var TARGET_ANGLE_DEG = 0; // 0 = straight up, positive = right
  var ANGLE_TOLERANCE = 12; // degrees
  var targetAngle = 0; // in radians from up

  var shells = []; // { x, y, vx, vy, life }
  var hits = 0;
  var NEEDED = 20;
  var misses = 0;
  var MAX_MISS = 15;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var targetDisplay = 0; // animated target indicator

  // Target: a circle at fixed position
  var TARGET_X = CX;
  var TARGET_Y = H * 0.25;
  var TARGET_R = 60;

  function pickTarget() {
    // Random angle: -60 to +60 degrees from up
    var deg = -60 + Math.random() * 120;
    targetAngle = deg * Math.PI / 180 - Math.PI / 2; // convert to canvas angle
    TARGET_X = CX + Math.sin(deg * Math.PI / 180) * 400;
    TARGET_Y = H * 0.8 - Math.cos(deg * Math.PI / 180) * 500;
    TARGET_X = Math.max(80, Math.min(W - 80, TARGET_X));
    TARGET_Y = Math.max(100, Math.min(H * 0.6, TARGET_Y));
    targetDisplay = 0;
  }

  function getAngleDiff() {
    var a = cannonAngle % (Math.PI * 2);
    var b = targetAngle % (Math.PI * 2);
    var diff = Math.abs(a - b);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    return diff * 180 / Math.PI;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var diff = getAngleDiff();
    var tol = ANGLE_TOLERANCE - hits * 0.3;
    if (tol < 5) tol = 5;

    if (diff <= tol) {
      // Hit!
      hits++;
      var vx = Math.cos(cannonAngle) * 900;
      var vy = Math.sin(cannonAngle) * 900;
      shells.push({ x: CX + Math.cos(cannonAngle) * CANNON_LEN, y: CY + Math.sin(cannonAngle) * CANNON_LEN, vx: vx, vy: vy, life: 0.8, hit: true });
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = '命中！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.5);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: TARGET_X, y: TARGET_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.target });
      }
      pickTarget();
      rotSpeed = Math.min(3.5, 1.5 + hits * 0.08);
      if (hits >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(hits * 400 + Math.ceil(timeLeft) * 100); }, 700);
      }
    } else {
      misses++;
      var vx2 = Math.cos(cannonAngle) * 900;
      var vy2 = Math.sin(cannonAngle) * 900;
      shells.push({ x: CX + Math.cos(cannonAngle) * CANNON_LEN, y: CY + Math.sin(cannonAngle) * CANNON_LEN, vx: vx2, vy: vy2, life: 0.6, hit: false });
      flashCol = C.wrong;
      flashAnim = 0.25;
      resultText = 'ミス！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    game.audio.play('se_tap', 0.12);
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
    targetDisplay += dt;

    // Rotate cannon, bouncing at limits
    cannonAngle += rotSpeed * rotDir * dt;
    var minA = -Math.PI * 0.95;
    var maxA = -Math.PI * 0.05;
    if (cannonAngle > maxA) { cannonAngle = maxA; rotDir = -1; }
    if (cannonAngle < minA) { cannonAngle = minA; rotDir = 1; }

    // Update shells
    for (var si = shells.length - 1; si >= 0; si--) {
      shells[si].x += shells[si].vx * dt;
      shells[si].y += shells[si].vy * dt;
      shells[si].life -= dt * 1.5;
      if (shells[si].life <= 0) shells.splice(si, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var diff2 = getAngleDiff();
    var closeness = Math.max(0, 1 - diff2 / 30);

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Aim arc (trajectory preview)
    var aimX = CX + Math.cos(cannonAngle) * CANNON_LEN;
    var aimY = CY + Math.sin(cannonAngle) * CANNON_LEN;
    for (var ai = 1; ai <= 10; ai++) {
      var t2 = ai * 0.05;
      var px2 = aimX + Math.cos(cannonAngle) * 900 * t2;
      var py2 = aimY + Math.sin(cannonAngle) * 900 * t2;
      game.draw.circle(px2, py2, 6, C.arc, (1 - ai / 12) * 0.25);
    }

    // Target
    var pulse = 0.85 + 0.15 * Math.sin(targetDisplay * 3);
    game.draw.circle(TARGET_X + 4, TARGET_Y + 4, TARGET_R, '#000', 0.3);
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R * pulse, C.target, 0.8);
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R * 0.5, C.target, 0.2);
    game.draw.line(TARGET_X - TARGET_R, TARGET_Y, TARGET_X + TARGET_R, TARGET_Y, '#86efac', 3);
    game.draw.line(TARGET_X, TARGET_Y - TARGET_R, TARGET_X, TARGET_Y + TARGET_R, '#86efac', 3);
    if (closeness > 0.3) {
      game.draw.circle(TARGET_X, TARGET_Y, TARGET_R + 20, C.target, closeness * 0.25);
    }

    // Shells
    for (var si2 = 0; si2 < shells.length; si2++) {
      var s = shells[si2];
      game.draw.circle(s.x, s.y, 16 * s.life, s.hit ? C.correct : C.shell, s.life);
    }

    // Cannon base
    game.draw.circle(CX + 4, CY + 4, 50, '#000', 0.3);
    game.draw.circle(CX, CY, 50, C.cannon, 0.9);

    // Cannon barrel
    var bx1 = CX;
    var by1 = CY;
    var bx2 = CX + Math.cos(cannonAngle) * CANNON_LEN;
    var by2 = CY + Math.sin(cannonAngle) * CANNON_LEN;
    game.draw.line(bx1, by1, bx2, by2, C.cannon, 28);
    game.draw.line(bx1, by1, bx2, by2, C.canHi, 10);

    // Angle indicator
    var diffStr = Math.round(diff2) + '°';
    var diffCol = diff2 < 15 ? C.correct : (diff2 < 30 ? '#fbbf24' : C.wrong);
    game.draw.text(diffStr, W * 0.15, CY - 60, { size: 56, color: diffCol, bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.89, { size: 60, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi += 3) {
      game.draw.circle(W / 2 - 2 * 52 + (mi / 3) * 104, H * 0.955, 20, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    pickTarget();
  });
})(game);
