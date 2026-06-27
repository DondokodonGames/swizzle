// 674-popcorn.js
// ポップコーン — 弾けた瞬間にタップしてキャッチせよ
// 操作: タップで弾けた粒をキャッチ
// 成功: 30粒キャッチ  失敗: 8粒逃す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0400',
    pan:     '#1c0f00',
    panHi:   '#3d1f00',
    kernel:  '#f5f0e8',
    kernelHi:'#fde68a',
    popped:  '#f59e0b',
    poppedHi:'#fde68a',
    heat:    '#ef4444',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#100500'
  };

  var PAN_Y = H * 0.78;
  var PAN_W = W * 0.8;
  var PAN_H = 80;
  var PAN_X = W / 2;

  var kernels = [];
  var nextId = 0;
  var spawnTimer = 0;
  var SPAWN_RATE = 0.9;

  var caught = 0;
  var NEEDED = 30;
  var missed = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  var heatParticles = [];

  function spawnKernel() {
    kernels.push({
      id: nextId++,
      x: PAN_X - PAN_W * 0.4 + Math.random() * PAN_W * 0.8,
      y: PAN_Y - 20,
      heatTime: 0,
      HEAT_DUR: 1.2 + Math.random() * 1.0,
      popping: false,
      popTimer: 0,
      POP_WINDOW: 0.5,
      tapped: false,
      vy: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var hit = false;
    for (var i = kernels.length - 1; i >= 0; i--) {
      var k = kernels[i];
      if (!k.popping || k.tapped) continue;
      var dx = tx - k.x, dy = ty - k.y;
      if (dx * dx + dy * dy < 70 * 70) {
        k.tapped = true;
        caught++;
        flashCol = C.correct;
        flashAnim = 0.25;
        resultText = 'キャッチ！';
        resultTimer = 0.45;
        game.audio.play('se_success', 0.5);
        for (var p = 0; p < 6; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: k.x, y: k.y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: C.poppedHi });
        }
        if (caught >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(caught * 350 + Math.ceil(timeLeft) * 80); }, 700);
        }
        hit = true;
        break;
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

    spawnTimer += dt;
    if (spawnTimer >= SPAWN_RATE && kernels.length < 6) {
      spawnTimer = 0;
      spawnKernel();
    }

    // Heat particles
    if (Math.random() < dt * 6) {
      heatParticles.push({
        x: PAN_X - PAN_W * 0.35 + Math.random() * PAN_W * 0.7,
        y: PAN_Y - 10,
        vy: -80 - Math.random() * 60,
        life: 0.4 + Math.random() * 0.3
      });
    }

    for (var i = kernels.length - 1; i >= 0; i--) {
      var k = kernels[i];
      if (!k.popping) {
        k.heatTime += dt;
        if (k.heatTime >= k.HEAT_DUR) {
          k.popping = true;
          k.popTimer = k.POP_WINDOW;
          k.vy = -(400 + Math.random() * 200);
          game.audio.play('se_tap', 0.08);
        }
      } else {
        k.popTimer -= dt;
        k.y += k.vy * dt;
        k.vy += 600 * dt;
        if (k.popTimer <= 0 && !k.tapped) {
          // Escaped
          missed++;
          flashCol = C.wrong;
          flashAnim = 0.25;
          resultText = '逃げた！';
          resultTimer = 0.4;
          game.audio.play('se_failure', 0.2);
          kernels.splice(i, 1);
          if (missed >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          continue;
        }
        if (k.tapped || k.y > H) {
          kernels.splice(i, 1);
        }
      }
    }

    for (var hp = heatParticles.length - 1; hp >= 0; hp--) {
      heatParticles[hp].y += heatParticles[hp].vy * dt;
      heatParticles[hp].life -= dt * 2;
      if (heatParticles[hp].life <= 0) heatParticles.splice(hp, 1);
    }
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Heat particles (steam)
    for (var hpi = 0; hpi < heatParticles.length; hpi++) {
      var hp2 = heatParticles[hpi];
      game.draw.circle(hp2.x, hp2.y, 12 * hp2.life, C.heat, hp2.life * 0.25);
    }

    // Pan
    game.draw.rect(PAN_X - PAN_W / 2 + 6, PAN_Y + 6, PAN_W, PAN_H, '#000', 0.4);
    game.draw.rect(PAN_X - PAN_W / 2, PAN_Y, PAN_W, PAN_H, C.pan, 0.9);
    game.draw.rect(PAN_X - PAN_W / 2, PAN_Y, PAN_W, 14, C.panHi, 0.6);
    // Heat glow under pan
    game.draw.rect(PAN_X - PAN_W / 2 + 20, PAN_Y + PAN_H, PAN_W - 40, 20, C.heat, 0.3);

    // Handle
    game.draw.rect(PAN_X + PAN_W / 2, PAN_Y + 20, 120, 20, C.panHi, 0.7);

    // Kernels in pan (unpopped)
    for (var ki = 0; ki < kernels.length; ki++) {
      var k2 = kernels[ki];
      if (k2.popping) {
        // Popping kernel - bright and flying
        var popAlpha = k2.popTimer / k2.POP_WINDOW;
        var r2 = 40 + (1 - popAlpha) * 20;
        game.draw.circle(k2.x + 3, k2.y + 3, r2, '#000', 0.3);
        game.draw.circle(k2.x, k2.y, r2, C.popped, 0.9);
        game.draw.circle(k2.x - r2 * 0.3, k2.y - r2 * 0.3, r2 * 0.28, C.poppedHi, 0.6);
        if (popAlpha > 0.3) {
          game.draw.circle(k2.x, k2.y, r2 + 20, C.popped, popAlpha * 0.3);
          game.draw.text('POP!', k2.x, k2.y - r2 - 30, { size: 36, color: C.poppedHi, bold: true });
        }
      } else {
        // Heating kernel
        var heatRatio = k2.heatTime / k2.HEAT_DUR;
        var kCol = heatRatio > 0.7 ? C.kernelHi : C.kernel;
        game.draw.circle(k2.x, k2.y, 22, kCol, 0.85);
        if (heatRatio > 0.8) {
          var warnPulse = (Math.sin(elapsed * 10) + 1) * 0.5;
          game.draw.circle(k2.x, k2.y, 30, C.heat, warnPulse * 0.4);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.65, { size: 64, color: flashCol, bold: true });
    }

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < missed ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    spawnKernel();
    spawnKernel();
  });
})(game);
