// 017-countdown-stop.js
// カウントダウン止め — 数字が0に近づく瞬間を狙う緊張の一発勝負
// 操作: カウントが1のときにタップ
// 成功: 5回「1」でピタリと止める  失敗: 0になるか、2以上でタップ

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0f0a',
    dark:    '#0d1a0d',
    good:    '#22c55e',
    danger:  '#ef4444',
    warn:    '#f59e0b',
    num:     '#dcfce7',
    ui:      '#475569',
    glow:    '#86efac'
  };

  var count = 9;          // starts at 9, counts down
  var tickRate = 1.2;     // seconds per tick
  var tickTimer = tickRate;
  var score = 0;
  var needed = 5;
  var done = false;
  var totalTime = 0;
  var maxTime = 30;

  var feedback = 0;
  var feedbackOk = false;
  var shakeX = 0;

  var phase = 'counting'; // 'counting' | 'wait'
  var waitTimer = 0;

  function startCount() {
    count = 9;
    tickTimer = tickRate;
    phase = 'counting';
    // speed up a bit with each success
    tickRate = Math.max(0.4, 1.2 - score * 0.08);
  }

  game.onTap(function(x, y) {
    if (done || phase !== 'counting') return;

    feedback = 0.45;
    if (count === 1) {
      score++;
      feedbackOk = true;
      game.audio.play('se_tap', 0.9);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 20 + Math.max(0, Math.floor((maxTime - totalTime) * 4)));
        }, 500);
        return;
      }
      phase = 'wait';
      waitTimer = 0.5;
    } else {
      feedbackOk = false;
      shakeX = 18;
      game.audio.play('se_failure', 0.6);
      done = true;
      setTimeout(function() { game.end.failure(); }, 600);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      totalTime += dt;
      if (totalTime >= maxTime) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (phase === 'wait') {
      waitTimer -= dt;
      if (waitTimer <= 0) startCount();
    } else if (phase === 'counting' && !done) {
      tickTimer -= dt;
      if (tickTimer <= 0) {
        count--;
        tickTimer = tickRate;
        if (count <= 0) {
          // reached 0 — failed
          done = true;
          feedback = 0.4;
          feedbackOk = false;
          shakeX = 22;
          game.audio.play('se_failure');
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    if (feedback > 0) feedback -= dt;
    if (shakeX > 0) shakeX *= 0.8;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // concentric rings pulse with countdown urgency
    var urgency = 1 - (count - 1) / 8;
    var pulseR = 360 + 20 * Math.sin(game.time.elapsed * (3 + urgency * 5));
    game.draw.circle(W / 2, H * 0.45, pulseR, count <= 2 ? C.danger : C.good, 0.06 + urgency * 0.08);
    game.draw.circle(W / 2, H * 0.45, pulseR * 0.65, count <= 2 ? C.danger : C.good, 0.04);

    // timer bar (remaining time)
    var timeRatio = Math.max(0, 1 - totalTime / maxTime);
    game.draw.rect(0, 0, W, 72, '#0d150d');
    game.draw.rect(0, 0, W * timeRatio, 72, timeRatio > 0.3 ? '#166534' : C.danger);
    game.draw.text(Math.ceil(maxTime - totalTime) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // score pips
    for (var s = 0; s < needed; s++) {
      var sx = W / 2 + (s - (needed - 1) / 2) * 80;
      game.draw.circle(sx, 128, 26, s < score ? C.good : C.dark);
      if (s < score) game.draw.circle(sx, 128, 14, '#fff', 0.5);
    }

    // big number
    var ox = shakeX * (Math.random() - 0.5) * 2;
    var numColor = count <= 1 ? C.good : (count <= 3 ? C.warn : (count <= 2 ? C.danger : C.num));
    if (count <= 2) numColor = C.danger;
    if (count === 1) numColor = C.good;

    var numSize = 520 + (count === 1 ? 40 * Math.sin(game.time.elapsed * 10) : 0);
    game.draw.text(count > 0 ? String(count) : '0', W / 2 + ox, H * 0.45, {
      size: numSize,
      color: numColor,
      bold: true
    });

    // speed indicator (tick rate bar at bottom)
    var speedFill = (tickRate - 0.4) / (1.2 - 0.4);
    game.draw.rect(W * 0.15, H - 310, W * 0.7, 20, '#1a2a1a');
    game.draw.rect(W * 0.15, H - 310, W * 0.7 * speedFill, 20, C.ui);
    game.draw.text('スピード', W / 2, H - 340, { size: 36, color: C.ui });

    // feedback
    if (feedback > 0) {
      var prog = 1 - feedback / 0.45;
      if (feedbackOk) {
        game.draw.text('ピタリ！', W / 2, H * 0.45 - 400 - prog * 80, { size: 88, color: C.good, bold: true });
      } else {
        game.draw.text('ハズレ！', W / 2 + ox, H * 0.45 - 360, { size: 80, color: C.danger, bold: true });
      }
    }

    // guide
    game.draw.text('「1」でタップ！', W / 2, H - 220, { size: 56, color: C.ui });
    game.draw.text('0になったら失敗', W / 2, H - 155, { size: 38, color: '#334d33' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    startCount();
  });
})(game);
