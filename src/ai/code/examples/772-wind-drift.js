// 772-wind-drift.js
// ウィンドドリフト — 風に流される船を60秒間セーフゾーンに保ち続けろ
// 操作: タップで船を右に押す（風は常に左から）
// 成功: 60秒間ゾーン内を維持  失敗: 3回ゾーン逸脱 or 70秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#030d1a',
    sky:     '#0a192f',
    sea:     '#0c4a6e',
    seaHi:   '#0e7490',
    wave:    '#38bdf8',
    ship:    '#f1f5f9',
    shipDk:  '#64748b',
    sail:    '#fef3c7',
    wind:    '#93c5fd',
    safe:    '#22c55e',
    danger:  '#ef4444',
    correct: '#22c55e',
    wrong:   '#ef4444',
    text:    '#f1f5f9',
    ui:      '#060e14'
  };

  var SAFE_LEFT = W * 0.25;
  var SAFE_RIGHT = W * 0.75;
  var SHIP_Y = H * 0.52;
  var SHIP_W = 100;
  var SHIP_H = 50;

  var shipX = W / 2;
  var shipVx = 0;
  var WIND_FORCE = -220;   // constant leftward wind
  var TAP_FORCE = 560;     // rightward push per tap
  var DRAG = 0.88;

  var surviveTime = 0;
  var NEEDED_TIME = 60;
  var driftCount = 0;
  var MAX_DRIFT = 3;
  var inDanger = false;
  var dangerTimer = 0;
  var DANGER_GRACE = 0.6;

  var done = false;
  var timeLeft = 70;
  var elapsed = 0;

  var waves = [];
  var windParticles = [];
  var flashAnim = 0, flashCol = C.correct;
  var resultTimer = 0, resultText = '';
  var wavePhase = 0;

  // Initialize waves
  for (var wi = 0; wi < 8; wi++) {
    waves.push({ x: Math.random() * W, speed: 80 + Math.random() * 60, size: 30 + Math.random() * 40 });
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    shipVx += TAP_FORCE;
    game.audio.play('se_tap', 0.08);
    for (var p = 0; p < 3; p++) {
      var pa = -Math.PI * 0.3 + Math.random() * Math.PI * 0.2;
      windParticles.push({ x: shipX + SHIP_W / 2, y: SHIP_Y - 20 + Math.random() * 40, vx: Math.cos(pa) * 140, vy: Math.sin(pa) * 80, life: 0.35, col: C.wave });
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

    // Ship physics
    shipVx += WIND_FORCE * dt;
    shipVx *= Math.pow(DRAG, dt * 60);
    shipX += shipVx * dt;

    // Keep ship on screen
    if (shipX < SHIP_W / 2) { shipX = SHIP_W / 2; shipVx = Math.abs(shipVx) * 0.3; }
    if (shipX > W - SHIP_W / 2) { shipX = W - SHIP_W / 2; shipVx = -Math.abs(shipVx) * 0.3; }

    // Check safe zone
    var inSafe = shipX > SAFE_LEFT && shipX < SAFE_RIGHT;

    if (inSafe && !done) {
      surviveTime += dt;
      if (surviveTime >= NEEDED_TIME && !done) {
        done = true;
        game.audio.play('se_success', 0.9);
        setTimeout(function() { game.end.success(Math.round(surviveTime) * 180 + Math.ceil(timeLeft) * 100); }, 700);
        return;
      }
    }

    if (!inSafe) {
      if (!inDanger) {
        inDanger = true;
        dangerTimer = 0;
      } else {
        dangerTimer += dt;
        if (dangerTimer > DANGER_GRACE) {
          driftCount++;
          inDanger = false;
          dangerTimer = 0;
          // Push back toward safe zone
          if (shipX < SAFE_LEFT) shipVx = 400;
          else shipVx = -400;
          flashCol = C.wrong;
          flashAnim = 0.4;
          resultText = '危険域！';
          resultTimer = 0.5;
          game.audio.play('se_failure', 0.35);
          if (driftCount >= MAX_DRIFT && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 600);
          }
        }
      }
    } else {
      inDanger = false;
      dangerTimer = 0;
    }

    // Waves
    wavePhase += dt * 1.5;
    for (var wi = 0; wi < waves.length; wi++) {
      waves[wi].x -= waves[wi].speed * dt;
      if (waves[wi].x < -waves[wi].size * 2) waves[wi].x = W + waves[wi].size;
    }

    // Wind particles
    for (var wp = windParticles.length - 1; wp >= 0; wp--) {
      windParticles[wp].x += windParticles[wp].vx * dt;
      windParticles[wp].y += windParticles[wp].vy * dt;
      windParticles[wp].life -= dt * 3;
      if (windParticles[wp].life <= 0) windParticles.splice(wp, 1);
    }

    // Spawn wind particles naturally
    if (Math.random() < dt * 4) {
      windParticles.push({ x: W + 20, y: SHIP_Y - 100 + Math.random() * 200, vx: -160 - Math.random() * 80, vy: 0, life: 0.8, col: C.wind });
    }

    if (flashAnim > 0) flashAnim -= dt * 3;
    if (resultTimer > 0) resultTimer -= dt;

    // Draw
    game.draw.rect(0, 0, W, H * 0.5, C.sky);
    game.draw.rect(0, H * 0.5, W, H * 0.5, C.sea, 1.0);
    game.draw.rect(0, H * 0.5, W, 12, C.seaHi, 0.5);

    // Stars
    for (var sti = 0; sti < 20; sti++) {
      var stx = (sti * 151) % W;
      var sty = (sti * 97) % (H * 0.45);
      game.draw.circle(stx, sty, 2, '#fff', 0.3 + 0.2 * Math.sin(elapsed * 2 + sti));
    }

    // Wind lines
    for (var wpi = 0; wpi < windParticles.length; wpi++) {
      var wp2 = windParticles[wpi];
      game.draw.line(wp2.x, wp2.y, wp2.x + 40, wp2.y, wp2.col, 3 * wp2.life);
    }

    // Safe zone indicator
    game.draw.rect(SAFE_LEFT, H * 0.08, SAFE_RIGHT - SAFE_LEFT, H * 0.88, C.safe, 0.05);
    game.draw.rect(SAFE_LEFT - 4, H * 0.08, 8, H * 0.88, C.safe, 0.6);
    game.draw.rect(SAFE_RIGHT - 4, H * 0.08, 8, H * 0.88, C.safe, 0.6);

    // Waves
    for (var wi2 = 0; wi2 < waves.length; wi2++) {
      var wv = waves[wi2];
      game.draw.circle(wv.x, H * 0.5 + Math.sin(wavePhase + wi2) * 8, wv.size, C.wave, 0.18);
    }

    // Ship
    var sx = shipX;
    var sy = SHIP_Y + Math.sin(wavePhase * 1.3) * 10;
    // Hull
    game.draw.rect(sx - SHIP_W / 2, sy, SHIP_W, SHIP_H, C.ship, 0.9);
    game.draw.rect(sx - SHIP_W / 2 + 8, sy + SHIP_H, SHIP_W - 16, 18, C.shipDk, 0.8);
    // Mast
    game.draw.line(sx, sy, sx, sy - SHIP_H * 2.2, C.shipDk, 8);
    // Sail (tilted by wind)
    var sailLean = Math.min(0.4, -shipVx / 1500) * 0.6;
    game.draw.rect(sx + sailLean * 40 - 4, sy - SHIP_H * 2.0, 60, SHIP_H * 1.4, C.sail, 0.85);
    game.draw.rect(sx - SHIP_W * 0.25, sy + 4, SHIP_W * 0.5, 8, C.seaHi, 0.3);

    // Speed indicator (arrow)
    if (Math.abs(shipVx) > 30) {
      var arrowDir = shipVx > 0 ? '→' : '←';
      game.draw.text(arrowDir, sx, sy - SHIP_H * 2.8, { size: 44, color: C.wind + 'cc', bold: true });
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);
    if (resultTimer > 0) {
      game.draw.text(resultText, W / 2, H * 0.75, { size: 56, color: flashCol, bold: true });
    }

    // Survive progress
    var survRatio = Math.min(1, surviveTime / NEEDED_TIME);
    game.draw.rect(W * 0.1, H * 0.81, W * 0.8, 18, '#0f172a', 0.8);
    game.draw.rect(W * 0.1, H * 0.81, W * 0.8 * survRatio, 18, C.correct, 0.85);
    game.draw.text(Math.floor(surviveTime) + 's / 60s', W / 2, H * 0.87, { size: 38, color: C.text + 'aa' });

    // Drift count
    for (var di = 0; di < MAX_DRIFT; di++) {
      game.draw.circle(W / 2 - (MAX_DRIFT - 1) * 64 + di * 128, H * 0.955, 24, di < driftCount ? C.wrong : C.ui, 0.9);
    }

    // Wind arrow (top right)
    game.draw.text('← 風', W * 0.82, H * 0.13, { size: 38, color: C.wind, bold: true });

    game.draw.text(Math.floor(surviveTime) + 's', W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 70);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 12, ratio > 0.3 ? C.correct : C.wrong);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.04);
  });
})(game);
