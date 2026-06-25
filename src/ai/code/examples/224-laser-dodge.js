// 224-laser-dodge.js
// レーザードッジ — 回転するレーザーをタイミングよくかいくぐる瞬発力ゲーム
// 操作: タップで90度ジャンプ（内側↔外側の軌道を切り替え）
// 成功: 25秒生き残る  失敗: レーザーに当たる

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#040408',
    laser:  '#ef4444',
    laserHi:'#ff0000',
    player: '#22c55e',
    plrHi:  '#86efac',
    orbit1: '#1e2940',
    orbit2: '#2a1e40',
    warn:   '#f59e0b',
    ui:     '#475569'
  };

  var CX = W / 2;
  var CY = H * 0.48;
  var INNER_R = 150;
  var OUTER_R = 300;
  var PLAYER_R = 24;

  var playerAngle = 0;
  var playerOrbit = 0; // 0=inner, 1=outer
  var playerRadius = INNER_R;
  var survived = 0;
  var NEEDED = 25;
  var done = false;
  var elapsed = 0;

  // Lasers: each rotates at different speeds
  var lasers = [
    { angle: 0, speed: 1.2, width: 12, color: C.laser },
    { angle: Math.PI, speed: -0.9, width: 10, color: '#a855f7' },
    { angle: Math.PI / 2, speed: 0.7, width: 8, color: '#3b82f6' }
  ];
  // Add more lasers as time goes on
  var laserPhase = 0; // 0=1laser, 1=2lasers, 2=3lasers

  var jumpAnim = 0; // 0–1 when jumping between orbits
  var jumping = false;
  var jumpFrom = INNER_R;
  var jumpTo = OUTER_R;

  game.onTap(function(tx, ty) {
    if (done || jumping) return;
    // Toggle orbit
    playerOrbit = 1 - playerOrbit;
    jumpFrom = playerRadius;
    jumpTo = playerOrbit === 0 ? INNER_R : OUTER_R;
    jumpAnim = 0;
    jumping = true;
    game.audio.play('se_tap', 0.3);
  });

  function checkCollision() {
    var px = CX + Math.cos(playerAngle) * playerRadius;
    var py = CY + Math.sin(playerAngle) * playerRadius;

    var numLasers = laserPhase === 0 ? 1 : laserPhase === 1 ? 2 : 3;
    for (var li = 0; li < numLasers; li++) {
      var laser = lasers[li];
      // Laser extends from center to beyond outer orbit
      // Check if player is near the laser line
      var laserDirX = Math.cos(laser.angle);
      var laserDirY = Math.sin(laser.angle);
      // Project player onto laser direction
      var dx = px - CX, dy = py - CY;
      var cross = Math.abs(dx * laserDirY - dy * laserDirX);
      var proj = dx * laserDirX + dy * laserDirY;
      // Also check opposite direction
      var cross2 = Math.abs(dx * (-laserDirY) - dy * (-laserDirX));
      var proj2 = dx * (-laserDirX) + dy * (-laserDirY);

      if ((cross < PLAYER_R + laser.width / 2 && proj > 0 && proj < OUTER_R + 50) ||
          (cross2 < PLAYER_R + laser.width / 2 && proj2 > 0 && proj2 < OUTER_R + 50)) {
        return true;
      }
    }
    return false;
  }

  game.onUpdate(function(dt) {
    if (!done) {
      survived += dt;
      elapsed += dt;
      if (survived >= NEEDED) {
        done = true;
        game.audio.play('se_success');
        setTimeout(function() { game.end.success(Math.ceil(survived) * 80 + 500); }, 400);
        return;
      }

      // Increase difficulty
      laserPhase = survived < 8 ? 0 : survived < 16 ? 1 : 2;
    }

    // Player moves along orbit
    var orbitSpeed = 0.8 + survived * 0.02;
    playerAngle += orbitSpeed * dt;

    // Jump animation
    if (jumping) {
      jumpAnim += dt * 5;
      if (jumpAnim >= 1) {
        jumpAnim = 1;
        jumping = false;
        playerRadius = jumpTo;
      } else {
        playerRadius = jumpFrom + (jumpTo - jumpFrom) * jumpAnim;
      }
    }

    // Rotate lasers
    for (var li = 0; li < lasers.length; li++) {
      lasers[li].angle += lasers[li].speed * dt;
    }

    // Collision check
    if (!done && checkCollision()) {
      done = true;
      game.audio.play('se_failure');
      setTimeout(function() { game.end.failure(); }, 400);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Orbits
    for (var a = 0; a < Math.PI * 2; a += 0.04) {
      game.draw.circle(CX + Math.cos(a) * INNER_R, CY + Math.sin(a) * INNER_R, 3, C.orbit1, 0.5);
      game.draw.circle(CX + Math.cos(a) * OUTER_R, CY + Math.sin(a) * OUTER_R, 3, C.orbit2, 0.5);
    }

    // Center
    game.draw.circle(CX, CY, 30, '#1e1040', 0.9);
    game.draw.circle(CX, CY, 16, '#6d28d9', 0.7);

    // Lasers
    var numLasers = laserPhase === 0 ? 1 : laserPhase === 1 ? 2 : 3;
    for (var li2 = 0; li2 < numLasers; li2++) {
      var lsr = lasers[li2];
      var lEndX = CX + Math.cos(lsr.angle) * (OUTER_R + 60);
      var lEndY = CY + Math.sin(lsr.angle) * (OUTER_R + 60);
      var lEnd2X = CX + Math.cos(lsr.angle + Math.PI) * (OUTER_R + 60);
      var lEnd2Y = CY + Math.sin(lsr.angle + Math.PI) * (OUTER_R + 60);

      // Glow
      game.draw.line(CX, CY, lEndX, lEndY, lsr.color, lsr.width + 8);
      game.draw.line(CX, CY, lEnd2X, lEnd2Y, lsr.color, lsr.width + 8);
      // Core
      game.draw.line(CX, CY, lEndX, lEndY, '#fff', 3);
      game.draw.line(CX, CY, lEnd2X, lEnd2Y, '#fff', 3);
    }

    // Player
    var px = CX + Math.cos(playerAngle) * playerRadius;
    var py = CY + Math.sin(playerAngle) * playerRadius;
    game.draw.circle(px, py, PLAYER_R + 8, C.plrHi, 0.25);
    game.draw.circle(px, py, PLAYER_R, C.player, 0.9);
    game.draw.circle(px - 7, py - 7, 8, '#fff', 0.5);

    // Orbit label
    var orbitText = playerOrbit === 0 ? '内側' : '外側';
    game.draw.text('軌道: ' + orbitText, W / 2, H * 0.89, { size: 40, color: C.ui });
    game.draw.text('タップで軌道切替', W / 2, H * 0.93, { size: 36, color: C.ui });

    // Warning when laser approaching
    for (var li3 = 0; li3 < numLasers; li3++) {
      var lAngle = lasers[li3].angle % (Math.PI * 2);
      var pAngle = playerAngle % (Math.PI * 2);
      var diff = Math.abs(lAngle - pAngle) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      if (diff < 0.3) {
        game.draw.rect(0, 0, W, H, C.warn, 0.05 * (0.3 - diff) / 0.3);
      }
    }

    var ratio = Math.min(1, survived / NEEDED);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, '#22c55e');
    game.draw.text(survived.toFixed(1) + 's', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.25);
  });
})(game);
