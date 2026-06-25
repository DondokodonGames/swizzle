// 149-fruit-sorter.js
// フルーツ仕分け — 落ちてくるフルーツを色で判断して正しいカゴに仕分ける瞬発力ゲーム
// 操作: 左右タップでカゴをスライド
// 成功: 30個仕分け成功  失敗: 5個ミス or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040a06',
    basket1: '#ef4444',
    basket2: '#3b82f6',
    basket3: '#22c55e',
    fruit1:  '#f97316',
    fruit2:  '#06b6d4',
    fruit3:  '#a855f7',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#334155',
    ground:  '#0a1408'
  };

  var FRUIT_TYPES = [
    { label: '●', color: C.fruit1, basket: 0 },
    { label: '●', color: C.fruit2, basket: 1 },
    { label: '●', color: C.fruit3, basket: 2 }
  ];

  var BASKETS_X = [W * 0.2, W * 0.5, W * 0.8];
  var BASKET_W = 140, BASKET_H = 100;
  var BASKET_Y = H * 0.82;
  var BASKET_COLORS = [C.basket1, C.basket2, C.basket3];

  var fruits = [];
  var FRUIT_R = 40;
  var FRUIT_SPEED = 260;
  var SPAWN_INTERVAL = 0.7;
  var spawnTimer = 0;

  var score = 0;
  var needed = 30;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  function spawnFruit() {
    var type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
    fruits.push({ x: W * 0.15 + Math.random() * W * 0.7, y: -FRUIT_R, type: type });
  }

  game.onTap(function(tx) {
    if (done) return;
    if (tx < W / 2) {
      for (var bi = 0; bi < BASKETS_X.length; bi++) BASKETS_X[bi] = Math.max(W*0.15, BASKETS_X[bi] - W*0.3);
    } else {
      for (var bi2 = 0; bi2 < BASKETS_X.length; bi2++) BASKETS_X[bi2] = Math.min(W*0.85, BASKETS_X[bi2] + W*0.3);
    }
    game.audio.play('se_tap', 0.4);
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') {
      for (var bi = 0; bi < BASKETS_X.length; bi++) BASKETS_X[bi] = Math.max(W*0.15, BASKETS_X[bi] - W*0.3);
    } else if (dir === 'right') {
      for (var bi2 = 0; bi2 < BASKETS_X.length; bi2++) BASKETS_X[bi2] = Math.min(W*0.85, BASKETS_X[bi2] + W*0.3);
    }
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnTimer = SPAWN_INTERVAL*(0.7+Math.random()*0.6); spawnFruit(); }

    for (var fi = fruits.length - 1; fi >= 0; fi--) {
      var f = fruits[fi];
      f.y += FRUIT_SPEED * dt;
      if (f.y + FRUIT_R > BASKET_Y) {
        var caught = false;
        for (var bi3 = 0; bi3 < BASKETS_X.length; bi3++) {
          if (Math.abs(f.x - BASKETS_X[bi3]) < BASKET_W/2 + FRUIT_R*0.5) {
            if (bi3 === f.type.basket) {
              score++; feedbackOk = true; feedback = 0.35;
              game.audio.play('se_success', 0.6);
              for (var pi = 0; pi < 6; pi++) {
                var ang = Math.random()*Math.PI*2;
                particles.push({ x: f.x, y: BASKET_Y, vx: Math.cos(ang)*160, vy: Math.sin(ang)*160-100, life: 0.4, color: f.type.color });
              }
              if (score >= needed && !done) { done = true; game.audio.play('se_success'); setTimeout(function() { game.end.success(score*20+Math.ceil(timeLeft)*15); }, 400); }
            } else {
              misses++; feedbackOk = false; feedback = 0.4;
              game.audio.play('se_failure', 0.5);
              if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 400); }
            }
            caught = true; break;
          }
        }
        if (!caught && f.y > BASKET_Y + 60) {
          misses++; feedbackOk = false; feedback = 0.4;
          game.audio.play('se_failure', 0.4);
          if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 400); }
        }
        fruits.splice(fi, 1);
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx*dt; particles[pi2].y += particles[pi2].vy*dt;
      particles[pi2].vy += 500*dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });
    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, BASKET_Y + BASKET_H, W, H - BASKET_Y - BASKET_H, C.ground);

    for (var bi4 = 0; bi4 < BASKETS_X.length; bi4++) {
      var bx = BASKETS_X[bi4];
      game.draw.rect(bx-BASKET_W/2, BASKET_Y, BASKET_W, BASKET_H, BASKET_COLORS[bi4], 0.85);
      game.draw.rect(bx-BASKET_W/2, BASKET_Y, BASKET_W, 12, '#fff', 0.2);
      // Color indicator dot matching fruit color
      game.draw.circle(bx, BASKET_Y + BASKET_H/2, 32, FRUIT_TYPES[bi4].color, 0.9);
      game.draw.circle(bx, BASKET_Y + BASKET_H/2, 20, '#fff', 0.3);
    }

    for (var fi2 = 0; fi2 < fruits.length; fi2++) {
      var f2 = fruits[fi2];
      game.draw.circle(f2.x, f2.y, FRUIT_R+8, f2.type.color, 0.2);
      game.draw.circle(f2.x, f2.y, FRUIT_R, f2.type.color, 0.9);
      game.draw.circle(f2.x-FRUIT_R*0.3, f2.y-FRUIT_R*0.3, FRUIT_R*0.2, '#fff', 0.5);
    }

    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8*part.life*2.5, part.color, part.life);
    }

    if (feedback > 0) game.draw.rect(0, 0, W, H, feedbackOk ? C.correct : C.wrong, feedback*0.15);

    game.draw.text('← タップ  タップ →', W/2, H*0.92, { size: 40, color: C.ui });
    game.draw.text(score + ' / ' + needed, W/2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) game.draw.circle(W/2+(mi-2)*52, 218, 18, mi < misses ? C.wrong : '#0a1020');

    var ratio = Math.max(0, timeLeft/40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.basket2 : C.wrong);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() { game.audio.bgm('bgm_main', 0.3); spawnFruit(); });
})(game);
