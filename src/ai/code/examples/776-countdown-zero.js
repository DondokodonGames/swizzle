// 776-countdown-zero.js
// カウントダウンゼロ — カウントが「0」になった瞬間だけタップせよ
// 操作: タップ — カウントが0になった瞬間（0.3秒以内）
// 成功: 30回ジャスト  失敗: 8回失敗 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020208',
    numCd:   '#818cf8',
    numZero: '#fbbf24',
    numZeroGlow: '#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#080810',
    tick:    '#38bdf8'
  };

  var count = 0;
  var countDown = 0;
  var COUNT_FROM = 0;
  var tickInterval = 0.9;
  var tickTimer = 0;
  var phase = 'counting'; // 'counting' | 'zero' | 'wait'
  var zeroTimer = 0;
  var ZERO_WINDOW = 0.32; // must tap within this window
  var answered = false;
  var waitTimer = 0;
  var WAIT_DUR = 0.38;
  var numBounce = 0; // animation for number change

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var ripples = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function startCount() {
    COUNT_FROM = 2 + Math.floor(Math.random() * 4); // 2-5
    count = COUNT_FROM;
    tickInterval = Math.max(0.5, 0.9 - score * 0.01);
    ZERO_WINDOW = Math.max(0.22, 0.32 - score * 0.003);
    tickTimer = tickInterval;
    phase = 'counting';
    answered = false;
    numBounce = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || answered || waitTimer > 0) return;

    if (phase === 'zero') {
      // Correct!
      var accuracy = 1 - (zeroTimer / ZERO_WINDOW);
      score++;
      answered = true;
      flashCol = C.correct;
      flashAnim = 0.22;
      resultText = accuracy > 0.7 ? 'ジャスト！' : '0！';
      resultTimer = 0.38;
      game.audio.play('se_success', 0.65);
      ripples.push({ x: W / 2, y: H * 0.44, r: 0, maxR: 280, life: 1.0 });
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 380 + Math.ceil(timeLeft) * 120); }, 700);
        return;
      }
      waitTimer = WAIT_DUR;
    } else {
      // Wrong phase
      errors++;
      answered = true;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = phase === 'counting' ? count + '！まだ' + count + 'だ！' : 'タイムオーバー！';
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      waitTimer = WAIT_DUR;
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
      if (waitTimer <= 0 && !done) startCount();
      return;
    }

    if (numBounce > 0) numBounce -= dt * 6;

    if (phase === 'counting') {
      tickTimer -= dt;
      if (tickTimer <= 0) {
        count--;
        numBounce = 0.5;
        game.audio.play('se_tap', 0.06);
        if (count <= 0) {
          phase = 'zero';
          zeroTimer = 0;
          numBounce = 0.8;
        } else {
          tickTimer = tickInterval;
        }
      }
    } else if (phase === 'zero') {
      zeroTimer += dt;
      if (zeroTimer > ZERO_WINDOW && !answered) {
        // Missed the window
        errors++;
        answered = true;
        flashCol = C.wrong;
        flashAnim = 0.3;
        resultText = '遅すぎ！';
        resultTimer = 0.45;
        game.audio.play('se_failure', 0.28);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          waitTimer = WAIT_DUR;
        }
      }
    }

    // Ripples
    for (var ri = ripples.length - 1; ri >= 0; ri--) {
      ripples[ri].r += 400 * dt;
      ripples[ri].life -= dt * 2.5;
      if (ripples[ri].life <= 0) ripples.splice(ri, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Clock face circles
    for (var ci = 0; ci < 3; ci++) {
      game.draw.circle(W / 2, H * 0.44, 260 - ci * 30, ci === 0 ? '#1a1a3a' : '#0d0d1f', 0.6 + ci * 0.1);
    }
    // Tick marks
    for (var ti = 0; ti < 12; ti++) {
      var ta = ti * Math.PI * 2 / 12 - Math.PI / 2;
      var r1 = 230; var r2 = 250;
      game.draw.line(W / 2 + Math.cos(ta) * r1, H * 0.44 + Math.sin(ta) * r1,
                     W / 2 + Math.cos(ta) * r2, H * 0.44 + Math.sin(ta) * r2,
                     C.tick, ti % 3 === 0 ? 5 : 2);
    }

    // Ripples
    for (var ri2 = 0; ri2 < ripples.length; ri2++) {
      var rp = ripples[ri2];
      for (var rj = 0; rj < 20; rj++) {
        if (rj % 3 === 2) continue;
        var ra = rj * Math.PI * 2 / 20;
        game.draw.circle(rp.x + Math.cos(ra) * rp.r, rp.y + Math.sin(ra) * rp.r, 5, C.correct, rp.life * 0.6);
      }
    }

    // Count display
    var displayNum = phase === 'zero' ? 0 : count;
    var isZero = phase === 'zero';
    var bounce = 1.0 + numBounce * 0.15;
    var numSize = Math.floor(280 * bounce);
    var numCol = isZero ? C.numZero : C.numCd;

    if (isZero) {
      game.draw.text('0', W / 2, H * 0.44 + 20, { size: numSize + 40, color: C.numZeroGlow, bold: true });
    }
    game.draw.text('' + displayNum, W / 2, H * 0.44 + 20, { size: numSize, color: numCol, bold: true });

    // Window indicator for zero phase
    if (phase === 'zero' && !answered) {
      var wFrac = Math.max(0, 1 - zeroTimer / ZERO_WINDOW);
      game.draw.rect(W / 2 - 200, H * 0.70, 400, 16, '#1a1a2a', 0.8);
      game.draw.rect(W / 2 - 200, H * 0.70, 400 * wFrac, 16, C.numZero, 0.9);
      game.draw.text('今タップ！', W / 2, H * 0.78, { size: 60, color: C.numZero, bold: true });
    } else if (phase === 'counting' && !answered) {
      game.draw.text('もうすぐ0...', W / 2, H * 0.70, { size: 40, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.84, { size: 56, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    startCount();
  });
})(game);
