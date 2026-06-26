// 372-puddle-jump.js
// 水たまりジャンプ — 雨の中、白線をはみ出さずに水たまりを避けて前進
// 操作: タップで左右レーンに移動
// 成功: 200m前進  失敗: 水たまりを3回踏む or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0f172a',
    road:   '#1e293b',
    lane:   '#334155',
    line:   '#e2e8f0',
    puddle: '#1d4ed8',
    puddleHi:'#60a5fa',
    puddleShine:'#bfdbfe',
    char:   '#fbbf24',
    charHi: '#fef3c7',
    rain:   '#7dd3fc',
    splash: '#93c5fd',
    danger: '#ef4444',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var LANES = 3;
  var LANE_W = W / LANES;
  var playerLane = 1;
  var playerY = H * 0.78;
  var playerX = LANE_W * playerLane + LANE_W / 2;
  var targetX = playerX;

  var distance = 0;
  var GOAL = 200;
  var speed = 280;
  var splashCount = 0;
  var MAX_SPLASH = 3;
  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var particles = [];
  var raindrops = [];
  var puddles = [];
  var spawnTimer = 0;
  var jumpAnim = 0;

  // Road scroll offset
  var roadOffset = 0;

  function spawnPuddle() {
    var lane = Math.floor(Math.random() * LANES);
    puddles.push({
      lane: lane,
      y: -80,
      w: LANE_W * 0.7,
      h: 50,
      active: true
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) {
      playerLane = Math.max(0, playerLane - 1);
    } else {
      playerLane = Math.min(LANES - 1, playerLane + 1);
    }
    targetX = LANE_W * playerLane + LANE_W / 2;
    game.audio.play('se_tap', 0.3);
    jumpAnim = 0.2;
  });

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') playerLane = Math.max(0, playerLane - 1);
    if (dir === 'right') playerLane = Math.min(LANES - 1, playerLane + 1);
    targetX = LANE_W * playerLane + LANE_W / 2;
    game.audio.play('se_tap', 0.3);
    jumpAnim = 0.2;
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (jumpAnim > 0) jumpAnim -= dt * 4;

    // Move player horizontally
    playerX += (targetX - playerX) * 8 * dt;

    // Advance distance
    distance += speed * dt / 8;
    if (distance >= GOAL && !done) {
      done = true;
      game.audio.play('se_success', 0.7);
      game.end.success(Math.round(distance * 20) + Math.ceil(timeLeft) * 80);
      return;
    }

    roadOffset += speed * dt;
    if (roadOffset > 120) roadOffset -= 120;

    // Spawn puddles
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnPuddle();
      if (Math.random() < 0.35) spawnPuddle();
      spawnTimer = 0.5 + Math.random() * 0.4;
    }

    // Update puddles
    for (var pi = puddles.length - 1; pi >= 0; pi--) {
      puddles[pi].y += speed * dt;
      if (puddles[pi].y > H + 100) {
        puddles.splice(pi, 1);
        continue;
      }
      // Collision with player
      if (puddles[pi].active) {
        var puddleX = LANE_W * puddles[pi].lane + LANE_W / 2;
        var distX = Math.abs(playerX - puddleX);
        var distY = Math.abs(playerY - puddles[pi].y);
        if (distX < LANE_W * 0.35 && distY < 50) {
          puddles[pi].active = false;
          splashCount++;
          game.audio.play('se_failure', 0.4);
          for (var spi = 0; spi < 8; spi++) {
            var ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            particles.push({ x: playerX, y: playerY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.splash });
          }
          if (splashCount >= MAX_SPLASH && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }

    // Rain
    if (Math.random() < dt * 20) {
      raindrops.push({ x: Math.random() * W, y: 0, vy: 600 + Math.random() * 400, life: H / 600 });
    }
    for (var ri = raindrops.length - 1; ri >= 0; ri--) {
      raindrops[ri].y += raindrops[ri].vy * dt;
      raindrops[ri].life -= dt;
      if (raindrops[ri].life <= 0) raindrops.splice(ri, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 400 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Road
    game.draw.rect(0, 0, W, H, C.road, 0.9);

    // Lane lines
    for (var li = 1; li < LANES; li++) {
      var lx = LANE_W * li;
      for (var seg = -1; seg < H / 120 + 1; seg++) {
        var lineY = seg * 120 + roadOffset % 120;
        game.draw.rect(lx - 4, lineY, 8, 60, C.line, 0.6);
      }
    }

    // Puddles
    for (var pui = 0; pui < puddles.length; pui++) {
      var pud = puddles[pui];
      var px = LANE_W * pud.lane + LANE_W / 2;
      if (pud.active) {
        game.draw.rect(px - pud.w / 2, pud.y - pud.h / 2, pud.w, pud.h, C.puddle, 0.85);
        game.draw.rect(px - pud.w * 0.35, pud.y - pud.h * 0.25, pud.w * 0.4, pud.h * 0.3, C.puddleShine, 0.4);
      } else {
        // Splash remnant
        game.draw.rect(px - pud.w / 2, pud.y - pud.h / 2, pud.w, pud.h, C.puddleHi, 0.3);
      }
    }

    // Rain
    for (var ri2 = 0; ri2 < raindrops.length; ri2++) {
      var rd = raindrops[ri2];
      game.draw.line(rd.x, rd.y, rd.x - 4, rd.y + 24, C.rain, 2);
    }

    // Player
    var bobY = jumpAnim > 0 ? -20 * jumpAnim : Math.sin(elapsed * 8) * 4;
    // Body
    game.draw.circle(playerX, playerY + bobY, 44, C.char, 0.9);
    // Head
    game.draw.circle(playerX, playerY - 56 + bobY, 32, C.charHi, 0.9);
    // Boots
    game.draw.rect(playerX - 28, playerY + 34 + bobY, 24, 16, '#78350f', 0.9);
    game.draw.rect(playerX + 4, playerY + 34 + bobY, 24, 16, '#78350f', 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var pt = particles[pp2];
      game.draw.circle(pt.x, pt.y, 8 * pt.life, pt.col, pt.life * 0.9);
    }

    // Splash counter
    for (var sc = 0; sc < MAX_SPLASH; sc++) {
      game.draw.circle(W / 2 - (MAX_SPLASH - 1) * 32 + sc * 64, H * 0.92, 16, sc < splashCount ? C.danger : C.lane, 0.9);
    }

    // Progress
    var prog = Math.min(1, distance / GOAL);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * prog, 72, C.puddleHi);
    game.draw.text(Math.round(distance) + 'm / ' + GOAL + 'm', W / 2, 36, { size: 40, color: '#fff', bold: true });
    game.draw.text(Math.ceil(timeLeft) + 's', W * 0.88, 36, { size: 36, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnTimer = 0.8;
  });
})(game);
