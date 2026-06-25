// 105-neon-runner.js
// ネオンランナー — 高速で流れるネオンシティを無限に走るエンドレスランナーの疾走感
// 操作: タップでジャンプ、スワイプ下でスライド
// 成功: 20秒生き残る  失敗: 障害物に当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030508',
    ground:  '#0f172a',
    groundHi:'#1e3a5f',
    runner:  '#22d3ee',
    runnerHi:'#67e8f9',
    obstacle:'#ef4444',
    obstacleHi:'#fca5a5',
    building:'#0a0f1a',
    buildingHi:'#1a2340',
    neon1:   '#8b5cf6',
    neon2:   '#f97316',
    ui:      '#334155'
  };

  var GROUND_Y = H * 0.72;
  var RUNNER_X = W * 0.2;
  var RUNNER_H = 80;
  var RUNNER_W = 40;

  var runnerY = GROUND_Y - RUNNER_H;
  var runnerVY = 0;
  var GRAVITY = 2200;
  var JUMP_VY = -900;
  var onGround = true;
  var sliding = false;
  var slideTimer = 0;
  var SLIDE_DURATION = 0.4;

  var obstacles = []; // { x, y, w, h, type }
  var spawnTimer = 0;
  var SPAWN_INTERVAL = 1.4;
  var gameSpeed = 500;
  var MAX_SPEED = 900;

  var buildings = []; // { x, w, h, color }
  var buildTimer = 0;

  var timeLeft = 20;
  var done = false;
  var survived = 0;
  var deathFlash = 0;
  var particles = [];

  function spawnBuilding() {
    var h = 80 + Math.random() * 200;
    var w = 60 + Math.random() * 120;
    buildings.push({
      x: W + 20, w: w, h: h,
      color: Math.random() > 0.5 ? C.building : C.buildingHi
    });
  }

  function spawnObstacle() {
    var type = Math.random() > 0.4 ? 'low' : 'high';
    if (type === 'low') {
      // Ground obstacle (must jump)
      obstacles.push({ x: W + 40, y: GROUND_Y - 80, w: 48, h: 80, type: 'low' });
    } else {
      // High obstacle (must slide)
      obstacles.push({ x: W + 40, y: GROUND_Y - RUNNER_H - 20, w: 120, h: 44, type: 'high' });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (onGround && !sliding) {
      runnerVY = JUMP_VY;
      onGround = false;
      game.audio.play('se_tap', 0.6);
    }
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'down' && onGround) {
      sliding = true;
      slideTimer = SLIDE_DURATION;
      game.audio.play('se_tap', 0.4);
    } else if (dir === 'up' && onGround && !sliding) {
      runnerVY = JUMP_VY;
      onGround = false;
      game.audio.play('se_tap', 0.6);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;
      gameSpeed = Math.min(MAX_SPEED, 500 + survived * 20);

      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + Math.floor(survived) * 15); }, 400);
        return;
      }
    }

    // Slide timer
    if (sliding) {
      slideTimer -= dt;
      if (slideTimer <= 0) sliding = false;
    }

    // Gravity
    if (!onGround) {
      runnerVY += GRAVITY * dt;
      runnerY += runnerVY * dt;
      if (runnerY >= GROUND_Y - RUNNER_H) {
        runnerY = GROUND_Y - RUNNER_H;
        runnerVY = 0;
        onGround = true;
      }
    }

    // Spawn obstacles
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = SPAWN_INTERVAL - survived * 0.04;
      if (spawnTimer < 0.7) spawnTimer = 0.7;
      spawnObstacle();
    }

    // Spawn buildings (background)
    buildTimer -= dt;
    if (buildTimer <= 0) {
      buildTimer = 0.4 + Math.random() * 0.3;
      spawnBuilding();
    }

    // Move obstacles
    for (var i = 0; i < obstacles.length; i++) {
      obstacles[i].x -= gameSpeed * dt;
    }
    obstacles = obstacles.filter(function(o) { return o.x + o.w > -20; });

    // Move buildings
    for (var bi = 0; bi < buildings.length; bi++) {
      buildings[bi].x -= gameSpeed * 0.3 * dt;
    }
    buildings = buildings.filter(function(b) { return b.x + b.w > -20; });

    // Collision detection
    var runnerTop = runnerY;
    var runnerBottom = runnerY + (sliding ? RUNNER_H * 0.5 : RUNNER_H);
    var runnerLeft = RUNNER_X - RUNNER_W / 2;
    var runnerRight = RUNNER_X + RUNNER_W / 2;

    for (var j = 0; j < obstacles.length; j++) {
      var obs = obstacles[j];
      var ox = obs.x, oy = obs.y, ow = obs.w, oh = obs.h;
      if (runnerRight - 8 > ox && runnerLeft + 8 < ox + ow &&
          runnerBottom - 8 > oy && runnerTop + 8 < oy + oh) {
        if (!done) {
          done = true;
          deathFlash = 0.5;
          game.audio.play('se_failure');
          // Particles
          for (var pi = 0; pi < 20; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: RUNNER_X, y: runnerY + RUNNER_H / 2, vx: Math.cos(ang)*300, vy: Math.sin(ang)*300, life: 0.5 });
          }
          setTimeout(function() { game.end.failure(); }, 600);
        }
      }
    }

    // Update particles
    for (var ki = 0; ki < particles.length; ki++) {
      var p = particles[ki];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 500 * dt; p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    if (deathFlash > 0) deathFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Buildings (background)
    for (var bld = 0; bld < buildings.length; bld++) {
      var b = buildings[bld];
      game.draw.rect(b.x, GROUND_Y - b.h, b.w, b.h, b.color);
      // Neon windows
      for (var wy = GROUND_Y - b.h + 16; wy < GROUND_Y - 20; wy += 32) {
        for (var wx = b.x + 12; wx < b.x + b.w - 12; wx += 24) {
          var wColor = Math.sin(game.time.elapsed + wy + wx) > 0.3 ? C.neon1 : C.neon2;
          game.draw.rect(wx, wy, 12, 16, wColor, 0.5);
        }
      }
    }

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground);
    game.draw.rect(0, GROUND_Y, W, 6, C.groundHi);
    // Speed lines on ground
    for (var lx = (-game.time.elapsed * gameSpeed) % 80; lx < W; lx += 80) {
      game.draw.rect(lx, GROUND_Y + 20, 40, 4, C.groundHi, 0.3);
    }

    // Obstacles
    for (var oi = 0; oi < obstacles.length; oi++) {
      var obs2 = obstacles[oi];
      game.draw.rect(obs2.x, obs2.y, obs2.w, obs2.h, C.obstacle);
      game.draw.rect(obs2.x, obs2.y, obs2.w, 6, C.obstacleHi);
      if (obs2.type === 'high') {
        game.draw.text('↓', obs2.x + obs2.w / 2, obs2.y + obs2.h / 2, { size: 36, color: '#fff' });
      } else {
        game.draw.text('↑', obs2.x + obs2.w / 2, obs2.y + obs2.h / 2, { size: 36, color: '#fff' });
      }
    }

    // Runner
    var rH = sliding ? RUNNER_H * 0.5 : RUNNER_H;
    var rY = sliding ? GROUND_Y - rH : runnerY;
    game.draw.rect(RUNNER_X - RUNNER_W / 2, rY, RUNNER_W, rH, C.runner);
    game.draw.rect(RUNNER_X - RUNNER_W / 2, rY, RUNNER_W, 8, C.runnerHi);
    // Glow trail
    game.draw.rect(RUNNER_X - RUNNER_W / 2 - 20, rY, 20, rH, C.runner, 0.15);

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 8 * part.life * 2, C.runner, part.life);
    }

    if (deathFlash > 0) {
      game.draw.rect(0, 0, W, H, C.obstacle, deathFlash * 0.4);
    }

    // Survived time
    game.draw.text(Math.floor(survived) + 's', W / 2, 140, { size: 56, color: C.runnerHi, bold: true });

    // Timer bar
    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, '#030508');
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.runner : C.obstacle);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    // Guide
    game.draw.text('タップ:ジャンプ ↓:スライド', W / 2, H * 0.88, { size: 40, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.4);
  });
})(game);
