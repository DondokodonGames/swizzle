// 603-earthquake.js
// アースクエイク — 揺れる大地でバランスを保いながら逃げろ
// 操作: 左右スワイプで傾く地面に合わせて反対に体重移動
// 成功: 20秒間バランス維持  失敗: 3回転落 or 20秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#150a00',
    ground:  '#3a2000',
    groundHi:'#5a3010',
    crack:   '#221000',
    player:  '#44aaff',
    playerHi:'#88ddff',
    danger:  '#ef4444',
    safe:    '#22c55e',
    dust:    '#88660044',
    text:    '#f1f5f9',
    ui:      '#2a1800'
  };

  var SURVIVE_TIME = 20;
  var PLAT_W = W * 0.7;
  var PLAT_H = 40;
  var PLAT_CX = W / 2;
  var PLAT_Y = H * 0.65;
  var PIVOT_X = PLAT_CX;
  var PIVOT_Y = PLAT_Y;

  var platformAngle = 0;
  var platformAngVel = 0;
  var SHAKE_PERIOD = 1.5;
  var shakeTimer = 0;
  var shakeTarget = 0;
  var SHAKE_AMP = 0.5; // radians

  // Player
  var playerRelX = 0; // position along platform (-0.5 to 0.5 normalized)
  var playerVelX = 0;
  var PLAYER_R = 28;
  var playerGrounded = true;
  var playerY = PLAT_Y - PLAYER_R - PLAT_H / 2;
  var playerActualX = PLAT_CX;
  var falls = 0;
  var MAX_FALLS = 3;
  var invincible = 0;

  var survived = 0;
  var done = false;
  var elapsed = 0;
  var timeLeft = SURVIVE_TIME;
  var particles = [];
  var flashAnim = 0, flashCol = C.danger;
  var hitFlash = 0;
  var cracks = [];
  var dustParticles = [];

  game.onSwipe(function(dir) {
    if (done) return;
    if (dir === 'left') playerVelX -= 180;
    else if (dir === 'right') playerVelX += 180;
    game.audio.play('se_tap', 0.15);
  });

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tx < W / 2) playerVelX -= 120;
    else playerVelX += 120;
    game.audio.play('se_tap', 0.1);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(SURVIVE_TIME * 100 + (MAX_FALLS - falls) * 400); }, 700);
        return;
      }
    }
    if (flashAnim > 0) flashAnim -= dt * 3;
    if (hitFlash > 0) hitFlash -= dt * 3;
    if (invincible > 0) invincible -= dt;

    // Earthquake shake
    shakeTimer += dt;
    if (shakeTimer > SHAKE_PERIOD) {
      shakeTimer = 0;
      shakeTarget = (Math.random() - 0.5) * SHAKE_AMP * 2;
      SHAKE_PERIOD = 0.8 + Math.random() * 0.8;
      // Add crack effect
      if (Math.random() < 0.5) {
        cracks.push({ x: (Math.random() - 0.5) * PLAT_W, life: 1.5 });
      }
    }
    // Lerp platform angle toward target
    platformAngVel += (shakeTarget - platformAngle) * 4 * dt;
    platformAngVel *= 0.92;
    platformAngle += platformAngVel * dt;
    platformAngle = Math.max(-SHAKE_AMP * 1.2, Math.min(SHAKE_AMP * 1.2, platformAngle));

    // Update cracks
    for (var ci = cracks.length - 1; ci >= 0; ci--) {
      cracks[ci].life -= dt;
      if (cracks[ci].life <= 0) cracks.splice(ci, 1);
    }

    // Gravity on player (slides toward low end of platform)
    var gravEffect = Math.sin(platformAngle) * 400; // force pushing player downhill
    playerVelX += gravEffect * dt;
    playerVelX *= 0.88; // friction
    playerRelX += playerVelX * dt / (PLAT_W / 2);
    playerRelX = Math.max(-1, Math.min(1, playerRelX));

    // Compute player world position
    var localX = playerRelX * PLAT_W / 2;
    var cosA = Math.cos(platformAngle), sinA = Math.sin(platformAngle);
    playerActualX = PIVOT_X + localX * cosA - (PLAT_H / 2 + PLAYER_R) * (-sinA);
    playerY = PIVOT_Y + localX * sinA + (PLAT_H / 2 + PLAYER_R) * cosA;

    // Dust particles
    if (Math.random() < 0.2) {
      dustParticles.push({
        x: PIVOT_X + (Math.random() - 0.5) * PLAT_W,
        y: PLAT_Y + PLAT_H / 2,
        vx: (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 30,
        life: 0.5
      });
    }
    for (var di = dustParticles.length - 1; di >= 0; di--) {
      dustParticles[di].x += dustParticles[di].vx * dt;
      dustParticles[di].y += dustParticles[di].vy * dt;
      dustParticles[di].life -= dt * 2;
      if (dustParticles[di].life <= 0) dustParticles.splice(di, 1);
    }

    // Fall check
    if (Math.abs(playerRelX) >= 1 && invincible <= 0) {
      falls++;
      invincible = 1.5;
      hitFlash = 0.5;
      flashCol = C.danger;
      flashAnim = 0.4;
      playerRelX = 0;
      playerVelX = 0;
      game.audio.play('se_failure', 0.5);
      for (var pi = 0; pi < 8; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: playerActualX, y: playerY, vx: Math.cos(ang) * 180, vy: Math.sin(ang) * 180, life: 0.4, col: C.playerHi });
      }
      if (falls >= MAX_FALLS && !done) {
        done = true;
        game.audio.play('se_failure', 0.7);
        setTimeout(function() { game.end.failure(); }, 600);
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt * 2.5;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Background shake effect
    var shakeX = Math.sin(elapsed * 12) * 8 * Math.abs(platformAngle);
    game.draw.rect(0 + shakeX, H * 0.8, W, H * 0.2, C.ground, 0.6);

    // Dust
    for (var di2 = 0; di2 < dustParticles.length; di2++) {
      var dp = dustParticles[di2];
      game.draw.circle(dp.x + shakeX, dp.y, 12 * dp.life, C.dust.slice(0, 7), dp.life * 0.3);
    }

    // Platform (rotated)
    var cosA2 = Math.cos(platformAngle), sinA2 = Math.sin(platformAngle);
    var hw = PLAT_W / 2, hh = PLAT_H / 2;
    // Draw platform as rectangle with shadow
    var corners = [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]];
    for (var ri = 0; ri < 3; ri++) {
      var c1 = corners[ri], c2 = corners[ri + 1];
      var x1 = PIVOT_X + c1[0] * cosA2 - c1[1] * sinA2;
      var y1 = PIVOT_Y + c1[0] * sinA2 + c1[1] * cosA2;
      var x2 = PIVOT_X + c2[0] * cosA2 - c2[1] * sinA2;
      var y2 = PIVOT_Y + c2[0] * sinA2 + c2[1] * cosA2;
      game.draw.line(x1, y1, x2, y2, C.groundHi, 8);
    }
    // Top face
    var t1 = corners[0], t2 = corners[1];
    var tx1 = PIVOT_X + t1[0] * cosA2 - t1[1] * sinA2;
    var ty1 = PIVOT_Y + t1[0] * sinA2 + t1[1] * cosA2;
    var tx2 = PIVOT_X + t2[0] * cosA2 - t2[1] * sinA2;
    var ty2 = PIVOT_Y + t2[0] * sinA2 + t2[1] * cosA2;
    game.draw.line(tx1, ty1, tx2, ty2, C.groundHi, 10);

    // Cracks on platform
    for (var ci2 = 0; ci2 < cracks.length; ci2++) {
      var cr = cracks[ci2];
      var crWX = PIVOT_X + cr.x * cosA2;
      var crWY = PIVOT_Y + cr.x * sinA2;
      game.draw.line(crWX - 10, crWY - 5, crWX + 10, crWY + 5, C.crack, 3);
    }

    // Player
    var pCol = hitFlash > 0 ? C.danger : C.player;
    var pAlpha = (invincible > 0 && Math.floor(elapsed * 8) % 2 === 0) ? 0.3 : 0.9;
    game.draw.circle(playerActualX + 4, playerY + 4, PLAYER_R, '#000', 0.3);
    game.draw.circle(playerActualX, playerY, PLAYER_R, pCol, pAlpha);
    game.draw.circle(playerActualX - 8, playerY - 8, PLAYER_R * 0.3, C.playerHi, 0.5 * pAlpha);

    // Balance indicator
    var balanceRatio = playerRelX;
    game.draw.rect(W / 2 - 80, H * 0.12 - 8, 160, 16, C.ui, 0.5);
    game.draw.circle(W / 2 + balanceRatio * 80, H * 0.12, 12, Math.abs(balanceRatio) > 0.6 ? C.danger : C.safe, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.danger, hitFlash * 0.08);

    // Fall dots
    for (var fi = 0; fi < MAX_FALLS; fi++) {
      game.draw.circle(W / 2 - (MAX_FALLS - 1) * 80 + fi * 160, H * 0.955, 28, fi < falls ? C.danger : C.safe, 0.9);
    }

    var ratio = Math.max(0, timeLeft / SURVIVE_TIME);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.safe : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '秒', W / 2, 36, { size: 44, color: '#fff', bold: true });
    game.draw.text('バランスを保て!', W / 2, 80, { size: 36, color: ratio > 0.3 ? C.safe : C.danger });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
  });
})(game);
