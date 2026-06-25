// 138-keyhole.js
// 鍵穴 — 回転する鍵を正しい向きでタップして錠前を開ける瞬間の達成感
// 操作: タップで鍵を止める（正しい角度でないとNG）
// 成功: 5つの錠前を開ける  失敗: 4回失敗 or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04060a',
    lock:    '#1e3a5f',
    lockHi:  '#2563eb',
    key:     '#f59e0b',
    keyHi:   '#fbbf24',
    correct: '#22c55e',
    wrong:   '#ef4444',
    hole:    '#060a10',
    ui:      '#334155'
  };

  var LOCK_X = W / 2;
  var LOCK_Y = H * 0.45;
  var LOCK_R = 120;
  var HOLE_R = 40;

  // Target angle range where key fits (hole opening)
  var holeAngle = 0; // angle of the keyhole opening (changes each round)
  var TOLERANCE = 0.22; // radians = ~12.5 degrees each side

  var keyAngle = 0;
  var KEY_SPEED = 2.0; // rad/s (increases each level)
  var keyDir = 1;
  var stopped = false;
  var stopAngle = 0;
  var stopTimer = 0;

  var score = 0;
  var needed = 5;
  var misses = 0;
  var maxMisses = 4;
  var timeLeft = 30;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var unlockAnim = 0;
  var particles = [];

  function newRound() {
    holeAngle = Math.random() * Math.PI * 2;
    stopped = false;
    stopAngle = 0;
  }

  function angleDiff(a, b) {
    var d = ((a - b + Math.PI) % (Math.PI * 2)) - Math.PI;
    return Math.abs(d);
  }

  game.onTap(function() {
    if (done || stopped) return;
    stopped = true;
    stopAngle = keyAngle;
    stopTimer = 0.8;

    var diff = angleDiff(stopAngle, holeAngle);
    if (diff < TOLERANCE) {
      score++;
      feedbackOk = true;
      feedback = 0.5;
      unlockAnim = 0.5;
      game.audio.play('se_success');
      // Sparkle
      for (var pi = 0; pi < 14; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: LOCK_X, y: LOCK_Y, vx: Math.cos(ang)*180, vy: Math.sin(ang)*180, life: 0.5 });
      }
      if (score >= needed && !done) {
        done = true;
        setTimeout(function() { game.end.success(score*80 + Math.ceil(timeLeft)*15); }, 600);
        return;
      }
      KEY_SPEED += 0.3;
      setTimeout(function() { newRound(); }, 700);
    } else {
      misses++;
      feedbackOk = false;
      feedback = 0.5;
      game.audio.play('se_failure');
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
      setTimeout(function() { stopped = false; }, 600);
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

    if (!stopped) {
      keyAngle += KEY_SPEED * keyDir * dt;
    }
    if (stopTimer > 0) stopTimer -= dt;
    if (feedback > 0) feedback -= dt;
    if (unlockAnim > 0) unlockAnim -= dt;

    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].vy += 300 * dt;
      particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Lock body
    var lockPulse = unlockAnim > 0 ? (1 + unlockAnim * 0.3) : 1;
    var lockColor = unlockAnim > 0 ? C.correct : C.lock;
    game.draw.circle(LOCK_X, LOCK_Y, LOCK_R * lockPulse + 16, lockColor, 0.15);
    game.draw.circle(LOCK_X, LOCK_Y, LOCK_R * lockPulse, lockColor, 0.8);
    game.draw.circle(LOCK_X, LOCK_Y, LOCK_R * lockPulse - 16, C.bg, 0.4);

    // Lock shackle
    game.draw.rect(LOCK_X - 52, LOCK_Y - LOCK_R - 80, 104, 80, lockColor, 0.8);
    game.draw.rect(LOCK_X - 52, LOCK_Y - LOCK_R - 80, 20, 80, lockColor);
    game.draw.rect(LOCK_X + 32, LOCK_Y - LOCK_R - 80, 20, 80, lockColor);
    game.draw.circle(LOCK_X - 42, LOCK_Y - LOCK_R - 80, 30, lockColor);
    game.draw.circle(LOCK_X + 42, LOCK_Y - LOCK_R - 80, 30, lockColor);

    // Keyhole slot
    var hx = LOCK_X + Math.cos(holeAngle) * HOLE_R;
    var hy = LOCK_Y + Math.sin(holeAngle) * HOLE_R;
    // Draw hole opening as gap in lock
    game.draw.circle(LOCK_X + Math.cos(holeAngle) * (LOCK_R - HOLE_R/2), LOCK_Y + Math.sin(holeAngle) * (LOCK_R - HOLE_R/2), HOLE_R, C.hole, 0.8);

    // Key (rotating)
    var kx = LOCK_X + Math.cos(keyAngle) * (LOCK_R - 20);
    var ky = LOCK_Y + Math.sin(keyAngle) * (LOCK_R - 20);
    // Key handle
    game.draw.circle(kx, ky, 24, C.key, 0.9);
    game.draw.circle(kx, ky, 14, C.keyHi, 0.7);
    // Key shaft
    var k2x = LOCK_X + Math.cos(keyAngle) * 24;
    var k2y = LOCK_Y + Math.sin(keyAngle) * 24;
    game.draw.line(kx, ky, k2x, k2y, C.key, 12);
    // Key teeth
    var perpX = -Math.sin(keyAngle), perpY = Math.cos(keyAngle);
    game.draw.line(kx + perpX*20, ky + perpY*20, kx, ky, C.key, 8);

    // Proximity indicator
    if (!stopped) {
      var diff2 = angleDiff(keyAngle, holeAngle);
      var proximity = 1 - diff2 / Math.PI;
      if (proximity > 0.8) {
        game.draw.circle(LOCK_X, LOCK_Y, LOCK_R + 24, C.correct, (proximity - 0.8) * 2 * 0.4);
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8*part.life*2, C.key, part.life);
    }

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '解錠！' : 'ずれてる！', W/2, H*0.78, {
        size: 72, color: feedbackOk ? C.correct : C.wrong, bold: true
      });
      game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback * 0.15);
    }

    // Score
    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W/2+(mi-(maxMisses-1)/2)*52, 218, 18, mi < misses ? C.wrong : '#0a1020');
    }

    game.draw.text('正しい向きでタップ！', W/2, H*0.88, { size: 48, color: C.ui });

    var ratio = Math.max(0, timeLeft/30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.lock : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    newRound();
  });
})(game);
