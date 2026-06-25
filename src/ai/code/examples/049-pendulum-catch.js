// 049-pendulum-catch.js
// ペンデュラムキャッチ — 振り子の先に吊るされた宝石を正確なタイミングで受け取る
// 操作: タップで受け皿を「出す」（一瞬だけ表示）
// 成功: 8個キャッチ  失敗: 4回空振り or 25秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0618',
    pivot:   '#6d28d9',
    rod:     '#7c3aed',
    gem:     '#f59e0b',
    gemHi:   '#fde68a',
    cup:     '#10b981',
    cupHi:   '#6ee7b7',
    catch_c: '#22c55e',
    miss:    '#ef4444',
    ui:      '#475569'
  };

  var PIVOT_X = W / 2;
  var PIVOT_Y = H * 0.18;
  var ROD_LEN = 520;
  var GEM_R = 36;
  var CUP_W = 160;
  var CUP_H = 80;
  var CUP_Y = H * 0.78;

  // Pendulum angle (0 = straight down)
  var angle = -Math.PI * 0.65;  // start pulled to left
  var angleVel = 0;
  var GRAVITY_K = 3.8; // angular acceleration factor

  var cupOpen = false;
  var cupTimer = 0;
  var CUP_DURATION = 0.22; // seconds cup stays out

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 4;
  var timeLeft = 25;
  var done = false;

  var feedback = 0;
  var feedbackOk = false;
  var gemCaught = false; // animation flag

  game.onTap(function(x, y) {
    if (done) return;
    cupOpen = true;
    cupTimer = CUP_DURATION;

    // Check if gem is near cup zone right now
    var gemX = PIVOT_X + Math.sin(angle) * ROD_LEN;
    var gemY = PIVOT_Y + Math.cos(angle) * ROD_LEN;

    var nearCenter = Math.abs(gemX - W / 2) < CUP_W / 2 + GEM_R;
    var nearY = Math.abs(gemY - CUP_Y) < CUP_H / 2 + GEM_R + 60;

    if (nearCenter && nearY) {
      score++;
      feedbackOk = true;
      feedback = 0.5;
      gemCaught = true;
      game.audio.play('se_tap', 0.9);
      if (score >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(score * 20 + Math.ceil(timeLeft) * 8); }, 400);
      }
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.4;
      game.audio.play('se_failure', 0.5);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Pendulum physics
    var angAccel = -GRAVITY_K * Math.sin(angle);
    angleVel += angAccel * dt;
    angleVel *= 0.9995; // tiny damping to keep energy
    angle += angleVel * dt;

    // Speed up over time
    var speedMult = 1 + (25 - timeLeft) * 0.025;
    if (Math.abs(angleVel) < 0.3) {
      // Give it a nudge if too slow
      angleVel += (angle > 0 ? -0.5 : 0.5) * dt;
    }

    if (cupTimer > 0) {
      cupTimer -= dt;
      if (cupTimer <= 0) {
        cupOpen = false;
        gemCaught = false;
      }
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    var gemX = PIVOT_X + Math.sin(angle) * ROD_LEN;
    var gemY = PIVOT_Y + Math.cos(angle) * ROD_LEN;

    // Pendulum shadow trail
    for (var tr = 1; tr <= 4; tr++) {
      var trAngle = angle - angleVel * dt * tr * 3;
      var trX = PIVOT_X + Math.sin(trAngle) * ROD_LEN;
      var trY = PIVOT_Y + Math.cos(trAngle) * ROD_LEN;
      game.draw.circle(trX, trY, GEM_R * (1 - tr * 0.15), C.gem, 0.08 * (5 - tr));
    }

    // Rod
    game.draw.line(PIVOT_X, PIVOT_Y, gemX, gemY, C.rod, 8);

    // Pivot
    game.draw.circle(PIVOT_X, PIVOT_Y, 28, C.pivot);
    game.draw.circle(PIVOT_X, PIVOT_Y, 16, '#a78bfa', 0.7);

    // Gem
    if (!gemCaught) {
      game.draw.circle(gemX, gemY, GEM_R + 8, C.gemHi, 0.2);
      game.draw.circle(gemX, gemY, GEM_R, C.gem);
      game.draw.circle(gemX - 10, gemY - 10, GEM_R * 0.35, '#fff', 0.5);
      // Diamond inner lines
      game.draw.line(gemX - 16, gemY, gemX + 16, gemY, '#fde68a', 2);
      game.draw.line(gemX, gemY - 16, gemX, gemY + 16, '#fde68a', 2);
    }

    // Cup zone indicator (always visible, low opacity)
    game.draw.rect(W / 2 - CUP_W / 2 - 16, CUP_Y - CUP_H / 2 - 8, CUP_W + 32, CUP_H + 16, C.cup, 0.08);

    // Cup (only when open)
    if (cupOpen) {
      var cupAlpha = feedbackOk ? 1.0 : 0.9;
      var cupColor = feedbackOk && feedback > 0 ? C.catch_c : C.cup;
      game.draw.rect(W / 2 - CUP_W / 2 - 8, CUP_Y - CUP_H / 2 - 8, CUP_W + 16, CUP_H + 16, cupColor, cupAlpha * 0.3);
      game.draw.rect(W / 2 - CUP_W / 2, CUP_Y - CUP_H / 2, CUP_W, CUP_H, cupColor, cupAlpha);
      game.draw.rect(W / 2 - CUP_W / 2 + 8, CUP_Y - CUP_H / 2 + 8, CUP_W - 16, 16, C.cupHi, 0.4);
    }

    // Feedback
    if (feedback > 0) {
      if (feedbackOk) {
        game.draw.text('キャッチ！', W / 2, CUP_Y - 120, { size: 72, color: C.catch_c, bold: true });
      } else {
        game.draw.text('空振り', W / 2, CUP_Y - 120, { size: 72, color: C.miss, bold: true });
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 25);
    game.draw.rect(0, 0, W, 72, '#0a0618');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.pivot : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    game.draw.text(score + ' / ' + needed, W / 2, 128, { size: 56, color: C.gemHi, bold: true });

    // Miss pips
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses - 1) / 2) * 64;
      game.draw.circle(mx, 200, 20, m < misses ? C.miss : '#1a0f2e');
    }

    // Guide
    game.draw.text('タップで受け皿を出せ！', W / 2, H - 200, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    // Give pendulum initial velocity
    angleVel = 1.2;
  });
})(game);
