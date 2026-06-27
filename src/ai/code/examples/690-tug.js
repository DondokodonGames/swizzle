// 690-tug.js
// 綱引き — 連打で全力で綱を引き、相手より先にゴールラインを引き込め
// 操作: 連打で綱を引く
// 成功: 10勝  失敗: 10敗 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#06030a',
    ropeL:   '#22c55e',
    ropeR:   '#ef4444',
    rope:    '#d97706',
    ropeHi:  '#fde68a',
    marker:  '#f1f5f9',
    lineL:   '#22c55e',
    lineR:   '#ef4444',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a0510'
  };

  var ROPE_Y = H * 0.5;
  var ROPE_MID = W / 2;
  var MARKER_R = 36;
  var WIN_DIST = W * 0.3;
  var CPU_RATE = 3.8; // CPU taps per second

  var markerX = ROPE_MID;
  var targetX = ROPE_MID;

  var playerForce = 0;
  var cpuForce = 0;
  var cpuTimer = 0;

  var PLAYER_PULL = 80;
  var CPU_PULL = 70;
  var DAMPING = 4.0;

  var wins = 0;
  var losses = 0;
  var NEEDED_WINS = 10;
  var MAX_LOSSES = 10;
  var roundDone = false;
  var waitTimer = 0;

  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var tapFlash = 0;

  function newRound() {
    markerX = ROPE_MID;
    targetX = ROPE_MID;
    playerForce = 0;
    cpuForce = 0;
    cpuTimer = 0;
    roundDone = false;
    waitTimer = 0;
  }

  game.onTap(function(tx, ty) {
    if (done || roundDone) return;
    playerForce += PLAYER_PULL;
    tapFlash = 0.2;
    game.audio.play('se_tap', 0.08);
    for (var p = 0; p < 3; p++) {
      particles.push({ x: tx, y: ty, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.8) * 120, life: 0.3, col: C.ropeL });
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
    if (tapFlash > 0) tapFlash -= dt * 5;

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) newRound();
    }

    if (!roundDone && !done) {
      // CPU force
      cpuTimer += dt;
      var cpuInterval = 1.0 / (CPU_RATE + wins * 0.15);
      if (cpuTimer >= cpuInterval) {
        cpuTimer -= cpuInterval;
        cpuForce += CPU_PULL;
      }

      // Apply forces: player pulls left, CPU pulls right
      var netForce = cpuForce - playerForce;
      targetX += netForce * dt;
      targetX = Math.max(ROPE_MID - WIN_DIST - 50, Math.min(ROPE_MID + WIN_DIST + 50, targetX));

      // Decay forces
      playerForce *= Math.max(0, 1 - DAMPING * dt);
      cpuForce *= Math.max(0, 1 - DAMPING * dt);

      markerX += (targetX - markerX) * Math.min(1, dt * 8);

      // Check win/loss
      if (markerX <= ROPE_MID - WIN_DIST) {
        // Player wins
        roundDone = true;
        wins++;
        flashCol = C.correct;
        flashAnim = 0.4;
        resultText = '勝利！';
        resultTimer = 0.7;
        game.audio.play('se_success', 0.75);
        for (var p = 0; p < 8; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: W * 0.2, y: ROPE_Y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.correct });
        }
        if (wins >= NEEDED_WINS && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(wins * 500 + Math.ceil(timeLeft) * 60); }, 700);
        } else {
          waitTimer = 0.9;
        }
      } else if (markerX >= ROPE_MID + WIN_DIST) {
        // CPU wins
        roundDone = true;
        losses++;
        flashCol = C.wrong;
        flashAnim = 0.4;
        resultText = '敗北...';
        resultTimer = 0.7;
        game.audio.play('se_failure', 0.5);
        if (losses >= MAX_LOSSES && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          waitTimer = 0.9;
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

    // Win lines
    game.draw.line(ROPE_MID - WIN_DIST, ROPE_Y - 160, ROPE_MID - WIN_DIST, ROPE_Y + 160, C.lineL, 5);
    game.draw.line(ROPE_MID + WIN_DIST, ROPE_Y - 160, ROPE_MID + WIN_DIST, ROPE_Y + 160, C.lineR, 5);
    game.draw.text('YOU', ROPE_MID - WIN_DIST - 80, ROPE_Y - 180, { size: 36, color: C.lineL });
    game.draw.text('CPU', ROPE_MID + WIN_DIST + 20, ROPE_Y - 180, { size: 36, color: C.lineR });

    // Center line
    game.draw.line(ROPE_MID, ROPE_Y - 80, ROPE_MID, ROPE_Y + 80, '#ffffff18', 2);

    // Rope
    game.draw.line(0, ROPE_Y, W, ROPE_Y, C.rope, 22);
    game.draw.line(0, ROPE_Y, W, ROPE_Y, C.ropeHi, 6);
    // Rope texture
    for (var ri = 0; ri < 10; ri++) {
      var rx = W * ri / 10 + (elapsed * 60) % (W / 10);
      game.draw.line(rx, ROPE_Y - 9, rx + 20, ROPE_Y + 9, C.rope, 3);
    }

    // Marker (where rope is grabbed)
    game.draw.circle(markerX + 5, ROPE_Y + 5, MARKER_R, '#000', 0.35);
    game.draw.circle(markerX, ROPE_Y, MARKER_R, C.marker, 0.95);
    game.draw.circle(markerX - MARKER_R * 0.3, ROPE_Y - MARKER_R * 0.3, MARKER_R * 0.2, '#fff', 0.4);

    // Tension bar
    var tension = Math.abs(markerX - ROPE_MID) / WIN_DIST;
    var barW = W * 0.7;
    var barX = W * 0.15;
    var barY = ROPE_Y + 140;
    var tCol = markerX < ROPE_MID ? C.correct : C.wrong;
    game.draw.rect(barX, barY, barW, 28, '#1e293b', 0.7);
    game.draw.rect(barX + barW / 2, barY, (markerX - ROPE_MID) / WIN_DIST * barW / 2, 28, tCol, 0.8);
    game.draw.line(barX + barW / 2, barY - 6, barX + barW / 2, barY + 34, '#ffffff44', 2);

    // Player force indicator
    var pfRatio = Math.min(1, playerForce / (PLAYER_PULL * 5));
    game.draw.rect(40, ROPE_Y - 60, 28, 120, '#1e293b', 0.6);
    game.draw.rect(40, ROPE_Y - 60 + (1 - pfRatio) * 120, 28, pfRatio * 120, C.correct, 0.8);
    game.draw.text('連打!', 54, ROPE_Y + 110, { size: 30, color: C.correct });

    if (tapFlash > 0) game.draw.rect(0, 0, W, H, C.ropeL, tapFlash * 0.06);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, ROPE_Y + 260, { size: 72, color: flashCol, bold: true });
    }

    // Score
    game.draw.text(wins + '勝 ' + losses + '敗', W / 2, 148, { size: 56, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    newRound();
  });
})(game);
