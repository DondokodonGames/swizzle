// 301-ice-skate.js
// 氷上の演技 — 惰性で滑るスケーターを壁にぶつけずにゴールへ誘導
// 操作: タップで進行方向を90度ずつ変える
// 成功: 10ゴール到達  失敗: 壁に3回衝突 or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020c1a',
    ice:    '#0c2a4a',
    iceHi:  '#0e3a66',
    wall:   '#1e4074',
    wallHi: '#2d5fa8',
    skater: '#f1f5f9',
    skaterHi:'#e2e8f0',
    trail:  '#60a5fa',
    trailHi:'#93c5fd',
    goal:   '#22c55e',
    goalHi: '#86efac',
    danger: '#ef4444',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var GRID = 9;
  var CELL = Math.floor(W * 0.82 / GRID);
  var OX = Math.floor((W - CELL * GRID) / 2);
  var OY = Math.floor(H * 0.18);

  var skaterGX = 0, skaterGY = 0; // grid position
  var skaterX = 0, skaterY = 0;   // pixel position
  var dirX = 1, dirY = 0; // current direction
  var moving = false;
  var speed = 10; // cells per second

  var goalGX = 0, goalGY = 0;
  var goalX = 0, goalY = 0;
  var goalPulse = 0;

  var scored = 0;
  var NEEDED = 10;
  var hits = 0;
  var MAX_HIT = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var trail = []; // {x,y,alpha}
  var particles = [];
  var hitFlash = 0;

  function gridToPixel(gx, gy) {
    return { x: OX + gx * CELL + CELL / 2, y: OY + gy * CELL + CELL / 2 };
  }

  function placeGoal() {
    do {
      goalGX = Math.floor(Math.random() * GRID);
      goalGY = Math.floor(Math.random() * GRID);
    } while (Math.abs(goalGX - skaterGX) < 2 && Math.abs(goalGY - skaterGY) < 2);
    var gp = gridToPixel(goalGX, goalGY);
    goalX = gp.x;
    goalY = gp.y;
  }

  function newRound() {
    skaterGX = Math.floor(GRID / 2);
    skaterGY = GRID - 1;
    var sp = gridToPixel(skaterGX, skaterGY);
    skaterX = sp.x;
    skaterY = sp.y;
    dirX = 0; dirY = -1; // start moving up
    moving = true;
    trail = [];
    placeGoal();
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!moving) return;
    // Rotate direction 90 degrees (clockwise)
    var newDX = -dirY;
    var newDY = dirX;
    dirX = newDX;
    dirY = newDY;
    game.audio.play('se_tap', 0.2);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (hitFlash > 0) hitFlash -= dt;
    goalPulse += dt * 3;

    if (moving && !done) {
      // Move skater
      var moveSpeed = CELL * speed;
      var nextX = skaterX + dirX * moveSpeed * dt;
      var nextY = skaterY + dirY * moveSpeed * dt;

      // Calculate grid position continuously
      var gx = (skaterX - OX - CELL / 2) / CELL;
      var gy = (skaterY - OY - CELL / 2) / CELL;

      // Check if would go out of bounds
      var nextGX = Math.round((nextX - OX - CELL / 2) / CELL);
      var nextGY = Math.round((nextY - OY - CELL / 2) / CELL);

      if (nextGX < 0 || nextGX >= GRID || nextGY < 0 || nextGY >= GRID) {
        // Hit wall — bounce back slightly and stop
        hits++;
        hitFlash = 0.4;
        game.audio.play('se_failure', 0.5);
        for (var fi = 0; fi < 8; fi++) {
          var fang = Math.random() * Math.PI * 2;
          particles.push({ x: skaterX, y: skaterY, vx: Math.cos(fang) * 200, vy: Math.sin(fang) * 200, life: 0.5, col: C.danger });
        }
        // Reverse
        dirX = -dirX; dirY = -dirY;
        skaterX += dirX * CELL * 0.3;
        skaterY += dirY * CELL * 0.3;
        if (hits >= MAX_HIT && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      } else {
        skaterX = nextX;
        skaterY = nextY;
        skaterGX = Math.round((skaterX - OX - CELL / 2) / CELL);
        skaterGY = Math.round((skaterY - OY - CELL / 2) / CELL);
      }

      // Trail
      trail.push({ x: skaterX, y: skaterY, alpha: 0.7 });
      if (trail.length > 30) trail.shift();

      // Check goal
      if (Math.abs(skaterX - goalX) < CELL * 0.6 && Math.abs(skaterY - goalY) < CELL * 0.6) {
        scored++;
        game.audio.play('se_success', 0.5);
        for (var pi = 0; pi < 10; pi++) {
          var pang = Math.random() * Math.PI * 2;
          particles.push({ x: goalX, y: goalY, vx: Math.cos(pang) * 250, vy: Math.sin(pang) * 250, life: 0.6, col: C.goalHi });
        }
        if (scored >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(scored * 300 + Math.ceil(timeLeft) * 120); }, 400);
          return;
        }
        placeGoal();
      }
    }

    // Fade trail
    for (var ti = 0; ti < trail.length; ti++) {
      trail[ti].alpha -= dt * 2;
    }
    trail = trail.filter(function(t) { return t.alpha > 0; });

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ice grid
    for (var gx2 = 0; gx2 < GRID; gx2++) {
      for (var gy2 = 0; gy2 < GRID; gy2++) {
        var cx2 = OX + gx2 * CELL;
        var cy2 = OY + gy2 * CELL;
        game.draw.rect(cx2 + 2, cy2 + 2, CELL - 4, CELL - 4, C.ice, 0.7);
        game.draw.rect(cx2 + 2, cy2 + 2, CELL - 4, 4, C.iceHi, 0.3);
      }
    }

    // Walls
    game.draw.rect(OX - 16, OY - 16, GRID * CELL + 32, 16, C.wallHi, 0.9);
    game.draw.rect(OX - 16, OY + GRID * CELL, GRID * CELL + 32, 16, C.wallHi, 0.9);
    game.draw.rect(OX - 16, OY - 16, 16, GRID * CELL + 32, C.wallHi, 0.9);
    game.draw.rect(OX + GRID * CELL, OY - 16, 16, GRID * CELL + 32, C.wallHi, 0.9);

    // Hit flash
    if (hitFlash > 0) {
      game.draw.rect(OX, OY, GRID * CELL, GRID * CELL, C.danger, hitFlash * 0.3);
    }

    // Trail
    for (var ti2 = 0; ti2 < trail.length; ti2++) {
      var t2 = trail[ti2];
      game.draw.circle(t2.x, t2.y, 12 * t2.alpha, C.trail, t2.alpha * 0.6);
    }

    // Goal
    var gPulse = 3 * Math.sin(goalPulse);
    game.draw.circle(goalX, goalY, 30 + gPulse + 10, C.goal, 0.15);
    game.draw.circle(goalX, goalY, 30 + gPulse, C.goal, 0.9);
    game.draw.circle(goalX, goalY, 18, C.goalHi, 0.7);
    game.draw.text('★', goalX, goalY + 10, { size: 28, color: '#fff', bold: true });

    // Skater
    var sk = 20;
    game.draw.circle(skaterX, skaterY - sk * 1.5, sk, C.skaterHi, 0.9); // head
    game.draw.line(skaterX, skaterY - sk, skaterX, skaterY + sk, C.skater, 10); // body
    // Direction indicator
    game.draw.line(skaterX, skaterY, skaterX + dirX * 40, skaterY + dirY * 40, C.trailHi, 6);
    game.draw.circle(skaterX + dirX * 45, skaterY + dirY * 45, 8, C.trailHi, 0.8);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    game.draw.text('タップで方向転換', W / 2, H * 0.88, { size: 38, color: C.ui });
    game.draw.text(scored + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    for (var hi = 0; hi < MAX_HIT; hi++) {
      game.draw.circle(W / 2 - (MAX_HIT - 1) * 28 + hi * 56, H * 0.93, 16, hi < hits ? C.danger : '#020c1a');
    }

    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.trailHi : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    newRound();
  });
})(game);
