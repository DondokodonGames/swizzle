// 540-basket-catch.js
// バスケットキャッチ — 左右に動くバスケットでランダムに落ちるボールを受け取る
// 操作: スワイプ左右でバスケットを動かす
// 成功: 25個キャッチ  失敗: 10個落とす or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0408',
    court:   '#12060e',
    basket:  '#f59e0b',
    basketHi:'#fde68a',
    ball:    '#f97316',
    ballHi:  '#fed7aa',
    ball2:   '#a855f7',
    ball2Hi: '#d8b4fe',
    caught:  '#22c55e',
    dropped: '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var BASKET_Y = H * 0.85;
  var BASKET_W = 220;
  var BASKET_H = 60;
  var basketX = W / 2;
  var basketVX = 0;
  var balls = [];
  var caught = 0;
  var NEEDED = 25;
  var dropped = 0;
  var MAX_DROP = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.caught;
  var nextBall = 0.8;
  var catchAnim = 0;
  var audienceAnim = 0;

  function spawnBall() {
    var isSpecial = Math.random() < 0.2;
    balls.push({
      x: 80 + Math.random() * (W - 160),
      y: -30,
      vy: 350 + Math.random() * 200 + caught * 4,
      vx: (Math.random() - 0.5) * 60,
      r: isSpecial ? 40 : 32,
      col: isSpecial ? C.ball2 : C.ball,
      hiCol: isSpecial ? C.ball2Hi : C.ballHi,
      special: isSpecial,
      spin: 0
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left')  basketVX -= 600;
    if (dir === 'right') basketVX += 600;
    game.audio.play('se_tap', 0.2);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Tap to nudge basket toward tap position
    basketVX += (tx - basketX) * 1.5;
    game.audio.play('se_tap', 0.1);
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
    if (catchAnim > 0) catchAnim -= dt * 3;
    audienceAnim += dt;

    // Basket movement
    basketX += basketVX * dt;
    basketVX *= Math.pow(0.1, dt);
    basketX = Math.max(BASKET_W / 2 + 20, Math.min(W - BASKET_W / 2 - 20, basketX));

    // Spawn balls
    nextBall -= dt;
    if (nextBall <= 0 && !done) {
      spawnBall();
      nextBall = Math.max(0.4, 0.8 - caught * 0.01);
    }

    // Update balls
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.spin += dt * 5;
      b.vy += 200 * dt; // gravity
      b.vx *= 0.99;

      // Wall bounce
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }

      // Catch check
      if (b.y + b.r >= BASKET_Y && b.y - b.r < BASKET_Y + BASKET_H) {
        if (Math.abs(b.x - basketX) < BASKET_W / 2 + b.r * 0.5) {
          // Caught!
          caught += b.special ? 2 : 1;
          catchAnim = 0.4;
          flashCol = C.caught;
          flashAnim = 0.25;
          game.audio.play('se_success', b.special ? 0.8 : 0.5);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: BASKET_Y, vx: Math.cos(ang) * 160, vy: Math.sin(ang) * 160 - 100, life: 0.4, col: b.col });
          }
          balls.splice(bi, 1);
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(caught * 200 + Math.ceil(timeLeft) * 100); }, 700);
          }
          continue;
        }
      }

      // Dropped
      if (b.y > H + 40) {
        dropped++;
        balls.splice(bi, 1);
        flashCol = C.dropped;
        flashAnim = 0.3;
        game.audio.play('se_failure', 0.3);
        if (dropped >= MAX_DROP && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.court, 0.5);

    // Court lines
    for (var li = 0; li < 3; li++) {
      game.draw.line(0, H * (0.3 + li * 0.2), W, H * (0.3 + li * 0.2), '#1a0a12', 2);
    }

    // Balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b2 = balls[bi2];
      game.draw.circle(b2.x, b2.y, b2.r + 4, b2.col, 0.15);
      game.draw.circle(b2.x, b2.y, b2.r, b2.col, 0.9);
      // Seam
      game.draw.line(b2.x - b2.r * 0.8, b2.y, b2.x + b2.r * 0.8, b2.y, '#000', 2);
      game.draw.circle(b2.x, b2.y - b2.r * 0.3, b2.r * 0.15, b2.hiCol, 0.5);
      if (b2.special) {
        game.draw.circle(b2.x, b2.y, b2.r + 10 + Math.sin(audienceAnim * 5) * 4, b2.col, 0.2);
      }
    }

    // Basket
    var bx = basketX - BASKET_W / 2;
    var catchScale = 1 + catchAnim * 0.15;
    var bw = BASKET_W * catchScale;
    var bxs = basketX - bw / 2;

    // Basket sides
    game.draw.line(bxs, BASKET_Y, bxs, BASKET_Y + BASKET_H, C.basket, 12);
    game.draw.line(bxs + bw, BASKET_Y, bxs + bw, BASKET_Y + BASKET_H, C.basket, 12);
    // Basket bottom
    game.draw.line(bxs, BASKET_Y + BASKET_H, bxs + bw, BASKET_Y + BASKET_H, C.basket, 12);
    // Net lines
    for (var ni = 1; ni < 5; ni++) {
      var nx = bxs + bw * ni / 5;
      game.draw.line(nx, BASKET_Y, nx + (ni - 2.5) * 10, BASKET_Y + BASKET_H, C.basketHi, 3);
    }
    game.draw.line(bxs, BASKET_Y + BASKET_H / 2, bxs + bw, BASKET_Y + BASKET_H / 2, C.basketHi, 3);
    // Rim highlight
    game.draw.line(bxs, BASKET_Y, bxs + bw, BASKET_Y, C.basketHi, 16);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Drop dots
    for (var di = 0; di < MAX_DROP; di++) {
      game.draw.circle(W / 2 - (MAX_DROP - 1) * 44 + di * 88, H * 0.955, 18, di < dropped ? C.dropped : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.basket : C.dropped);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnBall();
  });
})(game);
