// 628-pressure-cook.js
// プレッシャークック — 鍋の圧力を適正範囲に保ち続けろ
// 操作: タップで火力を上げる、スワイプダウンで下げる
// 成功: 30秒間緑ゾーン維持  失敗: 圧力超過/不足 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0604',
    pot:     '#5a4030',
    potHi:   '#8a6050',
    steam:   '#aaddff',
    steamHi: '#eef8ff',
    safe:    '#22c55e',
    safeHi:  '#86efac',
    danger:  '#ef4444',
    warning: '#f59e0b',
    needle:  '#ff2222',
    gauge:   '#1a1a2a',
    gaugeHi: '#2a2a3a',
    text:    '#f1f5f9',
    ui:      '#2a1a0a'
  };

  var pressure = 50; // 0-100, safe zone 35-65
  var SAFE_MIN = 35, SAFE_MAX = 65;
  var targetPressure = 50; // oscillates over time
  var heat = 50; // player-controlled: 0-100
  var safeTime = 0;
  var NEEDED_SAFE = 30; // 30 seconds in safe zone
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var steamParticles = [];
  var flashAnim = 0;
  var inSafe = false;
  var failReason = '';

  function heatEffect() {
    // Pressure naturally drifts toward a target that oscillates
    targetPressure = 50 + Math.sin(elapsed * 0.5) * 20 + Math.sin(elapsed * 0.23) * 10;
    // Heat pushes pressure up, loss pulls it down
    var drift = (targetPressure - pressure) * 0.3;
    var heatPush = (heat - 50) * 0.8;
    return drift + heatPush;
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'up') {
      heat = Math.min(100, heat + 20);
    } else if (dir === 'down') {
      heat = Math.max(0, heat - 20);
    }
    game.audio.play('se_tap', 0.15);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    heat = Math.min(100, heat + 12);
    game.audio.play('se_tap', 0.15);
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
    if (flashAnim > 0) flashAnim -= dt * 4;

    // Pressure physics
    pressure += heatEffect() * dt;
    // Natural heat decay
    heat = Math.max(0, heat - 10 * dt);
    pressure = Math.max(0, Math.min(100, pressure));

    // Check zone
    inSafe = pressure >= SAFE_MIN && pressure <= SAFE_MAX;
    if (inSafe) {
      safeTime += dt;
      if (safeTime >= NEEDED_SAFE && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.ceil(safeTime) * 200 + Math.ceil(timeLeft) * 100); }, 700);
        return;
      }
    } else {
      // Slight penalty for being out of zone
      if (pressure > SAFE_MAX + 20 || pressure < SAFE_MIN - 20) {
        flashAnim = 0.2;
      }
    }

    // Steam particles
    if (Math.random() < (pressure / 100) * 0.5) {
      steamParticles.push({
        x: W / 2 + (Math.random() - 0.5) * 120,
        y: H * 0.42,
        vx: (Math.random() - 0.5) * 50,
        vy: -60 - Math.random() * 60,
        life: 0.8 + Math.random() * 0.4,
        r: 12 + Math.random() * 16
      });
    }

    for (var sp = steamParticles.length - 1; sp >= 0; sp--) {
      var s = steamParticles[sp];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx += (Math.random() - 0.5) * 30 * dt;
      s.life -= dt;
      if (s.life <= 0) steamParticles.splice(sp, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Pot
    var POT_X = W / 2 - 220, POT_Y = H * 0.45;
    var POT_W = 440, POT_H = 300;
    // Pot body
    game.draw.rect(POT_X, POT_Y, POT_W, POT_H, C.pot, 0.9);
    game.draw.rect(POT_X, POT_Y, POT_W, 20, C.potHi, 0.7);
    // Lid
    game.draw.rect(POT_X - 20, POT_Y - 30, POT_W + 40, 40, C.potHi, 0.9);
    game.draw.rect(POT_X + POT_W / 2 - 30, POT_Y - 55, 60, 30, C.pot, 0.9);

    // Steam
    for (var sp2 = 0; sp2 < steamParticles.length; sp2++) {
      var s2 = steamParticles[sp2];
      var sa = s2.life * 0.4;
      game.draw.circle(s2.x, s2.y, s2.r, C.steam, sa * 0.5);
      game.draw.circle(s2.x, s2.y, s2.r * 0.5, C.steamHi, sa * 0.3);
    }

    // Gauge background
    var GX = W / 2 - 140, GY = H * 0.22;
    var GW = 280, GH = 140;
    game.draw.rect(GX, GY, GW, GH, C.gauge, 0.9);
    game.draw.rect(GX, GY, GW, 8, C.gaugeHi, 0.5);

    // Safe zone highlight
    var safeLeft = GX + (SAFE_MIN / 100) * GW;
    var safeW2 = ((SAFE_MAX - SAFE_MIN) / 100) * GW;
    game.draw.rect(safeLeft, GY + 20, safeW2, GH - 40, C.safe, 0.15);
    game.draw.rect(safeLeft, GY + 20, 4, GH - 40, C.safeHi, 0.5);
    game.draw.rect(safeLeft + safeW2 - 4, GY + 20, 4, GH - 40, C.safeHi, 0.5);

    // Needle
    var needleX = GX + (pressure / 100) * GW;
    var needleCol = inSafe ? C.safe : (pressure > SAFE_MAX ? C.danger : C.warning);
    game.draw.rect(needleX - 4, GY + 15, 8, GH - 30, needleCol, 0.9);
    game.draw.circle(needleX, GY + GH / 2, 16, needleCol, 0.9);
    game.draw.text(Math.round(pressure) + '', needleX, GY + GH / 2 + 8, { size: 24, color: '#fff', bold: true });

    // Heat bar
    game.draw.rect(GX, GY + GH + 20, GW, 20, C.gauge, 0.8);
    game.draw.rect(GX, GY + GH + 20, GW * (heat / 100), 20, C.warning, 0.8);
    game.draw.text('火力: ' + Math.round(heat) + '%', W / 2, GY + GH + 56, { size: 30, color: C.warning });

    // Safe time progress
    var ratio2 = Math.min(1, safeTime / NEEDED_SAFE);
    game.draw.rect(W / 2 - 200, H * 0.9, 400, 24, C.ui, 0.7);
    game.draw.rect(W / 2 - 200, H * 0.9, 400 * ratio2, 24, C.safe, 0.9);
    game.draw.text(Math.ceil(safeTime) + 's / ' + NEEDED_SAFE + 's', W / 2, H * 0.9 + 44, { size: 32, color: C.safeHi });

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, pressure > SAFE_MAX ? C.danger : C.warning, flashAnim * 0.1);

    var timeRatio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * timeRatio, 12, timeRatio > 0.3 ? C.safeHi : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text(inSafe ? '適正圧力 ✓' : (pressure > SAFE_MAX ? '圧力過多!' : '圧力不足!'), W / 2, 80, { size: 36, color: inSafe ? C.safe : C.danger });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
  });
})(game);
