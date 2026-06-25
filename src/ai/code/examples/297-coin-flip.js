// 297-coin-flip.js
// コインの予言者 — 投げたコインが着地する前に表か裏かを予言せよ
// 操作: 上スワイプで表、下スワイプで裏を予言
// 成功: 15回連続正解でなく、20回中14回以上正解  失敗: 間違い7回 or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0a02',
    coin1:   '#f59e0b',
    coin1Hi: '#fde68a',
    coin1Lo: '#d97706',
    coin2:   '#a16207',
    coin2Hi: '#ca8a04',
    edge:    '#78350f',
    heads:   '#fbbf24',
    tails:   '#b45309',
    correct: '#22c55e',
    wrong:   '#ef4444',
    predict: '#818cf8',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var coinY = H * 0.45;
  var coinVY = 0;
  var coinX = W / 2;
  var coinPhase = 'idle'; // idle, thrown, landing, result
  var coinFlipAngle = 0;
  var coinScale = 1;
  var isHeads = false;
  var prediction = null; // 'heads' | 'tails' | null
  var landed = false;

  var correct = 0;
  var wrong = 0;
  var total = 0;
  var NEEDED_CORRECT = 14;
  var MAX_TOTAL = 20;
  var MAX_WRONG = 7;
  var done = false;
  var timeLeft = 35;
  var elapsed = 0;
  var resultTimer = 0;
  var particles = [];
  var bounceCount = 0;
  var coinRestY = H * 0.72;

  function throwCoin() {
    coinY = H * 0.72;
    coinVY = -1400;
    coinFlipAngle = 0;
    isHeads = Math.random() < 0.5;
    prediction = null;
    landed = false;
    coinPhase = 'thrown';
    bounceCount = 0;
    game.audio.play('se_tap', 0.2);
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (coinPhase !== 'thrown') return;
    if (prediction !== null) return;
    if (dir === 'up') {
      prediction = 'heads';
      game.audio.play('se_tap', 0.25);
    } else if (dir === 'down') {
      prediction = 'tails';
      game.audio.play('se_tap', 0.25);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    // Coin physics
    if (coinPhase === 'thrown') {
      coinVY += 2200 * dt;
      coinY += coinVY * dt;
      coinFlipAngle += dt * 12;

      if (coinY >= coinRestY && coinVY > 0) {
        bounceCount++;
        if (bounceCount >= 2) {
          // Land
          coinY = coinRestY;
          coinVY = 0;
          coinPhase = 'landing';
          landed = true;
          resultTimer = 0.9;

          // Evaluate
          if (prediction !== null) {
            var correct2 = (prediction === 'heads') === isHeads;
            if (correct2) {
              correct++;
              game.audio.play('se_success', 0.5);
              for (var pi = 0; pi < 8; pi++) {
                var ang = Math.random() * Math.PI * 2;
                particles.push({ x: coinX, y: coinRestY, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180 - 100, life: 0.6, col: C.correct });
              }
            } else {
              wrong++;
              game.audio.play('se_failure', 0.4);
              for (var pi2 = 0; pi2 < 6; pi2++) {
                var ang2 = Math.random() * Math.PI * 2;
                particles.push({ x: coinX, y: coinRestY, vx: Math.cos(ang2) * 150, vy: Math.sin(ang2) * 150, life: 0.5, col: C.wrong });
              }
            }
          } else {
            wrong++; // No prediction = wrong
            game.audio.play('se_failure', 0.4);
          }

          total++;

          if (!done) {
            if (wrong >= MAX_WRONG) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 500);
              return;
            }
            if (total >= MAX_TOTAL) {
              done = true;
              if (correct >= NEEDED_CORRECT) {
                setTimeout(function() { game.end.success(correct * 200 + Math.ceil(timeLeft) * 100); }, 500);
              } else {
                setTimeout(function() { game.end.failure(); }, 500);
              }
              return;
            }
          }
        } else {
          coinVY = -coinVY * 0.4;
          coinY = coinRestY;
          for (var bi = 0; bi < 3; bi++) {
            particles.push({ x: coinX + (Math.random()-0.5)*60, y: coinRestY, vx: (Math.random()-0.5)*100, vy: -100-Math.random()*60, life: 0.3, col: C.coin1Hi });
          }
        }
      }
    } else if (coinPhase === 'landing') {
      resultTimer -= dt;
      coinFlipAngle = isHeads ? 0 : Math.PI; // Show result
      if (resultTimer <= 0 && !done) {
        coinPhase = 'idle';
        setTimeout(throwCoin, 200);
      }
    } else if (coinPhase === 'idle') {
      coinFlipAngle += dt * 0.5;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Table surface
    game.draw.rect(0, H * 0.78, W, H * 0.22, '#0f0a00', 0.9);
    game.draw.rect(0, H * 0.78, W, 8, C.coin1Lo, 0.4);

    // Coin (simplified: stretched circle based on flip angle)
    var scaleX = Math.abs(Math.cos(coinFlipAngle));
    var coinR = 80;
    var coinW = coinR * 2 * Math.max(0.08, scaleX);
    var coinH = coinR * 2;
    var faceUp = Math.cos(coinFlipAngle) > 0;
    var faceCol = faceUp ? C.coin1 : C.coin2;
    var faceHiCol = faceUp ? C.coin1Hi : C.coin2Hi;

    game.draw.circle(coinX, coinY, coinR + 6, C.edge, 0.9);
    game.draw.rect(coinX - coinW / 2, coinY - coinH / 2, coinW, coinH, faceCol, 0.95);
    if (coinW > 20) {
      game.draw.rect(coinX - coinW / 2 + 8, coinY - coinH / 2 + 8, Math.max(0, coinW - 16), coinH - 16, faceHiCol, 0.3);
      var label = faceUp ? '表' : '裏';
      if (coinW > 60) {
        game.draw.text(label, coinX, coinY + 16, { size: 56, color: '#fff', bold: true });
      }
    }

    // Shadow
    game.draw.circle(coinX, coinRestY + 12, 80 * (1 - Math.max(0, (coinRestY - coinY) / 500)), '#000', 0.3);

    // Prediction arrows
    var arrowY = H * 0.2;
    game.draw.text('↑ 表 (上スワイプ)', W / 2, arrowY, { size: 38, color: prediction === 'heads' ? C.predict : C.ui });
    game.draw.text('↓ 裏 (下スワイプ)', W / 2, arrowY + 60, { size: 38, color: prediction === 'tails' ? C.predict : C.ui });

    if (prediction !== null && coinPhase === 'thrown') {
      game.draw.text((prediction === 'heads' ? '表！' : '裏！') + ' を予言', W / 2, H * 0.87, { size: 50, color: C.predict, bold: true });
    }

    if (coinPhase === 'landing') {
      var resultOk = prediction && ((prediction === 'heads') === isHeads);
      game.draw.text(resultOk ? '正解！' : '外れ！', W / 2, H * 0.84, { size: 60, color: resultOk ? C.correct : C.wrong, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 1.5, p.col, p.life * 0.8);
    }

    // Stats
    game.draw.text(correct + '正解 / ' + wrong + 'ミス', W / 2, 148, { size: 52, color: C.text, bold: true });
    game.draw.text('残り ' + (MAX_TOTAL - total) + '回', W / 2, 210, { size: 38, color: C.ui });

    // Wrong dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 22 + wi * 44, H * 0.93, 14, wi < wrong ? C.wrong : '#0c0a00');
    }

    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.coin1 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    setTimeout(throwCoin, 500);
  });
})(game);
