// 363-fruit-slice.js
// フルーツスライス — 飛び上がるフルーツをスワイプで切る、爆弾は切るな
// 操作: スワイプで切る
// 成功: 30個切る  失敗: 爆弾を3回切る or フルーツを5個逃がす or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#070510',
    trail:  '#fff',
    fruitA: '#ef4444',  // watermelon
    fruitB: '#f97316',  // orange
    fruitC: '#22c55e',  // melon
    fruitD: '#fbbf24',  // lemon
    fruitHi:'#fff',
    bomb:   '#1a1a1a',
    bombFuse:'#d97706',
    sliceL: '#dc2626',
    danger: '#ef4444',
    miss:   '#6b7280',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var FRUIT_COLORS = [C.fruitA, C.fruitB, C.fruitC, C.fruitD];
  var fruits = [];
  var slices = [];
  var sliceTrail = [];
  var cut = 0;
  var NEEDED = 30;
  var bombHits = 0;
  var MAX_BOMB = 3;
  var missed = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var particles = [];
  var spawnTimer = 0;
  var swiping = false;
  var swipeX1 = 0, swipeY1 = 0;

  function spawnFruit() {
    var isBomb = Math.random() < 0.2;
    var spawnX = W * 0.15 + Math.random() * W * 0.7;
    var color = isBomb ? C.bomb : FRUIT_COLORS[Math.floor(Math.random() * 4)];
    fruits.push({
      x: spawnX,
      y: H + 50,
      vx: (Math.random() - 0.5) * 300,
      vy: -800 - Math.random() * 300,
      r: 44,
      color: color,
      isBomb: isBomb,
      sliced: false,
      sliceAngle: 0
    });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Check intersection with each fruit
    var sx1 = x1, sy1 = y1, sx2 = x2, sy2 = y2;

    // Add slash trail
    slices.push({ x1: sx1, y1: sy1, x2: sx2, y2: sy2, life: 0.3 });

    for (var fi = fruits.length - 1; fi >= 0; fi--) {
      var f = fruits[fi];
      if (f.sliced) continue;
      // Line-circle intersection
      var dx = sx2 - sx1, dy = sy2 - sy1;
      var len = Math.sqrt(dx*dx+dy*dy);
      if (len < 1) continue;
      var t = ((f.x - sx1) * dx + (f.y - sy1) * dy) / (len * len);
      t = Math.max(0, Math.min(1, t));
      var cx2 = sx1 + t * dx, cy2 = sy1 + t * dy;
      if (Math.hypot(f.x - cx2, f.y - cy2) < f.r) {
        f.sliced = true;
        f.sliceAngle = Math.atan2(dy, dx);
        if (f.isBomb) {
          bombHits++;
          game.audio.play('se_failure', 0.7);
          for (var pi = 0; pi < 12; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: f.x, y: f.y, vx: Math.cos(ang)*300, vy: Math.sin(ang)*300, life:0.7, col: '#888' });
          }
          if (bombHits >= MAX_BOMB && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
            return;
          }
        } else {
          cut++;
          game.audio.play('se_tap', 0.4);
          for (var pi2 = 0; pi2 < 8; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: f.x, y: f.y, vx: Math.cos(ang2)*200, vy: Math.sin(ang2)*200 - 100, life:0.5, col: f.color });
          }
          if (cut >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(cut * 150 + Math.ceil(timeLeft) * 80); }, 400);
            return;
          }
        }
        fruits.splice(fi, 1);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnFruit();
      if (Math.random() < 0.4) spawnFruit();
      spawnTimer = 0.5 + Math.random() * 0.4;
    }

    // Update fruits
    for (var fi = fruits.length - 1; fi >= 0; fi--) {
      var f = fruits[fi];
      f.vy += 600 * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.y > H + 100 && !f.sliced) {
        if (!f.isBomb) {
          missed++;
          if (missed >= MAX_MISS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
            return;
          }
        }
        fruits.splice(fi, 1);
      } else if (f.y > H + 100 && f.sliced) {
        fruits.splice(fi, 1);
      }
    }

    for (var sl = slices.length - 1; sl >= 0; sl--) {
      slices[sl].life -= dt * 3;
      if (slices[sl].life <= 0) slices.splice(sl, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Fruits
    for (var fi2 = 0; fi2 < fruits.length; fi2++) {
      var f2 = fruits[fi2];
      if (f2.isBomb) {
        game.draw.circle(f2.x, f2.y, f2.r, '#333', 0.9);
        game.draw.circle(f2.x, f2.y, f2.r - 10, '#1a1a1a', 0.9);
        // Fuse
        game.draw.line(f2.x + 20, f2.y - f2.r, f2.x + 30, f2.y - f2.r - 30, C.bombFuse, 4);
        game.draw.circle(f2.x + 30, f2.y - f2.r - 30, 8, C.bombFuse, 0.8 + Math.sin(elapsed * 10) * 0.2);
        game.draw.text('💣', f2.x, f2.y + 16, { size: 44 });
      } else {
        game.draw.circle(f2.x, f2.y, f2.r + 6, f2.color, 0.15);
        game.draw.circle(f2.x, f2.y, f2.r, f2.color, 0.9);
        game.draw.circle(f2.x - f2.r * 0.3, f2.y - f2.r * 0.3, f2.r * 0.3, C.fruitHi, 0.5);
      }
    }

    // Slice trails
    for (var sl2 = 0; sl2 < slices.length; sl2++) {
      var s = slices[sl2];
      game.draw.line(s.x1, s.y1, s.x2, s.y2, C.trail, 4 * s.life * 3);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Status indicators
    var bx = W * 0.1;
    game.draw.text('💣×' + bombHits + '/' + MAX_BOMB, W * 0.25, H * 0.91, { size: 36, color: bombHits > 0 ? C.danger : C.ui });
    game.draw.text('逃 ' + missed + '/' + MAX_MISS, W * 0.75, H * 0.91, { size: 36, color: missed > 0 ? C.miss : C.ui });

    game.draw.text(cut + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.fruitB : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.3;
  });
})(game);
