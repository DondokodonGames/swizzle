// 312-tornado-dodge.js
// 竜巻ドッジ — 渦巻く竜巻を左右スワイプで避けながら生き残れ
// 操作: 左右スワイプで避ける（竜巻は予測不可能に方向転換する）
// 成功: 30秒生き残る  失敗: 竜巻に3回触れる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0614',
    sky:    '#120a28',
    ground: '#1a1008',
    groundHi:'#2d1a10',
    player: '#22c55e',
    playerHi:'#86efac',
    tornado:'#8b5cf6',
    tornado2:'#6d28d9',
    tornado3:'#4c1d95',
    debris: '#a78bfa',
    danger: '#ef4444',
    safe:   '#22c55e',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var playerX = W / 2;
  var playerY = H * 0.8;
  var playerTargetX = playerX;
  var PLAYER_LANES = 5;
  var LANE_W = W / PLAYER_LANES;
  var playerLane = 2;
  var playerMoveSpeed = 600;

  var tornadoes = [];
  var debris = [];
  var survived = 0;
  var SURVIVE_TIME = 30;
  var hits = 0;
  var MAX_HIT = 3;
  var done = false;
  var elapsed = 0;
  var particles = [];
  var spawnTimer = 0;
  var hitFlash = 0;

  function spawnTornado() {
    var lane = Math.floor(Math.random() * PLAYER_LANES);
    var speed = 200 + Math.random() * 150 + survived * 4;
    tornadoes.push({
      x: LANE_W * (lane + 0.5),
      y: -100,
      vy: speed,
      r: 60 + Math.random() * 30,
      wobbleX: (Math.random() - 0.5) * 80,
      wobbleSpeed: 1 + Math.random(),
      wobbleAngle: 0,
      spin: 0
    });
  }

  function spawnDebris() {
    debris.push({
      x: Math.random() * W,
      y: -30,
      vx: (Math.random() - 0.5) * 200,
      vy: 300 + Math.random() * 200,
      r: 8 + Math.random() * 14,
      rot: Math.random() * Math.PI * 2
    });
  }

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done) return;
    if (dir === 'left' && playerLane > 0) {
      playerLane--;
      playerTargetX = LANE_W * (playerLane + 0.5);
      game.audio.play('se_tap', 0.2);
    } else if (dir === 'right' && playerLane < PLAYER_LANES - 1) {
      playerLane++;
      playerTargetX = LANE_W * (playerLane + 0.5);
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;
      survived = Math.min(elapsed, SURVIVE_TIME);
      if (elapsed >= SURVIVE_TIME) {
        done = true;
        game.audio.play('se_success', 0.7);
        setTimeout(function() { game.end.success(Math.round(survived * 100) + (MAX_HIT - hits) * 500); }, 400);
        return;
      }
    }

    if (hitFlash > 0) hitFlash -= dt;

    // Move player
    playerX += (playerTargetX - playerX) * Math.min(1, playerMoveSpeed * dt / Math.max(1, Math.abs(playerTargetX - playerX)));

    // Spawn tornadoes
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnTornado();
      if (Math.random() < 0.4) spawnDebris();
      spawnTimer = 0.8 - Math.min(0.5, elapsed * 0.01);
    }

    // Update tornadoes
    for (var ti = tornadoes.length - 1; ti >= 0; ti--) {
      var t = tornadoes[ti];
      t.wobbleAngle += dt * t.wobbleSpeed;
      t.x += Math.sin(t.wobbleAngle) * t.wobbleX * dt;
      // Keep in bounds
      t.x = Math.max(t.r, Math.min(W - t.r, t.x));
      t.y += t.vy * dt;
      t.spin += dt * 4;

      // Collision with player
      var dx = playerX - t.x, dy = playerY - t.y;
      if (Math.hypot(dx, dy) < t.r + 25) {
        hits++;
        hitFlash = 0.5;
        game.audio.play('se_failure', 0.6);
        // Push player away
        playerLane = Math.floor(Math.random() * PLAYER_LANES);
        playerTargetX = LANE_W * (playerLane + 0.5);
        for (var pi = 0; pi < 10; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: playerX, y: playerY, vx: Math.cos(ang) * 250, vy: Math.sin(ang) * 250, life: 0.6, col: C.danger });
        }
        tornadoes.splice(ti, 1);
        if (hits >= MAX_HIT && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
        }
        continue;
      }

      if (t.y > H + 120) tornadoes.splice(ti, 1);
    }

    // Update debris
    for (var di = debris.length - 1; di >= 0; di--) {
      debris[di].x += debris[di].vx * dt;
      debris[di].y += debris[di].vy * dt;
      debris[di].rot += dt * 3;
      if (debris[di].y > H + 50) debris.splice(di, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, 0, W, H * 0.85, C.sky, 0.6);
    game.draw.rect(0, H * 0.85, W, H * 0.15, C.ground, 0.9);
    game.draw.rect(0, H * 0.85, W, 8, C.groundHi, 0.7);

    // Hit flash
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.danger, hitFlash * 0.3);

    // Debris
    for (var di2 = 0; di2 < debris.length; di2++) {
      var d = debris[di2];
      game.draw.circle(d.x, d.y, d.r, '#6b7280', 0.6);
      game.draw.rect(d.x - d.r * 0.5, d.y - d.r * 0.5, d.r, d.r, '#374151', 0.7);
    }

    // Tornadoes
    for (var ti2 = 0; ti2 < tornadoes.length; ti2++) {
      var t2 = tornadoes[ti2];
      // Draw as spiral rings
      for (var ring = 0; ring < 5; ring++) {
        var rr = t2.r * (0.3 + ring * 0.18);
        var alpha = 0.5 - ring * 0.08;
        var col = ring < 2 ? C.tornado : (ring < 4 ? C.tornado2 : C.tornado3);
        game.draw.circle(t2.x + Math.cos(t2.spin + ring * 1.2) * rr * 0.3, t2.y + ring * 20, rr, col, alpha);
      }
      // Top funnel tip
      game.draw.circle(t2.x, t2.y, 15, C.debris, 0.8);
      // Warning zone
      game.draw.circle(t2.x, t2.y, t2.r + 20, C.danger, 0.08);
    }

    // Player
    var pGlow = 5 * Math.sin(elapsed * 4);
    game.draw.circle(playerX, playerY, 32 + pGlow + 8, C.player, 0.15);
    game.draw.circle(playerX, playerY, 32 + pGlow, C.player, 0.9);
    game.draw.circle(playerX, playerY - 16, 14, C.playerHi, 0.7);
    // Shadow
    game.draw.circle(playerX, H * 0.85, 36 * 0.6, '#000', 0.3);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life * 2, p.col, p.life * 0.8);
    }

    // Survive time progress
    game.draw.text('生存中... ' + Math.ceil(SURVIVE_TIME - survived) + '秒', W / 2, H * 0.89, { size: 44, color: C.ui });

    // Hit dots
    for (var hi = 0; hi < MAX_HIT; hi++) {
      game.draw.circle(W / 2 - (MAX_HIT - 1) * 30 + hi * 60, H * 0.94, 18, hi < hits ? C.danger : '#0a0614');
    }

    game.draw.text(Math.round(survived) + 's', W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, survived / SURVIVE_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio < 0.7 ? C.tornado : C.safe);
    game.draw.text(Math.ceil(SURVIVE_TIME - survived) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 0.5;
  });
})(game);
