// 430-fruit-catch.js
// フルーツキャッチ — バスケットを動かして果物を受け取り、爆弾は避ける
// 操作: タップした位置にバスケットが移動
// 成功: 果物30個キャッチ  失敗: 爆弾3回 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a1400',
    sky:    '#071000',
    apple:  '#ef4444',
    appleHi:'#fca5a5',
    orange: '#f97316',
    orangeHi:'#fed7aa',
    banana: '#eab308',
    bananaHi:'#fef08a',
    grape:  '#a855f7',
    grapeHi:'#d8b4fe',
    bomb:   '#1f2937',
    bombHi: '#374151',
    fuse:   '#f97316',
    basket: '#92400e',
    basketHi:'#d97706',
    ground: '#14200a',
    correct:'#22c55e',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var FRUITS = [
    { col: C.apple, hi: C.appleHi, name: 'apple' },
    { col: C.orange, hi: C.orangeHi, name: 'orange' },
    { col: C.banana, hi: C.bananaHi, name: 'banana' },
    { col: C.grape, hi: C.grapeHi, name: 'grape' }
  ];

  var basketX = W / 2;
  var BASKET_Y = H * 0.83;
  var BASKET_W = 200;
  var BASKET_H = 90;
  var basketTargetX = W / 2;

  var items = [];
  var caught = 0;
  var NEEDED = 30;
  var bombs = 0;
  var MAX_BOMBS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.correct;
  var particles = [];
  var spawnTimer = 0;
  var spawnInterval = 1.0;

  function spawnItem() {
    var isBomb = Math.random() < 0.25 + caught * 0.005;
    var x = 80 + Math.random() * (W - 160);
    var speed = 300 + Math.random() * 300 + caught * 3;
    items.push({
      x: x, y: -50,
      r: isBomb ? 38 : 30 + Math.random() * 12,
      vy: speed,
      bomb: isBomb,
      type: isBomb ? null : FRUITS[Math.floor(Math.random() * FRUITS.length)],
      wobble: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 4
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    basketTargetX = Math.max(BASKET_W/2 + 20, Math.min(W - BASKET_W/2 - 20, tx));
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') basketTargetX = Math.max(BASKET_W/2 + 20, basketTargetX - 200);
    else if (dir === 'right') basketTargetX = Math.min(W - BASKET_W/2 - 20, basketTargetX + 200);
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

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Move basket
    var bDiff = basketTargetX - basketX;
    basketX += bDiff * Math.min(1, dt * 10);

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnItem();
      spawnInterval = Math.max(0.5, 1.0 - elapsed * 0.006);
      spawnTimer = spawnInterval + Math.random() * 0.3;
    }

    // Update items
    for (var ii = items.length - 1; ii >= 0; ii--) {
      var item = items[ii];
      item.y += item.vy * dt;
      item.wobble += item.spin * dt;

      // Check basket catch
      var inBasketX = Math.abs(item.x - basketX) < BASKET_W/2 + item.r * 0.5;
      var inBasketY = item.y + item.r > BASKET_Y - BASKET_H/2 && item.y - item.r < BASKET_Y + BASKET_H/2;

      if (inBasketX && inBasketY) {
        items.splice(ii, 1);
        if (item.bomb) {
          bombs++;
          flashCol = C.wrong;
          flashAnim = 0.8;
          game.audio.play('se_failure', 0.7);
          for (var pi = 0; pi < 14; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: item.x, y: item.y, vx: Math.cos(ang)*250, vy: Math.sin(ang)*250-100, life: 0.8, col: C.fuse });
          }
          if (bombs >= MAX_BOMBS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        } else {
          caught++;
          flashCol = C.correct;
          flashAnim = 0.4;
          game.audio.play('se_tap', 0.4);
          for (var pi2 = 0; pi2 < 5; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: item.x, y: BASKET_Y - BASKET_H/2, vx: Math.cos(ang2)*120, vy: Math.sin(ang2)*120-80, life: 0.4, col: item.type.col });
          }
          if (caught >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(caught * 200 + Math.ceil(timeLeft) * 80); }, 600);
          }
        }
        continue;
      }

      // Off-screen
      if (item.y > H + 60) items.splice(ii, 1);
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
    game.draw.rect(0, 0, W, H * 0.78, C.sky, 0.5);

    // Items
    for (var ii2 = 0; ii2 < items.length; ii2++) {
      var it = items[ii2];
      if (it.bomb) {
        game.draw.circle(it.x, it.y, it.r + 6, C.bomb, 0.3);
        game.draw.circle(it.x, it.y, it.r, C.bomb, 0.9);
        game.draw.circle(it.x - it.r*0.3, it.y - it.r*0.3, it.r * 0.25, C.bombHi, 0.4);
        // Fuse
        game.draw.line(it.x, it.y - it.r, it.x + 12, it.y - it.r - 30, C.fuse, 4);
        game.draw.circle(it.x + 12, it.y - it.r - 30, 5, '#fff', 0.8);
        // Skull-ish
        game.draw.circle(it.x - 10, it.y - 8, 5, C.bombHi, 0.7);
        game.draw.circle(it.x + 10, it.y - 8, 5, C.bombHi, 0.7);
      } else {
        var wobbleR = it.r + Math.sin(it.wobble) * 3;
        game.draw.circle(it.x, it.y, wobbleR + 6, it.type.col, 0.15);
        game.draw.circle(it.x, it.y, wobbleR, it.type.col, 0.9);
        game.draw.circle(it.x - wobbleR*0.3, it.y - wobbleR*0.3, wobbleR * 0.3, it.type.hi, 0.6);
        // Stem
        game.draw.line(it.x, it.y - wobbleR, it.x + 6, it.y - wobbleR - 16, '#22c55e', 4);
      }
    }

    // Ground
    game.draw.rect(0, BASKET_Y + BASKET_H/2 + 10, W, H, C.ground, 0.9);

    // Basket
    game.draw.rect(basketX - BASKET_W/2, BASKET_Y - BASKET_H/2, BASKET_W, BASKET_H, C.basket, 0.9);
    game.draw.rect(basketX - BASKET_W/2 + 12, BASKET_Y - BASKET_H/2 + 10, BASKET_W/3, BASKET_H/3, C.basketHi, 0.3);
    // Weave pattern
    for (var wi = 0; wi < 3; wi++) {
      game.draw.line(basketX - BASKET_W/2 + wi*(BASKET_W/3), BASKET_Y - BASKET_H/2,
                     basketX - BASKET_W/2 + wi*(BASKET_W/3), BASKET_Y + BASKET_H/2, C.basketHi, 3);
    }
    game.draw.line(basketX - BASKET_W/2, BASKET_Y - BASKET_H/2, basketX + BASKET_W/2, BASKET_Y - BASKET_H/2, C.basketHi, 5);
    // Move target
    game.draw.line(basketTargetX, BASKET_Y + BASKET_H/2 + 15, basketTargetX, BASKET_Y + BASKET_H/2 + 35, C.ui, 3);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Bomb dots
    for (var bi = 0; bi < MAX_BOMBS; bi++) {
      game.draw.circle(W/2 - (MAX_BOMBS-1)*44 + bi*88, H*0.935, 18, bi < bombs ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(caught + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
    spawnTimer = 0.5;
  });
})(game);
