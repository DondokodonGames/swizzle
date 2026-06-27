// 750-laser-safe.js
// レーザー回避 — 点滅するレーザーの安全地帯をタップせよ
// 操作: タップ — アクティブなレーザーが当たらない半分の画面側をタップ
// 成功: 35回成功  失敗: 10回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06020e',
    laser:   '#ef4444',
    laserHi: '#fca5a5',
    safe:    '#22c55e',
    safeZone:'#14532d',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0e040e'
  };

  // 4 laser emitters at the 4 corners
  // Each fires a laser: top-left fires right+down, etc.
  // Active laser covers one half of the screen (left or right)
  // Player must tap the OTHER half

  var laserSide = -1; // -1=left laser active (tap right), 1=right laser active (tap left)
  var showTimer = 0;
  var SHOW_DUR  = 0.9;
  var waitTimer = 0;
  var WAIT_DUR  = 0.3;
  var answered  = false;
  var scanLine  = 0; // animated scan line across the laser side

  var score = 0;
  var NEEDED = 35;
  var errors = 0;
  var MAX_ERR = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function nextRound() {
    laserSide = Math.random() < 0.5 ? -1 : 1;
    SHOW_DUR = Math.max(0.42, 0.9 - score * 0.011);
    showTimer = SHOW_DUR;
    answered = false;
    scanLine = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || answered || showTimer <= 0 || waitTimer > 0) return;
    var tappedSide = tx < W / 2 ? -1 : 1;
    answered = true;
    if (tappedSide !== laserSide) {
      // Correct — tapped the safe side
      score++;
      flashCol = C.correct;
      flashAnim = 0.22;
      resultText = '回避！';
      resultTimer = 0.35;
      game.audio.play('se_tap', 0.1);
      var cx = tappedSide === -1 ? W * 0.25 : W * 0.75;
      for (var p = 0; p < 5; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: cx, y: H / 2, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.35, col: C.safe });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 220 + Math.ceil(timeLeft) * 100); }, 700);
      } else {
        waitTimer = WAIT_DUR;
      }
    } else {
      // Wrong — tapped into the laser
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.32;
      resultText = 'レーザーに当たった！';
      resultTimer = 0.45;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      } else {
        waitTimer = WAIT_DUR;
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
      if (waitTimer <= 0) nextRound();
      return;
    }

    scanLine += dt * 0.9;

    if (showTimer > 0) {
      showTimer -= dt;
      if (showTimer <= 0 && !answered) {
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.25;
        resultText = '遅い！';
        resultTimer = 0.38;
        game.audio.play('se_failure', 0.2);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          waitTimer = WAIT_DUR;
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    if (showTimer > 0 || waitTimer > 0) {
      var lx = laserSide === -1 ? 0 : W / 2;
      var sx = laserSide === 1 ? 0 : W / 2;
      var frac = showTimer / SHOW_DUR;

      // Laser zone (danger side)
      game.draw.rect(lx, 0, W / 2, H, C.laser, 0.07 + frac * 0.05);

      // Animated scan lines in laser zone
      var scanY = (scanLine % 1) * H;
      game.draw.rect(lx, scanY - 2, W / 2, 4, C.laser, 0.4);
      game.draw.rect(lx, scanY - 40, W / 2, 4, C.laser, 0.2);
      game.draw.rect(lx, ((scanLine + 0.5) % 1) * H - 2, W / 2, 4, C.laser, 0.25);

      // Laser emitter lines
      if (laserSide === -1) {
        game.draw.line(0, 0, W / 2, H / 3, C.laser, frac * 4 + 1);
        game.draw.line(0, H, W / 2, H * 2 / 3, C.laser, frac * 4 + 1);
        game.draw.line(0, H / 2, W / 2, H / 2, C.laserHi, frac * 6 + 2);
      } else {
        game.draw.line(W, 0, W / 2, H / 3, C.laser, frac * 4 + 1);
        game.draw.line(W, H, W / 2, H * 2 / 3, C.laser, frac * 4 + 1);
        game.draw.line(W, H / 2, W / 2, H / 2, C.laserHi, frac * 6 + 2);
      }

      // Safe zone
      game.draw.rect(sx, 0, W / 2, H, C.safe, 0.04);

      // Center divider
      game.draw.line(W / 2, 0, W / 2, H, '#ffffff', 3);

      // Labels
      var dangerX = laserSide === -1 ? W * 0.25 : W * 0.75;
      var safeX   = laserSide === 1  ? W * 0.25 : W * 0.75;
      game.draw.text('危険', dangerX, H * 0.45, { size: 72, color: C.laser + (frac > 0.4 ? 'ff' : '88'), bold: true });
      game.draw.text('安全', safeX,   H * 0.45, { size: 72, color: C.safe,   bold: true });
      game.draw.text('ここをタップ！', safeX, H * 0.55, { size: 36, color: C.safe, bold: true });

      // Timer bar
      game.draw.rect(W / 2 - 240, H * 0.68, 480, 16, '#1a1a2a', 0.9);
      game.draw.rect(W / 2 - 240, H * 0.68, 480 * frac, 16, frac > 0.4 ? C.safe : C.wrong, 0.9);
    } else {
      game.draw.text('・・・', W / 2, H * 0.44, { size: 80, color: C.text + '33' });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life);
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
    nextRound();
  });
})(game);
