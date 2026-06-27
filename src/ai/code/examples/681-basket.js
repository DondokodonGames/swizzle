// 681-basket.js
// バスケットキャッチ — タップした真下に籠が飛ぶ、落下球を受け止めろ
// 操作: タップで籠を横移動
// 成功: 25個キャッチ  失敗: 8個逃す or 75秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040a1a',
    court:   '#0a1628',
    basket:  '#f97316',
    basketHi:'#fed7aa',
    rim:     '#7c2d12',
    ball:    '#ea580c',
    ballHi:  '#fdba74',
    guide:   '#3b82f6',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060e1f'
  };

  var BASKET_W = 220;
  var BASKET_H = 60;
  var BASKET_Y = H * 0.80;
  var basketX = W / 2;
  var targetX = W / 2;

  var balls = [];
  var spawnTimer = 0;
  var SPAWN_RATE = 1.4;

  var caught = 0;
  var NEEDED = 25;
  var missed = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 75;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function spawnBall() {
    balls.push({
      x: 100 + Math.random() * (W - 200),
      y: -40,
      r: 38,
      speed: 420 + Math.random() * 260 + elapsed * 5,
      caught: false,
      missed: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    targetX = Math.max(BASKET_W / 2 + 20, Math.min(W - BASKET_W / 2 - 20, tx));
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    basketX += (targetX - basketX) * Math.min(1, dt * 18);

    spawnTimer += dt;
    var rate = Math.max(0.8, SPAWN_RATE - elapsed * 0.008);
    if (spawnTimer >= rate) {
      spawnTimer = 0;
      spawnBall();
    }

    for (var i = balls.length - 1; i >= 0; i--) {
      var b = balls[i];
      if (b.caught || b.missed) { balls.splice(i, 1); continue; }
      b.y += b.speed * dt;

      // Check catch
      if (b.y + b.r >= BASKET_Y && b.y - b.r < BASKET_Y + BASKET_H) {
        var dx = Math.abs(b.x - basketX);
        if (dx < BASKET_W / 2 - b.r * 0.5) {
          b.caught = true;
          caught++;
          flashCol = C.correct;
          flashAnim = 0.25;
          resultText = 'キャッチ！';
          resultTimer = 0.4;
          game.audio.play('se_success', 0.5);
          for (var p = 0; p < 6; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: BASKET_Y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160 - 80, life: 0.4, col: C.ballHi });
          }
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(caught * 300 + Math.ceil(timeLeft) * 80); }, 700);
          }
        }
      }

      // Miss
      if (b.y > H + b.r) {
        b.missed = true;
        missed++;
        flashCol = C.wrong;
        flashAnim = 0.22;
        resultText = '落とした！';
        resultTimer = 0.38;
        game.audio.play('se_failure', 0.2);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Court lines
    game.draw.rect(0, BASKET_Y + BASKET_H, W, H - BASKET_Y - BASKET_H, C.court, 0.9);
    game.draw.line(W * 0.1, BASKET_Y + BASKET_H, W * 0.9, BASKET_Y + BASKET_H, '#ffffff15', 3);

    // Guide line from basket
    game.draw.line(basketX, BASKET_Y - 20, basketX, 200, C.guide, 1);
    game.draw.line(basketX - BASKET_W / 2, BASKET_Y - 20, basketX - BASKET_W / 2, 220, '#ffffff18', 1);
    game.draw.line(basketX + BASKET_W / 2, BASKET_Y - 20, basketX + BASKET_W / 2, 220, '#ffffff18', 1);

    // Balls
    for (var bi = 0; bi < balls.length; bi++) {
      var ball = balls[bi];
      game.draw.circle(ball.x + 4, ball.y + 4, ball.r, '#000', 0.3);
      game.draw.circle(ball.x, ball.y, ball.r, C.ball, 0.9);
      game.draw.circle(ball.x - ball.r * 0.35, ball.y - ball.r * 0.35, ball.r * 0.22, C.ballHi, 0.5);
      // Ball seam
      game.draw.line(ball.x - ball.r * 0.6, ball.y, ball.x + ball.r * 0.6, ball.y, '#7c2d1255', 4);
      game.draw.line(ball.x, ball.y - ball.r * 0.6, ball.x, ball.y + ball.r * 0.6, '#7c2d1255', 4);
    }

    // Basket
    game.draw.rect(basketX - BASKET_W / 2 + 4, BASKET_Y + 4, BASKET_W, BASKET_H, '#000', 0.3);
    game.draw.rect(basketX - BASKET_W / 2, BASKET_Y, BASKET_W, BASKET_H, C.basket, 0.85);
    game.draw.rect(basketX - BASKET_W / 2, BASKET_Y, BASKET_W, 12, C.basketHi, 0.5);
    // Rim
    game.draw.rect(basketX - BASKET_W / 2 - 8, BASKET_Y - 8, 16, 24, C.rim, 0.9);
    game.draw.rect(basketX + BASKET_W / 2 - 8, BASKET_Y - 8, 16, 24, C.rim, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 8 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.65, { size: 60, color: flashCol, bold: true });
    }

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 52 + mi * 104, H * 0.955, 20, mi < missed ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 75);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
  });
})(game);
