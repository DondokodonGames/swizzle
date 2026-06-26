// 480-voltage-surge.js
// 電圧サージ — 急上昇する電圧を適切なタイミングでスワイプしてリリース
// 操作: 電圧が赤ゾーンに入ったらスワイプ（方向は画面に表示）
// 成功: 15回成功  失敗: 5回爆発 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050010',
    panel:  '#0a0020',
    meterBg:'#1a1030',
    safe:   '#22c55e',
    warn:   '#f59e0b',
    danger: '#ef4444',
    needle: '#f1f5f9',
    spark:  '#fbbf24',
    sparkHi:'#fde68a',
    arrow:  '#60a5fa',
    arrowHi:'#bfdbfe',
    explode:'#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var DIRS = ['up', 'down', 'left', 'right'];
  var DIR_ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };

  var voltage = 0;
  var voltageSpeed = 0.3;
  var SAFE_MIN = 0.55;
  var SAFE_MAX = 0.75;
  var WARN_MIN = 0.45;
  var WARN_MAX = 0.85;
  var surging = true;
  var currentDir = 'up';
  var successes = 0;
  var NEEDED = 15;
  var explosions = 0;
  var MAX_EXPLODE = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var resultAnim = 0;
  var resultText = '';
  var resultCol = C.safe;
  var flashAnim = 0;
  var shakeMag = 0;
  var shakeTimer = 0;
  var nextRound = 0;

  function newRound() {
    voltage = 0;
    voltageSpeed = 0.25 + successes * 0.015 + Math.random() * 0.1;
    currentDir = DIRS[Math.floor(Math.random() * DIRS.length)];
    surging = true;
  }

  game.onSwipe(function(dir) {
    if (done || !surging) return;
    if (voltage >= SAFE_MIN && voltage <= SAFE_MAX) {
      if (dir === currentDir) {
        // Success!
        successes++;
        resultText = '放電！';
        resultCol = C.safe;
        resultAnim = 0.8;
        flashAnim = 0.4;
        game.audio.play('se_success', 0.6);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, life: 0.6, col: C.spark });
        }
        surging = false;
        nextRound = 0.8;
        if (successes >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(successes * 400 + Math.ceil(timeLeft) * 100); }, 700);
        }
      } else {
        // Wrong direction
        explosions++;
        resultText = '方向違う！';
        resultCol = C.explode;
        resultAnim = 0.8;
        shakeMag = 30;
        shakeTimer = 0.3;
        game.audio.play('se_failure', 0.5);
        surging = false;
        nextRound = 1.0;
        if (explosions >= MAX_EXPLODE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    } else if (voltage < SAFE_MIN) {
      // Too early
      resultText = '早すぎ！';
      resultCol = C.warn;
      resultAnim = 0.8;
      game.audio.play('se_failure', 0.3);
    } else {
      // Overload!
      explosions++;
      resultText = '過負荷！';
      resultCol = C.explode;
      resultAnim = 0.8;
      shakeMag = 40;
      shakeTimer = 0.35;
      game.audio.play('se_failure', 0.6);
      surging = false;
      nextRound = 1.0;
      if (explosions >= MAX_EXPLODE && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }
  });

  game.onTap(function(tx, ty) {
    // No-op
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
    if (resultAnim > 0) resultAnim -= dt * 1.5;
    if (shakeTimer > 0) { shakeTimer -= dt; if (shakeTimer <= 0) shakeMag = 0; }

    if (!surging) {
      nextRound -= dt;
      if (nextRound <= 0 && !done) {
        newRound();
      }
    } else {
      voltage += voltageSpeed * dt;
      if (voltage > 1.0) {
        // Overload — auto explosion
        voltage = 1.0;
        explosions++;
        resultText = '爆発！';
        resultCol = C.explode;
        resultAnim = 1.0;
        shakeMag = 50;
        shakeTimer = 0.4;
        game.audio.play('se_failure', 0.7);
        for (var pi2 = 0; pi2 < 16; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: H * 0.45, vx: Math.cos(ang2) * 400, vy: Math.sin(ang2) * 400, life: 0.8, col: C.explode });
        }
        surging = false;
        nextRound = 1.2;
        if (explosions >= MAX_EXPLODE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 700);
        }
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    var sx = shakeMag * Math.sin(elapsed * 40) * (shakeTimer / 0.4);
    game.draw.rect(0, 0, W, H, C.bg);

    // Meter background
    var MX = W / 2 + sx;
    var MY = H * 0.35;
    var MW = 500;
    var MH = 140;
    game.draw.rect(MX - MW / 2 - 10, MY - 10, MW + 20, MH + 20, C.meterBg, 0.9);

    // Zones
    game.draw.rect(MX - MW / 2, MY, MW * WARN_MIN, MH, '#1a3a1a', 0.8);
    game.draw.rect(MX - MW / 2 + MW * WARN_MIN, MY, MW * (SAFE_MIN - WARN_MIN), MH, '#2d2a00', 0.8);
    game.draw.rect(MX - MW / 2 + MW * SAFE_MIN, MY, MW * (SAFE_MAX - SAFE_MIN), MH, C.safe, 0.3);
    game.draw.rect(MX - MW / 2 + MW * SAFE_MAX, MY, MW * (WARN_MAX - SAFE_MAX), MH, '#2d2a00', 0.8);
    game.draw.rect(MX - MW / 2 + MW * WARN_MAX, MY, MW * (1 - WARN_MAX), MH, '#3a1a1a', 0.8);

    // Zone labels
    game.draw.rect(MX - MW / 2 + MW * SAFE_MIN, MY, MW * (SAFE_MAX - SAFE_MIN), 6, C.safe, 0.8);
    game.draw.rect(MX - MW / 2 + MW * SAFE_MIN, MY + MH - 6, MW * (SAFE_MAX - SAFE_MIN), 6, C.safe, 0.8);

    // Needle
    var needleX = MX - MW / 2 + MW * voltage;
    game.draw.rect(needleX - 6, MY - 20, 12, MH + 40, C.needle, 0.9);
    game.draw.circle(needleX, MY - 20, 16, C.needle, 0.9);

    // Sparks on needle if in danger
    if (voltage > WARN_MAX - 0.05 && surging) {
      for (var si2 = 0; si2 < 3; si2++) {
        var sparkX = needleX + (Math.random() - 0.5) * 40;
        var sparkY = MY + Math.random() * MH;
        game.draw.circle(sparkX, sparkY, 8, C.sparkHi, Math.random() * 0.8);
      }
    }

    // Direction arrow
    if (surging) {
      var arrowPulse = Math.sin(elapsed * 6) * 0.3 + 0.7;
      game.draw.circle(W / 2 + sx, H * 0.6, 90, C.arrow, 0.15 * arrowPulse);
      game.draw.text(DIR_ARROWS[currentDir], W / 2 + sx, H * 0.63, { size: 160, color: C.arrowHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x + sx, p.y, 12 * p.life, p.col, p.life * 0.9);
    }

    // Result
    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2 + sx, H * 0.82, { size: 68, color: resultCol, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, resultCol, flashAnim * 0.12);

    // Explosion dots
    for (var ei = 0; ei < MAX_EXPLODE; ei++) {
      game.draw.circle(W * 0.14 + ei * (W * 0.72 / (MAX_EXPLODE - 1)), H * 0.955, 18, ei < explosions ? C.explode : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.safe : C.explode);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    newRound();
  });
})(game);
