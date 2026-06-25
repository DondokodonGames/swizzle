// 160-ice-slide.js
// 氷上スライド — 摩擦のない氷の上でパックを操り、ゴールに滑り込ませる精密さ
// 操作: スワイプで押す方向と強さを決める
// 成功: 8ゴール  失敗: 5回外す or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040c18',
    ice:     '#0c2a40',
    iceHi:   '#164e63',
    puck:    '#94a3b8',
    puckHi:  '#e2e8f0',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    wall:    '#1e3a5f',
    wallHi:  '#2563eb',
    danger:  '#ef4444',
    ui:      '#334155'
  };

  var ICE_X = 80;
  var ICE_Y = H * 0.15;
  var ICE_W = W - 160;
  var ICE_H = H * 0.65;

  var GOAL_W = 120;
  var GOAL_H = 36;
  var goalX, goalY;

  var PUCK_R = 36;
  var puckX = ICE_X + ICE_W / 2;
  var puckY = ICE_Y + ICE_H * 0.75;
  var pvx = 0, pvy = 0;
  var FRICTION = 0.985; // Very low friction (ice!)
  var puckMoving = false;
  var swipeStart = null;

  var score = 0;
  var needed = 8;
  var misses = 0;
  var maxMisses = 5;
  var timeLeft = 50;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];

  function placeGoal() {
    var margin = 80;
    // Goals on any wall: top, left, right
    var side = Math.floor(Math.random() * 3);
    if (side === 0) { // top
      goalX = ICE_X + margin + Math.random() * (ICE_W - margin * 2 - GOAL_W);
      goalY = ICE_Y - GOAL_H / 2;
    } else if (side === 1) { // left
      goalX = ICE_X - GOAL_H / 2;
      goalY = ICE_Y + margin + Math.random() * (ICE_H - margin * 2 - GOAL_W);
    } else { // right
      goalX = ICE_X + ICE_W - GOAL_H / 2;
      goalY = ICE_Y + margin + Math.random() * (ICE_H - margin * 2 - GOAL_W);
    }
  }

  function resetPuck() {
    puckX = ICE_X + ICE_W / 2 + (Math.random() - 0.5) * 200;
    puckY = ICE_Y + ICE_H * 0.72 + (Math.random() - 0.5) * 100;
    pvx = 0; pvy = 0;
    puckMoving = false;
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || puckMoving) return;
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 20) return;
    var power = Math.min(len * 2.5, 900);
    pvx = (dx / len) * power;
    pvy = (dy / len) * power;
    puckMoving = true;
    game.audio.play('se_tap', 0.5);
  });

  game.onTap(function(tx, ty) {
    if (done || puckMoving) return;
    // Tap to aim from puck toward tap point
    var dx = tx - puckX, dy = ty - puckY;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len < 10) return;
    var power = Math.min(len * 1.8, 800);
    pvx = (dx / len) * power;
    pvy = (dy / len) * power;
    puckMoving = true;
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    if (puckMoving) {
      pvx *= Math.pow(FRICTION, dt * 60);
      pvy *= Math.pow(FRICTION, dt * 60);
      puckX += pvx * dt;
      puckY += pvy * dt;

      // Wall bounces
      if (puckX - PUCK_R < ICE_X) { puckX = ICE_X + PUCK_R; pvx = Math.abs(pvx) * 0.8; game.audio.play('se_tap', 0.1); }
      if (puckX + PUCK_R > ICE_X + ICE_W) { puckX = ICE_X + ICE_W - PUCK_R; pvx = -Math.abs(pvx) * 0.8; game.audio.play('se_tap', 0.1); }
      if (puckY - PUCK_R < ICE_Y) { puckY = ICE_Y + PUCK_R; pvy = Math.abs(pvy) * 0.8; game.audio.play('se_tap', 0.1); }
      if (puckY + PUCK_R > ICE_Y + ICE_H) {
        // Bottom = miss
        puckY = ICE_Y + ICE_H - PUCK_R; pvy = 0; pvx = 0;
        puckMoving = false;
        misses++;
        feedbackOk = false; feedback = 0.4;
        game.audio.play('se_failure', 0.5);
        if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 400); return; }
        setTimeout(function() { resetPuck(); }, 500);
      }

      // Goal check
      var isHoriz = (goalY < ICE_Y + 10 || goalY > ICE_Y + ICE_H - 10);
      var gCX = goalX + (isHoriz ? GOAL_W / 2 : GOAL_H / 2);
      var gCY = goalY + (isHoriz ? GOAL_H / 2 : GOAL_W / 2);
      var distGoal = Math.sqrt((puckX - gCX) * (puckX - gCX) + (puckY - gCY) * (puckY - gCY));
      if (distGoal < PUCK_R + Math.max(GOAL_W, GOAL_H) / 2 - 20) {
        // Scored!
        score++;
        feedbackOk = true; feedback = 0.4;
        game.audio.play('se_success', 0.9);
        for (var pi = 0; pi < 12; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: puckX, y: puckY, vx: Math.cos(ang) * 260, vy: Math.sin(ang) * 260, life: 0.5 });
        }
        pvx = 0; pvy = 0; puckMoving = false;
        placeGoal();
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 70 + Math.ceil(timeLeft) * 25); }, 400);
          return;
        }
        setTimeout(function() { resetPuck(); }, 400);
      }

      // Stop when very slow
      if (Math.abs(pvx) < 8 && Math.abs(pvy) < 8) {
        pvx = 0; pvy = 0; puckMoving = false;
        if (!done) {
          misses++;
          feedbackOk = false; feedback = 0.35;
          game.audio.play('se_failure', 0.4);
          if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 400); return; }
          setTimeout(function() { resetPuck(); }, 400);
        }
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 200 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ice surface
    game.draw.rect(ICE_X, ICE_Y, ICE_W, ICE_H, C.ice, 0.9);
    // Ice grid lines
    for (var ix = 0; ix < 5; ix++) {
      game.draw.line(ICE_X + ix * ICE_W / 4, ICE_Y, ICE_X + ix * ICE_W / 4, ICE_Y + ICE_H, C.iceHi, 1);
    }
    for (var iy = 0; iy < 5; iy++) {
      game.draw.line(ICE_X, ICE_Y + iy * ICE_H / 4, ICE_X + ICE_W, ICE_Y + iy * ICE_H / 4, C.iceHi, 1);
    }
    // Ice border
    game.draw.rect(ICE_X, ICE_Y, ICE_W, 8, C.wallHi, 0.8);
    game.draw.rect(ICE_X, ICE_Y + ICE_H - 8, ICE_W, 8, C.wallHi, 0.8);
    game.draw.rect(ICE_X, ICE_Y, 8, ICE_H, C.wallHi, 0.8);
    game.draw.rect(ICE_X + ICE_W - 8, ICE_Y, 8, ICE_H, C.wallHi, 0.8);

    // Goal
    var isHoriz2 = (goalY < ICE_Y + 10 || goalY > ICE_Y + ICE_H - 10);
    var gW = isHoriz2 ? GOAL_W : GOAL_H;
    var gH = isHoriz2 ? GOAL_H : GOAL_W;
    game.draw.rect(goalX, goalY, gW, gH, C.goalHi, 0.3);
    game.draw.rect(goalX, goalY, gW, gH, C.goal, 0.7);
    game.draw.text('GOAL', goalX + gW / 2, goalY + gH / 2, { size: 30, color: '#fff', bold: true });

    // Aim guide (when not moving)
    if (!puckMoving) {
      var gCX2 = goalX + gW / 2;
      var gCY2 = goalY + gH / 2;
      var aimDx = gCX2 - puckX, aimDy = gCY2 - puckY;
      var aimLen = Math.sqrt(aimDx * aimDx + aimDy * aimDy);
      game.draw.line(puckX, puckY, puckX + (aimDx / aimLen) * 120, puckY + (aimDy / aimLen) * 120, C.goalHi, 3);
    }

    // Puck
    game.draw.circle(puckX + 6, puckY + 6, PUCK_R, '#000', 0.4);
    game.draw.circle(puckX, puckY, PUCK_R + 6, C.puckHi, 0.15);
    game.draw.circle(puckX, puckY, PUCK_R, C.puck, 0.95);
    game.draw.circle(puckX - PUCK_R * 0.3, puckY - PUCK_R * 0.3, PUCK_R * 0.2, '#fff', 0.5);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 10 * part.life * 2, C.goal, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.goal : C.danger, feedback * 0.12);
    }

    if (!puckMoving) game.draw.text('スワイプorタップで蹴る', W / 2, H * 0.87, { size: 38, color: C.ui });

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 + (mi - 2) * 52, 218, 18, mi < misses ? C.danger : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.iceHi : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    placeGoal();
  });
})(game);
