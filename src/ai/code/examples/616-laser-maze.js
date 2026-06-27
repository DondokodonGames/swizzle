// 616-laser-maze.js
// レーザーメイズ — レーザーが走るタイミングを見計らって通過せよ
// 操作: タップで一歩進む、レーザーが消えた瞬間を狙え
// 成功: ゴールに到達  失敗: 5回被弾 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#03060a',
    wall:    '#1a2a3a',
    wallHi:  '#2a4a5a',
    laser:   '#ff2222',
    laserHi: '#ff8888',
    player:  '#00e5ff',
    playerHi:'#aaffff',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    hit:     '#ef4444',
    text:    '#f1f5f9',
    ui:      '#0a1828',
    safe:    '#22c55e'
  };

  var COLS = 5;
  var ROWS = 8;
  var CELL_W = W / COLS;
  var CELL_H = (H * 0.75) / ROWS;
  var GRID_OY = H * 0.15;

  // Player starts at bottom center, goal at top center
  var playerC = 2, playerR = ROWS - 1;
  var goalC = 2, goalR = 0;

  // Lasers: horizontal (row) or vertical (col) with on/off timing
  var lasers = [];
  var hits = 0;
  var MAX_HITS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var invincible = 0;
  var moveQueue = [];
  var moveAnim = 0; // 0-1 animation
  var movingFrom = null;
  var movingTo = null;

  function initLasers() {
    lasers = [];
    // Row lasers
    for (var r = 1; r < ROWS - 1; r++) {
      if (r === goalR) continue;
      if (Math.random() < 0.5) {
        lasers.push({
          type: 'row', pos: r,
          period: 1.0 + Math.random() * 1.5,
          phase: Math.random() * Math.PI * 2,
          onFraction: 0.4 + Math.random() * 0.2
        });
      }
    }
    // Col lasers
    for (var c = 0; c < COLS; c++) {
      if (c === goalC) continue;
      if (Math.random() < 0.35) {
        lasers.push({
          type: 'col', pos: c,
          period: 1.2 + Math.random() * 2.0,
          phase: Math.random() * Math.PI * 2,
          onFraction: 0.35 + Math.random() * 0.2
        });
      }
    }
  }

  function isLaserActive(laser) {
    var t = (elapsed + laser.phase) % laser.period;
    return t < laser.period * laser.onFraction;
  }

  function isCellDangerous(r, c) {
    for (var li = 0; li < lasers.length; li++) {
      var l = lasers[li];
      if (!isLaserActive(l)) continue;
      if (l.type === 'row' && l.pos === r) return true;
      if (l.type === 'col' && l.pos === c) return true;
    }
    return false;
  }

  game.onTap(function(tx, ty) {
    if (done || moveAnim > 0) return;
    // Determine target cell from tap
    var tc = Math.floor(tx / CELL_W);
    var tr = Math.floor((ty - GRID_OY) / CELL_H);
    tc = Math.max(0, Math.min(COLS - 1, tc));
    tr = Math.max(0, Math.min(ROWS - 1, tr));

    // Only allow adjacent moves
    var dc = tc - playerC, dr = tr - playerR;
    if (Math.abs(dc) + Math.abs(dr) !== 1) return;

    // Start move animation
    movingFrom = { r: playerR, c: playerC };
    movingTo = { r: tr, c: tc };
    moveAnim = 0;
    game.audio.play('se_tap', 0.2);
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
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (invincible > 0) invincible -= dt;

    // Move animation
    if (movingTo && moveAnim < 1) {
      moveAnim += dt * 6;
      if (moveAnim >= 1) {
        moveAnim = 1;
        playerR = movingTo.r;
        playerC = movingTo.c;
        movingTo = null;
        movingFrom = null;
        moveAnim = 0;

        // Check laser collision
        if (invincible <= 0 && isCellDangerous(playerR, playerC)) {
          hits++;
          invincible = 0.5;
          flashAnim = 0.4;
          game.audio.play('se_failure', 0.5);
          var pCX = CELL_W * playerC + CELL_W / 2;
          var pCY = GRID_OY + CELL_H * playerR + CELL_H / 2;
          for (var p = 0; p < 8; p++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: pCX, y: pCY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.playerHi });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }

        // Check goal
        if (playerR === goalR && playerC === goalC && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          for (var p2 = 0; p2 < 12; p2++) {
            var a2 = Math.random() * Math.PI * 2;
            var gCX = CELL_W * goalC + CELL_W / 2;
            var gCY = GRID_OY + CELL_H * goalR + CELL_H / 2;
            particles.push({ x: gCX, y: gCY, vx: Math.cos(a2) * 250, vy: Math.sin(a2) * 250, life: 0.6, col: C.goalHi });
          }
          setTimeout(function() { game.end.success(MAX_HITS * 200 - hits * 100 + Math.ceil(timeLeft) * 100); }, 800);
        }
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

    // Grid cells
    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var cx = c2 * CELL_W, cy = GRID_OY + r2 * CELL_H;
        var isGoal = r2 === goalR && c2 === goalC;
        var isPlayer = r2 === playerR && c2 === playerC;
        var cellCol = isGoal ? C.goal : C.wall;
        var cellAlpha = isGoal ? 0.4 : 0.5;
        game.draw.rect(cx + 4, cy + 4, CELL_W - 8, CELL_H - 8, cellCol, cellAlpha);
      }
    }

    // Lasers
    for (var li = 0; li < lasers.length; li++) {
      var l = lasers[li];
      var active = isLaserActive(l);
      if (!active) continue;
      var laserAlpha = 0.8 + Math.sin(elapsed * 20) * 0.1;
      if (l.type === 'row') {
        var ly = GRID_OY + l.pos * CELL_H + CELL_H / 2;
        game.draw.line(0, ly, W, ly, C.laserHi, 4);
        game.draw.line(0, ly, W, ly, C.laser, 2);
      } else {
        var lx = l.pos * CELL_W + CELL_W / 2;
        game.draw.line(lx, GRID_OY, lx, GRID_OY + ROWS * CELL_H, C.laserHi, 4);
        game.draw.line(lx, GRID_OY, lx, GRID_OY + ROWS * CELL_H, C.laser, 2);
      }
    }

    // Laser timing indicators (dots on edge)
    for (var li2 = 0; li2 < lasers.length; li2++) {
      var l2 = lasers[li2];
      var active2 = isLaserActive(l2);
      var dotCol = active2 ? C.laser : C.safe;
      if (l2.type === 'row') {
        var dotY = GRID_OY + l2.pos * CELL_H + CELL_H / 2;
        game.draw.circle(18, dotY, 12, dotCol, 0.9);
      } else {
        var dotX = l2.pos * CELL_W + CELL_W / 2;
        game.draw.circle(dotX, GRID_OY - 18, 12, dotCol, 0.9);
      }
    }

    // Goal
    var gX = goalC * CELL_W + CELL_W / 2;
    var gY = GRID_OY + goalR * CELL_H + CELL_H / 2;
    game.draw.circle(gX, gY, CELL_W * 0.3, C.goalHi, 0.4 + Math.sin(elapsed * 3) * 0.1);
    game.draw.circle(gX, gY, CELL_W * 0.18, C.goal, 0.9);

    // Player (with move animation)
    var pX, pY;
    if (movingFrom && movingTo && moveAnim > 0) {
      var t = moveAnim;
      pX = (movingFrom.c * (1 - t) + movingTo.c * t) * CELL_W + CELL_W / 2;
      pY = GRID_OY + (movingFrom.r * (1 - t) + movingTo.r * t) * CELL_H + CELL_H / 2;
    } else {
      pX = playerC * CELL_W + CELL_W / 2;
      pY = GRID_OY + playerR * CELL_H + CELL_H / 2;
    }
    var pAlpha = (invincible > 0 && Math.floor(elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    game.draw.circle(pX, pY, CELL_W * 0.3, C.player, pAlpha);
    game.draw.circle(pX - 8, pY - 8, CELL_W * 0.1, C.playerHi, pAlpha * 0.6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p3 = particles[pp2];
      game.draw.circle(p3.x, p3.y, 10 * p3.life, p3.col, p3.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.1);

    // Hit dots
    for (var hi2 = 0; hi2 < MAX_HITS; hi2++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 52 + hi2 * 104, H * 0.955, 22, hi2 < hits ? C.hit : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.player : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('ゴールへ!', W / 2, 80, { size: 32, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.05);
    initLasers();
  });
})(game);
