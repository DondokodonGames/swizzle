// 391-glass-break.js
// ガラス割り — 強さを調節してガラスをちょうどいい力で割る
// 操作: タップ長押しで力をチャージ、離すと発射
// 成功: 10回ちょうどいい力で割る  失敗: 3回壊せない or 45秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:     '#1a1a2e',
    glass:  '#bae6fd',
    glassHi:'#e0f2fe',
    glassDim:'#1e3a5f',
    crack:  '#7dd3fc',
    power:  '#22c55e',
    powerHi:'#86efac',
    overPow:'#ef4444',
    ball:   '#fbbf24',
    ballHi: '#fef3c7',
    target: '#a855f7',
    targetHi:'#d8b4fe',
    text:   '#f1f5f9',
    ui:     '#475569'
  };

  var charging = false;
  var chargeStart = -1;
  var chargeLevel = 0;
  var MAX_CHARGE = 2.5;
  var TARGET_MIN = 0.45;
  var TARGET_MAX = 0.75;

  var hits = 0;
  var NEEDED = 10;
  var failed = 0;
  var MAX_FAILED = 3;
  var done = false;
  var timeLeft = 45;
  var elapsed = 0;
  var particles = [];
  var glassState = 1.0;  // 1=intact, <0 = broken
  var throwAnim = 0;
  var ballX = W / 2, ballY = H * 0.75;
  var ballVX = 0, ballVY = 0;
  var isThrowing = false;
  var resultText = '';
  var resultAnim = 0;
  var resultCol = C.power;

  // Glass panel
  var GLASS_X = W / 2;
  var GLASS_Y = H * 0.35;
  var GLASS_W = 400;
  var GLASS_H = 300;
  var cracks = [];

  function resetGlass() {
    glassState = 1.0;
    cracks = [];
    ballX = W / 2;
    ballY = H * 0.75;
    ballVX = 0; ballVY = 0;
    isThrowing = false;
    charging = false;
    chargeLevel = 0;
    chargeStart = -1;
  }

  function throwBall() {
    isThrowing = true;
    var power = chargeLevel;
    ballVX = (Math.random() - 0.5) * 50;
    ballVY = -(power * 1200 + 200);
    chargeLevel = 0;
    charging = false;
  }

  game.onTap(function(tx, ty) {
    if (done || isThrowing) return;
    // Single tap = small charge
    chargeLevel = 0.3 + Math.random() * 0.2;
    throwBall();
    game.audio.play('se_tap', 0.3);
  });

  game.onSwipe(function(dir, x1, y1, x2, y2) {
    if (done || isThrowing) return;
    if (dir !== 'up') return;
    // Swipe = medium charge based on swipe length
    var len = Math.abs(y2 - y1) / H;
    chargeLevel = Math.min(MAX_CHARGE, len * 2);
    throwBall();
    game.audio.play('se_tap', 0.4);
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (resultAnim > 0) resultAnim -= dt * 2;

    if (isThrowing) {
      ballVY += 600 * dt;
      ballX += ballVX * dt;
      ballY += ballVY * dt;

      // Hit glass
      if (ballY <= GLASS_Y + GLASS_H / 2 && Math.abs(ballX - GLASS_X) < GLASS_W / 2 && ballVY < 0) {
        var power = chargeLevel;
        isThrowing = false;

        if (chargeLevel >= TARGET_MIN && chargeLevel <= TARGET_MAX) {
          // Perfect break
          hits++;
          resultText = '割れた！';
          resultCol = C.power;
          resultAnim = 0.8;
          game.audio.play('se_success', 0.6);
          // Crack particles
          for (var pi = 0; pi < 20; pi++) {
            var ang = Math.random() * Math.PI * 2;
            particles.push({ x: ballX, y: GLASS_Y, vx: Math.cos(ang)*300, vy: Math.sin(ang)*300, life:0.6, col: C.glassHi });
          }
          cracks = [];
          for (var ci = 0; ci < 15; ci++) {
            var cx = GLASS_X + (Math.random()-0.5)*GLASS_W;
            var cy = GLASS_Y + (Math.random()-0.5)*GLASS_H;
            cracks.push({ x: cx, y: cy, angle: Math.random()*Math.PI, len: 30+Math.random()*80 });
          }
          if (hits >= NEEDED && !done) {
            done = true;
            setTimeout(function() { game.end.success(hits * 400 + Math.ceil(timeLeft) * 80); }, 800);
          } else if (!done) {
            setTimeout(function() { resetGlass(); }, 900);
          }
        } else if (chargeLevel < TARGET_MIN) {
          // Too weak
          resultText = '力不足！';
          resultCol = C.ui;
          resultAnim = 0.6;
          game.audio.play('se_failure', 0.2);
          // Small crack
          cracks.push({ x: ballX, y: GLASS_Y, angle: Math.random()*Math.PI, len: 20 });
          failed++;
          if (failed >= MAX_FAILED && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else {
            setTimeout(function() { resetGlass(); }, 700);
          }
        } else {
          // Too strong (explosion)
          resultText = '強すぎ！';
          resultCol = C.overPow;
          resultAnim = 0.7;
          game.audio.play('se_failure', 0.4);
          for (var pi2 = 0; pi2 < 10; pi2++) {
            var ang2 = Math.random() * Math.PI * 2;
            particles.push({ x: ballX, y: GLASS_Y, vx: Math.cos(ang2)*250, vy: Math.sin(ang2)*250, life:0.5, col: C.overPow });
          }
          failed++;
          if (failed >= MAX_FAILED && !done) {
            done = true;
            setTimeout(function() { game.end.failure(); }, 500);
          } else {
            setTimeout(function() { resetGlass(); }, 700);
          }
        }
      }

      // Ball off screen
      if (ballY < -50 || ballY > H + 50) {
        isThrowing = false;
        resetGlass();
      }
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].vy += 300 * dt;
      particles[pp].life -= dt;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Glass panel
    if (cracks.length === 0) {
      game.draw.rect(GLASS_X - GLASS_W/2, GLASS_Y - GLASS_H/2, GLASS_W, GLASS_H, C.glass, 0.25);
      game.draw.rect(GLASS_X - GLASS_W/2 + 8, GLASS_Y - GLASS_H/2 + 8, GLASS_W - 16, GLASS_H - 16, C.glassHi, 0.08);
      // Frame
      game.draw.rect(GLASS_X - GLASS_W/2 - 12, GLASS_Y - GLASS_H/2 - 12, GLASS_W + 24, 12, C.glassDim, 0.9);
      game.draw.rect(GLASS_X - GLASS_W/2 - 12, GLASS_Y + GLASS_H/2, GLASS_W + 24, 12, C.glassDim, 0.9);
      game.draw.rect(GLASS_X - GLASS_W/2 - 12, GLASS_Y - GLASS_H/2 - 12, 12, GLASS_H + 24, C.glassDim, 0.9);
      game.draw.rect(GLASS_X + GLASS_W/2, GLASS_Y - GLASS_H/2 - 12, 12, GLASS_H + 24, C.glassDim, 0.9);
    }

    // Cracks
    for (var ci2 = 0; ci2 < cracks.length; ci2++) {
      var cr = cracks[ci2];
      game.draw.line(cr.x, cr.y, cr.x + Math.cos(cr.angle)*cr.len, cr.y + Math.sin(cr.angle)*cr.len, C.crack, 3);
      game.draw.line(cr.x, cr.y, cr.x - Math.cos(cr.angle)*cr.len*0.5, cr.y - Math.sin(cr.angle)*cr.len*0.5, C.crack, 2);
    }

    // Target zone display
    game.draw.text('目標強度: ▓▓▓░░', W / 2, H * 0.72, { size: 38, color: C.targetHi });

    // Power display bar
    var barW = 500, barH = 30;
    var barX = W/2 - barW/2;
    var barY = H * 0.78;
    game.draw.rect(barX, barY, barW, barH, '#0f172a', 0.8);
    game.draw.rect(barX + barW * TARGET_MIN, barY - 5, barW * (TARGET_MAX - TARGET_MIN), barH + 10, C.target, 0.2);
    // No active charge in this version (charge shown conceptually)
    game.draw.text('上スワイプ: 強い  タップ: 普通', W / 2, H * 0.84, { size: 34, color: C.ui });

    // Ball
    game.draw.circle(ballX, ballY, 26, C.ball, 0.9);
    game.draw.circle(ballX - 9, ballY - 9, 10, C.ballHi, 0.7);

    if (resultAnim > 0) {
      game.draw.text(resultText, W / 2, H * 0.9, { size: 56, color: resultCol, bold: true });
    }

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 9 * p.life, p.col, p.life * 0.8);
    }

    // Failed dots
    for (var fi = 0; fi < MAX_FAILED; fi++) {
      game.draw.circle(W/2 - (MAX_FAILED-1)*40 + fi*80, H*0.935, 16, fi < failed ? C.overPow : C.glassDim, 0.9);
    }

    game.draw.text(hits + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 45);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.crack : C.overPow);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.1);
    resetGlass();
  });
})(game);
