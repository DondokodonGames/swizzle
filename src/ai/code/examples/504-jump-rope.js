// 504-jump-rope.js
// なわとび — 回転するロープに合わせてタップでジャンプ！
// 操作: ロープが足元を通る瞬間にタップ（タイミングゲーム）
// 成功: 30回連続ジャンプ  失敗: 5回引っかかる or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#050510',
    ground: '#0f172a',
    rope:   '#f59e0b',
    ropeHi: '#fef08a',
    player: '#22c55e',
    playerHi:'#86efac',
    danger: '#ef4444',
    safe:   '#22c55e',
    shadow: '#3b82f6',
    text:   '#f1f5f9',
    ui:     '#374151'
  };

  var GROUND_Y = H * 0.78;
  var CX = W / 2;
  var ropeAngle = 0;
  var ropeSpeed = 2.2; // rotations per second
  var ropeLen = 280;

  var player = { x: CX, y: GROUND_Y - 60, vy: 0, jumping: false };
  var JUMP_VY = -700;
  var GRAVITY = 1800;

  var jumps = 0;
  var NEEDED = 30;
  var hits = 0;
  var MAX_HIT = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var hitFlash = 0;
  var jumpWindow = false; // safe to jump
  var lastRopeBottom = false; // was rope at bottom last frame
  var combo = 0;
  var comboText = '';
  var comboLife = 0;

  game.onTap(function(tx, ty) {
    if (done) return;
    if (!player.jumping) {
      player.vy = JUMP_VY;
      player.jumping = true;
      game.audio.play('se_tap', 0.4);
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

    if (hitFlash > 0) hitFlash -= dt * 3;
    if (comboLife > 0) comboLife -= dt * 2;

    // Rope rotation
    ropeAngle += ropeSpeed * Math.PI * 2 * dt;
    // Speed increases with jumps
    ropeSpeed = 2.2 + jumps * 0.04;

    // Rope bottom point
    var ropeBottomY = GROUND_Y + Math.sin(ropeAngle) * ropeLen * 0.35;
    var isRopeBottom = (Math.sin(ropeAngle) > 0.7); // rope is at bottom
    var ropeX = CX + Math.cos(ropeAngle) * 30;

    // Player physics
    if (player.jumping) {
      player.vy += GRAVITY * dt;
      player.y += player.vy * dt;
      if (player.y >= GROUND_Y - 60) {
        player.y = GROUND_Y - 60;
        player.vy = 0;
        player.jumping = false;
      }
    }

    // Check collision: rope sweeps through ground
    var ropeAtGround = (Math.sin(ropeAngle) > 0.85);
    if (ropeAtGround && !lastRopeBottom) {
      // Rope just hit ground
      if (!player.jumping) {
        // Player didn't jump — hit!
        hits++;
        hitFlash = 0.7;
        combo = 0;
        game.audio.play('se_failure', 0.5);
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150 - 100, life: 0.4, col: C.danger });
        }
        if (hits >= MAX_HIT && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      } else {
        // Successful jump!
        jumps++;
        combo++;
        if (combo >= 5) {
          comboText = combo + '連続！';
          comboLife = 0.8;
          game.audio.play('se_success', 0.5);
        }
        for (var pi2 = 0; pi2 < 4; pi2++) {
          var ang2 = Math.random() * Math.PI * 2;
          particles.push({ x: player.x, y: GROUND_Y, vx: Math.cos(ang2) * 100, vy: Math.sin(ang2) * 80 - 60, life: 0.3, col: C.ropeHi });
        }
        if (jumps >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(jumps * 200 + combo * 100 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    }
    lastRopeBottom = ropeAtGround;

    // Particles
    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // --- draw ---
    game.draw.rect(0, 0, W, H, C.bg);
    game.draw.rect(0, GROUND_Y, W, H - GROUND_Y, C.ground, 0.9);

    // Rope
    var steps = 20;
    var r1x = CX - ropeLen / 2;
    var r2x = CX + ropeLen / 2;
    var prevRx = r1x, prevRy = GROUND_Y;
    for (var ri = 0; ri <= steps; ri++) {
      var t = ri / steps;
      var ropePx = r1x + (r2x - r1x) * t;
      var ropePy = GROUND_Y + Math.sin(ropeAngle + t * Math.PI) * (ropeLen * 0.4);
      if (ri > 0) {
        game.draw.line(prevRx, prevRy, ropePx, ropePy, C.rope, 8);
      }
      prevRx = ropePx; prevRy = ropePy;
    }
    // Rope endpoints
    game.draw.circle(r1x, GROUND_Y, 20, C.ropeHi, 0.8);
    game.draw.circle(r2x, GROUND_Y, 20, C.ropeHi, 0.8);

    // Player shadow
    game.draw.circle(player.x, GROUND_Y, 30, C.shadow, 0.3);

    // Player
    var pCol = hitFlash > 0 ? C.danger : C.player;
    game.draw.circle(player.x, player.y, 44, pCol, 0.3);
    game.draw.circle(player.x, player.y, 36, pCol, 0.85);
    game.draw.circle(player.x - 12, player.y - 12, 10, '#fff', 0.4);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 10 * p.life, p.col, p.life * 0.8);
    }

    if (hitFlash > 0) game.draw.rect(0, 0, W, H, C.danger, hitFlash * 0.15);

    // Timing guide: show when to jump (rope approaching)
    var timingAlpha = Math.max(0, Math.sin(ropeAngle - Math.PI * 0.4)) * 0.4;
    if (timingAlpha > 0.05 && !ropeAtGround) {
      game.draw.text('ジャンプ！', W / 2, H * 0.88, { size: 52, color: C.safe });
    }

    if (comboLife > 0) {
      game.draw.text(comboText, W / 2, H * 0.83, { size: 60, color: C.ropeHi, bold: true });
    }

    // Hit dots
    for (var hi2 = 0; hi2 < MAX_HIT; hi2++) {
      game.draw.circle(W / 2 - (MAX_HIT - 1) * 56 + hi2 * 112, H * 0.955, 20, hi2 < hits ? C.danger : C.ui, 0.9);
    }

    game.draw.text(jumps + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.player : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.09);
  });
})(game);
