// 659-spotlight.js
// スポットライト — 暗闇を照らした一瞬にタップせよ
// 操作: タップで役者をキャッチ
// 成功: 15回キャッチ  失敗: 8回見逃す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000003',
    stage:   '#08080f',
    curtain: '#3b0764',
    performer: '#f59e0b',
    performerHi: '#fde68a',
    spot:    '#fffde7',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#050508'
  };

  var STAGE_Y = H * 0.42;
  var PERFORMER_Y = H * 0.7;
  var SPOT_R = 170;
  var SPOT_SPEED = 500;

  var spotX = W / 2;
  var spotDir = 1;
  var performerX = W / 2;

  var illuminated = false;
  var wasIlluminated = false;
  var tappedThisWindow = false;

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

  function movePerformer() {
    performerX = 100 + Math.random() * (W - 200);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (illuminated && !tappedThisWindow) {
      caught++;
      tappedThisWindow = true;
      flashCol = C.correct;
      flashAnim = 0.35;
      resultText = 'キャッチ！';
      resultTimer = 0.55;
      game.audio.play('se_success', 0.65);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: performerX, y: PERFORMER_Y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.45, col: C.performerHi });
      }
      movePerformer();
      if (caught >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(caught * 400 + Math.ceil(timeLeft) * 100); }, 700);
      }
    }
    // tapping when dark = no penalty (too punishing)
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

    // Move spotlight with increasing speed
    var spd = SPOT_SPEED * (1 + elapsed * 0.014);
    spotX += spotDir * spd * dt;
    if (spotX > W - 50) { spotX = W - 50; spotDir = -1; }
    if (spotX < 50) { spotX = 50; spotDir = 1; }

    // Check illumination (performer within spotlight)
    wasIlluminated = illuminated;
    illuminated = Math.abs(spotX - performerX) < SPOT_R * 0.68;

    if (!wasIlluminated && illuminated) {
      tappedThisWindow = false;
    } else if (wasIlluminated && !illuminated) {
      if (!tappedThisWindow) {
        misses++;
        flashCol = C.wrong;
        flashAnim = 0.35;
        resultText = '見逃した！';
        resultTimer = 0.55;
        game.audio.play('se_failure', 0.3);
        movePerformer();
        if (misses >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stage
    game.draw.rect(0, STAGE_Y, W, H - STAGE_Y, C.stage, 0.9);
    game.draw.rect(0, STAGE_Y, W, 6, '#ffffff18', 0.9);

    // Curtains
    game.draw.rect(0, 0, 90, H * 0.68, C.curtain, 0.9);
    game.draw.rect(W - 90, 0, 90, H * 0.68, C.curtain, 0.9);
    game.draw.rect(0, 0, 90, H * 0.68, '#ffffff', 0.05);
    game.draw.rect(W - 90, 0, 90, H * 0.68, '#ffffff', 0.05);

    // Performer (hidden unless illuminated)
    var pAlpha = illuminated ? 0.92 : 0.04;
    game.draw.circle(performerX + 5, PERFORMER_Y + 5, 56, '#000', 0.35 * pAlpha / 0.92);
    game.draw.circle(performerX, PERFORMER_Y, 56, C.performer, pAlpha);
    game.draw.circle(performerX - 18, PERFORMER_Y - 18, 20, C.performerHi, pAlpha * 0.5);

    if (illuminated) {
      game.draw.text('NOW!', performerX, PERFORMER_Y - 90, { size: 52, color: '#fff', bold: true });
    }

    // Dark overlay to make non-spotlight areas dark
    game.draw.rect(0, 0, W, H, '#000000', 0.75);

    // Spotlight glow (drawn over overlay)
    game.draw.circle(spotX, PERFORMER_Y, SPOT_R + 40, C.spot, 0.05);
    game.draw.circle(spotX, PERFORMER_Y, SPOT_R, C.spot, 0.1);
    game.draw.circle(spotX, PERFORMER_Y, SPOT_R * 0.6, C.spot, 0.08);

    // Beam from top
    game.draw.line(W * 0.35, 0, spotX - SPOT_R, PERFORMER_Y, '#ffffff', 1);
    game.draw.line(W * 0.65, 0, spotX + SPOT_R, PERFORMER_Y, '#ffffff', 1);

    // Particles (drawn after overlay)
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 12 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.84, { size: 68, color: flashCol, bold: true });
    }

    // Miss indicators
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    movePerformer();
  });
})(game);
