// 305-cargo-crane.js
// 荷下ろしクレーン — 揺れるクレーンのフックを正確に目標に降ろす
// 操作: タップでフックを下げる（左右に揺れているので角度を見て）
// 成功: 8個の荷物を的に降ろす  失敗: 外れ3回 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a1020',
    sky:     '#0d1929',
    crane:   '#f59e0b',
    craneDim:'#92400e',
    wire:    '#94a3b8',
    hook:    '#cbd5e1',
    hookHi:  '#f1f5f9',
    cargo:   '#3b82f6',
    cargoHi: '#60a5fa',
    target:  '#22c55e',
    targetHi:'#86efac',
    correct: '#86efac',
    wrong:   '#ef4444',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var CRANE_X = W / 2;
  var CRANE_Y = H * 0.12;
  var ARM_LEN = W * 0.3;

  var swingAngle = 0;
  var swingSpeed = 1.2;
  var hookLength = 80; // distance from arm end
  var dropping = false;
  var hookFallY = 0;
  var hookReleased = false;
  var releaseX = 0;
  var releaseY = 0;
  var phase = 'swing'; // swing, drop, result

  var targetX = 0;
  var targetW = 160;
  var delivered = 0;
  var NEEDED = 8;
  var misses = 0;
  var MAX_MISS = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var resultMsg = '';
  var resultTimer = 0;

  function newTarget() {
    targetX = W * 0.15 + Math.random() * W * 0.7;
  }

  function dropHook() {
    if (phase !== 'swing') return;
    // Calculate arm end position
    var armEndX = CRANE_X + Math.cos(swingAngle) * ARM_LEN;
    var armEndY = CRANE_Y + Math.sin(swingAngle) * ARM_LEN * 0.3;
    hookFallY = armEndY + hookLength;
    releaseX = armEndX;
    releaseY = armEndY + hookLength;
    phase = 'drop';
    game.audio.play('se_tap', 0.3);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (phase === 'swing') dropHook();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultTimer > 0) resultTimer -= dt;

    if (phase === 'swing') {
      swingAngle += dt * swingSpeed;
      // Swing like pendulum: arm goes left-right
      // We model the arm as rotating around CRANE_X
    }

    if (phase === 'drop') {
      releaseY += 800 * dt;
      var FLOOR_Y = H * 0.78;
      if (releaseY >= FLOOR_Y) {
        releaseY = FLOOR_Y;
        // Check if landed on target
        if (Math.abs(releaseX - targetX) < targetW / 2 + 20) {
          delivered++;
          resultMsg = '決まった！';
          resultTimer = 0.8;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 10; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: releaseX, y: releaseY, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250 - 100, life: 0.6, col: C.correct });
          }
          if (delivered >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(delivered * 400 + Math.ceil(timeLeft) * 100); }, 500);
            return;
          }
          newTarget();
        } else {
          misses++;
          resultMsg = '外れ！';
          resultTimer = 0.6;
          game.audio.play('se_failure', 0.5);
          for (var pi2 = 0; pi2 < 8; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: releaseX, y: releaseY, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200, life: 0.5, col: C.wrong });
          }
          if (misses >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
            return;
          }
        }
        phase = 'result';
        setTimeout(function() {
          if (!done) {
            phase = 'swing';
            swingSpeed = 1.2 + delivered * 0.08;
          }
        }, 700);
      }
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
    game.draw.rect(0, 0, W, H * 0.78, C.sky, 0.6);

    // Ground
    game.draw.rect(0, H * 0.78, W, H * 0.22, '#1a1a2e', 0.9);
    game.draw.rect(0, H * 0.78, W, 10, '#2d2d50', 0.9);

    // Target zone
    var tY = H * 0.78;
    game.draw.rect(targetX - targetW / 2, tY - 20, targetW, 20, C.target, 0.4);
    game.draw.rect(targetX - targetW / 2, tY - 20, targetW, 8, C.targetHi, 0.6);
    game.draw.text('▼', targetX, tY - 50, { size: 48, color: C.targetHi });

    // Crane tower
    game.draw.rect(CRANE_X - 20, CRANE_Y - 60, 40, 200, C.craneDim, 0.9);
    game.draw.rect(CRANE_X - 16, CRANE_Y - 56, 12, 200, C.crane, 0.3);

    // Crane arm (swinging)
    if (phase === 'swing' || phase === 'result') {
      var armEndX2 = CRANE_X + Math.cos(swingAngle) * ARM_LEN;
      var armEndY2 = CRANE_Y + Math.sin(swingAngle) * ARM_LEN * 0.25;
      game.draw.line(CRANE_X, CRANE_Y, armEndX2, armEndY2, C.crane, 16);
      game.draw.line(CRANE_X, CRANE_Y, armEndX2, armEndY2, C.craneDim, 8);
      // Wire from arm end
      game.draw.line(armEndX2, armEndY2, armEndX2, armEndY2 + hookLength, C.wire, 4);
      // Hook
      game.draw.circle(armEndX2, armEndY2 + hookLength, 20, C.hook, 0.9);
      game.draw.circle(armEndX2, armEndY2 + hookLength, 12, C.hookHi, 0.7);
      // Cargo on hook
      game.draw.rect(armEndX2 - 30, armEndY2 + hookLength - 50, 60, 50, C.cargo, 0.9);
      game.draw.rect(armEndX2 - 30, armEndY2 + hookLength - 50, 60, 12, C.cargoHi, 0.5);
    }

    // Falling hook
    if (phase === 'drop') {
      var wireY2 = releaseY - hookLength;
      game.draw.line(releaseX, CRANE_Y, releaseX, wireY2, C.wire, 4);
      game.draw.circle(releaseX, releaseY, 20, C.hook, 0.9);
      // Cargo
      game.draw.rect(releaseX - 30, releaseY - 50, 60, 50, C.cargo, 0.9);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    if (resultTimer > 0) {
      game.draw.text(resultMsg, W / 2, H * 0.86, { size: 56, color: resultMsg.includes('決') ? C.correct : C.wrong, bold: true });
    }

    if (phase === 'swing') {
      game.draw.text('タップで降ろす！', W / 2, H * 0.89, { size: 40, color: C.ui });
    }

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 30 + mi * 60, H * 0.94, 16, mi < misses ? C.wrong : '#0a1020');
    }

    game.draw.text(delivered + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.crane : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    newTarget();
  });
})(game);
