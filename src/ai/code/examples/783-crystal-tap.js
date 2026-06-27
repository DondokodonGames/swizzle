// 783-crystal-tap.js
// クリスタルタップ — 輝くクリスタルが最大に光った瞬間を逃すな
// 操作: タップ — クリスタルの輝きがピーク（PEAK）に達した瞬間
// 成功: 30回ピーク  失敗: 8回ミス or 80秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#02050f',
    crystal: '#818cf8',
    crystalHi:'#c7d2fe',
    crystalPk:'#fff',
    glow:    '#4f46e5',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#05060f'
  };

  var CX = W / 2;
  var CY = H * 0.42;

  var brightness = 0;   // 0 to 1
  var growing = true;
  var GROW_SPEED = 0.55;
  var FADE_SPEED = 1.2;
  var PEAK_LOW = 0.85;
  var PEAK_HIGH = 1.0;

  var answered = false;
  var waitTimer = 0;
  var WAIT_DUR = 0.42;

  var score = 0;
  var NEEDED = 30;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 80;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var crystalShatter = 0;

  function nextCrystal() {
    brightness = 0;
    growing = true;
    GROW_SPEED = Math.min(1.2, 0.55 + score * 0.022);
    FADE_SPEED = Math.min(2.5, 1.2 + score * 0.04);
    answered = false;
    crystalShatter = 0;
  }

  function drawCrystal(cx, cy, size, bright) {
    var r = size;
    var col = bright > 0.85 ? C.crystalPk : (bright > 0.5 ? C.crystalHi : C.crystal);
    var alpha = 0.5 + bright * 0.5;

    // Crystal shape: central hexagon-ish using overlapping circles
    game.draw.circle(cx, cy, r * 0.5, col, alpha);
    game.draw.circle(cx, cy - r * 0.55, r * 0.28, col, alpha * 0.9);
    game.draw.circle(cx + r * 0.48, cy - r * 0.28, r * 0.22, col, alpha * 0.85);
    game.draw.circle(cx + r * 0.48, cy + r * 0.28, r * 0.22, col, alpha * 0.85);
    game.draw.circle(cx, cy + r * 0.55, r * 0.28, col, alpha * 0.9);
    game.draw.circle(cx - r * 0.48, cy + r * 0.28, r * 0.22, col, alpha * 0.85);
    game.draw.circle(cx - r * 0.48, cy - r * 0.28, r * 0.22, col, alpha * 0.85);

    // Inner glow
    if (bright > 0.4) {
      game.draw.circle(cx, cy, r * 0.3 * bright, '#fff', bright * 0.6);
    }

    // Glow aura
    if (bright > 0.6) {
      var glowR = r * (1 + bright * 0.8);
      game.draw.circle(cx, cy, glowR, C.glow, (bright - 0.6) * 0.25);
      game.draw.circle(cx, cy, glowR * 0.7, C.crystalHi, (bright - 0.6) * 0.15);
    }
  }

  game.onTap(function(tx, ty) {
    if (done || answered || waitTimer > 0) return;
    answered = true;
    var inPeak = brightness >= PEAK_LOW && brightness <= PEAK_HIGH;
    if (inPeak) {
      score++;
      crystalShatter = 0.5;
      flashCol = C.correct;
      flashAnim = 0.22;
      resultText = brightness > 0.97 ? 'パーフェクト！' : 'ピーク！';
      resultTimer = 0.4;
      game.audio.play('se_success', 0.65);
      for (var p = 0; p < 10; p++) {
        var pa = Math.random() * Math.PI * 2;
        var sp = 120 + Math.random() * 200;
        particles.push({ x: CX + Math.cos(pa) * 60, y: CY + Math.sin(pa) * 60, vx: Math.cos(pa) * sp, vy: Math.sin(pa) * sp - 50, life: 0.5, col: C.crystalHi });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 350 + Math.ceil(timeLeft) * 130); }, 700);
        return;
      }
    } else {
      errors++;
      flashCol = C.wrong;
      flashAnim = 0.3;
      resultText = brightness < PEAK_LOW ? 'まだ暗い！' : '暗くなった！';
      resultTimer = 0.4;
      game.audio.play('se_failure', 0.3);
      if (errors >= MAX_ERR && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    waitTimer = WAIT_DUR;
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
      if (waitTimer <= 0 && !done) nextCrystal();
    } else {
      if (growing) {
        brightness += GROW_SPEED * dt;
        if (brightness >= 1.0) {
          brightness = 1.0;
          growing = false;
        }
      } else {
        brightness -= FADE_SPEED * dt;
        if (brightness <= 0 && !answered) {
          // Missed the peak
          errors++;
          flashCol = C.wrong;
          flashAnim = 0.28;
          resultText = '消えた！';
          resultTimer = 0.4;
          game.audio.play('se_failure', 0.24);
          answered = true;
          if (errors >= MAX_ERR && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          } else {
            waitTimer = WAIT_DUR;
          }
        }
        if (brightness < 0) brightness = 0;
      }
    }

    if (crystalShatter > 0) crystalShatter -= dt * 2;
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2.2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var inPeak = brightness >= PEAK_LOW && brightness <= PEAK_HIGH;

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background sparkles
    for (var si = 0; si < 20; si++) {
      var sx = (si * 137 % 1000) / 1000 * W;
      var sy = (si * 211 % 800) / 800 * H * 0.8;
      var sb = 0.1 + 0.15 * Math.sin(elapsed * 1.5 + si);
      game.draw.circle(sx, sy, 3, C.crystalHi, sb);
    }

    // Brightness meter bar
    var meterW = W * 0.7;
    var meterX = W * 0.15;
    var meterY = H * 0.73;
    game.draw.rect(meterX, meterY, meterW, 20, '#0a0a1a', 0.9);
    var barCol = inPeak ? C.correct : (brightness > 0.7 ? C.crystalHi : C.crystal);
    game.draw.rect(meterX, meterY, meterW * brightness, 20, barCol, 0.9);
    // Peak zone markers
    game.draw.rect(meterX + meterW * PEAK_LOW - 3, meterY - 5, 6, 30, C.correct, 0.8);
    game.draw.text('ピーク', meterX + meterW * 0.925, meterY + 40, { size: 30, color: C.correct });

    // Crystal
    var crystalSize = 120 + brightness * 30;
    drawCrystal(CX, CY, crystalSize, brightness);

    // Shatter particles burst
    if (crystalShatter > 0) {
      for (var cs = 0; cs < 8; cs++) {
        var ca = cs * Math.PI * 2 / 8;
        var cr = crystalSize * (1 + crystalShatter * 0.6);
        game.draw.circle(CX + Math.cos(ca) * cr, CY + Math.sin(ca) * cr, 12 * crystalShatter, C.crystalPk, crystalShatter * 0.8);
      }
    }

    // Prompt
    if (inPeak && !answered) {
      var pulse = 1 + 0.08 * Math.sin(elapsed * 18);
      game.draw.text('今タップ！', W / 2, H * 0.22, { size: Math.floor(68 * pulse), color: C.crystalPk, bold: true });
    } else if (growing && brightness < PEAK_LOW && !answered) {
      game.draw.text('光が満ちる...', W / 2, H * 0.22, { size: 42, color: C.crystal + '66' });
    } else if (!growing && !answered && brightness > 0) {
      game.draw.text('まだ間に合う！', W / 2, H * 0.22, { size: 44, color: C.wrong + 'cc', bold: true });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.84, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.955, 22, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 80);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    nextCrystal();
  });
})(game);
