// 350-coin-flip.js
// コインフリップ — 表か裏か予測してタップ、連続正解でスコアアップ
// 操作: タップ左=表、タップ右=裏 で予測
// 成功: 20回正解  失敗: 連続5回ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0c0a08',
    coin:   '#d97706',
    coinHi: '#fbbf24',
    coinShad:'#92400e',
    heads:  '#fef3c7',
    tails:  '#d4d4d4',
    correct:'#22c55e',
    correctHi:'#86efac',
    wrong:  '#ef4444',
    wrongHi:'#fca5a5',
    ui:     '#78716c',
    text:   '#fef3c7'
  };

  var phase = 'predict'; // predict, flipping, result
  var flipTimer = 0;
  var FLIP_TIME = 1.2;
  var coinAngle = 0;
  var coinResult = 0; // 0=heads, 1=tails
  var playerChoice = -1;
  var correct = 0;
  var NEEDED = 20;
  var consecutive = 0;
  var maxConsecutive = 0;
  var consecutiveMiss = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var resultAnim = 0;
  var resultText = '';
  var resultCol = C.correct;
  var combo = 0;
  var comboAnim = 0;

  function startFlip(choice) {
    playerChoice = choice;
    phase = 'flipping';
    flipTimer = 0;
    coinAngle = 0;
    coinResult = Math.random() < 0.5 ? 0 : 1;
    game.audio.play('se_tap', 0.4);
  }

  function finishFlip() {
    phase = 'result';
    var won = (playerChoice === coinResult);
    if (won) {
      correct++;
      combo++;
      maxConsecutive = Math.max(maxConsecutive, combo);
      consecutiveMiss = 0;
      resultText = combo > 3 ? combo + '連続！' : '正解！';
      resultCol = combo > 3 ? C.coinHi : C.correctHi;
      resultAnim = 0.8;
      game.audio.play('se_success', 0.5);
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W/2, y: H*0.45, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life:0.6, col: C.coinHi });
      }
      if (correct >= NEEDED && !done) {
        done = true;
        setTimeout(function() { game.end.success(correct * 200 + maxConsecutive * 100 + Math.ceil(timeLeft) * 80); }, 500);
        return;
      }
    } else {
      combo = 0;
      consecutiveMiss++;
      resultText = 'ハズレ！';
      resultCol = C.wrongHi;
      resultAnim = 0.6;
      game.audio.play('se_failure', 0.3);
      if (consecutiveMiss >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
        return;
      }
    }
    setTimeout(function() { if (!done) phase = 'predict'; }, 700);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase !== 'predict') return;
    var choice = tx < W / 2 ? 0 : 1; // 0=heads(left), 1=tails(right)
    startFlip(choice);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;

    if (phase === 'flipping') {
      flipTimer += dt;
      coinAngle += dt * 15 * (1 + flipTimer * 2);
      if (flipTimer >= FLIP_TIME) {
        finishFlip();
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Split divider
    game.draw.line(W / 2, H * 0.7, W / 2, H * 0.95, C.ui, 2);

    // Choice indicators
    if (phase === 'predict') {
      game.draw.rect(0, H * 0.72, W / 2 - 4, H * 0.21, '#1a1008', 0.7);
      game.draw.rect(W / 2 + 4, H * 0.72, W / 2 - 4, H * 0.21, '#1a1008', 0.7);
      game.draw.text('表', W * 0.25, H * 0.82, { size: 72, color: C.coinHi, bold: true });
      game.draw.text('裏', W * 0.75, H * 0.82, { size: 72, color: C.tails, bold: true });
      game.draw.text('◀ タップ', W * 0.25, H * 0.92, { size: 32, color: C.ui });
      game.draw.text('タップ ▶', W * 0.75, H * 0.92, { size: 32, color: C.ui });
    }

    // Coin
    var coinY = H * 0.45;
    var coinR = 140;

    if (phase === 'flipping') {
      // Spinning coin effect — squish horizontally
      var squish = Math.abs(Math.cos(coinAngle));
      var w2 = coinR * squish;
      var showFace = Math.cos(coinAngle) > 0 ? coinResult : 1 - coinResult;
      game.draw.circle(W / 2, coinY, coinR + 8, C.coinShad, 0.4);
      game.draw.rect(W / 2 - w2, coinY - coinR, w2 * 2, coinR * 2, squish < 0.3 ? C.coin : (showFace === 0 ? C.coinHi : C.tails), 0.9);
      game.draw.circle(W / 2, coinY, 8, '#fff', 0.6);
    } else {
      // Static coin showing result
      var faceColor = (phase === 'result' || phase === 'predict') ? (phase === 'result' ? (coinResult === 0 ? C.coinHi : C.tails) : C.coin) : C.coin;
      game.draw.circle(W / 2, coinY, coinR + 8, C.coinShad, 0.4);
      game.draw.circle(W / 2, coinY, coinR, faceColor, 0.95);
      game.draw.circle(W / 2, coinY, coinR - 20, C.coinShad, 0.2);
      if (phase === 'result') {
        game.draw.text(coinResult === 0 ? '表' : '裏', W / 2, coinY + 24, { size: 80, color: C.bg, bold: true });
      } else if (phase === 'predict') {
        game.draw.text('?', W / 2, coinY + 24, { size: 80, color: C.coinShad, bold: true });
      }
    }

    // Result anim
    if (resultAnim > 0) {
      var isCorrect2 = (playerChoice === coinResult);
      game.draw.text(resultText, W / 2, H * 0.68, { size: 60, color: resultCol, bold: true });
    }

    // Combo
    if (combo > 1) {
      game.draw.text(combo + ' COMBO', W / 2, H * 0.62, { size: 44, color: C.coinHi, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 28 + mi * 56, H * 0.96, 14, mi < consecutiveMiss ? C.wrong : '#1a1a1a');
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text(correct + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.coin : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
  });
})(game);
