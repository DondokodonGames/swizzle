// 285-tower-stack.js
// タワースタック — 左右に動くブロックを真上からタップして積み上げるビルゲーム
// 操作: タップで動いているブロックを落とす
// 成功: 15段積む  失敗: 3回はみ出す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#04030a',
    sky:     '#0f1728',
    block:   '#3b82f6',
    blkHi:   '#93c5fd',
    blkDark: '#1e40af',
    danger:  '#ef4444',
    danHi:   '#fca5a5',
    perfect: '#22c55e',
    perHi:   '#86efac',
    ui:      '#475569',
    text:    '#f1f5f9',
    ground:  '#1e293b'
  };

  var BLOCK_H = 56;
  var BASE_W = 340;
  var STACK_X = W / 2; // center of stack

  var stack = []; // {x (left edge), w, y, color}
  var moving = null; // currently moving block
  var drops = 0;
  var MAX_DROP = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var particles = [];
  var scrollOffset = 0;

  var COLORS = [C.block, '#7c3aed', '#059669', '#d97706', '#0891b2'];

  function getTopY() {
    return H * 0.82 - stack.length * (BLOCK_H + 4);
  }

  function spawnMoving() {
    var topBlock = stack.length > 0 ? stack[stack.length - 1] : { x: STACK_X - BASE_W / 2, w: BASE_W };
    var movW = topBlock.w;
    var speed = 200 + stack.length * 15;
    moving = {
      x: 0 - movW,
      y: getTopY() - BLOCK_H - 8,
      w: movW,
      vx: speed,
      col: COLORS[stack.length % COLORS.length]
    };
  }

  function initStack() {
    stack.push({ x: STACK_X - BASE_W / 2, w: BASE_W, y: H * 0.82, col: C.ground });
  }

  game.onTap(function(tx, ty) {
    if (done || !moving) return;

    var prev = stack[stack.length - 1];
    var overlapL = Math.max(moving.x, prev.x);
    var overlapR = Math.min(moving.x + moving.w, prev.x + prev.w);
    var overlap = overlapR - overlapL;

    if (overlap <= 0) {
      // Completely missed
      drops++;
      feedback = '落ちた！ (' + drops + '/' + MAX_DROP + ')';
      feedbackCol = C.danger;
      feedbackTimer = 0.7;
      game.audio.play('se_failure', 0.5);
      moving = null;
      if (drops >= MAX_DROP && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
        return;
      }
      spawnMoving();
      return;
    }

    var isPerfect = Math.abs(moving.x - prev.x) < 8 && Math.abs(moving.w - prev.w) < 8;
    var blockW = isPerfect ? prev.w : overlap;
    var blockX = overlapL;

    if (isPerfect) {
      feedback = '完璧！';
      feedbackCol = C.perHi;
      feedbackTimer = 0.5;
    } else {
      feedback = '+' + Math.round(blockW) + 'px';
      feedbackCol = C.blkHi;
      feedbackTimer = 0.4;
    }

    var newY = getTopY() - BLOCK_H - 4;
    stack.push({ x: blockX, w: blockW, y: newY, col: moving.col });

    for (var pi = 0; pi < 4; pi++) {
      var ang = Math.random() * Math.PI * 2;
      particles.push({ x: blockX + blockW / 2, y: newY, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 100, life: 0.4, col: moving.col });
    }

    game.audio.play(isPerfect ? 'se_success' : 'se_tap', 0.4);
    moving = null;

    // Scroll up as tower grows
    if (stack.length > 8) scrollOffset = (stack.length - 8) * (BLOCK_H + 4);

    if (stack.length - 1 >= 15 && !done) {
      done = true;
      setTimeout(function() { game.end.success((stack.length - 1) * 100 + Math.ceil(timeLeft) * 80); }, 400);
      return;
    }

    spawnMoving();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;

    if (moving) {
      moving.x += moving.vx * dt;
      if (moving.x > W + moving.w) moving.vx = -Math.abs(moving.vx);
      if (moving.x < -moving.w) moving.vx = Math.abs(moving.vx);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.5, C.sky, 0.4);

    // Stack
    for (var si = 0; si < stack.length; si++) {
      var b = stack[si];
      var drawY = b.y + scrollOffset;
      if (drawY > H + 20) continue;
      game.draw.rect(b.x, drawY, b.w, BLOCK_H, b.col, 0.9);
      game.draw.rect(b.x, drawY, b.w, 10, '#fff', 0.2);
      game.draw.rect(b.x, drawY + BLOCK_H - 8, b.w, 8, '#000', 0.2);
    }

    // Moving block
    if (moving) {
      var my = moving.y + scrollOffset;
      game.draw.rect(moving.x, my, moving.w, BLOCK_H, moving.col, 0.9);
      game.draw.rect(moving.x, my, moving.w, 10, '#fff', 0.25);
      // Guide line
      var prev2 = stack[stack.length - 1];
      game.draw.line(prev2.x, my + BLOCK_H, prev2.x, prev2.y + scrollOffset, C.ui, 2);
      game.draw.line(prev2.x + prev2.w, my + BLOCK_H, prev2.x + prev2.w, prev2.y + scrollOffset, C.ui, 2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y + scrollOffset, 8 * p.life * 2.5, p.col, p.life * 0.7);
    }

    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.87, { size: 50, color: feedbackCol, bold: true });
    }

    // Drop dots
    for (var di = 0; di < MAX_DROP; di++) {
      game.draw.circle(W / 2 - (MAX_DROP - 1) * 28 + di * 56, H * 0.93, 16, di < drops ? C.danger : '#05040e');
    }

    game.draw.text((stack.length - 1) + ' / 15', W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.block : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    initStack();
    spawnMoving();
  });
})(game);
