// 614-drop-zone.js
// ドロップゾーン — 落下するボールをバケツで受け止めろ
// 操作: 左右スワイプでバケツを移動
// 成功: 20個キャッチ  失敗: 8個落とす or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0a0a14',
    ball1:   '#f59e0b',
    ball2:   '#ec4899',
    ball3:   '#22c55e',
    ball4:   '#38bdf8',
    bucket:  '#7c3aed',
    bucketHi:'#a78bfa',
    hit:     '#22c55e',
    miss:    '#ef4444',
    text:    '#f1f5f9',
    ui:      '#1a1028'
  };

  var BALL_COLORS = [C.ball1, C.ball2, C.ball3, C.ball4];
  var BUCKET_W = 200;
  var BUCKET_H = 80;
  var BUCKET_Y = H * 0.88;
  var BALL_R = 34;

  var bucketX = W / 2;
  var targetX = W / 2;
  var balls = [];
  var caught = 0;
  var NEEDED = 20;
  var dropped = 0;
  var MAX_DROP = 8;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.hit;
  var spawnTimer = 0;
  var spawnInterval = 1.5;
  var trails = [];

  function spawnBall() {
    var x = BALL_R * 2 + Math.random() * (W - BALL_R * 4);
    var speed = 300 + Math.random() * 200 + elapsed * 3;
    balls.push({
      x: x, y: -BALL_R,
      vy: speed,
      vx: (Math.random() - 0.5) * 100,
      r: BALL_R,
      col: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
      phase: Math.random() * Math.PI * 2
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    var step = 180;
    if (dir === 'left') targetX = Math.max(BUCKET_W / 2, targetX - step);
    else if (dir === 'right') targetX = Math.min(W - BUCKET_W / 2, targetX + step);
    game.audio.play('se_tap', 0.1);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    // Move bucket to tap position
    targetX = Math.max(BUCKET_W / 2, Math.min(W - BUCKET_W / 2, tx));
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

    bucketX += (targetX - bucketX) * Math.min(1, dt * 10);

    spawnTimer += dt;
    var rate = Math.max(0.6, spawnInterval - elapsed * 0.015);
    if (spawnTimer > rate) {
      spawnTimer = 0;
      spawnBall();
      if (elapsed > 15 && Math.random() < 0.4) spawnBall();
    }

    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      b.vy += 400 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.phase += dt * 3;
      // Wall bounce
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }

      trails.push({ x: b.x, y: b.y, col: b.col, life: 0.2 });

      // Check catch
      if (b.y + b.r >= BUCKET_Y && b.y - b.r <= BUCKET_Y + BUCKET_H) {
        if (b.x >= bucketX - BUCKET_W / 2 && b.x <= bucketX + BUCKET_W / 2) {
          caught++;
          flashCol = C.hit;
          flashAnim = 0.2;
          game.audio.play('se_success', 0.5);
          for (var p = 0; p < 8; p++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: b.x, y: BUCKET_Y, vx: Math.cos(ang) * 150, vy: -Math.abs(Math.sin(ang)) * 250, life: 0.5, col: b.col });
          }
          balls.splice(bi, 1);
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(caught * 300 + Math.ceil(timeLeft) * 100); }, 700);
          }
          continue;
        }
      }
      // Dropped
      if (b.y - b.r > H) {
        dropped++;
        balls.splice(bi, 1);
        flashCol = C.miss;
        flashAnim = 0.2;
        game.audio.play('se_failure', 0.2);
        if (dropped >= MAX_DROP && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
      }
    }

    for (var tri = trails.length - 1; tri >= 0; tri--) {
      trails[tri].life -= dt * 4;
      if (trails[tri].life <= 0) trails.splice(tri, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Trails
    for (var tri2 = 0; tri2 < trails.length; tri2++) {
      var tr = trails[tri2];
      game.draw.circle(tr.x, tr.y, BALL_R * 0.3 * tr.life * 4, tr.col, tr.life * 0.5);
    }

    // Balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b2 = balls[bi2];
      var wobble = 1 + Math.sin(b2.phase) * 0.05;
      game.draw.circle(b2.x, b2.y, b2.r * wobble + 6, b2.col, 0.1);
      game.draw.circle(b2.x, b2.y, b2.r * wobble, b2.col, 0.9);
      game.draw.circle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, b2.r * 0.2, '#fff', 0.5);
    }

    // Bucket
    var bx = bucketX - BUCKET_W / 2;
    game.draw.rect(bx, BUCKET_Y, BUCKET_W, BUCKET_H, C.bucket, 0.9);
    game.draw.rect(bx, BUCKET_Y, BUCKET_W, 12, C.bucketHi, 0.7);
    game.draw.rect(bx + 10, BUCKET_Y + 12, BUCKET_W - 20, BUCKET_H - 12, C.bucket, 0.5);
    // Bucket shine
    game.draw.rect(bx + 10, BUCKET_Y + 16, 20, BUCKET_H - 24, C.bucketHi, 0.2);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Drop dots
    for (var di = 0; di < MAX_DROP; di++) {
      game.draw.circle(W / 2 - (MAX_DROP - 1) * 44 + di * 88, H * 0.955, 18, di < dropped ? C.miss : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.bucket : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnBall();
  });
})(game);
