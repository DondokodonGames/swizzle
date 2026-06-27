// 736-hot-potato.js
// ホットポテト — 熱いジャガイモを持ちすぎる前にタップして投げ捨てろ
// 操作: タップ — 持ち時間が限界に達する前に投げる
// 成功: 30回投げる  失敗: 10回爆発 or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0402',
    potato:  '#a16207',
    potatoHi:'#fbbf24',
    hot:     '#ef4444',
    cool:    '#22c55e',
    smoke:   '#78716c',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#140803'
  };

  var CX = W / 2;
  var CY = H * 0.42;
  var POTATO_R = 80;

  var heatLevel = 0.0;     // 0 = cool, 1 = explode
  var HEAT_RATE = 0.18;    // per second
  var DANGER_ZONE = 0.75;  // must throw before this
  var thrown = false;
  var throwAnim = 0;
  var throwVx = 0, throwVy = 0;
  var potatoX = CX, potatoY = CY;
  var waitTimer = 0;
  var smokeParticles = [];

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function resetPotato() {
    heatLevel = Math.random() * 0.15;
    HEAT_RATE = Math.min(0.35, 0.18 + score * 0.006);
    thrown = false;
    throwAnim = 0;
    potatoX = CX;
    potatoY = CY;
    waitTimer = 0;
    smokeParticles = [];
  }

  game.onTap(function(tx, ty) {
    if (done || thrown || waitTimer > 0) return;
    if (heatLevel < DANGER_ZONE) {
      // Good throw — before danger zone
      thrown = true;
      var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      throwVx = Math.cos(angle) * 800;
      throwVy = Math.sin(angle) * 800;
      throwAnim = 0.5;
      score++;
      flashCol = C.correct;
      flashAnim = 0.25;
      var pct = Math.round(heatLevel * 100);
      resultText = pct + '℃ で投げた！';
      resultTimer = 0.5;
      game.audio.play('se_tap', 0.12);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: CX, y: CY, vx: Math.cos(pa)*180, vy: Math.sin(pa)*180, life: 0.4, col: C.potatoHi });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 250 + Math.ceil(timeLeft) * 100); }, 700);
        return;
      }
      waitTimer = 0.5;
    } else {
      // Too hot already! (this case shouldn't trigger here, handled in update)
      // But if they're in danger zone and throw, let them — still better than exploding
      thrown = true;
      var angle2 = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      throwVx = Math.cos(angle2) * 800;
      throwVy = Math.sin(angle2) * 800;
      throwAnim = 0.5;
      // Late but saved it
      score++;
      flashCol = C.correct;
      flashAnim = 0.25;
      resultText = 'ギリギリセーフ！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.4);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 200 + Math.ceil(timeLeft) * 80); }, 700);
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
      if (waitTimer <= 0) resetPotato();
    }

    if (!thrown && !done) {
      heatLevel += HEAT_RATE * dt;
      if (heatLevel >= 1.0) {
        heatLevel = 1.0;
        thrown = true;
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.5;
        resultText = '爆発！！';
        resultTimer = 0.7;
        game.audio.play('se_failure', 0.55);
        for (var e = 0; e < 12; e++) {
          var ea = Math.random() * Math.PI * 2;
          particles.push({ x: CX, y: CY, vx: Math.cos(ea)*300, vy: Math.sin(ea)*300, life: 0.6, col: C.hot });
        }
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 700);
        } else {
          waitTimer = 0.9;
        }
      }
    }

    if (thrown && throwAnim > 0) {
      throwAnim -= dt;
      potatoX += throwVx * dt;
      potatoY += throwVy * dt;
      throwVy += 600 * dt;
    }

    // Smoke particles when hot
    if (!thrown && heatLevel > 0.4) {
      if (Math.random() < 0.3) {
        smokeParticles.push({ x: CX + (Math.random() - 0.5) * 40, y: CY - POTATO_R, vx: (Math.random() - 0.5) * 30, vy: -50 - Math.random() * 40, life: 0.6 });
      }
    }
    for (var spi = smokeParticles.length - 1; spi >= 0; spi--) {
      smokeParticles[spi].x += smokeParticles[spi].vx * dt;
      smokeParticles[spi].y += smokeParticles[spi].vy * dt;
      smokeParticles[spi].life -= dt * 1.5;
      if (smokeParticles[spi].life <= 0) smokeParticles.splice(spi, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var heatRatio = heatLevel;
    var isDanger = heatRatio >= DANGER_ZONE;
    var heatCol = isDanger ? C.hot : (heatRatio > 0.5 ? '#f97316' : C.potato);

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Heat meter (arc/bar on left)
    var meterX = 80, meterY0 = H * 0.20, meterH = H * 0.50;
    game.draw.rect(meterX - 24, meterY0, 48, meterH, '#1c0a04', 0.9);
    var fillH = heatRatio * meterH;
    game.draw.rect(meterX - 20, meterY0 + meterH - fillH, 40, fillH, heatCol, 0.9);
    // Danger zone line
    var dangerY = meterY0 + (1 - DANGER_ZONE) * meterH;
    game.draw.line(meterX - 32, dangerY, meterX + 32, dangerY, C.hot, 4);
    game.draw.text('危', meterX, meterY0 - 24, { size: 30, color: C.hot });
    game.draw.text('安', meterX, meterY0 + meterH + 30, { size: 30, color: C.cool });

    // Smoke
    for (var spi2 = 0; spi2 < smokeParticles.length; spi2++) {
      var sp = smokeParticles[spi2];
      game.draw.circle(sp.x, sp.y, 18 * sp.life, C.smoke, sp.life * 0.5);
    }

    // Potato
    if (!thrown || throwAnim > 0) {
      var px = thrown ? potatoX : CX;
      var py = thrown ? potatoY : CY;
      var pulse = isDanger ? (0.92 + 0.08 * Math.sin(elapsed * 15)) : 1.0;
      game.draw.circle(px + 5, py + 5, POTATO_R, '#000', 0.25);
      game.draw.circle(px, py, POTATO_R * pulse, heatCol, 0.9);
      game.draw.circle(px - POTATO_R * 0.3, py - POTATO_R * 0.35, POTATO_R * 0.22, '#fff', 0.3);
      // Eyes/bump texture
      game.draw.circle(px + 20, py - 20, 8, '#00000033', 1);
      game.draw.circle(px - 25, py + 10, 6, '#00000022', 1);
    }

    // Heat % display
    game.draw.text(Math.round(heatRatio * 100) + '°', W * 0.75, H * 0.45, { size: 80, color: heatCol, bold: true });

    if (!thrown && isDanger) {
      game.draw.text('今すぐ投げろ！', W / 2, H * 0.78, { size: 52, color: C.hot, bold: true });
    } else if (!thrown) {
      game.draw.text('タップで投げる', W / 2, H * 0.78, { size: 44, color: '#ffffff44' });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 52, color: flashCol, bold: true });
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
    resetPotato();
  });
})(game);
