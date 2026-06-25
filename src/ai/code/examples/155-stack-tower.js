// 155-stack-tower.js
// 積み上げタワー — 動くブロックをタップして積む、ずれた分だけ削れていく緊張感
// 操作: タップでブロックを落とす
// 成功: 12段積む  失敗: ブロック幅が40px以下になる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#080c14',
    block:    ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'],
    blockHi:  '#e2e8f0',
    perfect:  '#fef08a',
    danger:   '#ef4444',
    ui:       '#334155',
    ground:   '#1e293b'
  };

  var BLOCK_H = 80;
  var INITIAL_W = 480;
  var BASE_Y = H * 0.88;
  var TOWER_X = W / 2;

  var stack = [];
  var moving = null;
  var SPEED_BASE = 420;
  var score = 0;
  var needed = 12;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];
  var timeLeft = 60;

  function towerTopY() {
    return BASE_Y - stack.length * BLOCK_H;
  }

  function addBase() {
    stack.push({ x: TOWER_X, w: INITIAL_W, colorIdx: 0 });
  }

  function spawnMoving() {
    if (stack.length === 0) return;
    var topW = stack[stack.length - 1].w;
    var speed = (SPEED_BASE + score * 30) * (Math.random() < 0.5 ? 1 : -1);
    moving = {
      x: speed > 0 ? -topW / 2 : W + topW / 2,
      w: topW,
      speed: speed,
      colorIdx: stack.length % C.block.length,
      y: towerTopY() - BLOCK_H
    };
  }

  game.onTap(function() {
    if (done || !moving) return;

    var topBlock = stack[stack.length - 1];
    var topLeft = topBlock.x - topBlock.w / 2;
    var topRight = topBlock.x + topBlock.w / 2;
    var movLeft = moving.x - moving.w / 2;
    var movRight = moving.x + moving.w / 2;

    var overlapLeft = Math.max(topLeft, movLeft);
    var overlapRight = Math.min(topRight, movRight);
    var overlap = overlapRight - overlapLeft;

    if (overlap <= 0) {
      // Missed entirely
      feedbackOk = false; feedback = 0.4;
      game.audio.play('se_failure', 0.7);
      moving = null;
      done = true;
      setTimeout(function() { game.end.failure(); }, 500);
      return;
    }

    var newW = overlap;
    var newX = (overlapLeft + overlapRight) / 2;
    var isPerfect = Math.abs(overlap - topBlock.w) < 6;

    if (isPerfect) {
      newW = topBlock.w;
      newX = topBlock.x;
      // Perfect particle burst
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: newX, y: moving.y, vx: Math.cos(ang) * 240, vy: Math.sin(ang) * 240 - 80, life: 0.6, color: C.perfect });
      }
    }

    stack.push({ x: newX, w: newW, colorIdx: moving.colorIdx });
    score++;
    feedbackOk = true; feedback = 0.35;
    game.audio.play('se_success', isPerfect ? 1.0 : 0.6);

    if (newW < 40) {
      done = true;
      setTimeout(function() { game.end.failure(); }, 500);
      return;
    }

    if (score >= needed && !done) {
      done = true;
      setTimeout(function() { game.end.success(score * 60 + Math.ceil(timeLeft) * 20 + (isPerfect ? 500 : 0)); }, 400);
      return;
    }

    moving = null;
    setTimeout(function() { spawnMoving(); }, 200);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    if (moving) {
      moving.x += moving.speed * dt;
      // Reverse at edges
      if (moving.x - moving.w / 2 < 40) { moving.x = 40 + moving.w / 2; moving.speed = Math.abs(moving.speed); }
      if (moving.x + moving.w / 2 > W - 40) { moving.x = W - 40 - moving.w / 2; moving.speed = -Math.abs(moving.speed); }
    }

    for (var pi = 0; pi < particles.length; pi++) {
      particles[pi].x += particles[pi].vx * dt; particles[pi].y += particles[pi].vy * dt;
      particles[pi].vy += 400 * dt; particles[pi].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // Camera: keep top of tower visible
    var stackTop = towerTopY();
    var camOffset = Math.min(0, H * 0.55 - stackTop);

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, BASE_Y + camOffset, W, H - BASE_Y, C.ground);
    game.draw.rect(TOWER_X - INITIAL_W / 2 - 20, BASE_Y + camOffset, INITIAL_W + 40, 16, '#374151');

    // Stack blocks
    for (var si = 0; si < stack.length; si++) {
      var bl = stack[si];
      var by = BASE_Y - (si + 1) * BLOCK_H + camOffset;
      var bx = bl.x - bl.w / 2;
      var col = C.block[bl.colorIdx];
      game.draw.rect(bx, by, bl.w, BLOCK_H, col, 0.9);
      game.draw.rect(bx, by, bl.w, 8, C.blockHi, 0.3);
      game.draw.rect(bx, by + BLOCK_H - 8, bl.w, 8, '#000', 0.25);
    }

    // Moving block
    if (moving) {
      var my = moving.y + camOffset;
      var col2 = C.block[moving.colorIdx];
      game.draw.rect(moving.x - moving.w / 2, my, moving.w, BLOCK_H, col2, 0.9);
      game.draw.rect(moving.x - moving.w / 2, my, moving.w, 8, C.blockHi, 0.4);
      // Align guide
      if (stack.length > 0) {
        var topB = stack[stack.length - 1];
        var guideLeft = topB.x - topB.w / 2;
        var guideRight = topB.x + topB.w / 2;
        var topY = towerTopY() + camOffset;
        game.draw.line(guideLeft, topY - 4, guideLeft, topY - 24, C.blockHi, 3);
        game.draw.line(guideRight, topY - 4, guideRight, topY - 24, C.blockHi, 3);
      }
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y + camOffset, 10 * part.life, part.color, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? '#22c55e' : C.danger, feedback * 0.12);
    }

    game.draw.text('タップで積む！', W / 2, H * 0.92, { size: 44, color: C.ui });
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.block[2] : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    addBase();
    setTimeout(function() { spawnMoving(); }, 300);
  });
})(game);
