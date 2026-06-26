// 529-bubble-level.js
// バブルレベル — 傾いた水準器を素早くタップして気泡を中央に戻す
// 操作: タップで気泡を押す（左タップ=右へ、右タップ=左へ）
// 成功: 10回中央キープ  失敗: 5回はみ出す or 60秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#02050a',
    tube:    '#0d2136',
    tubeBg:  '#040d18',
    bubble:  '#38bdf8',
    bubbleHi:'#bae6fd',
    center:  '#22c55e',
    danger:  '#ef4444',
    text:    '#f1f5f9',
    ui:      '#374151',
    mark:    '#0ea5e9'
  };

  var TUBE_W = 700;
  var TUBE_H = 100;
  var TUBE_X = (W - TUBE_W) / 2;
  var TUBE_Y = H * 0.45;
  var BUBBLE_R = 40;
  var CENTER_ZONE = 80; // ±pixels from center

  var bubbleX = W / 2;
  var bubbleVX = 0;
  var tiltAngle = 0;    // tube tilt
  var tiltVel = 0;
  var score = 0;
  var NEEDED = 10;
  var misses = 0;
  var MAX_MISS = 5;
  var done = false;
  var timeLeft = 60;
  var elapsed = 0;
  var particles = [];
  var flashAnim = 0;
  var flashCol = C.center;
  var centerTimer = 0;    // time spent in center
  var CENTER_HOLD = 0.8;  // seconds to hold center for a point
  var lastScored = false;

  game.onTap(function(tx, ty) {
    if (done) return;
    // Push bubble away from tap side
    if (tx < W / 2) {
      bubbleVX += 280;
    } else {
      bubbleVX -= 280;
    }
    game.audio.play('se_tap', 0.3);
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

    if (flashAnim > 0) flashAnim -= dt * 3;

    // Random tilt changes
    tiltVel += (Math.random() - 0.5) * 0.8 * dt;
    tiltAngle += tiltVel * dt * 40;
    tiltAngle *= 0.98;
    tiltVel *= 0.95;
    // Keep tilt bounded
    if (Math.abs(tiltAngle) > 0.3) tiltVel -= tiltAngle * 0.5;

    // Bubble physics (slides based on tilt)
    var gravity = Math.sin(tiltAngle) * 600;
    bubbleVX += gravity * dt;
    bubbleVX *= 0.94; // damping
    bubbleX += bubbleVX * dt;

    // Tube bounds
    var leftBound = TUBE_X + BUBBLE_R;
    var rightBound = TUBE_X + TUBE_W - BUBBLE_R;
    if (bubbleX < leftBound) {
      bubbleX = leftBound;
      bubbleVX = Math.abs(bubbleVX) * 0.5;
      // Escaped!
      misses++;
      flashCol = C.danger;
      flashAnim = 0.4;
      game.audio.play('se_failure', 0.4);
      centerTimer = 0;
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }
    if (bubbleX > rightBound) {
      bubbleX = rightBound;
      bubbleVX = -Math.abs(bubbleVX) * 0.5;
      misses++;
      flashCol = C.danger;
      flashAnim = 0.4;
      game.audio.play('se_failure', 0.4);
      centerTimer = 0;
      if (misses >= MAX_MISS && !done) {
        done = true;
        setTimeout(function() { game.end.failure(); }, 500);
      }
    }

    // Center check
    var inCenter = Math.abs(bubbleX - W / 2) < CENTER_ZONE;
    if (inCenter && !done) {
      centerTimer += dt;
      if (centerTimer >= CENTER_HOLD) {
        centerTimer = 0;
        score++;
        flashCol = C.center;
        flashAnim = 0.3;
        game.audio.play('se_success', 0.6);
        for (var pi = 0; pi < 6; pi++) {
          var ang = Math.random() * Math.PI * 2;
          particles.push({ x: W / 2, y: TUBE_Y + TUBE_H / 2, vx: Math.cos(ang) * 120, vy: Math.sin(ang) * 120, life: 0.4, col: C.bubbleHi });
        }
        if (score >= NEEDED && !done) {
          done = true;
          game.audio.play('se_success', 0.9);
          setTimeout(function() { game.end.success(score * 400 + Math.ceil(timeLeft) * 100); }, 700);
        }
      }
    } else {
      centerTimer = 0;
    }

    for (var pp = particles.length - 1; pp >= 0; pp--) {
      particles[pp].x += particles[pp].vx * dt;
      particles[pp].y += particles[pp].vy * dt;
      particles[pp].life -= dt * 2;
      if (particles[pp].life <= 0) particles.splice(pp, 1);
    }

    // Draw
    game.draw.rect(0, 0, W, H, C.bg);

    // Tilt the drawing context would be nice but we approximate:
    // Draw tube body
    var tx0 = TUBE_X, ty0 = TUBE_Y;
    game.draw.rect(tx0 - 8, ty0 - 8, TUBE_W + 16, TUBE_H + 16, C.tube, 0.9);
    game.draw.rect(tx0, ty0, TUBE_W, TUBE_H, C.tubeBg, 0.95);

    // Center zone marking
    game.draw.rect(W / 2 - CENTER_ZONE, ty0 + 4, CENTER_ZONE * 2, TUBE_H - 8, C.center, 0.08);
    game.draw.line(W / 2, ty0, W / 2, ty0 + TUBE_H, C.center, 3);
    game.draw.line(W / 2 - CENTER_ZONE, ty0, W / 2 - CENTER_ZONE, ty0 + TUBE_H, C.mark, 2);
    game.draw.line(W / 2 + CENTER_ZONE, ty0, W / 2 + CENTER_ZONE, ty0 + TUBE_H, C.mark, 2);

    // Danger zones
    game.draw.rect(tx0, ty0, 60, TUBE_H, C.danger, 0.15);
    game.draw.rect(tx0 + TUBE_W - 60, ty0, 60, TUBE_H, C.danger, 0.15);

    // Center hold progress arc
    if (inCenter && centerTimer > 0) {
      var progress = centerTimer / CENTER_HOLD;
      game.draw.circle(W / 2, TUBE_Y + TUBE_H / 2, BUBBLE_R + 12, C.center, progress * 0.4);
    }

    // Bubble
    var bubbleY = TUBE_Y + TUBE_H / 2;
    game.draw.circle(bubbleX, bubbleY, BUBBLE_R + 4, C.bubbleHi, 0.15);
    game.draw.circle(bubbleX, bubbleY, BUBBLE_R, C.bubble, 0.85);
    game.draw.circle(bubbleX - 10, bubbleY - 10, BUBBLE_R * 0.3, C.bubbleHi, 0.5);

    // Tilt visual hint (small tilted bar at bottom)
    var tiltPX = W / 2 + tiltAngle * 400;
    game.draw.line(W / 2 - 160, TUBE_Y + TUBE_H + 60, W / 2 + 160, TUBE_Y + TUBE_H + 60, C.ui, 4);
    game.draw.circle(tiltPX, TUBE_Y + TUBE_H + 60, 18, tiltPX < W / 2 - 40 || tiltPX > W / 2 + 40 ? C.danger : C.center, 0.9);

    // Particles
    for (var pp2 = 0; pp2 < particles.length; pp2++) {
      var p = particles[pp2];
      game.draw.circle(p.x, p.y, 12 * p.life, p.col, p.life * 0.8);
    }

    if (flashAnim > 0) game.draw.rect(0, 0, W, H, flashCol, flashAnim * 0.1);

    // Miss dots
    for (var mi = 0; mi < MAX_MISS; mi++) {
      game.draw.circle(W / 2 - (MAX_MISS - 1) * 56 + mi * 112, H * 0.955, 20, mi < misses ? C.danger : C.ui, 0.9);
    }

    game.draw.text(score + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });
    var ratio = Math.max(0, timeLeft / 60);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.bubble : C.danger);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.07);
    bubbleX = W / 2 + (Math.random() - 0.5) * 200;
  });
})(game);
