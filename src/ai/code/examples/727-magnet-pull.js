// 727-magnet-pull.js
// マグネット引き — タップした場所に磁石を発生させて金属ボールを引き寄せ的に当てろ
// 操作: タップで磁場発生（ボールが引き寄せられる）
// 成功: 25個キャッチ  失敗: 10個逃がす or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#05030a',
    ball:    '#94a3b8',
    ballHi:  '#e2e8f0',
    magnet:  '#dc2626',
    magnetHi:'#fca5a5',
    target:  '#22c55e',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#09050e'
  };

  var TARGET_X = W / 2;
  var TARGET_Y = H * 0.72;
  var TARGET_R = 70;

  var BALL_R = 28;
  var MAGNET_STRENGTH = 1800;
  var MAGNET_RANGE = 400;

  var balls = [];
  var magnets = []; // { x, y, life, maxLife }
  var spawnTimer = 1.2;

  var score = 0;
  var NEEDED = 25;
  var escaped = 0;
  var MAX_ESCAPE = 10;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;

  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnBall() {
    var side = Math.floor(Math.random() * 3); // 0=top, 1=left, 2=right
    var bx, by, vx, vy;
    if (side === 0) {
      bx = 100 + Math.random() * (W - 200);
      by = -BALL_R;
      vx = (Math.random() - 0.5) * 200;
      vy = 100 + Math.random() * 150;
    } else if (side === 1) {
      bx = -BALL_R;
      by = 200 + Math.random() * (H * 0.4);
      vx = 100 + Math.random() * 150;
      vy = (Math.random() - 0.5) * 200;
    } else {
      bx = W + BALL_R;
      by = 200 + Math.random() * (H * 0.4);
      vx = -(100 + Math.random() * 150);
      vy = (Math.random() - 0.5) * 200;
    }
    balls.push({ x: bx, y: by, vx: vx, vy: vy, phase: Math.random() * Math.PI * 2 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    magnets.push({ x: tx, y: ty, life: 0.5, maxLife: 0.5 });
    game.audio.play('se_tap', 0.08);
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

    // Spawn balls
    spawnTimer -= dt;
    var spawnRate = Math.max(0.5, 1.2 - score * 0.02);
    if (spawnTimer <= 0) {
      spawnTimer = spawnRate;
      if (balls.length < 6 && !done) spawnBall();
    }

    // Update magnets
    for (var mi = magnets.length - 1; mi >= 0; mi--) {
      magnets[mi].life -= dt;
      if (magnets[mi].life <= 0) magnets.splice(mi, 1);
    }

    // Update balls
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];

      // Apply magnet forces
      for (var mj = 0; mj < magnets.length; mj++) {
        var mag = magnets[mj];
        var mdx = mag.x - b.x, mdy = mag.y - b.y;
        var mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < MAGNET_RANGE && mdist > 1) {
          var force = MAGNET_STRENGTH * (mag.life / mag.maxLife) / (mdist * mdist) * 100;
          b.vx += (mdx / mdist) * force * dt;
          b.vy += (mdy / mdist) * force * dt;
        }
      }

      // Apply mild gravity
      b.vy += 60 * dt;

      // Velocity cap
      var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (spd > 700) { b.vx = b.vx / spd * 700; b.vy = b.vy / spd * 700; }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.phase += dt * 2;

      // Check if ball hits target
      var tdx = b.x - TARGET_X, tdy = b.y - TARGET_Y;
      if (tdx * tdx + tdy * tdy < (TARGET_R + BALL_R) * (TARGET_R + BALL_R)) {
        score++;
        flashCol = C.correct;
        flashAnim = 0.3;
        resultText = 'キャッチ！';
        resultTimer = 0.4;
        game.audio.play('se_success', 0.5);
        for (var p = 0; p < 5; p++) {
          var pa = Math.random() * Math.PI * 2;
          particles.push({ x: b.x, y: b.y, vx: Math.cos(pa)*160, vy: Math.sin(pa)*160, life: 0.4, col: C.ballHi });
        }
        balls.splice(bi, 1);
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 80); }, 700);
        }
        continue;
      }

      // Check if ball escaped off screen
      if (b.x < -100 || b.x > W + 100 || b.y > H + 100) {
        escaped++;
        flashCol = C.wrong;
        flashAnim = 0.3;
        resultText = '逃げた！';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.25);
        balls.splice(bi, 1);
        if (escaped >= MAX_ESCAPE && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Target zone
    game.draw.circle(TARGET_X + 4, TARGET_Y + 4, TARGET_R, '#000', 0.25);
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R, C.target, 0.2);
    game.draw.circle(TARGET_X, TARGET_Y, TARGET_R - 8, C.target, 0.15);
    game.draw.text('的', TARGET_X, TARGET_Y + 18, { size: 56, color: C.target + 'cc', bold: true });

    // Magnet fields
    for (var mdi = 0; mdi < magnets.length; mdi++) {
      var md = magnets[mdi];
      var alpha = md.life / md.maxLife;
      game.draw.circle(md.x, md.y, MAGNET_RANGE * alpha * 0.5, C.magnet, alpha * 0.08);
      game.draw.circle(md.x, md.y, 30 * alpha, C.magnetHi, alpha * 0.8);
      // Field lines hint
      for (var fl = 0; fl < 6; fl++) {
        var fa = fl * Math.PI / 3;
        var fr = 60 + (1 - alpha) * 120;
        game.draw.circle(md.x + Math.cos(fa) * fr * alpha, md.y + Math.sin(fa) * fr * alpha,
          8 * alpha, C.magnet, alpha * 0.4);
      }
    }

    // Balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var bl = balls[bi2];
      var shine = 0.8 + 0.2 * Math.sin(bl.phase * 3);
      game.draw.circle(bl.x + 4, bl.y + 4, BALL_R, '#000', 0.25);
      game.draw.circle(bl.x, bl.y, BALL_R, C.ball, 0.88);
      game.draw.circle(bl.x - BALL_R * 0.3, bl.y - BALL_R * 0.3, BALL_R * 0.25, '#fff', 0.45 * shine);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.88, { size: 56, color: flashCol, bold: true });
    }

    // Escaped counter
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 48 + ei * 96, H * 0.955, 20, ei < escaped ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    spawnBall();
  });
})(game);
