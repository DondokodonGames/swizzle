// 128-tug-of-war.js
// 綱引き — 力強くタップし続けてロープを自陣に引き込む純粋な連打快感
// 操作: ひたすらタップ連打
// 成功: ロープを完全に自陣に引き込む  失敗: 相手に引き込まれる or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080408',
    rope:    '#d97706',
    ropeHi:  '#fbbf24',
    player:  '#3b82f6',
    playerHi:'#93c5fd',
    enemy:   '#ef4444',
    enemyHi: '#fca5a5',
    line:    '#334155',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  var ROPE_Y = H * 0.5;
  var CENTER_X = W / 2;
  var rope = 0; // -1 = fully enemy side, 1 = fully player side
  var PLAYER_POWER = 0.04; // per tap
  var ENEMY_POWER = 0.018; // per second (AI pressure)
  var FRICTION = 0.92; // velocity damping
  var ropeVel = 0;
  var WIN_DIST = 0.85;

  var timeLeft = 20;
  var done = false;
  var tapFlash = 0;
  var result = '';

  var taps = 0;
  var tapRate = 0;
  var lastTapTime = 0;
  var tapHistory = [];

  var shakeX = 0;
  var particles = [];

  game.onTap(function() {
    if (done) return;
    ropeVel += PLAYER_POWER;
    taps++;
    tapFlash = 0.12;
    // Track recent taps for rate
    var now = timeLeft;
    tapHistory.push(now);
    tapHistory = tapHistory.filter(function(t) { return now - t < 1.0; });
    tapRate = tapHistory.length;

    // Shake effect
    shakeX = 8 * (Math.random() - 0.5);

    // Power particle
    particles.push({ x: W * 0.25, y: ROPE_Y + (Math.random()-0.5)*40, vx: -80, vy: (Math.random()-0.5)*100, life: 0.3 });
    game.audio.play('se_tap', 0.5);
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

    // Enemy AI pressure (increases over time)
    var enemyPressure = ENEMY_POWER * (1 + (20 - timeLeft) * 0.05);
    ropeVel -= enemyPressure;

    // Friction
    ropeVel *= Math.pow(FRICTION, dt * 60);

    // Update rope
    rope += ropeVel * dt;
    rope = Math.max(-1, Math.min(1, rope));

    // Shake decay
    shakeX *= 0.85;

    // Check win/lose
    if (rope >= WIN_DIST && !done) {
      done = true;
      game.audio.play('se_success');
      result = 'WIN';
      setTimeout(function() { game.end.success(300 + taps * 5 + Math.ceil(timeLeft) * 20); }, 500);
    }
    if (rope <= -WIN_DIST && !done) {
      done = true;
      game.audio.play('se_failure');
      result = 'LOSE';
      setTimeout(function() { game.end.failure(); }, 500);
    }

    // Particles
    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx * dt;
      particles[pi].y += particles[pi].vy * dt;
      particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    if (tapFlash > 0) tapFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground line
    game.draw.rect(0, ROPE_Y + 60, W, H - ROPE_Y - 60, '#0a0808');
    game.draw.line(0, ROPE_Y + 60, W, ROPE_Y + 60, C.line, 4);

    // Center line
    game.draw.line(CENTER_X, ROPE_Y - 120, CENTER_X, ROPE_Y + 120, C.line, 3);
    game.draw.text('|', CENTER_X, ROPE_Y - 80, { size: 16, color: '#fff' });

    // Rope
    var ropeOffset = rope * (W * 0.35) + shakeX;
    var ropeStartX = CENTER_X + ropeOffset - W * 0.45;
    var ropeEndX = CENTER_X + ropeOffset + W * 0.45;
    // Rope segments
    game.draw.line(ropeStartX, ROPE_Y, ropeEndX, ROPE_Y, C.rope, 20);
    game.draw.line(ropeStartX, ROPE_Y, ropeEndX, ROPE_Y, C.ropeHi, 6);
    // Rope texture knots
    for (var ki = 0; ki < 8; ki++) {
      var kx = ropeStartX + (ki + 0.5) / 8 * (ropeEndX - ropeStartX);
      game.draw.circle(kx, ROPE_Y, 14, C.rope);
      game.draw.circle(kx, ROPE_Y, 6, C.ropeHi, 0.5);
    }

    // Flag on rope
    var flagX = CENTER_X + ropeOffset;
    game.draw.circle(flagX, ROPE_Y, 22, '#fff');
    game.draw.rect(flagX - 10, ROPE_Y - 10, 20, 20, '#facc15');

    // Player side (left)
    var playerX = 120 + ropeOffset * 0.3 + shakeX;
    game.draw.circle(playerX, ROPE_Y - 10, 52, C.playerHi, 0.2);
    game.draw.circle(playerX, ROPE_Y - 10, 44, C.player, 0.8);
    game.draw.text('≫', playerX, ROPE_Y - 10, { size: 40, color: C.playerHi, bold: true });

    // Enemy side (right)
    var enemyX = W - 120 + ropeOffset * 0.3;
    game.draw.circle(enemyX, ROPE_Y - 10, 52, C.enemyHi, 0.2);
    game.draw.circle(enemyX, ROPE_Y - 10, 44, C.enemy, 0.8);
    game.draw.text('≪', enemyX, ROPE_Y - 10, { size: 40, color: C.enemyHi, bold: true });

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 3, C.playerHi, part.life);
    }

    // Tap flash
    if (tapFlash > 0) {
      game.draw.rect(0, 0, W, H, C.player, tapFlash * 0.15);
    }

    // Tap rate indicator
    var rateColor = tapRate >= 8 ? C.correct : (tapRate >= 4 ? C.ropeHi : C.ui);
    game.draw.text('連打: ' + tapRate + '/s', W/2, 148, { size: 52, color: rateColor, bold: true });

    // Result
    if (result) {
      game.draw.text(result === 'WIN' ? '引き勝ち！' : '引き負け…', W/2, H*0.35, {
        size: 80, color: result === 'WIN' ? C.correct : C.wrong, bold: true
      });
    }

    game.draw.text('連打で引き込め！', W/2, H*0.88, { size: 52, color: C.ui });

    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.rope : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
  });
})(game);
