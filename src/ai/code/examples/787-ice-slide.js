// 787-ice-slide.js
// アイスライド — 氷の上を滑る石をタップで方向転換、ゴールへ導け
// 操作: タップで石の進行方向を90度回転させる
// 成功: 20回ゴール  失敗: 10回ミス or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020810',
    ice:     '#0e2a4a',
    iceHi:   '#1e4a7a',
    stone:   '#64748b',
    stoneHi: '#94a3b8',
    goal:    '#22c55e',
    goalGlow:'#15803d',
    wall:    '#1e293b',
    wallHi:  '#334155',
    trail:   '#38bdf8',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#040810'
  };

  var GRID = 8; // 8×8 grid
  var CELL = Math.floor(W / (GRID + 2));
  var OFFSET_X = (W - GRID * CELL) / 2;
  var OFFSET_Y = H * 0.18;

  var stoneX = 0, stoneY = 0; // grid coords
  var stoneVX = 1, stoneVY = 0; // direction
  var stonePixX = 0, stonePixY = 0; // pixel position (for animation)
  var sliding = false;
  var slideTimer = 0;
  var SLIDE_SPEED = 10; // cells per second

  var goalX = 0, goalY = 0;
  var walls = []; // [{x, y}]

  var score = 0;
  var NEEDED = 20;
  var missed = 0;
  var MAX_MISS = 10;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var trail = [];
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';

  function cellToPixel(gx, gy) {
    return {
      x: OFFSET_X + gx * CELL + CELL / 2,
      y: OFFSET_Y + gy * CELL + CELL / 2
    };
  }

  function hasWall(gx, gy) {
    if (gx < 0 || gx >= GRID || gy < 0 || gy >= GRID) return true;
    for (var i = 0; i < walls.length; i++) {
      if (walls[i].x === gx && walls[i].y === gy) return true;
    }
    return false;
  }

  function setupLevel() {
    // Random start position (left or top edge)
    var side = Math.floor(Math.random() * 2);
    if (side === 0) { stoneX = 0; stoneY = Math.floor(Math.random() * GRID); stoneVX = 1; stoneVY = 0; }
    else { stoneX = Math.floor(Math.random() * GRID); stoneY = 0; stoneVX = 0; stoneVY = 1; }

    // Goal on opposite side
    if (side === 0) { goalX = GRID - 1; goalY = Math.floor(Math.random() * GRID); }
    else { goalX = Math.floor(Math.random() * GRID); goalY = GRID - 1; }

    // Random walls (2-4)
    walls = [];
    var numWalls = 2 + Math.floor(Math.random() * 3);
    var attempts = 0;
    while (walls.length < numWalls && attempts < 50) {
      attempts++;
      var wx = Math.floor(Math.random() * GRID);
      var wy = Math.floor(Math.random() * GRID);
      if (wx === stoneX && wy === stoneY) continue;
      if (wx === goalX && wy === goalY) continue;
      walls.push({ x: wx, y: wy });
    }

    var pix = cellToPixel(stoneX, stoneY);
    stonePixX = pix.x;
    stonePixY = pix.y;
    sliding = true;
    trail = [];
  }

  function slideStep() {
    var nx = stoneX + stoneVX;
    var ny = stoneY + stoneVY;
    if (hasWall(nx, ny)) {
      // Hit wall or boundary — stop
      sliding = false;
      if (stoneX === goalX && stoneY === goalY) {
        // Already at goal
      } else {
        // Missed — stone stopped not at goal
        missed++;
        flashCol = C.wrong;
        flashAnim = 0.28;
        resultText = '届かない！';
        resultTimer = 0.4;
        game.audio.play('se_failure', 0.3);
        if (missed >= MAX_MISS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        } else {
          setTimeout(function() { if (!done) setupLevel(); }, 700);
        }
      }
      return;
    }
    stoneX = nx;
    stoneY = ny;
    var pix = cellToPixel(stoneX, stoneY);
    trail.push({ x: pix.x, y: pix.y, life: 1.0 });

    if (stoneX === goalX && stoneY === goalY) {
      // Reached goal!
      sliding = false;
      score++;
      flashCol = C.correct;
      flashAnim = 0.22;
      resultText = 'ゴール！';
      resultTimer = 0.4;
      game.audio.play('se_success', 0.65);
      for (var p = 0; p < 8; p++) {
        var pa = Math.random() * Math.PI * 2;
        particles.push({ x: pix.x, y: pix.y, vx: Math.cos(pa) * 160, vy: Math.sin(pa) * 160, life: 0.45, col: C.goal });
      }
      if (score >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 130); }, 700);
        return;
      }
      setTimeout(function() { if (!done) setupLevel(); }, 600);
    }
  }

  game.onTap(function(tx, ty) {
    if (done || !sliding) return;
    // Rotate direction 90 degrees
    var oldVX = stoneVX;
    stoneVX = -stoneVY;
    stoneVY = oldVX;
    game.audio.play('se_tap', 0.07);
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

    // Slide animation
    if (sliding) {
      slideTimer += dt * SLIDE_SPEED;
      if (slideTimer >= 1) {
        slideTimer -= 1;
        slideStep();
      }
      if (sliding) {
        var targetPix = cellToPixel(stoneX + stoneVX, stoneY + stoneVY);
        var curPix = cellToPixel(stoneX, stoneY);
        stonePixX = curPix.x + (targetPix.x - curPix.x) * slideTimer;
        stonePixY = curPix.y + (targetPix.y - curPix.y) * slideTimer;
      }
    }

    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt * 3;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Ice grid
    for (var gx = 0; gx < GRID; gx++) {
      for (var gy2 = 0; gy2 < GRID; gy2++) {
        var px = OFFSET_X + gx * CELL;
        var py = OFFSET_Y + gy2 * CELL;
        var isWall = hasWall(gx, gy2);
        game.draw.rect(px + 2, py + 2, CELL - 4, CELL - 4, isWall ? C.wall : C.ice, 0.8);
        if (!isWall) {
          game.draw.rect(px + 2, py + 2, CELL - 4, 4, C.iceHi, 0.3);
        }
        if (isWall) {
          game.draw.rect(px + 2, py + 2, CELL - 4, 4, C.wallHi, 0.4);
        }
      }
    }

    // Goal
    var gPix = cellToPixel(goalX, goalY);
    game.draw.circle(gPix.x, gPix.y, CELL * 0.38, C.goalGlow, 0.3 + 0.15 * Math.sin(elapsed * 5));
    game.draw.circle(gPix.x, gPix.y, CELL * 0.28, C.goal, 0.9);
    game.draw.text('★', gPix.x, gPix.y + 10, { size: 32, color: '#fff', bold: true });

    // Trail
    for (var tri = 0; tri < trail.length; tri++) {
      game.draw.circle(trail[tri].x, trail[tri].y, CELL * 0.18 * trail[tri].life, C.trail, trail[tri].life * 0.5);
    }

    // Stone
    if (sliding || !done) {
      game.draw.circle(stonePixX + 4, stonePixY + 4, CELL * 0.34, '#000', 0.3);
      game.draw.circle(stonePixX, stonePixY, CELL * 0.34, C.stone, 0.95);
      game.draw.circle(stonePixX - CELL * 0.1, stonePixY - CELL * 0.1, CELL * 0.1, C.stoneHi, 0.5);
      // Direction arrow
      var arrowX = stonePixX + stoneVX * CELL * 0.5;
      var arrowY = stonePixY + stoneVY * CELL * 0.5;
      game.draw.circle(arrowX, arrowY, 8, C.trail, 0.7);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (!done && sliding) {
      game.draw.text('タップで方向転換', W / 2, H * 0.88, { size: 36, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.12, { size: 52, color: flashCol, bold: true });
    }

    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 44 + mi * 88, H * 0.955, 18, mi < missed ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
    setupLevel();
  });
})(game);
