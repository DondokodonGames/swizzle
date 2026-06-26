// 548-neon-dash.js
// ネオンダッシュ — ネオンカラーのランナーが障害物レーンを走る、スワイプでレーン変更
// 操作: スワイプ左右でレーン変更、タップでジャンプ
// 成功: 400m走りきる  失敗: 3回激突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#000014',
    lane0:   '#ff006633',
    lane1:   '#0066ff33',
    lane2:   '#00ff6633',
    road:    '#0a0a1e',
    line:    '#ffffff22',
    player:  '#00ffff',
    playerHi:'#ffffff',
    playerGl:'#00ffff44',
    obs0:    '#ff4444',
    obs1:    '#ff8800',
    obs2:    '#ff00ff',
    hit:     '#ef4444',
    grid:    '#ffffff11',
    text:    '#f1f5f9',
    ui:      '#334466',
    score:   '#00ffcc'
  };

  var LANE_COUNT = 3;
  var LANE_W = W / LANE_COUNT;
  var ROAD_Y = H * 0.82;
  var PLAYER_R = 40;
  var PLAYER_Y = ROAD_Y - PLAYER_R - 8;
  var JUMP_HEIGHT = 200;
  var OBS_COLORS = [C.obs0, C.obs1, C.obs2];

  var playerLane = 1;
  var targetLane = 1;
  var playerX = W / 2;
  var playerY = PLAYER_Y;
  var jumpVY = 0;
  var onGround = true;
  var obstacles = [];
  var distance = 0;
  var NEEDED_DIST = 400;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var speed = 600; // px/sec → distance units
  var nextObs = 0.8;
  var particles = [];
  var flashAnim = 0;
  var invincible = 0;
  var gridOffset = 0;
  var laneTransit = 0; // 0-1 transition

  function getLaneX(lane) { return lane * LANE_W + LANE_W / 2; }

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left' && targetLane > 0) {
      targetLane--;
      game.audio.play('se_tap', 0.3);
    }
    if (dir === 'right' && targetLane < LANE_COUNT - 1) {
      targetLane++;
      game.audio.play('se_tap', 0.3);
    }
    if (dir === 'up' && onGround) {
      jumpVY = -900;
      onGround = false;
      game.audio.play('se_tap', 0.4);
    }
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (onGround) {
      jumpVY = -900;
      onGround = false;
      game.audio.play('se_tap', 0.4);
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
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (invincible > 0) invincible -= dt;

    // Progress
    distance += speed * dt / 100; // scale to "meters"
    speed = Math.min(speed + 20 * dt, 1100);
    gridOffset += speed * dt;
    if (gridOffset > LANE_W) gridOffset -= LANE_W;

    // Lane transition
    var targetX = getLaneX(targetLane);
    var diff = targetX - playerX;
    playerX += diff * Math.min(1, dt * 8);

    // Jump physics
    if (!onGround) {
      jumpVY += 2000 * dt;
      playerY += jumpVY * dt;
      if (playerY >= PLAYER_Y) {
        playerY = PLAYER_Y;
        jumpVY = 0;
        onGround = true;
      }
    }

    // Spawn obstacles
    nextObs -= dt;
    if (nextObs <= 0 && !done) {
      var obsLane = Math.floor(Math.random() * LANE_COUNT);
      var isJump = Math.random() < 0.3; // jumpable low obstacle
      obstacles.push({
        x: getLaneX(obsLane),
        y: -80,
        lane: obsLane,
        w: 80,
        h: isJump ? 60 : 120,
        col: OBS_COLORS[obsLane],
        jumpable: isJump,
        speed: speed
      });
      nextObs = Math.max(0.4, 0.8 - distance * 0.001);
    }

    // Update obstacles
    for (var oi = obstacles.length - 1; oi >= 0; oi--) {
      var obs = obstacles[oi];
      obs.y += obs.speed * dt;
      if (obs.y > H + 100) { obstacles.splice(oi, 1); continue; }

      // Collision
      if (invincible <= 0 && Math.abs(playerX - obs.x) < PLAYER_R + obs.w / 2) {
        var obsTop = ROAD_Y - obs.h;
        if (obs.jumpable && playerY < obsTop - 20) continue; // jumped over
        if (playerY > obsTop - PLAYER_R) {
          hits++;
          invincible = 1.0;
          flashAnim = 0.5;
          game.audio.play('se_failure', 0.5);
          obstacles.splice(oi, 1);
          for (var pi = 0; pi < 8; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: playerX, y: playerY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.4, col: C.hit });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }

    // Win check
    if (distance >= NEEDED_DIST && !done) {
      done = true;
      game.audio.play('se_success', 0.9);
      setTimeout(function() { game.end.success(Math.round(distance) * 100 + Math.ceil(timeLeft) * 200); }, 700);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Road
    game.draw.rect(0, ROAD_Y, W, H - ROAD_Y, C.road, 0.9);

    // Lane colors
    var laneColors = [C.lane0, C.lane1, C.lane2];
    for (var li = 0; li < LANE_COUNT; li++) {
      game.draw.rect(li * LANE_W, 0, LANE_W, H, laneColors[li], 0.3);
    }

    // Grid lines (floor perspective)
    for (var gi = 0; gi < 8; gi++) {
      var gy = ROAD_Y + (gi / 8) * (H - ROAD_Y) * 1.5;
      game.draw.line(0, gy, W, gy, C.grid, 2);
    }
    // Vertical grid
    for (var gj = 0; gj <= LANE_COUNT; gj++) {
      game.draw.line(gj * LANE_W, 0, gj * LANE_W, H, C.line, 3);
    }
    // Moving dashes
    for (var di = 0; di < 12; di++) {
      var dy = (di * 180 + gridOffset) % (H + 100) - 100;
      for (var dj = 0; dj < LANE_COUNT - 1; dj++) {
        game.draw.line((dj + 1) * LANE_W, dy, (dj + 1) * LANE_W, dy + 80, '#ffffff33', 3);
      }
    }

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var obs2 = obstacles[oi2];
      var glow = obs2.col + '44';
      game.draw.rect(obs2.x - obs2.w / 2 - 8, ROAD_Y - obs2.h - 8, obs2.w + 16, obs2.h + 16, glow, 0.5);
      game.draw.rect(obs2.x - obs2.w / 2, ROAD_Y - obs2.h, obs2.w, obs2.h, obs2.col, 0.9);
      if (obs2.jumpable) {
        game.draw.text('⬛', obs2.x, ROAD_Y - obs2.h / 2, { size: 28, color: '#fff' });
      }
    }

    // Player shadow
    game.draw.circle(playerX, PLAYER_Y + 10, PLAYER_R * 0.7, '#000', 0.3);

    // Player
    var invBlink = invincible > 0 ? (Math.sin(elapsed * 20) > 0 ? 0.5 : 1) : 1;
    game.draw.circle(playerX, playerY, PLAYER_R + 12, C.playerGl, invBlink * 0.4);
    game.draw.circle(playerX, playerY, PLAYER_R, C.player, invBlink * 0.9);
    game.draw.circle(playerX - 10, playerY - 10, 14, C.playerHi, invBlink * 0.5);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.12);

    // Distance meter
    var distRatio = Math.min(distance / NEEDED_DIST, 1);
    game.draw.rect(80, H * 0.88, W - 160, 20, C.ui, 0.4);
    game.draw.rect(80, H * 0.88, (W - 160) * distRatio, 20, C.score, 0.9);
    game.draw.text(Math.floor(distance) + ' / ' + NEEDED_DIST + 'm', W / 2, H * 0.88 + 50, { size: 40, color: C.score });

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 52 + hi * 104, H * 0.955, 20, hi < hits ? C.hit : C.ui, 0.9);
    }

    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
  });
})(game);
