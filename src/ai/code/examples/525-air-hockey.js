// 525-air-hockey.js
// エアホッケー — 縦型コート、スワイプでパックを打って相手ゴールに入れる
// 操作: 自陣エリアをスワイプでマレットを操作
// 成功: 5点先取  失敗: 相手が5点 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#080818',
    court:   '#0a1030',
    courtHi: '#0d1a44',
    line:    '#1e3a6a',
    puck:    '#f1f5f9',
    puckHi:  '#ffffff',
    mallet:  '#f59e0b',
    malletHi:'#fde68a',
    cpu:     '#ef4444',
    cpuHi:   '#fca5a5',
    goal:    '#22c55e',
    goalBg:  '#052010',
    text:    '#f1f5f9',
    ui:      '#374151'
  };

  var COURT_X = 60, COURT_Y = 80, COURT_W = W - 120, COURT_H = H - 160;
  var GOAL_W = 320;
  var GOAL_OX = (W - GOAL_W) / 2;
  var PUCK_R = 50;
  var MALLET_R = 70;
  var DIVIDER_Y = COURT_Y + COURT_H / 2;

  var puck = { x: W / 2, y: H / 2, vx: 200, vy: -300 };
  var mallet = { x: W / 2, y: COURT_Y + COURT_H * 0.75 };
  var cpu = { x: W / 2, y: COURT_Y + COURT_H * 0.25 };
  var playerScore = 0;
  var cpuScore = 0;
  var NEEDED = 5;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;
  var particles = [];
  var lastTouchX = W / 2, lastTouchY = H * 0.75;
  var goalAnim = 0;
  var goalCol = C.goal;
  var resetting = false;
  var resetTimer = 0;

  function resetPuck(dir) {
    puck.x = W / 2;
    puck.y = H / 2;
    puck.vx = (Math.random() - 0.5) * 300;
    puck.vy = dir * 400;
    resetting = false;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (ty > DIVIDER_Y) {
      lastTouchX = tx;
      lastTouchY = ty;
      mallet.x = tx;
      mallet.y = Math.max(DIVIDER_Y + MALLET_R, Math.min(COURT_Y + COURT_H - MALLET_R, ty));
    }
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (y1 > DIVIDER_Y || y2 > DIVIDER_Y) {
      var targetX = x2;
      var targetY = Math.max(DIVIDER_Y + MALLET_R, Math.min(COURT_Y + COURT_H - MALLET_R, y2));
      // Apply velocity to mallet based on swipe
      var svx = (x2 - x1) * 4;
      var svy = (y2 - y1) * 4;
      mallet.x = targetX;
      mallet.y = targetY;
      // If near puck, transfer velocity
      var dx = puck.x - mallet.x, dy = puck.y - mallet.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PUCK_R + MALLET_R + 40) {
        var nx = dx / dist, ny = dy / dist;
        puck.vx = nx * 800 + svx * 0.3;
        puck.vy = ny * 800 + svy * 0.3;
        game.audio.play('se_tap', 0.5);
      }
    }
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

    if (goalAnim > 0) goalAnim -= dt * 2;

    if (resetting) {
      resetTimer -= dt;
      if (resetTimer <= 0) resetPuck(Math.random() < 0.5 ? 1 : -1);
    }

    if (!resetting) {
      // Puck physics
      puck.x += puck.vx * dt;
      puck.y += puck.vy * dt;

      // Wall bounces
      if (puck.x - PUCK_R < COURT_X) { puck.x = COURT_X + PUCK_R; puck.vx = Math.abs(puck.vx) * 0.85; game.audio.play('se_tap', 0.2); }
      if (puck.x + PUCK_R > COURT_X + COURT_W) { puck.x = COURT_X + COURT_W - PUCK_R; puck.vx = -Math.abs(puck.vx) * 0.85; game.audio.play('se_tap', 0.2); }

      // Goal check (top = CPU scores, bottom = player scores)
      if (puck.y - PUCK_R < COURT_Y) {
        if (puck.x > GOAL_OX && puck.x < GOAL_OX + GOAL_W) {
          // CPU scores
          cpuScore++;
          goalAnim = 1.0;
          goalCol = C.cpu;
          game.audio.play('se_failure', 0.6);
          for (var pi = 0; pi < 12; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: puck.x, y: puck.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.cpu });
          }
          if (cpuScore >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 700);
          } else {
            resetting = true; resetTimer = 1.5;
          }
        } else {
          puck.y = COURT_Y + PUCK_R; puck.vy = Math.abs(puck.vy) * 0.85;
        }
      }
      if (puck.y + PUCK_R > COURT_Y + COURT_H) {
        if (puck.x > GOAL_OX && puck.x < GOAL_OX + GOAL_W) {
          // Player scores
          playerScore++;
          goalAnim = 1.0;
          goalCol = C.goal;
          game.audio.play('se_success', 0.8);
          for (var pi2 = 0; pi2 < 12; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: puck.x, y: puck.y, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200, life: 0.5, col: C.goal });
          }
          if (playerScore >= NEEDED && !done) {
            done = true;
            game.audio.play('se_success', 0.9);
            setTimeout(function() { game.end.success(playerScore * 500 + Math.ceil(timeLeft) * 100); }, 700);
          } else {
            resetting = true; resetTimer = 1.5;
          }
        } else {
          puck.y = COURT_Y + COURT_H - PUCK_R; puck.vy = -Math.abs(puck.vy) * 0.85;
        }
      }

      // Friction
      puck.vx *= 0.998;
      puck.vy *= 0.998;
      var speed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
      if (speed > 1200) { puck.vx = puck.vx / speed * 1200; puck.vy = puck.vy / speed * 1200; }
      if (speed < 50 && !resetting) { puck.vx += (Math.random() - 0.5) * 100; puck.vy += (Math.random() - 0.5) * 100; }

      // Mallet collision
      var dm = Math.sqrt(Math.pow(puck.x - mallet.x, 2) + Math.pow(puck.y - mallet.y, 2));
      if (dm < PUCK_R + MALLET_R) {
        var nx = (puck.x - mallet.x) / dm, ny = (puck.y - mallet.y) / dm;
        puck.x = mallet.x + nx * (PUCK_R + MALLET_R);
        puck.y = mallet.y + ny * (PUCK_R + MALLET_R);
        var relV = (puck.vx - 0) * nx + (puck.vy - 0) * ny;
        puck.vx -= 2 * relV * nx;
        puck.vy -= 2 * relV * ny;
        var hitSpeed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
        if (hitSpeed < 600) { puck.vx = nx * 600; puck.vy = ny * 600; }
        game.audio.play('se_tap', 0.4);
      }

      // CPU AI
      var cpuTarget = puck.y < DIVIDER_Y ? puck.x : W / 2;
      cpu.x += (cpuTarget - cpu.x) * Math.min(1, dt * 3);
      cpu.y = COURT_Y + COURT_H * 0.22;
      var dc = Math.sqrt(Math.pow(puck.x - cpu.x, 2) + Math.pow(puck.y - cpu.y, 2));
      if (dc < PUCK_R + MALLET_R) {
        var ncx = (puck.x - cpu.x) / dc, ncy = (puck.y - cpu.y) / dc;
        puck.x = cpu.x + ncx * (PUCK_R + MALLET_R);
        puck.y = cpu.y + ncy * (PUCK_R + MALLET_R);
        puck.vx = ncx * 700;
        puck.vy = ncy * 700;
        game.audio.play('se_tap', 0.3);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(COURT_X, COURT_Y, COURT_W, COURT_H, C.court, 0.9);

    // Center line
    game.draw.line(COURT_X, DIVIDER_Y, COURT_X + COURT_W, DIVIDER_Y, C.line, 4);
    game.draw.circle(W / 2, DIVIDER_Y, 120, C.line, 0.4);
    game.draw.circle(W / 2, DIVIDER_Y, 120, '#fff', 0.05);

    // Goals
    game.draw.rect(GOAL_OX, COURT_Y - 20, GOAL_W, 24, C.cpu, 0.6);
    game.draw.rect(GOAL_OX, COURT_Y + COURT_H - 4, GOAL_W, 24, C.goal, 0.6);

    // Court border
    game.draw.line(COURT_X, COURT_Y, COURT_X + COURT_W, COURT_Y, C.line, 4);
    game.draw.line(COURT_X, COURT_Y + COURT_H, COURT_X + COURT_W, COURT_Y + COURT_H, C.line, 4);
    game.draw.line(COURT_X, COURT_Y, COURT_X, COURT_Y + COURT_H, C.line, 4);
    game.draw.line(COURT_X + COURT_W, COURT_Y, COURT_X + COURT_W, COURT_Y + COURT_H, C.line, 4);

    // CPU mallet
    game.draw.circle(cpu.x, cpu.y, MALLET_R + 6, C.cpuHi, 0.3);
    game.draw.circle(cpu.x, cpu.y, MALLET_R, C.cpu, 0.9);
    game.draw.circle(cpu.x, cpu.y, 24, C.cpuHi, 0.8);

    // Player mallet
    game.draw.circle(mallet.x, mallet.y, MALLET_R + 6, C.malletHi, 0.3);
    game.draw.circle(mallet.x, mallet.y, MALLET_R, C.mallet, 0.9);
    game.draw.circle(mallet.x, mallet.y, 24, C.malletHi, 0.8);

    // Puck
    if (!resetting) {
      game.draw.circle(puck.x, puck.y, PUCK_R + 4, '#888', 0.3);
      game.draw.circle(puck.x, puck.y, PUCK_R, C.puck, 0.95);
      game.draw.circle(puck.x - PUCK_R * 0.2, puck.y - PUCK_R * 0.2, PUCK_R * 0.25, C.puckHi, 0.5);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 14 * p.life, p.col, p.life * 0.8);
    }

    if (goalAnim > 0) game.draw.rect(0, 0, W, H, goalCol, goalAnim * 0.12);

    // Score
    game.draw.text(cpuScore + '', W / 2, COURT_Y + 80, { size: 80, color: C.cpu, bold: true });
    game.draw.text(playerScore + '', W / 2, COURT_Y + COURT_H - 80, { size: 80, color: C.goal, bold: true });

    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.mallet : C.cpu);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.08);
    resetPuck(1);
  });
})(game);
