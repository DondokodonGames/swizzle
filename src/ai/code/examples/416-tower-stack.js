// 416-tower-stack.js
// タワー積み — 揺れるブロックをタップして積み上げる
// 操作: タップでブロックを落とす、前のブロックに揃える
// 成功: 15段積む  失敗: 3回ひどくはみ出す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0614',
    sky:    '#120e20',
    block0: '#ef4444',
    block1: '#f97316',
    block2: '#eab308',
    block3: '#22c55e',
    block4: '#3b82f6',
    block5: '#a855f7',
    shadow: '#1a1028',
    perfect:'#fbbf24',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var COLORS = [C.block0,C.block1,C.block2,C.block3,C.block4,C.block5];

  var BLOCK_H = 80;
  var BASE_W = 360;
  var BASE_X = W/2;

  var blocks = [];
  var movingBlock = { x: W*0.1, w: BASE_W, vx: 320, col: COLORS[0] };
  var direction = 1;
  var stackHeight = 0;
  var stacked = 0;
  var NEEDED = 15;
  var fell = 0;
  var MAX_FELL = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.perfect;
  var cameraY = 0;  // scroll up as tower grows
  var CAMERA_OFFSET = H * 0.6;

  // Base
  blocks.push({ x: BASE_X, w: BASE_W, col: COLORS[0] });

  function getTopBlock() { return blocks[blocks.length-1]; }

  function nextMovingBlock() {
    var top = getTopBlock();
    var colorIdx = stacked % COLORS.length;
    movingBlock = {
      x: Math.random() < 0.5 ? -60 : W+60,
      w: top.w,
      vx: (Math.random() < 0.5 ? 1 : -1) * (300 + Math.min(stacked*8, 300)),
      col: COLORS[colorIdx]
    };
    direction = movingBlock.vx > 0 ? 1 : -1;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var top = getTopBlock();
    // Block Y position in world space
    var blockWorldY = cameraY + BLOCK_H * (blocks.length);

    // Calculate overlap
    var topLeft = top.x - top.w/2;
    var topRight = top.x + top.w/2;
    var movLeft = movingBlock.x - movingBlock.w/2;
    var movRight = movingBlock.x + movingBlock.w/2;

    var overlapLeft = Math.max(topLeft, movLeft);
    var overlapRight = Math.min(topRight, movRight);
    var overlap = overlapRight - overlapLeft;

    if (overlap <= 0) {
      // Completely missed
      fell++;
      game.audio.play('se_failure', 0.5);
      for (var pi = 0; pi < 10; pi++) {
        var ang = Math.random()*Math.PI*2;
        particles.push({ x:movingBlock.x, y:blockWorldY, vx:Math.cos(ang)*200, vy:Math.sin(ang)*200-100, life:0.6, col:movingBlock.col });
      }
      if (fell >= MAX_FELL && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 600); return; }
      nextMovingBlock();
      return;
    }

    // Trim block to overlap
    var newX = (overlapLeft + overlapRight) / 2;
    var newW = overlap;

    // Perfect check
    if (Math.abs(newX - top.x) < 8 && Math.abs(newW - top.w) < 8) {
      newX = top.x;
      newW = top.w;
      flashCol = C.perfect;
      flashAnim = 0.5;
      game.audio.play('se_success', 0.6);
      for (var pi2 = 0; pi2 < 8; pi2++) {
        var ang2 = Math.random()*Math.PI*2;
        particles.push({ x:newX, y:blockWorldY, vx:Math.cos(ang2)*160, vy:Math.sin(ang2)*160, life:0.6, col:C.perfect });
      }
    } else {
      game.audio.play('se_tap', 0.4);
    }

    // Check if block is too small (< 20% of original)
    if (newW < BASE_W * 0.2) {
      fell++;
      game.audio.play('se_failure', 0.5);
      if (fell >= MAX_FELL && !done) { done = true; setTimeout(function(){ game.end.failure(); }, 600); return; }
      nextMovingBlock();
      return;
    }

    blocks.push({ x: newX, w: newW, col: movingBlock.col });
    stacked++;
    stackHeight = blocks.length * BLOCK_H;

    // Camera follows
    cameraY = Math.max(0, stackHeight - CAMERA_OFFSET);

    if (stacked >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success', 0.8);
      setTimeout(function(){ game.end.success(stacked*400+Math.ceil(timeLeft)*80); }, 700);
      return;
    }
    nextMovingBlock();
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Move moving block
    movingBlock.x += movingBlock.vx * dt;
    if (movingBlock.x > W + movingBlock.w/2 + 20) movingBlock.vx = -Math.abs(movingBlock.vx);
    if (movingBlock.x < -movingBlock.w/2 - 20) movingBlock.vx = Math.abs(movingBlock.vx);

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx*dt;
      particles[pp].y += particles[pp].vy*dt;
      particles[pp].vy += 400*dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp,1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H, C.sky, 0.5);

    // Draw stacked blocks (bottom to top, visible ones)
    var visBottom = cameraY;
    var visTop = cameraY - H;

    for (var bi = 0; bi < blocks.length; bi++) {
      var b = blocks[bi];
      var worldY = (blocks.length - 1 - bi) * BLOCK_H;  // 0 = top block
      var screenY = H - (bi+1)*BLOCK_H + cameraY - cameraY;
      // Actually: block 0 is at bottom
      var blockScreenY = H - (bi+1)*BLOCK_H - (stackHeight-CAMERA_OFFSET < 0 ? 0 : stackHeight-CAMERA_OFFSET);
      blockScreenY = H - (bi+1)*BLOCK_H + (CAMERA_OFFSET - stackHeight);
      blockScreenY = Math.max(-BLOCK_H, blockScreenY);

      if (blockScreenY > H + 20) continue;
      game.draw.rect(b.x - b.w/2 + 6, blockScreenY + 6, b.w, BLOCK_H, C.shadow, 0.4);
      game.draw.rect(b.x - b.w/2, blockScreenY, b.w, BLOCK_H, b.col, 0.9);
      game.draw.rect(b.x - b.w/2 + 8, blockScreenY + 8, b.w/3, BLOCK_H/3, '#fff', 0.15);
    }

    // Moving block Y position
    var topBlockY = H - (blocks.length+1)*BLOCK_H + (CAMERA_OFFSET - stackHeight);
    game.draw.rect(movingBlock.x - movingBlock.w/2 + 4, topBlockY + 4, movingBlock.w, BLOCK_H, C.shadow, 0.3);
    game.draw.rect(movingBlock.x - movingBlock.w/2, topBlockY, movingBlock.w, BLOCK_H, movingBlock.col, 0.9);
    game.draw.rect(movingBlock.x - movingBlock.w/2 + 8, topBlockY + 8, movingBlock.w/3, BLOCK_H/3, '#fff', 0.2);

    // Alignment guide
    var top2 = getTopBlock();
    var guideY = topBlockY + BLOCK_H;
    game.draw.line(top2.x - top2.w/2, guideY, top2.x - top2.w/2, guideY-BLOCK_H, '#fff', 2);
    game.draw.line(top2.x + top2.w/2, guideY, top2.x + top2.w/2, guideY-BLOCK_H, '#fff', 2);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9*p.life, p.col, p.life*0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim*0.1);

    // Fell dots
    for (var fi = 0; fi < MAX_FELL; fi++) {
      game.draw.circle(W/2-(MAX_FELL-1)*44+fi*88, H*0.935, 18, fi < fell ? C.block0 : C.ui, 0.9);
    }

    game.draw.text(stacked + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft/60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W*ratio, 72, ratio > 0.3 ? C.block4 : C.block0);
    game.draw.text(Math.ceil(timeLeft)+'', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    nextMovingBlock();
  });
})(game);
