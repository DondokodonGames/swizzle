// 672-tap-survival.js
// 連打サバイバル — タップで生命力を保ち続けろ
// 操作: タップで生命維持
// 成功: 30秒生き残る  失敗: 生命力がゼロ

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080002',
    life:    '#22c55e',
    lifeLow: '#ef4444',
    lifeMid: '#f59e0b',
    core:    '#86efac',
    danger:  '#ef4444',
    pulse:   '#bbf7d0',
    text:    '#f1f5f9',
    ui:      '#0c0003'
  };

  var life = 80; // 0-100
  var DRAIN_BASE = 18; // per second
  var RESTORE = 14; // per tap
  var NEEDED_TIME = 30;

  var survived = 0;
  var done = false;
  var timeLeft = 30; // win condition: survive this long
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.life;
  var heartbeat = 0;
  var tapFlash = 0;
  var tapCount = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    life = Math.min(100, life + RESTORE);
    tapCount++;
    tapFlash = 0.15;
    game.audio.play('se_tap', 0.1);
    for (var p = 0; p < 4; p++) {
      var pa = Math.random() * Math.PI * 2;
      particles.push({ x: tx, y: ty, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 140, life: 0.3, col: C.core });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;

      // Drain increases over time
      var drain = DRAIN_BASE + elapsed * 0.6;
      life -= drain * dt;

      if (life <= 0) {
        life = 0;
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }

      if (elapsed >= NEEDED_TIME) {
        done = true;
        game.audio.play('se_success', 0.9);
        game.end.success(Math.floor(elapsed * 100) + tapCount * 10);
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (tapFlash > 0) tapFlash -= dt * 6;

    heartbeat += dt * (2 + (1 - life / 100) * 4);

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 3;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    var lifeRatio = life / 100;
    var col = lifeRatio > 0.5 ? C.life : lifeRatio > 0.25 ? C.lifeMid : C.lifeLow;

    // Pulse ring (heartbeat)
    var pulse = (Math.sin(heartbeat * Math.PI) + 1) * 0.5;
    var pulseR = 200 + pulse * 80;
    game.draw.circle(W / 2, H / 2, pulseR, col, pulse * 0.1);
    game.draw.circle(W / 2, H / 2, pulseR * 0.7, col, pulse * 0.08);

    // Life core
    var coreR = 100 + pulse * 20 + (1 - lifeRatio) * 60;
    game.draw.circle(W / 2 + 5, H / 2 + 5, coreR, '#000', 0.3);
    game.draw.circle(W / 2, H / 2, coreR, col, 0.85);
    game.draw.circle(W / 2, H / 2, coreR * 0.65, col, 0.15);
    game.draw.circle(W / 2 - coreR * 0.3, H / 2 - coreR * 0.3, coreR * 0.22, C.pulse, 0.4);

    // Life percentage in center
    game.draw.text(Math.floor(life) + '%', W / 2, H / 2 + 16, { size: 72, color: '#fff', bold: true });

    // Danger flash when low
    if (lifeRatio < 0.25) {
      var dangerPulse = (Math.sin(elapsed * 8) + 1) * 0.5;
      game.draw.rect(0, 0, W, H, C.danger, dangerPulse * 0.08);
    }

    // Tap flash
    if (tapFlash > 0) {
      game.draw.rect(0, 0, W, H, C.life, tapFlash * 0.08);
    }

    // Life bar
    game.draw.rect(60, H * 0.78, W - 120, 36, C.ui, 0.8);
    game.draw.rect(60, H * 0.78, (W - 120) * lifeRatio, 36, col, 0.85);

    // TAP label
    var tapAlpha = 0.4 + Math.sin(elapsed * 4) * 0.3;
    game.draw.text('TAP TO SURVIVE', W / 2, H * 0.86, { size: 48, color: col });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 7 * p2.life, p2.col, p2.life * 0.8);
    }

    // Timer
    var survivedRatio = elapsed / NEEDED_TIME;
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * survivedRatio, 12, col);
    game.draw.text(Math.ceil(NEEDED_TIME - elapsed) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('あと ' + Math.ceil(NEEDED_TIME - elapsed) + '秒', W / 2, 80, { size: 32, color: '#ffffff55' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
  });
})(game);
