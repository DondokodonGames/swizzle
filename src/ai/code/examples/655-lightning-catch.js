// 655-lightning-catch.js
// ライトニングキャッチ — 雷を避け、光ったら即タップ
// 操作: タップでロッドを動かす、雷フラッシュ時に素早くタップ
// 成功: 15本キャッチ  失敗: 8回外す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020308',
    sky:     '#040510',
    cloud:   '#0a0d1a',
    cloudHi: '#141828',
    bolt:    '#c4b5fd',
    boltHi:  '#ffffff',
    boltGlow:'#7c3aed44',
    rod:     '#fbbf24',
    rodHi:   '#fde68a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#030409'
  };

  var ROD_X = W / 2;
  var targetRodX = W / 2;
  var ROD_Y = H * 0.75;
  var ROD_W = 80;
  var ROD_H = 160;

  var lightningX = 0;
  var lightningPhase = 'wait'; // wait, warning, flash, done
  var waitTimer = 0;
  var flashTimer = 0;
  var FLASH_WINDOW = 0.4;
  var warningAlpha = 0;
  var boltSegments = [];

  var caught = 0;
  var NEEDED = 15;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function newLightning() {
    lightningX = 80 + Math.random() * (W - 160);
    lightningPhase = 'warning';
    waitTimer = 1.5 + Math.random() * 2;
    warningAlpha = 0;
    // Generate bolt zigzag
    boltSegments = [];
    var y = H * 0.05;
    while (y < ROD_Y) {
      boltSegments.push({ x: lightningX + (Math.random() - 0.5) * 80, y: y });
      y += 30 + Math.random() * 30;
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Move rod
    targetRodX = Math.max(ROD_W / 2 + 20, Math.min(W - ROD_W / 2 - 20, tx));

    if (lightningPhase === 'flash') {
      // Check if rod is under lightning
      if (Math.abs(ROD_X - lightningX) < ROD_W / 2 + 30) {
        caught++;
        flashCol = C.correct;
        flashAnim = 0.3;
        resultText = 'キャッチ！';
        resultTimer = 0.5;
        game.audio.play('se_success', 0.6);
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: lightningX, y: ROD_Y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.4, col: C.bolt });
        }
        lightningPhase = 'done';
        if (caught >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(caught * 350 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          setTimeout(newLightning, 600);
        }
      } else {
        // Missed
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.3;
        resultText = '外れ！';
        resultTimer = 0.5;
        game.audio.play('se_failure', 0.3);
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    ROD_X += (targetRodX - ROD_X) * Math.min(1, dt * 14);

    switch (lightningPhase) {
      case 'warning':
        waitTimer -= dt;
        warningAlpha = Math.sin(elapsed * 8) * 0.3 + 0.3;
        if (waitTimer <= 0) {
          lightningPhase = 'flash';
          flashTimer = FLASH_WINDOW;
          game.audio.play('se_success', 0.15);
        }
        break;
      case 'flash':
        flashTimer -= dt;
        if (flashTimer <= 0) {
          // Flash expired without tap
          misses++;
          game.audio.play('se_failure', 0.25);
          lightningPhase = 'done';
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else {
            setTimeout(newLightning, 400);
          }
        }
        break;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Dark sky
    game.draw.rect(0, 0, W, H * 0.75, C.sky, 0.8);

    // Clouds
    for (var ci = 0; ci < 5; ci++) {
      var cx = (ci * W / 4 + elapsed * 20) % (W + 200) - 100;
      var cy = H * 0.08 + ci * 30;
      game.draw.circle(cx, cy, 80, C.cloud, 0.6);
      game.draw.circle(cx + 60, cy - 20, 60, C.cloudHi, 0.5);
      game.draw.circle(cx - 60, cy + 10, 50, C.cloud, 0.5);
    }

    // Lightning warning
    if (lightningPhase === 'warning') {
      // Glow where lightning will strike
      game.draw.circle(lightningX, H * 0.05, 60, C.boltGlow, warningAlpha);
      game.draw.line(lightningX - 15, H * 0.1, lightningX + 15, H * 0.1, C.bolt, 4);
      game.draw.text('!', lightningX, ROD_Y - 20, { size: 48, color: C.boltHi });
    }

    // Lightning bolt (flash)
    if (lightningPhase === 'flash') {
      var flashPulse = flashTimer / FLASH_WINDOW;
      game.draw.line(0, 0, W, 0, '#ffffff', 4);
      game.draw.rect(0, 0, W, H, '#7c3aed', flashPulse * 0.12);
      // Bolt segments
      for (var bi = 0; bi < boltSegments.length - 1; bi++) {
        var s1 = boltSegments[bi], s2 = boltSegments[bi + 1];
        game.draw.line(s1.x, s1.y, s2.x, s2.y, C.boltHi, 6 - bi * 0.3);
        game.draw.line(s1.x, s1.y, s2.x, s2.y, C.bolt, 12);
      }
      game.draw.text('NOW!', lightningX, ROD_Y - 30, { size: 64, color: C.boltHi, bold: true });
    }

    // Ground
    game.draw.rect(0, ROD_Y + ROD_H, W, H - (ROD_Y + ROD_H), '#111', 0.8);

    // Rod
    game.draw.rect(ROD_X - ROD_W / 2 + 6, ROD_Y + 6, ROD_W, ROD_H, '#000', 0.3);
    game.draw.rect(ROD_X - ROD_W / 2, ROD_Y, ROD_W, ROD_H, C.rod, 0.9);
    game.draw.rect(ROD_X - ROD_W / 2, ROD_Y, ROD_W, 16, C.rodHi, 0.6);
    // Tip
    game.draw.circle(ROD_X, ROD_Y, 20, C.rodHi, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 12 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.87, { size: 64, color: flashCol, bold: true });
    }

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.bolt : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newLightning();
  });
})(game);
