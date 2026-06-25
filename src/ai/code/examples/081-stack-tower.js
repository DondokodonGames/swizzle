// 081-stack-tower.js
// スタックタワー — 左右に揺れるブロックをタップでズバっと積み上げる積み木の快感
// 操作: タップでブロックを落とす
// 成功: 10段積む  失敗: はみ出しで幅がゼロになる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080c14',
    ui:      '#475569',
    perfect: '#fbbf24',
    danger:  '#ef4444'
  };

  var BLOCK_H = 60;
  var BASE_Y = H * 0.85;
  var STACK_GAP = BLOCK_H + 4;

  // Color palette for blocks (index cycles)
  var COLORS = ['#3b82f6','#8b5cf6','#ec4899','#ef4444','#f97316','#eab308','#22c55e','#06b6d4'];

  var stack = []; // { x, w, y, color }
  var moving = null; // { x, w, speed, color }
  var score = 0;
  var needed = 10;
  var timeLeft = 30;
  var done = false;
  var perfectFlash = 0;
  var cutFlash = 0;
  var cutColor = '#fff';

  function stackTop() {
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }

  function spawnMoving() {
    var top = stackTop();
    var w = top ? top.w : W * 0.6;
    var color = COLORS[stack.length % COLORS.length];
    var speed = 280 + score * 18;
    // Start from left or right alternately
    var startX = (stack.length % 2 === 0) ? -w : W;
    moving = { x: startX, w: w, speed: (stack.length % 2 === 0 ? speed : -speed), color: color };
  }

  function initStack() {
    stack = [];
    var baseW = W * 0.6;
    stack.push({
      x: (W - baseW) / 2,
      w: baseW,
      y: BASE_Y,
      color: COLORS[0]
    });
    spawnMoving();
  }

  game.onTap(function(x, y) {
    if (done || !moving) return;

    var top = stackTop();
    var topLeft = top.x;
    var topRight = top.x + top.w;
    var movLeft = moving.x;
    var movRight = moving.x + moving.w;

    // Overlap region
    var left = Math.max(topLeft, movLeft);
    var right = Math.min(topRight, movRight);
    var overlap = right - left;

    if (overlap <= 0) {
      // Completely missed
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
      return;
    }

    var diff = Math.abs((movLeft + moving.w / 2) - (top.x + top.w / 2));
    var isPerfect = diff < 8;

    // New block is the overlapping region
    var newW = isPerfect ? top.w : overlap; // perfect = same width as below
    var newX = isPerfect ? top.x : left;
    var newY = top.y - STACK_GAP;
    var color = moving.color;

    stack.push({ x: newX, w: newW, y: newY, color: color });
    score++;

    if (isPerfect) {
      perfectFlash = 0.5;
      game.audio.play('se_tap', 1.0);
    } else {
      cutFlash = 0.25;
      cutColor = color;
      game.audio.play('se_tap', 0.6);
    }

    moving = null;

    if (score >= needed && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(score * 30 + Math.ceil(timeLeft) * 8); }, 400);
      return;
    }

    setTimeout(spawnMoving, 100);
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

    if (moving) {
      moving.x += moving.speed * dt;
      // Bounce off edges
      if (moving.x + moving.w > W + 40) {
        moving.x = W + 40 - moving.w;
        moving.speed = -Math.abs(moving.speed);
      }
      if (moving.x < -40) {
        moving.x = -40;
        moving.speed = Math.abs(moving.speed);
      }
    }

    if (perfectFlash > 0) perfectFlash -= dt;
    if (cutFlash > 0) cutFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Stacked blocks (draw from bottom up)
    for (var i = 0; i < stack.length; i++) {
      var b = stack[i];
      var highlight = i === stack.length - 1;
      game.draw.rect(b.x, b.y - BLOCK_H, b.w, BLOCK_H, b.color);
      game.draw.rect(b.x + 4, b.y - BLOCK_H + 4, b.w - 8, 8, '#fff', 0.25);
      if (highlight) {
        game.draw.rect(b.x - 2, b.y - BLOCK_H - 2, b.w + 4, BLOCK_H + 4, '#fff', 0.15);
      }
    }

    // Moving block
    if (moving) {
      game.draw.rect(moving.x, H * 0.2, moving.w, BLOCK_H, moving.color);
      game.draw.rect(moving.x + 4, H * 0.2 + 4, moving.w - 8, 8, '#fff', 0.3);
      // Shadow guide line
      var top = stackTop();
      if (top) {
        game.draw.line(moving.x, H * 0.2 + BLOCK_H, moving.x, top.y - BLOCK_H, moving.color, 2);
        game.draw.line(moving.x + moving.w, H * 0.2 + BLOCK_H, moving.x + moving.w, top.y - BLOCK_H, moving.color, 2);
      }
    }

    // Perfect flash
    if (perfectFlash > 0) {
      game.draw.rect(0, 0, W, H, C.perfect, perfectFlash * 0.25);
      game.draw.text('PERFECT!', W / 2, H * 0.35, { size: 80, color: C.perfect, bold: true });
    }

    // Cut flash
    if (cutFlash > 0) {
      game.draw.rect(0, 0, W, H, cutColor, cutFlash * 0.1);
    }

    // Score display
    game.draw.text(score + ' / ' + needed, W / 2, 140, { size: 60, color: '#f1f5f9', bold: true });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, '#080c14');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? '#3b82f6' : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    if (score === 0) {
      game.draw.text('タップで落とす！', W / 2, H - 220, { size: 52, color: C.ui });
    }
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    initStack();
  });
})(game);
