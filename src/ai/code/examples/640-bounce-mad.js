// 640-bounce-mad.js
// バウンスマッド — 跳ね回るボールをバケツで受け止めろ、壁は罠だ
// 操作: タップでバケツを移動
// 成功: 25個キャッチ  失敗: 10個外す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#03040a',
    ball:    '#f59e0b',
    ballHi:  '#fde68a',
    bucket:  '#1d4ed8',
    bucketHi:'#93c5fd',
    wall:    '#1e293b',
    wallHi:  '#334155',
    caught:  '#22c55e',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#05070f',
    trail:   '#f59e0b44'
  };

  var BUCKET_W = 220;
  var BUCKET_H = 80;
  var BUCKET_Y = H * 0.88;
  var bucketX = W / 2;
  var targetX = W / 2;

  var balls = [];
  var caught = 0;
  var NEEDED = 25;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];

  function spawnBall() {
    var speed = 500 + elapsed * 5 + Math.random() * 150;
    var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
    balls.push({
      x: 100 + Math.random() * (W - 200),
      y: H * 0.15,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 36,
      trail: []
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    targetX = Math.max(BUCKET_W / 2 + 20, Math.min(W - BUCKET_W / 2 - 20, tx));
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

    bucketX += (targetX - bucketX) * Math.min(1, dt * 12);

    spawnTimer += dt;
    var rate = Math.max(0.5, 1.5 - elapsed * 0.015);
    if (spawnTimer >= rate) {
      spawnTimer = 0;
      spawnBall();
    }

    // Update balls
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 8) b.trail.shift();

      b.vy += 600 * dt; // gravity
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Wall bounce
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
      if (b.y - b.r < H * 0.1) { b.y = H * 0.1 + b.r; b.vy = Math.abs(b.vy) * 0.85; }

      // Check bucket catch
      if (b.y + b.r >= BUCKET_Y && b.y - b.r <= BUCKET_Y + BUCKET_H) {
        if (b.x >= bucketX - BUCKET_W / 2 && b.x <= bucketX + BUCKET_W / 2) {
          caught++;
          game.audio.play('se_success', 0.5);
          for (var p = 0; p < 5; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: BUCKET_Y, vx: Math.cos(pa) * 150, vy: -Math.abs(Math.sin(pa)) * 200, life: 0.4, col: C.ballHi });
          }
          balls.splice(bi, 1);
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(caught * 250 + Math.ceil(timeLeft) * 100); }, 700);
          }
          continue;
        }
      }

      // Miss
      if (b.y > H + 60) {
        missed++;
        balls.splice(bi, 1);
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
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Wall guides
    game.draw.rect(0, H * 0.1, 12, H * 0.78, C.wall, 0.6);
    game.draw.rect(W - 12, H * 0.1, 12, H * 0.78, C.wall, 0.6);
    game.draw.rect(0, H * 0.1, W, 12, C.wallHi, 0.3);

    // Balls with trails
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b2 = balls[bi2];
      for (var ti = 0; ti < b2.trail.length; ti++) {
        var t = b2.trail[ti];
        var talpha = (ti / b2.trail.length) * 0.3;
        game.draw.circle(t.x, t.y, b2.r * (ti / b2.trail.length) * 0.7, C.ball, talpha);
      }
      game.draw.circle(b2.x + 4, b2.y + 4, b2.r, '#000', 0.3);
      game.draw.circle(b2.x, b2.y, b2.r, C.ball, 0.9);
      game.draw.circle(b2.x - 12, b2.y - 12, b2.r * 0.3, C.ballHi, 0.6);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    // Bucket
    var bx = bucketX - BUCKET_W / 2;
    game.draw.rect(bx + 8, BUCKET_Y + 8, BUCKET_W, BUCKET_H, '#000', 0.3);
    game.draw.rect(bx, BUCKET_Y, BUCKET_W, BUCKET_H, C.bucket, 0.9);
    game.draw.rect(bx, BUCKET_Y, BUCKET_W, 14, C.bucketHi, 0.6);
    game.draw.rect(bx + 8, BUCKET_Y + 14, BUCKET_W - 16, BUCKET_H - 14, C.bucketHi, 0.08);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < missed ? C.miss : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.caught : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnBall();
    spawnBall();
  });
})(game);
