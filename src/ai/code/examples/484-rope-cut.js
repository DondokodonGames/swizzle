// 484-rope-cut.js
// ロープカット — 天井から吊り下がるロープを切って星を籠に落とす
// 操作: スワイプでロープを切る
// 成功: 10個の星を籠に入れる  失敗: 5個逃す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060012',
    rope:   '#92400e',
    ropeHi: '#d97706',
    star:   '#fbbf24',
    starHi: '#fef08a',
    basket: '#065f46',
    basketHi:'#059669',
    nail:   '#6b7280',
    wrong:  '#ef4444',
    correct:'#22c55e',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var BASKET_W = 220;
  var BASKET_H = 100;
  var basketX = W / 2;
  var basketVX = 180;

  var ropes = [];
  var particles = [];
  var caught = 0;
  var NEEDED = 10;
  var escaped = 0;
  var MAX_ESCAPE = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var nextSpawn = 0.8;
  var flashAnim = 0;

  function spawnRope() {
    var x = 120 + Math.random() * (W - 240);
    var len = 280 + Math.random() * 300;
    ropes.push({
      x: x,
      topY: 80 + Math.random() * 100,
      len: len,
      cutAt: null,    // fraction 0..1 where cut
      starVx: 0, starVy: 0,
      starX: x, starY: 80 + Math.random() * 100 + len,
      falling: false,
      life: 8 + Math.random() * 5,
      sway: (Math.random() - 0.5) * 30,
      swaySpeed: 0.5 + Math.random() * 0.5
    });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Check which ropes are intersected by swipe line
    for (var ri = ropes.length - 1; ri >= 0; ri--) {
      var rope = ropes[ri];
      if (rope.falling) continue;

      // Rope goes from (rope.x, rope.topY) to (rope.x + sway, rope.topY + rope.len)
      var rx1 = rope.x;
      var ry1 = rope.topY;
      var rx2 = rope.x + rope.sway;
      var ry2 = rope.topY + rope.len;

      // Line segment intersection
      var denom = (x1 - x2) * (ry1 - ry2) - (y1 - y2) * (rx1 - rx2);
      if (Math.abs(denom) < 0.001) continue;
      var t = ((x1 - rx1) * (ry1 - ry2) - (y1 - ry1) * (rx1 - rx2)) / denom;
      var u = -((x1 - x2) * (y1 - ry1) - (y1 - y2) * (x1 - rx1)) / denom;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        // Cut at fraction u along rope
        rope.cutAt = u;
        rope.falling = true;
        rope.starX = rx1 + (rx2 - rx1) * u;
        rope.starY = ry1 + (ry2 - ry1) * u;
        rope.starVx = (Math.random() - 0.5) * 100;
        rope.starVy = 0;
        game.audio.play('se_tap', 0.5);
      }
    }
  });

  game.onTap(function(tx, ty) {
    // No-op (swipe is primary)
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

    // Move basket
    basketX += basketVX * dt;
    if (basketX > W - BASKET_W / 2 - 40) { basketX = W - BASKET_W / 2 - 40; basketVX = -Math.abs(basketVX); }
    if (basketX < BASKET_W / 2 + 40) { basketX = BASKET_W / 2 + 40; basketVX = Math.abs(basketVX); }

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done && ropes.length < 5) {
      spawnRope();
      nextSpawn = 0.5 + Math.random() * 0.8;
    }

    var BASKET_Y = H * 0.86;

    // Update ropes
    for (var ri2 = ropes.length - 1; ri2 >= 0; ri2--) {
      var rope2 = ropes[ri2];
      rope2.life -= dt;
      rope2.sway = Math.sin(elapsed * rope2.swaySpeed + ri2) * 30;

      if (rope2.falling) {
        rope2.starVy += 700 * dt;
        rope2.starX += rope2.starVx * dt;
        rope2.starY += rope2.starVy * dt;

        // Check basket catch
        if (rope2.starY > BASKET_Y - BASKET_H / 2 && rope2.starY < BASKET_Y + BASKET_H / 2 &&
            Math.abs(rope2.starX - basketX) < BASKET_W / 2 + 30) {
          caught++;
          flashAnim = 0.35;
          game.audio.play('se_success', 0.6);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: rope2.starX, y: rope2.starY, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120 - 100, life: 0.5, col: C.starHi });
          }
          ropes.splice(ri2, 1);
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(caught * 400 + Math.ceil(timeLeft) * 100); }, 700);
          }
          continue;
        }

        // Fell past basket
        if (rope2.starY > H + 80) {
          ropes.splice(ri2, 1);
          escaped++;
          game.audio.play('se_failure', 0.3);
          if (escaped >= MAX_ESCAPE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          continue;
        }
      } else {
        // Timeout — escaped
        if (rope2.life <= 0) {
          ropes.splice(ri2, 1);
          escaped++;
          game.audio.play('se_failure', 0.2);
          if (escaped >= MAX_ESCAPE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          continue;
        }
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    var BASKET_Y2 = H * 0.86;

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Ropes
    for (var ri3 = 0; ri3 < ropes.length; ri3++) {
      var rope3 = ropes[ri3];
      if (!rope3.falling) {
        var r3x2 = rope3.x + rope3.sway;
        var r3y2 = rope3.topY + rope3.len;
        game.draw.line(rope3.x, rope3.topY, r3x2, r3y2, C.rope, 8);
        game.draw.line(rope3.x, rope3.topY, r3x2, r3y2, C.ropeHi, 3);
        // Nail at top
        game.draw.circle(rope3.x, rope3.topY, 14, C.nail, 0.9);
        // Star at bottom
        game.draw.circle(r3x2, r3y2, 26, C.starHi, 0.3);
        game.draw.circle(r3x2, r3y2, 20, C.star, 0.9);
      } else {
        // Cut rope fragments
        game.draw.line(rope3.x, rope3.topY, rope3.starX, rope3.starY - 10, C.rope, 5);
        // Falling star
        game.draw.circle(rope3.starX, rope3.starY, 26, C.starHi, 0.3);
        game.draw.circle(rope3.starX, rope3.starY, 20, C.star, 0.9);
      }
    }

    // Basket
    game.draw.rect(basketX - BASKET_W / 2, BASKET_Y2 - BASKET_H / 2, BASKET_W, BASKET_H, C.basket, 0.9);
    game.draw.rect(basketX - BASKET_W / 2, BASKET_Y2 - BASKET_H / 2, BASKET_W, 10, C.basketHi, 0.7);
    game.draw.rect(basketX - BASKET_W / 2, BASKET_Y2 - BASKET_H / 2, 10, BASKET_H, C.basketHi, 0.4);
    game.draw.rect(basketX + BASKET_W / 2 - 10, BASKET_Y2 - BASKET_H / 2, 10, BASKET_H, C.basketHi, 0.4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.correct, flashAnim * 0.1);

    // Escape dots
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      game.draw.circle(W / 2 - (MAX_ESCAPE - 1) * 44 + ei * 88, H * 0.955, 18, ei < escaped ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.star : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    spawnRope();
    spawnRope();
  });
})(game);
