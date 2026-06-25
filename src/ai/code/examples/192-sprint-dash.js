// 192-sprint-dash.js
// スプリントダッシュ — 左右交互に素早くタップしてランナーを加速させる
// 操作: 左半分/右半分を交互にタップ
// 成功: 100mを最速で走る  失敗: 15秒以内に完走できない

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060404',
    track:   '#1a1010',
    lane:    '#2a1a0a',
    runner:  '#f59e0b',
    runnerHi:'#fde68a',
    ground:  '#3d2010',
    finish:  '#22c55e',
    left:    '#3b82f6',
    right:   '#ef4444',
    ui:      '#334155'
  };

  var RUNNER_Y = H * 0.6;
  var progress = 0; // 0 to 1 (100m)
  var speed = 0;
  var MAX_SPEED = 0.85; // progress per second
  var DECAY = 0.6; // speed decay per second
  var TAP_BOOST = 0.3;

  var lastTapSide = null; // 'left' or 'right'
  var combo = 0;
  var COMBO_BONUS = 0.04;

  var done = false;
  var elapsed = 0;
  var TIME_LIMIT = 15;
  var completionTime = 0;
  var particles = [];
  var legPhase = 0;

  var leftFlash = 0, rightFlash = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    var side = tx < W / 2 ? 'left' : 'right';
    if (side === lastTapSide) {
      // Same side — penalty
      combo = 0;
      speed = Math.max(0, speed - 0.05);
      game.audio.play('se_failure', 0.2);
    } else {
      combo++;
      var boost = TAP_BOOST + combo * COMBO_BONUS;
      speed = Math.min(MAX_SPEED, speed + boost);
      lastTapSide = side;
      game.audio.play('se_tap', 0.4 + combo * 0.03);
      if (side === 'left') leftFlash = 0.2;
      else rightFlash = 0.2;

      // Particles at feet
      var runX = W * 0.5;
      var runY = RUNNER_Y + 60;
      for (var pi = 0; pi < 3; pi++) {
        particles.push({ x: runX - 20 + Math.random() * 40, y: runY, vx: -80 - Math.random() * 80, vy: -60 - Math.random() * 60, life: 0.3 });
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) elapsed += dt;
    if (leftFlash > 0) leftFlash -= dt;
    if (rightFlash > 0) rightFlash -= dt;

    if (!done) {
      speed = Math.max(0, speed - DECAY * dt);
      progress = Math.min(1, progress + speed * dt);
      legPhase += speed * dt * 8;

      if (progress >= 1) {
        done = true;
        completionTime = elapsed;
        game.audio.play('se_success');
        var timeScore = Math.max(0, Math.ceil((TIME_LIMIT - completionTime) * 100));
        setTimeout(function() { game.end.success(timeScore + combo * 20 + 300); }, 400);
      } else if (elapsed >= TIME_LIMIT) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 400 * dt;
      particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Track (scrolling)
    var scrollX = progress * W * 3;
    for (var lx = 0; lx < W + 200; lx += 80) {
      var tx2 = ((lx - scrollX) % (W + 200) + (W + 200)) % (W + 200) - 100;
      game.draw.rect(tx2, RUNNER_Y + 80, 60, 12, C.lane, 0.5);
    }
    game.draw.rect(0, RUNNER_Y + 68, W, 100, C.ground, 0.85);
    game.draw.rect(0, RUNNER_Y + 68, W, 12, '#5d3010', 0.8);

    // Finish line indicator
    var finishScreenX = W * 0.9 + (1 - progress) * W * 3;
    if (finishScreenX < W + 100) {
      var fsx = Math.min(W + 20, finishScreenX);
      game.draw.rect(fsx - 8, RUNNER_Y - 40, 16, 120, C.finish, 0.8);
      for (var fy = RUNNER_Y - 40; fy < RUNNER_Y + 80; fy += 20) {
        game.draw.rect(fsx - 8, fy, 16, 10, '#fff', (fy % 40 === 0) ? 0.7 : 0);
      }
    }

    // Runner
    var runX2 = W / 2;
    var runY2 = RUNNER_Y;
    var legA = Math.sin(legPhase) * 24;
    var legB = -legA;

    // Body
    game.draw.circle(runX2, runY2, 36, C.runnerHi, 0.3);
    game.draw.circle(runX2, runY2, 28, C.runner, 0.9);
    // Head
    game.draw.circle(runX2, runY2 - 50, 22, C.runner, 0.9);
    // Legs
    game.draw.line(runX2 - 10, runY2 + 24, runX2 - 10 + legA, runY2 + 70, C.runnerHi, 8);
    game.draw.line(runX2 + 10, runY2 + 24, runX2 + 10 + legB, runY2 + 70, C.runnerHi, 8);

    // Particles (dust)
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8 * part.life * 3, '#8b4513', part.life);
    }

    // Left / Right tap zones
    game.draw.rect(0, H * 0.75, W / 2, H * 0.2, C.left, leftFlash > 0 ? 0.3 : 0.08);
    game.draw.rect(W / 2, H * 0.75, W / 2, H * 0.2, C.right, rightFlash > 0 ? 0.3 : 0.08);
    game.draw.text('←', W * 0.25, H * 0.85, { size: 72, color: C.left, bold: true });
    game.draw.text('→', W * 0.75, H * 0.85, { size: 72, color: C.right, bold: true });
    game.draw.text('交互にタップ！', W / 2, H * 0.93, { size: 38, color: C.ui });

    // Progress bar (100m visual)
    var pRatio = progress;
    game.draw.rect(0, H * 0.13, W, 24, '#1a1010', 0.8);
    game.draw.rect(0, H * 0.13, W * pRatio, 24, speed > 0.5 ? C.runner : '#6b7280');
    game.draw.text(Math.round(progress * 100) + 'm', W / 2, H * 0.19, { size: 44, color: '#f1f5f9', bold: true });

    // Combo
    if (combo > 2) {
      game.draw.text('x' + combo + ' コンボ', W / 2, H * 0.25, { size: combo > 8 ? 56 : 44, color: '#fde68a', bold: true });
    }

    var ratio = Math.max(0, (TIME_LIMIT - elapsed) / TIME_LIMIT);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#22c55e' : '#ef4444');
    game.draw.text(Math.max(0, TIME_LIMIT - elapsed).toFixed(1) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.35); });
})(game);
