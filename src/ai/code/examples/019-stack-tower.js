// 019-stack-tower.js
// ブロック積み上げ — ズレるたびに細くなるブロックを積む職人の集中
// 操作: タップで落下中のブロックを止める
// 成功: 8段積む  失敗: ブロックが完全にズレる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#0f0a1a',
    shadow:  '#1a1028',
    ui:      '#475569',
    perfect: '#fbbf24',
    good:    '#22c55e',
    danger:  '#ef4444'
  };

  // Block colors per layer
  var BLOCK_COLORS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#c084fc',
    '#e879f9', '#f472b6', '#fb7185', '#fca5a5'
  ];

  var FLOOR_Y = H - 280;
  var BASE_W = 560;
  var BLOCK_H = 80;

  // Stack state
  var stack = [{ x: (W - BASE_W) / 2, w: BASE_W, y: FLOOR_Y }]; // base
  var layer = 0; // current layer being placed (0 = first block)

  // Moving block
  var moving = {
    x: 0,
    y: 0,
    w: BASE_W,
    dir: 1,
    speed: 420
  };

  var done = false;
  var timeLeft = 30;
  var feedbackTimer = 0;
  var feedbackText = '';
  var feedbackColor = C.good;
  var perfectCount = 0;

  function startMovingBlock() {
    var topBlock = stack[stack.length - 1];
    moving.w = topBlock.w;
    moving.y = topBlock.y - BLOCK_H;
    moving.dir = (Math.random() < 0.5 ? 1 : -1);
    // increase speed with each layer
    moving.speed = 380 + layer * 28;
    // start from edge
    moving.x = moving.dir > 0 ? -moving.w : W;
  }

  game.onTap(function(x, y) {
    if (done || feedbackTimer > 0) return;

    var top = stack[stack.length - 1];
    var topLeft = top.x;
    var topRight = top.x + top.w;
    var movLeft = moving.x;
    var movRight = moving.x + moving.w;

    // Calculate overlap
    var overlapLeft = Math.max(topLeft, movLeft);
    var overlapRight = Math.min(topRight, movRight);
    var overlapW = overlapRight - overlapLeft;

    if (overlapW <= 0) {
      // No overlap = fell off
      done = true;
      game.audio.play('se_failure');
      feedbackText = 'ドボン！';
      feedbackColor = C.danger;
      feedbackTimer = 0.6;
      setTimeout(function() { game.end.failure(); }, 700);
      return;
    }

    // Perfect check (within 12px)
    var isPerfect = Math.abs(movLeft - topLeft) < 12 && Math.abs(movRight - topRight) < 12;
    if (isPerfect) {
      overlapW = top.w; // snap to perfect
      overlapLeft = top.x;
      perfectCount++;
    }

    // Place block
    stack.push({
      x: overlapLeft,
      w: overlapW,
      y: moving.y
    });
    layer++;

    if (isPerfect) {
      feedbackText = 'PERFECT!';
      feedbackColor = C.perfect;
      game.audio.play('se_tap', 1.0);
    } else {
      feedbackText = overlapW > top.w * 0.7 ? 'GOOD' : 'OK';
      feedbackColor = C.good;
      game.audio.play('se_tap', 0.7);
    }
    feedbackTimer = 0.4;

    if (layer >= 8) {
      done = true;
      game.audio.play('se_success');
      var bonus = perfectCount * 15 + Math.ceil(timeLeft) * 3;
      setTimeout(function() {
        game.end.success(layer * 15 + bonus);
      }, 400);
      return;
    }

    startMovingBlock();
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

    if (!done && feedbackTimer <= 0) {
      moving.x += moving.dir * moving.speed * dt;
      if (moving.x + moving.w > W + 20) { moving.dir = -1; }
      if (moving.x < -20) { moving.dir = 1; }
    }
    if (feedbackTimer > 0) feedbackTimer -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Background gradient suggestion
    for (var i = 0; i < 5; i++) {
      game.draw.rect(0, FLOOR_Y + i * 60, W, 60, '#0d0818', 0.05 * (5 - i));
    }

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#100818');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#7c3aed' : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Layer counter
    game.draw.text(layer + ' / 8', W / 2, 128, { size: 56, color: '#a78bfa', bold: true });

    // Perfect counter
    if (perfectCount > 0) {
      game.draw.text('★ × ' + perfectCount, W / 2, 196, { size: 44, color: C.perfect, bold: true });
    }

    // Stack shadows
    for (var s = 0; s < stack.length; s++) {
      var blk = stack[s];
      game.draw.rect(blk.x + 8, blk.y + BLOCK_H + 6, blk.w, 12, '#000', 0.3);
    }

    // Stacked blocks
    for (var b = 0; b < stack.length; b++) {
      var blk2 = stack[b];
      if (b === 0) {
        // Base platform
        game.draw.rect(blk2.x - 20, blk2.y, blk2.w + 40, BLOCK_H + 20, '#2d1f52');
        game.draw.rect(blk2.x - 20, blk2.y, blk2.w + 40, 12, '#4c3580');
        continue;
      }
      var col = BLOCK_COLORS[(b - 1) % BLOCK_COLORS.length];
      game.draw.rect(blk2.x, blk2.y, blk2.w, BLOCK_H, col);
      game.draw.rect(blk2.x, blk2.y, blk2.w, 14, '#ffffff', 0.25);
      game.draw.rect(blk2.x, blk2.y + BLOCK_H - 8, blk2.w, 8, '#000', 0.2);
    }

    // Moving block (if not done and not in feedback pause)
    if (!done) {
      var colIdx = layer % BLOCK_COLORS.length;
      var mCol = BLOCK_COLORS[colIdx];
      var pulse = 0.85 + 0.15 * Math.sin(game.time.elapsed * 8);
      game.draw.rect(moving.x, moving.y, moving.w, BLOCK_H, mCol, pulse);
      game.draw.rect(moving.x, moving.y, moving.w, 14, '#fff', 0.3);

      // Alignment guide line
      var top2 = stack[stack.length - 1];
      game.draw.rect(top2.x - 2, moving.y, 4, BLOCK_H, '#fff', 0.2);
      game.draw.rect(top2.x + top2.w - 2, moving.y, 4, BLOCK_H, '#fff', 0.2);
    }

    // Feedback
    if (feedbackTimer > 0) {
      var prog = 1 - feedbackTimer / 0.4;
      game.draw.text(feedbackText, W / 2, moving.y - 80 - prog * 60, {
        size: 80, color: feedbackColor, bold: true
      });
    }

    // Floor
    game.draw.rect(0, FLOOR_Y + BLOCK_H + 20, W, 8, '#2d1f52', 0.5);

    // Guide
    game.draw.text('タップで止める！', W / 2, H - 180, { size: 52, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    startMovingBlock();
  });
})(game);
