// 032-quickdraw.js
// クイックドロー — 「今だ！」の瞬間に最速でタップする反射神経
// 操作: 「DRAW!」が出た瞬間にタップ（早すぎも失敗）
// 成功: 0.5秒以内に5回反応  失敗: 0.5秒超過 or 早打ち3回 or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#1a0e00',
    sunset:  '#7c2d12',
    ground:  '#292524',
    sun:     '#fbbf24',
    cactus:  '#166534',
    silh:    '#0c0a08',
    drawText:'#fef3c7',
    ready:   '#f59e0b',
    good:    '#22c55e',
    bad:     '#ef4444',
    ui:      '#d97706'
  };

  var score = 0;
  var needed = 5;
  var earlyShots = 0;
  var maxEarly = 3;
  var timeLeft = 20;
  var done = false;

  var phase = 'wait';   // 'wait' | 'draw' | 'result'
  var waitTimer = 0;    // countdown before DRAW! appears
  var drawTimer = 0;    // time since DRAW! appeared
  var resultTimer = 0;
  var reactionTime = 0;
  var feedbackOk = false;
  var DRAW_TIMEOUT = 0.5; // must react within 0.5s

  var ripples = [];

  function nextRound() {
    phase = 'wait';
    waitTimer = 1.5 + Math.random() * 2.5; // random wait before DRAW!
  }

  game.onTap(function(x, y) {
    if (done) return;

    if (phase === 'wait') {
      // Too early!
      earlyShots++;
      feedbackOk = false;
      reactionTime = 0;
      phase = 'result';
      resultTimer = 0.8;
      game.audio.play('se_failure', 0.7);
      ripples.push({ x: x, y: y, r: 0, life: 0.5 });
      if (earlyShots >= maxEarly && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 900);
      }
    } else if (phase === 'draw') {
      reactionTime = drawTimer;
      if (reactionTime <= DRAW_TIMEOUT) {
        score++;
        feedbackOk = true;
        game.audio.play('se_tap', 1.0);
        ripples.push({ x: x, y: y, r: 0, life: 0.5 });
        if (score >= needed) {
          done = true;
          game.audio.play('se_success');
          setTimeout(function() {
            game.end.success(score * 20 + Math.round((DRAW_TIMEOUT - reactionTime) * 200) + Math.ceil(timeLeft) * 3);
          }, 600);
        }
      } else {
        feedbackOk = false;
        game.audio.play('se_failure', 0.5);
      }
      phase = 'result';
      resultTimer = 0.7;
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    if (phase === 'wait') {
      waitTimer -= dt;
      if (waitTimer <= 0) {
        phase = 'draw';
        drawTimer = 0;
        game.audio.play('se_tap', 0.3);
      }
    } else if (phase === 'draw') {
      drawTimer += dt;
      if (drawTimer > DRAW_TIMEOUT + 0.3) {
        // Too slow
        feedbackOk = false;
        reactionTime = drawTimer;
        phase = 'result';
        resultTimer = 0.8;
        game.audio.play('se_failure', 0.4);
      }
    } else if (phase === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0 && !done) nextRound();
    }

    // Update ripples
    for (var i = ripples.length - 1; i >= 0; i--) {
      ripples[i].r += 400 * dt;
      ripples[i].life -= dt;
      if (ripples[i].life <= 0) ripples.splice(i, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Desert sky
    game.draw.rect(0, 0, W, H * 0.65, '#1a0e00');
    // Sunset gradient (layered)
    game.draw.rect(0, H * 0.35, W, H * 0.2, '#7c2d12', 0.6);
    game.draw.rect(0, H * 0.45, W, H * 0.15, '#f97316', 0.3);

    // Sun
    game.draw.circle(W * 0.72, H * 0.38, 110, C.sun, 0.9);
    game.draw.circle(W * 0.72, H * 0.38, 80, '#fef3c7');

    // Ground
    game.draw.rect(0, H * 0.62, W, H * 0.38, C.ground);
    game.draw.rect(0, H * 0.62, W, 8, '#3d3531');

    // Cactus silhouettes
    var cactuses = [[200, H*0.62, 40, 200], [W-220, H*0.62, 40, 180], [W*0.5 - 300, H*0.62, 30, 150]];
    for (var c2 = 0; c2 < cactuses.length; c2++) {
      var cc = cactuses[c2];
      game.draw.rect(cc[0] - cc[2]/2, cc[1] - cc[3], cc[2], cc[3], C.cactus);
      // arms
      game.draw.rect(cc[0] - cc[2]*1.5, cc[1] - cc[3]*0.6, cc[2], cc[3]*0.3, C.cactus);
      game.draw.rect(cc[0] + cc[2]/2, cc[1] - cc[3]*0.7, cc[2], cc[3]*0.25, C.cactus);
    }

    // Player silhouette (gunslinger)
    var px = W * 0.5, py = H * 0.62;
    game.draw.rect(px - 30, py - 320, 60, 200, C.silh); // body
    game.draw.circle(px, py - 340, 70, C.silh);          // head
    game.draw.rect(px - 10, py - 120, 20, 120, C.silh);  // legs
    game.draw.rect(px + 30, py - 250, 80, 16, C.silh);   // gun arm

    // DRAW state display
    if (phase === 'draw') {
      var pulse = 0.8 + 0.2 * Math.sin(game.time.elapsed * 25);
      game.draw.text('DRAW!', W / 2, H * 0.42, { size: 180, color: C.drawText, bold: true });
      game.draw.rect(0, 0, W, H, '#fef3c7', 0.04 * pulse);
    } else if (phase === 'wait') {
      // Tension building
      var tension = 1 - waitTimer / 4.0;
      var readyColor = tension > 0.7 ? C.bad : (tension > 0.4 ? C.ready : '#92400e');
      game.draw.text('...', W / 2, H * 0.42, { size: 120, color: readyColor, bold: true });
    } else if (phase === 'result') {
      var prog = 1 - resultTimer / 0.8;
      if (feedbackOk) {
        var ms = Math.round(reactionTime * 1000);
        game.draw.text(ms + 'ms!', W / 2, H * 0.35, { size: 100, color: C.good, bold: true });
      } else if (reactionTime === 0) {
        game.draw.text('早すぎ！', W / 2, H * 0.35, { size: 100, color: C.bad, bold: true });
      } else {
        game.draw.text('遅すぎ！', W / 2, H * 0.35, { size: 100, color: C.bad, bold: true });
      }
    }

    // Ripples
    for (var r = 0; r < ripples.length; r++) {
      var rip = ripples[r];
      var ra = rip.life / 0.5;
      game.draw.circle(rip.x, rip.y, rip.r, '#fff', ra * 0.4);
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#140900');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ui : C.bad);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & early shots
    game.draw.text(score + ' / ' + needed, W / 2, 128, { size: 56, color: C.sun, bold: true });
    for (var e = 0; e < maxEarly; e++) {
      var ex = W / 2 + (e - (maxEarly-1)/2) * 64;
      game.draw.circle(ex, 200, 18, e < earlyShots ? C.bad : '#44403c');
    }

    // Guide
    game.draw.text('「DRAW!」が出たらタップ！', W / 2, H - 200, { size: 48, color: '#78716c' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    nextRound();
  });
})(game);
