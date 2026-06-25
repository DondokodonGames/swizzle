// 183-rope-cut.js
// ロープカット — ぶら下がるボムが揺れている、正しいロープを切って目標に届かせる
// 操作: スワイプでロープを切る
// 成功: 10個のボムをゴールに届ける  失敗: 7個外す or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#060810',
    rope:    '#92400e',
    ropeHi:  '#d97706',
    bomb:    '#1f2937',
    bombHi:  '#4b5563',
    fuse:    '#ef4444',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    wrong:   '#ef4444',
    ui:      '#334155'
  };

  var GOAL_X = W / 2;
  var GOAL_Y = H * 0.75;
  var GOAL_R = 80;

  var score = 0;
  var needed = 10;
  var misses = 0;
  var maxMisses = 7;
  var done = false;
  var timeLeft = 50;
  var feedback = 0;
  var feedbackOk = false;
  var particles = [];
  var elapsed = 0;

  // Bomb with rope physics
  var ropes = [];
  var ROPE_SEGMENTS = 1; // simple pendulum
  var ROPE_ANCHOR_X = W / 2;
  var ROPE_ANCHOR_Y = H * 0.08;
  var ROPE_LEN = 340;

  function resetBomb() {
    var startAngle = (Math.random() - 0.5) * Math.PI * 0.5;
    ropes = [{
      anchorX: ROPE_ANCHOR_X,
      anchorY: ROPE_ANCHOR_Y,
      len: ROPE_LEN,
      angle: startAngle,
      avel: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random()),
      cut: false,
      // ball attached at end
      bx: 0, by: 0,
      falling: false,
      vx: 0, vy: 0
    }];
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    // Check if swipe crosses rope
    for (var ri = 0; ri < ropes.length; ri++) {
      var r = ropes[ri];
      if (r.falling || r.cut) continue;
      // Rope line: from anchor to ball
      var rx1 = r.anchorX, ry1 = r.anchorY;
      var rx2 = r.bx, ry2 = r.by;
      // Line-line intersection
      var d = (x2 - x1) * (ry2 - ry1) - (y2 - y1) * (rx2 - rx1);
      if (Math.abs(d) < 0.001) continue;
      var t = ((rx1 - x1) * (ry2 - ry1) - (ry1 - y1) * (rx2 - rx1)) / d;
      var s = ((rx1 - x1) * (y2 - y1) - (ry1 - y1) * (x2 - x1)) / d;
      if (t >= 0 && t <= 1 && s >= 0 && s <= 1) {
        r.cut = true;
        r.falling = true;
        r.vx = r.avel * r.len * 0.3;
        r.vy = 0;
        game.audio.play('se_tap', 0.7);
        return;
      }
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    for (var ri = 0; ri < ropes.length; ri++) {
      var r = ropes[ri];
      if (r.falling || r.cut) continue;
      var dx = tx - r.bx, dy = ty - r.by;
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        r.cut = true;
        r.falling = true;
        r.vx = r.avel * r.len * 0.3;
        r.vy = 0;
        game.audio.play('se_tap', 0.7);
        return;
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;

    for (var ri = 0; ri < ropes.length; ri++) {
      var r = ropes[ri];
      if (!r.falling) {
        // Pendulum physics
        var gravity = 9.8 * 3.5;
        r.avel += (-gravity / r.len) * Math.sin(r.angle) * dt;
        r.avel *= 0.995;
        r.angle += r.avel * dt;
        r.bx = r.anchorX + Math.sin(r.angle) * r.len;
        r.by = r.anchorY + Math.cos(r.angle) * r.len;
      } else {
        r.vy += 1200 * dt;
        r.bx += r.vx * dt;
        r.by += r.vy * dt;

        var dx2 = r.bx - GOAL_X, dy2 = r.by - GOAL_Y;
        if (Math.sqrt(dx2 * dx2 + dy2 * dy2) < GOAL_R + 30) {
          score++;
          feedbackOk = true; feedback = 0.4;
          game.audio.play('se_success', 0.9);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: GOAL_X, y: GOAL_Y, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.5 });
          }
          ropes.splice(ri, 1); ri--;
          if (score >= needed && !done) {
            done = true;
            setTimeout(function() { game.end.success(score * 100 + Math.ceil(timeLeft) * 30); }, 400);
          } else {
            setTimeout(resetBomb, 300);
          }
        } else if (r.by > H + 50 || r.bx < -50 || r.bx > W + 50) {
          misses++;
          feedbackOk = false; feedback = 0.4;
          game.audio.play('se_failure', 0.4);
          ropes.splice(ri, 1); ri--;
          if (misses >= maxMisses && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 400);
          } else {
            setTimeout(resetBomb, 300);
          }
        }
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 400 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Goal
    var goalPulse = 0.6 + 0.4 * Math.abs(Math.sin(elapsed * 2));
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R + 20, C.goalHi, goalPulse * 0.15);
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R, C.goal, 0.8);
    game.draw.circle(GOAL_X, GOAL_Y, GOAL_R * 0.5, C.goalHi, 0.5);
    game.draw.text('★', GOAL_X, GOAL_Y, { size: 72, color: '#fff', bold: true });

    // Ropes + bombs
    for (var ri2 = 0; ri2 < ropes.length; ri2++) {
      var r2 = ropes[ri2];
      if (!r2.falling) {
        game.draw.line(r2.anchorX, r2.anchorY, r2.bx, r2.by, C.rope, 8);
        game.draw.line(r2.anchorX, r2.anchorY, r2.bx, r2.by, C.ropeHi, 3);
        game.draw.circle(r2.anchorX, r2.anchorY, 16, C.ropeHi, 0.9);
      }
      // Bomb
      game.draw.circle(r2.bx, r2.by, 40, C.bombHi, 0.3);
      game.draw.circle(r2.bx, r2.by, 36, C.bomb, 0.95);
      // Fuse
      game.draw.line(r2.bx, r2.by - 36, r2.bx + 12, r2.by - 56, C.ropeHi, 5);
      game.draw.circle(r2.bx + 12, r2.by - 56, 8, C.fuse, Math.abs(Math.sin(elapsed * 8)) * 0.8 + 0.2);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 12 * part.life * 2, C.goal, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.goal : C.wrong, feedback * 0.1);
    }

    game.draw.text('スワイプでロープを切る', W / 2, H * 0.88, { size: 38, color: C.ui });
    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W * 0.1 + mi * 44, 218, 15, mi < misses ? C.wrong : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.goal : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
    resetBomb();
  });
})(game);
