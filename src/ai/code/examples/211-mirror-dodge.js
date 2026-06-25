// 211-mirror-dodge.js
// ミラードッジ — 画面が鏡になっており、左右反転した操作でボールを避ける脳トレ
// 操作: タップで移動（左右が逆転）
// 成功: 20秒生き残る  失敗: ボールに当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060408',
    player:  '#22c55e',
    playerHi:'#86efac',
    ball:    '#ef4444',
    ballHi:  '#fca5a5',
    mirror:  '#1e3a5f',
    ui:      '#334155',
    hint:    '#f59e0b'
  };

  var px = W / 2;
  var py = H * 0.65;
  var PLAYER_R = 36;
  var PLAYER_SPEED = 600;
  var pvx = 0, pvy = 0;
  var targetX = W / 2, targetY = H * 0.65;
  var MIRROR = true; // left-right flipped

  var balls = [];
  var survived = 0;
  var NEEDED = 20;
  var done = false;
  var elapsed = 0;
  var trail = [];

  function spawnBall() {
    var side = Math.floor(Math.random() * 4);
    var bx, by, bvx, bvy;
    var speed = 300 + survived * 8;
    if (side === 0) { bx = Math.random() * W; by = -20; bvx = (Math.random() - 0.5) * 200; bvy = speed; }
    else if (side === 1) { bx = Math.random() * W; by = H + 20; bvx = (Math.random() - 0.5) * 200; bvy = -speed; }
    else if (side === 2) { bx = -20; by = Math.random() * H; bvx = speed; bvy = (Math.random() - 0.5) * 200; }
    else { bx = W + 20; by = Math.random() * H; bvx = -speed; bvy = (Math.random() - 0.5) * 200; }
    balls.push({ x: bx, y: by, vx: bvx, vy: bvy, r: 24 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    // Mirror: left-right flipped
    targetX = W - tx; // mirror tap X
    targetY = ty;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      survived += dt;
      elapsed += dt;
      if (survived >= NEEDED) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 60 + 500); }, 400);
        return;
      }
    }

    // Move player toward (mirrored) target
    var dx = targetX - px, dy = targetY - py;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 8) {
      pvx = (dx / dist) * PLAYER_SPEED;
      pvy = (dy / dist) * PLAYER_SPEED;
    } else { pvx *= 0.8; pvy *= 0.8; }
    px += pvx * dt;
    py += pvy * dt;
    px = Math.max(PLAYER_R, Math.min(W - PLAYER_R, px));
    py = Math.max(PLAYER_R, Math.min(H - PLAYER_R, py));

    // Spawn balls
    if (Math.random() < dt * (1.5 + survived / 20)) spawnBall();

    // Move balls
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) { balls.splice(bi, 1); continue; }

      // Collision
      var dx2 = px - b.x, dy2 = py - b.y;
      if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < PLAYER_R + b.r && !done) {
        done = true;
        game.audio.play('se_failure');
        setTimeout(function() { game.end.failure(); }, 400);
      }
    }

    trail.push({ x: px, y: py, life: 0.3 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Mirror line
    game.draw.line(W / 2, 80, W / 2, H, C.mirror, 3);
    game.draw.text('↔ 鏡', W / 2, 96, { size: 32, color: C.hint });

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t = trail[ti2];
      game.draw.circle(t.x, t.y, PLAYER_R * t.life, C.playerHi, t.life * 0.3);
    }

    // Tap indicator (show actual and mirrored)
    game.draw.circle(targetX, targetY, 24, C.player, 0.2 + 0.15 * Math.sin(elapsed * 5));

    // Balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b2 = balls[bi2];
      game.draw.circle(b2.x, b2.y, b2.r + 8, C.ballHi, 0.2);
      game.draw.circle(b2.x, b2.y, b2.r, C.ball, 0.85);
      game.draw.circle(b2.x - b2.r * 0.3, b2.y - b2.r * 0.3, b2.r * 0.25, '#fff', 0.4);
    }

    // Player
    game.draw.circle(px, py, PLAYER_R + 10, C.playerHi, 0.25);
    game.draw.circle(px, py, PLAYER_R, C.player, 0.9);
    game.draw.circle(px - 10, py - 12, 12, '#fff', 0.5);

    game.draw.text('タップは左右逆！', W / 2, H * 0.92, { size: 42, color: C.hint, bold: true });

    var ratio = Math.min(1, survived / NEEDED);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, '#22c55e');
    game.draw.text(survived.toFixed(1) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.25); });
})(game);
