// 523-plate-spin.js
// プレートスピン — 倒れそうな皿を左右タップで棒を調整して維持する
// 操作: 左タップで棒を左、右タップで右に動かす
// 成功: 30秒間皿を維持  失敗: 皿が落ちる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080206',
    plate:   '#e2e8f0',
    plateRim:'#94a3b8',
    stick:   '#92400e',
    stickHi: '#d97706',
    danger:  '#ef4444',
    warn:    '#f59e0b',
    safe:    '#22c55e',
    text:    '#f1f5f9',
    ui:      '#374151',
    floor:   '#1e1010'
  };

  var STICK_X = W / 2;
  var STICK_BASE_Y = H * 0.85;
  var STICK_H = 400;
  var PLATE_R = 180;
  var PLATE_THICK = 24;

  // Plate physics: angle from vertical (0 = balanced on top)
  var plateAngle = (Math.random() - 0.5) * 0.2;
  var plateVel = 0;
  var stickX = W / 2;
  var survived = 0;
  var GOAL = 30;
  var done = false;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var wobbleFeed = 0;
  var score = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      stickX = Math.max(W * 0.2, stickX - 60);
    } else {
      stickX = Math.min(W * 0.8, stickX + 60);
    }
    game.audio.play('se_tap', 0.25);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;
      survived = Math.min(elapsed, GOAL);

      // Plate physics
      // Contact point between stick tip and plate bottom
      var stickTipX = stickX;
      var stickTipY = STICK_BASE_Y - STICK_H;
      // Plate center is offset from tip by angle
      var plateCenterX = stickTipX + Math.sin(plateAngle) * PLATE_R * 0.5;

      // Torque based on center of mass offset from support point
      var offset = plateCenterX - stickTipX;
      var torque = offset / PLATE_R * 3.0;

      // Add slight random wobble
      torque += (Math.random() - 0.5) * 0.06;

      plateVel += torque * dt;
      plateVel *= 0.97; // damping
      plateAngle += plateVel * dt;

      // Stick auto-centers slowly
      stickX += (W / 2 - stickX) * dt * 0.3;

      // Fall check
      if (Math.abs(plateAngle) > 0.9) {
        done = true;
        flashAnim = 0.8;
        game.audio.play('se_failure', 0.8);
        for (var pi = 0; pi < 20; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: stickTipX, y: stickTipY, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300 + 100, life: 0.7, col: C.plate });
        }
        setTimeout(function() { game.end.failure(); }, 700);
        return;
      }

      if (elapsed >= GOAL) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.floor(survived) * 200 + Math.round(1 / (Math.abs(plateAngle) + 0.1)) * 50); }, 700);
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 800 * dt;
      particles[pp].life -= dt * 1.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Floor
    game.draw.rect(0, STICK_BASE_Y + 20, W, H - STICK_BASE_Y - 20, C.floor, 0.9);

    // Stick
    game.draw.line(stickX, STICK_BASE_Y, stickX, STICK_BASE_Y - STICK_H, C.stick, 16);
    game.draw.line(stickX, STICK_BASE_Y, stickX, STICK_BASE_Y - STICK_H, C.stickHi, 6);

    // Plate (ellipse simulated with rotated rect)
    var tipX = stickX;
    var tipY = STICK_BASE_Y - STICK_H;
    var pcx = tipX + Math.sin(plateAngle) * 20;
    var pcy = tipY - PLATE_THICK / 2;

    // Plate shadow
    game.draw.circle(tipX, tipY + 4, 30, '#000', 0.4);

    // Plate body (tilted)
    var px1 = pcx - Math.cos(plateAngle) * PLATE_R, py1 = pcy - Math.sin(plateAngle) * PLATE_R * 0.3;
    var px2 = pcx + Math.cos(plateAngle) * PLATE_R, py2 = pcy + Math.sin(plateAngle) * PLATE_R * 0.3;
    game.draw.line(px1, py1, px2, py2, C.plateRim, PLATE_THICK + 8);
    game.draw.line(px1, py1, px2, py2, C.plate, PLATE_THICK);
    game.draw.line(px1 + 20, py1, px2 - 20, py2, '#fff', 4);

    // Tilt indicator
    var tiltRatio = Math.abs(plateAngle) / 0.9;
    var tiltCol = tiltRatio > 0.7 ? C.danger : tiltRatio > 0.4 ? C.warn : C.safe;
    game.draw.rect(W / 2 - 200, H * 0.92, 400, 16, C.ui, 0.4);
    game.draw.rect(W / 2, H * 0.92, plateAngle / 0.9 * 200, 16, tiltCol, 0.9);
    game.draw.line(W / 2, H * 0.915, W / 2, H * 0.94, '#fff', 3);

    // Danger message
    if (tiltRatio > 0.6) {
      var side = plateAngle > 0 ? '右' : '左';
      game.draw.text(side + 'タップ！', W / 2, H * 0.7, { size: 64, color: C.danger, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 16 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.danger, flashAnim * 0.15);

    // Progress
    var ratio = survived / GOAL;
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.7 ? C.safe : C.stickHi);
    game.draw.text(Math.ceil(GOAL - survived) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text(Math.floor(survived) + ' / ' + GOAL + '秒', W / 2, 148, { size: 56, color: C.text, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
  });
})(game);
