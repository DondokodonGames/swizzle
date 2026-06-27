// 762-quick-draw.js
// クイックドロウ — 「DRAW！」の瞬間に最速タップ。一瞬の反射神経勝負
// 操作: タップ（早打ち専用。準備フェーズは絶対タップしてはいけない）
// 成功: 30回成功  失敗: 8回フライング or 8回遅すぎ or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0e0500',
    bgReady:  '#1a0c00',
    bgDraw:   '#3d1a00',
    holster:  '#78350f',
    holsterHi:'#d97706',
    gun:      '#92400e',
    gunHi:    '#fbbf24',
    muzzle:   '#fde68a',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    warn:     '#fbbf24',
    text:     '#f1f5f9',
    ui:       '#140800'
  };

  var phase = 'wait'; // 'wait' | 'ready' | 'draw' | 'result'
  var waitTimer = 0;
  var WAIT_DUR = 0;
  var DRAW_WINDOW = 0.42;
  var drawTimer = 0;
  var reactionMs = 0;
  var reactionStart = 0;
  var resultTimer = 0;
  var RESULT_DUR = 0.55;

  var score = 0;
  var NEEDED = 30;
  var earlyFires = 0;
  var slowFires = 0;
  var MAX_ERR = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;

  var muzzleFlash = 0;
  var flashAnim = 0, flashCol = C.correct;
  var resultText = '';
  var dustParticles = [];
  var stars = []; // background flavor
  for (var si = 0; si < 6; si++) {
    stars.push({ x: W * 0.1 + Math.random() * W * 0.8, y: H * 0.1 + Math.random() * H * 0.4 });
  }

  function startRound() {
    WAIT_DUR = 1.0 + Math.random() * 2.2;
    waitTimer = WAIT_DUR;
    reactionMs = 0;
    muzzleFlash = 0;
    phase = 'wait';
    DRAW_WINDOW = Math.max(0.28, 0.42 - score * 0.004);
  }

  game.onTap(function(tx, ty) {
    if (done || phase === 'result') return;

    if (phase === 'wait' || phase === 'ready') {
      // Early fire!
      earlyFires++;
      flashCol = C.wrong;
      flashAnim = 0.4;
      resultText = 'フライング！！';
      resultTimer = RESULT_DUR;
      game.audio.play('se_failure', 0.4);
      phase = 'result';
      if ((earlyFires >= MAX_ERR || slowFires >= MAX_ERR) && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 700);
      }
      return;
    }

    if (phase === 'draw') {
      reactionMs = Math.round((Date.now() - reactionStart));
      score++;
      muzzleFlash = 0.5;
      flashCol = C.correct;
      flashAnim = 0.22;
      var ms = reactionMs;
      resultText = ms < 200 ? '神速！ ' + ms + 'ms' : ms < 300 ? '速い！ ' + ms + 'ms' : ms + 'ms';
      resultTimer = RESULT_DUR;
      phase = 'result';
      game.audio.play('se_success', 0.65);
      for (var p = 0; p < 6; p++) {
        var pa = -Math.PI * 0.7 + Math.random() * Math.PI * 0.5;
        dustParticles.push({ x: W * 0.5 + Math.cos(pa) * 40, y: H * 0.55, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.4, col: C.muzzle });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 150); }, 700);
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

    if (phase === 'wait') {
      waitTimer -= dt;
      if (waitTimer <= 0) phase = 'ready';
    } else if (phase === 'ready') {
      // Brief "READY" state transitions to draw after a tiny moment
      waitTimer -= dt;
      if (waitTimer <= -0.08) {
        phase = 'draw';
        drawTimer = DRAW_WINDOW;
        reactionStart = Date.now();
      }
    } else if (phase === 'draw') {
      drawTimer -= dt;
      if (drawTimer <= 0) {
        // Too slow
        slowFires++;
        flashCol = C.wrong;
        flashAnim = 0.35;
        resultText = '遅すぎた！！';
        resultTimer = RESULT_DUR;
        game.audio.play('se_failure', 0.35);
        phase = 'result';
        if ((earlyFires >= MAX_ERR || slowFires >= MAX_ERR) && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 700);
        }
      }
    } else if (phase === 'result') {
      resultTimer -= dt;
      if (resultTimer <= 0 && !done) {
        startRound();
      }
    }

    if (muzzleFlash > 0) muzzleFlash -= dt * 4;
    if (flashAnim > 0) flashAnim -= dt * 3;

    for (var pp = dustParticles.length - 1; pp >= 0; pp--) {
      dustParticles[pp].x += dustParticles[pp].vx * dt;
      dustParticles[pp].y += dustParticles[pp].vy * dt;
      dustParticles[pp].vy += 300 * dt;
      dustParticles[pp].life -= dt * 2.8;
      if (dustParticles[pp].life <= 0) dustParticles.splice(pp, 1);
    }

    // Draw
    var bgCol = phase === 'draw' ? C.bgDraw : phase === 'ready' ? C.bgReady : C.bg;
    game.draw.rect(0, 0, W, H, bgCol);

    // Sun / moon atmosphere
    game.draw.circle(W / 2, H * 0.15, 120, '#fbbf24', 0.12);
    game.draw.circle(W / 2, H * 0.15, 80, '#fde68a', 0.18);
    game.draw.circle(W / 2, H * 0.15, 50, '#fef3c7', 0.25);

    // Ground
    game.draw.rect(0, H * 0.72, W, H * 0.28, '#1c0d00', 0.9);
    game.draw.rect(0, H * 0.72, W, 12, '#78350f', 0.5);

    // Gun silhouette
    var gunX = W / 2;
    var gunY = H * 0.55;
    game.draw.rect(gunX - 8, gunY - 20, 16, 60, C.holster, 0.8);
    game.draw.rect(gunX - 22, gunY - 10, 44, 22, C.gun, 0.9);
    game.draw.rect(gunX - 30, gunY - 10, 12, 14, C.gun, 0.85);
    game.draw.rect(gunX + 18, gunY - 6, 18, 8, C.gunHi, 0.9);
    // Barrel (pointing right)
    game.draw.rect(gunX + 32, gunY - 4, 32, 6, C.gunHi, 0.85);
    if (muzzleFlash > 0) {
      game.draw.circle(gunX + 68, gunY - 1, 22 * muzzleFlash, C.muzzle, muzzleFlash * 0.9);
      game.draw.circle(gunX + 68, gunY - 1, 12 * muzzleFlash, '#fff', muzzleFlash * 0.8);
    }

    // Phase text
    if (phase === 'wait' || phase === 'ready') {
      game.draw.text('・・・', W / 2, H * 0.36, { size: 72, color: C.warn + '66', bold: true });
      game.draw.text('まだだ', W / 2, H * 0.45, { size: 52, color: C.text + '55' });
    } else if (phase === 'draw') {
      var pulse = 1.0 + 0.04 * Math.sin(elapsed * 40);
      game.draw.text('DRAW！', W / 2, H * 0.36, { size: Math.floor(140 * pulse), color: C.muzzle, bold: true });
    }

    for (var pp2 = 0; pp2 < dustParticles.length; pp2++) {
      var p2 = dustParticles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.22, { size: 56, color: flashCol, bold: true });
    }

    // Error counters (two rows: early fires and slow fires)
    var totalErr = Math.max(earlyFires, slowFires);
    for (var ei = 0; ei < MAX_ERR; ei++) {
      var earlyFill = ei < earlyFires ? C.wrong : C.ui;
      var slowFill  = ei < slowFires  ? C.warn  : C.ui;
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.945, 20, earlyFill, 0.9);
      game.draw.circle(W / 2 - (MAX_ERR - 1) * 56 + ei * 112, H * 0.972, 14, slowFill, 0.7);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    startRound();
  });
})(game);
