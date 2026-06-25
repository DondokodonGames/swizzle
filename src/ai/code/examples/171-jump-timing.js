// 171-jump-timing.js
// ジャンプ台 — 坂道を走るキャラが台の先端でジャンプしてギャップを越えるスカッと感
// 操作: タップでジャンプ
// 成功: 10回連続成功  失敗: 3回落下 or 40秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:       '#04070a',
    ground:   '#1e293b',
    groundHi: '#334155',
    ramp:     '#2563eb',
    rampHi:   '#3b82f6',
    player:   '#f59e0b',
    playerHi: '#fef08a',
    gap:      '#0ea5e9',
    land:     '#22c55e',
    fail:     '#ef4444',
    ui:       '#334155'
  };

  var GROUND_Y = H * 0.68;
  var PLAYER_R = 36;
  var RUN_SPEED = 600;

  var px = W * 0.1;
  var py = GROUND_Y;
  var pvx = RUN_SPEED;
  var pvy = 0;
  var onGround = true;
  var GRAVITY = 2200;
  var JUMP_POWER = -1100;

  // Platform layout
  var platformW = W * 0.35;
  var gapW = 0;
  var landingX = 0;
  var nextSection = 'run'; // 'run' | 'air' | 'land'
  var rampX = 0;

  var score = 0;
  var needed = 10;
  var misses = 0;
  var maxMisses = 3;
  var timeLeft = 40;
  var done = false;
  var feedback = 0;
  var feedbackOk = false;
  var cameraX = 0;
  var TARGET_CAMERA_X = W * 0.2;
  var particles = [];
  var jumpFlash = 0;
  var nextJumpReady = true;

  function setupGap() {
    var progress = score / needed;
    gapW = 200 + progress * 220 + Math.random() * 80;
    rampX = cameraX + W * 0.55;
    landingX = rampX + platformW + gapW;
    nextSection = 'run';
    nextJumpReady = true;
  }

  game.onTap(function() {
    if (done) return;
    if (onGround && nextJumpReady && nextSection === 'run') {
      // Must be near ramp edge
      var screenPx = px - cameraX + TARGET_CAMERA_X;
      var rampEdge = rampX + platformW - cameraX + TARGET_CAMERA_X;
      var distToEdge = rampEdge - screenPx;
      if (distToEdge < 240 && distToEdge > -60) {
        // Good jump!
        pvy = JUMP_POWER;
        onGround = false;
        pvx = RUN_SPEED * 1.1;
        nextSection = 'air';
        nextJumpReady = false;
        jumpFlash = 0.3;
        game.audio.play('se_tap', 0.7);
      } else if (distToEdge >= 240) {
        // Too early, don't jump (swallow the tap)
        game.audio.play('se_tap', 0.2);
      }
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }
    if (feedback > 0) feedback -= dt;
    if (jumpFlash > 0) jumpFlash -= dt;

    // Physics
    if (!onGround) {
      pvy += GRAVITY * dt;
      py += pvy * dt;
    }
    px += pvx * dt;

    // Camera follows
    cameraX += (px - (cameraX + W * 0.22)) * Math.min(dt * 8, 1);

    // Determine which ground section player is on
    var leftEdge = rampX;
    var leftRight = rampX + platformW;
    var rightLeft = landingX;
    var rightRight = landingX + platformW;

    if (nextSection === 'run' || nextSection === 'land') {
      var onPlatform = (px > leftEdge && px < leftRight) || (px > rightLeft && px < rightRight + 200);
      if (onPlatform && py >= GROUND_Y) {
        py = GROUND_Y;
        pvy = 0;
        onGround = true;
        if (nextSection === 'air') {
          // Landed on right platform
        }
      }
    } else if (nextSection === 'air') {
      // Check if landed on right platform
      if (px > rightLeft - 20 && px < rightRight + 200 && py >= GROUND_Y) {
        py = GROUND_Y;
        pvy = 0;
        onGround = true;
        nextSection = 'land';
        score++;
        feedbackOk = true; feedback = 0.4;
        game.audio.play('se_success');
        for (var pi = 0; pi < 8; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: px, y: py, vx: Math.cos(ang) * 200, vy: Math.sin(ang) * 200 - 150, life: 0.5 });
        }
        if (score >= needed && !done) {
          done = true;
          setTimeout(function() { game.end.success(score * 80 + Math.ceil(timeLeft) * 25); }, 400);
          return;
        }
        setTimeout(function() { setupGap(); }, 600);
      } else if (py > GROUND_Y + 80) {
        // Fell into gap
        misses++;
        feedbackOk = false; feedback = 0.5;
        game.audio.play('se_failure');
        py = GROUND_Y; pvy = 0; onGround = true;
        px = leftEdge + platformW * 0.3; pvx = RUN_SPEED;
        nextSection = 'run';
        if (misses >= maxMisses && !done) { done = true; setTimeout(function() { game.end.failure(); }, 500); return; }
        setTimeout(function() { setupGap(); }, 100);
      }
    }

    for (var pi2 = 0; pi2 < particles.length; pi2++) {
      particles[pi2].x += particles[pi2].vx * dt; particles[pi2].y += particles[pi2].vy * dt;
      particles[pi2].vy += 600 * dt; particles[pi2].life -= dt;
    }
    particles = particles.filter(function(p) { return p.life > 0; });

    // ---- draw ----
    var cam = cameraX - TARGET_CAMERA_X;
    game.draw.rect(0, 0, W, H, C.bg);

    // Sky gradient
    game.draw.rect(0, 0, W, GROUND_Y, '#08101a', 0.5);

    // Left platform
    var lpX = rampX - cam;
    game.draw.rect(lpX, GROUND_Y, platformW, H - GROUND_Y, C.ground, 0.9);
    game.draw.rect(lpX, GROUND_Y, platformW, 12, C.groundHi, 0.7);
    // Ramp at right edge
    game.draw.line(lpX + platformW - 80, GROUND_Y, lpX + platformW, GROUND_Y - 40, C.rampHi, 16);
    game.draw.circle(lpX + platformW, GROUND_Y - 40, 18, C.rampHi, 0.8);

    // Gap
    var gapScreenX = lpX + platformW;
    var gapColor = (nextSection === 'air') ? C.fail : C.gap;
    game.draw.rect(gapScreenX, GROUND_Y, gapW, H - GROUND_Y, gapColor, 0.08);
    game.draw.line(gapScreenX, GROUND_Y, gapScreenX, H, gapColor, 2);

    // Right platform
    var rpX = landingX - cam;
    game.draw.rect(rpX, GROUND_Y, platformW + 200, H - GROUND_Y, C.ground, 0.9);
    game.draw.rect(rpX, GROUND_Y, platformW + 200, 12, C.land, 0.5);

    // Distance marker
    var gapScreenMid = gapScreenX + gapW / 2;
    game.draw.text('←' + Math.round(gapW) + 'px→', gapScreenMid, GROUND_Y + 80, { size: 32, color: C.ui });

    // Player
    var screenPX = px - cam;
    game.draw.circle(screenPX, py, PLAYER_R + 8, C.playerHi, 0.25);
    game.draw.circle(screenPX, py, PLAYER_R, C.player, 0.95);
    // Running legs (simple animation)
    var legAnim = Math.sin(px / 30) * 20;
    game.draw.line(screenPX - 12, py + PLAYER_R, screenPX - 12 + legAnim, py + PLAYER_R + 36, C.playerHi, 8);
    game.draw.line(screenPX + 12, py + PLAYER_R, screenPX + 12 - legAnim, py + PLAYER_R + 36, C.playerHi, 8);

    // Jump flash
    if (jumpFlash > 0) {
      game.draw.circle(screenPX, py, PLAYER_R + 40, C.playerHi, jumpFlash * 0.5);
    }

    // Particles
    for (var pp = 0; pp < particles.length; pp++) {
      var part = particles[pp];
      game.draw.circle(part.x - cam, part.y, 10 * part.life * 2, C.land, part.life);
    }

    if (feedback > 0) {
      game.draw.rect(0, 0, W, H, feedbackOk ? C.land : C.fail, feedback * 0.12);
    }

    // Jump hint
    if (nextSection === 'run' && onGround) {
      var edgeDist = (rampX + platformW) - px;
      if (edgeDist < 300 && edgeDist > 0) {
        game.draw.text('今だ！', screenPX, py - 80, { size: 52, color: C.rampHi, bold: true });
      } else {
        game.draw.text('走れ！', W / 2, H * 0.9, { size: 46, color: C.ui });
      }
    }

    game.draw.text(score + ' / ' + needed, W / 2, 148, { size: 60, color: '#f1f5f9', bold: true });
    for (var mi = 0; mi < maxMisses; mi++) {
      game.draw.circle(W / 2 + (mi - 1) * 52, 218, 18, mi < misses ? C.fail : '#0a1020');
    }

    var ratio = Math.max(0, timeLeft / 40);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.ramp : C.fail);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.3);
    setupGap();
    px = rampX + platformW * 0.15;
    cameraX = px - TARGET_CAMERA_X;
  });
})(game);
