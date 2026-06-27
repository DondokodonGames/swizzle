// 781-orbit-catch.js
// オービットキャッチ — 軌道上を回るボールを正確な瞬間にキャッチせよ
// 操作: タップ — ゲートを開けてボールをキャッチ（ゲートの位置でタップ）
// 成功: 35回キャッチ  失敗: 10回逃す or 80秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#03080f',
    orbit:   '#0e2d4a',
    ball:    '#38bdf8',
    ballHi:  '#e0f2fe',
    gate:    '#22c55e',
    gateOff: '#1e293b',
    catch:   '#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050a12'
  };

  var CX = W / 2;
  var CY = H * 0.45;
  var ORBIT_R = 280;
  var GATE_SIZE = 0.18; // radians, gate opening angle
  var GATE_ANGLE = -Math.PI / 2; // gate at top initially, then player moves it

  var ballAngle = 0;
  var ballSpeed = 1.8; // rad/sec

  var gateAngle = Math.PI; // player positions gate by tapping
  var gateOpen = false;
  var gateTimer = 0;
  var GATE_DUR = 0.22;

  var score = 0;
  var NEEDED = 35;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 80;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var ballCaught = false;
  var catchAnim = 0;

  // Track ball lap: when ball crosses gate zone, check if gate open
  var lastBallInGate = false;

  game.onTap(function(tx, ty) {
    if (done) return;
    // Move gate to tap position on orbit
    var dx = tx - CX;
    var dy = ty - CY;
    gateAngle = Math.atan2(dy, dx);
    // Open gate briefly
    gateOpen = true;
    gateTimer = GATE_DUR;
    game.audio.play('se_tap', 0.07);
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

    // Gate timer
    if (gateTimer > 0) {
      gateTimer -= dt;
      if (gateTimer <= 0) {
        gateOpen = false;
      }
    }

    // Ball movement
    ballSpeed = Math.min(4.5, 1.8 + score * 0.07);
    ballAngle += ballSpeed * dt;
    if (ballAngle > Math.PI * 2) ballAngle -= Math.PI * 2;

    // Check if ball is in gate zone
    var angleDiff = ballAngle - gateAngle;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    var inGateZone = Math.abs(angleDiff) < GATE_SIZE;

    if (inGateZone && !lastBallInGate) {
      // Ball just entered gate zone
      if (gateOpen) {
        // Caught!
        score++;
        catchAnim = 0.5;
        flashCol = C.correct;
        flashAnim = 0.2;
        resultText = 'キャッチ！';
        resultTimer = 0.38;
        game.audio.play('se_success', 0.6);
        for (var p = 0; p < 7; p++) {
          var pa = Math.random() * Math.PI * 2;
          var bx = CX + Math.cos(ballAngle) * ORBIT_R;
          var by = CY + Math.sin(ballAngle) * ORBIT_R;
          particles.push({ x: bx, y: by, vx: Math.cos(pa) * (120 + Math.random() * 120), vy: Math.sin(pa) * (120 + Math.random() * 120), life: 0.4, col: C.catch });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 300 + Math.ceil(timeLeft) * 140); }, 700);
        }
      } else {
        // Missed — ball passed gate zone without open gate
        missed++;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = '逃した！';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.3);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }
    lastBallInGate = inGateZone;

    if (catchAnim > 0) catchAnim -= dt * 3;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Orbit ring
    for (var oi = 0; oi < 60; oi++) {
      var oa = oi * Math.PI * 2 / 60;
      var angleDiffG = oa - gateAngle;
      while (angleDiffG > Math.PI) angleDiffG -= Math.PI * 2;
      while (angleDiffG < -Math.PI) angleDiffG += Math.PI * 2;
      var isGate = Math.abs(angleDiffG) < GATE_SIZE;
      var col = isGate ? (gateOpen ? C.gate : C.gateOff) : C.orbit;
      var alpha = isGate ? 0.9 : 0.4;
      game.draw.circle(CX + Math.cos(oa) * ORBIT_R, CY + Math.sin(oa) * ORBIT_R, isGate ? 9 : 5, col, alpha);
    }

    // Center
    game.draw.circle(CX, CY, 24, C.orbit, 0.6);
    game.draw.circle(CX, CY, 12, C.ball, 0.3);

    // Gate indicator (arrow from center)
    var gx = CX + Math.cos(gateAngle) * ORBIT_R;
    var gy = CY + Math.sin(gateAngle) * ORBIT_R;
    if (gateOpen) {
      game.draw.circle(gx, gy, 28 + catchAnim * 20, C.gate, 0.15 + catchAnim * 0.3);
    }

    // Ball
    var bx = CX + Math.cos(ballAngle) * ORBIT_R;
    var by = CY + Math.sin(ballAngle) * ORBIT_R;
    // Trail
    for (var ti = 1; ti <= 5; ti++) {
      var ta = ballAngle - ti * ballSpeed * 0.025;
      var tx2 = CX + Math.cos(ta) * ORBIT_R;
      var ty2 = CY + Math.sin(ta) * ORBIT_R;
      game.draw.circle(tx2, ty2, 10 - ti * 1.5, C.ball, 0.3 - ti * 0.05);
    }
    game.draw.circle(bx + 3, by + 3, 22, '#000', 0.3);
    game.draw.circle(bx, by, 22, C.ball, 0.95);
    game.draw.circle(bx - 6, by - 6, 7, C.ballHi, 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (!done) {
      game.draw.text('タップ→ゲート移動＆開放', W / 2, H * 0.87, { size: 34, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.18, { size: 52, color: flashCol, bold: true });
    }

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < missed ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 80);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
