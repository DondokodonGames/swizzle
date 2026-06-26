// 474-fruit-slicer.js
// フルーツスライサー — スワイプで飛んでいくフルーツを切る、爆弾は避ける
// 操作: スワイプで切る（フルーツをスライス、爆弾は切らない）
// 成功: 30個スライス  失敗: 爆弾を3回切る or 5個逃す or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#030a00',
    fruit0: '#ef4444',
    fruit1: '#f97316',
    fruit2: '#eab308',
    fruit3: '#22c55e',
    fruit4: '#8b5cf6',
    fruitIn0: '#fca5a5',
    fruitIn1: '#fed7aa',
    fruitIn2: '#fef08a',
    fruitIn3: '#bbf7d0',
    fruitIn4: '#ddd6fe',
    bomb:   '#1c1917',
    bombHi: '#44403c',
    fuse:   '#f97316',
    slash:  '#fff',
    juice:  '#fde68a',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var FRUIT_TYPES = [
    { col: C.fruit0, inCol: C.fruitIn0, label: '🍎' },
    { col: C.fruit1, inCol: C.fruitIn1, label: '🍊' },
    { col: C.fruit2, inCol: C.fruitIn2, label: '🍋' },
    { col: C.fruit3, inCol: C.fruitIn3, label: '🍈' },
    { col: C.fruit4, inCol: C.fruitIn4, label: '🍇' }
  ];

  var items = [];
  var slashParticles = [];
  var juiceParticles = [];
  var sliced = 0;
  var NEEDED = 30;
  var bombHits = 0;
  var MAX_BOMBS = 3;
  var escaped = 0;
  var MAX_ESCAPE = 5;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var nextSpawn = 0.6;
  var flashAnim = 0;
  var flashCol = C.juice;

  function spawnItem() {
    var isBomb = Math.random() < 0.22 + sliced * 0.003;
    var x = 150 + Math.random() * (W - 300);
    var speedY = -(900 + Math.random() * 400);
    var type = FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
    items.push({
      x: x, y: H + 60,
      vx: (Math.random() - 0.5) * 200,
      vy: speedY,
      r: isBomb ? 55 : 60 + Math.random() * 20,
      bomb: isBomb,
      type: type,
      sliced: false,
      half1: null, half2: null,
      escaped: false
    });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;

    // Check intersection of swipe line with each item
    for (var ii = items.length - 1; ii >= 0; ii--) {
      var item = items[ii];
      if (item.sliced) continue;

      // Distance from circle center to line segment
      var lx = x2 - x1, ly = y2 - y1;
      var len = Math.sqrt(lx * lx + ly * ly);
      if (len < 1) continue;
      var nx = lx / len, ny = ly / len;
      var dx = item.x - x1, dy = item.y - y1;
      var proj = dx * nx + dy * ny;
      var cx = x1 + proj * nx, cy = y1 + proj * ny;
      var dist = Math.sqrt((item.x - cx) * (item.x - cx) + (item.y - cy) * (item.y - cy));

      if (dist < item.r - 10) {
        item.sliced = true;
        if (item.bomb) {
          bombHits++;
          flashCol = C.wrong;
          flashAnim = 0.8;
          game.audio.play('se_failure', 0.6);
          for (var bi = 0; bi < 12; bi++) {
            var ang2 = Math.random() * Math.PI * 2;
            juiceParticles.push({ x: item.x, y: item.y, vx: Math.cos(ang2) * 300, vy: Math.sin(ang2) * 300 - 100, life: 0.8, col: C.bombHi, r: 18 });
          }
          if (bombHits >= MAX_BOMBS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        } else {
          sliced++;
          flashCol = C.juice;
          flashAnim = 0.25;
          game.audio.play('se_tap', 0.4);
          // Juice splatter
          for (var ji = 0; ji < 10; ji++) {
            var ang3 = Math.random() * Math.PI * 2;
            juiceParticles.push({ x: item.x, y: item.y, vx: Math.cos(ang3) * 250, vy: Math.sin(ang3) * 250 - 50, life: 0.7, col: item.type.inCol, r: 12 });
          }
          // Half pieces
          item.half1 = { x: item.x, y: item.y, vx: item.vx - 120, vy: item.vy * 0.6, r: item.r * 0.7, col: item.type.col, inCol: item.type.inCol, life: 1.0 };
          item.half2 = { x: item.x, y: item.y, vx: item.vx + 120, vy: item.vy * 0.6, r: item.r * 0.7, col: item.type.col, inCol: item.type.inCol, life: 1.0 };
          if (sliced >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.8);
            setTimeout(function() { game.end.success(sliced * 200 + Math.ceil(timeLeft) * 100); }, 700);
          }
        }
        items.splice(ii, 1);
      }
    }

    // Slash visual
    for (var si = 0; si < 6; si++) {
      var t = si / 5;
      slashParticles.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t, life: 0.3, r: 8 });
    }
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

    if (flashAnim > 0) flashAnim -= dt * 4;

    // Spawn
    nextSpawn -= dt;
    if (nextSpawn <= 0 && !done) {
      spawnItem();
      if (Math.random() < 0.3) spawnItem();
      nextSpawn = 0.4 + Math.random() * 0.5;
    }

    // Update items
    for (var ii2 = items.length - 1; ii2 >= 0; ii2--) {
      var it = items[ii2];
      it.vy += 700 * dt;
      it.x += it.vx * dt;
      it.y += it.vy * dt;

      // Half pieces
      if (it.half1) {
        it.half1.x += it.half1.vx * dt;
        it.half1.y += it.half1.vy * dt;
        it.half1.vy += 700 * dt;
        it.half1.life -= dt * 1.5;
      }
      if (it.half2) {
        it.half2.x += it.half2.vx * dt;
        it.half2.y += it.half2.vy * dt;
        it.half2.vy += 700 * dt;
        it.half2.life -= dt * 1.5;
      }

      if (it.y > H + 100 && !it.escaped) {
        it.escaped = true;
        items.splice(ii2, 1);
        if (!it.bomb) {
          escaped++;
          if (escaped >= MAX_ESCAPE && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }

    // Juice particles
    for (var jp = juiceParticles.length - 1; jp >= 0; jp--) {
      juiceParticles[jp].x += juiceParticles[jp].vx * dt;
      juiceParticles[jp].y += juiceParticles[jp].vy * dt;
      juiceParticles[jp].vy += 500 * dt;
      juiceParticles[jp].life -= dt * 1.2;
      if (juiceParticles[jp].life <= 0) juiceParticles.splice(jp, 1);
    }

    // Slash decay
    for (var sp = slashParticles.length - 1; sp >= 0; sp--) {
      slashParticles[sp].life -= dt * 4;
      if (slashParticles[sp].life <= 0) slashParticles.splice(sp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Items
    for (var ii3 = 0; ii3 < items.length; ii3++) {
      var it3 = items[ii3];
      if (it3.bomb) {
        game.draw.circle(it3.x, it3.y, it3.r + 8, C.bombHi, 0.3);
        game.draw.circle(it3.x, it3.y, it3.r, C.bomb, 1.0);
        game.draw.circle(it3.x, it3.y, it3.r - 12, C.bombHi, 0.2);
        // Fuse
        game.draw.line(it3.x, it3.y - it3.r, it3.x + 20, it3.y - it3.r - 50, C.fuse, 6);
        game.draw.circle(it3.x + 20 + Math.sin(elapsed * 15) * 8, it3.y - it3.r - 50 + Math.cos(elapsed * 12) * 5, 10, C.fuse, 0.9);
      } else {
        game.draw.circle(it3.x, it3.y, it3.r + 8, it3.type.col, 0.15);
        game.draw.circle(it3.x, it3.y, it3.r, it3.type.col, 0.9);
        game.draw.circle(it3.x - it3.r * 0.25, it3.y - it3.r * 0.25, it3.r * 0.3, '#fff', 0.25);
      }

      // Half pieces
      if (it3.half1 && it3.half1.life > 0) {
        game.draw.circle(it3.half1.x, it3.half1.y, it3.half1.r, it3.half1.col, it3.half1.life * 0.9);
        game.draw.rect(it3.half1.x - it3.half1.r, it3.half1.y - it3.half1.r * 0.1, it3.half1.r * 2, it3.half1.r, it3.half1.inCol, it3.half1.life * 0.7);
      }
      if (it3.half2 && it3.half2.life > 0) {
        game.draw.circle(it3.half2.x, it3.half2.y, it3.half2.r, it3.half2.col, it3.half2.life * 0.9);
        game.draw.rect(it3.half2.x - it3.half2.r, it3.half2.y, it3.half2.r * 2, it3.half2.r, it3.half2.inCol, it3.half2.life * 0.7);
      }
    }

    // Juice/bomb particles
    for (var jp2 = 0; jp2 < juiceParticles.length; jp2++) {
      var jp3 = juiceParticles[jp2];
      game.draw.circle(jp3.x, jp3.y, jp3.r * jp3.life, jp3.col, jp3.life * 0.9);
    }

    // Slash particles
    for (var sp2 = 0; sp2 < slashParticles.length; sp2++) {
      var s2 = slashParticles[sp2];
      game.draw.circle(s2.x, s2.y, s2.r * s2.life, C.slash, s2.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.12);

    // Bomb indicators
    for (var bi2 = 0; bi2 < MAX_BOMBS; bi2++) {
      var bx = W * 0.1 + bi2 * (W * 0.4 / (MAX_BOMBS - 1));
      game.draw.circle(bx, H * 0.948, 18, bi2 < bombHits ? C.wrong : C.ui, 0.9);
    }
    // Escape indicators
    for (var ei = 0; ei < MAX_ESCAPE; ei++) {
      var ex = W * 0.56 + ei * (W * 0.4 / (MAX_ESCAPE - 1));
      game.draw.circle(ex, H * 0.948, 14, ei < escaped ? C.fruit0 : C.ui, 0.9);
    }

    game.draw.text(sliced + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.fruit3 : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnItem();
    spawnItem();
  });
})(game);
