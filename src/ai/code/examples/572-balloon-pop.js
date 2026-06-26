// 572-balloon-pop.js
// バルーンポップ — 特定の色だけを素早く割っていく爽快感
// 操作: タップで風船を割る（間違った色は減点）
// 成功: 25個正解の色  失敗: 10個の間違い or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0614',
    text:    '#f1f5f9',
    ui:      '#374151',
    correct: '#22c55e',
    wrong:   '#ef4444',
    string:  '#8b7355'
  };

  var BALLOON_COLORS = [
    { fill: '#ef4444', hi: '#fca5a5', name: '赤' },
    { fill: '#3b82f6', hi: '#93c5fd', name: '青' },
    { fill: '#22c55e', hi: '#86efac', name: '緑' },
    { fill: '#f59e0b', hi: '#fcd34d', name: '黄' },
    { fill: '#a855f7', hi: '#d8b4fe', name: '紫' }
  ];

  var targetColorIdx = 0;
  var balloons = [];
  var popped = 0;
  var NEEDED = 25;
  var wrongPops = 0;
  var MAX_WRONG = 10;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var nextBalloon = 0.5;
  var flashAnim = 0, flashCol = C.correct;
  var wobble = 0;

  function spawnBalloon() {
    var colorIdx = Math.floor(Math.random() * BALLOON_COLORS.length);
    var r = 50 + Math.random() * 30;
    var x = r + Math.random() * (W - r * 2);
    balloons.push({
      x: x,
      y: H + r + 20,
      r: r,
      colorIdx: colorIdx,
      vy: -(150 + Math.random() * 120),
      vx: (Math.random() - 0.5) * 60,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 2 + Math.random() * 2,
      life: 1.0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Find tapped balloon (top-most first)
    for (var i = balloons.length - 1; i >= 0; i--) {
      var b = balloons[i];
      var dx = tx - b.x, dy = ty - b.y;
      if (Math.sqrt(dx * dx + dy * dy) < b.r + 10) {
        // Pop it
        var isCorrect = (b.colorIdx === targetColorIdx);
        var col = BALLOON_COLORS[b.colorIdx];
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 0.5, col: col.fill });
        }
        balloons.splice(i, 1);

        if (isCorrect) {
          popped++;
          flashCol = C.correct;
          flashAnim = 0.2;
          wobble = 0.3;
          game.audio.play('se_success', 0.6);
          if (popped >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(popped * 200 + Math.ceil(timeLeft) * 100); }, 700);
          }
        } else {
          wrongPops++;
          flashCol = C.wrong;
          flashAnim = 0.3;
          game.audio.play('se_failure', 0.3);
          // Change target color on wrong pop
          targetColorIdx = Math.floor(Math.random() * BALLOON_COLORS.length);
          if (wrongPops >= MAX_WRONG && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        return;
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
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (wobble > 0) wobble -= dt * 3;

    nextBalloon -= dt;
    if (nextBalloon <= 0 && !done) {
      spawnBalloon();
      if (Math.random() < 0.3) spawnBalloon();
      nextBalloon = 0.4 + Math.random() * 0.5;
    }

    for (var i = balloons.length - 1; i >= 0; i--) {
      var b = balloons[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.wobble += b.wobbleSpeed * dt;
      // Bounce off sides
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      // Remove if off top
      if (b.y + b.r < -20) balloons.splice(i, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background gradient hint
    game.draw.rect(0, H * 0.6, W, H * 0.4, '#070410', 0.5);

    // Balloons
    for (var i2 = 0; i2 < balloons.length; i2++) {
      var b2 = balloons[i2];
      var col = BALLOON_COLORS[b2.colorIdx];
      var wobbleX = Math.sin(b2.wobble) * 8;
      var isTarget = b2.colorIdx === targetColorIdx;

      // String
      game.draw.line(b2.x + wobbleX, b2.y + b2.r, b2.x + wobbleX, b2.y + b2.r + 80, C.string, 2);

      // Shadow
      game.draw.circle(b2.x + wobbleX + 6, b2.y + 6, b2.r, '#000', 0.2);

      // Balloon body
      game.draw.circle(b2.x + wobbleX, b2.y, b2.r, col.fill, 0.9);
      // Shine
      game.draw.circle(b2.x + wobbleX - b2.r * 0.25, b2.y - b2.r * 0.25, b2.r * 0.3, col.hi, 0.6);

      // Target highlight
      if (isTarget) {
        game.draw.circle(b2.x + wobbleX, b2.y, b2.r + 14, col.fill, 0.2 + Math.sin(elapsed * 6) * 0.1);
        game.draw.circle(b2.x + wobbleX, b2.y, b2.r + 4, '#fff', 0.3);
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Target color display
    var tc = BALLOON_COLORS[targetColorIdx];
    var wobAmt = wobble > 0 ? Math.sin(elapsed * 20) * 10 : 0;
    game.draw.rect(W / 2 - 160, 80, 320, 120, tc.fill, 0.2 + wobble * 0.1);
    game.draw.rect(W / 2 - 160, 80, 320, 120, '#000', 0.0);
    game.draw.circle(W / 2 - 100, 140 + wobAmt, 44, tc.fill, 0.9);
    game.draw.circle(W / 2 - 112, 128 + wobAmt, 14, tc.hi, 0.6);
    game.draw.text('← ' + tc.name + 'を割れ!', W / 2 + 20, 148, { size: 44, color: tc.fill, bold: true });

    // Wrong pop dots
    for (var wi = 0; wi < MAX_WRONG; wi++) {
      game.draw.circle(W / 2 - (MAX_WRONG - 1) * 44 + wi * 88, H * 0.955, 18, wi < wrongPops ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(popped + ' / ' + NEEDED, W / 2, 236, { size: 52, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? tc.fill : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    targetColorIdx = Math.floor(Math.random() * BALLOON_COLORS.length);
  });
})(game);
