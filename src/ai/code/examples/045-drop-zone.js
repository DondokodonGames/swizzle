// 045-drop-zone.js
// ドロップゾーン — 落下するアイテムを正しい容器に振り分ける仕分け師の判断力
// 操作: スワイプ左右で容器を選ぶ、タップで受け取り確定
// 成功: 10個正しく分類  失敗: 3回誤分類 or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#0a0810',
    binA:     '#1d4ed8',
    binAHi:   '#60a5fa',
    binB:     '#166534',
    binBHi:   '#4ade80',
    itemA:    '#3b82f6',
    itemAHi:  '#93c5fd',
    itemB:    '#22c55e',
    itemBHi:  '#86efac',
    correct:  '#22c55e',
    wrong:    '#ef4444',
    ui:       '#475569'
  };

  // Two bins: left=A (blue), right=B (green)
  // Items: circles are A, squares are B
  var BIN_W = 320;
  var BIN_H = 200;
  var BIN_Y = H * 0.73;
  var BIN_A_X = W * 0.18 - BIN_W / 2;
  var BIN_B_X = W * 0.82 - BIN_W / 2;

  var ITEM_R = 64;
  var DROP_SPEED = 440;

  // Current item
  var item = null;
  var activeBin = 0; // 0=left(A), 1=right(B)

  var score = 0;
  var needed = 10;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 20;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var feedbackX = W / 2;

  function spawnItem() {
    var type = Math.random() < 0.5 ? 'A' : 'B'; // A=circle, B=square
    item = {
      x: W * 0.3 + Math.random() * W * 0.4,
      y: -ITEM_R * 2,
      vy: DROP_SPEED,
      type: type
    };
    activeBin = 0; // reset to left bin
  }

  game.onSwipe(function(dir) {
    if (done || !item) return;
    if (dir === 'left') activeBin = 0;
    if (dir === 'right') activeBin = 1;
    game.audio.play('se_tap', 0.35);
  });

  game.onTap(function(x, y) {
    if (done || !item) return;

    var correctBin = item.type === 'A' ? 0 : 1;
    var wasCorrect = activeBin === correctBin;

    feedback = 0.4;
    feedbackOk = wasCorrect;
    feedbackX = item.x;

    if (wasCorrect) {
      score++;
      game.audio.play('se_tap', 0.8);
      if (score >= needed) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() {
          game.end.success(score * 15 + Math.ceil(timeLeft) * 5);
        }, 500);
        return;
      }
    } else {
      misses++;
      game.audio.play('se_failure', 0.6);
      if (misses >= maxMisses && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
    }
    item = null;
    setTimeout(spawnItem, 400);
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

    if (item) {
      item.vy += 200 * dt; // gravity
      item.y += item.vy * dt;
      // If item falls off screen without tap
      if (item.y > BIN_Y + BIN_H) {
        // Auto-miss
        misses++;
        game.audio.play('se_failure', 0.3);
        feedback = 0.4;
        feedbackOk = false;
        feedbackX = item.x;
        item = null;
        if (misses >= maxMisses && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        } else if (!done) {
          setTimeout(spawnItem, 400);
        }
      }
    }

    if (feedback > 0) feedback -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#0a0810');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#7c3aed' : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Score & misses
    game.draw.text(score + ' / ' + needed, W / 2, 128, { size: 56, color: C.correct, bold: true });
    for (var m = 0; m < maxMisses; m++) {
      var mx = W / 2 + (m - (maxMisses-1)/2) * 60;
      game.draw.circle(mx, 200, 18, m < misses ? C.wrong : '#1a1020');
    }

    // Bins
    // Left bin (A = circles)
    var aAlpha = activeBin === 0 ? 1.0 : 0.5;
    game.draw.rect(BIN_A_X - 8, BIN_Y - 8, BIN_W + 16, BIN_H + 16, '#1e3a8a', aAlpha * 0.5);
    game.draw.rect(BIN_A_X, BIN_Y, BIN_W, BIN_H, C.binA, aAlpha * 0.7);
    game.draw.rect(BIN_A_X + 20, BIN_Y + 20, BIN_W - 40, 8, C.binAHi, 0.4);
    game.draw.text('●', W * 0.18, BIN_Y + BIN_H / 2, { size: 80, color: C.binAHi, bold: true });
    game.draw.text('A', W * 0.18, BIN_Y + BIN_H * 0.82, { size: 48, color: C.binAHi, bold: true });
    if (activeBin === 0) {
      game.draw.rect(BIN_A_X, BIN_Y - 12, BIN_W, 12, C.binAHi);
    }

    // Right bin (B = squares)
    var bAlpha = activeBin === 1 ? 1.0 : 0.5;
    game.draw.rect(BIN_B_X - 8, BIN_Y - 8, BIN_W + 16, BIN_H + 16, '#14532d', bAlpha * 0.5);
    game.draw.rect(BIN_B_X, BIN_Y, BIN_W, BIN_H, C.binB, bAlpha * 0.7);
    game.draw.rect(BIN_B_X + 20, BIN_Y + 20, BIN_W - 40, 8, C.binBHi, 0.4);
    game.draw.text('■', W * 0.82, BIN_Y + BIN_H / 2, { size: 80, color: C.binBHi, bold: true });
    game.draw.text('B', W * 0.82, BIN_Y + BIN_H * 0.82, { size: 48, color: C.binBHi, bold: true });
    if (activeBin === 1) {
      game.draw.rect(BIN_B_X, BIN_Y - 12, BIN_W, 12, C.binBHi);
    }

    // Falling item
    if (item) {
      if (item.type === 'A') {
        game.draw.circle(item.x, item.y, ITEM_R + 10, C.itemAHi, 0.2);
        game.draw.circle(item.x, item.y, ITEM_R, C.itemA);
        game.draw.circle(item.x - 18, item.y - 18, ITEM_R * 0.3, '#fff', 0.4);
        game.draw.text('●', item.x, item.y, { size: 60, color: C.itemAHi });
      } else {
        game.draw.rect(item.x - ITEM_R - 8, item.y - ITEM_R - 8, ITEM_R*2+16, ITEM_R*2+16, C.itemBHi, 0.2);
        game.draw.rect(item.x - ITEM_R, item.y - ITEM_R, ITEM_R*2, ITEM_R*2, C.itemB);
        game.draw.rect(item.x - ITEM_R + 12, item.y - ITEM_R + 12, ITEM_R*2 - 24, ITEM_R * 0.4, '#fff', 0.3);
        game.draw.text('■', item.x, item.y, { size: 60, color: C.itemBHi });
      }

      // Active bin indicator line
      var binCX = activeBin === 0 ? W * 0.18 : W * 0.82;
      game.draw.line(item.x, item.y + ITEM_R, binCX, BIN_Y, activeBin === 0 ? C.binAHi : C.binBHi, 3);
    }

    // Feedback
    if (feedback > 0) {
      var prog = 1 - feedback / 0.4;
      if (feedbackOk) {
        game.draw.text('✓', feedbackX, H * 0.6 - prog * 60, { size: 100, color: C.correct, bold: true });
      } else {
        game.draw.text('✗', feedbackX, H * 0.6, { size: 100, color: C.wrong, bold: true });
      }
    }

    // Guide
    game.draw.text('L/Rスワイプで選択→タップ！', W / 2, H - 200, { size: 44, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    spawnItem();
  });
})(game);
