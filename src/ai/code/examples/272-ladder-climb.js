// 272-ladder-climb.js
// ラダークライム — 無限に伸びるはしごを登れ、左右の手を交互に
// 操作: 左タップで左手、右タップで右手を使ってはしごを登る
// 成功: 50段登る  失敗: 同じ手を2回連続 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0508',
    ladder: '#78350f',
    ldHi:   '#d97706',
    left:   '#3b82f6',
    leftHi: '#93c5fd',
    right:  '#ef4444',
    rightHi:'#fca5a5',
    body:   '#22c55e',
    bodyHi: '#86efac',
    sky:    '#0f172a',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var CX = W / 2;
  var climbY = H * 0.5; // character display position (fixed)
  var scroll = 0; // how far we've scrolled
  var RUNG_SPACING = 90;
  var LADDER_W = 180;

  var lastHand = null; // 'left' or 'right'
  var climbed = 0;
  var NEEDED = 50;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;

  var leftHandY = 0;
  var rightHandY = 0;
  var bodyLean = 0; // tilt left or right
  var climbAnim = 0;
  var particles = [];

  game.onTap(function(tx, ty) {
    if (done) return;
    var side = tx < W / 2 ? 'left' : 'right';

    if (side === lastHand) {
      // Same hand twice! Slip
      done = true;
      feedback = '滑った！';
      feedbackCol = C.right;
      game.audio.play('se_failure', 0.7);
      setTimeout(function() { game.end.failure(); }, 600);
      return;
    }

    lastHand = side;
    climbed++;
    climbAnim = 0.3;
    bodyLean = side === 'left' ? -0.3 : 0.3;
    game.audio.play('se_tap', 0.3);

    // Scroll effect
    scroll += RUNG_SPACING;

    // Particles
    for (var pi = 0; pi < 4; pi++) {
      var ang = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      particles.push({
        x: CX + (side === 'left' ? -60 : 60),
        y: climbY,
        vx: Math.cos(ang) * 80,
        vy: Math.sin(ang) * 80,
        life: 0.4,
        col: side === 'left' ? C.leftHi : C.rightHi
      });
    }

    if (climbed >= NEEDED && !done) {
      done = true;
      game.audio.play('se_success');
      setTimeout(function() { game.end.success(climbed * 80 + Math.ceil(timeLeft) * 100); }, 400);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;
    if (climbAnim > 0) climbAnim -= dt * 3;
    bodyLean *= (1 - dt * 4);

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky background at top
    game.draw.rect(0, 0, W, H * 0.3, C.sky, 0.5);

    // Ladder rails
    var LX1 = CX - LADDER_W / 2;
    var LX2 = CX + LADDER_W / 2;
    game.draw.rect(LX1 - 10, 0, 20, H, C.ladder, 0.9);
    game.draw.rect(LX2 - 10, 0, 20, H, C.ladder, 0.9);
    // Rail highlights
    game.draw.rect(LX1 - 6, 0, 6, H, C.ldHi, 0.4);
    game.draw.rect(LX2, 0, 6, H, C.ldHi, 0.4);

    // Rungs (scrolling)
    var rungOffset = scroll % RUNG_SPACING;
    for (var ri = -1; ri < Math.ceil(H / RUNG_SPACING) + 2; ri++) {
      var ry = H - ri * RUNG_SPACING + rungOffset - RUNG_SPACING;
      game.draw.rect(LX1, ry - 8, LADDER_W, 16, C.ladder, 0.95);
      game.draw.rect(LX1, ry - 8, LADDER_W, 5, C.ldHi, 0.5);
    }

    // Character
    var lean = bodyLean;
    var bobY = climbAnim > 0 ? -20 * Math.sin(climbAnim * Math.PI / 0.3) : 0;
    var bx = CX + lean * 30;
    var by = climbY + bobY;

    // Body
    game.draw.rect(bx - 20, by - 50, 40, 80, C.body, 0.9);
    // Head
    game.draw.circle(bx, by - 70, 32, C.bodyHi, 0.9);
    game.draw.circle(bx + 10, by - 75, 10, C.bg, 0.9); // eye

    // Left arm
    var lArmX = bx - 30 + (lastHand === 'left' ? -30 : 0);
    var lArmY = by - 30 + (lastHand === 'left' ? -20 : 0);
    game.draw.line(bx - 20, by - 30, lArmX, lArmY, C.left, 16);
    game.draw.circle(lArmX, lArmY, 14, C.left, 0.9);

    // Right arm
    var rArmX = bx + 30 + (lastHand === 'right' ? 30 : 0);
    var rArmY = by - 30 + (lastHand === 'right' ? -20 : 0);
    game.draw.line(bx + 20, by - 30, rArmX, rArmY, C.right, 16);
    game.draw.circle(rArmX, rArmY, 14, C.right, 0.9);

    // Legs
    var legPhase = climbed * Math.PI / 2;
    game.draw.line(bx - 10, by + 30, bx - 10 + Math.sin(legPhase) * 20, by + 70, C.bodyHi, 14);
    game.draw.line(bx + 10, by + 30, bx + 10 - Math.sin(legPhase) * 20, by + 70, C.bodyHi, 14);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2.5, p.col, p.life * 0.8);
    }

    // Side tap guides
    game.draw.rect(0, H * 0.7, W / 2, H * 0.2, C.left, 0.08);
    game.draw.rect(W / 2, H * 0.7, W / 2, H * 0.2, C.right, 0.08);
    game.draw.text('左手', W * 0.25, H * 0.82, { size: 44, color: lastHand === 'right' ? C.leftHi : C.ui });
    game.draw.text('右手', W * 0.75, H * 0.82, { size: 44, color: lastHand === 'left' ? C.rightHi : C.ui });

    // Feedback
    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.88, { size: 50, color: feedbackCol, bold: true });
    }

    game.draw.text(climbed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.body : C.right);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
  });
})(game);
