// 437-tug-war.js
// 綱引き — 連打でロープを自分側に引き寄せる
// 操作: 素早くタップしてパワーを溜める
// 成功: ロープを自分側に5メートル引き込む  失敗: 相手に引き込まれる or 30秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#0a0500',
    ground: '#1a0c00',
    groundHi:'#2d1a00',
    rope:   '#d97706',
    ropeHi: '#fbbf24',
    ropeLo: '#92400e',
    player: '#3b82f6',
    playerHi:'#93c5fd',
    enemy:  '#ef4444',
    enemyHi:'#fca5a5',
    marker: '#22c55e',
    markerHi:'#86efac',
    danger: '#ef4444',
    power:  '#22c55e',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var ropeOffset = 0;  // positive = player winning, negative = enemy winning
  var WIN_DIST = 200;  // pixels to win
  var ropeVelocity = 0;

  var playerPower = 0;
  var MAX_POWER = 100;
  var tapCount = 0;
  var lastTapTime = 0;
  var tapCooldown = 0;

  var done = false;
  var timeLeft = 30;
  var elapsed = 0;
  var flashAnim = 0;
  var flashCol = C.power;
  var particles = [];
  var bgDust = [];
  for (var i = 0; i < 8; i++) {
    bgDust.push({ x: Math.random()*W, y: H*0.6 + Math.random()*H*0.2, size: 3+Math.random()*8, alpha: 0.1+Math.random()*0.2 });
  }

  var CY = H * 0.55;  // rope Y
  var PLAYER_X = W * 0.22;
  var ENEMY_X = W * 0.78;

  game.onTap(function(tx, ty) {
    if (done) return;
    if (tapCooldown > 0) return;

    tapCooldown = 0.05;
    tapCount++;
    playerPower = Math.min(MAX_POWER, playerPower + 8);
    ropeVelocity += 15;
    game.audio.play('se_tap', 0.2);

    // Sweat/effort particles
    particles.push({ x: PLAYER_X, y: CY - 80, vx: -50 - Math.random()*50, vy: -80 - Math.random()*40, life: 0.4, col: C.playerHi });
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

    if (flashAnim > 0) flashAnim -= dt * 2;
    if (tapCooldown > 0) tapCooldown -= dt;

    // Enemy AI — constant pull with increasing power over time
    var enemyForce = 8 + elapsed * 0.4;
    ropeVelocity -= enemyForce * dt * 60;

    // Power decay
    playerPower *= (1 - dt * 3);
    if (playerPower < 0) playerPower = 0;

    // Rope physics
    ropeVelocity *= (1 - dt * 4);
    ropeOffset += ropeVelocity * dt;

    // Check win/lose
    if (ropeOffset >= WIN_DIST && !done) {
      done = true;
      flashCol = C.power;
      flashAnim = 1.0;
      game.audio.play('se_success', 0.9);
      for (var pi = 0; pi < 20; pi++) {
        var ang = Math.random() * Math.PI * 2;
        particles.push({ x: W/2 + ropeOffset, y: CY, vx: Math.cos(ang)*250, vy: Math.sin(ang)*250-150, life: 0.9, col: C.ropeHi });
      }
      setTimeout(function() { game.end.success(Math.ceil(timeLeft) * 200 + tapCount * 10); }, 800);
    } else if (ropeOffset <= -WIN_DIST && !done) {
      done = true;
      flashCol = C.danger;
      flashAnim = 1.0;
      game.audio.play('se_failure', 0.8);
      setTimeout(function() { game.end.failure(); }, 600);
    }

    for (var pp = particles.length-1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Ground
    game.draw.rect(0, H*0.6, W, H*0.4, C.ground, 0.9);
    game.draw.line(0, H*0.6, W, H*0.6, C.groundHi, 4);

    // Win markers
    var centerX = W / 2;
    var markerL = centerX - WIN_DIST;
    var markerR = centerX + WIN_DIST;
    game.draw.line(markerR, H*0.45, markerR, H*0.65, C.player, 5);
    game.draw.text('⊳', markerR, H*0.44, { size: 36, color: C.player });
    game.draw.line(markerL, H*0.45, markerL, H*0.65, C.enemy, 5);
    game.draw.text('⊲', markerL, H*0.44, { size: 36, color: C.enemy });

    // Center line
    var ropeCenter = centerX + ropeOffset;
    game.draw.line(ropeCenter, H*0.47, ropeCenter, H*0.63, C.marker, 6);
    game.draw.circle(ropeCenter, CY, 20, C.markerHi, 0.8);

    // Rope (horizontal line across screen)
    var segments = 20;
    for (var ri = 0; ri < segments; ri++) {
      var rx1 = PLAYER_X + ropeOffset + (W * 0.56 / segments) * ri;
      var rx2 = rx1 + W * 0.56 / segments;
      var ry = CY + Math.sin((ri / segments + elapsed*2) * Math.PI * 2) * 8;
      var ropCol = ri % 2 === 0 ? C.rope : C.ropeLo;
      game.draw.line(rx1, ry, rx2, ry, ropCol, 14);
    }
    // Rope ends
    game.draw.line(PLAYER_X - 100 + ropeOffset, CY, PLAYER_X + ropeOffset, CY, C.rope, 14);
    game.draw.line(ENEMY_X + ropeOffset, CY, ENEMY_X + 100 + ropeOffset, CY, C.rope, 14);

    // Enemy character
    var eX = ENEMY_X;
    var eLean = 0.3;
    game.draw.circle(eX, CY - 90, 42, C.enemy, 0.9);
    game.draw.circle(eX - 12, CY - 96, 16, C.enemyHi, 0.5);
    game.draw.rect(eX - 36, CY - 48, 72, 48, C.enemy, 0.8);
    // Legs in tug stance
    game.draw.line(eX - 16, CY, eX - 30, CY + 60, C.enemyHi, 10);
    game.draw.line(eX + 16, CY, eX + 30, CY + 60, C.enemyHi, 10);
    // Rope grip arms
    game.draw.line(eX - 36, CY - 24, eX - 70 + ropeOffset*0.5, CY + 4, C.enemyHi, 10);

    // Player character
    var pX = PLAYER_X;
    var pLean = playerPower / MAX_POWER * 0.4;
    game.draw.circle(pX, CY - 90, 42, C.player, 0.9);
    game.draw.circle(pX - 12, CY - 98, 16, C.playerHi, 0.5);
    game.draw.rect(pX - 36, CY - 48, 72, 48, C.player, 0.8);
    // Legs
    game.draw.line(pX - 16, CY, pX - 30, CY + 60, C.playerHi, 10);
    game.draw.line(pX + 16, CY, pX + 30, CY + 60, C.playerHi, 10);
    // Arms
    game.draw.line(pX + 36, CY - 24, pX + 70 + ropeOffset*0.5, CY + 4, C.playerHi, 10);

    // Power bar
    var pRatio = playerPower / MAX_POWER;
    game.draw.rect(W*0.06, H*0.72, W*0.35, 30, '#0a0800', 0.8);
    game.draw.rect(W*0.06, H*0.72, W*0.35 * pRatio, 30, C.power, 0.85);
    game.draw.text('パワー', W*0.06 + 10, H*0.72 - 26, { size: 32, color: C.power });

    // Tap count
    game.draw.text('連打！', W/2, H*0.78, { size: 56, color: C.ropeHi, bold: true });

    // Offset indicator
    var offsetRatio = ropeOffset / WIN_DIST;
    var barCol = offsetRatio > 0 ? C.player : C.enemy;
    game.draw.rect(W*0.15, H*0.83, W*0.7, 20, '#1a0c00', 0.8);
    game.draw.rect(W*0.5, H*0.83, W*0.35 * offsetRatio, 20, barCol, 0.85);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 8 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    game.draw.text(Math.ceil(timeLeft) + '秒', W/2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 30);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.rope : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W/2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.12);
  });
})(game);
