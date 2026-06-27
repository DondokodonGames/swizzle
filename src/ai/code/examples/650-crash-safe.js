// 650-crash-safe.js
// クラッシュセーフ — 迫り来る壁の隙間をくぐり抜けろ
// 操作: タップで上下に移動
// 成功: 20枚突破  失敗: 3回衝突 or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040208',
    wall:    '#7c3aed',
    wallHi:  '#a78bfa',
    wallDark:'#4c1d95',
    player:  '#fbbf24',
    playerHi:'#fef3c7',
    hit:     '#ef4444',
    safe:    '#22c55e',
    text:    '#f1f5f9',
    ui:      '#070413',
    trail:   '#fbbf2444'
  };

  var PLAYER_X = W * 0.22;
  var playerY = H / 2;
  var targetY = H / 2;
  var PLAYER_R = 36;
  var MOVE_STEP = 220;

  var walls = [];
  var GAP_H = 280;
  var passed = 0;
  var NEEDED = 20;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var spawnTimer = 0;
  var wallSpeed = 380;
  var invincible = 0;
  var particles = [];
  var trail = [];
  var flashAnim = 0;

  function spawnWall() {
    var gapY = PLAYER_R * 2 + Math.random() * (H - GAP_H - PLAYER_R * 4);
    walls.push({
      x: W + 80,
      gapY: gapY,
      passed: false
    });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    targetY = ty < H / 2 ? Math.max(PLAYER_R + 60, playerY - MOVE_STEP) : Math.min(H - PLAYER_R - 60, playerY + MOVE_STEP);
    game.audio.play('se_tap', 0.1);
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
    if (flashAnim > 0) flashAnim -= dt * 4;
    if (invincible > 0) invincible -= dt;

    // Smooth vertical movement
    playerY += (targetY - playerY) * Math.min(1, dt * 14);

    // Trail
    trail.push({ x: PLAYER_X, y: playerY });
    if (trail.length > 12) trail.shift();

    wallSpeed = 380 + elapsed * 5 + passed * 8;

    spawnTimer += dt;
    if (spawnTimer >= 1.4) {
      spawnTimer = 0;
      spawnWall();
    }

    // Update walls
    for (var wi = walls.length - 1; wi >= 0; wi--) {
      var w = walls[wi];
      w.x -= wallSpeed * dt;

      // Check pass
      if (!w.passed && w.x + 40 < PLAYER_X - PLAYER_R) {
        w.passed = true;
        passed++;
        game.audio.play('se_success', 0.3);
        if (passed >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(passed * 300 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }

      // Collision check
      if (invincible <= 0 && w.x - 30 < PLAYER_X + PLAYER_R && w.x + 30 > PLAYER_X - PLAYER_R) {
        var inGap = playerY + PLAYER_R > w.gapY && playerY - PLAYER_R < w.gapY + GAP_H;
        if (!inGap) {
          hits++;
          invincible = 1.2;
          flashAnim = 0.5;
          game.audio.play('se_failure', 0.5);
          for (var p = 0; p < 8; p++) {
            var pa = Math.random() * Math.PI * 2;
            particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(pa) * 250, vy: Math.sin(pa) * 250, life: 0.5, col: C.playerHi });
          }
          if (hits >= MAX_HITS && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          }
        }
      }

      if (w.x < -100) walls.splice(wi, 1);
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Speed lines background
    for (var sl = 0; sl < 8; sl++) {
      var slY = (sl / 8) * H + (elapsed * 200) % (H / 8);
      game.draw.line(0, slY, W, slY, '#ffffff', 1);
    }

    // Walls
    for (var wi2 = 0; wi2 < walls.length; wi2++) {
      var w2 = walls[wi2];
      // Top wall
      game.draw.rect(w2.x - 30, 0, 60, w2.gapY, C.wallDark, 0.9);
      game.draw.rect(w2.x - 30, 0, 60, w2.gapY, C.wall, 0.8);
      game.draw.rect(w2.x - 30, 0, 10, w2.gapY, C.wallHi, 0.4);
      game.draw.rect(w2.x - 30, w2.gapY - 10, 60, 10, C.wallHi, 0.5);
      // Bottom wall
      var botY = w2.gapY + GAP_H;
      game.draw.rect(w2.x - 30, botY, 60, H - botY, C.wallDark, 0.9);
      game.draw.rect(w2.x - 30, botY, 60, H - botY, C.wall, 0.8);
      game.draw.rect(w2.x - 30, botY, 10, H - botY, C.wallHi, 0.4);
      game.draw.rect(w2.x - 30, botY, 60, 10, C.wallHi, 0.5);
    }

    // Player trail
    for (var ti = 0; ti < trail.length; ti++) {
      var talpha = (ti / trail.length) * 0.4;
      game.draw.circle(trail[ti].x, trail[ti].y, PLAYER_R * (ti / trail.length) * 0.6, C.player, talpha);
    }

    // Player
    var alpha = (invincible > 0 && Math.floor(elapsed * 10) % 2 === 0) ? 0.3 : 0.9;
    game.draw.circle(PLAYER_X + 5, playerY + 5, PLAYER_R, '#000', 0.3);
    game.draw.circle(PLAYER_X, playerY, PLAYER_R, C.player, alpha);
    game.draw.circle(PLAYER_X - 12, playerY - 12, PLAYER_R * 0.3, C.playerHi, alpha * 0.6);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 10 * p2.life, p2.col, p2.life);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, C.hit, flashAnim * 0.1);

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 60 + hi * 120, H * 0.955, 24, hi < hits ? C.hit : C.ui, 0.9);
    }

    game.draw.text(passed + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.hit);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.06);
    spawnWall();
    spawnWall();
  });
})(game);
