// 791-drift-balance.js
// ドリフトバランス — 左右に傾く天秤を、タップで均衡を保ち続けろ
// 操作: 左タップで左に重りを足す、右タップで右に重りを足す
// 成功: 60秒間ゾーン内を維持  失敗: 4回転倒 or 70秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050810',
    beam:    '#475569',
    beamHi:  '#94a3b8',
    pivot:   '#64748b',
    left:    '#38bdf8',
    right:   '#f97316',
    zone:    '#22c55e',
    danger:  '#ef4444',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050810'
  };

  var CX = W / 2;
  var CY = H * 0.42;
  var BEAM_LEN = W * 0.38;

  var tilt = 0;        // -1 = full left, +1 = full right
  var tiltVel = 0;
  var DRIFT_ACCEL = 0.18; // random drift per second
  var driftForce = 0;
  var TAP_FORCE = 0.35;   // tilt correction per tap
  var SAFE_ZONE = 0.35;   // tilt must stay within ±SAFE_ZONE

  var falls = 0;
  var MAX_FALLS = 4;
  var inDanger = false;
  var dangerTimer = 0;
  var DANGER_GRACE = 0.8;

  var gameTimer = 0;
  var WIN_TIME = 60;
  var done = false;
  var timeLeft = 70;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var tapSide = 0; // -1 left, 1 right, for visual feedback
  var tapTimer = 0;

  function updateDriftForce() {
    driftForce = (Math.random() - 0.5) * DRIFT_ACCEL * (1 + falls * 0.15);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      tiltVel -= TAP_FORCE;
      tapSide = -1;
      game.audio.play('se_tap', 0.06);
    } else {
      tiltVel += TAP_FORCE;
      tapSide = 1;
      game.audio.play('se_tap', 0.06);
    }
    tapTimer = 0.15;
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

    // Random drift changes
    if (Math.random() < dt * 0.8) updateDriftForce();

    // Physics
    tiltVel += driftForce * dt;
    tilt += tiltVel * dt;
    tiltVel *= Math.pow(0.85, dt * 60); // damping

    // Clamp
    if (tilt > 1) { tilt = 1; tiltVel = 0; }
    if (tilt < -1) { tilt = -1; tiltVel = 0; }

    // Check danger zone
    if (Math.abs(tilt) > SAFE_ZONE) {
      if (!inDanger) {
        inDanger = true;
        dangerTimer = 0;
      }
      dangerTimer += dt;
      if (dangerTimer >= DANGER_GRACE) {
        // Fell!
        falls++;
        inDanger = false;
        dangerTimer = 0;
        tilt = 0;
        tiltVel = 0;
        flashCol = C.wrong;
        flashAnim = 0.4;
        resultText = '転倒！';
        resultTimer = 0.5;
        game.audio.play('se_failure', 0.45);
        // Scatter particles
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: CX, y: CY, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.danger });
        }
        if (falls >= MAX_FALLS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
          return;
        }
      }
    } else {
      inDanger = false;
      dangerTimer = 0;
    }

    // Win condition
    if (!done) {
      gameTimer += dt;
      if (gameTimer >= WIN_TIME) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(5000 + Math.ceil(timeLeft) * 200 - falls * 500); }, 700);
        return;
      }
    }

    if (tapTimer > 0) tapTimer -= dt * 4;
    if (flashAnim > 0) flashAnim -= dt * 2.5;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 350 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Tilt angle
    var angle = tilt * Math.PI * 0.3;
    var cos = Math.cos(angle), sin = Math.sin(angle);

    // Safe zone arc indicator
    var safeAngle = SAFE_ZONE * Math.PI * 0.3;
    for (var ai = -30; ai <= 30; ai++) {
      var a = (ai / 30) * Math.PI * 0.35;
      var inSafe = Math.abs(a) <= safeAngle;
      var ax = CX + Math.cos(a - Math.PI / 2) * 180;
      var ay = CY + Math.sin(a - Math.PI / 2) * 180;
      game.draw.circle(ax, ay, 8, inSafe ? C.zone : C.danger, 0.3);
    }

    // Beam
    var lx = CX - cos * BEAM_LEN;
    var ly = CY - sin * BEAM_LEN;
    var rx = CX + cos * BEAM_LEN;
    var ry = CY + sin * BEAM_LEN;
    game.draw.line(lx, ly, rx, ry, C.beam, 18);
    game.draw.line(lx, ly, rx, ry, C.beamHi, 6);

    // Pivot
    game.draw.circle(CX, CY, 22, C.pivot, 0.9);
    game.draw.circle(CX, CY, 12, '#fff', 0.4);

    // Weights (circles at beam ends)
    var wR = 36;
    game.draw.circle(lx + 3, ly + 3, wR, '#000', 0.3);
    game.draw.circle(lx, ly, wR, C.left, 0.9);
    game.draw.circle(rx + 3, ry + 3, wR, '#000', 0.3);
    game.draw.circle(rx, ry, wR, C.right, 0.9);

    // Tilt indicator
    var inSafe = Math.abs(tilt) <= SAFE_ZONE;
    var tiltCol = inSafe ? C.zone : C.danger;

    // Danger flash
    if (!inSafe) {
      var dangerPct = (dangerTimer / DANGER_GRACE);
      game.draw.rect(0, 0, W, H, C.danger, 0.03 + dangerPct * 0.06);
    }

    // Tap hint
    if (tapTimer > 0) {
      if (tapSide < 0) {
        game.draw.circle(W * 0.2, H * 0.85, 40 + tapTimer * 30, C.left, tapTimer * 0.4);
      } else {
        game.draw.circle(W * 0.8, H * 0.85, 40 + tapTimer * 30, C.right, tapTimer * 0.4);
      }
    }
    game.draw.text('← 左', W * 0.22, H * 0.875, { size: 42, color: C.left + '88', bold: true });
    game.draw.text('右 →', W * 0.78, H * 0.875, { size: 42, color: C.right + '88', bold: true });
    game.draw.line(W / 2, H * 0.85, W / 2, H * 0.91, C.ui, 2);

    // Game timer progress
    var gameRatio = Math.min(1, gameTimer / WIN_TIME);
    game.draw.rect(W * 0.08, H * 0.78, W * 0.84, 16, '#0a1520', 0.8);
    game.draw.rect(W * 0.08, H * 0.78, W * 0.84 * gameRatio, 16, C.zone, 0.7);
    game.draw.text(Math.ceil(WIN_TIME - gameTimer) + 's', W / 2, H * 0.76, { size: 32, color: C.zone + 'aa' });

    // Tilt meter
    game.draw.rect(W * 0.08, H * 0.68, W * 0.84, 14, '#0a1520', 0.8);
    var normTilt = (tilt + 1) / 2;
    game.draw.rect(W * 0.08, H * 0.68, W * 0.84 * normTilt, 14, tiltCol, 0.9);
    var safeLeft = W * 0.08 + W * 0.84 * (0.5 - SAFE_ZONE / 2);
    var safeRight = W * 0.08 + W * 0.84 * (0.5 + SAFE_ZONE / 2);
    game.draw.rect(safeLeft - 3, H * 0.68 - 4, 6, 22, C.zone, 0.8);
    game.draw.rect(safeRight - 3, H * 0.68 - 4, 6, 22, C.zone, 0.8);

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.18, { size: 52, color: flashCol, bold: true });
    }

    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 80 + fi * 160, H * 0.955, 28, fi < falls ? C.wrong : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 70);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    updateDriftForce();
  });
})(game);
