// 558-coin-stack.js
// コインスタック — 左右に揺れるアームからコインを落として積み上げる
// 操作: タップでコインを落とす（揺れに合わせてタイミング良く）
// 成功: 20枚のタワーを3回完成  失敗: 5回崩壊 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#1a1008',
    platform: '#2d1a08',
    coin:     '#f59e0b',
    coinHi:   '#fde68a',
    coinSh:   '#92400e',
    arm:      '#444444',
    armHi:    '#666666',
    tower:    '#ffcc00',
    towerSh:  '#aa8800',
    collapse: '#ef4444',
    win:      '#22c55e',
    text:     '#f1f5f9',
    ui:       '#374151'
  };

  var ARM_Y = H * 0.12;
  var ARM_LENGTH = W * 0.4;
  var ARM_SPEED_BASE = 1.5; // radians/sec
  var COIN_R = 44;
  var PLAT_X = W / 2;
  var PLAT_Y = H * 0.88;
  var PLAT_W = 200;

  var armAngle = 0;
  var armOscillation = 0; // oscillation phase
  var armSpeed = ARM_SPEED_BASE;
  var fallingCoin = null;
  var stack = []; // stacked coins with x offsets
  var NEEDED_HEIGHT = 20;
  var completions = 0;
  var NEEDED_COMPLETE = 3;
  var collapses = 0;
  var MAX_COLLAPSE = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.win;
  var collapseAnim = 0;
  var wobbleIntensity = 0; // increases as stack grows

  function getArmTipX() {
    return W / 2 + Math.sin(armOscillation) * ARM_LENGTH;
  }

  function dropCoin() {
    var tipX = getArmTipX();
    fallingCoin = {
      x: tipX,
      y: ARM_Y + 30,
      vy: 0,
      spinning: 0
    };
    game.audio.play('se_tap', 0.3);
  }

  function checkStack() {
    // Stack collapses if any coin is too offset
    for (var i = 1; i < stack.length; i++) {
      var totalX = 0;
      for (var j = 0; j <= i; j++) totalX += stack[j].xOffset;
      if (Math.abs(totalX) > COIN_R * 1.5 + (i - 1) * 4) {
        return false;
      }
    }
    return true;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!fallingCoin) {
      dropCoin();
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
    if (flashAnim > 0) flashAnim -= dt * 2.5;
    if (collapseAnim > 0) collapseAnim -= dt * 2;

    // Arm oscillation
    wobbleIntensity = Math.min(stack.length / 10, 0.8);
    armSpeed = ARM_SPEED_BASE * (1 + stack.length * 0.05);
    armOscillation += armSpeed * dt;
    // Add wobble based on stack height
    armAngle = Math.sin(armOscillation) + Math.sin(armOscillation * 2.3 + 0.5) * wobbleIntensity * 0.3;

    if (fallingCoin) {
      fallingCoin.vy += 900 * dt;
      fallingCoin.y += fallingCoin.vy * dt;
      fallingCoin.spinning += dt * 6;

      var landY = PLAT_Y - stack.length * COIN_R * 1.8 - COIN_R;
      if (fallingCoin.y + COIN_R >= landY) {
        // Land
        var landX = fallingCoin.x;
        var xOffset = landX - PLAT_X;
        var stackXTotal = 0;
        for (var i = 0; i < stack.length; i++) stackXTotal += stack[i].xOffset;
        var relOffset = xOffset - stackXTotal;

        stack.push({ xOffset: relOffset });
        fallingCoin = null;

        // Check stability
        if (!checkStack()) {
          // Collapse!
          collapses++;
          collapseAnim = 0.8;
          flashCol = C.collapse;
          flashAnim = 0.5;
          game.audio.play('se_failure', 0.6);
          for (var pi = 0; pi < 16; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: PLAT_X, y: PLAT_Y - stack.length * COIN_R, vx: Math.cos(ang) * 280, vy: Math.sin(ang) * 280 - 80, life: 0.5, col: C.coin });
          }
          stack = [];
          if (collapses >= MAX_COLLAPSE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        } else {
          game.audio.play('se_tap', 0.4);
          if (stack.length >= NEEDED_HEIGHT) {
            // Complete!
            completions++;
            flashCol = C.win;
            flashAnim = 0.5;
            game.audio.play('se_success', 0.9);
            for (var pi2 = 0; pi2 < 20; pi2++) {
              var ang2 = Math.random() * Math.PI * 2;
              particles.push({ x: PLAT_X, y: PLAT_Y - NEEDED_HEIGHT * COIN_R, vx: Math.cos(ang2) * 300, vy: Math.sin(ang2) * 300 - 120, life: 0.6, col: C.coinHi });
            }
            stack = [];
            if (completions >= NEEDED_COMPLETE && !done) {
              done = true;
              game.audio.play('se_success', 0.9);
              setTimeout(function() { game.end.success(completions * 1000 + Math.ceil(timeLeft) * 100); }, 800);
            }
          }
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 1.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, PLAT_Y, W, H - PLAT_Y, C.platform, 0.8);

    // Arm
    var tipX2 = getArmTipX();
    game.draw.line(W / 2, ARM_Y, tipX2, ARM_Y + 20, C.arm, 20);
    game.draw.line(W / 2, ARM_Y, W / 2, ARM_Y - 80, C.armHi, 16);
    game.draw.circle(W / 2, ARM_Y, 24, C.armHi, 0.9);
    game.draw.circle(tipX2, ARM_Y + 20, 16, C.arm, 0.9);

    // Stack
    var cumX = PLAT_X;
    for (var si = 0; si < stack.length; si++) {
      cumX += stack[si].xOffset;
      var cy = PLAT_Y - (si + 0.5) * COIN_R * 1.8;
      game.draw.circle(cumX + 6, cy + 6, COIN_R, C.coinSh, 0.5);
      game.draw.circle(cumX, cy, COIN_R, C.coin, 0.95);
      game.draw.circle(cumX - 10, cy - 12, COIN_R * 0.35, C.coinHi, 0.4);
      // Height marker
      if (si === stack.length - 1) {
        game.draw.text((si + 1) + '', cumX, cy + 14, { size: 28, color: C.towerSh, bold: true });
      }
    }

    // Progress bar to needed height
    var heightRatio = stack.length / NEEDED_HEIGHT;
    game.draw.rect(PLAT_X - PLAT_W / 2 - 30, PLAT_Y - NEEDED_HEIGHT * COIN_R * 1.8, 16, NEEDED_HEIGHT * COIN_R * 1.8, C.ui, 0.4);
    game.draw.rect(PLAT_X - PLAT_W / 2 - 30, PLAT_Y - heightRatio * NEEDED_HEIGHT * COIN_R * 1.8, 16, heightRatio * NEEDED_HEIGHT * COIN_R * 1.8, C.tower, 0.8);

    // Falling coin
    if (fallingCoin) {
      game.draw.circle(fallingCoin.x + 6, fallingCoin.y + 6, COIN_R, C.coinSh, 0.4);
      game.draw.circle(fallingCoin.x, fallingCoin.y, COIN_R, C.coin, 0.95);
      game.draw.circle(fallingCoin.x - 10, fallingCoin.y - 12, COIN_R * 0.35, C.coinHi, 0.4);
    }

    // Drop guide
    if (!fallingCoin) {
      var dropX = getArmTipX();
      game.draw.line(dropX, ARM_Y + 30, dropX, PLAT_Y - stack.length * COIN_R * 1.8, C.coin, 2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);
    if (collapseAnim > 0) game.draw.text('COLLAPSE!', W / 2, H * 0.6, { size: 72, color: C.collapse, bold: true });

    // Collapse dots
    for (var ci = 0; ci < MAX_COLLAPSE; ci++) {
      game.draw.circle(W / 2 - (MAX_COLLAPSE - 1) * 52 + ci * 104, H * 0.955, 20, ci < collapses ? C.collapse : C.ui, 0.9);
    }

    game.draw.text(completions + ' / ' + NEEDED_COMPLETE, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('高さ: ' + stack.length + '/' + NEEDED_HEIGHT, W / 2, 208, { size: 40, color: C.coin });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.coinSh : C.collapse);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
  });
})(game);
