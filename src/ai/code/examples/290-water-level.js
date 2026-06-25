// 290-water-level.js
// ウォーターレベル — 水位を調整して魚を正しい深さに誘導する
// 操作: タップで水を増やす/減らすボタンを操作
// 成功: 10匹の魚をそれぞれ指定の深さに届ける  失敗: 3回溢れる or 50秒

(function(game) {
  var W = game.canvas.width;
  var H = game.canvas.height;

  var C = {
    bg:      '#020a0f',
    water:   '#0369a1',
    waterHi: '#0ea5e9',
    waterLo: '#0c4a6e',
    fish:    '#f59e0b',
    fishHi:  '#fde68a',
    target:  '#22c55e',
    tgtHi:   '#86efac',
    tank:    '#1e293b',
    tankHi:  '#334155',
    overflow:'#ef4444',
    ovHi:    '#fca5a5',
    ui:      '#475569',
    text:    '#f1f5f9'
  };

  var TANK_X = W * 0.15, TANK_Y = H * 0.2;
  var TANK_W = W * 0.7, TANK_H = H * 0.55;
  var WATER_MAX = TANK_H;
  var waterLevel = TANK_H * 0.5; // water height (from bottom)
  var waterVel = 0;
  var FILL_RATE = 80; // pixels per second when filling
  var DRAIN_RATE = 60;

  var fish = null;
  var targetDepth = 0; // from top of water
  var delivered = 0;
  var NEEDED = 10;
  var overflows = 0;
  var MAX_OVERFLOW = 3;
  var done = false;
  var timeLeft = 50;
  var elapsed = 0;
  var filling = false;
  var draining = false;
  var feedback = '';
  var feedbackCol = '#fff';
  var feedbackTimer = 0;
  var bubbles = [];
  var fishAnim = 0;
  var successFlash = 0;

  function spawnFish() {
    targetDepth = 50 + Math.random() * (TANK_H - 150);
    fish = {
      y: 0, // relative to water surface (0=surface, positive=deeper)
      targetY: targetDepth,
      tailWag: 0,
      delivered: false
    };
    feedback = '深さ ' + Math.round(targetDepth) + 'px に誘導せよ';
    feedbackCol = C.tgtHi;
    feedbackTimer = 1.2;
  }

  game.onTap(function(tx, ty) {
    if (done) return;
    var btnY = H * 0.83;
    if (ty >= btnY && ty <= btnY + 80) {
      if (tx < W / 2) filling = !filling;
      else draining = !draining;
      game.audio.play('se_tap', 0.2);
    }
  });

  game.onUpdate(function(dt) {
    if (!done) {
      timeLeft -= dt;
      elapsed += dt;
      if (timeLeft <= 0) { done = true; game.audio.play('se_failure'); game.end.failure(); return; }
    }

    if (feedbackTimer > 0) feedbackTimer -= dt;
    if (successFlash > 0) successFlash -= dt;

    // Water dynamics
    if (filling) waterLevel += FILL_RATE * dt;
    if (draining) waterLevel -= DRAIN_RATE * dt;
    waterLevel += waterVel * dt;
    waterVel *= (1 - dt * 3);
    waterLevel = Math.max(0, waterLevel);

    // Overflow check
    if (waterLevel >= WATER_MAX) {
      waterLevel = WATER_MAX;
      if (filling) {
        overflows++;
        filling = false;
        feedback = '溢れた！ (' + overflows + '/' + MAX_OVERFLOW + ')';
        feedbackCol = C.overflow;
        feedbackTimer = 0.8;
        game.audio.play('se_failure', 0.6);
        if (overflows >= MAX_OVERFLOW && !done) {
          done = true;
          setTimeout(function() { game.end.failure(); }, 500);
        }
      }
    }

    // Fish update
    if (fish && !fish.delivered) {
      fish.tailWag += dt * 5;
      // Fish floats at surface then gradually sinks
      fish.y = Math.min(fish.y + 30 * dt, waterLevel - 40);
      // Check if fish is at target depth
      var fishDepthFromBottom = waterLevel - fish.y;
      var targetFromBottom = waterLevel - fish.targetY;
      if (Math.abs(fish.y - fish.targetY) < 20) {
        fish.delivered = true;
        delivered++;
        successFlash = 0.6;
        game.audio.play('se_success', 0.6);
        feedback = '届いた！ ' + delivered + '/' + NEEDED;
        feedbackCol = C.tgtHi;
        feedbackTimer = 0.8;
        waterVel = -20;
        if (delivered >= NEEDED && !done) {
          done = true;
          setTimeout(function() { game.end.success(delivered * 200 + Math.ceil(timeLeft) * 80); }, 500);
          return;
        }
        setTimeout(function() { if (!done) spawnFish(); }, 1000);
        fish = null;
      }
    }

    // Bubbles
    if (filling && Math.random() < 0.3) {
      bubbles.push({ x: TANK_X + Math.random() * TANK_W, y: TANK_Y + TANK_H - waterLevel + Math.random() * 30, r: 4 + Math.random() * 6, vy: -60 - Math.random() * 40, life: 1.0 });
    }
    for (var bi = bubbles.length - 1; bi >= 0; bi--) {
      bubbles[bi].y += bubbles[bi].vy * dt;
      bubbles[bi].life -= dt;
      if (bubbles[bi].life <= 0 || bubbles[bi].y < TANK_Y) bubbles.splice(bi, 1);
    }

    // ---- draw ----
    game.draw.rect(0, 0, W, H, C.bg);

    // Tank
    game.draw.rect(TANK_X - 8, TANK_Y - 8, TANK_W + 16, TANK_H + 16, C.tank, 0.9);
    game.draw.rect(TANK_X, TANK_Y, TANK_W, TANK_H, '#050d14', 0.95);

    // Water
    var waterY = TANK_Y + TANK_H - waterLevel;
    game.draw.rect(TANK_X, waterY, TANK_W, waterLevel, C.water, 0.8);
    game.draw.rect(TANK_X, waterY, TANK_W, 12, C.waterHi, 0.5);
    game.draw.rect(TANK_X, waterY + 12, TANK_W, waterLevel - 12, C.waterLo, 0.3);

    // Target line
    if (fish) {
      var tgtY = TANK_Y + TANK_H - fish.targetY;
      game.draw.line(TANK_X, tgtY, TANK_X + TANK_W, tgtY, C.target, 4);
      game.draw.circle(TANK_X + TANK_W - 20, tgtY, 14, C.target, 0.9);
      game.draw.text('▶', TANK_X + TANK_W + 20, tgtY + 8, { size: 28, color: C.tgtHi });
    }

    // Bubbles
    for (var bi2 = 0; bi2 < bubbles.length; bi2++) {
      var b = bubbles[bi2];
      game.draw.circle(b.x, b.y, b.r, C.waterHi, b.life * 0.5);
    }

    // Fish
    if (fish) {
      var fy = TANK_Y + TANK_H - fish.y;
      if (fy >= TANK_Y && fy <= TANK_Y + TANK_H) {
        var wag = Math.sin(fish.tailWag) * 12;
        game.draw.circle(TANK_X + TANK_W / 2, fy, 28, C.fish, 0.9);
        game.draw.circle(TANK_X + TANK_W / 2 - 15, fy - 8, 10, C.fishHi, 0.6);
        // Tail
        game.draw.line(TANK_X + TANK_W / 2 + 28, fy, TANK_X + TANK_W / 2 + 50, fy - 20 + wag, C.fish, 10);
        game.draw.line(TANK_X + TANK_W / 2 + 28, fy, TANK_X + TANK_W / 2 + 50, fy + 20 + wag, C.fish, 10);
        // Eye
        game.draw.circle(TANK_X + TANK_W / 2 + 14, fy - 8, 7, '#fff', 0.9);
        game.draw.circle(TANK_X + TANK_W / 2 + 16, fy - 8, 4, C.bg, 0.9);
      }
    }

    if (successFlash > 0) {
      game.draw.rect(TANK_X, TANK_Y, TANK_W, TANK_H, C.target, successFlash * 0.3);
    }

    // Water level indicator
    game.draw.text(Math.round(waterLevel) + 'px', TANK_X - 70, TANK_Y + TANK_H - waterLevel + 16, { size: 28, color: C.waterHi });

    // Control buttons
    var btnY2 = H * 0.83;
    game.draw.rect(40, btnY2, W / 2 - 60, 70, filling ? C.waterHi : C.tank, 0.9);
    game.draw.text('注水 ' + (filling ? '■' : '▶'), W * 0.25, btnY2 + 40, { size: 38, color: filling ? C.bg : C.text, bold: true });
    game.draw.rect(W / 2 + 20, btnY2, W / 2 - 60, 70, draining ? C.overflow : C.tank, 0.9);
    game.draw.text('排水 ' + (draining ? '■' : '▶'), W * 0.75, btnY2 + 40, { size: 38, color: draining ? '#fff' : C.text, bold: true });

    if (feedbackTimer > 0) {
      game.draw.text(feedback, W / 2, H * 0.91, { size: 38, color: feedbackCol, bold: true });
    }

    // Overflow dots
    for (var oi = 0; oi < MAX_OVERFLOW; oi++) {
      game.draw.circle(W / 2 - (MAX_OVERFLOW - 1) * 28 + oi * 56, H * 0.95, 15, oi < overflows ? C.overflow : '#050d14');
    }

    game.draw.text(delivered + ' / ' + NEEDED, W / 2, 148, { size: 60, color: C.text, bold: true });

    var ratio = Math.max(0, timeLeft / 50);
    game.draw.rect(0, 0, W, 72, C.bg);
    game.draw.rect(0, 0, W * ratio, 72, ratio > 0.3 ? C.water : C.overflow);
    game.draw.text(Math.ceil(timeLeft) + '', W / 2, 36, { size: 44, color: '#fff', bold: true });
  });

  game.onStart(function() {
    game.audio.bgm('bgm_main', 0.15);
    spawnFish();
  });
})(game);
