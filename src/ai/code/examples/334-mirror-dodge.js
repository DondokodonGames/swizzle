// 334-mirror-dodge.js
// ミラードッジ — 鏡像で動く危険なボールを避ける
// 操作: スワイプで移動（左スワイプすると鏡の自分は右に動く）
// 成功: 30秒生存  失敗: 3回当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#060010',
    mirror: '#0d0020',
    mirrorLine:'#4c1d95',
    player: '#60a5fa',
    playerHi:'#bfdbfe',
    mirror_player:'#a78bfa',
    mirror_playerHi:'#c4b5fd',
    ball:   '#ef4444',
    ballHi: '#fca5a5',
    mball:  '#f97316',
    mballHi:'#fed7aa',
    hit:    '#fbbf24',
    ui:     '#475569',
    text:   '#f1f5f9'
  };

  var NEEDED_TIME = 30;
  var HALF_W = W / 2;

  // Player (left half)
  var playerX = W * 0.22;
  var playerY = H * 0.5;
  var PLAYER_R = 28;

  // Balls (left half)
  var balls = [];
  var spawnTimer = 0;
  var survived = 0;
  var hits = 0;
  var MAX_HITS = 3;
  var done = false;
  var timeLeft = 0;
  var elapsed = 0;
  var GOAL = NEEDED_TIME;
  var particles = [];
  var hitAnim = 0;
  var invincible = 0;

  function spawnBall() {
    var side = Math.random() < 0.5 ? -1 : 1;
    var spd = 160 + elapsed * 4;
    balls.push({
      x: HALF_W * 0.5,
      y: H * 0.2 + Math.random() * H * 0.6,
      vx: (Math.random() * spd + 60) * side,
      vy: (Math.random() - 0.5) * spd,
      r: 22
    });
  }

  game.onSwipe(function(dir) {
    if (done) return;
    var step = 140;
    if (dir === 'left') playerX = Math.max(PLAYER_R + 20, playerX - step);
    if (dir === 'right') playerX = Math.min(HALF_W - PLAYER_R - 20, playerX + step);
    if (dir === 'up') playerY = Math.max(PLAYER_R + 100, playerY - step);
    if (dir === 'down') playerY = Math.min(H - PLAYER_R - 60, playerY + step);
    game.audio.play('se_tap', 0.15);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      elapsed += dt;
      survived = elapsed;
      if (elapsed >= GOAL) { done = true; game.audio.play('se_success', 0.7); setTimeout(function() { game.end.success(Math.round(elapsed * 100) + (MAX_HITS - hits) * 500); }, 400); return; }
    }

    if (hitAnim > 0) hitAnim -= dt * 2;
    if (invincible > 0) invincible -= dt;

    spawnTimer -= dt;
    if (spawnTimer <= 0 && !done) {
      spawnBall();
      spawnTimer = 0.7 - Math.min(0.45, elapsed * 0.015);
    }

    // Mirror player position (mirrored = reflected across the center line)
    var mirrorX = W - playerX; // right half
    var mirrorY = playerY;

    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var b = balls[bi];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Bounce off walls (left half)
      if (b.x < b.r + 20) { b.x = b.r + 20; b.vx = Math.abs(b.vx); }
      if (b.x > HALF_W - b.r - 20) { b.x = HALF_W - b.r - 20; b.vx = -Math.abs(b.vx); }
      if (b.y < b.r + 100) { b.y = b.r + 100; b.vy = Math.abs(b.vy); }
      if (b.y > H - b.r - 60) { b.y = H - b.r - 60; b.vy = -Math.abs(b.vy); }

      // Collision with player
      if (invincible <= 0 && Math.hypot(b.x - playerX, b.y - playerY) < PLAYER_R + b.r) {
        hits++;
        hitAnim = 0.6;
        invincible = 1.5;
        game.audio.play('se_failure', 0.5);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: playerX, y: playerY, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200, life: 0.5, col: C.hit });
        }
        if (hits >= MAX_HITS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 400);
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

    // Left half background
    game.draw.rect(0, 0, HALF_W, H, '#060018', 0.5);
    // Right half (mirror world)
    game.draw.rect(HALF_W, 0, HALF_W, H, C.mirror, 0.9);

    // Mirror divider
    game.draw.line(HALF_W, 0, HALF_W, H, C.mirrorLine, 6);
    game.draw.line(HALF_W, 0, HALF_W, H, C.mirrorLine, 2);
    for (var ml = 0; ml < H; ml += 100) {
      game.draw.circle(HALF_W, ml + 50, 6, C.mirrorLine, 0.6);
    }

    // Left balls
    for (var bi2 = 0; bi2 < balls.length; bi2++) {
      var b2 = balls[bi2];
      game.draw.circle(b2.x, b2.y, b2.r + 6, C.ball, 0.2);
      game.draw.circle(b2.x, b2.y, b2.r, C.ball, 0.9);
      // Mirror ball (reflected)
      var mbx = W - b2.x;
      game.draw.circle(mbx, b2.y, b2.r + 6, C.mball, 0.15);
      game.draw.circle(mbx, b2.y, b2.r, C.mball, 0.7);
    }

    // Player
    var pAlpha = invincible > 0 ? (Math.sin(elapsed * 20) * 0.4 + 0.5) : 0.9;
    game.draw.circle(playerX, playerY, PLAYER_R + 8, C.playerHi, 0.2 * pAlpha);
    game.draw.circle(playerX, playerY, PLAYER_R, C.player, pAlpha);
    game.draw.circle(playerX - 8, playerY - 8, 8, C.playerHi, 0.6 * pAlpha);

    // Mirror player
    var mpx = W - playerX;
    game.draw.circle(mpx, mirrorY, PLAYER_R + 8, C.mirror_playerHi, 0.2 * pAlpha);
    game.draw.circle(mpx, mirrorY, PLAYER_R, C.mirror_player, pAlpha * 0.8);
    game.draw.circle(mpx + 8, mirrorY - 8, 8, C.mirror_playerHi, 0.5 * pAlpha);

    // Hit flash
    if (hitAnim > 0) {
      game.draw.rect(0, 0, W, H, C.ball, hitAnim * 0.2);
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life * 2, p.col, p.life * 0.8);
    }

    // Hit dots
    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 28 + hi * 56, H * 0.92, 16, hi < hits ? C.ball : '#060010');
    }

    // Time progress
    var ratio = Math.min(1, elapsed / GOAL);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio < 0.7 ? C.player : C.hit);
    game.draw.text(Math.ceil(GOAL - elapsed) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text(Math.floor(elapsed) + 's / ' + GOAL + 's', W / 2, 148, { size: 52, color: C.text, bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    spawnTimer = 0.5;
  });
})(game);
