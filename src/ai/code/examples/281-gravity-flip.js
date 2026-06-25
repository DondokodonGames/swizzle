// 281-gravity-flip.js
// グラビティフリップ — 重力を反転させながら障害物コースを突破する
// 操作: タップで重力の向きを上下反転
// 成功: 10個のゲートをくぐる  失敗: 壁に当たる3回 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#020710',
    wall:   '#1e1b4b',
    wallHi: '#4338ca',
    player: '#22c55e',
    plrHi:  '#86efac',
    gate:   '#fde68a',
    gateHi: '#fef3c7',
    danger: '#ef4444',
    danHi:  '#fca5a5',
    trail:  '#7c3aed',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var PLAYER_R = 28;
  var player = {
    x: W * 0.2,
    y: H * 0.5,
    vy: 0,
    gravDir: 1 // 1=down, -1=up
  };

  var FLOOR_Y = H * 0.88;
  var CEIL_Y = H * 0.12;

  var obstacles = []; // {x, topH, gapY, gapH, passed}
  var gates = 0;
  var NEEDED = 10;
  var hits = 0;
  var MAX_HIT = 3;
  var done = false;
  var timeLeft = 40;
  var elapsed = 0;
  var scrollSpeed = 240;
  var spawnTimer = 0;
  var trail = [];
  var particles = [];
  var hitFlash = 0;

  function spawnObstacle() {
    var gapH = 220 - gates * 8; // gap narrows as progress increases
    gapH = Math.max(140, gapH);
    var gapY = CEIL_Y + (Math.random() * (FLOOR_Y - CEIL_Y - gapH));
    obstacles.push({
      x: W + 60,
      gapY: gapY,
      gapH: gapH,
      passed: false,
      flash: 0
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    player.gravDir *= -1;
    player.vy *= 0.3; // dampen existing velocity
    game.audio.play('se_tap', 0.3);
    for (var pi = 0; pi < 3; pi++) {
      var ang = (Math.random() - 0.5) * Math.PI;
      particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 100, vy: Math.sin(ang) * 80, life: 0.3, col: C.plrHi });
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (hitFlash > 0) hitFlash -= dt;

    // Physics
    var gravity = 1200 * player.gravDir;
    player.vy += gravity * dt;
    player.vy = Math.max(-800, Math.min(800, player.vy));
    player.y += player.vy * dt;

    // Bounds
    if (player.gravDir === 1 && player.y + PLAYER_R >= FLOOR_Y) {
      player.y = FLOOR_Y - PLAYER_R;
      player.vy = 0;
    }
    if (player.gravDir === -1 && player.y - PLAYER_R <= CEIL_Y) {
      player.y = CEIL_Y + PLAYER_R;
      player.vy = 0;
    }

    // Trail
    trail.push({ x: player.x, y: player.y });
    if (trail.length > 16) trail.shift();

    // Scroll & obstacles
    scrollSpeed = 240 + gates * 15;
    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnObstacle();
      spawnTimer = 0.9 + Math.random() * 0.5;
    }

    for (var oi = obstacles.length - 1; oi >= 0; oi--) {
      var obs = obstacles[oi];
      obs.x -= scrollSpeed * dt;
      if (obs.flash > 0) obs.flash -= dt;

      // Collision check
      var inX = player.x + PLAYER_R > obs.x && player.x - PLAYER_R < obs.x + 60;
      if (inX) {
        var inGap = player.y - PLAYER_R >= obs.gapY && player.y + PLAYER_R <= obs.gapY + obs.gapH;
        if (!inGap) {
          hits++;
          obs.flash = 0.4;
          hitFlash = 0.4;
          game.audio.play('se_failure', 0.6);
          player.vy = 0;
          for (var pi2 = 0; pi2 < 8; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: player.x, y: player.y, vx: Math.cos(ang2) * 200, vy: Math.sin(ang2) * 200, life: 0.5, col: C.danHi });
          }
          if (hits >= MAX_HIT && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
            return;
          }
        }
      }

      // Gate pass
      if (!obs.passed && obs.x + 60 < player.x - PLAYER_R) {
        obs.passed = true;
        gates++;
        game.audio.play('se_success', 0.4);
        if (gates >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(gates * 150 + Math.ceil(timeLeft) * 100); }, 400);
          return;
        }
      }

      if (obs.x + 60 < -100) obstacles.splice(oi, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.danger, hitFlash * 0.25);

    // Floor / ceiling
    game.draw.rect(0, FLOOR_Y, W, H - FLOOR_Y, C.wall, 0.9);
    game.draw.rect(0, FLOOR_Y, W, 8, C.wallHi, 0.6);
    game.draw.rect(0, 0, W, CEIL_Y, C.wall, 0.9);
    game.draw.rect(0, CEIL_Y - 8, W, 8, C.wallHi, 0.6);

    // Obstacles
    for (var oi2 = 0; oi2 < obstacles.length; oi2++) {
      var obs2 = obstacles[oi2];
      var obsCol = obs2.flash > 0 ? C.danger : C.wall;
      var obsHi = obs2.flash > 0 ? C.danHi : C.wallHi;
      // Top pillar
      game.draw.rect(obs2.x, CEIL_Y, 60, obs2.gapY - CEIL_Y, obsCol, 0.9);
      game.draw.rect(obs2.x, obs2.gapY - 8, 60, 8, obsHi, 0.6);
      // Bottom pillar
      game.draw.rect(obs2.x, obs2.gapY + obs2.gapH, 60, FLOOR_Y - obs2.gapY - obs2.gapH, obsCol, 0.9);
      game.draw.rect(obs2.x, obs2.gapY + obs2.gapH, 60, 8, obsHi, 0.6);
      // Gate highlight
      game.draw.line(obs2.x, obs2.gapY, obs2.x + 60, obs2.gapY, C.gate, 3);
      game.draw.line(obs2.x, obs2.gapY + obs2.gapH, obs2.x + 60, obs2.gapY + obs2.gapH, C.gate, 3);
    }

    // Trail
    for (var ti = 0; ti < trail.length; ti++) {
      var a = (ti / trail.length) * 0.6;
      game.draw.circle(trail[ti].x, trail[ti].y, PLAYER_R * a, C.trail, a * 0.5);
    }

    // Player
    var gravSymbol = player.gravDir === 1 ? '▼' : '▲';
    game.draw.circle(player.x, player.y, PLAYER_R + 6, C.plrHi, 0.15);
    game.draw.circle(player.x, player.y, PLAYER_R, C.player, 0.9);
    game.draw.text(gravSymbol, player.x, player.y + 12, { size: 28, color: '#fff', bold: true });

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 3, p.col, p.life * 0.7);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HIT; hi++) {
      game.draw.circle(W / 2 - (MAX_HIT - 1) * 28 + hi * 56, H * 0.93, 16, hi < hits ? C.danger : '#05090e');
    }

    game.draw.text(gates + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    game.draw.text('タップで重力反転', W / 2, H * 0.89, { size: 38, color: C.ui });

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.2);
    spawnTimer = 1.5;
  });
})(game);
