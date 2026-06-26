// 360-magma-surf.js
// マグマサーフ — 溶岩の波に乗って漂流物を避けながらサーフィン
// 操作: タップで位置を左右に変える（3レーン）
// 成功: 30秒生き残る  失敗: 障害物に当たる3回 or 時間切れ

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0d0200',
    lava1:  '#dc2626',
    lava2:  '#ea580c',
    lava3:  '#f97316',
    lavaHi: '#fbbf24',
    rock:   '#44403c',
    rockHi: '#57534e',
    boarder:'#fde68a',
    boarderHi:'#fff',
    board:  '#1d4ed8',
    boardHi:'#3b82f6',
    danger: '#ef4444',
    ui:     '#78716c',
    text:   '#fef3c7'
  };

  var LANES = 3;
  var LANE_W = W / LANES;
  var lane = 1; // 0=left, 1=center, 2=right
  var targetLaneX = LANE_W * (lane + 0.5);
  var boardX = targetLaneX;
  var boardY = H * 0.7;

  var obstacles = [];
  var surfTime = 0;
  var GOAL_TIME = 30;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var spawnTimer = 0;
  var particles = [];
  var lavaWave = 0;
  var invincible = 0;
  var combo = 0;
  var lastLane = 1;
  var dodgeAnim = 0;

  function spawnObstacle() {
    var obsLane = Math.floor(Math.random() * LANES);
    obstacles.push({
      x: LANE_W * (obsLane + 0.5),
      y: -80,
      lane: obsLane,
      speed: 300 + Math.random() * 200 + elapsed * 4,
      r: 40 + Math.random() * 20
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 3) {
      lane = 0;
    } else if (tx < W * 2 / 3) {
      lane = 1;
    } else {
      lane = 2;
    }
    targetLaneX = LANE_W * (lane + 0.5);
    game.audio.play('se_tap', 0.2);
  });

  game.onSwipe(function(dir2) {
    if (done) return;
    if (dir2 === 'left' && lane > 0) { lane--; targetLaneX = LANE_W * (lane + 0.5); game.audio.play('se_tap', 0.2); }
    if (dir2 === 'right' && lane < 2) { lane++; targetLaneX = LANE_W * (lane + 0.5); game.audio.play('se_tap', 0.2); }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      surfTime += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
      if (surfTime >= GOAL_TIME && !done) {
        done = true;
        game.audio.play('se_success', 0.8);
        setTimeout(function() { game.end.success(Math.round(surfTime * 200) + (MAX_HITS - hits) * 500 + combo * 50); }, 400);
        return;
      }
    }

    if (invincible > 0) invincible -= dt;
    if (dodgeAnim > 0) dodgeAnim -= dt * 2;
    lavaWave += dt;

    // Move boarder toward target lane
    var diff = targetLaneX - boardX;
    boardX += diff * 8 * dt;

    // Spawn obstacles
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnObstacle();
      spawnTimer = 0.6 - Math.min(0.4, elapsed * 0.01);
    }

    // Update obstacles
    for (var oi = obstacles.length - 1; oi >= 0; oi--) {
      var o = obstacles[oi];
      o.y += o.speed * dt;

      // Lava wave effect on x
      o.x = LANE_W * (o.lane + 0.5) + Math.sin(lavaWave * 2 + oi) * 15;

      if (o.y > H + 100) {
        obstacles.splice(oi, 1);
        // Dodged!
        if (lane !== o.lane) {
          combo++;
          if (combo > 1) dodgeAnim = 0.4;
        }
        continue;
      }

      // Collision
      if (invincible <= 0 && Math.hypot(boardX - o.x, boardY - o.y) < o.r + 30) {
        hits++;
        invincible = 1.5;
        combo = 0;
        game.audio.play('se_failure', 0.5);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: boardX, y: boardY, vx: Math.cos(ang)*200, vy: Math.sin(ang)*200, life:0.6, col: C.lava3 });
        }
        obstacles.splice(oi, 1);
        if (hits >= MAX_HITS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
          return;
        }
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Lava background
    for (var row = 0; row < 8; row++) {
      var ry = (row * H / 7 + lavaWave * 60) % H;
      var lc = row % 3 === 0 ? C.lava1 : (row % 3 === 1 ? C.lava2 : C.lava3);
      game.draw.rect(0, ry, W, H / 8, lc, 0.4 + Math.sin(lavaWave + row) * 0.1);
    }
    game.draw.rect(0, 0, W, H, C.lava1, 0.15);

    // Lava bubbles
    for (var bx = 0; bx < W; bx += 100) {
      var bub = Math.sin(lavaWave * 3 + bx * 0.02);
      game.draw.circle(bx + 50 + bub * 20, H * 0.85 + bub * 30, 20 + bub * 10, C.lavaHi, 0.3);
    }

    // Lane dividers
    game.draw.line(W / 3, 0, W / 3, H, C.lava1, 2);
    game.draw.line(W * 2 / 3, 0, W * 2 / 3, H, C.lava1, 2);

    // Lane tap zones
    for (var li = 0; li < LANES; li++) {
      var lx = LANE_W * (li + 0.5);
      if (li === lane) {
        game.draw.rect(LANE_W * li + 4, H * 0.88, LANE_W - 8, 60, C.lavaHi, 0.15);
        game.draw.text('◆', lx, H * 0.94, { size: 36, color: C.lavaHi });
      } else {
        game.draw.text('◇', lx, H * 0.94, { size: 36, color: C.ui });
      }
    }

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var o2 = obstacles[oi2];
      game.draw.circle(o2.x, o2.y, o2.r + 6, C.rock, 0.2);
      game.draw.circle(o2.x, o2.y, o2.r, C.rock, 0.9);
      game.draw.circle(o2.x - o2.r * 0.3, o2.y - o2.r * 0.3, o2.r * 0.3, C.rockHi, 0.3);
    }

    // Board
    var palpha = invincible > 0 ? (Math.sin(elapsed * 15) * 0.4 + 0.5) : 1.0;
    game.draw.rect(boardX - 50, boardY + 10, 100, 20, C.board, 0.9 * palpha);
    game.draw.rect(boardX - 50, boardY + 10, 100, 20, C.boardHi, 0.2 * palpha);
    // Boarder
    game.draw.circle(boardX, boardY - 20, 26, C.boarder, 0.9 * palpha);
    game.draw.circle(boardX, boardY - 44, 18, C.boarderHi, 0.9 * palpha);
    // Arms out for balance
    game.draw.line(boardX - 40, boardY - 25, boardX + 40, boardY - 25, C.boarder, 8 * palpha);

    if (dodgeAnim > 0 && combo > 1) {
      game.draw.text(combo + ' DODGE!', W / 2, H * 0.82, { size: 48, color: C.lavaHi, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 28 + hi * 56, H * 0.87, 16, hi < hits ? C.danger : '#1a0a00');
    }

    // Survival progress
    var prog = Math.min(1, surfTime / GOAL_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * prog, 72, prog > 0.7 ? C.lavaHi : C.lava3);
    game.draw.text(Math.floor(surfTime) + 's / ' + GOAL_TIME + 's', W / 2, 36, { size: 40, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.5;
  });
})(game);
