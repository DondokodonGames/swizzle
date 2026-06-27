// 684-relay.js
// バトンリレー — 二人のランナーが交差する瞬間にタップでバトンを渡せ
// 操作: タップでバトンタッチ
// 成功: 15回成功  失敗: 8回ミス or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040a04',
    track:   '#0a1a0a',
    runner1: '#22c55e',
    runner2: '#3b82f6',
    baton:   '#fde68a',
    zone:    '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#05100a'
  };

  var TRACK_Y = H * 0.5;
  var BATON_ZONE = 120; // pixels overlap for successful pass

  var r1X = 0; // runner 1 starts left, moves right
  var r2X = W; // runner 2 starts right, moves left
  var R = 52;
  var speed = 0;
  var running = false;
  var passed = false;
  var missed = false;
  var waitTimer = 0;

  var successes = 0;
  var NEEDED = 15;
  var errors = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function newRound() {
    r1X = -R;
    r2X = W + R;
    speed = 380 + successes * 25;
    passed = false;
    missed = false;
    running = true;
    waitTimer = 0;
  }

  function checkPass() {
    var dist = Math.abs(r1X - r2X);
    return dist <= BATON_ZONE;
  }

  game.onTap(function(tx, ty) {
    if (done || !running || passed || missed) return;
    if (checkPass()) {
      passed = true;
      running = false;
      successes++;
      flashCol = C.correct;
      flashAnim = 0.35;
      resultText = 'バトンタッチ！';
      resultTimer = 0.6;
      game.audio.play('se_success', 0.7);
      for (var p = 0; p < 8; p++) {
        var px = (r1X + r2X) / 2;
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: px, y: TRACK_Y, vx: Math.cos(pa) * 220, vy: Math.sin(pa) * 220, life: 0.5, col: C.baton });
      }
      if (successes >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(successes * 350 + Math.ceil(timeLeft) * 60); }, 700);
      } else {
        waitTimer = 0.9;
      }
    } else {
      // Too early or too late
      if (!missed) {
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.35;
        resultText = 'タイミングが違う！';
        resultTimer = 0.6;
        game.audio.play('se_failure', 0.45);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
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

    if (waitTimer > 0) {
      waitTimer -= dt;
      if (waitTimer <= 0) newRound();
    }

    if (running) {
      r1X += speed * dt;
      r2X -= speed * dt;

      // Runners crossed without pass = miss
      if (r1X > r2X && !passed && !missed) {
        missed = true;
        running = false;
        errors++;
        flashCol = C.wrong;
        flashAnim = 0.4;
        resultText = '渡し損ねた！';
        resultTimer = 0.6;
        game.audio.play('se_failure', 0.45);
        if (errors >= MAX_ERR && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          waitTimer = 0.9;
        }
      }

      // Off-screen cleanup (should be handled by crossed check above)
      if (r1X > W + R * 2 && !missed) {
        missed = true;
        running = false;
        errors++;
        if (errors >= MAX_ERR && !done) {
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

    // Track
    game.draw.rect(0, TRACK_Y - 90, W, 180, C.track, 0.9);
    game.draw.line(0, TRACK_Y - 90, W, TRACK_Y - 90, '#ffffff18', 3);
    game.draw.line(0, TRACK_Y + 90, W, TRACK_Y + 90, '#ffffff18', 3);

    // Lane lines
    for (var li = 1; li < 8; li++) {
      game.draw.line(li * W / 8, TRACK_Y - 90, li * W / 8, TRACK_Y + 90, '#ffffff08', 2);
    }

    // Baton pass zone indicator
    if (running) {
      var zx = (r1X + r2X) / 2;
      var inZone = checkPass();
      var zCol = inZone ? C.zone : '#ffffff22';
      var zAlpha = inZone ? 0.2 : 0.08;
      game.draw.rect(zx - BATON_ZONE / 2, TRACK_Y - 80, BATON_ZONE, 160, zCol, zAlpha);
      if (inZone) {
        game.draw.text('NOW！', zx, TRACK_Y - 110, { size: 48, color: C.zone, bold: true });
      }
    }

    // Runner 1 (green, goes right, has baton)
    if (r1X > -R * 2 && r1X < W + R * 2) {
      game.draw.circle(r1X + 4, TRACK_Y + 4, R, '#000', 0.3);
      game.draw.circle(r1X, TRACK_Y, R, C.runner1, 0.9);
      game.draw.circle(r1X - R * 0.3, TRACK_Y - R * 0.3, R * 0.22, '#86efac', 0.5);
      if (!passed) {
        // Baton
        game.draw.line(r1X + R * 0.4, TRACK_Y - R * 0.6, r1X + R + 25, TRACK_Y - R * 0.3, C.baton, 12);
        game.draw.circle(r1X + R + 25, TRACK_Y - R * 0.3, 16, C.baton, 0.9);
      }
      game.draw.text('1', r1X, TRACK_Y + 14, { size: 44, color: '#fff', bold: true });
    }

    // Runner 2 (blue, goes left, receives baton)
    if (r2X > -R * 2 && r2X < W + R * 2) {
      game.draw.circle(r2X + 4, TRACK_Y + 4, R, '#000', 0.3);
      game.draw.circle(r2X, TRACK_Y, R, C.runner2, 0.9);
      game.draw.circle(r2X - R * 0.3, TRACK_Y - R * 0.3, R * 0.22, '#93c5fd', 0.5);
      if (passed) {
        game.draw.line(r2X - R * 0.4, TRACK_Y - R * 0.6, r2X - R - 25, TRACK_Y - R * 0.3, C.baton, 12);
        game.draw.circle(r2X - R - 25, TRACK_Y - R * 0.3, 16, C.baton, 0.9);
      }
      game.draw.text('2', r2X, TRACK_Y + 14, { size: 44, color: '#fff', bold: true });
    }

    // Arrow hints
    game.draw.text('→', W * 0.1, TRACK_Y - 130, { size: 48, color: '#22c55e44' });
    game.draw.text('←', W * 0.9, TRACK_Y - 130, { size: 48, color: '#3b82f644' });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.83, { size: 52, color: flashCol, bold: true });
    }

    for (var ei = 0; ei < MAX_ERR; ei++) {
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 52 + ei * 104, H * 0.955, 20, ei < errors ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(successes + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    newRound();
  });
})(game);
