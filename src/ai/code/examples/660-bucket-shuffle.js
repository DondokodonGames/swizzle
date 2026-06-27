// 660-bucket-shuffle.js
// バケツシャッフル — 入れ替わるバケツに正しく仕分けろ
// 操作: タップで左右のバケツを選ぶ
// 成功: 25個仕分け  失敗: 8回間違い or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040a0c',
    ballR:   '#ef4444',
    ballB:   '#3b82f6',
    ballY:   '#f59e0b',
    bucketR: '#7f1d1d',
    bucketB: '#1e3a8a',
    bucketY: '#78350f',
    bucketHi:'#ffffff',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#08121a'
  };

  var COLORS = ['#ef4444', '#3b82f6', '#f59e0b'];
  var BUCKET_COLS = ['#7f1d1d', '#1e3a8a', '#78350f'];

  var BUCKET_Y = H * 0.8;
  var BUCKET_W = 280;
  var BUCKET_H = 200;

  var leftColorIdx = 0;
  var rightColorIdx = 1;

  var ballColorIdx = 0;
  var ballY = H * 0.2;
  var BALL_SPEED = 700;
  var ballFalling = true;
  var ballX = W / 2;

  var sorted = 0;
  var NEEDED = 25;
  var misses = 0;
  var MAX_MISS = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var swapTimer = 0;
  var SWAP_EVERY = 6;
  var nextSwap = SWAP_EVERY;
  var swapAnim = 0;

  function newBall() {
    ballColorIdx = Math.floor(Math.random() * COLORS.length);
    ballY = H * 0.22;
    ballX = W / 2;
    ballFalling = true;
  }

  function shuffleBuckets() {
    var r = Math.random();
    if (r < 0.5) {
      // Swap left and right
      var tmp = leftColorIdx;
      leftColorIdx = rightColorIdx;
      rightColorIdx = tmp;
    } else {
      // Pick a new third color for one bucket
      var newIdx = Math.floor(Math.random() * COLORS.length);
      if (Math.random() < 0.5) leftColorIdx = newIdx;
      else rightColorIdx = newIdx;
    }
    swapAnim = 0.5;
    game.audio.play('se_tap', 0.2);
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!ballFalling) return;

    var choseLeft = tx < W / 2;
    var chosenColorIdx = choseLeft ? leftColorIdx : rightColorIdx;

    ballFalling = false;
    var targetX = choseLeft ? W / 4 : W * 3 / 4;
    ballX = targetX;
    ballY = BUCKET_Y - 30;

    if (chosenColorIdx === ballColorIdx) {
      sorted++;
      flashCol = C.correct;
      flashAnim = 0.3;
      resultText = 'ピッタリ！';
      resultTimer = 0.5;
      game.audio.play('se_success', 0.55);
      for (var p = 0; p < 6; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: targetX, y: BUCKET_Y, vx: Math.cos(pa) * 180, vy: Math.sin(pa) * 180, life: 0.4, col: COLORS[ballColorIdx] });
      }
      if (sorted >= nextSwap) {
        nextSwap += SWAP_EVERY;
        shuffleBuckets();
      }
      if (sorted >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(sorted * 400 + Math.ceil(timeLeft) * 100); }, 700);
        return;
      }
    } else {
      misses++;
      flashCol = C.wrong;
      flashAnim = 0.35;
      resultText = '違う！';
      resultTimer = 0.5;
      game.audio.play('se_failure', 0.3);
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }

    setTimeout(newBall, 500);
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
    if (swapAnim > 0) swapAnim -= dt * 3;

    if (ballFalling && !done) {
      ballY += BALL_SPEED * dt;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Divider line
    game.draw.line(W / 2, H * 0.4, W / 2, H * 0.75, '#ffffff22', 3);
    game.draw.text('or', W / 2, H * 0.56, { size: 40, color: '#ffffff33' });

    // Left bucket
    var lswap = swapAnim > 0 ? swapAnim * 20 : 0;
    game.draw.rect(W / 4 - BUCKET_W / 2 + 6 + lswap, BUCKET_Y + 6, BUCKET_W, BUCKET_H, '#000', 0.35);
    game.draw.rect(W / 4 - BUCKET_W / 2 + lswap, BUCKET_Y, BUCKET_W, BUCKET_H, BUCKET_COLS[leftColorIdx], 0.9);
    game.draw.rect(W / 4 - BUCKET_W / 2 + lswap, BUCKET_Y, BUCKET_W, 16, COLORS[leftColorIdx], 0.7);
    game.draw.circle(W / 4 + lswap, BUCKET_Y + BUCKET_H / 2, 44, COLORS[leftColorIdx], 0.8);

    // Right bucket
    var rswap = swapAnim > 0 ? -swapAnim * 20 : 0;
    game.draw.rect(W * 3 / 4 - BUCKET_W / 2 + 6 + rswap, BUCKET_Y + 6, BUCKET_W, BUCKET_H, '#000', 0.35);
    game.draw.rect(W * 3 / 4 - BUCKET_W / 2 + rswap, BUCKET_Y, BUCKET_W, BUCKET_H, BUCKET_COLS[rightColorIdx], 0.9);
    game.draw.rect(W * 3 / 4 - BUCKET_W / 2 + rswap, BUCKET_Y, BUCKET_W, 16, COLORS[rightColorIdx], 0.7);
    game.draw.circle(W * 3 / 4 + rswap, BUCKET_Y + BUCKET_H / 2, 44, COLORS[rightColorIdx], 0.8);

    // Swap flash
    if (swapAnim > 0) {
      game.draw.text('シャッフル！', W / 2, BUCKET_Y - 40, { size: 44, color: '#fff', bold: true });
    }

    // Ball
    if (ballY < BUCKET_Y + 40) {
      game.draw.circle(ballX + 5, ballY + 5, 68, '#000', 0.3);
      game.draw.circle(ballX, ballY, 68, COLORS[ballColorIdx], 0.92);
      game.draw.circle(ballX - 22, ballY - 22, 24, '#ffffff', 0.35);
    }

    // Ball color label
    if (ballFalling) {
      game.draw.text('どっち？', W / 2, H * 0.42, { size: 40, color: '#ffffff55' });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);

    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.73, { size: 68, color: flashCol, bold: true });
    }

    // Next swap indicator
    var progress = (sorted % SWAP_EVERY) / SWAP_EVERY;
    game.draw.rect(W / 2 - 180, H * 0.88, 360, 14, C.ui, 0.8);
    game.draw.rect(W / 2 - 180, H * 0.88, 360 * progress, 14, '#a78bfa', 0.8);
    game.draw.text('次のシャッフルまで: ' + (nextSwap - sorted), W / 2, H * 0.88 + 36, { size: 28, color: '#a78bfa' });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(sorted + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    leftColorIdx = 0;
    rightColorIdx = 1;
    newBall();
  });
})(game);
