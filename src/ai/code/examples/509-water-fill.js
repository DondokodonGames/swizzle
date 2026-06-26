// 509-water-fill.js
// ウォーターフィル — 傾けて水を目標ラインまで注げ（スワイプで容器を傾ける）
// 操作: スワイプ左右で容器を傾けて水位を調整
// 成功: 目標ライン±5%に10回収める  失敗: 5回オーバーフロー or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020a10',
    glass:   '#1e3a5f',
    glassHi: '#3b82f6',
    water:   '#06b6d4',
    waterHi: '#67e8f9',
    target:  '#f59e0b',
    overflow:'#ef4444',
    correct: '#22c55e',
    text:    '#f1f5f9',
    ui:      '#374151',
    foam:    '#e0f2fe'
  };

  var GLASS_W = 320;
  var GLASS_H = 600;
  var GLASS_X = W / 2;
  var GLASS_Y = H * 0.55;
  var tiltAngle = 0; // radians, -0.3 to 0.3
  var waterLevel = 0.5; // 0 = empty, 1 = full
  var targetLevel = 0.0;
  var TILT_DRAIN = 0.15; // how fast water drains per radian
  var hits = 0;
  var NEEDED = 10;
  var overflows = 0;
  var MAX_OVERFLOW = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var resultText = '';
  var resultCol = C.correct;
  var resultLife = 0;
  var fillRate = 0.18; // water fills from tap
  var tapActive = false;
  var flashAnim = 0;
  var settling = false; // glass upright
  var checkTimer = 0;

  function newTarget() {
    targetLevel = 0.3 + Math.random() * 0.5;
    waterLevel = Math.max(0.05, waterLevel - 0.1); // reset partially
    tiltAngle = 0;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left')  tiltAngle = Math.max(-0.5, tiltAngle - 0.18);
    if (dir === 'right') tiltAngle = Math.min(0.5, tiltAngle + 0.18);
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap above glass = fill from tap
    if (ty < GLASS_Y - GLASS_H / 2 - 50) {
      tapActive = true;
    } else {
      // Tap to check level
      var diff = Math.abs(waterLevel - targetLevel);
      if (diff <= 0.06) {
        hits++;
        resultText = 'ピッタリ！';
        resultCol = C.correct;
        resultLife = 0.8;
        flashAnim = 0.4;
        game.audio.play('se_success', 0.8);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: GLASS_X, y: GLASS_Y - GLASS_H / 2 + GLASS_H * (1 - waterLevel), vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150, life: 0.5, col: C.waterHi });
        }
        if (hits >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(hits * 400 + Math.ceil(timeLeft) * 100); }, 700);
        } else {
          setTimeout(function() { if (!done) newTarget(); }, 600);
        }
      } else {
        resultText = diff < 0.15 ? 'もう少し！' : 'ズレすぎ！';
        resultCol = C.overflow;
        resultLife = 0.6;
        game.audio.play('se_failure', 0.3);
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

    if (resultLife > 0) resultLife -= dt * 2;
    if (flashAnim > 0) flashAnim -= dt * 3;

    // Fill from tap
    if (tapActive) {
      waterLevel = Math.min(1.0, waterLevel + fillRate * dt);
      tapActive = false;
    }

    // Tilt drains water
    if (Math.abs(tiltAngle) > 0.05) {
      var drainRate = Math.abs(tiltAngle) * TILT_DRAIN;
      waterLevel = Math.max(0, waterLevel - drainRate * dt);
    }

    // Gradually return to upright
    tiltAngle *= Math.pow(0.92, dt * 60);

    // Check overflow
    if (waterLevel >= 1.0) {
      waterLevel = 1.0;
      overflows++;
      resultText = 'あふれた！';
      resultCol = C.overflow;
      resultLife = 0.8;
      game.audio.play('se_failure', 0.5);
      waterLevel = 0.85;
      if (overflows >= MAX_OVERFLOW && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }

    // Water surface particles
    if (Math.abs(tiltAngle) > 0.15 && waterLevel > 0.05) {
      if (Math.random() < dt * 8) {
        var ang2 = Math.random() * Math.PI * 2;
        particles.push({ x: GLASS_X + (tiltAngle > 0 ? 60 : -60), y: GLASS_Y - GLASS_H * (waterLevel - 0.5) - 20, vx: Math.cos(ang2) * 60, vy: Math.sin(ang2) * 60 - 40, life: 0.3, col: C.waterHi });
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Tap faucet hint
    game.draw.circle(GLASS_X, H * 0.15, 30, C.water, 0.4);
    game.draw.text('↑タップで注ぐ', GLASS_X, H * 0.13, { size: 36, color: C.ui });

    // Glass container (tilted)
    var cosT = Math.cos(tiltAngle), sinT = Math.sin(tiltAngle);
    // Just draw untilted for simplicity but show tilt indicator
    var glassTop = GLASS_Y - GLASS_H / 2;
    var glassLeft = GLASS_X - GLASS_W / 2;

    // Glass outline
    game.draw.rect(glassLeft - 8, glassTop - 8, GLASS_W + 16, GLASS_H + 16, C.glass, 0.5);
    game.draw.rect(glassLeft, glassTop, GLASS_W, GLASS_H, '#000', 0.9);

    // Water
    var waterH = GLASS_H * waterLevel;
    var waterTop = GLASS_Y + GLASS_H / 2 - waterH;
    var sloshedTop = waterTop + Math.sin(elapsed * 6) * 8 * Math.abs(tiltAngle / 0.5);
    game.draw.rect(glassLeft + 4, sloshedTop, GLASS_W - 8, waterH - (sloshedTop - waterTop), C.water, 0.75);
    // Surface shimmer
    game.draw.rect(glassLeft + 4, sloshedTop, GLASS_W - 8, 8, C.foam, 0.4);

    // Target line
    var targetY = GLASS_Y + GLASS_H / 2 - GLASS_H * targetLevel;
    game.draw.line(glassLeft - 20, targetY, glassLeft + GLASS_W + 20, targetY, C.target, 5);
    game.draw.text(Math.floor(targetLevel * 100) + '%', glassLeft + GLASS_W + 60, targetY + 10, { size: 36, color: C.target });

    // Current level text
    game.draw.text(Math.floor(waterLevel * 100) + '%', glassLeft - 80, GLASS_Y + GLASS_H / 2 - waterH + 16, { size: 36, color: C.water });

    // Tilt indicator
    var tiltPct = Math.floor(tiltAngle / 0.5 * 100);
    game.draw.text((tiltPct > 0 ? '+' : '') + tiltPct + '°', GLASS_X, GLASS_Y + GLASS_H / 2 + 60, { size: 40, color: C.glassHi });

    // Glass walls on top
    game.draw.rect(glassLeft, glassTop, 12, GLASS_H, C.glassHi, 0.7);
    game.draw.rect(glassLeft + GLASS_W - 12, glassTop, 12, GLASS_H, C.glassHi, 0.7);
    game.draw.rect(glassLeft, glassTop + GLASS_H - 12, GLASS_W, 12, C.glassHi, 0.7);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.1);

    if (resultLife > 0) {
      game.draw.text(resultText, W / 2, H * 0.89, { size: 60, color: resultCol, bold: true });
    }

    // Overflow dots
    for (var oi = 0; oi < MAX_OVERFLOW; oi++) {
      game.draw.circle(W / 2 - (MAX_OVERFLOW - 1) * 56 + oi * 112, H * 0.955, 20, oi < overflows ? C.overflow : C.ui, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.water : C.overflow);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    newTarget();
  });
})(game);
