// 730-coin-flip.js
// コイン投げ — 回転するコインが表か裏かを見極めてタップで当てろ
// 操作: 上半分タップ=表、下半分タップ=裏
// 成功: 20回連続正解or合計30正解  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0602',
    coinA:   '#ca8a04',
    coinAhi: '#fde68a',
    coinB:   '#92400e',
    coinBhi: '#d97706',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#110a04'
  };

  var CX = W / 2;
  var CY = H * 0.42;
  var COIN_R = 180;

  // Coin flip state
  var flipAngle = 0;      // 0..PI*2 rotation
  var flipSpeed = 0;      // current spin speed (rad/s)
  var MIN_SPEED = 1.5;
  var MAX_SPEED = 12.0;
  var flipping = false;
  var currentSide = 'heads'; // 'heads' | 'tails'
  var visibleSide = 'heads'; // what's currently showing

  var score = 0;
  var streak = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var coinAnim = 0;
  var waitTimer = 0;

  function startFlip() {
    flipSpeed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
    flipping = true;
    currentSide = Math.random() < 0.5 ? 'heads' : 'tails';
  }

  game.onTap(function(tx, ty) {
    if (done || flipping || waitTimer > 0) return;
    var guess = ty < H / 2 ? 'heads' : 'tails';
    if (guess === currentSide) {
      score++;
      streak++;
      coinAnim = 0.4;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = guess === 'heads' ? '表！正解！' : '裏！正解！';
      resultTimer = 0.6;
      game.audio.play('se_success', 0.5);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY, vx: Math.cos(pa)*200, vy: Math.sin(pa)*200, life: 0.45,
          col: currentSide === 'heads' ? C.coinAhi : C.coinBhi });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 300 + streak * 100 + Math.ceil(timeLeft) * 80); }, 700);
        return;
      }
      waitTimer = 0.5;
    } else {
      errors++;
      streak = 0;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = (guess === 'heads' ? '表と思った' : '裏と思った') + '…ハズレ！';
      resultTimer = 0.6;
      game.audio.play('se_failure', 0.35);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      waitTimer = 0.5;
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
      if (waitTimer <= 0 && !done) startFlip();
    }

    if (flipping) {
      flipAngle += flipSpeed * dt;
      flipSpeed -= dt * 6;
      if (flipSpeed <= MIN_SPEED) {
        flipSpeed = MIN_SPEED;
        // Coin settling: align to face
        var normalized = ((flipAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        // If landing on target side
        if (currentSide === 'heads') {
          if (normalized > Math.PI * 0.5 && normalized < Math.PI * 1.5) {
            flipAngle += Math.PI - normalized;
          }
        } else {
          if (normalized < Math.PI * 0.5 || normalized > Math.PI * 1.5) {
            flipAngle += Math.PI * 2 - normalized;
          }
        }
        flipping = false;
        flipSpeed = 0;
        game.audio.play('se_tap', 0.12);
      }

      // Determine visible side from angle
      var a = ((flipAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      visibleSide = (a < Math.PI) ? 'heads' : 'tails';
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;
    if (coinAnim > 0) coinAnim -= dt * 2;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Coin visual scale (Y squish simulates 3D flip)
    var a2 = ((flipAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    var scaleY = Math.abs(Math.cos(a2));  // 1 at 0/PI, 0 at PI/2
    var coinH = Math.max(8, COIN_R * scaleY);

    var isHeads = visibleSide === 'heads';
    var coinCol = isHeads ? C.coinA : C.coinB;
    var coinHiCol = isHeads ? C.coinAhi : C.coinBhi;
    var sideLabel = isHeads ? '表' : '裏';

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Instruction zones
    game.draw.text('上: 表', W / 2, H * 0.22, { size: 44, color: C.coinAhi + '66', bold: true });
    game.draw.text('下: 裏', W / 2, H * 0.68, { size: 44, color: C.coinBhi + '66', bold: true });
    game.draw.line(0, H / 2, W, H / 2, '#ffffff0a', 2);

    // Coin shadow
    game.draw.rect(CX - COIN_R + 6, CY - coinH + 6, COIN_R * 2, coinH * 2, '#000', 0.25);

    // Coin body (rect approximating ellipse)
    game.draw.rect(CX - COIN_R, CY - coinH, COIN_R * 2, coinH * 2, coinCol, 0.95);
    // Top edge highlight
    game.draw.rect(CX - COIN_R, CY - coinH, COIN_R * 2, Math.max(4, coinH * 0.15), coinHiCol, 0.6);
    // Side rim effect
    if (coinH > 20) {
      game.draw.rect(CX - COIN_R, CY - coinH, 12, coinH * 2, coinHiCol, 0.3);
      game.draw.rect(CX + COIN_R - 12, CY - coinH, 12, coinH * 2, coinHiCol, 0.3);
    }

    // Label (visible when coin face is large enough)
    if (coinH > COIN_R * 0.4 && !flipping) {
      game.draw.text(sideLabel, CX, CY + 18, { size: 100, color: coinHiCol, bold: true });
    }

    // Coin anim glow
    if (coinAnim > 0) {
      game.draw.rect(CX - COIN_R - 20, CY - COIN_R - 20, (COIN_R + 20) * 2, (COIN_R + 20) * 2, C.correct, coinAnim * 0.2);
    }

    // Streak display
    if (streak >= 3) {
      game.draw.text(streak + '連続！', W * 0.8, CY, { size: 44, color: C.coinAhi, bold: true });
    }

    if (!flipping && !done) {
      game.draw.text('表か裏か？', W / 2, H * 0.78, { size: 48, color: '#ffffff66', bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 48, color: flashCol, bold: true });
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
    startFlip();
  });
})(game);
