// 777-laser-dodge.js
// レーザードッジ — 回転するレーザーをタップで跳び越えろ
// 操作: タップでジャンプ（レーザーが来る前に）
// 成功: 40回回避  失敗: 6回被弾 or 90秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#040108',
    laser:   '#ef4444',
    laserHi: '#fca5a5',
    laserGlow:'#7f1d1d',
    player:  '#38bdf8',
    playerHi:'#e0f2fe',
    ground:  '#1e293b',
    groundHi:'#334155',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060110'
  };

  var GROUND_Y = H * 0.72;
  var PLAYER_X = W * 0.3;
  var PLAYER_R = 36;
  var playerY = GROUND_Y;
  var playerVy = 0;
  var onGround = true;
  var GRAVITY = 1800;
  var JUMP_V = -900;

  // Laser: rotates from center, sweeps at GROUND_Y height
  var LASER_CX = W * 0.6;
  var LASER_CY = GROUND_Y;
  var LASER_LEN = W;
  var laserAngle = Math.PI; // starts pointing left
  var laserSpeed = 1.2; // rad/sec

  var score = 0;
  var NEEDED = 40;
  var hits = 0;
  var MAX_HITS = 6;
  var done = false;
  var timeLeft = 90;
  var elapsed = 0;

  var trail = [];
  var particles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var hitCooldown = 0;
  var lastLaserCross = false; // was laser pointing at player last frame?

  // Background stars
  var stars = [];
  for (var si = 0; si < 30; si++) {
    stars.push({ x: Math.random() * W, y: Math.random() * GROUND_Y * 0.9 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    if (onGround) {
      playerVy = JUMP_V;
      onGround = false;
      game.audio.play('se_tap', 0.09);
      for (var p = 0; p < 3; p++) {
        var pa = -Math.PI * 0.6 + Math.random() * Math.PI * 0.2;
        particles.push({ x: PLAYER_X, y: GROUND_Y, vx: Math.cos(pa) * 80, vy: Math.sin(pa) * 80 - 60, life: 0.28, col: C.playerHi });
      }
    }
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

    // Player physics
    if (!onGround) {
      playerVy += GRAVITY * dt;
      playerY += playerVy * dt;
      if (playerY >= GROUND_Y) {
        playerY = GROUND_Y;
        playerVy = 0;
        onGround = true;
      }
    }

    // Trail
    trail.push({ x: PLAYER_X, y: playerY, life: 0.3 });
    for (var ti = trail.length - 1; ti >= 0; ti--) {
      trail[ti].life -= dt * 4;
      if (trail[ti].life <= 0) trail.splice(ti, 1);
    }

    // Laser rotation
    laserSpeed = Math.min(3.2, 1.2 + score * 0.04);
    laserAngle += laserSpeed * dt;
    if (laserAngle > Math.PI * 2) laserAngle -= Math.PI * 2;

    // Laser endpoint
    var laserEndX = LASER_CX + Math.cos(laserAngle) * LASER_LEN;
    var laserEndY = LASER_CY + Math.sin(laserAngle) * LASER_LEN;

    // Check if laser crosses player position
    // Laser is at ground level when angle is near 0 or PI (pointing horizontal)
    // More precisely: check if laser beam at x=PLAYER_X has y near GROUND_Y
    var laserAtPlayerX = false;
    if (Math.abs(Math.cos(laserAngle)) > 0.01) {
      var t = (PLAYER_X - LASER_CX) / (Math.cos(laserAngle) * LASER_LEN);
      if (t >= 0 && t <= 1) {
        var laserYAtPlayer = LASER_CY + Math.sin(laserAngle) * LASER_LEN * t;
        if (Math.abs(laserYAtPlayer - GROUND_Y) < 20) {
          laserAtPlayerX = true;
        }
      }
    }

    // Collision detection
    if (hitCooldown > 0) hitCooldown -= dt;

    if (laserAtPlayerX && hitCooldown <= 0) {
      // Player must be jumping to avoid
      var playerAboveGround = playerY < GROUND_Y - PLAYER_R * 1.5;
      if (!playerAboveGround) {
        // Hit!
        hits++;
        hitCooldown = 1.0;
        flashCol = C.wrong;
        flashAnim = 0.45;
        resultText = '被弾！！';
        resultTimer = 0.5;
        game.audio.play('se_failure', 0.4);
        for (var pe = 0; pe < 6; pe++) {
          var pea = Math.random() * Math.PI * 2;
          particles.push({ x: PLAYER_X, y: playerY, vx: Math.cos(pea) * 200, vy: Math.sin(pea) * 200, life: 0.4, col: C.laser });
        }
        if (hits >= MAX_HITS && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 600);
        }
      } else if (!lastLaserCross) {
        // Avoided!
        score++;
        flashCol = C.correct;
        flashAnim = 0.15;
        resultText = '回避！';
        resultTimer = 0.28;
        game.audio.play('se_tap', 0.07);
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 320 + Math.ceil(timeLeft) * 130); }, 700);
        }
      }
    }
    lastLaserCross = laserAtPlayerX;

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 500 * dt;
      particles[pp].life -= dt * 2.8;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Stars
    for (var sti = 0; sti < stars.length; sti++) {
      game.draw.circle(stars[sti].x, stars[sti].y, 2, '#fff', 0.25 + 0.15 * Math.sin(elapsed * 2 + sti));
    }

    // Ground
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 1.0);
    game.draw.rect(0, GROUND_Y, W, 10, C.groundHi, 0.5);

    // Laser
    var lx2 = LASER_CX + Math.cos(laserAngle) * LASER_LEN;
    var ly2 = LASER_CY + Math.sin(laserAngle) * LASER_LEN;
    // Glow
    game.draw.line(LASER_CX, LASER_CY, lx2, ly2, C.laserGlow, 28);
    game.draw.line(LASER_CX, LASER_CY, lx2, ly2, C.laserHi, 6);
    game.draw.line(LASER_CX, LASER_CY, lx2, ly2, '#fff', 2);
    // Origin
    game.draw.circle(LASER_CX, LASER_CY, 18, C.laser, 0.9);
    game.draw.circle(LASER_CX, LASER_CY, 10, '#fff', 0.7);

    // Trail
    for (var tri = 0; tri < trail.length; tri++) {
      var tr2 = trail[tri];
      game.draw.circle(tr2.x, tr2.y, PLAYER_R * 0.5 * tr2.life, C.player, tr2.life * 0.3);
    }

    // Player
    var shake = (hitCooldown > 0.7) ? Math.sin(elapsed * 35) * 8 : 0;
    game.draw.circle(PLAYER_X + shake + 3, playerY + 3, PLAYER_R, '#000', 0.3);
    game.draw.circle(PLAYER_X + shake, playerY, PLAYER_R, C.player, 0.92);
    game.draw.circle(PLAYER_X + shake - 10, playerY - 12, 12, C.playerHi, 0.45);
    if (!onGround) {
      game.draw.text('↑', PLAYER_X + shake, playerY - PLAYER_R - 24, { size: 36, color: C.playerHi, bold: true });
    }

    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p2 = particles[pp2];
      game.draw.circle(p2.x, p2.y, 9 * p2.life, p2.col, p2.life);
    }

    if (onGround && !done) {
      game.draw.text('タップでジャンプ！', W / 2, H * 0.83, { size: 38, color: C.text + '44' });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.09);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.17, { size: 52, color: flashCol, bold: true });
    }

    for (var hi = 0; hi < MAX_HITS; hi++) {
      game.draw.circle(W / 2 - (MAX_HITS - 1) * 64 + hi * 128, H * 0.955, 24, hi < hits ? C.wrong : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 90);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
