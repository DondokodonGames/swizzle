// 536-sandstorm.js
// サンドストーム — 砂嵐の中を走るキャラ、渦巻く砂粒を避けてゴールへ
// 操作: スワイプで移動、タップでダッシュ
// 成功: 3ゴール到達  失敗: 5回砂に巻き込まれる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#180e04',
    sky:     '#2a1808',
    sand:    '#d97706',
    sandHi:  '#fbbf24',
    sandDim: '#92400e',
    player:  '#38bdf8',
    playerHi:'#7dd3fc',
    goal:    '#22c55e',
    goalHi:  '#86efac',
    hit:     '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151',
    dust:    '#b45309'
  };

  var PLAYER_X = W * 0.15;
  var player = { x: PLAYER_X, y: H / 2, vy: 0, vx: 0 };
  var GOAL_X = W * 0.88;
  var goalY = H / 2;
  var sandParticles = [];
  var goals = 0;
  var NEEDED = 3;
  var hits = 0;
  var MAX_HITS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var flashAnim = 0;
  var invincible = 0;
  var particles = [];
  var dashCooldown = 0;
  var dashActive = 0;
  var reachedGoal = false;
  var goalAnim = 0;

  function spawnSand() {
    // Spiral/vortex sand particles
    for (var i = 0; i < 3; i++) {
      var side = Math.random() < 0.5 ? 1 : -1;
      var y = Math.random() * H;
      sandParticles.push({
        x: side > 0 ? W + 30 : -30,
        y: y,
        vx: side > 0 ? -(200 + Math.random() * 300) : (200 + Math.random() * 300),
        vy: (Math.random() - 0.5) * 200,
        r: 12 + Math.random() * 28,
        spin: Math.random() * Math.PI * 2,
        spinSpeed: (Math.random() - 0.5) * 4,
        col: Math.random() < 0.5 ? C.sand : C.dust,
        life: 1.0
      });
    }
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (dashCooldown <= 0) {
      dashActive = 0.2;
      dashCooldown = 1.0;
      player.vx = 600;
      player.vy = 0;
      game.audio.play('se_tap', 0.4);
      for (var pi = 0; pi < 6; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.3, col: C.playerHi });
      }
    }
  });

  game.onSwipe(function(dir) {
    if (done) return;
    var speed = 400;
    if (dir === 'up')    { player.vy = -speed; player.vx = speed * 0.3; }
    if (dir === 'down')  { player.vy = speed;  player.vx = speed * 0.3; }
    if (dir === 'right') { player.vx = speed;  player.vy *= 0.5; }
    if (dir === 'left')  { player.vx = -speed; player.vy *= 0.5; }
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

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (invincible > 0) invincible -= dt;
    if (dashCooldown > 0) dashCooldown -= dt;
    if (dashActive > 0) dashActive -= dt;
    if (goalAnim > 0) goalAnim -= dt * 2;

    // Player movement
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.vx *= Math.pow(0.05, dt);
    player.vy *= Math.pow(0.05, dt);

    // Keep player in bounds
    player.x = Math.max(40, Math.min(W - 40, player.x));
    player.y = Math.max(80, Math.min(H - 80, player.y));

    // Reset position if reached goal
    if (!reachedGoal && player.x > GOAL_X - 40) {
      goals++;
      reachedGoal = true;
      goalAnim = 1.0;
      game.audio.play('se_success', 0.8);
      for (var pi = 0; pi < 12; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.goal });
      }
      // Reset player
      player.x = PLAYER_X;
      player.y = H * 0.3 + Math.random() * H * 0.4;
      player.vx = 0; player.vy = 0;
      goalY = H * 0.2 + Math.random() * H * 0.6;
      if (goals >= NEEDED && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(goals * 800 + Math.ceil(timeLeft) * 100); }, 700);
      }
      setTimeout(function() { reachedGoal = false; }, 200);
    }

    // Spawn sand
    spawnSand();

    // Update sand
    for (var si = sandParticles.length - 1; si >= 0; si--) {
      var sp = sandParticles[si];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.spin += sp.spinSpeed * dt;
      sp.vy += (Math.random() - 0.5) * 60 * dt;
      sp.life -= dt * 0.5;
      if (sp.x < -80 || sp.x > W + 80 || sp.life <= 0) { sandParticles.splice(si, 1); continue; }

      // Collision with player
      if (invincible <= 0 && dashActive <= 0) {
        var dx = player.x - sp.x, dy = player.y - sp.y;
        if (Math.sqrt(dx*dx+dy*dy) < sp.r + 24) {
          hits++;
          invincible = 1.2;
          flashAnim = 0.5;
          game.audio.play('se_failure', 0.4);
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
          sandParticles.splice(si, 1);
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
    game.draw.rect(0, 0, W, H * 0.4, C.sky, 0.5);

    // Sand particles
    for (var si2 = 0; si2 < sandParticles.length; si2++) {
      var sp2 = sandParticles[si2];
      var alpha = sp2.life * 0.7;
      game.draw.circle(sp2.x, sp2.y, sp2.r, sp2.col, alpha);
      game.draw.circle(sp2.x + Math.cos(sp2.spin) * sp2.r * 0.4, sp2.y + Math.sin(sp2.spin) * sp2.r * 0.4, sp2.r * 0.3, C.sandHi, alpha * 0.6);
    }

    // Goal
    game.draw.line(GOAL_X, goalY - 80, GOAL_X, goalY + 80, C.goal, 8);
    game.draw.rect(GOAL_X, goalY - 80, 60, 50, C.goal, 0.8);
    game.draw.text('GO', GOAL_X + 30, goalY - 55, { size: 32, color: '#fff', bold: true });

    if (goalAnim > 0) {
      game.draw.circle(GOAL_X, goalY, 80 * (1 - goalAnim + 0.5) * 2, C.goalHi, goalAnim * 0.3);
    }

    // Player
    var invBlink = invincible > 0 ? (Math.sin(elapsed * 20) > 0 ? 0.4 : 0.9) : 0.9;
    var dashGlow = dashActive > 0 ? 0.5 : 0;
    if (dashGlow > 0) game.draw.circle(player.x, player.y, 60, C.playerHi, dashGlow);
    game.draw.circle(player.x, player.y, 32, C.player, invBlink);
    game.draw.circle(player.x - 8, player.y - 8, 10, C.playerHi, invBlink * 0.6);

    // Dash cooldown indicator
    if (dashCooldown > 0) {
      game.draw.circle(player.x, player.y, 40, C.ui, 0.3);
      game.draw.circle(player.x, player.y, 40 * (1 - dashCooldown), C.playerHi, 0.4);
    } else {
      game.draw.text('DASH', player.x, player.y + 60, { size: 32, color: C.playerHi });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.15);

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 52 + hi * 104, H * 0.955, 20, hi < hits ? C.hit : C.ui, 0.9);
    }

    game.draw.text(goals + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.sand : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
  });
})(game);
