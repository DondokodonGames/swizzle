// 719-pendulum-bell.js
// 振り子の鐘 — 加速する振り子が端まで来た瞬間にタップして鐘を鳴らせ
// 操作: タップ — 振り子が左右の光るゾーンにいるとき命中
// 成功: 25回命中  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#050312',
    rope:    '#94a3b8',
    bob:     '#7c3aed',
    bobHi:   '#c4b5fd',
    zone:    '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#070520'
  };

  var PIVOT_X = W / 2;
  var PIVOT_Y = 200;
  var LENGTH = 520;
  var BOB_R = 44;
  var MAX_ANGLE = 0.9;
  var ZONE_THRESH = 0.16;

  var theta = MAX_ANGLE;
  var omega = 0;
  var GRAVITY = 2.2;
  var speedMult = 1.0;

  var score = 0;
  var NEEDED = 25;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var bellFlash = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    var inZone = Math.abs(theta) > (MAX_ANGLE - ZONE_THRESH);
    if (inZone) {
      score++;
      bellFlash = 0.5;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = '鐘！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.5);
      var bx = PIVOT_X + Math.sin(theta) * LENGTH;
      var by = PIVOT_Y + Math.cos(theta) * LENGTH;
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: bx, y: by, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.45, col: C.bobHi });
      }
      speedMult = Math.min(2.0, 1.0 + score * 0.044);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 80); }, 700);
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = '早い！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }
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

    var dtP = dt * speedMult;
    omega += -GRAVITY * Math.sin(theta) * dtP;
    theta += omega * dtP;
    if (theta > MAX_ANGLE)  { theta = MAX_ANGLE;  omega = -Math.abs(omega); }
    if (theta < -MAX_ANGLE) { theta = -MAX_ANGLE; omega =  Math.abs(omega); }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (bellFlash > 0) bellFlash -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var bobX = PIVOT_X + Math.sin(theta) * LENGTH;
    var bobY = PIVOT_Y + Math.cos(theta) * LENGTH;
    var inZone = Math.abs(theta) > (MAX_ANGLE - ZONE_THRESH);

    var lzX = PIVOT_X - Math.sin(MAX_ANGLE) * LENGTH;
    var lzY = PIVOT_Y + Math.cos(MAX_ANGLE) * LENGTH;
    var rzX = PIVOT_X + Math.sin(MAX_ANGLE) * LENGTH;
    var rzY = lzY;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Zone glows at extremes
    var lOn = inZone && theta < 0;
    var rOn = inZone && theta > 0;
    game.draw.circle(lzX, lzY, BOB_R + 28, C.zone, lOn ? 0.38 : 0.1);
    game.draw.circle(rzX, rzY, BOB_R + 28, C.zone, rOn ? 0.38 : 0.1);
    game.draw.text('◎', lzX, lzY + 16, { size: 46, color: lOn ? C.zone : C.zone + '44', bold: true });
    game.draw.text('◎', rzX, rzY + 16, { size: 46, color: rOn ? C.zone : C.zone + '44', bold: true });

    // Instruction
    game.draw.text('端でタップ！', W / 2, H * 0.82, { size: 40, color: '#ffffff33' });
    if (speedMult > 1.08) {
      game.draw.text('×' + speedMult.toFixed(1), W / 2, H * 0.77, { size: 36, color: '#fbbf24', bold: true });
    }

    // Rope
    game.draw.line(PIVOT_X, PIVOT_Y, bobX, bobY, C.rope, 5);

    // Pivot point
    game.draw.circle(PIVOT_X, PIVOT_Y, 18, '#334155', 0.9);

    // Bell ring glow
    if (bellFlash > 0) {
      game.draw.circle(bobX, bobY, BOB_R + 36, C.bobHi, bellFlash * 0.42);
    }

    // Bob
    game.draw.circle(bobX + 5, bobY + 5, BOB_R, '#000', 0.25);
    game.draw.circle(bobX, bobY, BOB_R, inZone ? C.bobHi : C.bob, 0.92);
    game.draw.circle(bobX - BOB_R * 0.28, bobY - BOB_R * 0.32, BOB_R * 0.2, '#fff', 0.3);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 60, color: flashCol, bold: true });
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
  });
})(game);
