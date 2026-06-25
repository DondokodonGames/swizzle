// 110-gravity-flip.js
// 重力反転 — 天井と床を行き来して障害物の隙間をくぐり抜ける浮遊感
// 操作: タップで重力反転
// 成功: 20秒間生き残る  失敗: 壁か天井・床に接触

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040810',
    wall:    '#1e293b',
    wallHi:  '#334155',
    player:  '#a78bfa',
    playerHi:'#c4b5fd',
    trail:   '#7c3aed',
    gap:     '#0f172a',
    correct: '#22c55e',
    wrong:   '#ef4444',
    ui:      '#475569'
  };

  var PLAYER_X = W * 0.22;
  var PLAYER_R = 26;
  var playerY = H * 0.5;
  var playerVY = 0;
  var GRAVITY = 1800;
  var gravDir = 1; // 1=down, -1=up

  var walls = []; // { x, topH, botH } where topH = top wall height, botH = bottom wall height
  var WALL_W = 72;
  var GAP_H = 320;
  var SCROLL_SPEED = 380;
  var spawnX = W + WALL_W;

  var timeLeft = 20;
  var done = false;
  var survived = 0;
  var trail = [];
  var deathFlash = 0;
  var particles = [];

  function spawnWall() {
    var minTop = 80;
    var maxTop = H - GAP_H - 80;
    var topH = minTop + Math.random() * (maxTop - minTop);
    walls.push({ x: spawnX, topH: topH, botH: H - topH - GAP_H });
    spawnX = W + WALL_W;
  }

  game.onTap(function() {
    if (done) return;
    gravDir *= -1;
    playerVY *= 0.3; // dampen velocity on flip
    game.audio.play('se_tap', 0.5);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      survived += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(300 + Math.floor(survived) * 20); }, 300);
        return;
      }
    }

    // Physics
    playerVY += GRAVITY * gravDir * dt;
    playerY += playerVY * dt;

    // Ceiling/floor death
    if (playerY - PLAYER_R < 0 || playerY + PLAYER_R > H) {
      if (!done) {
        done = true;
        deathFlash = 0.5;
        game.audio.play('se_failure');
        for (var pi = 0; pi < 16; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(ang)*300, vy: Math.sin(ang)*300, life: 0.6 });
        }
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }

    // Trail
    trail.push({ x: PLAYER_X, y: playerY, age: 0 });
    for (var ti = 0; ti < trail.length; ti++) trail[ti].age += dt;
    trail = trail.filter(function(t) { return t.age < 0.35; });

    // Move walls
    for (var i = 0; i < walls.length; i++) {
      walls[i].x -= SCROLL_SPEED * dt;
    }
    walls = walls.filter(function(w) { return w.x + WALL_W > -10; });

    // Spawn walls
    var lastX = walls.length > 0 ? walls[walls.length - 1].x : 0;
    if (lastX < W * 1.1) {
      var gap = 280 + Math.random() * 120;
      spawnX = lastX + gap;
      spawnWall();
    }

    // Collision with walls
    for (var j = 0; j < walls.length; j++) {
      var w = walls[j];
      if (PLAYER_X + PLAYER_R > w.x && PLAYER_X - PLAYER_R < w.x + WALL_W) {
        // Top wall
        if (playerY - PLAYER_R < w.topH) {
          if (!done) {
            done = true;
            deathFlash = 0.5;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
        // Bottom wall
        if (playerY + PLAYER_R > H - w.botH) {
          if (!done) {
            done = true;
            deathFlash = 0.5;
            game.audio.play('se_failure');
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }
    }

    // Particles
    for (var k = 0; k < particles.length; k++) {
      var p = particles[k];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 400 * dt; p.life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    if (deathFlash > 0) deathFlash -= dt;

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Speed lines
    var speed = SCROLL_SPEED;
    for (var lx = ((-survived * speed) % 180 + 180) % 180; lx < W; lx += 180) {
      game.draw.rect(lx, 0, 60, H, '#0a1428', 0.4);
    }

    // Walls
    for (var wi = 0; wi < walls.length; wi++) {
      var wall = walls[wi];
      // Top wall
      game.draw.rect(wall.x, 0, WALL_W, wall.topH, C.wall);
      game.draw.rect(wall.x, wall.topH - 8, WALL_W, 8, C.wallHi);
      // Bottom wall
      game.draw.rect(wall.x, H - wall.botH, WALL_W, wall.botH, C.wall);
      game.draw.rect(wall.x, H - wall.botH, WALL_W, 8, C.wallHi);
    }

    // Trail
    for (var tri = 0; tri < trail.length; tri++) {
      var tr = trail[tri];
      var tf = 1 - tr.age / 0.35;
      game.draw.circle(tr.x, tr.y, PLAYER_R * tf * 0.8, C.trail, tf * 0.25);
    }

    // Player
    var pPulse = 0.7 + 0.3 * Math.abs(Math.sin(survived * 8));
    game.draw.circle(PLAYER_X, playerY, PLAYER_R + 8, C.playerHi, pPulse * 0.3);
    game.draw.circle(PLAYER_X, playerY, PLAYER_R, C.player);
    // Gravity indicator
    var arrowY = gravDir === 1 ? playerY + PLAYER_R + 20 : playerY - PLAYER_R - 20;
    game.draw.text(gravDir === 1 ? '▼' : '▲', PLAYER_X, arrowY, { size: 28, color: C.playerHi });

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x, part.y, 6 * part.life, C.player, part.life);
    }

    if (deathFlash > 0) {
      game.draw.rect(0, 0, W, H, C.wrong, deathFlash * 0.35);
    }

    // Survived + timer
    game.draw.text(Math.floor(survived) + 's', W / 2, 148, { size: 60, color: C.playerHi, bold: true });

    var ratio = Math.max(0, timeLeft / 20);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });

    game.draw.text('タップで重力反転', W / 2, H * 0.9, { size: 44, color: C.ui });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.35);
    spawnWall();
    spawnWall();
  });
})(game);
