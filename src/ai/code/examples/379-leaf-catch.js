// 379-leaf-catch.js
// 落ち葉キャッチ — 風に揺れながら落ちてくる葉を籠で受け取る
// 操作: スワイプ左右で籠を動かす
// 成功: 25枚受け取る  失敗: 10枚逃す or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0d0a04',
    sky:    '#1c1408',
    tree:   '#15231a',
    treeHi: '#1f3326',
    leaf:   '#d97706',
    leafB:  '#b45309',
    leafC:  '#92400e',
    leafD:  '#dc2626',
    leafE:  '#16a34a',
    basket: '#92400e',
    basketHi:'#b45309',
    weave:  '#fbbf24',
    wind:   '#e2e8f0',
    caught: '#fbbf24',
    missed: '#475569',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var LEAF_COLORS = [C.leaf, C.leafB, C.leafC, C.leafD, C.leafE];
  var basketX = W / 2;
  var BASKET_Y = H * 0.85;
  var BASKET_W = 180;
  var BASKET_H = 80;
  var basketVX = 0;

  var leaves = [];
  var particles = [];
  var caught = 0;
  var NEEDED = 25;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var spawnTimer = 0;
  var windX = 0;
  var windTimer = 0;

  function spawnLeaf() {
    var col = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
    leaves.push({
      x: 60 + Math.random() * (W - 120),
      y: -30,
      vx: (Math.random() - 0.5) * 80,
      vy: 60 + Math.random() * 60,
      angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 4,
      r: 18 + Math.random() * 10,
      col: col,
      wave: Math.random() * Math.PI * 2
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') basketVX = -600;
    if (dir === 'right') basketVX = 600;
  });

  game.onTap(function(tx) {
    if (done) return;
    basketVX = (tx - basketX) * 5;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    // Wind changes
    windTimer -= dt;
    if (windTimer <= 0) {
      windX = (Math.random() - 0.5) * 60;
      windTimer = 2 + Math.random() * 3;
    }

    // Basket movement
    basketX += basketVX * dt;
    basketVX *= (1 - 5 * dt);
    basketX = Math.max(BASKET_W / 2 + 20, Math.min(W - BASKET_W / 2 - 20, basketX));

    // Spawn leaves
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnLeaf();
      if (elapsed > 15 && Math.random() < 0.4) spawnLeaf();
      spawnTimer = 0.8 + Math.random() * 0.5;
    }

    // Update leaves
    for (var li = leaves.length - 1; li >= 0; li--) {
      var l = leaves[li];
      l.vy += 40 * dt;
      l.vx += windX * dt;
      l.vx += Math.sin(elapsed * 1.5 + l.wave) * 20 * dt;
      l.x += l.vx * dt;
      l.y += l.vy * dt;
      l.angle += l.spin * dt;

      // Bounce off walls
      if (l.x < l.r) { l.x = l.r; l.vx = Math.abs(l.vx); }
      if (l.x > W - l.r) { l.x = W - l.r; l.vx = -Math.abs(l.vx); }

      // Check basket catch
      if (l.y + l.r > BASKET_Y - 20 && l.y < BASKET_Y + BASKET_H &&
          l.x > basketX - BASKET_W / 2 && l.x < basketX + BASKET_W / 2) {
        // Caught!
        caught++;
        for (var pi = 0; pi < 5; pi++) {
          var ang = Math.random() * Math.PI;
          particles.push({ x: l.x, y: BASKET_Y, vx: Math.cos(ang)*100, vy: -Math.abs(Math.sin(ang))*150, life:0.5, col: l.col });
        }
        game.audio.play('se_success', 0.3);
        leaves.splice(li, 1);
        if (caught >= NEEDED && !done) {
          done = true;
          game.end.success(caught * 120 + Math.ceil(timeLeft) * 80);
        }
        continue;
      }

      // Missed
      if (l.y > H + 40) {
        missed++;
        game.audio.play('se_failure', 0.2);
        leaves.splice(li, 1);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 300);
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 200 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.8);

    // Tree silhouettes
    game.draw.rect(-40, H * 0.1, 80, H * 0.8, C.tree, 0.9);
    game.draw.circle(-40, H * 0.12, 120, C.treeHi, 0.8);
    game.draw.rect(W - 40, H * 0.15, 80, H * 0.75, C.tree, 0.9);
    game.draw.circle(W + 40, H * 0.17, 100, C.treeHi, 0.8);
    // Branches
    game.draw.line(-40, H * 0.15, 100, H * 0.22, C.tree, 18);
    game.draw.line(W + 40, H * 0.2, W - 100, H * 0.28, C.tree, 16);

    // Wind indicator
    if (Math.abs(windX) > 10) {
      var wdir = windX > 0 ? 1 : -1;
      for (var wi = 0; wi < 3; wi++) {
        var wy = H * 0.25 + wi * 80;
        game.draw.line(W/2 - wdir*80, wy, W/2 + wdir*80, wy, C.wind, 2);
      }
    }

    // Leaves
    for (var li2 = 0; li2 < leaves.length; li2++) {
      var leaf = leaves[li2];
      var lc = Math.cos(leaf.angle), ls = Math.sin(leaf.angle);
      // Elliptical leaf shape via two circles
      game.draw.circle(leaf.x, leaf.y, leaf.r, leaf.col, 0.85);
      game.draw.circle(leaf.x + lc * leaf.r * 0.6, leaf.y + ls * leaf.r * 0.6, leaf.r * 0.6, leaf.col, 0.7);
      // Vein
      game.draw.line(leaf.x, leaf.y, leaf.x + lc * leaf.r, leaf.y + ls * leaf.r, '#fff', 2);
    }

    // Basket
    game.draw.rect(basketX - BASKET_W / 2 - 8, BASKET_Y - 8, BASKET_W + 16, BASKET_H + 8, C.basket, 0.9);
    game.draw.rect(basketX - BASKET_W / 2, BASKET_Y, BASKET_W, BASKET_H, C.basketHi, 0.85);
    // Weave pattern
    for (var wi2 = 0; wi2 < 4; wi2++) {
      game.draw.line(basketX - BASKET_W / 2 + wi2 * (BASKET_W / 3), BASKET_Y, basketX - BASKET_W / 2 + wi2 * (BASKET_W / 3), BASKET_Y + BASKET_H, C.weave, 3);
    }
    game.draw.rect(basketX - BASKET_W / 2, BASKET_Y, BASKET_W, 10, C.weave, 0.5);
    game.draw.rect(basketX - BASKET_W / 2, BASKET_Y + BASKET_H / 2, BASKET_W, 6, C.weave, 0.4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    // Status
    game.draw.text(caught + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('逃し: ' + missed + '/' + MAX_MISS, W / 2, H * 0.93, { size: 38, color: missed > 5 ? '#ef4444' : C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.leaf : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnTimer = 0.5;
  });
})(game);
