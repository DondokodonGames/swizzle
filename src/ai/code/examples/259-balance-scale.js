// 259-balance-scale.js
// バランスがかり — 天秤に分銅を足して左右の重さをぴったり合わせる直感重量パズル
// 操作: タップで分銅を左右に置く（取り外しも可）
// 成功: 10問の天秤を釣り合わせる  失敗: 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#05030a',
    pole:   '#78716c',
    poleHi: '#a8a29e',
    pan:    '#44403c',
    panHi:  '#78716c',
    weight: '#f59e0b',
    wtHi:   '#fde68a',
    object: '#3b82f6',
    objHi:  '#93c5fd',
    bal:    '#22c55e',
    balHi:  '#86efac',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var WEIGHTS = [1, 2, 3, 5, 10]; // Available weight values

  var BASE_X = W / 2;
  var BASE_Y = H * 0.55;
  var ARM_LEN = 280;
  var ARM_Y = H * 0.38;
  var PAN_Y = H * 0.52;

  var leftPan = { weights: [], total: 0 };
  var rightPan = { weights: [], total: 0 };
  var objectWeight = 0;
  var round = 0;
  var TOTAL_ROUNDS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var balanced = false;
  var balTimer = 0;
  var tiltAngle = 0;

  var WEIGHT_BTN_Y = H * 0.72;
  var WEIGHT_BTN_W = 110;
  var WEIGHT_BTN_H = 90;

  function startRound() {
    round++;
    objectWeight = 1 + Math.floor(Math.random() * 20);
    leftPan = { weights: [], total: objectWeight };
    rightPan = { weights: [], total: 0 };
    balanced = false;
    feedback = '';
  }

  function updateTilt() {
    var diff = rightPan.total - leftPan.total;
    tiltAngle = Math.max(-0.4, Math.min(0.4, diff * 0.02));
    balanced = leftPan.total === rightPan.total;
  }

  game.onTap(function(tx, ty) {
    if (done) return;

    // Check weight buttons
    for (var wi = 0; wi < WEIGHTS.length; wi++) {
      var bx = 40 + wi * (WEIGHT_BTN_W + 16);
      var by = WEIGHT_BTN_Y;
      if (tx >= bx && tx < bx + WEIGHT_BTN_W && ty >= by && ty < by + WEIGHT_BTN_H) {
        var w = WEIGHTS[wi];
        // Add to whichever side was tapped last, or default right
        var addLeft = tx < W / 2 - 80;
        var addRight = tx > W / 2 + 80;
        if (addRight || (!addLeft)) {
          rightPan.weights.push(w);
          rightPan.total += w;
        } else {
          // Remove from left (undo)
          if (leftPan.weights.length > 0) {
            var removed = leftPan.weights.pop();
            leftPan.total -= removed;
          }
        }
        updateTilt();
        game.audio.play('se_tap', 0.3);
        return;
      }
    }

    // Place weight on left pan (remove from right)
    var leftPanX = BASE_X - ARM_LEN + 30;
    var rightPanX = BASE_X + ARM_LEN - 30;
    if (tx < W / 2 && ty > H * 0.45 && ty < H * 0.65) {
      if (rightPan.weights.length > 0) {
        var w2 = rightPan.weights.pop();
        rightPan.total -= w2;
        updateTilt();
        game.audio.play('se_tap', 0.25);
      }
    }

    // Check balanced → advance round
    if (balanced && feedbackTimer <= 0) {
      feedback = 'つりあった！';
      feedbackCol = C.balHi;
      feedbackTimer = 0.8;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W / 2, y: ARM_Y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.6 });
      }
      if (round >= TOTAL_ROUNDS && !done) {
        done = true;
        setTimeout(function() { game.end.success(round * 200 + Math.ceil(timeLeft) * 60); }, 800);
        return;
      }
      setTimeout(function() { if (!done) startRound(); }, 900);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    // Smooth tilt
    var targetTilt = 0;
    var diff2 = rightPan.total - leftPan.total;
    targetTilt = Math.max(-0.4, Math.min(0.4, diff2 * 0.02));
    tiltAngle += (targetTilt - tiltAngle) * 8 * dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Scale pole
    game.draw.line(BASE_X, ARM_Y, BASE_X, BASE_Y, C.pole, 12);
    game.draw.circle(BASE_X, ARM_Y, 14, C.poleHi, 0.9);
    game.draw.circle(BASE_X, BASE_Y, 8, C.pole, 0.9);

    // Arm (tilted)
    var lArmX = BASE_X + Math.cos(Math.PI + tiltAngle) * ARM_LEN;
    var lArmY = ARM_Y + Math.sin(tiltAngle) * ARM_LEN;
    var rArmX = BASE_X + Math.cos(tiltAngle) * ARM_LEN;
    var rArmY = ARM_Y + Math.sin(tiltAngle) * ARM_LEN;
    game.draw.line(lArmX, lArmY, rArmX, rArmY, C.pole, 10);

    // Strings + Pans
    var strLen = 80;
    var lPanX = lArmX, lPanY = lArmY + strLen;
    var rPanX = rArmX, rPanY = rArmY + strLen;
    game.draw.line(lArmX, lArmY, lPanX, lPanY, C.poleHi, 4);
    game.draw.line(rArmX, rArmY, rPanX, rPanY, C.poleHi, 4);
    game.draw.rect(lPanX - 70, lPanY, 140, 16, C.pan, 0.9);
    game.draw.rect(rPanX - 70, rPanY, 140, 16, C.pan, 0.9);

    // Object on left pan
    game.draw.rect(lPanX - 36, lPanY - 44, 72, 44, C.object, 0.9);
    game.draw.text(objectWeight + 'g', lPanX, lPanY - 22 + 10, { size: 36, color: '#fff', bold: true });

    // Weights on right pan
    var stackY = rPanY - 10;
    for (var ri = rightPan.weights.length - 1; ri >= 0; ri--) {
      var wt = rightPan.weights[ri];
      var wh = 30;
      game.draw.rect(rPanX - 30, stackY - wh, 60, wh, C.weight, 0.9);
      game.draw.text(wt + '', rPanX, stackY - wh / 2 + 8, { size: 26, color: '#fff', bold: true });
      stackY -= wh;
    }

    // Balance indicator
    if (balanced) {
      var pulse = 0.5 + 0.5 * Math.abs(Math.sin(elapsed * 8));
      game.draw.circle(BASE_X, ARM_Y, 22, C.balHi, pulse);
    }

    // Weight buttons
    game.draw.text('分銅を乗せる →', W / 2, WEIGHT_BTN_Y - 30, { size: 36, color: C.ui });
    for (var wi2 = 0; wi2 < WEIGHTS.length; wi2++) {
      var bx2 = 40 + wi2 * (WEIGHT_BTN_W + 16);
      game.draw.rect(bx2, WEIGHT_BTN_Y, WEIGHT_BTN_W, WEIGHT_BTN_H, C.weight, 0.7);
      game.draw.text(WEIGHTS[wi2] + 'g', bx2 + WEIGHT_BTN_W / 2, WEIGHT_BTN_Y + WEIGHT_BTN_H / 2 + 14, { size: 46, color: '#fff', bold: true });
    }

    // Total display
    game.draw.text('右: ' + rightPan.total + 'g', rPanX + 90, rPanY, { size: 36, color: C.wtHi });

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.87, { size: 52, color: feedbackCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * (p.life / 0.6), C.balHi, p.life);
    }

    game.draw.text('ROUND ' + round + ' / ' + TOTAL_ROUNDS, W / 2, 148, { size: 54, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.bal : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    startRound();
  });
})(game);
