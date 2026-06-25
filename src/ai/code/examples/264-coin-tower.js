// 264-coin-tower.js
// コインタワー — 揺れるプラットフォームにコインを積み上げる積み木ゲーム
// 操作: タップで上から落ちてくるコインを落とすタイミングを決める
// 成功: 10枚安定して積む  失敗: 3枚落とす or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04030a',
    platform:'#1e3a5f',
    platHi:  '#3b82f6',
    coin:    '#f59e0b',
    coinHi:  '#fde68a',
    coinDark:'#d97706',
    fall:    '#ef4444',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var PLAT_W = 200;
  var PLAT_H = 20;
  var PLAT_Y = H * 0.78;
  var platX = W / 2 - PLAT_W / 2;
  var platVx = 60;
  var platSwing = 120;
  var platCenter = W / 2 - PLAT_W / 2;

  var coins = []; // stacked coins
  var fallingCoin = null;
  var COIN_R = 36;
  var COIN_H_SIZE = 20;
  var drops = 0;
  var MAX_DROPS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var spawnTimer = 0;

  function topOfStack() {
    if (coins.length === 0) return PLAT_Y;
    return PLAT_Y - coins.length * (COIN_H_SIZE + 4);
  }

  function stackCenterX() {
    if (coins.length === 0) return platX + PLAT_W / 2;
    // Average of stacked coins
    var sum = 0;
    for (var i = 0; i < coins.length; i++) sum += coins[i].x;
    return sum / coins.length;
  }

  function spawnFallingCoin() {
    fallingCoin = {
      x: W * 0.15 + Math.random() * W * 0.7,
      y: H * 0.12,
      vy: 0,
      landed: false
    };
  }

  game.onTap(function(tx, ty) {
    if (done || !fallingCoin || fallingCoin.landed) return;
    // Release the coin (let gravity do rest)
    fallingCoin.vy = 200;
    game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    // Platform sway
    platX = platCenter + Math.sin(elapsed * (1.2 + coins.length * 0.08)) * platSwing;

    // Spawn coin
    if (!fallingCoin) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) spawnFallingCoin();
    }

    // Move falling coin (drift horizontally, fall when released)
    if (fallingCoin && !fallingCoin.landed) {
      if (fallingCoin.vy > 0) {
        fallingCoin.y += fallingCoin.vy * dt;
        fallingCoin.vy += 600 * dt;
      } else {
        // Drift toward center
        fallingCoin.x += (W / 2 - fallingCoin.x) * 0.3 * dt;
        fallingCoin.y += 40 * dt;
      }

      // Landing check
      var stackTop = topOfStack();
      var platRight = platX + PLAT_W;
      var landOnPlat = coins.length === 0 &&
        fallingCoin.x >= platX + COIN_R * 0.5 && fallingCoin.x <= platRight - COIN_R * 0.5 &&
        fallingCoin.y + COIN_R >= stackTop - 10;
      var landOnCoin = coins.length > 0 &&
        Math.abs(fallingCoin.x - stackCenterX()) < COIN_R * 1.6 &&
        fallingCoin.y + COIN_R >= stackTop;

      if (landOnPlat || landOnCoin) {
        // Check if balanced
        var offset = Math.abs(fallingCoin.x - (platX + PLAT_W / 2));
        if (offset > PLAT_W * 0.45 || (coins.length > 0 && Math.abs(fallingCoin.x - stackCenterX()) > COIN_R * 1.2)) {
          // Fell off
          drops++;
          feedback = '落ちた！ (' + drops + '/' + MAX_DROPS + ')';
          feedbackCol = C.fall;
          feedbackTimer = 0.7;
          game.audio.play('se_failure', 0.5);
          for (var pi = 0; pi < 5; pi++) {
            var ang = Math.random() * Math.PI + Math.PI / 2;
            particles.push({ x: fallingCoin.x, y: fallingCoin.y, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 100, life: 0.6, col: C.coin });
          }
          fallingCoin = null;
          spawnTimer = 1.2;
          if (drops >= MAX_DROPS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
            return;
          }
        } else {
          coins.push({ x: fallingCoin.x, y: stackTop - COIN_H_SIZE, flash: 0.3 });
          game.audio.play('se_success', 0.5);
          fallingCoin = null;
          spawnTimer = 0.8;
          if (coins.length >= 10 && !done) {
            done = true;
            setTimeout(function() { game.end.success(coins.length * 200 + Math.ceil(timeLeft) * 80); }, 500);
            return;
          }
        }
      } else if (fallingCoin.y > H + 100) {
        // Fell off screen
        drops++;
        game.audio.play('se_failure', 0.4);
        fallingCoin = null;
        spawnTimer = 1.0;
        if (drops >= MAX_DROPS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    // Update stacked coin positions (follow platform)
    for (var ci = 0; ci < coins.length; ci++) {
      coins[ci].y = PLAT_Y - (ci + 1) * (COIN_H_SIZE + 4);
      if (coins[ci].flash > 0) coins[ci].flash -= dt;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Platform
    game.draw.rect(platX, PLAT_Y, PLAT_W, PLAT_H, C.platform, 0.9);
    game.draw.rect(platX, PLAT_Y, PLAT_W, 6, C.platHi, 0.7);
    // Platform support
    game.draw.line(platX + PLAT_W / 2, PLAT_Y + PLAT_H, W / 2, H * 0.92, C.ui, 4);

    // Stacked coins
    for (var ci2 = 0; ci2 < coins.length; ci2++) {
      var c = coins[ci2];
      var col = c.flash > 0 ? C.coinHi : C.coin;
      game.draw.rect(c.x - COIN_R, c.y, COIN_R * 2, COIN_H_SIZE, col, 0.9);
      game.draw.rect(c.x - COIN_R, c.y, COIN_R * 2, 4, C.coinHi, 0.7);
      game.draw.rect(c.x - COIN_R, c.y + COIN_H_SIZE - 4, COIN_R * 2, 4, C.coinDark, 0.5);
    }

    // Falling coin
    if (fallingCoin) {
      var release = fallingCoin.vy > 0;
      var fcol = release ? C.coinHi : C.coin;
      var pulse = release ? 1 : (0.85 + 0.15 * Math.abs(Math.sin(elapsed * 8)));
      game.draw.rect(fallingCoin.x - COIN_R * pulse, fallingCoin.y - COIN_H_SIZE / 2, COIN_R * 2 * pulse, COIN_H_SIZE, fcol, 0.9);
      game.draw.rect(fallingCoin.x - COIN_R * pulse, fallingCoin.y - COIN_H_SIZE / 2, COIN_R * 2 * pulse, 4, '#fff', 0.5);

      if (!release) {
        game.draw.text('TAP', fallingCoin.x, fallingCoin.y + 60, { size: 36, color: C.coinHi, bold: true });
        // Guide line
        game.draw.line(fallingCoin.x, fallingCoin.y, fallingCoin.x, topOfStack() - 10, C.ui, 2);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.rect(p.x - 6, p.y - 4, 12, 8, p.col, p.life);
    }

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.86, { size: 48, color: feedbackCol, bold: true });
    }

    // Drop dots
    for (var di = 0; di < MAX_DROPS; di++) {
      game.draw.circle(W / 2 - (MAX_DROPS - 1) * 28 + di * 56, H * 0.92, 16, di < drops ? C.fall : '#050310');
    }

    game.draw.text(coins.length + ' / 10', W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.coin : C.fall);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 0.5;
  });
})(game);
