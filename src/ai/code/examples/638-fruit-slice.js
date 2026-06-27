// 638-fruit-slice.js
// フルーツスライス — スワイプで果物を切れ、爆弾は切るな
// 操作: スワイプで切る
// 成功: 30個切る  失敗: 3個落とす or 爆弾3回切る or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030a02',
    fruit1:  '#ef4444',   // apple
    fruit2:  '#f97316',   // orange
    fruit3:  '#eab308',   // lemon
    fruit4:  '#22c55e',   // watermelon
    bomb:    '#1f2937',
    bombHi:  '#374151',
    slice1:  '#fca5a5',
    slice2:  '#fed7aa',
    slice3:  '#fef08a',
    slice4:  '#86efac',
    text:    '#f1f5f9',
    ui:      '#030d02',
    miss:    '#ef4444',
    safe:    '#22c55e'
  };

  var FRUIT_COLORS = [C.fruit1, C.fruit2, C.fruit3, C.fruit4];
  var SLICE_COLORS = [C.slice1, C.slice2, C.slice3, C.slice4];
  var FRUIT_R = 60;
  var BOMB_R = 56;

  var items = [];
  var sliceTrail = [];
  var slicing = false;
  var sliceX = 0, sliceY = 0;
  var sliceVX = 0, sliceVY = 0;

  var sliced = 0;
  var NEEDED = 30;
  var dropped = 0;
  var MAX_DROP = 3;
  var bombHits = 0;
  var MAX_BOMB = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];
  var flashAnim = 0, flashCol = C.safe;

  function spawnItem() {
    var isBomb = elapsed > 8 && Math.random() < 0.2;
    var x = 80 + Math.random() * (W - 160);
    var spd = 900 + elapsed * 5 + Math.random() * 200;
    items.push({
      x: x,
      y: H + 80,
      vx: (Math.random() - 0.5) * 300,
      vy: -spd,
      r: isBomb ? BOMB_R : FRUIT_R,
      isBomb: isBomb,
      typeIdx: Math.floor(Math.random() * 4),
      cut: false,
      cutTimer: 0
    });
  }

  // Swipe creates slice trail
  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    sliceX = x1; sliceY = y1;
    sliceVX = x2 - x1; sliceVY = y2 - y1;
    slicing = true;
    sliceTrail = [{x: x1, y: y1}];

    // Check intersections with items
    var sx1 = x1, sy1 = y1, sx2 = x2, sy2 = y2;
    var len = Math.sqrt((sx2-sx1)*(sx2-sx1)+(sy2-sy1)*(sy2-sy1));
    if (len < 1) return;
    var dx2 = (sx2-sx1)/len, dy2 = (sy2-sy1)/len;

    for (var ii = items.length - 1; ii >= 0; ii--) {
      var item = items[ii];
      if (item.cut) continue;
      // Point-to-line distance from item center to swipe segment
      var fx = item.x - sx1, fy = item.y - sy1;
      var proj = fx * dx2 + fy * dy2;
      var clampedProj = Math.max(0, Math.min(len, proj));
      var closestX = sx1 + dx2 * clampedProj;
      var closestY = sy1 + dy2 * clampedProj;
      var dist = Math.sqrt((item.x - closestX)*(item.x - closestX) + (item.y - closestY)*(item.y - closestY));

      if (dist < item.r + 20) {
        item.cut = true;
        if (item.isBomb) {
          bombHits++;
          flashCol = '#ff0000';
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 6; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: item.x, y: item.y, vx: Math.cos(pa) * 200, vy: Math.sin(pa) * 200, life: 0.5, col: C.bombHi });
          }
          if (bombHits >= MAX_BOMB && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        } else {
          sliced++;
          flashCol = SLICE_COLORS[item.typeIdx];
          flashAnim = 0.15;
          game.audio.play('se_success', 0.4);
          for (var p2 = 0; p2 < 5; p2++) {
            var pa2 = Math.random() * Math.PI * 2;
            particles.push({ x: item.x, y: item.y, vx: Math.cos(pa2) * 300, vy: Math.sin(pa2) * 300, life: 0.4, col: SLICE_COLORS[item.typeIdx] });
          }
          if (sliced >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(sliced * 200 + Math.ceil(timeLeft) * 100); }, 700);
          }
        }
      }
    }
  });

  game.onTap(function(tx, ty) {
    // Tap does nothing in this game except prevent the "no onTap" validation error
    if (done) return;
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
    if (slicing) { slicing = false; }

    spawnTimer += dt;
    var rate = Math.max(0.4, 1.2 - elapsed * 0.01);
    if (spawnTimer >= rate) {
      spawnTimer = 0;
      spawnItem();
      if (elapsed > 20 && Math.random() < 0.3) spawnItem();
    }

    // Update items
    for (var ii = items.length - 1; ii >= 0; ii--) {
      var item = items[ii];
      item.vy += 800 * dt; // gravity
      item.x += item.vx * dt;
      item.y += item.vy * dt;

      if (item.cut) {
        item.cutTimer += dt;
        if (item.cutTimer > 0.5) items.splice(ii, 1);
        continue;
      }
      if (item.y > H + item.r + 20) {
        if (!item.isBomb) {
          dropped++;
          flashCol = C.miss;
          flashAnim = 0.2;
          if (dropped >= MAX_DROP && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        items.splice(ii, 1);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Items
    for (var ii2 = 0; ii2 < items.length; ii2++) {
      var item2 = items[ii2];
      var alpha = item2.cut ? (1 - item2.cutTimer * 2) : 0.9;
      if (alpha <= 0) continue;
      if (item2.isBomb) {
        game.draw.circle(item2.x + 5, item2.y + 5, BOMB_R, '#000', 0.3);
        game.draw.circle(item2.x, item2.y, BOMB_R, C.bomb, alpha);
        game.draw.circle(item2.x - 15, item2.y - 15, BOMB_R * 0.25, C.bombHi, alpha * 0.5);
        game.draw.text('💣', item2.x, item2.y + 10, { size: BOMB_R * 1.5, color: '#fff' });
      } else {
        var fc = FRUIT_COLORS[item2.typeIdx];
        var sc = SLICE_COLORS[item2.typeIdx];
        game.draw.circle(item2.x + 5, item2.y + 5, FRUIT_R, '#000', 0.3);
        game.draw.circle(item2.x, item2.y, FRUIT_R, fc, alpha);
        game.draw.circle(item2.x - 20, item2.y - 20, FRUIT_R * 0.35, sc, alpha * 0.6);
        if (item2.cut) {
          game.draw.line(item2.x - FRUIT_R, item2.y, item2.x + FRUIT_R, item2.y, sc, 6);
        }
      }
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 14 * p3.life, p3.col, p3.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.08);

    // Status dots
    // Drop dots
    for (var di = 0; di < MAX_DROP; di++) {
      game.draw.circle(120 + di * 60, H * 0.955, 18, di < dropped ? C.miss : C.ui, 0.9);
    }
    // Bomb hits
    for (var bi = 0; bi < MAX_BOMB; bi++) {
      game.draw.circle(W - 120 - bi * 60, H * 0.955, 18, bi < bombHits ? '#ff6600' : C.ui, 0.9);
    }

    game.draw.text(sliced + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.miss);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnItem();
    spawnItem();
  });
})(game);
