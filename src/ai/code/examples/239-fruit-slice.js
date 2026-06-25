// 239-fruit-slice.js
// フルーツスライス — 飛んでくるフルーツをスワイプで切る爽快感、爆弾は切らない
// 操作: スワイプで切る
// 成功: 20個切る  失敗: 爆弾を切る or フルーツを5個落とす

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060208',
    apple:  '#ef4444',
    appleHi:'#fca5a5',
    orange: '#f97316',
    orgHi:  '#fed7aa',
    melon:  '#22c55e',
    melHi:  '#86efac',
    banana: '#f59e0b',
    banHi:  '#fde68a',
    bomb:   '#1e293b',
    bombHi: '#374151',
    slash:  '#fff',
    ui:     '#475569'
  };

  var FRUITS = [
    { col: C.apple,  hi: C.appleHi,  label: '●', r: 44 },
    { col: C.orange, hi: C.orgHi,    label: '◆', r: 40 },
    { col: C.melon,  hi: C.melHi,    label: '▲', r: 46 },
    { col: C.banana, hi: C.banHi,    label: '★', r: 42 }
  ];

  var items = [];
  var slashTrail = []; // recent swipe points
  var sliceEffects = [];
  var score = 0;
  var NEEDED = 20;
  var dropped = 0;
  var MAX_DROP = 5;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 0.7;

  function spawnItem() {
    var isBomb = Math.random() < 0.2;
    var side = Math.random() < 0.5 ? 'left' : 'right';
    var x = side === 'left' ? -50 : W + 50;
    var y = H * 0.3 + Math.random() * H * 0.5;
    var speed = 400 + Math.random() * 200;
    var vx = side === 'left' ? speed : -speed;
    var vy = -(300 + Math.random() * 200);
    var ft = isBomb ? null : FRUITS[Math.floor(Math.random() * FRUITS.length)];
    items.push({
      x: x, y: y,
      vx: vx, vy: vy,
      isBomb: isBomb,
      fruit: ft,
      r: isBomb ? 40 : ft.r,
      sliced: false,
      sliceTimer: 0,
      age: 0
    });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Check if swipe line crosses any item
    for (var ii = items.length - 1; ii >= 0; ii--) {
      var item = items[ii];
      if (item.sliced) continue;

      // Check proximity to swipe line
      var dx = x2 - x1, dy = y2 - y1;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      var tx = item.x - x1, ty = item.y - y1;
      var proj = (tx * dx + ty * dy) / len;
      var perp = Math.abs(tx * dy - ty * dx) / len;

      if (perp < item.r + 10 && proj >= 0 && proj <= len) {
        item.sliced = true;
        item.sliceTimer = 0.4;

        if (item.isBomb) {
          done = true;
          game.audio.play('se_failure');
          sliceEffects.push({ x: item.x, y: item.y, life: 0.8, col: '#ff0000', big: true });
          setTimeout(function() { game.end.failure(); }, 500);
          return;
        } else {
          score++;
          game.audio.play('se_success', 0.5);
          sliceEffects.push({ x: item.x, y: item.y, life: 0.5, col: item.fruit.hi, big: false });
          // Slash particles
          for (var pi = 0; pi < 6; pi++) {
            var ang = Math.random() * Math.PI * 2;
            sliceEffects.push({ x: item.x + Math.cos(ang) * 20, y: item.y + Math.sin(ang) * 20, life: 0.3, col: item.fruit.col, big: false });
          }
          if (score >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(score * 80 + Math.ceil(timeLeft) * 30); }, 400);
          }
        }
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnItem();
      spawnTimer = SPAWN_INTERVAL * (0.6 + Math.random() * 0.8);
    }

    for (var ii = items.length - 1; ii >= 0; ii--) {
      var item = items[ii];
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vy += 500 * dt; // gravity
      item.age += dt;

      if (item.sliced) {
        item.sliceTimer -= dt;
        if (item.sliceTimer <= 0) {
          items.splice(ii, 1);
          continue;
        }
      } else if (item.y > H + 80) {
        // Fell off
        if (!item.isBomb) {
          dropped++;
          if (dropped >= MAX_DROP && !done) {
            done = true;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 400);
          }
        }
        items.splice(ii, 1);
      }
    }

    for (var ei = sliceEffects.length - 1; ei >= 0; ei--) {
      sliceEffects[ei].life -= dt;
      if (sliceEffects[ei].life <= 0) sliceEffects.splice(ei, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Items
    for (var ii2 = 0; ii2 < items.length; ii2++) {
      var item2 = items[ii2];
      var alpha = item2.sliced ? item2.sliceTimer / 0.4 : 0.9;

      if (item2.isBomb) {
        game.draw.circle(item2.x, item2.y, item2.r + 8, C.bombHi, 0.2);
        game.draw.circle(item2.x, item2.y, item2.r, C.bomb, alpha);
        game.draw.circle(item2.x, item2.y, item2.r * 0.4, '#ef4444', 0.3);
        game.draw.text('✕', item2.x, item2.y, { size: 36, color: '#ef4444', bold: true });
        // Fuse
        game.draw.line(item2.x, item2.y - item2.r, item2.x + 10, item2.y - item2.r - 20, '#f59e0b', 3);
      } else {
        var ft = item2.fruit;
        game.draw.circle(item2.x, item2.y, ft.r + 6, ft.hi, 0.2);
        game.draw.circle(item2.x, item2.y, ft.r, ft.col, alpha);
        game.draw.circle(item2.x - ft.r * 0.3, item2.y - ft.r * 0.3, ft.r * 0.2, '#fff', 0.4);
        if (!item2.sliced) {
          game.draw.text(ft.label, item2.x, item2.y, { size: 36, color: '#fff', bold: true });
        }
      }
    }

    // Slice effects
    for (var ei2 = 0; ei2 < sliceEffects.length; ei2++) {
      var ef = sliceEffects[ei2];
      var r2 = ef.big ? 80 : 30;
      game.draw.circle(ef.x, ef.y, r2 * (1 + (0.5 - ef.life)), ef.col, ef.life * 0.7);
    }

    // Drop counter
    for (var di = 0; di < MAX_DROP; di++) {
      game.draw.circle(W / 2 - (MAX_DROP - 1) * 26 + di * 52, H * 0.88, 16, di < dropped ? '#ef4444' : '#1e293b');
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    game.draw.text('スワイプで切る！ 爆弾は×', W / 2, H * 0.93, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.melon : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    spawnTimer = 0.3;
  });
})(game);
