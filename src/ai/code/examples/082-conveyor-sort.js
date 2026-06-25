// 082-conveyor-sort.js
// コンベアソート — ベルトコンベアで流れてくるアイテムを正しいシュートに振り分ける
// 操作: スワイプ左右で振り分け先を切り替え、タップで排出
// 成功: 20個正しく仕分け  失敗: 5回ミス or 35秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0c0c10',
    belt:    '#1e293b',
    beltHi:  '#334155',
    ui:      '#475569'
  };

  var TYPES = [
    { id: 'circle', color: '#ef4444', label: '●' },
    { id: 'square', color: '#3b82f6', label: '■' },
    { id: 'tri',    color: '#22c55e', label: '▲' }
  ];

  var BIN_X = [W * 0.2, W * 0.5, W * 0.8]; // 3 bins at bottom
  var BIN_LABELS = ['●', '■', '▲'];
  var BIN_COLORS = ['#ef4444', '#3b82f6', '#22c55e'];

  var BELT_Y = H * 0.45;
  var BELT_SPEED = 200; // px/s

  var items = []; // { x, type, launched, launchVx, launchVy }
  var selectedBin = 1; // 0,1,2
  var score = 0;
  var needed = 20;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 35;
  var done = false;
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 1.6;
  var feedback = 0;
  var feedbackOk = false;

  function spawnItem() {
    var type = TYPES[Math.floor(Math.random() * TYPES.length)];
    items.push({ x: -60, type: type, launched: false, launchVx: 0, launchVy: 0, vy: 0 });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') selectedBin = Math.max(0, selectedBin - 1);
    if (dir === 'right') selectedBin = Math.min(2, selectedBin + 1);
    game.audio.play('se_tap', 0.3);
  });

  game.onTap(function(x, y) {
    if (done) return;
    // Launch the front-most (rightmost ready) item toward selected bin
    var candidates = items.filter(function(it) {
      return !it.launched && it.x > 40 && it.x < W * 0.75;
    });
    if (candidates.length === 0) return;

    // Sort by rightmost first
    candidates.sort(function(a, b) { return b.x - a.x; });
    var item = candidates[0];

    var targetX = BIN_X[selectedBin];
    var targetY = H * 0.82;
    var dx = targetX - item.x;
    var dy = targetY - BELT_Y;
    var t = 0.5; // flight time
    item.launchVx = dx / t;
    item.launchVy = dy / t - 0.5 * 900 * t;
    item.launched = true;
    item.vy = item.launchVy;
    item.targetBin = selectedBin;

    game.audio.play('se_tap', 0.6);
  });

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

    // Spawn
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL - score * 0.04;
      if (spawnTimer < 0.9) spawnTimer = 0.9;
      spawnItem();
    }

    // Update items
    var toRemove = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it.launched) {
        it.x += BELT_SPEED * dt;
        // Item falls off right side
        if (it.x > W + 60) {
          toRemove.push(i);
          misses++;
          feedbackOk = false;
          feedback = 0.3;
          game.audio.play('se_failure', 0.5);
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 300);
          }
        }
      } else {
        it.vy += 900 * dt;
        it.x += it.launchVx * dt;
        it.launchY = (it.launchY || BELT_Y) + it.vy * dt;
        it.y = it.launchY;
        // Landed at bin?
        if (it.y > H * 0.82) {
          toRemove.push(i);
          // Check correct bin
          var correctBin = TYPES.indexOf(it.type);
          if (it.targetBin === correctBin) {
            score++;
            feedbackOk = true;
            feedback = 0.3;
            game.audio.play('se_tap', 0.9);
            if (score >= needed && !done) {
              done = true;
              game.audio.play('se_success');
              setTimeout(function() { game.end.success(score * 20 + Math.ceil(timeLeft) * 5); }, 400);
            }
          } else {
            misses++;
            feedbackOk = false;
            feedback = 0.35;
            game.audio.play('se_failure', 0.5);
            if (misses >= maxMisses && !done) {
              done = true;
              setTimeout(function() { game.end.failure(); }, 300);
            }
          }
        }
      }
    }

    // Remove in reverse order
    for (var j = toRemove.length - 1; j >= 0; j--) {
      items.splice(toRemove[j], 1);
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Belt
    game.draw.rect(0, BELT_Y - 40, W, 80, C.belt);
    game.draw.rect(0, BELT_Y - 40, W, 6, C.beltHi);
    game.draw.rect(0, BELT_Y + 34, W, 6, C.beltHi);
    // Belt stripes
    var beltOffset = (game.time.elapsed * BELT_SPEED) % 80;
    for (var s = -80; s < W + 80; s += 80) {
      var bx = (s + beltOffset) % (W + 80) - 40;
      game.draw.line(bx, BELT_Y - 40, bx + 40, BELT_Y + 40, C.beltHi, 3);
    }

    // Items on belt or in flight
    for (var k = 0; k < items.length; k++) {
      var item = items[k];
      var ix = item.x;
      var iy = item.launched ? item.y : BELT_Y;
      var t2 = item.type;

      if (t2.id === 'circle') {
        game.draw.circle(ix, iy, 36, t2.color);
        game.draw.circle(ix - 10, iy - 10, 12, '#fff', 0.3);
      } else if (t2.id === 'square') {
        game.draw.rect(ix - 36, iy - 36, 72, 72, t2.color);
        game.draw.rect(ix - 28, iy - 28, 24, 12, '#fff', 0.3);
      } else {
        // Triangle (approximated with lines)
        game.draw.circle(ix, iy - 10, 38, t2.color);
        game.draw.text(t2.label, ix, iy - 4, { size: 56, color: '#fff', bold: true });
      }
    }

    // Bins at bottom
    for (var b = 0; b < 3; b++) {
      var bx2 = BIN_X[b];
      var isSelected = b === selectedBin;
      var bColor = BIN_COLORS[b];
      game.draw.rect(bx2 - 72, H * 0.82, 144, 120, isSelected ? bColor : '#0f172a');
      game.draw.rect(bx2 - 80, H * 0.78, 160, 12, isSelected ? bColor : '#334155');
      game.draw.text(BIN_LABELS[b], bx2, H * 0.88, { size: 64, color: isSelected ? '#fff' : bColor, bold: true });
      if (isSelected) {
        game.draw.text('▼', bx2, H * 0.74, { size: 48, color: bColor, bold: true });
      }
    }

    // Selector arrows
    game.draw.text('← →スワイプ', W / 2, H * 0.95, { size: 40, color: C.ui });

    // Feedback
    if (feedback > 0) {
      game.draw.text(feedbackOk ? '正解！' : 'ミス！', W / 2, H * 0.35, {
        size: 72, color: feedbackOk ? '#22c55e' : '#ef4444', bold: true
      });
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 35);
    game.draw.rect(0, 0, W, 72, '#0c0c10');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#6d28d9' : '#ef4444');
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score + misses
    game.draw.text(score + ' / ' + needed, W / 2, 136, { size: 52, color: '#f1f5f9', bold: true });
    for (var m2 = 0; m2 < maxMisses; m2++) {
      var mx = W / 2 + (m2 - (maxMisses - 1) / 2) * 56;
      game.draw.circle(mx, 204, 18, m2 < misses ? '#ef4444' : '#0a1428');
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnItem();
  });
})(game);
