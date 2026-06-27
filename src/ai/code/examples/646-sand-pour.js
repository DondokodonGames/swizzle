// 646-sand-pour.js
// サンドポア — 砂をガラスに注ぎ、目盛ぴったりで止めろ
// 操作: タップで砂を注ぐ/止める
// 成功: 10回ぴったり止める  失敗: 5回外す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0604',
    sand:    '#d97706',
    sandHi:  '#fde68a',
    sandLo:  '#92400e',
    glass:   '#0c2a40',
    glassHi: '#164e63',
    glassRim:'#0e7490',
    target:  '#22c55e',
    targetHi:'#86efac',
    over:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#120a04'
  };

  var GLASS_X = W / 2;
  var GLASS_W = 280;
  var GLASS_H = 600;
  var GLASS_Y = H * 0.35;

  var sandLevel = 0;   // 0-100
  var targetLevel = 0;
  var pouring = false;
  var POUR_RATE = 22; // per second
  var overPoured = false;

  var score = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.target;
  var resultText = '';
  var resultTimer = 0;
  var checkPending = false;
  var sandParticles = [];

  function newRound() {
    sandLevel = 0;
    overPoured = false;
    pouring = false;
    targetLevel = 30 + Math.floor(Math.random() * 50); // 30-80%
  }

  function checkResult() {
    var diff = Math.abs(sandLevel - targetLevel);
    if (diff <= 5) {
      // Correct!
      score++;
      flashCol = C.target;
      flashAnim = 0.3;
      resultText = diff <= 2 ? 'ぴったり！' : 'OK！';
      resultTimer = 0.7;
      game.audio.play('se_success', diff <= 2 ? 0.7 : 0.5);
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 80); }, 800);
        return;
      }
    } else {
      misses++;
      flashCol = C.over;
      flashAnim = 0.3;
      resultText = Math.abs(Math.round(sandLevel - targetLevel)) + '% ずれ';
      resultTimer = 0.7;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 600);
        return;
      }
    }
    setTimeout(newRound, 900);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (checkPending) return;

    if (!pouring && sandLevel < 100) {
      pouring = true;
      game.audio.play('se_tap', 0.1);
    } else if (pouring) {
      pouring = false;
      checkPending = true;
      setTimeout(function() {
        checkPending = false;
        checkResult();
      }, 100);
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

    if (pouring && sandLevel < 100) {
      sandLevel += POUR_RATE * dt;
      sandLevel = Math.min(100, sandLevel);

      // Sand particles
      if (Math.random() < 0.4) {
        sandParticles.push({
          x: GLASS_X + (Math.random() - 0.5) * 40,
          y: GLASS_Y - 80,
          vy: 200 + Math.random() * 100,
          life: 0.4,
          r: 4 + Math.random() * 6
        });
      }

      if (sandLevel >= 100) {
        pouring = false;
        overPoured = true;
        game.audio.play('se_failure', 0.3);
        checkPending = true;
        setTimeout(function() {
          checkPending = false;
          checkResult();
        }, 300);
      }
    }

    for (var sp = sandParticles.length - 1; sp >= 0; sp--) {
      sandParticles[sp].y += sandParticles[sp].vy * dt;
      sandParticles[sp].life -= dt * 2.5;
      if (sandParticles[sp].life <= 0) sandParticles.splice(sp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background shelf
    game.draw.rect(W / 2 - 200, GLASS_Y + GLASS_H + 10, 400, 24, C.ui, 0.8);

    // Glass
    var glassLeft = GLASS_X - GLASS_W / 2;
    // Glass back
    game.draw.rect(glassLeft, GLASS_Y, GLASS_W, GLASS_H, C.glass, 0.7);
    // Sand inside
    var sandH = (sandLevel / 100) * (GLASS_H - 20);
    if (sandH > 0) {
      var sandY = GLASS_Y + GLASS_H - 10 - sandH;
      game.draw.rect(glassLeft + 10, sandY, GLASS_W - 20, sandH, C.sandLo, 0.9);
      game.draw.rect(glassLeft + 10, sandY, GLASS_W - 20, 12, C.sand, 0.8);
    }
    // Target line
    var targetY = GLASS_Y + GLASS_H - 10 - (targetLevel / 100) * (GLASS_H - 20);
    game.draw.rect(glassLeft - 10, targetY - 4, GLASS_W + 20, 8, C.target, 0.8);
    game.draw.text(targetLevel + '%', glassLeft - 60, targetY + 5, { size: 30, color: C.targetHi, bold: true });

    // Glass walls (front overlay)
    game.draw.rect(glassLeft, GLASS_Y, 12, GLASS_H, C.glassHi, 0.4);
    game.draw.rect(glassLeft + GLASS_W - 12, GLASS_Y, 12, GLASS_H, C.glassHi, 0.4);
    game.draw.rect(glassLeft, GLASS_Y + GLASS_H - 12, GLASS_W, 12, C.glassRim, 0.6);
    // Rim highlight
    game.draw.rect(glassLeft - 10, GLASS_Y - 16, GLASS_W + 20, 16, C.glassRim, 0.7);

    // Sand pour stream
    if (pouring) {
      for (var sy = GLASS_Y - 80; sy < GLASS_Y; sy += 20) {
        game.draw.rect(GLASS_X - 12, sy, 24, 16, C.sand, 0.6 + Math.random() * 0.2);
      }
    }

    // Sand particles
    for (var sp2 = 0; sp2 < sandParticles.length; sp2++) {
      var s = sandParticles[sp2];
      game.draw.circle(s.x, s.y, s.r, C.sandHi, s.life);
    }

    // Sand level %
    game.draw.text(Math.round(sandLevel) + '%', GLASS_X + GLASS_W / 2 + 20, GLASS_Y + GLASS_H / 2, { size: 44, color: C.sand, bold: true });

    // Controls
    if (!pouring && sandLevel < 100 && !checkPending) {
      game.draw.text('タップで注ぐ', W / 2, GLASS_Y - 120, { size: 44, color: '#ffffff88' });
    } else if (pouring) {
      game.draw.text('タップで止める！', W / 2, GLASS_Y - 120, { size: 44, color: C.target, bold: true });
    }

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 64, color: flashCol, bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 52 + mi * 104, H * 0.955, 22, mi < misses ? C.over : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.sandHi : C.over);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    newRound();
  });
})(game);
