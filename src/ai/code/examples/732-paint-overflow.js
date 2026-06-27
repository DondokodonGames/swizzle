// 732-paint-overflow.js
// ペイントオーバーフロー — 溢れる直前の絵の具カップをタップして止めろ
// 操作: タップ — カップの液面が90%〜100%にあるとき成功
// 成功: 25回成功  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030208',
    cup:     '#334155',
    cupHi:   '#64748b',
    paint:   '#3b82f6',
    paintHi: '#93c5fd',
    danger:  '#ef4444',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#040311'
  };

  var PAINT_COLORS = ['#3b82f6','#ef4444','#22c55e','#a855f7','#f97316','#ec4899'];

  var CUP_X = W / 2 - 100;
  var CUP_Y = H * 0.25;
  var CUP_W = 200;
  var CUP_H = 400;

  var FILL_SPEED = 0.08; // fraction per second
  var SAFE_ZONE_LO = 0.88;
  var SAFE_ZONE_HI = 1.00;

  var fillLevel = 0.0;  // 0 = empty, 1 = full/overflowing
  var filling = true;
  var paintCol = PAINT_COLORS[0];
  var drips = [];
  var shakeX = 0, shakeAnim = 0;

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
  var waitTimer = 0;
  var overflowTimer = 0;

  function resetCup() {
    fillLevel = Math.random() * 0.15;  // start low
    FILL_SPEED = Math.min(0.22, 0.08 + score * 0.006);
    filling = true;
    paintCol = PAINT_COLORS[score % PAINT_COLORS.length];
    drips = [];
    shakeX = 0;
    waitTimer = 0;
    overflowTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || !filling || waitTimer > 0) return;
    if (fillLevel >= SAFE_ZONE_LO && fillLevel <= SAFE_ZONE_HI) {
      // Perfect stop!
      filling = false;
      score++;
      flashCol = C.correct;
      flashAnim = 0.35;
      var pct = Math.round(fillLevel * 100);
      resultText = pct + '%でストップ！';
      resultTimer = 0.7;
      game.audio.play('se_success', 0.6);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CUP_X + CUP_W / 2, y: CUP_Y + (1 - fillLevel) * CUP_H,
          vx: Math.cos(pa)*160, vy: Math.sin(pa)*160, life: 0.45, col: paintCol });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 80); }, 700);
      } else {
        waitTimer = 0.6;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      if (fillLevel < SAFE_ZONE_LO) {
        resultText = Math.round(fillLevel * 100) + '% — 早い！';
      } else {
        resultText = '溢れた！';
      }
      resultTimer = 0.6;
      game.audio.play('se_failure', 0.35);
      filling = false;
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        waitTimer = 0.7;
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) resetCup();
    }

    if (filling && !done) {
      fillLevel += FILL_SPEED * dt;
      if (fillLevel >= 1.0) {
        fillLevel = 1.0;
        filling = false;
        overflowTimer = 0.3;
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.5;
        resultText = '溢れた！！';
        resultTimer = 0.7;
        game.audio.play('se_failure', 0.5);
        shakeAnim = 0.3;
        // Overflow drips
        for (var d = 0; d < 5; d++) {
          drips.push({ x: CUP_X + Math.random() * CUP_W, y: CUP_Y, vy: 200 + Math.random()*200, life: 0.5, col: paintCol });
        }
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 700);
        } else {
          waitTimer = 0.8;
        }
      }
    }

    if (shakeAnim > 0) {
      shakeAnim -= dt * 3;
      shakeX = Math.sin(elapsed * 40) * 14 * shakeAnim;
    } else {
      shakeX = 0;
    }

    for (var di = drips.length - 1; di >= 0; di--) {
      drips[di].y += drips[di].vy * dt;
      drips[di].vy += 400 * dt;
      drips[di].life -= dt * 2;
      if (drips[di].life <= 0) drips.splice(di, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var cx = CUP_X + shakeX;
    var fillH = fillLevel * CUP_H;
    var fillTop = CUP_Y + CUP_H - fillH;
    var inZone = fillLevel >= SAFE_ZONE_LO;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Cup
    game.draw.rect(cx + 4, CUP_Y + 4, CUP_W, CUP_H, '#000', 0.25);
    game.draw.rect(cx, CUP_Y, CUP_W, CUP_H, C.cup, 0.9);

    // Paint fill
    if (fillH > 0) {
      game.draw.rect(cx + 4, fillTop, CUP_W - 8, fillH, paintCol, 0.88);
      // Surface highlight
      game.draw.rect(cx + 4, fillTop, CUP_W - 8, 8, C.paintHi, 0.5);
    }

    // Safe zone line
    var safeY = CUP_Y + CUP_H * (1 - SAFE_ZONE_LO);
    game.draw.line(cx - 20, safeY, cx + CUP_W + 20, safeY, C.correct, 4);
    game.draw.text('STOP', cx + CUP_W + 30, safeY + 10, { size: 28, color: C.correct, bold: true });

    // Cup walls (overlay)
    game.draw.rect(cx, CUP_Y, 8, CUP_H, C.cupHi, 0.35);
    game.draw.rect(cx + CUP_W - 8, CUP_Y, 8, CUP_H, C.cupHi, 0.2);
    game.draw.rect(cx, CUP_Y, CUP_W, 8, C.cupHi, 0.35);

    // In-zone glow
    if (inZone && filling) {
      game.draw.rect(cx - 8, CUP_Y - 8, CUP_W + 16, CUP_H + 16, C.correct, 0.12 + 0.06 * Math.sin(elapsed * 10));
    }

    // Fill percentage
    var pct2 = Math.round(fillLevel * 100);
    var pctCol = inZone ? C.correct : (pct2 > 75 ? C.danger : C.text);
    game.draw.text(pct2 + '%', W * 0.2, H * 0.45, { size: 72, color: pctCol, bold: true });

    if (inZone && filling) {
      game.draw.text('タップ！', W / 2, H * 0.78, { size: 56, color: C.correct, bold: true });
    }

    // Drips
    for (var di2 = 0; di2 < drips.length; di2++) {
      game.draw.circle(drips[di2].x + shakeX, drips[di2].y, 14 * drips[di2].life, drips[di2].col, drips[di2].life);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.85, { size: 48, color: flashCol, bold: true });
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
    resetCup();
  });
})(game);
