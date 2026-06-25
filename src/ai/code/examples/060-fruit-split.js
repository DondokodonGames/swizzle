// 060-fruit-split.js
// フルーツスプリット — 宙に浮く果物を素早くスワイプで切り裂く爽快感
// 操作: スワイプで果物を切る（爆弾は切らない）
// 成功: 20個の果物を切る  失敗: 爆弾を3回切る or 果物3個を逃す or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:    '#040810',
    bomb:  '#1c1c1c',
    fuse:  '#d97706',
    ui:    '#475569'
  };

  var FRUITS = [
    { color: '#ef4444', hiColor: '#fca5a5', name: '赤' },
    { color: '#f97316', hiColor: '#fed7aa', name: '橙' },
    { color: '#eab308', hiColor: '#fef08a', name: '黄' },
    { color: '#22c55e', hiColor: '#86efac', name: '緑' },
    { color: '#8b5cf6', hiColor: '#c4b5fd', name: '紫' }
  ];

  var items = [];
  var slices = []; // cut animation particles
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.65;
  var ITEM_R = 56;

  var score = 0;
  var needed = 20;
  var bombCuts = 0;
  var maxBombCuts = 3;
  var missedFruits = 0;
  var maxMissed = 3;
  var timeLeft = 20;
  var done = false;

  function spawnItem() {
    var isBomb = Math.random() < 0.2;
    var x = 120 + Math.random() * (W - 240);
    var vy = -(900 + Math.random() * 400);
    var fruitIdx = Math.floor(Math.random() * FRUITS.length);
    items.push({
      x: x,
      y: H + ITEM_R,
      vx: (Math.random() - 0.5) * 200,
      vy: vy,
      isBomb: isBomb,
      fruitIdx: fruitIdx,
      cut: false,
      r: ITEM_R
    });
  }

  var lastSwipeX = W / 2;
  var lastSwipeY = H / 2;

  game.onSwipe(function(dir) {
    if (done) return;
    // Swipe cuts anything near swipe path
    // We'll check all items
    for (var i = items.length - 1; i >= 0; i--) {
      var item = items[i];
      if (item.cut) continue;
      // Check if item is in a reachable zone
      if (item.y > H * 0.85 || item.y < H * 0.08) continue;

      var inLeft = item.x < W / 2 && (dir === 'left' || dir === 'right');
      var inRight = item.x >= W / 2 && (dir === 'left' || dir === 'right');
      var inUpper = item.y < H / 2 && (dir === 'up' || dir === 'down');
      var inLower = item.y >= H / 2 && (dir === 'up' || dir === 'down');

      // Simplify: any swipe can cut any visible item (the fun is in timing)
      if (item.y < H * 0.85 && item.y > H * 0.1) {
        cutItem(i);
      }
    }
  });

  game.onTap(function(x, y) {
    if (done) return;
    for (var i = items.length - 1; i >= 0; i--) {
      var item = items[i];
      if (item.cut) continue;
      var dx = x - item.x, dy = y - item.y;
      if (Math.sqrt(dx * dx + dy * dy) < item.r + 20) {
        cutItem(i);
        break;
      }
    }
  });

  function cutItem(i) {
    var item = items[i];
    if (item.isBomb) {
      bombCuts++;
      // Explosion
      for (var p = 0; p < 8; p++) {
        var ang = (p / 8) * Math.PI * 2;
        slices.push({ x: item.x, y: item.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, color: '#f97316', life: 0.5, r: 12 });
      }
      game.audio.play('se_failure', 0.8);
      if (bombCuts >= maxBombCuts && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 400);
      }
    } else {
      score++;
      var fruit = FRUITS[item.fruitIdx];
      // Slice particles
      for (var p2 = 0; p2 < 6; p2++) {
        var ang2 = (p2 / 6) * Math.PI * 2;
        slices.push({ x: item.x, y: item.y, vx: Math.cos(ang2) * 160, vy: Math.sin(ang2) * 160, color: fruit.color, life: 0.45, r: 10 });
      }
      slices.push({ x: item.x, y: item.y, vx: 0, vy: -80, color: '#fff', life: 0.3, r: 6 });
      game.audio.play('se_tap', 0.8);
      if (score >= needed && !done) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(score * 12 + Math.ceil(timeLeft) * 8); }, 400);
      }
    }
    item.cut = true;
  }

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure');
        game.end.failure();
        return;
      }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnItem();
      spawnTimer = Math.max(0.4, SPAWN_INTERVAL - (20 - timeLeft) * 0.01);
    }

    var GRAVITY = 1400;
    for (var i = items.length - 1; i >= 0; i--) {
      var item = items[i];
      item.vy += GRAVITY * dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;

      if (item.y > H + ITEM_R + 40) {
        if (!item.cut && !item.isBomb) {
          missedFruits++;
          if (missedFruits >= maxMissed && !done) {
            done = true;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        items.splice(i, 1);
      }
    }

    for (var s = slices.length - 1; s >= 0; s--) {
      slices[s].x += slices[s].vx * dt;
      slices[s].y += slices[s].vy * dt;
      slices[s].vy += 600 * dt;
      slices[s].life -= dt;
      if (slices[s].life <= 0) slices.splice(s, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Slices
    for (var sl = 0; sl < slices.length; sl++) {
      var p = slices[sl];
      game.draw.circle(p.x, p.y, p.r * (p.life / 0.45), p.color, p.life / 0.45 * 0.9);
    }

    // Items
    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      if (it.cut) continue;
      if (it.isBomb) {
        game.draw.circle(it.x, it.y, it.r + 8, '#374151', 0.4);
        game.draw.circle(it.x, it.y, it.r, C.bomb);
        game.draw.circle(it.x, it.y, it.r * 0.6, '#374151', 0.3);
        game.draw.circle(it.x - it.r * 0.25, it.y - it.r * 0.25, it.r * 0.15, '#fff', 0.2);
        // Fuse
        game.draw.line(it.x, it.y - it.r, it.x + 12, it.y - it.r - 28, C.fuse, 5);
        game.draw.circle(it.x + 12, it.y - it.r - 28, 8, C.fuse, 0.9);
        game.draw.text('!', it.x, it.y, { size: 52, color: '#ef4444', bold: true });
      } else {
        var fruit = FRUITS[it.fruitIdx];
        game.draw.circle(it.x, it.y, it.r + 10, fruit.color, 0.2);
        game.draw.circle(it.x, it.y, it.r, fruit.color);
        game.draw.circle(it.x - it.r * 0.28, it.y - it.r * 0.28, it.r * 0.25, '#fff', 0.4);
        // Small leaf
        game.draw.line(it.x, it.y - it.r, it.x + 12, it.y - it.r - 18, '#22c55e', 5);
      }
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#040810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#8b5cf6' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score
    game.draw.text(score + ' / ' + needed, W / 2, 140, { size: 56, color: '#a78bfa', bold: true });

    // Penalty indicators
    for (var b = 0; b < maxBombCuts; b++) {
      var bpx = W * 0.35 + b * 56;
      game.draw.circle(bpx, 212, 18, b < bombCuts ? '#ef4444' : '#1c1c1c');
    }
    game.draw.text('💣', W * 0.20, 212, { size: 36, color: '#6b7280' });

    for (var mf = 0; mf < maxMissed; mf++) {
      var mpx = W * 0.6 + mf * 56;
      game.draw.circle(mpx, 212, 18, mf < missedFruits ? '#ef4444' : '#1c1c1c');
    }
    game.draw.text('逃', W * 0.55, 212, { size: 36, color: '#6b7280' });

    // Guide
    game.draw.text('スワイプ/タップで果物を切れ！', W / 2, H - 200, { size: 44, color: C.ui });
    game.draw.text('爆弾は切るな！', W / 2, H - 140, { size: 40, color: '#374151' });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnTimer = 0.3;
  });
})(game);
