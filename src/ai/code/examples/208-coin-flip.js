// 208-coin-flip.js
// コインフリップ — コインが回転して止まる瞬間、表か裏かを予測してタップする読み勝ち
// 操作: 左タップで表、右タップで裏を選択
// 成功: 8回中5回以上的中  失敗: 10回連続失敗 or 時間切れ

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06040c',
    coin:    '#f59e0b',
    coinHi:  '#fde68a',
    coinDark:'#92400e',
    heads:   '#22c55e',
    tails:   '#3b82f6',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var COIN_X = W / 2;
  var COIN_Y = H * 0.42;
  var COIN_R = 160;

  var spinning = false;
  var spinSpeed = 0;
  var spinAngle = 0;
  var result = 0; // 0=heads, 1=tails
  var phase = 'idle'; // 'idle'|'spinning'|'reveal'|'wait'
  var phaseTimer = 0;

  var score = 0;
  var needed = 5;
  var total = 0;
  var maxTotal = 10;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var feedback = 0;
  var feedbackOk = false;
  var playerChoice = -1;
  var particles = [];

  function startFlip() {
    result = Math.random() > 0.5 ? 1 : 0;
    spinSpeed = 20 + Math.random() * 10;
    spinAngle = 0;
    phase = 'spinning';
    phaseTimer = 1.5 + Math.random() * 0.8;
    playerChoice = -1;
    game.audio.play('se_tap', 0.3);
  }

  game.onTap(function(tx) {
    if (done) return;
    if (phase === 'idle' || phase === 'wait') {
      startFlip();
    } else if (phase === 'spinning' && playerChoice < 0) {
      playerChoice = tx < W / 2 ? 0 : 1; // left=heads, right=tails
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;
    if (phaseTimer > 0) phaseTimer -= dt;

    if (phase === 'spinning') {
      var timeRatio = Math.max(0, phaseTimer / 2.0);
      spinSpeed = 20 * timeRatio + 2;
      spinAngle += spinSpeed * dt;
      if (phaseTimer <= 0) {
        phase = 'reveal';
        phaseTimer = 1.5;
        // Result
        total++;
        if (playerChoice === result) {
          score++;
          feedbackOk = true; feedback = 1.2;
          game.audio.play('se_success', 0.8);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: COIN_X, y: COIN_Y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.6 });
          }
        } else if (playerChoice >= 0) {
          feedbackOk = false; feedback = 1.0;
          game.audio.play('se_failure', 0.4);
        }
        if (total >= maxTotal && !done) {
          var success = score >= needed;
          setTimeout(function() {
            if (success) { game.end.success(score * 100 + 200); }
            else { game.end.failure(); }
          }, 600);
          done = true;
          game.audio.play(success ? 'se_success' : 'se_failure');
        }
      }
    } else if (phase === 'reveal') {
      if (phaseTimer <= 0) {
        phase = 'wait';
        phaseTimer = 0.5;
      }
    } else if (phase === 'wait') {
      if (phaseTimer <= 0 && !done) {
        phase = 'idle';
        setTimeout(startFlip, 800);
      }
    }

    for (var pi2 = particles.length - 1; pi2 >= 0; pi2--) {
      particles[pi2].x += particles[pi2].vx * dt;
      particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 300 * dt;
      particles[pi2].life -= dt;
      if (particles[pi2].life <= 0) particles.splice(pi2, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Choice zones
    game.draw.rect(0, H * 0.75, W / 2, H * 0.2, C.heads, playerChoice === 0 && phase === 'spinning' ? 0.2 : 0.06);
    game.draw.rect(W / 2, H * 0.75, W / 2, H * 0.2, C.tails, playerChoice === 1 && phase === 'spinning' ? 0.2 : 0.06);
    game.draw.text('表', W * 0.25, H * 0.87, { size: 72, color: C.heads, bold: true });
    game.draw.text('裏', W * 0.75, H * 0.87, { size: 72, color: C.tails, bold: true });
    game.draw.line(W / 2, H * 0.75, W / 2, H * 0.95, '#1a1a1a', 2);

    // Coin
    var squeeze = 1;
    if (phase === 'spinning') {
      squeeze = Math.abs(Math.cos(spinAngle * Math.PI * 2));
    } else if (phase === 'reveal') {
      squeeze = result === 0 ? 1 : 0.1;
    }

    var coinW = COIN_R * squeeze;
    var coinH = COIN_R;
    var coinCol = squeeze > 0.5 ? (result === 0 ? C.heads : C.tails) : C.coinDark;

    game.draw.circle(COIN_X, COIN_Y, coinH + 12, C.coinHi, 0.15);
    // Coin body (using rect for squeeze effect)
    if (coinW > 4) {
      game.draw.rect(COIN_X - coinW, COIN_Y - coinH, coinW * 2, coinH * 2, coinCol, 0.85);
      game.draw.rect(COIN_X - coinW, COIN_Y - coinH, coinW * 2, 20, '#fff', 0.2);
    }
    game.draw.circle(COIN_X, COIN_Y, Math.min(coinW, coinH), C.coin, 0.2);

    // Symbol
    if (phase === 'reveal' || phase === 'wait') {
      var sym = result === 0 ? '★' : '♦';
      var symCol = result === 0 ? C.heads : C.tails;
      game.draw.text(sym, COIN_X, COIN_Y, { size: 100, color: symCol, bold: true });
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 12 * part.life, C.coin, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.heads : C.wrong, feedback * 0.08);
    }

    // Status
    var hint = phase === 'idle' ? 'タップでコインを投げる' : (phase === 'spinning' && playerChoice < 0 ? '左:表 / 右:裏 を選べ！' : '');
    if (hint) game.draw.text(hint, W / 2, H * 0.94, { size: 38, color: C.ui });

    game.draw.text(score + ' / ' + needed + ' 的中', W / 2, 148, { size: 52, color: '#f1f5f9', bold: true });
    game.draw.text(total + ' / ' + maxTotal + '回', W / 2, 208, { size: 40, color: C.ui });

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.coin : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    setTimeout(startFlip, 800);
  });
})(game);
