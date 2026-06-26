// 457-shadow-puppet.js
// 影絵合わせ — 画面に映るシルエットと同じ形をスワイプで作る
// 操作: 4方向スワイプで手の形を変える（4肢の向き）
// 成功: 8形を再現  失敗: 5ミス or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0800',
    light:  '#1a1400',
    shadow: '#000',
    target: '#1e1810',
    targetOut:'#3d3020',
    player: '#4a3000',
    playerOut:'#8b6500',
    match:  '#fbbf24',
    matchGlo:'#fef3c7',
    wrong:  '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569',
    lamp:   '#fef08a'
  };

  // Simple silhouette shapes defined as sequences of segment states [up/down/left/right arm positions]
  // Each shape: [head bool, leftArm: -1=down 0=out 1=up, rightArm: -1=down 0=out 1=up, legs: 0=together 1=apart]
  var SHAPES = [
    { name: 'バンザイ', la: 1, ra: 1, legs: 0 },
    { name: '飛行機', la: 0, ra: 0, legs: 1 },
    { name: '片手上げ', la: 1, ra: -1, legs: 0 },
    { name: 'V字', la: -1, ra: -1, legs: 1 },
    { name: 'T字', la: 0, ra: 0, legs: 0 },
    { name: '傾き', la: 1, ra: 0, legs: 1 },
    { name: '立ち', la: -1, ra: -1, legs: 0 },
    { name: 'スター', la: 1, ra: 1, legs: 1 }
  ];

  var targetShape = null;
  var playerState = { la: -1, ra: -1, legs: 0 };
  var matched = false;
  var matchTimer = 0;
  var MATCH_HOLD = 0.6;
  var particles = [];
  var shapeIdx = 0;
  var correct = 0;
  var NEEDED = 8;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;

  function nextShape() {
    shapeIdx = Math.floor(Math.random() * SHAPES.length);
    targetShape = SHAPES[shapeIdx];
    matched = false;
    matchTimer = 0;
  }

  function checkMatch() {
    return playerState.la === targetShape.la &&
           playerState.ra === targetShape.ra &&
           playerState.legs === targetShape.legs;
  }

  function drawFigure(cx, cy, state, col, alpha) {
    var headR = 50;
    // Head
    game.draw.circle(cx, cy - 160, headR, col, alpha);
    // Body
    game.draw.line(cx, cy - 110, cx, cy + 30, col, 24);
    // Left arm
    var laEndX = cx - 120;
    var laEndY = cy - 50;
    if (state.la === 1) laEndY = cy - 120;
    if (state.la === -1) laEndY = cy + 20;
    game.draw.line(cx, cy - 60, laEndX, laEndY, col, 20);
    // Right arm
    var raEndX = cx + 120;
    var raEndY = cy - 50;
    if (state.ra === 1) raEndY = cy - 120;
    if (state.ra === -1) raEndY = cy + 20;
    game.draw.line(cx, cy - 60, raEndX, raEndY, col, 20);
    // Legs
    if (state.legs === 0) {
      game.draw.line(cx, cy + 30, cx - 30, cy + 150, col, 22);
      game.draw.line(cx, cy + 30, cx + 30, cy + 150, col, 22);
    } else {
      game.draw.line(cx, cy + 30, cx - 90, cy + 160, col, 22);
      game.draw.line(cx, cy + 30, cx + 90, cy + 160, col, 22);
    }
  }

  game.onSwipe(function(dir) {
    if (done) return;
    var changed = false;
    if (dir === 'up') {
      if (playerState.la < 1) { playerState.la++; changed = true; }
    } else if (dir === 'down') {
      if (playerState.la > -1) { playerState.la--; changed = true; }
    } else if (dir === 'left') {
      if (playerState.ra < 1) { playerState.ra++; changed = true; }
    } else if (dir === 'right') {
      playerState.legs = playerState.legs === 0 ? 1 : 0;
      changed = true;
    }
    if (changed) game.audio.play('se_tap', 0.3);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_failure', 0.6);
        game.end.failure();
        return;
      }
    }

    if (flashAnim > 0) flashAnim -= dt * 2;

    // Check match
    if (targetShape && checkMatch()) {
      matchTimer += dt;
      if (matchTimer >= MATCH_HOLD && !matched) {
        matched = true;
        correct++;
        flashAnim = 0.8;
        game.audio.play('se_success', 0.7);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: W * 0.75, y: H * 0.45, vx: Math.cos(ang)*160, vy: Math.sin(ang)*160, life: 0.6, col: C.match });
        }
        if (correct >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(correct * 500 + Math.ceil(timeLeft) * 80); }, 700);
          return;
        }
        setTimeout(function() { nextShape(); }, 900);
      }
    } else {
      if (matchTimer > 0.3 && !matched) {
        matchTimer = 0;
      } else if (!checkMatch()) {
        matchTimer = Math.max(0, matchTimer - dt * 3);
      }
    }

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);

    // Lamp glow
    game.draw.circle(W/2, -100, 400, C.lamp, 0.05);
    game.draw.circle(W/2, -100, 250, C.lamp, 0.08);
    game.draw.line(0, H*0.54, W, H*0.54, C.light, 3);

    // Target silhouette (left half)
    if (targetShape) {
      game.draw.circle(W * 0.27, H * 0.24, 200, C.target, 0.6);
      drawFigure(W * 0.27, H * 0.35, targetShape, C.targetOut, 0.8);
      game.draw.text(targetShape.name, W * 0.27, H * 0.56, { size: 34, color: C.ui });
    }

    // Divider
    game.draw.line(W/2, H*0.16, W/2, H*0.62, C.ui, 2);

    // Player shadow (right half)
    game.draw.circle(W * 0.73, H * 0.24, 200, C.light, 0.3);
    drawFigure(W * 0.73, H * 0.35, playerState, C.player, 0.9);
    game.draw.text('あなた', W * 0.73, H * 0.56, { size: 34, color: C.ui });

    // Match progress ring
    if (checkMatch() && matchTimer > 0) {
      var matchRatio = matchTimer / MATCH_HOLD;
      game.draw.circle(W * 0.73, H * 0.35, 200 * matchRatio, C.match, 0.2);
      game.draw.text('合ってる！', W * 0.73, H * 0.28, { size: 40, color: C.match, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.match, flashAnim * 0.1);

    // Controls hint
    game.draw.text('↑↓: 左腕  ←: 右腕  →: 足', W/2, H * 0.88, { size: 32, color: C.ui });

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W/2 - (MAX_MISS-1)*44 + mi*88, H*0.955, 18, mi < misses ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(correct + ' / ' + NEEDED, W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.match : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    nextShape();
  });
})(game);
